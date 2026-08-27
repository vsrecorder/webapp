import { Card, CardBody } from "@heroui/react";
import { Skeleton } from "@heroui/react";
import { Chip } from "@heroui/react";
import { Popover, PopoverTrigger, PopoverContent } from "@heroui/react";

import ScrollingText from "@app/components/molecules/ScrollingText";
import PokemonSprite from "@app/components/atoms/PokemonSprite";
import { RecordDeckRowSkeleton } from "@app/components/organisms/Record/Skeleton/RecordCardSkeleton";
import TagChips from "@app/components/molecules/TagChips";
import { DeckPokemonSpriteType } from "@app/types/pokemon_sprite";
import { TagType } from "@app/types/tag";
import { getSpriteBySlot } from "@app/utils/spriteSlot";
import { regulationDisplay } from "@app/types/regulation";

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
  // 1段目のチップ(種別・対戦環境名など。複数可)
  chips: React.ReactNode;
  // 2段目のチップ(会場名など)。渡さないカードは行ごと省略する
  chipsSecondRow?: React.ReactNode;
  // 記録に付けたタグ。無い(空)なら行ごと省略する
  tags?: TagType[];
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
  // 両者引き分け数(BO3のみ。0のときは表示しない)
  drawCount?: number;
  // 対戦結果にチーム戦が1つでも含まれるか(勝敗の左横にバッジ表示)
  hasGroupMatch?: boolean;
  // 対戦結果にBO3が1つでも含まれるか(勝敗の左横にバッジ表示)
  hasBo3?: boolean;
  loadingMatches: boolean;
  // 戦績集計から除外されているか。true の場合カード右上にバッジを表示する
  ignoreStatsFlg?: boolean;
  // レギュレーション(regulations テーブルのID)。全ての記録でチップを表示する
  regulationId: number;
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
  chipsSecondRow,
  tags,
  icon,
  deckName,
  deckSprites,
  loadingDeck,
  infoRowAboveDeck,
  winCount,
  lossCount,
  drawCount,
  hasGroupMatch,
  hasBo3,
  loadingMatches,
  ignoreStatsFlg,
  regulationId,
}: Props) {
  const regulation = regulationDisplay(regulationId);

  // 右上のバッジ(チーム戦/BO3)は absolute で最上段の行に重なるため、タグや
  // 「集計対象外」がその下へ潜り込まないよう、バッジの有無に応じて右側を空けておく。
  const topBadgeReserveClass =
    hasGroupMatch && hasBo3 ? "pr-24" : hasGroupMatch || hasBo3 ? "pr-14" : "";

  const hasMatchResult =
    (winCount ?? 0) + (lossCount ?? 0) + (drawCount ?? 0) > 0;
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
        {/* カード右上のバッジ群(チーム戦/BO3)。対戦結果の集計後に確定するものを横並びで表示。
            右端は勝敗マーク(デッキ行の px-4)と同じ 16px ガターに揃える */}
        {(hasGroupMatch || hasBo3) && (
          <div className="absolute right-4 top-2 z-10 flex items-center gap-1.5">
            {/* チーム戦が1つでも含まれる場合に表示(文字色は対戦結果一覧のチーム戦タグと統一) */}
            {hasGroupMatch && (
              <span className="text-[10px] font-bold shrink-0 rounded-md border px-1.5 py-0.5 text-secondary border-secondary/40 bg-secondary/10">
                チーム戦
              </span>
            )}
            {/* BO3が1つでも含まれる場合に表示(色は対戦結果一覧のBO3チップと統一) */}
            {hasBo3 && (
              <span className="text-[10px] font-bold shrink-0 rounded-md border px-1.5 py-0.5 text-primary border-primary/40 bg-primary/10">
                BO3
              </span>
            )}
          </div>
        )}

        <CardBody className="p-0">
          <div className="flex">
            {/* イベント種別/ブランドごとの左アクセントバー */}
            <div className={`w-1 shrink-0 ${accentColorClass}`} />

            <div className="flex-1 px-4 py-3.5 min-w-0">
              {/* レギュレーション → タグ → 集計対象外のマーク。日付の上に表示する。
                  レギュレーションは全ての記録に付くため、この行は常に描画する。
                  「集計対象外」は例外を示す印なので、常に行の最後に置く */}
              <div className={`flex h-5 items-center gap-1.5 mb-1 ${topBadgeReserveClass}`}>
                <Chip
                  size="sm"
                  variant="flat"
                  color={regulation.chipColor}
                  className="h-5 shrink-0 text-[10px] font-bold"
                >
                  {regulation.name}
                </Chip>

                {/* タグ。タグが多いときはここが縮んで横スクロールになり、
                    後ろの「集計対象外」は押し出されずに残る。
                    行を増やすとタグ数でカードの高さが変わって一覧がガタつくため、
                    この行の高さ(h-5)は保ったままにする。 */}
                {tags && tags.length > 0 && (
                  <div className="min-w-0 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                    <TagChips tags={tags} nowrap />
                  </div>
                )}

                {ignoreStatsFlg && (
                  <Popover placement="bottom-start">
                    <PopoverTrigger>
                      {/* ボタンにも高さと flex を持たせる。持たせないと中の Chip だけが
                          20px でも、ボタン自身の行送りで隣のチップと base がずれる。 */}
                      <button
                        type="button"
                        className="flex h-5 shrink-0 items-center"
                        onClick={(e) => e.stopPropagation()}
                        aria-label="集計対象外の詳細を表示"
                      >
                        {/* レギュレーションのチップは flat。こちらは塗り(solid)で差をつけて、
                            いちばん先に目に入るようにする。色は集計対象外を示す warning で、
                            バナー・「集計から除外」の選択と揃えてある。 */}
                        <Chip
                          size="sm"
                          variant="solid"
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
              </div>

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

              {/* チップ1段目(種別・対戦環境名) */}
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">{chips}</div>

              {/* チップ2段目(会場名)。2段目が無いカードには余白を出さないため、
                  渡されたときだけ行ごと描画する */}
              {chipsSecondRow && (
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  {chipsSecondRow}
                </div>
              )}

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
                    {/* デッキ行だけアイコン枠の側へ寄せる(情報行の gap-3 = 12px のうち 6px を
                        打ち消し、上の会場行より左に出す)。読み込み中のスケルトン
                        (RecordCardSkeleton)も同じ量ずらし、実データ描画時に横位置が飛ばないようにする */}
                    <div className="min-w-0 flex-1 -ml-1.5">
                      {loadingDeck ? (
                        <RecordDeckRowSkeleton />
                      ) : deckName ? (
                        <div className="flex items-center gap-1.5 min-w-0">
                          {/* デッキの2枠スプライト。position でスロットを固定(無い枠はデフォルトを表示) */}
                          <div className="flex items-center shrink-0">
                            {([1, 2] as const).map((slot) => (
                              <PokemonSprite
                                key={slot}
                                id={getSpriteBySlot(deckSprites, slot)?.id}
                                size={32}
                              />
                            ))}
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

                    {/* 対戦の勝敗数(対戦結果が無い場合は「対戦なし」を同じ位置に表示) */}
                    {loadingMatches ? (
                      <div className="flex items-center gap-1.5 shrink-0">
                        <Skeleton className="h-5 w-12 rounded-md" />
                      </div>
                    ) : hasMatchResult ? (
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span
                          className={`text-xs font-bold shrink-0 rounded-md border px-1.5 py-0.5 ${matchResultColorClass} ${matchResultBorderColorClass} ${matchResultBgColorClass}`}
                        >
                          {winCount}勝{lossCount}敗
                          {(drawCount ?? 0) > 0 && `${drawCount}分`}
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="text-xs font-bold shrink-0 rounded-md border px-1.5 py-0.5 text-default-400 border-default-200 bg-default-50">
                          対戦なし
                        </span>
                      </div>
                    )}
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
