"use client";

import PokemonSprite from "@app/components/atoms/PokemonSprite";

// シェア画像の見出しに添える、絞り込んでいる使用デッキ
export type ShareHeadingDeck = {
  name: string;
  // スロット順のスプライト(常に2枠。無い枠は unknown で表示される)
  spriteIds: [string | undefined, string | undefined];
  // スプライトが1体でも登録されているか。無ければスプライトは出さない
  // (モンスターボール2つはデッキの手掛かりにならないため。画面のパネルと同じ扱い)
  hasSprite: boolean;
};

// 見出しに並べるデッキのスプライトの枠(px)
const DECK_SPRITE_SIZE = 40;

/*
 * シェア画像の見出し直下に置く「どの使用デッキでの集計か」の行。
 * 「月毎の勝率推移」「対戦相手のデッキ分析」で同じ見た目にするための共通部品。
 *
 * デッキを選んでいればスプライトとデッキ名で示し、選んでいなければ
 * 「すべての使用デッキ」と出す(どちらでも必ず1ブロック出し、下の内容の位置を変えない)。
 */
export default function ShareDeckHeading({ deck }: { deck: ShareHeadingDeck | null }) {
  if (!deck) {
    return <p className="text-center text-xs text-default-400">すべての使用デッキ</p>;
  }

  return (
    <div className="flex flex-col items-center">
      {deck.hasSprite && (
        <div className="flex">
          <PokemonSprite id={deck.spriteIds[0]} size={DECK_SPRITE_SIZE} />
          <PokemonSprite id={deck.spriteIds[1]} size={DECK_SPRITE_SIZE} />
        </div>
      )}
      {/* 長いデッキ名は折り返す。「使用時」は名前の途中で切れないよう一続きにする */}
      <p className="text-center text-xs text-default-500">
        <span className="font-bold text-default-700">『{deck.name}』</span>
        <span className="whitespace-nowrap">使用時</span>
      </p>
    </div>
  );
}
