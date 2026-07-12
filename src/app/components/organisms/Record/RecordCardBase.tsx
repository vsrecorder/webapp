import { Card, CardBody } from "@heroui/react";
import { Skeleton } from "@heroui/react";
import { Image } from "@heroui/react";
import { Chip } from "@heroui/react";
import { Popover, PopoverTrigger, PopoverContent } from "@heroui/react";

import ScrollingText from "@app/components/molecules/ScrollingText";
import { RecordDeckRowSkeleton } from "@app/components/organisms/Record/Skeleton/RecordCardSkeleton";
import { spriteImageUrl, spriteScaleClass } from "@app/utils/sprite";
import { DeckPokemonSpriteType } from "@app/types/pokemon_sprite";

type Props = {
  // カード識別子(record-card-${id}) とクリックハンドラ
  cardId: string;
  onClick: () => void;
  // 左アクセントバーの色(イベント種別/ブランドごとに変える)
  accentColorClass: string;
  // 開催日(整形済み文字列)
  date: string;
  // イベント名
  title: string;
  loadingTitle: boolean;
  titleFallback?: string;
  // 種別チップ等(複数可)
  chips: React.ReactNode;
  // アイコン枠(8x8)の中身。種別アイコン/ブランドロゴ/記号など
  icon: React.ReactNode;
  // デッキ名
  deckName?: string | null;
  // デッキに紐付くポケモンスプライト(先頭2体を表示)
  deckSprites?: DeckPokemonSpriteType[];
  loadingDeck: boolean;
  // デッキ行の上に差し込む情報行(公式の会場名など)。無いカードは省略
  infoRowAboveDeck?: React.ReactNode;
  // 対戦の勝敗数(デッキ行の右端に表示)
  winCount?: number;
  lossCount?: number;
  // 対戦結果の過半数がチーム戦かどうか(勝敗の左横にバッジ表示)
  isGroupMatchMajority?: boolean;
  loadingMatches: boolean;
  // 戦績集計から除外されているか。true の場合カード右上にバッジを表示する
  ignoreStatsFlg?: boolean;
};

/*
 * 公式/Tonamel/自由形式の記録カードで共有する共通レイアウト。
 * 「枠線 + 左アクセントバー → 開催日 → イベント名 → チップ → 区切り線 → アイコン枠 + 情報行」
 * という骨格を一元管理し、差分(色・チップ・アイコン・情報行)のみを props で受け取る。
 */
export default function RecordCardBase({
  cardId,
  onClick,
  accentColorClass,
  date,
  title,
  loadingTitle,
  titleFallback = "無題のイベント",
  chips,
  icon,
  deckName,
  deckSprites,
  loadingDeck,
  infoRowAboveDeck,
  winCount,
  lossCount,
  isGroupMatchMajority,
  loadingMatches,
  ignoreStatsFlg,
}: Props) {
  const hasMatchResult = (winCount ?? 0) + (lossCount ?? 0) > 0;
  const matchResultColorClass =
    (winCount ?? 0) > (lossCount ?? 0)
      ? "text-success"
      : (winCount ?? 0) < (lossCount ?? 0)
        ? "text-danger"
        : "text-default-500";
  // バッジの枠線色(勝敗に応じて文字色と揃える)
  const matchResultBorderColorClass =
    (winCount ?? 0) > (lossCount ?? 0)
      ? "border-success/40"
      : (winCount ?? 0) < (lossCount ?? 0)
        ? "border-danger/40"
        : "border-default-300";
  // バッジの背景色(勝敗に応じて薄く色付け)
  const matchResultBgColorClass =
    (winCount ?? 0) > (lossCount ?? 0)
      ? "bg-success/10"
      : (winCount ?? 0) < (lossCount ?? 0)
        ? "bg-danger/10"
        : "bg-default-100";

  return (
    <div id={cardId} className="cursor-pointer group" onClick={onClick}>
      <Card
        shadow="none"
        className="relative border border-divider overflow-hidden hover:border-primary/50 transition-colors duration-200"
      >
        {ignoreStatsFlg && (
          <Popover placement="bottom-end">
            <PopoverTrigger>
              <button
                type="button"
                onClick={(e) => e.stopPropagation()}
                className="absolute right-2 top-2 z-10"
                aria-label="集計対象外の詳細を表示"
              >
                <Chip
                  size="sm"
                  variant="flat"
                  color="warning"
                  className="h-5 text-[10px] font-bold"
                >
                  ⚠ 集計対象外
                </Chip>
              </button>
            </PopoverTrigger>
            <PopoverContent onClick={(e) => e.stopPropagation()}>
              <div className="px-1 py-2 max-w-64 flex flex-col gap-1">
                <span className="text-sm font-bold text-warning">
                  ⚠ この記録は分析・集計の対象外です
                </span>
                <span className="text-xs text-default-500">
                  勝率・使用デッキ分析・相手デッキ分布・週次レポートから除外されています
                </span>
              </div>
            </PopoverContent>
          </Popover>
        )}

        <CardBody className="p-0">
          <div className="flex">
            {/* イベント種別/ブランドごとの左アクセントバー */}
            <div className={`w-1 shrink-0 ${accentColorClass}`} />

            <div className="flex-1 px-4 py-3.5 min-w-0">
              {/* 開催日 */}
              <span className="text-xs text-default-500">{date}</span>

              {/* イベント名 */}
              {loadingTitle ? (
                <Skeleton className="h-5 w-48 rounded mt-0.5" />
              ) : (
                <ScrollingText
                  text={title || titleFallback}
                  animationClass="animate-marquee-card-slow"
                  className="font-bold text-sm leading-snug mt-0.5"
                />
              )}

              {/* チップ */}
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">{chips}</div>

              {/* 区切り線 */}
              <div className="border-t border-divider mt-3 mb-2.5" />

              {/* 情報行(アイコン枠 + 会場/デッキ) */}
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-default-100 flex items-center justify-center overflow-hidden shrink-0">
                  {icon}
                </div>

                <div className="flex flex-col gap-1 min-w-0 flex-1">
                  {infoRowAboveDeck}

                  <div className="flex items-center justify-between gap-2 min-w-0">
                    <div className="min-w-0 flex-1">
                      {loadingDeck ? (
                        <RecordDeckRowSkeleton />
                      ) : deckName ? (
                        <div className="flex items-center gap-1.5 min-w-0">
                          {/* デッキ先頭2体のスプライト(無い枠はデフォルトを表示) */}
                          <div className="flex items-center shrink-0">
                            {[0, 1].map((idx) => {
                              const spriteId = deckSprites?.[idx]?.id;
                              return (
                                <Image
                                  key={idx}
                                  alt={spriteId ?? "unknown"}
                                  src={spriteImageUrl(spriteId)}
                                  radius="none"
                                  className={`w-7 h-7 object-contain ${spriteScaleClass(spriteId)} origin-bottom`}
                                />
                              );
                            })}
                          </div>
                          <span className="text-sm text-default-600 truncate">
                            {deckName}
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 min-w-0">
                          <span className="text-sm text-default-600 truncate"></span>
                        </div>
                      )}
                    </div>

                    {/* 対戦の勝敗数(データが無ければ非表示) */}
                    {loadingMatches ? (
                      <div className="flex items-center gap-1.5 shrink-0">
                        <Skeleton className="h-5 w-10 rounded-md" />
                        <Skeleton className="h-5 w-12 rounded-md" />
                      </div>
                    ) : hasMatchResult ? (
                      <div className="flex items-center gap-1.5 shrink-0">
                        {/* チーム戦が過半数を占める場合のみ勝敗の左横に表示(文字色は対戦結果一覧のチーム戦タグと統一) */}
                        {isGroupMatchMajority && (
                          <span className="text-xs font-bold shrink-0 rounded-md border px-1.5 py-0.5 text-secondary border-secondary/40 bg-secondary/10">
                            チーム戦
                          </span>
                        )}
                        <span
                          className={`text-xs font-bold shrink-0 rounded-md border px-1.5 py-0.5 ${matchResultColorClass} ${matchResultBorderColorClass} ${matchResultBgColorClass}`}
                        >
                          {winCount}勝{lossCount}敗
                        </span>
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
