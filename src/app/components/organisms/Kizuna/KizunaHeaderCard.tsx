"use client";

import { kizunaTierOf } from "@app/utils/kizuna";

import PokemonSprite from "@app/components/atoms/PokemonSprite";
import { PokemonSpriteType } from "@app/types/pokemon_sprite";

type Props = {
  sprites: PokemonSpriteType[];
  deckName: string;
  score: number;
  tierName: string;
  tierMessage: string;
};

/*
 * Xプロフィールヘッダー用の書き出しカード。
 *
 * 実寸は 1500×500(X ヘッダーの表示寸法)で固定する。captureThemedPng に
 * { targetWidth: 1500, bare: true, desiredPixelRatio: 2 } を渡すことで、
 * 余白もサービスフッターも付けずに、このカードの見た目をそのまま @2x の
 * 3000×1000 PNG として書き出す(bare 指定で余白・フッターを抑止)。
 *
 * 画面には transform: scale で縮小して見せ、書き出しは画面外に実寸で描く
 * (KizunaShareCard と同じく、見えているものがそのまま画像になる)。
 * スプライトは素の <img>(raw)で確実に写す。灯の揺れ(bob)は書き出し時に
 * data-capture-static で静止する(globals.css)。
 *
 * 構図は X 側の重なりを避ける:
 *   - Xのプロフィールアイコンと表示名はヘッダー下辺の左〜中央に重なるため、
 *     主役のきずなLv.と段階名は右側に寄せ、呼び名とサービス表記は上辺に置く。
 *   - 相棒スプライトは中央やや左。段階に応じた灯に包まれて立つ絵にする。
 */
export default function KizunaHeaderCard({
  sprites,
  deckName,
  score,
  tierName,
  tierMessage,
}: Props) {
  const spriteNames = sprites
    .map((sprite) => sprite.name)
    .filter(Boolean)
    .join("・");
  // いちばん上に立つ呼び名。デッキ名があればそれを、なければポケモン名を並べる。
  const title = deckName.trim() || spriteNames;

  // 灯の色(glowGradient)と揺れ(bob)はきずなLv.の段階で決まる。結果カードと同じ演出。
  // 「出会ったばかり」は glowGradient が空文字で、灯そのものが出ない。
  const { glowGradient, bob } = kizunaTierOf(score);

  // 2体並ぶと横幅を食うため、1体のときは大きく見せる。
  const spriteSize = sprites.length > 1 ? 210 : 264;
  const barWidth = Math.min(100, Math.max(0, (score / 255) * 100));

  return (
    <div
      style={{ width: 1500, height: 500 }}
      className="relative flex items-center overflow-hidden bg-linear-to-br from-indigo-950 via-slate-900 to-neutral-950 text-white"
    >
      {/* 焚き火の残光。右下から暖色が滲み、黄昏の世界観をヘッダー全体に敷く */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-32 -right-24 h-[560px] w-[560px] rounded-full bg-amber-500/15 blur-3xl"
      />

      {/* 上辺:左に呼び名、右にサービス表記。
          下辺は X のプロフィールアイコン/表示名が重なるため、文字を置かず空ける。 */}
      <div className="absolute inset-x-0 top-0 flex items-start justify-between px-16 pt-10">
        <span className="max-w-[860px] truncate text-[19px] font-bold tracking-[0.3em] text-white/55">
          {title}
        </span>
        <span className="shrink-0 pt-1 text-[15px] tracking-[0.18em] text-white/35">
          vsrecorder.mobi/kizuna
        </span>
      </div>

      {/* 左:段階の灯に包まれた相棒。灯は相棒の中心に重ね、光を受けて立つ絵にする */}
      <div className="relative flex h-full flex-1 items-center justify-center pl-8">
        <div className="relative flex items-end gap-1">
          {glowGradient && (
            <span
              aria-hidden="true"
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl"
              style={{ background: glowGradient, width: 540, height: 440 }}
            />
          )}
          {sprites.map((sprite) => (
            <PokemonSprite
              key={sprite.id}
              id={sprite.id}
              size={spriteSize}
              raw
              className={`relative ${bob}`}
            />
          ))}
        </div>
      </div>

      {/* 右:きずなLv.(主役) */}
      <div className="relative flex h-full w-[600px] shrink-0 flex-col justify-center gap-4 pr-20">
        <span className="text-[19px] font-bold tracking-[0.3em] text-white/50">
          きずなLv.
        </span>

        <div className="flex items-baseline gap-3">
          <span className="text-[150px] font-black leading-none tabular-nums text-amber-400 drop-shadow-[0_0_44px_rgba(251,191,36,0.45)]">
            {score}
          </span>
          <span className="text-[40px] font-bold text-white/40">/ 255</span>
        </div>

        {/* きずなLv.のバー(rose→amber)。結果カードと同じ配色 */}
        <div className="h-3.5 w-full overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-linear-to-r from-rose-500 to-amber-400"
            style={{ width: `${barWidth}%` }}
          />
        </div>

        <div className="flex flex-col gap-1.5 pt-1">
          <span className="text-[38px] font-bold leading-tight">「{tierName}」</span>
          <span className="text-[21px] leading-relaxed text-white/70">{tierMessage}</span>
        </div>
      </div>
    </div>
  );
}
