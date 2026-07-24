"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";

import { Button, Card, CardBody, Chip, useDisclosure } from "@heroui/react";
import { LuChevronRight, LuFilePen, LuLock } from "react-icons/lu";
import { sendGAEvent } from "@next/third-parties/google";

import PokemonSprite from "@app/components/atoms/PokemonSprite";
import DeckCodeQuickStartModal from "@app/components/organisms/Deck/Modal/DeckCodeQuickStartModal";
import { getDeckSpriteBySlot } from "@app/utils/deckSprite";
import { fingerprintKey } from "@app/utils/fingerprint";
import { lastWeekValue } from "@app/utils/week";
import { DeckData, DeckGetResponseType } from "@app/types/deck";
import {
  WeeklyDeckUsageItemType,
  WeeklyDeckUsageStatType,
} from "@app/types/weekly_deck_usage_stat";

// 施策E-2「環境の窓」カード。
//
// 記録0件のユーザーは、自分の勝率が貯まるまで価値を得られない（価値の後払い構造・
// engagement-strategy-blindspots.md §2）。そこで、既に持っているプラットフォーム全体の
// 週次デッキ使用率（/deck_meta と同じ集計）に、ユーザー自身の登録デッキを突き合わせ、
// 「あなたのデッキは環境◯位」を記録ゼロの時点で先出しする。あわせて「あなた自身の勝率が
// 入る空欄（予約席）」を見せ、「見る→書く」への動機に変える。
//
// 突合はフロントだけで完結する（core-api 改修なし）。自分デッキの pokemon_sprites から
// サーバと同じ規則で指紋を再計算し（fingerprint.ts）、環境各行の fingerprint と一致する
// 行を探す。表示条件（記録0件・トグル有効）はサーバ側(Dashboard.tsx)で判定するため、
// このコンポーネントは「表示すると決まったとき」だけ描画される。

type Props = {
  // GA 計測のラベル用。FirstRecordCtaCard と同じくコホート別に効果を見られるようにする。
  cohortWeek?: string;
  daysSinceSignup?: number;
};

// 表示状態。A=自分デッキがランキングにヒット / B=デッキはあるがランク外 / C=デッキ未登録。
type Variant = "A" | "B" | "C";

// 勝率に応じた色分け（WeeklyDeckUsagePanel・既存の統計表示と同じ閾値）。
function winRateChipColor(
  rate: number,
): "success" | "default" | "warning" | "danger" {
  if (rate >= 0.55) return "success";
  if (rate >= 0.45) return "default";
  if (rate >= 0.4) return "warning";
  return "danger";
}

// 予約席の「環境の平均勝率」を色付きテキストで出すためのクラス（チップと同じ意味色）。
function winRateTextClass(rate: number): string {
  const color = winRateChipColor(rate);
  if (color === "success") return "text-success";
  if (color === "warning") return "text-warning";
  if (color === "danger") return "text-danger";
  return "text-default-600";
}

// デッキ変種のスプライトを2枠固定で表示する（WeeklyDeckUsagePanel の DeckSprites と同じ流儀）。
function DeckSprites({
  sprites,
  size = 32,
}: {
  sprites: { id: string; position?: number }[] | undefined;
  size?: number;
}) {
  const list = sprites ?? [];
  return (
    <div className="flex items-center gap-0 shrink-0">
      {([1, 2] as const).map((slot) => (
        <PokemonSprite key={slot} id={getDeckSpriteBySlot(list, slot)?.id} size={size} />
      ))}
    </div>
  );
}

// 上位3件をメダル配色で強調する（WeeklyDeckUsagePanel の RankBadge と同じ）。
function RankBadge({ rank }: { rank: number }) {
  const style =
    rank === 1
      ? "bg-amber-400/20 text-amber-600 ring-1 ring-amber-400/40"
      : rank === 2
        ? "bg-default-300/30 text-default-500 ring-1 ring-default-300/60"
        : rank === 3
          ? "bg-orange-400/20 text-orange-700 ring-1 ring-orange-400/40"
          : "bg-default-100 text-default-400";

  return (
    <span
      className={`flex items-center justify-center w-6 h-6 rounded-full text-[11px] font-black shrink-0 ${style}`}
    >
      {rank}
    </span>
  );
}

// TOP3 の1行（自分のデッキなら isMe でハイライト＋デッキ名を出す）。
function DeckRankRow({
  rank,
  item,
  isMe,
  meName,
}: {
  rank: number;
  item: WeeklyDeckUsageItemType;
  isMe?: boolean;
  meName?: string;
}) {
  return (
    <div
      className={`flex flex-col gap-1.5 rounded-xl px-3 py-2 ${
        isMe ? "bg-primary/10 ring-1 ring-primary/60" : "bg-default-100"
      }`}
    >
      <div className="flex items-center gap-2">
        <RankBadge rank={rank} />
        <DeckSprites sprites={item.pokemon_sprites} />
        {isMe && (
          <>
            {meName && (
              <span className="font-bold text-xs text-default-600 truncate">
                {meName}
              </span>
            )}
            <Chip
              size="sm"
              color="primary"
              variant="flat"
              classNames={{ base: "h-5 px-0.5", content: "text-[10px] font-bold px-1.5" }}
            >
              あなたのデッキ
            </Chip>
          </>
        )}
        <span className="ml-auto text-lg font-black tabular-nums text-default-700 shrink-0 leading-none">
          {(item.usage_rate * 100).toFixed(1)}
          <span className="text-xs font-bold text-default-400">%</span>
        </span>
      </div>
      <div className="flex items-center gap-2">
        <div className="flex-1 h-1.5 rounded-full bg-default-200 overflow-hidden">
          <div
            className="h-full rounded-full bg-primary/70"
            style={{ width: `${Math.min(100, Math.max(2, Math.round(item.usage_rate * 100)))}%` }}
          />
        </div>
        <Chip
          size="sm"
          variant="flat"
          color={winRateChipColor(item.win_rate)}
          classNames={{
            base: "h-5 px-0.5 shrink-0",
            content: "text-[10px] font-bold tabular-nums px-1.5",
          }}
        >
          勝率 {(item.win_rate * 100).toFixed(1)}%
        </Chip>
      </div>
    </div>
  );
}

// 予約席: 環境の平均勝率（借り物・実線）と、あなたの勝率（空欄・破線）を並べて見せる。
// 空欄を「自分の数字で埋めたい未完成」に変え、記録への動機にする。
function ReservedSeat({ envWinRate }: { envWinRate: number }) {
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-dashed border-default-300 bg-default-50 px-3 py-3">
      <div className="flex items-center justify-between gap-3">
        <div className="text-xs font-bold text-default-600">
          このデッキの全体勝率
          <span className="block text-[10px] font-medium text-default-400 mt-0.5">
            環境の平均（借り物）
          </span>
        </div>
        <span className={`text-lg font-black tabular-nums ${winRateTextClass(envWinRate)}`}>
          {(envWinRate * 100).toFixed(1)}%
        </span>
      </div>
      <div className="h-px bg-default-200" />
      <div className="flex items-center justify-between gap-3">
        <div className="text-xs font-bold text-default-600">
          あなたの勝率
          <span className="block text-[10px] font-medium text-default-400 mt-0.5">
            あなたの記録から算出
          </span>
        </div>
        <span className="text-lg font-black tabular-nums text-default-300 tracking-widest">
          — —
        </span>
      </div>
      <div className="flex items-center gap-1.5 text-[11px] font-bold text-primary leading-snug">
        <LuLock className="w-3 h-3 shrink-0" />
        1件記録すると、ここに「あなた vs 環境平均」が出ます
      </div>
    </div>
  );
}

function BetaHeader({ stat }: { stat: WeeklyDeckUsageStatType }) {
  const period =
    stat.week_start && stat.week_end ? `${stat.week_start} 〜 ${stat.week_end} の週` : "";
  return (
    <div className="flex items-start gap-2">
      <Chip
        size="sm"
        color="warning"
        variant="flat"
        classNames={{ base: "h-5 px-0.5 shrink-0", content: "text-[10px] font-black px-1.5" }}
      >
        β機能
      </Chip>
      <span className="text-[11px] text-default-400 leading-snug">
        プラットフォーム全体の週次デッキ使用率
        {period && (
          <>
            <br />
            {period} ・ {stat.contributor_count}人 / のべ{stat.total_votes}件
          </>
        )}
      </span>
    </div>
  );
}

function SkeletonCard() {
  return (
    <Card className="shadow-md">
      <CardBody className="gap-3 p-4">
        <div className="h-4 w-40 rounded bg-default-100 animate-pulse" />
        <div className="h-16 rounded-xl bg-default-100 animate-pulse" />
        <div className="h-20 rounded-xl bg-default-100 animate-pulse" />
      </CardBody>
    </Card>
  );
}

export default function EnvironmentWindowCard({ cohortWeek, daysSinceSignup }: Props) {
  const [stat, setStat] = useState<WeeklyDeckUsageStatType | null>(null);
  const [userDecks, setUserDecks] = useState<DeckData[] | null>(null);
  const [failed, setFailed] = useState(false);

  const { isOpen, onOpen, onOpenChange } = useDisclosure();

  // 環境ランキング（公開・認証不要）と自分の登録デッキ（要ログイン）を並行取得する。
  // どちらか一方でも失敗したら、誤情報を出さないためカードごと非表示にする。
  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const [statRes, decksRes] = await Promise.all([
          fetch(`/api/deck_meta/weekly_usage?week=${lastWeekValue()}`, { cache: "no-store" }),
          fetch(`/api/decks?archived=false&cursor=`, { cache: "no-store" }),
        ]);

        if (!statRes.ok || !decksRes.ok) throw new Error("fetch failed");

        const statData: WeeklyDeckUsageStatType = await statRes.json();
        const decksData: DeckGetResponseType = await decksRes.json();

        if (cancelled) return;
        setStat(statData);
        setUserDecks(decksData.decks.map((d) => d.data));
      } catch (e) {
        console.error(e);
        if (!cancelled) setFailed(true);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  // ランキング対象（「その他」= 空指紋を除く）。使用率降順・同率は勝率降順で順位を確定する。
  const rankable = useMemo(() => {
    const list = (stat?.decks ?? []).filter((d) => d.fingerprint !== "");
    return [...list].sort((a, b) => b.count - a.count || b.win_rate - a.win_rate);
  }, [stat]);

  // 自分の登録デッキのうち、今週のランキングにヒットしたもの（順位昇順）。
  const myMatches = useMemo(() => {
    if (!userDecks) return [];
    const out: { deck: DeckData; rank: number; row: WeeklyDeckUsageItemType }[] = [];
    for (const deck of userDecks) {
      const fp = fingerprintKey((deck.pokemon_sprites ?? []).map((s) => s.id));
      if (fp === "") continue; // スプライト未設定は突合不可
      const idx = rankable.findIndex((d) => d.fingerprint === fp);
      if (idx >= 0) out.push({ deck, rank: idx + 1, row: rankable[idx] });
    }
    return out.sort((a, b) => a.rank - b.rank);
  }, [userDecks, rankable]);

  const variant: Variant | null = useMemo(() => {
    if (!stat || !userDecks) return null; // 読み込み中
    if (rankable.length === 0) return null; // 環境データが無い週はカードごと出さない
    if (myMatches.length > 0) return "A";
    if (userDecks.length > 0) return "B";
    return "C";
  }, [stat, userDecks, rankable, myMatches]);

  const eventParams = useMemo(
    () => ({ cohort_week: cohortWeek ?? "unknown", days_since_signup: daysSinceSignup ?? -1 }),
    [cohortWeek, daysSinceSignup],
  );

  // 表示回数を計測（状態が確定したとき1回だけ）。
  const sentImpression = useRef(false);
  useEffect(() => {
    if (variant == null || sentImpression.current) return;
    sentImpression.current = true;
    sendGAEvent("event", "env_window_impression", { ...eventParams, variant });
  }, [variant, eventParams]);

  function handleRecordClick() {
    sendGAEvent("event", "env_window_cta_click", {
      ...eventParams,
      variant: variant ?? "unknown",
      action: "record",
    });
  }

  function handleDeckRegisterClick() {
    sendGAEvent("event", "env_window_cta_click", {
      ...eventParams,
      variant: variant ?? "unknown",
      action: "deck_register",
    });
    onOpen();
  }

  if (failed) return null;
  if (stat == null || userDecks == null) return <SkeletonCard />;
  if (variant == null) return null;

  const top3 = rankable.slice(0, 3);
  // 指紋 → 自分のデッキ名。TOP3内に自分のデッキが複数入っても、行ごとに正しい名前を出す。
  const myDeckNameByFingerprint = new Map(
    myMatches.map((m) => [m.row.fingerprint, m.deck.name]),
  );

  const recordCta = (
    <Button
      as={Link}
      href="/records/quick"
      color="primary"
      radius="full"
      startContent={<LuFilePen className="w-4 h-4" />}
      className="font-bold shadow-md w-full"
      onPress={handleRecordClick}
    >
      {variant === "A" ? "この枠を、あなたの1戦で解錠する" : "最初の記録をつける"}
    </Button>
  );

  return (
    <>
      <Card className="shadow-md">
        <CardBody className="gap-3 p-4">
          <BetaHeader stat={stat} />

          {variant === "C" ? (
            <>
              <span className="text-xs font-bold text-default-500 tracking-wide">
                今週の対戦環境
              </span>
              <p className="text-xs text-default-500 leading-relaxed rounded-xl bg-default-50 border border-default-100 px-3 py-2.5">
                デッキを登録すると、
                <span className="font-bold text-default-700">
                  あなたのデッキが環境で何位か
                </span>
                がここに表示されます。
              </p>

              <div className="flex items-center justify-between px-1 -mb-1">
                <span className="text-[11px] font-black text-default-500">使用率ランキング</span>
                <span className="text-[10px] text-default-400">使用率が高い順</span>
              </div>
              <div className="flex flex-col gap-1.5">
                {top3.map((item, idx) => (
                  <DeckRankRow key={item.fingerprint} rank={idx + 1} item={item} />
                ))}
              </div>

              <Button
                color="primary"
                variant="flat"
                radius="full"
                startContent={<LuChevronRight className="w-4 h-4" />}
                className="font-bold w-full"
                onPress={handleDeckRegisterClick}
              >
                デッキコードで登録する
              </Button>
            </>
          ) : variant === "A" ? (
            <>
              <span className="text-xs font-bold text-default-500 tracking-wide">
                環境の中の、あなたのデッキ
              </span>

              {/* ヒーロー: あなたは環境◯位 */}
              <div className="flex items-center gap-3 rounded-2xl bg-default-50 border border-default-100 px-3.5 py-3">
                <DeckSprites sprites={myMatches[0].deck.pokemon_sprites} size={40} />
                <div className="min-w-0 flex-1">
                  <div className="font-bold text-sm truncate">{myMatches[0].deck.name}</div>
                  <div className="flex items-baseline gap-2 mt-1 flex-wrap">
                    <span className="text-2xl font-black leading-none tabular-nums">
                      環境{myMatches[0].rank}
                      <span className="text-xs font-black text-default-400 ml-0.5">位</span>
                    </span>
                    <span className="text-[11px] text-default-500 tabular-nums">
                      使用率 {(myMatches[0].row.usage_rate * 100).toFixed(1)}% ・{" "}
                      {myMatches[0].row.count}件
                    </span>
                  </div>
                </div>
              </div>

              <ReservedSeat envWinRate={myMatches[0].row.win_rate} />

              <div className="flex items-center justify-between px-1 -mb-1">
                <span className="text-[11px] font-black text-default-500">
                  今週あなたが当たりやすいデッキ
                </span>
                <span className="text-[10px] text-default-400">使用率順</span>
              </div>
              <div className="flex flex-col gap-1.5">
                {top3.map((item, idx) => {
                  const meName = myDeckNameByFingerprint.get(item.fingerprint);
                  return (
                    <DeckRankRow
                      key={item.fingerprint}
                      rank={idx + 1}
                      item={item}
                      isMe={meName != null}
                      meName={meName}
                    />
                  );
                })}
              </div>

              {recordCta}
            </>
          ) : (
            // variant === "B": デッキはあるがランク外
            <>
              <span className="text-xs font-bold text-default-500 tracking-wide">
                環境の中の、あなたのデッキ
              </span>

              <div className="flex items-center gap-3 rounded-2xl bg-default-50 border border-default-100 px-3.5 py-3">
                <DeckSprites sprites={userDecks[0].pokemon_sprites} size={40} />
                <div className="min-w-0 flex-1">
                  <div className="font-bold text-sm truncate">{userDecks[0].name}</div>
                  <div className="text-sm font-bold text-default-500 mt-1">
                    今週はまだランク外
                  </div>
                  <div className="text-[11px] text-default-400 mt-0.5 leading-snug">
                    出現が少なく、まだ集計対象に届いていません
                  </div>
                </div>
              </div>

              <p className="text-xs font-bold text-primary leading-relaxed rounded-xl bg-primary/10 px-3 py-2.5">
                あなたの記録が、このデッキの環境データを作ります。
              </p>

              <div className="flex items-center justify-between px-1 -mb-1">
                <span className="text-[11px] font-black text-default-500">今週の環境 TOP3</span>
                <span className="text-[10px] text-default-400">使用率順</span>
              </div>
              <div className="flex flex-col gap-1.5">
                {top3.map((item, idx) => (
                  <DeckRankRow key={item.fingerprint} rank={idx + 1} item={item} />
                ))}
              </div>

              {recordCta}
            </>
          )}
        </CardBody>
      </Card>

      <DeckCodeQuickStartModal isOpen={isOpen} onOpenChange={onOpenChange} />
    </>
  );
}
