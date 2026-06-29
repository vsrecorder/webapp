import { Card, CardBody } from "@heroui/react";
import { Skeleton } from "@heroui/react";
import { Image } from "@heroui/react";

import { LuLayers } from "react-icons/lu";

import ScrollingText from "@app/components/molecules/ScrollingText";
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
};

/*
 * 公式/Tonamel/記入形式の記録カードで共有する共通レイアウト。
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
}: Props) {
  return (
    <div id={cardId} className="cursor-pointer group" onClick={onClick}>
      <Card
        shadow="none"
        className="border border-divider overflow-hidden hover:border-primary/50 transition-colors duration-200"
      >
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

                <div className="flex flex-col gap-1 min-w-0">
                  {infoRowAboveDeck}

                  {loadingDeck ? (
                    <Skeleton className="h-3.5 w-24 rounded" />
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
                      <span className="text-sm text-default-600 truncate">
                        使用デッキなし
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
