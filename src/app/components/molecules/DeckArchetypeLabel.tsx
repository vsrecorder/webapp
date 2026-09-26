"use client";

import DeckSprites from "@app/components/molecules/DeckSprites";

import { DeckArchetypeType } from "@app/types/deck_archetype";

type Props = {
  archetype: DeckArchetypeType;
  // スプライト 1 枠の一辺(px)。デッキ一覧のギャラリー表示・みんなの公開デッキと同じ 48
  size?: number;
};

/*
 * 入賞デッキの種類(バトラボのデッキ分類)を、スプライトを上・名前を下に中央揃えで出す。
 *
 * デッキ一覧のギャラリー表示(DeckCard)やみんなの公開デッキ(DeckCodePostCard)と同じ形で、
 * デッキ画像の上に置く。画像に重ねる形にしないのは、デッキ画像は明るいことが多く
 * 重ね文字が読みづらいため(ギャラリー表示と同じ判断)。
 *
 * 主デッキ名は text-large の太字、型の名前(「バシャーモ型」)はその下の行に小さく出す。
 * 型を持たない主デッキでも型の行は空けたままにする(ギャラリー表示がタグの無いデッキでも
 * タグの行を空けておくのと同じ)。同じ大会の中で型の有無によってカードの高さが変わると、
 * Swiper の高さが一番高いカードに合わせられて他のカードの下に余白が出るため。
 * 名前は折り返さない(truncate)ため、min-w-0 が無いと最小コンテンツ幅が名前の全長まで
 * 広がってカードごと横に伸びる(ギャラリー表示と同じ注意)。
 *
 * 未分類(索引にはあるが、どの主デッキにも当たらない)は unknown の 2 枠と「デッキ名：不明」で出す。
 * 出さない選択もあるが、同じ大会の中で有無が混ざると高さが揃わず、「分類が無い」のか
 * 「取れなかった」のかも見分けられない。取れなかった(索引に無い)ときは呼び出し側が
 * この部品ごと出さないので、両者は見た目で区別できる。
 * 名前の行は text-large と同じ 28px にして、分類の有無でも高さが変わらないようにする。
 *
 * 高さは スプライト 48 + gap 4 + 名前 28 + 型 20 = 100px。骨格(CityleagueResultCardSkeleton)が
 * 同じ寸法で枠を取っているので、変えるときは両方直すこと。
 */
export default function DeckArchetypeLabel({ archetype, size = 48 }: Props) {
  // position は持たせない(添字で 1 枠目・2 枠目に入る)。3 体以上の定義でも先頭 2 体だけ出す
  const sprites = archetype.sprites.map((id) => ({ id }));

  return (
    <div className="flex w-full min-w-0 flex-col items-center gap-1">
      <DeckSprites sprites={sprites} size={size} />
      <div className="flex w-full min-w-0 flex-col items-center">
        {archetype.label ? (
          <div className="w-full min-w-0 truncate text-center font-bold text-large">
            {archetype.archetypeName}
          </div>
        ) : (
          <div className="flex h-7 items-center justify-center font-bold text-medium text-default-400">
            デッキ名：不明
          </div>
        )}
        {/* 型の行。無くても高さ(h-5 = text-small の行)を空けたままにする */}
        <div className="h-5 w-full min-w-0 truncate text-center font-bold text-small text-default-500">
          {archetype.variantName}
        </div>
      </div>
    </div>
  );
}
