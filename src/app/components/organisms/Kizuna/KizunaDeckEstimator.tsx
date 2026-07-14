"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Button, Image, Spinner, Switch, addToast } from "@heroui/react";

import {
  LuShare2,
  LuDownload,
  LuSwords,
  LuCheck,
  LuChevronRight,
  LuChevronDown,
} from "react-icons/lu";

import KizunaShareCard from "@app/components/organisms/Kizuna/KizunaShareCard";
import KizunaBreakdownCard from "@app/components/organisms/Kizuna/KizunaBreakdownCard";
import { useSetKizunaPreviewDeck } from "@app/components/organisms/Kizuna/KizunaPreviewContext";

import { captureThemedPng, SIDE_PADDING } from "@app/utils/captureImage";
import {
  shareRecord,
  saveGeneratedImage,
  saveImages,
  dataUrlToFile,
  type ShareImage,
} from "@app/utils/saveImage";
import { estimateKizuna, kizunaTierOf, type KizunaEstimate } from "@app/utils/kizuna";
import { spriteImageUrl } from "@app/utils/sprite";

import { DeckGetResponseType, DeckType } from "@app/types/deck";
import { DeckCodeType } from "@app/types/deck_code";
import { DeckUsageItemType, DeckUsageStatType } from "@app/types/deck_usage_stat";
import { RecordGetResponseType, RecordType } from "@app/types/record";
import { OfficialEventType } from "@app/types/official_event";
import { PokemonSpriteType } from "@app/types/pokemon_sprite";

// 結果カードの画像生成にかける上限時間。これを超えたら失敗として扱う。
const CAPTURE_TIMEOUT_MS = 15000;

// 記録の取得ページ数の上限。1デッキの記録がこれを超えることは稀で、
// 超えた場合も試算の精度に大きくは影響しないため打ち切る。
const MAX_RECORD_PAGES = 10;

// デッキ一覧の初期表示数と、「さらに読み込む」1回あたりの追加数。
const DECKS_PER_PAGE = 5;

// 託し度は舞台の格（ジムバトルかシティリーグか）で決まるが、記録は official_event_id しか
// 持たないため、イベントを1件ずつ引いて種別を調べる必要がある。
// 引く件数と並列数に上限を置き、記録の多いデッキでもAPIを叩き潰さないようにする。
const MAX_OFFICIAL_EVENT_FETCHES = 60;
const OFFICIAL_EVENT_CONCURRENCY = 6;

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, {
    cache: "no-store",
    headers: { Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`failed: ${url}`);
  return res.json();
}

// 指定デッキの記録を、カーソルをたどってすべて取得する
async function fetchAllRecords(deckId: string): Promise<RecordType[]> {
  const all: RecordType[] = [];
  let cursor = "";

  for (let page = 0; page < MAX_RECORD_PAGES; page++) {
    const res = await fetchJson<RecordGetResponseType>(
      `/api/records?deck_id=${deckId}&event_type=&cursor=${cursor}`,
    );
    const records = res.records ?? [];
    all.push(...records);

    if (!res.cursor || records.length === 0 || res.cursor === cursor) break;
    cursor = res.cursor;
  }

  return all;
}

// 公式イベントの種別（type_id）を引く。cache はデッキをまたいで使い回す。
async function fetchOfficialEventTypes(
  records: RecordType[],
  cache: Map<number, number>,
): Promise<Map<number, number>> {
  const ids = [
    ...new Set(records.map((r) => r.data.official_event_id).filter((id) => id > 0)),
  ]
    .filter((id) => !cache.has(id))
    .slice(0, MAX_OFFICIAL_EVENT_FETCHES);

  for (let i = 0; i < ids.length; i += OFFICIAL_EVENT_CONCURRENCY) {
    const chunk = ids.slice(i, i + OFFICIAL_EVENT_CONCURRENCY);
    const events = await Promise.all(
      chunk.map((id) =>
        fetchJson<OfficialEventType>(`/api/official_events/${id}`).catch(() => null),
      ),
    );

    // 引けなかったイベントは載せない。載せないほうが控えめな値になる（utils/kizuna.ts）
    events.forEach((event, index) => {
      if (event?.type_id) cache.set(chunk[index], event.type_id);
    });
  }

  return cache;
}

type Props = {
  userId: string;
  // 登録デッキが1つも無いユーザーには、質問式のシミュレーターを出す
  onNoDecks: () => void;
};

/*
 * ログイン済みユーザー向けのきずなLv.試算。
 *
 * 質問には答えさせない。登録済みのデッキを選ぶだけで、実際の対戦記録・
 * デッキコードの組み直し履歴・メモから、きずなLv.を算出する。
 * （算出ロジックは utils/kizuna.ts。既存APIだけで求まる6指標を使う簡易版）
 */
export default function KizunaDeckEstimator({ userId, onNoDecks }: Props) {
  const [decks, setDecks] = useState<DeckType[] | null>(null);
  const [usages, setUsages] = useState<DeckUsageItemType[]>([]);
  const [spriteMaster, setSpriteMaster] = useState<Map<string, PokemonSpriteType>>(
    new Map(),
  );
  const [loadError, setLoadError] = useState(false);

  const [selectedDeckId, setSelectedDeckId] = useState<string | null>(null);
  const [estimate, setEstimate] = useState<KizunaEstimate | null>(null);
  const [isEstimating, setIsEstimating] = useState(false);

  // デッキを何十個も持つユーザーがいるため、初期表示は記録の多い5つに絞る。
  const [visibleCount, setVisibleCount] = useState(DECKS_PER_PAGE);

  // official_event_id → type_id。同じイベントを複数のデッキで使い回すため、選択をまたいで保持する。
  const officialEventTypesRef = useRef<Map<number, number>>(new Map());

  // デッキを選んだら結果の位置まで送る。
  // 結果はデッキ一覧の下に出るため、選んだだけでは画面外にあって気づけない。
  const resultRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!selectedDeckId || !resultRef.current) return;

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    resultRef.current.scrollIntoView({
      behavior: prefersReducedMotion ? "auto" : "smooth",
      block: "start",
    });
  }, [selectedDeckId]);

  // ── 初期ロード：デッキ・戦績・スプライト名の対応表 ─────────────
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const [deckRes, usageRes, sprites] = await Promise.all([
          fetchJson<DeckGetResponseType>("/api/decks?archived=false&cursor="),
          fetchJson<DeckUsageStatType>(`/api/users/${userId}/deck-usage?all_time=true`),
          fetchJson<PokemonSpriteType[]>("/api/pokemon-sprites").catch(() => []),
        ]);

        if (cancelled) return;

        const deckList = deckRes.decks ?? [];
        setDecks(deckList);
        setUsages(usageRes.decks ?? []);
        setSpriteMaster(new Map(sprites.map((s) => [s.id, s])));

        if (deckList.length === 0) onNoDecks();
      } catch {
        if (!cancelled) setLoadError(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [userId, onNoDecks]);

  // 記録の多い順に並べる（いちばん長く使っているデッキを最初に出す）
  const orderedDecks = useMemo(() => {
    if (!decks) return [];
    const countOf = (id: string) => usages.find((u) => u.deck_id === id)?.count ?? 0;
    return [...decks].sort((a, b) => countOf(b.data.id) - countOf(a.data.id));
  }, [decks, usages]);

  const visibleDecks = orderedDecks.slice(0, visibleCount);
  const hiddenDeckCount = orderedDecks.length - visibleDecks.length;

  const selectedDeck = orderedDecks.find((d) => d.data.id === selectedDeckId) ?? null;

  const spritesOf = useCallback(
    (deck: DeckType): PokemonSpriteType[] =>
      deck.data.pokemon_sprites.map(
        (s) =>
          spriteMaster.get(s.id) ?? {
            id: s.id,
            name: "",
            image_url: spriteImageUrl(s.id),
          },
      ),
    [spriteMaster],
  );

  // ── デッキを選んだら、その場で試算する ────────────────────────
  const handleSelectDeck = async (deckId: string) => {
    setSelectedDeckId(deckId);
    setEstimate(null);
    setIsEstimating(true);

    try {
      const [records, deckCodes] = await Promise.all([
        fetchAllRecords(deckId),
        fetchJson<DeckCodeType[]>(`/api/decks/${deckId}/deckcodes`).catch(() => []),
      ]);

      // 舞台の格を知るため、記録に紐づく公式イベントの種別を引く
      const officialEventTypes = await fetchOfficialEventTypes(
        records,
        officialEventTypesRef.current,
      );

      setEstimate(
        estimateKizuna({
          records,
          deckCodes,
          officialEventTypes,
          usage: usages.find((u) => u.deck_id === deckId),
          allUsages: usages,
        }),
      );
    } catch {
      addToast({ title: "試算に失敗しました", color: "danger", timeout: 5000 });
      setSelectedDeckId(null);
    } finally {
      setIsEstimating(false);
    }
  };

  // ── シェア画像 ───────────────────────────────────────────────
  // iOS の transient activation 制約があるため、タップ前に生成しておく
  // （詳細は utils/saveImage.ts の shareRecord のコメントを参照）
  const shareCardRef = useRef<HTMLDivElement>(null);
  const breakdownCardRef = useRef<HTMLDivElement>(null);
  const [images, setImages] = useState<ShareImage[] | null>(null);
  const [captureFailed, setCaptureFailed] = useState(false);
  const [busy, setBusy] = useState<null | "share" | "save">(null);
  // 内訳カードを2枚目の画像として一緒にシェアするか。
  // 既定はOFF。シェアしたいのはまず結果であり、内訳まで出すかは本人が選ぶこと。
  const [includeBreakdown, setIncludeBreakdown] = useState(false);

  const [captureWidth, setCaptureWidth] = useState(360);
  useEffect(() => {
    const target = Math.round(window.innerWidth) - SIDE_PADDING * 2;
    setCaptureWidth(Math.max(320, Math.min(target, 480)));
  }, []);

  const tier = estimate ? kizunaTierOf(estimate.score) : null;
  const hasResult = !!selectedDeck && !!estimate && estimate.recordCount > 0;

  /*
   * 下の「デッキ一覧では、こう見えます」プレビューに、選んだデッキと試算結果を映す。
   * 戦績（勝率・先攻率）は本人の記録から出せるため、カードの数値はすべて実データになる。
   */
  const setPreviewDeck = useSetKizunaPreviewDeck();
  useEffect(() => {
    if (!hasResult) {
      setPreviewDeck(null);
      return;
    }

    const deck = selectedDeck!.data;
    const usage = usages.find((u) => u.deck_id === deck.id);

    setPreviewDeck({
      deckName: deck.name,
      spriteIds: deck.pokemon_sprites.slice(0, 2).map((s) => s.id),
      kizunaLevel: estimate!.score,
      registeredAt: new Date(deck.created_at).toLocaleDateString("ja-JP", {
        year: "numeric",
        month: "long",
        day: "numeric",
        weekday: "short",
      }),
      // 戦績の集計が無いデッキ（記録が集計対象外のみ等）はサンプルの数字に任せる
      stats: usage
        ? {
            winRate: usage.win_rate,
            wins: usage.wins,
            losses: usage.losses,
            matchCount: usage.game_count,
            goFirstCount: usage.go_first_count,
            goFirstRate: usage.go_first_rate,
            goFirstWinRate: usage.go_first_win_rate,
            goSecondCount: usage.go_second_count,
            goSecondWinRate: usage.go_second_win_rate,
          }
        : null,
    });
  }, [hasResult, selectedDeck, estimate, usages, setPreviewDeck]);

  const captureSeq = useRef(0);
  useEffect(() => {
    if (!hasResult) {
      setImages(null);
      setCaptureFailed(false);
      return;
    }

    const seq = ++captureSeq.current;
    setImages(null);
    setCaptureFailed(false);

    // 1枚目=結果カード、2枚目=内訳カード（トグルON時のみ）
    const capture = async (el: HTMLElement, name: string): Promise<ShareImage> => {
      const dataUrl = await Promise.race([
        captureThemedPng(el, { targetWidth: captureWidth, theme: "dark" }),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("capture timeout")), CAPTURE_TIMEOUT_MS),
        ),
      ]);
      const filename = `kizuna_${name}_${estimate!.score}_${Date.now()}.png`;
      return { dataUrl, filename, file: await dataUrlToFile(dataUrl, filename) };
    };

    (async () => {
      try {
        if (!shareCardRef.current) return;

        const captured: ShareImage[] = [await capture(shareCardRef.current, "result")];

        if (includeBreakdown && breakdownCardRef.current) {
          captured.push(await capture(breakdownCardRef.current, "breakdown"));
        }

        if (seq !== captureSeq.current) return;
        setImages(captured);
      } catch (e) {
        console.error(e);
        if (seq !== captureSeq.current) return;
        setCaptureFailed(true);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasResult, estimate?.score, selectedDeckId, captureWidth, includeBreakdown]);

  const shareText =
    selectedDeck && estimate && tier
      ? [
          // デッキ名が長いと1行に収まらないため、数値の前で改行する。
          // 数値だけを1行に立たせたいので、「でした。」もさらに次の行へ送る。
          `${selectedDeck.data.name}とのきずなLv.は`,
          `【${estimate.score} / 255】`,
          "でした。",
          "",
          `「${tier.name}」`,
          tier.message,
          "",
          "勝率では測れない、デッキとのきずなを数値化する",
          "バトレコの新機能「きずな」で試算しました👇",
          "https://vsrecorder.mobi/kizuna",
          "",
          "#バトレコ #きずなLv",
        ].join("\n")
      : "";

  const canShare = hasResult && images !== null;

  const handleShare = async () => {
    if (!canShare || !images?.length) return;

    setBusy("share");
    try {
      const result = await shareRecord(images, shareText);

      if (result === "unsupported") {
        await saveGeneratedImage(images[0].dataUrl, images[0].filename);
        addToast({
          title: "共有に非対応のため画像を保存しました",
          description: "保存した画像を添えてポストしてください",
          color: "warning",
          timeout: 5000,
        });
      } else if (result === "failed") {
        addToast({ title: "共有に失敗しました", color: "danger", timeout: 5000 });
      }
    } catch (e) {
      console.error(e);
      addToast({ title: "共有に失敗しました", color: "danger", timeout: 5000 });
    } finally {
      setBusy(null);
    }
  };

  const handleSave = async () => {
    if (!canShare || !images?.length) return;

    setBusy("save");
    try {
      // 内訳カードを含める場合は2枚まとめて保存する
      await saveImages(images.map((i) => ({ dataUrl: i.dataUrl, filename: i.filename })));
    } catch (e) {
      console.error(e);
      addToast({ title: "画像の保存に失敗しました", color: "danger", timeout: 5000 });
    } finally {
      setBusy(null);
    }
  };

  const xIntentHref = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`;

  if (loadError) {
    return (
      <p role="alert" className="py-6 text-center text-sm text-danger">
        デッキの取得に失敗しました。時間をおいて再度お試しください。
      </p>
    );
  }

  if (!decks) {
    return (
      <div className="flex justify-center py-10">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 lg:gap-8">
      {/* デッキ選択：質問は一切しない。選ぶだけ。 */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <span className="text-[11px] font-bold tracking-widest text-amber-600 lg:text-xs dark:text-amber-400">
            登録済みのデッキから
          </span>
          <span className="text-base font-bold text-foreground lg:text-lg">
            きずなLv.を見たいデッキを選んでください
          </span>
          <span className="text-xs text-default-500">
            あなたの対戦記録・デッキの組み直し履歴・メモから自動で算出します。入力は不要です。
          </span>
        </div>

        <ul className="flex flex-col gap-2">
          {visibleDecks.map((deck, index) => {
            const isSelected = selectedDeckId === deck.data.id;
            const count = usages.find((u) => u.deck_id === deck.data.id)?.count ?? 0;

            return (
              <li key={deck.data.id} className="min-w-0">
                <button
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => handleSelectDeck(deck.data.id)}
                  className={`group relative flex w-full items-center gap-4 overflow-hidden rounded-2xl border px-4 py-3 text-left transition-all ${
                    isSelected
                      ? "border-amber-400/70 bg-amber-500/10 shadow-[0_16px_40px_-24px_rgba(251,191,36,0.9)]"
                      : "border-default-200/70 bg-default-50/40 hover:border-amber-400/50 hover:bg-amber-500/5"
                  }`}
                >
                  {/* 選択中の灯。左端に一本ともるだけで、選んだ行が遠目にも分かる */}
                  <span
                    aria-hidden="true"
                    className={`absolute inset-y-0 left-0 w-1 bg-linear-to-b from-rose-500 to-amber-400 transition-opacity ${
                      isSelected ? "opacity-100" : "opacity-0"
                    }`}
                  />

                  <span className="relative flex h-12 w-19 shrink-0 items-center justify-center">
                    {/* 焚き火の残光。選ばれたポケモンだけが光を受ける */}
                    <span
                      aria-hidden="true"
                      className={`absolute h-10 w-14 rounded-full bg-amber-500/30 blur-lg transition-opacity ${
                        isSelected ? "opacity-100" : "opacity-0"
                      }`}
                    />
                    <span className="relative flex items-end -space-x-2">
                      {[0, 1].map((i) => (
                        <Image
                          key={i}
                          alt={deck.data.pokemon_sprites[i]?.id ?? "unknown"}
                          src={spriteImageUrl(deck.data.pokemon_sprites[i]?.id)}
                          radius="none"
                          disableAnimation
                          className="h-11 w-11 object-contain"
                        />
                      ))}
                    </span>
                  </span>

                  <span className="flex min-w-0 flex-1 flex-col gap-1">
                    <span className="flex min-w-0 items-center gap-2">
                      <span className="truncate text-sm font-bold lg:text-base">
                        {deck.data.name}
                      </span>
                      {/* 記録が最も多いデッキ＝いちばん長く歩いてきた相手。最初に目を留めさせる */}
                      {index === 0 && count > 0 && (
                        <span className="shrink-0 rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold whitespace-nowrap text-amber-500 dark:text-amber-400">
                          最も記録が多い
                        </span>
                      )}
                    </span>
                    <span className="flex items-center gap-1.5 text-[11px] text-default-500">
                      <LuSwords className="shrink-0 text-xs" />
                      {count > 0 ? (
                        <span>
                          <span className="font-bold tabular-nums text-default-600">
                            {count}
                          </span>
                          件の記録
                        </span>
                      ) : (
                        <span>まだ対戦記録がありません</span>
                      )}
                    </span>
                  </span>

                  <span
                    aria-hidden="true"
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition-all ${
                      isSelected
                        ? "bg-amber-400 text-neutral-900"
                        : "text-default-400 group-hover:translate-x-0.5 group-hover:text-amber-500"
                    }`}
                  >
                    {isSelected ? (
                      <LuCheck className="text-sm" />
                    ) : (
                      <LuChevronRight className="text-base" />
                    )}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>

        {/* 何十個も並べない。まず記録の多い5つを出し、続きは求められたときだけ出す */}
        {hiddenDeckCount > 0 && (
          <Button
            variant="bordered"
            className="self-center border-default-200 font-bold"
            endContent={<LuChevronDown className="text-base" />}
            onPress={() => setVisibleCount((c) => c + DECKS_PER_PAGE)}
          >
            さらに読み込む（残り{hiddenDeckCount}）
          </Button>
        )}
      </div>

      {/* デッキを選んだらここまでスクロールする。
          算出中・記録なし・結果のいずれもこの位置に出るため、アンカーは1つで足りる。 */}
      <div ref={resultRef} className="flex scroll-mt-20 flex-col gap-6 lg:gap-8">
        {isEstimating && (
          <div className="flex items-center justify-center gap-3 rounded-2xl border border-dashed border-default-200 py-8">
            <Spinner size="sm" />
            <span className="text-sm text-default-500">
              対戦記録からきずなLv.を算出しています...
            </span>
          </div>
        )}

        {/* 記録がまだ無いデッキ */}
        {selectedDeck && estimate && estimate.recordCount === 0 && !isEstimating && (
          <div className="flex items-center gap-3 rounded-2xl border border-default-200 px-5 py-5">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-500/10 text-amber-500">
              <LuSwords />
            </span>
            <div className="flex flex-col gap-0.5">
              <span className="text-sm font-bold">
                このデッキとは、まだ一緒に戦っていません
              </span>
              <span className="text-xs leading-relaxed text-default-500">
                きずなLv.は対戦記録から算出されます。1戦記録すると、ここに表示されます。
              </span>
            </div>
          </div>
        )}

        {/* 結果 */}
        {hasResult && !isEstimating && tier && (
          <div className="flex flex-col gap-4">
            <KizunaShareCard
              sprites={spritesOf(selectedDeck!)}
              deckName={selectedDeck!.data.name}
              score={estimate!.score}
              tierName={tier.name}
              tierMessage={tier.message}
            />

            {/* 算出の内訳。自動で出した数値だからこそ、根拠を見せる。
              画面のこのカードが、そのまま2枚目のシェア画像になる。 */}
            <KizunaBreakdownCard
              deckName={selectedDeck!.data.name}
              score={estimate!.score}
              tierName={tier.name}
              metrics={estimate!.metrics}
            />

            <p className="px-1 text-[11px] leading-relaxed text-default-400 lg:text-xs">
              これは既存の記録から算出できる6指標による簡易試算です。公開時には16指標すべてを使って算出されます。
              <br />
              算出方法は開発中のため、指標や重み付けは今後変更される可能性があります（同じ記録でも数値が変わることがあります）。
            </p>

            {/* 内訳カードを2枚目としてシェアに含めるか */}
            <div className="flex items-center gap-3 rounded-xl border border-default-200 px-4 py-3">
              <div className="min-w-0 flex-1">
                <div className="text-sm font-bold">内訳カードも一緒にシェア</div>
                <div className="text-[11px] text-default-400">
                  きずなLv.の内訳を2枚目の画像として追加します
                </div>
              </div>
              <Switch
                size="sm"
                isSelected={includeBreakdown}
                onValueChange={setIncludeBreakdown}
                isDisabled={busy !== null}
                aria-label="内訳カードも一緒にシェア"
              />
            </div>

            {captureFailed && (
              <p role="alert" className="px-1 text-xs text-danger lg:text-sm">
                画像の生成に失敗しました。テキストだけでシェアできます。
              </p>
            )}

            <div className="flex flex-col gap-3 sm:flex-row">
              {captureFailed ? (
                <Button
                  as="a"
                  href={xIntentHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  size="lg"
                  className="bg-amber-400 font-bold text-neutral-900"
                  startContent={<LuShare2 className="text-lg" />}
                >
                  テキストだけでシェア
                </Button>
              ) : (
                <Button
                  size="lg"
                  className="bg-amber-400 font-bold text-neutral-900"
                  startContent={
                    busy !== "share" && canShare && <LuShare2 className="text-lg" />
                  }
                  isLoading={busy === "share" || !canShare}
                  isDisabled={busy !== null || !canShare}
                  onPress={handleShare}
                >
                  {canShare ? "結果カードをシェア" : "画像を準備しています"}
                </Button>
              )}

              {!captureFailed && (
                <Button
                  size="lg"
                  variant="bordered"
                  className="font-bold"
                  startContent={<LuDownload className="text-lg" />}
                  isDisabled={busy !== null || !canShare}
                  isLoading={busy === "save"}
                  onPress={handleSave}
                >
                  画像を保存
                </Button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* キャプチャ用の画面外DOM */}
      {hasResult && tier && (
        <div
          className="pointer-events-none fixed left-[-10000px] top-0"
          aria-hidden="true"
        >
          <div ref={shareCardRef} style={{ width: captureWidth }}>
            <KizunaShareCard
              sprites={spritesOf(selectedDeck!)}
              deckName={selectedDeck!.data.name}
              score={estimate!.score}
              tierName={tier.name}
              tierMessage={tier.message}
            />
          </div>

          {/* 2枚目：内訳カード。トグルOFFでも描画しておく（ONに切り替えた瞬間に撮れるように） */}
          <div ref={breakdownCardRef} style={{ width: captureWidth }}>
            <KizunaBreakdownCard
              deckName={selectedDeck!.data.name}
              score={estimate!.score}
              tierName={tier.name}
              metrics={estimate!.metrics}
            />
          </div>
        </div>
      )}
    </div>
  );
}
