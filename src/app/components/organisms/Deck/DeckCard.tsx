"use client";

import { useEffect, useState } from "react";

import { Card, CardHeader, CardBody } from "@heroui/react";
import { Image } from "@heroui/react";

import { spriteScaleClass } from "@app/utils/sprite";
//import { Chip } from "@heroui/react";

import { useDisclosure } from "@heroui/react";

import { LuLayers } from "react-icons/lu";
import { LuCalendar } from "react-icons/lu";
import { LuSwords } from "react-icons/lu";

import DeckCodeCard from "@app/components/organisms/Deck/DeckCodeCard";
import ShowDeckModal from "@app/components/organisms/Deck/Modal/ShowDeckModal";

import { useDeckCodes, getDeckCodeVersionNumber } from "@app/hooks/useDeckCodes";

import { DeckGetByIdResponseType } from "@app/types/deck";
import { DeckCodeType } from "@app/types/deck_code";
import { DeckUsageItemType } from "@app/types/deck_usage_stat";

type Props = {
  deckData: DeckGetByIdResponseType | null;
  deckcodeData: DeckCodeType | null;
  deckUsageStat?: DeckUsageItemType | null;
  onRemove: (id: string) => void;
  enableShowDeckModal: boolean;
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
}: Props) {
  const [deck, setDeck] = useState<DeckGetByIdResponseType | null>(deckData);
  const [deckcode, setDeckCode] = useState<DeckCodeType | null>(deckcodeData);

  const { isOpen, onOpen, onOpenChange } = useDisclosure();

  // このデッキの全バージョン（デッキコード）。件数バッジと通し番号の算出に使う。
  const { deckcodes } = useDeckCodes(deck?.id, deckcode?.id);
  const versionCount = deckcodes?.length ?? null;
  const versionNumber = getDeckCodeVersionNumber(deckcodes, deckcode?.id);

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
              <DeckCodeCard deckcode={deckcode} versionNumber={null} />
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

  return (
    <>
      <div className="" onClick={onOpen}>
        <Card className="pt-3 w-full">
          <CardHeader className="pt-0 pb-0 px-3">
            <div className="flex flex-col gap-1 w-full">
              {/* 両端配置 */}
              <div className="flex items-start justify-between w-full">
                {/* 左側 */}
                <div className="flex items-center gap-0 shrink-0">
                  {deck.pokemon_sprites[0] ? (
                    <Image
                      alt={deck.pokemon_sprites[0].id}
                      src={`https://xx8nnpgt.user.webaccel.jp/images/pokemon-sprites/${deck.pokemon_sprites[0].id.replace(/^0+(?!$)/, "")}.png`}
                      className={`w-11 h-11 object-contain ${spriteScaleClass(deck.pokemon_sprites[0].id)} origin-bottom`}
                    />
                  ) : (
                    <Image
                      alt="unknown"
                      src="https://xx8nnpgt.user.webaccel.jp/images/pokemon-sprites/unknown.png"
                      className="w-11 h-11 object-contain scale-150 origin-bottom"
                    />
                  )}

                  {deck.pokemon_sprites[1] ? (
                    <Image
                      alt={deck.pokemon_sprites[1].id}
                      src={`https://xx8nnpgt.user.webaccel.jp/images/pokemon-sprites/${deck.pokemon_sprites[1].id.replace(/^0+(?!$)/, "")}.png`}
                      className={`w-11 h-11 object-contain ${spriteScaleClass(deck.pokemon_sprites[1].id)} origin-bottom`}
                    />
                  ) : (
                    <Image
                      alt="unknown"
                      src="https://xx8nnpgt.user.webaccel.jp/images/pokemon-sprites/unknown.png"
                      className="w-11 h-11 object-contain scale-150 origin-bottom"
                    />
                  )}
                </div>

                {/* 右側：登録日＋バージョン件数バッジをひとかたまりに */}
                <div className="flex flex-col items-end gap-2 shrink-0">
                  <div className="flex items-center gap-1 text-tiny text-default-400">
                    <LuCalendar className="text-xs" />
                    {date}
                  </div>

                  {versionCount !== null && versionCount > 0 && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenHistoryOnShow(true);
                        onOpen();
                      }}
                      className="flex items-center gap-1 bg-primary/10 text-primary px-2.5 py-1 rounded-full text-tiny font-bold active:opacity-70"
                    >
                      <LuLayers className="text-sm" />
                      バージョンの数： {versionCount}
                    </button>
                  )}
                </div>
              </div>

              <div className="font-bold text-large truncate w-full min-w-0">
                {deck.name}
              </div>

              {deckUsageStat && deckUsageStat.count > 0 && (
                <div className="flex items-stretch rounded-xl bg-default-100 text-tiny overflow-hidden">
                  {/* 左半分：勝率を最上段に大きく強調し、その下に対戦成績を添える。
                      上段(勝率ラベル)と下段(対戦成績)を同じフォントサイズ・行高に
                      揃えることで、中央の勝率数値がブロックの真ん中に来るようにしている */}
                  <div className="flex-1 flex flex-col items-center justify-center gap-1.5 px-5 py-3 min-w-0">
                    <span className="text-[10px] leading-none text-default-400">
                      勝率
                    </span>
                    <span
                      className={`text-medium font-black leading-none tabular-nums ${winRateTextColor(deckUsageStat.win_rate)}`}
                    >
                      {formatPercent(deckUsageStat.win_rate)}
                    </span>
                    <div className="flex items-center gap-1 text-[10px] leading-none font-bold text-default-600">
                      <LuSwords className="text-[10px] shrink-0" />
                      <span className="truncate">
                        {deckUsageStat.count}戦{deckUsageStat.wins}勝
                        {deckUsageStat.losses}敗
                      </span>
                    </div>
                  </div>

                  {/* 右半分：先攻/後攻の割合・勝率・全体差の乖離度（表形式で列見出しを付け、
                      各数値が何を表すか一目で分かるようにする。乖離度を独立した列にすることで
                      桁数が変わっても先攻/後攻の行がずれないようにしている） */}
                  {deckUsageStat.game_count > 0 && (
                    <div className="flex-[1.7] flex flex-col justify-center px-3 py-3 border-l border-default-200 min-w-0">
                      <div className="grid grid-cols-[auto_1fr_1fr_1fr] items-center gap-x-3 text-[10px] tabular-nums whitespace-nowrap">
                        <span />
                        <span className="text-default-400 text-right">割合</span>
                        <span className="text-default-400 text-right">勝率</span>
                        <span className="text-default-400 text-right">全体差</span>

                        <span className="text-default-500">先攻</span>
                        <span className="text-right text-default-600">
                          {deckUsageStat.go_first_count > 0
                            ? `${formatPercent(deckUsageStat.go_first_rate)}(${deckUsageStat.go_first_count}件)`
                            : "-"}
                        </span>
                        <span
                          className={`text-right font-bold ${
                            goFirstHasStats
                              ? winRateTextColor(deckUsageStat.go_first_win_rate)
                              : "text-default-700"
                          }`}
                        >
                          {goFirstHasStats
                            ? formatPercent(deckUsageStat.go_first_win_rate)
                            : "-"}
                        </span>
                        <span
                          className={`text-right font-bold ${goFirstDeviation?.colorClass ?? "text-default-700"}`}
                        >
                          {goFirstDeviation?.label ?? "-"}
                        </span>

                        <span className="text-default-500">後攻</span>
                        <span className="text-right text-default-600">
                          {deckUsageStat.go_second_count > 0
                            ? `${formatPercent(1 - deckUsageStat.go_first_rate)}(${deckUsageStat.go_second_count}件)`
                            : "-"}
                        </span>
                        <span
                          className={`text-right font-bold ${
                            goSecondHasStats
                              ? winRateTextColor(deckUsageStat.go_second_win_rate)
                              : "text-default-700"
                          }`}
                        >
                          {goSecondHasStats
                            ? formatPercent(deckUsageStat.go_second_win_rate)
                            : "-"}
                        </span>
                        <span
                          className={`text-right font-bold ${goSecondDeviation?.colorClass ?? "text-default-700"}`}
                        >
                          {goSecondDeviation?.label ?? "-"}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </CardHeader>
          <CardBody className="px-3 py-2">
            <DeckCodeCard
              deckcode={deckcode}
              versionNumber={versionNumber}
              totalVersionCount={versionCount}
              onCreateVersion={onOpen}
            />
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
          autoOpenHistory={openHistoryOnShow}
          onAutoOpenHistoryHandled={() => setOpenHistoryOnShow(false)}
        />
      )}
    </>
  );
}
