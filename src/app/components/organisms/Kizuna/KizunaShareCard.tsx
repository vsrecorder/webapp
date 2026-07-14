"use client";

import { kizunaTierOf } from "@app/utils/kizuna";

import { PokemonSpriteType } from "@app/types/pokemon_sprite";

type Props = {
  sprites: PokemonSpriteType[];
  deckName: string;
  score: number;
  tierName: string;
  tierMessage: string;
};

/*
 * きずな試算の結果カード。
 * 画面に表示するカードと、シェア画像として書き出すカードで同じコンポーネントを使う
 * （見えているものがそのまま画像になる）。幅は親要素に委ねる。
 *
 * ポケモンの画像には HeroUI の <Image> ではなく素の <img> を使うこと。
 * HeroUI の <Image> は基底クラスに opacity-0 を持ち、読み込み完了後に React が
 * data-loaded="true" を付けて初めて表示される。captureThemedPng は cloneNode で
 * DOM の静的スナップショットを取るため、クローンには React が後から属性を付けられず、
 * opacity-0 のまま書き出されて画像からポケモンだけが消える。
 * （対戦記録の Matches.tsx がスプライトを素の <img> で描画しているのも同じ理由）
 */
export default function KizunaShareCard({
  sprites,
  deckName,
  score,
  tierName,
  tierMessage,
}: Props) {
  const spriteNames = sprites.map((sprite) => sprite.name).join("・");
  const title = deckName.trim() || spriteNames;

  // 灯の強さはきずなLv.で決まる。数字を読まなくても、絵の明るさで深さが伝わる。
  const { glow } = kizunaTierOf(score);

  return (
    <div className="flex flex-col items-center gap-5 rounded-2xl border border-amber-500/30 bg-linear-to-br from-indigo-950 via-slate-900 to-neutral-950 px-6 py-7 text-center text-white">
      {/* いちばん上に立つのは数値ではなく、連れて行ったポケモンの名前 */}
      <span className="text-[11px] font-bold tracking-[0.28em] text-white/50">
        {spriteNames || title}
      </span>

      {sprites.length > 0 && (
        <div className="flex flex-col items-center gap-1.5">
          {/* 焚き火の灯を背負わせる。相棒が光を受けて立っている、という絵にする。
              灯の大きさと濃さはきずなLv.の段階で変わる（KIZUNA_TIERS の glow）。 */}
          <div className="relative flex h-28 items-center justify-center gap-1">
            <span aria-hidden="true" className={`absolute rounded-full ${glow}`} />
            {sprites.map((sprite) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={sprite.id}
                alt={sprite.name}
                src={sprite.image_url}
                className="relative h-24 w-24 object-contain"
              />
            ))}
          </div>

          {/* デッキ名を入れた場合のみ添える（未入力ならポケモン名は上にあるので繰り返さない） */}
          {deckName.trim() && (
            <span className="text-base font-bold text-white/90">{deckName.trim()}</span>
          )}
        </div>
      )}

      <div className="flex w-full flex-col gap-3">
        <div className="flex flex-col items-center gap-1">
          <span className="text-[11px] font-bold tracking-[0.28em] text-white/50">
            きずなLv.
          </span>
          <div className="flex items-baseline justify-center gap-2">
            <span className="text-6xl font-black tabular-nums text-amber-400">
              {score}
            </span>
            <span className="text-lg text-white/40">/ 255</span>
          </div>
        </div>

        <div
          className="h-2.5 w-full overflow-hidden rounded-full bg-white/10"
          role="meter"
          aria-valuenow={score}
          aria-valuemin={0}
          aria-valuemax={255}
        >
          <div
            className="h-full rounded-full bg-linear-to-r from-rose-500 to-amber-400"
            style={{ width: `${(score / 255) * 100}%` }}
          />
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <span className="text-xl font-bold">「{tierName}」</span>
        <span className="text-sm leading-relaxed text-white/70">{tierMessage}</span>
      </div>

      {/* シェア画像は単体で出回るため、算出方法が確定でないことをカード自体に持たせる */}
      <div className="flex flex-col items-center gap-1">
        <span className="text-[10px] tracking-widest text-white/35">
          きずな試算 ｜ vsrecorder.mobi/kizuna
        </span>
        <span className="text-[9px] leading-relaxed text-white/25">
          算出方法は開発中です。今後変更される場合があります
        </span>
      </div>
    </div>
  );
}
