"use client";

import PokemonSprite from "@app/components/atoms/PokemonSprite";
import { getSpriteBySlot } from "@app/utils/spriteSlot";

// デッキ(DeckPokemonSpriteType)と対戦相手(MatchPokemonSpriteType)のどちらのスプライトでも使える
type Sprite = { id: string; position?: number };

type Props = {
  sprites: Sprite[] | null | undefined;
  size?: number;
  className?: string;
  loading?: "lazy" | "eager";
  // true なら未登録(0体)のときは何も出さない。既定は unknown を2枠出して幅を確保する
  hideWhenEmpty?: boolean;
};

/*
 * デッキ(または対戦相手)のスプライトを2枠並べる。position で枠を固定し、
 * 無い枠は unknown(PokemonSprite が id 無しで unknown.png を出す)で埋める。
 *
 * デッキ選択の候補・使用率や相手デッキ分布の一覧・カレンダー・みんなの公開デッキなど、
 * きずなの演出(KizunaDeckSprites)を伴わない場所で共通に使う。同じ2枠の並びを
 * 各所に書くと、片方だけ枠の詰め方や unknown の扱いが変わるため1つにまとめている。
 */
export default function DeckSprites({
  sprites,
  size = 32,
  className = "",
  loading,
  hideWhenEmpty = false,
}: Props) {
  if (hideWhenEmpty && (!sprites || sprites.length === 0)) return null;

  return (
    <div className={`flex shrink-0 items-center gap-0 ${className}`}>
      {([1, 2] as const).map((slot) => (
        <PokemonSprite key={slot} id={getSpriteBySlot(sprites, slot)?.id} size={size} loading={loading} />
      ))}
    </div>
  );
}
