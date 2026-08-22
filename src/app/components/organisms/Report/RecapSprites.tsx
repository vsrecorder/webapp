"use client";

import PokemonSprite from "@app/components/atoms/PokemonSprite";
import { getSpriteBySlot } from "@app/utils/spriteSlot";

type SpriteWithPosition = { id: string; position?: number };

type Props = {
  sprites: SpriteWithPosition[] | undefined | null;
  size: number;
};

/*
 * レポートに置くデッキのスプライト2枠。
 *
 * position でスロットを固定して並べる(画面側の DeckSprites と同じ扱い)。
 * 書き出し専用なので raw を指定し、素の <img> で確実に写るようにする。
 * 枠の下地は敷かず、面の色にそのまま乗せる。
 *
 * 画面側と違い、登録の無い枠は描かない。下地が無いと unknown のアイコンだけが
 * 面に浮いて、登録されているスプライトより目立ってしまうため。
 */
export default function RecapSprites({ sprites, size }: Props) {
  return (
    <div className="flex shrink-0 items-center">
      {([1, 2] as const).map((slot) => {
        const id = getSpriteBySlot(sprites, slot)?.id;
        if (!id) return null;
        return <PokemonSprite key={slot} raw id={id} size={size} />;
      })}
    </div>
  );
}
