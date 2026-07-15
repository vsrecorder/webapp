"use client";

import { useEffect, useState } from "react";

import { Card, CardHeader, CardBody } from "@heroui/react";
import { Image, Skeleton, Chip } from "@heroui/react";

import { spriteScaleClass, spriteImageUrl } from "@app/utils/sprite";
//import { Chip } from "@heroui/react";

import { useDisclosure } from "@heroui/react";

import { LuCalendar } from "react-icons/lu";
import { LuChevronDown } from "react-icons/lu";
import { LuChevronRight } from "react-icons/lu";
import { LuSwords } from "react-icons/lu";

import DeckCodeCard from "@app/components/organisms/Deck/DeckCodeCard";
import ShowDeckModal from "@app/components/organisms/Deck/Modal/ShowDeckModal";

import { useDeckCodes } from "@app/hooks/useDeckCodes";

import { DeckGetByIdResponseType } from "@app/types/deck";
import { DeckCodeType } from "@app/types/deck_code";
import { DeckUsageItemType } from "@app/types/deck_usage_stat";

// 一覧の表示モード。gallery=従来の詳細カード、list=1行に畳んだコンパクト表示。
export type DeckCardView = "gallery" | "list";

type Props = {
  deckData: DeckGetByIdResponseType | null;
  deckcodeData: DeckCodeType | null;
  deckUsageStat?: DeckUsageItemType | null;
  onRemove: (id: string) => void;
  enableShowDeckModal: boolean;
  view?: DeckCardView;
};

// 勝率に応じた色分け（UserStatPanel/RecentMatchWinRateChartの勝率表示と同じ閾値に合わせる）
function winRateTextColor(rate: number): string {
  if (rate >= 0.55) return "text-success";
  if (rate >= 0.45) return "text-default-500";
  if (rate >= 0.4) return "text-warning";
  return "text-danger";
}

// 小数点第1位までフォーマットした数値文字列から、ちょうど割り切れる場合の
// 末尾".0"を取り除く（例: "50.0" → "50", "33.3" はそのまま）
function trimTrailingZeroDecimal(value: string): string {
  return value.endsWith(".0") ? value.slice(0, -2) : value;
}

// 割合(0〜1)を小数点第1位までのパーセント表記にする
function formatPercent(rate: number): string {
  return `${trimTrailingZeroDecimal((rate * 100).toFixed(1))}%`;
}

// 先攻時/後攻時の勝率が、デッキ全体の勝率からどれだけ乖離しているかを
// 小数点第1位までのポイント差（引き算）で表すラベルと色を算出する。
// 「全体比」は比率（割り算）を連想させ実態と合わないため、列見出しは
// 差であることが伝わる「全体差」とする（値自体には単位を付けずスペースを節約する）。
function formatWinRateDeviation(rate: number, overallWinRate: number) {
  const diffPt = Math.round((rate - overallWinRate) * 1000) / 10;
  const absLabel = trimTrailingZeroDecimal(Math.abs(diffPt).toFixed(1));

  return {
    label: diffPt === 0 ? "±0" : diffPt > 0 ? `+${absLabel}` : `-${absLabel}`,
    colorClass:
      diffPt > 0 ? "text-success" : diffPt < 0 ? "text-danger" : "text-default-400",
  };
}

export default function DeckCard({
  deckData,
  deckcodeData,
  deckUsageStat,
  onRemove,
  enableShowDeckModal,
  view = "list",
}: Props) {
  const [deck, setDeck] = useState<DeckGetByIdResponseType | null>(deckData);
  const [deckcode, setDeckCode] = useState<DeckCodeType | null>(deckcodeData);

  // 段階的開示の開閉状態はリスト表示とギャラリー表示で独立させる。
  // リスト表示は先攻/後攻の内訳・デッキコード画像、ギャラリー表示はヒーロー画像より
  // 下の情報（デッキコード・戦績・先攻/後攻）を畳む。表示モードごとに畳む対象も
  // レイアウトも異なるため、片方の開閉状態がもう片方に引き継がれないようにする。
  const [listExpanded, setListExpanded] = useState(false);
  const [galleryExpanded, setGalleryExpanded] = useState(false);

  // 表示モードを切り替えたら、両方の開閉状態を初期化（閉じた状態）に戻す。
  useEffect(() => {
    setListExpanded(false);
    setGalleryExpanded(false);
  }, [view]);

  // ギャラリー表示のヒーロー画像の読み込み状態
  const [heroImageLoaded, setHeroImageLoaded] = useState(false);

  const { isOpen, onOpen, onOpenChange } = useDisclosure();

  // このデッキの全バージョン（デッキコード）。件数バッジと通し番号の算出に使う。
  const { deckcodes } = useDeckCodes(deck?.id, deckcode?.id);
  const versionCount = deckcodes?.length ?? null;

  // バッジタップ時、デッキ詳細を開くと同時にバージョン履歴も自動で開く
  const [openHistoryOnShow, setOpenHistoryOnShow] = useState(false);

  // 記録の詳細ページから戻ってきた際、対象デッキならデッキモーダルを再開する。
  // 記録一覧モーダルも再開する意図は、React state ではなく sessionStorage で
  // 伝える（StrictMode の二重マウントで state 同期が壊れるのを避けるため）。
  useEffect(() => {
    if (!enableShowDeckModal || !deck) return;
    const pendingDeckId = sessionStorage.getItem("reopenDeckModalDeckId");
    if (pendingDeckId && pendingDeckId === deck.id) {
      sessionStorage.removeItem("reopenDeckModalDeckId");
      // ShowDeckModal が開いたときに記録一覧モーダルも開くための意図フラグ
      sessionStorage.setItem("reopenRecordsModalForDeckId", deck.id);
      onOpen();
    }
    // deck.id を依存に含め、対象デッキのカードでのみ一度だけ実行する。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enableShowDeckModal, deck?.id]);

  // 表示中のデッキコード（画像）が変わったらヒーロー画像の読み込み状態をリセットする。
  useEffect(() => {
    setHeroImageLoaded(false);
  }, [deckcode?.code]);

  if (!deck) {
    return (
      <>
        <div className="" onClick={onOpen}>
          <Card className="pt-3 w-full">
            <CardHeader className="pt-0 pb-0 px-3">
              <div className="flex flex-col gap-1 w-full">
                {/* 両端配置 */}
                <div className="flex items-center justify-between w-full">
                  {/* 左側 */}
                  <div className="font-bold text-large truncate w-full min-w-0">
                    <>なし</>
                  </div>

                  {/* 右側：登録日 */}
                  <div className="flex items-center gap-1 text-tiny text-default-400 shrink-0">
                    <LuCalendar className="text-xs" />
                    なし
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardBody className="px-3 py-2">
              <DeckCodeCard deckcode={deckcode} />
            </CardBody>
          </Card>
        </div>

        {enableShowDeckModal && (
          <ShowDeckModal
            deck={deck}
            setDeck={setDeck}
            deckcode={deckcode}
            setDeckCode={setDeckCode}
            isOpen={isOpen}
            onOpenChange={onOpenChange}
            onRemove={onRemove}
            autoOpenHistory={false}
            onAutoOpenHistoryHandled={() => {}}
          />
        )}
      </>
    );
  }

  const date = new Date(deck.created_at).toLocaleString("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short",
  });

  // リスト表示の右側に出す登録日（曜日付き）。例: 2026年7月9日(木)
  const listDate = new Date(deck.created_at).toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short",
  });

  // archived_atがゼロ値(年が1)なら未アーカイブ
  const isArchived = new Date(deck.archived_at).getFullYear() !== 1;

  // 先攻/後攻それぞれで試行回数があるか（勝率列の表示可否に使う）
  const goFirstHasStats = !!deckUsageStat && deckUsageStat.go_first_count > 0;
  const goSecondHasStats = !!deckUsageStat && deckUsageStat.go_second_count > 0;

  // 先攻時/後攻時の勝率とデッキ全体の勝率との乖離度。試行回数が0件の側は表示しない。
  // また勝率が0%または100%の場合は、母数が少なく乖離度の情報価値が乏しいため表示しない。
  const goFirstDeviation =
    goFirstHasStats &&
    deckUsageStat!.go_first_win_rate > 0 &&
    deckUsageStat!.go_first_win_rate < 1
      ? formatWinRateDeviation(deckUsageStat!.go_first_win_rate, deckUsageStat!.win_rate)
      : null;
  const goSecondDeviation =
    goSecondHasStats &&
    deckUsageStat!.go_second_win_rate > 0 &&
    deckUsageStat!.go_second_win_rate < 1
      ? formatWinRateDeviation(deckUsageStat!.go_second_win_rate, deckUsageStat!.win_rate)
      : null;

  const hasStats = !!deckUsageStat && deckUsageStat.count > 0;
  const winRate = deckUsageStat?.win_rate ?? 0;
  const ringRadius = 18;
  const ringCircumference = 2 * Math.PI * ringRadius;

  // 集計対象外(ignore_stats_flg=true)の記録件数。1件以上あればその旨を表示する。
  const ignoredCount = deckUsageStat?.ignored_count ?? 0;

  // 対戦記録がまだ無いデッキ向けの案内（味気ない「なし」表示を避ける）。
  // リスト/ギャラリー双方で同じ表示にする。
  const noRecordsNote = (
    <div className="flex flex-col items-center gap-2 rounded-lg bg-default-100 px-3 py-3 text-center">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
        <LuSwords className="text-base text-primary" />
      </div>
      <div className="min-w-0">
        <div className="text-tiny font-bold text-default-600">
          まだ対戦記録がありません
        </div>
        <div className="text-[10px] text-default-400">
          対戦を記録すると勝率や先攻・後攻の成績が見られます
        </div>
      </div>
    </div>
  );

  // 「集計対象外の記録がある」旨を示す注記。リスト/ギャラリー双方で使い回す。
  const ignoredNote =
    ignoredCount > 0 ? (
      <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
        <Chip
          size="sm"
          variant="flat"
          color="warning"
          className="h-5 text-[10px] font-bold"
        >
          ⚠ 集計対象外 {ignoredCount}件
        </Chip>
        <span className="text-[10px] text-default-400">勝率などの集計に未反映</span>
      </div>
    ) : null;

  // 1行に畳んだコンパクト表示。スプライト＋勝率リングで識別する。
  // タップ＝デッキ詳細を開く（ギャラリー表示と同じルール）。先攻/後攻の内訳や
  // デッキコード画像の段階的開示は、右端のシェブロンボタンだけが担う。
  const listCard = (
    <div className="w-full">
      <Card className="w-full transition-transform active:scale-[0.985]">
        {/* ヘッダー：タップでデッキ詳細（ShowDeckModal）を開く */}
        <div className="flex flex-col gap-1.5 px-3 py-3 cursor-pointer" onClick={onOpen}>
          {/* 右上：登録日を独立した行として右寄せで表示（見切れ防止） */}
          <div className="flex justify-end">
            <span className="flex items-center gap-1 text-tiny text-default-400 whitespace-nowrap">
              <LuCalendar className="text-xs" />
              {listDate}
            </span>
          </div>

          {/* コンテンツ行：スプライト・勝率リング・デッキ名/戦績・シェブロン */}
          <div className="flex items-center gap-3">
            {/* スプライト2体（識別用）。ギャラリー表示と同じ w/h・scale で揃え、
              2体が同一サイズで表示されるようにする（負マージンは画像がずれて
              サイズが不揃いに見えるため使わない）。 */}
            <div className="flex items-center gap-0 shrink-0">
              {[0, 1].map((i) => (
                <Image
                  key={i}
                  alt={deck.pokemon_sprites[i]?.id ?? "unknown"}
                  src={spriteImageUrl(deck.pokemon_sprites[i]?.id)}
                  className={`w-12 h-12 object-contain origin-bottom ${
                    deck.pokemon_sprites[i]
                      ? spriteScaleClass(deck.pokemon_sprites[i].id)
                      : "scale-150"
                  }`}
                />
              ))}
            </div>

            {/* 勝率リング（対戦記録が無い場合も枠を表示し、中央は「-」にする） */}
            <div className="relative w-11 h-11 shrink-0">
              <svg
                viewBox="0 0 44 44"
                className={`w-full h-full ${hasStats ? winRateTextColor(winRate) : "text-default-300"}`}
              >
                <circle
                  cx="22"
                  cy="22"
                  r={ringRadius}
                  fill="none"
                  strokeWidth="5"
                  className="text-default-200"
                  stroke="currentColor"
                />
                {hasStats && (
                  <circle
                    cx="22"
                    cy="22"
                    r={ringRadius}
                    fill="none"
                    strokeWidth="5"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeDasharray={ringCircumference}
                    strokeDashoffset={ringCircumference * (1 - winRate)}
                    transform="rotate(-90 22 22)"
                  />
                )}
              </svg>
              <div
                className={`absolute inset-0 flex items-center justify-center text-tiny font-black tabular-nums ${hasStats ? winRateTextColor(winRate) : "text-default-300"}`}
              >
                {hasStats ? formatPercent(winRate) : "-"}
              </div>
            </div>

            {/* デッキ名＋戦績。対戦記録が無い場合は行内では一言に留め、
              詳しい案内は展開時にギャラリー表示と同じパネルで見せる。 */}
            <div className="flex-1 min-w-0">
              <div className="font-bold text-medium truncate">{deck.name}</div>
              <div className="text-tiny truncate">
                {hasStats ? (
                  <span className="text-default-400">
                    {`${deckUsageStat!.count}戦${deckUsageStat!.wins}勝${deckUsageStat!.losses}敗`}
                  </span>
                ) : ignoredCount > 0 ? (
                  <span className="flex items-center gap-1 font-semibold text-warning">
                    <span aria-hidden>⚠</span>
                    集計対象外の記録 {ignoredCount}件
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-default-400">
                    <LuSwords className="text-[11px] shrink-0" />
                    まだ対戦記録がありません
                  </span>
                )}
              </div>
            </div>

            {/* 内訳の開閉ボタン。行タップ（＝詳細を開く）と役割が衝突しないよう、
              独立した当たり判定（44px相当）を持つボタンにして伝播を止める。 */}
            <button
              type="button"
              aria-label={
                listExpanded ? "先攻・後攻の内訳を閉じる" : "先攻・後攻の内訳を開く"
              }
              aria-expanded={listExpanded}
              onClick={(e) => {
                e.stopPropagation();
                setListExpanded((v) => !v);
              }}
              className="shrink-0 flex h-9 w-9 items-center justify-center rounded-full text-default-400 bg-default-100 active:opacity-70"
            >
              <LuChevronDown
                aria-hidden
                className={`text-lg transition-transform ${listExpanded ? "rotate-180" : ""}`}
              />
            </button>
          </div>
        </div>

        {/* 展開部：タップでデッキ情報モーダルを開く。
            内部の CTA ボタン等は自身で stopPropagation して個別動作する。 */}
        {listExpanded && (
          <div className="px-3 pb-3 flex flex-col gap-2 cursor-pointer" onClick={onOpen}>
            {/* 対戦記録が無いデッキ：ギャラリー表示と同じ案内パネルを出す */}
            {!hasStats && ignoredCount === 0 && noRecordsNote}

            {hasStats && deckUsageStat!.game_count > 0 && (
              <div className="grid grid-cols-2 gap-2">
                {/* 先攻：各数値が何を表すか分かるよう「割合／勝率」のラベルを付け、
                    勝率の横に全体差（デッキ全体の勝率との差）を添える。 */}
                <div className="rounded-lg bg-default-100 px-2.5 py-2">
                  <div className="text-tiny font-bold text-default-600 mb-1">先攻</div>
                  <div className="grid grid-cols-[auto_1fr] items-baseline gap-x-2 gap-y-0.5 text-[11px] tabular-nums">
                    <span className="text-default-400">割合</span>
                    <span className="text-right text-default-600">
                      {deckUsageStat!.go_first_count > 0 ? (
                        <>
                          {formatPercent(deckUsageStat!.go_first_rate)}
                          <span className="text-default-400">
                            （{deckUsageStat!.go_first_count}件）
                          </span>
                        </>
                      ) : (
                        "-"
                      )}
                    </span>
                    <span className="text-default-400">勝率</span>
                    <span
                      className={`text-right font-bold ${
                        goFirstHasStats
                          ? winRateTextColor(deckUsageStat!.go_first_win_rate)
                          : "text-default-500"
                      }`}
                    >
                      {goFirstHasStats
                        ? formatPercent(deckUsageStat!.go_first_win_rate)
                        : "-"}
                      {goFirstDeviation && (
                        <span
                          className={`ml-1 text-[10px] font-semibold ${goFirstDeviation.colorClass}`}
                        >
                          （全体差 {goFirstDeviation.label}）
                        </span>
                      )}
                    </span>
                  </div>
                </div>
                {/* 後攻 */}
                <div className="rounded-lg bg-default-100 px-2.5 py-2">
                  <div className="text-tiny font-bold text-default-600 mb-1">後攻</div>
                  <div className="grid grid-cols-[auto_1fr] items-baseline gap-x-2 gap-y-0.5 text-[11px] tabular-nums">
                    <span className="text-default-400">割合</span>
                    <span className="text-right text-default-600">
                      {deckUsageStat!.go_second_count > 0 ? (
                        <>
                          {formatPercent(1 - deckUsageStat!.go_first_rate)}
                          <span className="text-default-400">
                            （{deckUsageStat!.go_second_count}件）
                          </span>
                        </>
                      ) : (
                        "-"
                      )}
                    </span>
                    <span className="text-default-400">勝率</span>
                    <span
                      className={`text-right font-bold ${
                        goSecondHasStats
                          ? winRateTextColor(deckUsageStat!.go_second_win_rate)
                          : "text-default-500"
                      }`}
                    >
                      {goSecondHasStats
                        ? formatPercent(deckUsageStat!.go_second_win_rate)
                        : "-"}
                      {goSecondDeviation && (
                        <span
                          className={`ml-1 text-[10px] font-semibold ${goSecondDeviation.colorClass}`}
                        >
                          （全体差 {goSecondDeviation.label}）
                        </span>
                      )}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {ignoredNote}

            {/* デッキ詳細/記録情報モーダルと同じレイアウト（デッキ画像→デッキコード） */}
            <DeckCodeCard
              deckcode={deckcode}
              totalVersionCount={versionCount}
              onCreateVersion={isArchived ? undefined : onOpen}
              isArchived={isArchived}
            />
          </div>
        )}
      </Card>
    </div>
  );

  return (
    <>
      {view === "list" ? (
        listCard
      ) : (
        <div onClick={onOpen} className="min-w-0 cursor-pointer">
          <Card className="w-full overflow-hidden border border-default-200 shadow-sm transition-transform active:scale-[0.985]">
            {/* ヘッダー：登録日を右上に独立表示し、その下にスプライト＋デッキ名。
              デッキ画像は明るい場合が多く重ね文字が読みづらいため、名前とスプライトは
              画像上ではなくここに置く。日付を別行にしてデッキ名の幅を確保する。 */}
            <CardHeader className="flex flex-col gap-1.5 px-3 pt-3 pb-2">
              {/* 右上：登録日 */}
              <div className="flex justify-end">
                <span className="flex items-center gap-1 whitespace-nowrap text-tiny text-default-400">
                  <LuCalendar className="text-xs" />
                  {date}
                </span>
              </div>
              {/* スプライトを上、デッキ名を下に配置（中央揃え・フル幅で見切れを防ぐ）。
                デッキ名は折り返さない（truncate）ため、min-w-0 を挟まないと最小コンテンツ幅が
                名前の全長まで広がり、カードごと横に伸びてしまう。 */}
              <div className="flex w-full min-w-0 flex-col items-center gap-1">
                <div className="flex items-center gap-0 shrink-0">
                  {[0, 1].map((i) => (
                    <Image
                      key={i}
                      alt={deck.pokemon_sprites[i]?.id ?? "unknown"}
                      src={spriteImageUrl(deck.pokemon_sprites[i]?.id)}
                      className={`w-11 h-11 object-contain origin-bottom ${
                        deck.pokemon_sprites[i]
                          ? spriteScaleClass(deck.pokemon_sprites[i].id)
                          : "scale-150"
                      }`}
                    />
                  ))}
                </div>
                <div className="w-full min-w-0 truncate text-center font-bold text-large">
                  {deck.name}
                </div>
              </div>
            </CardHeader>

            {/* ヒーロー：デッキ画像を主役に大きく表示。
              オーバーレイは暗背景で常に視認できる勝率バッジのみ。 */}
            {deckcode?.code && (
              <div className="relative w-full aspect-2/1 bg-default-100">
                {!heroImageLoaded && <Skeleton className="absolute inset-0" />}
                <Image
                  removeWrapper
                  radius="none"
                  alt={deckcode.code}
                  src={`https://xx8nnpgt.user.webaccel.jp/images/decks/${deckcode.code}.jpg`}
                  onLoad={() => setHeroImageLoaded(true)}
                  className="absolute inset-0 h-full w-full object-cover"
                />
                {/* 画像上に「タップで詳細」を重ねる。デッキ画像は一覧で最も目を引く
                  要素なので、押せることの手がかりをここに置くのが最も届きやすい。
                  暗い半透明の下地で、明るいデッキ画像の上でも読めるようにする。 */}
                <span className="absolute bottom-2 left-2 flex items-center gap-0.5 rounded-full bg-black/60 pl-2 pr-1.5 py-1 text-[10px] font-bold text-white backdrop-blur-sm">
                  タップで詳細
                  <LuChevronRight aria-hidden className="text-xs" />
                </span>
                {hasStats && (
                  <span className="absolute bottom-2 right-2 flex items-baseline gap-1 rounded-full bg-black/65 px-2.5 py-1 text-white backdrop-blur-sm">
                    <span className="text-medium font-black tabular-nums">
                      {formatPercent(winRate)}
                    </span>
                    <span className="text-[9px] opacity-85">勝率</span>
                  </span>
                )}
              </div>
            )}

            {/* ヒーロー画像より下の情報（デッキコード・戦績・先攻/後攻）はアコーディオンに畳む。
              一覧をスクロールする段階ではスプライト・デッキ名・画像・勝率バッジで足りるため、
              既定は閉じておき、必要なときだけ開く。カード自体のタップ（＝デッキ詳細を開く）と
              役割が衝突しないよう、開閉ボタンは伝播を止める。 */}
            <div className="px-3 pt-2 pb-3">
              <button
                type="button"
                aria-label={
                  galleryExpanded
                    ? "デッキコード・戦績を閉じる"
                    : "デッキコード・戦績を開く"
                }
                aria-expanded={galleryExpanded}
                onClick={(e) => {
                  e.stopPropagation();
                  setGalleryExpanded((v) => !v);
                }}
                className="flex w-full items-center justify-center gap-1 rounded-lg bg-default-100 px-3 py-2 text-tiny font-bold text-default-600 active:opacity-70"
              >
                {galleryExpanded ? "閉じる" : "デッキコード・戦績を見る"}
                <LuChevronDown
                  aria-hidden
                  className={`text-base transition-transform ${galleryExpanded ? "rotate-180" : ""}`}
                />
              </button>
            </div>

            {galleryExpanded && (
              <CardBody className="flex flex-col gap-3 px-3 pt-0 pb-3">
                {/* デッキ詳細/記録情報モーダルと同じレイアウト（デッキコードのみ）。
                デッキ画像はヒーローで表示済みのためhideImageで省き、
                ヒーロー画像の直下に続けて置く。 */}
                <DeckCodeCard
                  deckcode={deckcode}
                  totalVersionCount={versionCount}
                  onCreateVersion={isArchived ? undefined : onOpen}
                  isArchived={isArchived}
                  hideImage
                />

                {hasStats ? (
                  /* 戦績：勝率を中央で大きく目立たせ、対戦成績はその下に添える
                   （登録日はヘッダーに表示） */
                  <div className="flex flex-col items-center gap-0.5">
                    <span className="text-tiny font-bold text-default-400">勝率</span>
                    <span
                      className={`text-3xl font-black leading-none tabular-nums ${winRateTextColor(winRate)}`}
                    >
                      {formatPercent(winRate)}
                    </span>
                    <span className="text-tiny tabular-nums text-default-500">
                      {`${deckUsageStat!.count}戦${deckUsageStat!.wins}勝${deckUsageStat!.losses}敗`}
                    </span>
                  </div>
                ) : ignoredCount > 0 ? (
                  /* 集計対象外の記録だけがあるデッキ（勝率などは集計されない） */
                  <div className="flex flex-col items-center gap-2 rounded-lg bg-warning/10 px-3 py-3 text-center">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-warning/20 text-warning">
                      <span aria-hidden className="text-base">
                        ⚠
                      </span>
                    </div>
                    <div className="min-w-0">
                      <div className="text-tiny font-bold text-warning">
                        集計対象外の記録が{ignoredCount}件あります
                      </div>
                      <div className="text-[10px] text-default-400">
                        勝率・先攻/後攻などの集計には含まれていません
                      </div>
                    </div>
                  </div>
                ) : (
                  noRecordsNote
                )}

                {/* 先攻/後攻：割合(件数)・勝率(全体差)をチップで表示 */}
                {hasStats && deckUsageStat!.game_count > 0 && (
                  <div className="grid grid-cols-[auto_1fr_1fr] items-stretch gap-x-2 gap-y-1.5 text-[11px] tabular-nums">
                    {/* 先攻 */}
                    <span className="flex items-center font-bold text-default-600">
                      先攻
                    </span>
                    <span className="flex items-baseline justify-center gap-1 rounded-lg bg-default-100 px-2 py-1.5">
                      <span className="text-[9px] font-semibold text-default-400">
                        割合
                      </span>
                      {deckUsageStat!.go_first_count > 0
                        ? `${formatPercent(deckUsageStat!.go_first_rate)}（${deckUsageStat!.go_first_count}件）`
                        : "-"}
                    </span>
                    <span
                      className={`flex items-baseline justify-center gap-1 rounded-lg bg-default-100 px-2 py-1.5 font-bold ${
                        goFirstHasStats
                          ? winRateTextColor(deckUsageStat!.go_first_win_rate)
                          : "text-default-500"
                      }`}
                    >
                      <span className="text-[9px] font-semibold text-default-400">
                        勝率
                      </span>
                      {goFirstHasStats
                        ? formatPercent(deckUsageStat!.go_first_win_rate)
                        : "-"}
                      {goFirstDeviation && (
                        <span
                          className={`text-[9px] font-semibold ${goFirstDeviation.colorClass}`}
                        >
                          （{goFirstDeviation.label}）
                        </span>
                      )}
                    </span>
                    {/* 後攻 */}
                    <span className="flex items-center font-bold text-default-600">
                      後攻
                    </span>
                    <span className="flex items-baseline justify-center gap-1 rounded-lg bg-default-100 px-2 py-1.5">
                      <span className="text-[9px] font-semibold text-default-400">
                        割合
                      </span>
                      {deckUsageStat!.go_second_count > 0
                        ? `${formatPercent(1 - deckUsageStat!.go_first_rate)}（${deckUsageStat!.go_second_count}件）`
                        : "-"}
                    </span>
                    <span
                      className={`flex items-baseline justify-center gap-1 rounded-lg bg-default-100 px-2 py-1.5 font-bold ${
                        goSecondHasStats
                          ? winRateTextColor(deckUsageStat!.go_second_win_rate)
                          : "text-default-500"
                      }`}
                    >
                      <span className="text-[9px] font-semibold text-default-400">
                        勝率
                      </span>
                      {goSecondHasStats
                        ? formatPercent(deckUsageStat!.go_second_win_rate)
                        : "-"}
                      {goSecondDeviation && (
                        <span
                          className={`text-[9px] font-semibold ${goSecondDeviation.colorClass}`}
                        >
                          （{goSecondDeviation.label}）
                        </span>
                      )}
                    </span>
                  </div>
                )}

                {/* 集計対象外の記録がある場合の注記（勝率などには未反映） */}
                {hasStats && ignoredNote}
              </CardBody>
            )}
          </Card>
        </div>
      )}

      {enableShowDeckModal && (
        <ShowDeckModal
          deck={deck}
          setDeck={setDeck}
          deckcode={deckcode}
          setDeckCode={setDeckCode}
          isOpen={isOpen}
          onOpenChange={onOpenChange}
          onRemove={onRemove}
          autoOpenHistory={openHistoryOnShow}
          onAutoOpenHistoryHandled={() => setOpenHistoryOnShow(false)}
        />
      )}
    </>
  );
}
