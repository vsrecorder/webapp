"use client";

import PokemonSprite from "@app/components/atoms/PokemonSprite";
import { getDeckSpriteBySlot } from "@app/utils/deckSprite";
import { kizunaHasGlow, kizunaTierOf } from "@app/utils/kizuna";
import { DeckPokemonSpriteType } from "@app/types/pokemon_sprite";

/*
 * デッキを表す2体のスプライト。きずなの段階に応じて、背後に灯がともり、上下にゆれる。
 *
 * デッキ一覧カード（リスト・ギャラリー）、デッキ詳細モーダル、デッキ詳細ページ、
 * 記録詳細の使用デッキカードで共通して使う。同じ見た目を5箇所に書くと、
 * 片方だけ灯が無い・揺れないといった食い違いが必ず起きるため1つにまとめている。
 *
 * level が null のとき（未取得・他人のデッキ）は灯も揺れも出さず、素のスプライトになる。
 */

type Props = {
  sprites: DeckPokemonSpriteType[] | null | undefined;
  /** スプライト1体の一辺(px)。呼び出し元の既存レイアウトに合わせる */
  size?: number;
  /** きずなLv.(0〜255)。null なら演出なし */
  level?: number | null;
};

export default function KizunaDeckSprites({ sprites, size = 48, level }: Props) {
  const tier = level == null ? null : kizunaTierOf(level);
  // 「出会ったばかり」は灯をともさない（結果カードと同じ判定）
  const showGlow = level != null && kizunaHasGlow(level);

  /*
   * 灯の大きさはスプライトの表示サイズに比例させる。
   * 2体ぶんの幅(size*2)より少し広げ、高さは1体ぶんより少し高くすることで、
   * 2体の背後にひとつの焚き火があるように見せる。
   */
  const glowWidth = size * 2.1;
  const glowHeight = size * 1.2;

  return (
    <div className="relative flex shrink-0 items-center gap-0">
      {/* 灯。きずなLv.の段階でグラデーション（炎の色）が変わる。結果カードと同じ
          tier.glowGradient を使い、どこでも同じ段階なら同じ色になるようにする。
          「出会ったばかり」は灯そのものを出さない。 */}
      {showGlow && tier && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full blur-lg"
          style={{
            width: glowWidth,
            height: glowHeight,
            background: tier.glowGradient,
          }}
        />
      )}

      {([1, 2] as const).map((slot) => (
        <PokemonSprite
          key={slot}
          id={getDeckSpriteBySlot(sprites, slot)?.id}
          size={size}
          className={tier?.bob ?? ""}
        />
      ))}
    </div>
  );
}
