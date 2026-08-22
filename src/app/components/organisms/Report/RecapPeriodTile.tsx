"use client";

import Image from "next/image";
import Link from "next/link";

import { LuArrowRight } from "react-icons/lu";

/*
 * バトルレポート一覧に並べる期間のタイル。
 *
 * 期間ごとに面の色を変える。年ごとに配色が変わるリスニングレポートの並びと同じ考え方で、
 * 一覧を眺めたときに単調にならないようにしている。
 */

type TileColor = {
  bg: string;
  fg: string;
  // ラベルや補足に使う、地に沈めた文字色
  sub: string;
};

/*
 * タイルの配色。先頭(primary)は今月の hero 専用で、グリッドは 2 番目以降を循環させる。
 * 明るい面(amber)だけ文字を暗色に反転させる。
 * ブランドの primary/secondary に、彩度と明度を揃えた4色を足してある。
 */
export const TILE_PALETTE: TileColor[] = [
  { bg: "#006FEE", fg: "#ffffff", sub: "rgba(255, 255, 255, 0.6)" },
  { bg: "#7828c8", fg: "#ffffff", sub: "rgba(255, 255, 255, 0.6)" },
  { bg: "#0f172a", fg: "#ffffff", sub: "rgba(255, 255, 255, 0.5)" },
  { bg: "#f5a524", fg: "#0f172a", sub: "rgba(15, 23, 42, 0.55)" },
  { bg: "#059669", fg: "#ffffff", sub: "rgba(255, 255, 255, 0.6)" },
  { bg: "#e11d48", fg: "#ffffff", sub: "rgba(255, 255, 255, 0.6)" },
  { bg: "#4338ca", fg: "#ffffff", sub: "rgba(255, 255, 255, 0.6)" },
];

// hero(今月)以外に割り当てる色。先頭を除いた並びを順に使う。
export function gridTileColorIndex(index: number): number {
  return 1 + (index % (TILE_PALETTE.length - 1));
}

type Props = {
  href: string;
  // TILE_PALETTE のインデックス
  colorIndex: number;
  // 上に置く英字ラベル（MONTHLY REPORT / ENVIRONMENT など）
  kindLabel: string;
  // 期間の名前（2026年8月 / 『アビスアイ』）
  title: string;
  // title の次の行に置く語（環境なら「環境」）。長い環境名でも
  // 「環境」だけは必ず読めるよう、名前とは行を分けて出す
  titleSuffix?: string;
  // 補足（12戦 ・ 勝率 66.7% / 2026.05 - 07）
  subtitle: string;
  // 環境のタイルに載せる拡張パックの画像URL（環境バッジと同じ画像）
  badgeImageUrl?: string;
  // 折り返し位置より上に出る最初の1枚だけ true にする。
  // 既定の遅延読み込みのままだと、この画像が LCP になったときに表示が遅れる
  eagerImage?: boolean;
  // hero は一覧の先頭に置く横長の1枚。
  // wide は2列ぶんを使う横長（環境用）。tile は2列グリッドの正方形。
  // 正方形だけを敷き詰めると並びが単調になるので、環境を横長にして間に挟む。
  variant?: "hero" | "wide" | "tile";
};

export default function RecapPeriodTile({
  href,
  colorIndex,
  kindLabel,
  title,
  titleSuffix,
  subtitle,
  badgeImageUrl,
  eagerImage = false,
  variant = "tile",
}: Props) {
  const color = TILE_PALETTE[colorIndex % TILE_PALETTE.length];
  const isHero = variant === "hero";
  const isWide = variant === "wide";

  return (
    <Link
      href={href}
      style={{ backgroundColor: color.bg, color: color.fg }}
      className={`group relative flex flex-col justify-between overflow-hidden rounded-2xl shadow-md transition-transform active:scale-[0.98] ${
        isHero ? "h-40 p-5" : isWide ? "col-span-2 h-36 p-5" : "aspect-square p-4"
      }`}
    >
      {/* 環境の拡張パック画像。縦長なので右上に立てて置き、文字とは重ねない。
          元画像は 311×652 で 400KB 前後あるため、next/image で縮小して配信させる
          (CDN は next.config.ts の remotePatterns に登録済み)。 */}
      {badgeImageUrl && !isHero && (
        <Image
          src={badgeImageUrl}
          alt=""
          aria-hidden
          width={62}
          height={130}
          loading={eagerImage ? "eager" : "lazy"}
          // 横長では高さいっぱいに立てて主役にする。正方形では、名前が2行になっても
          // 下の文字と重ならない範囲で最大にしてある。
          className={
            isWide
              ? "pointer-events-none absolute right-5 top-1/2 h-[86%] w-auto -translate-y-1/2 rounded-[3px] object-contain shadow-md"
              : "pointer-events-none absolute right-3 top-6 h-[42%] w-auto rounded-[3px] object-contain shadow-md"
          }
        />
      )}

      <span
        style={{ color: color.sub }}
        className={`relative font-bold ${isHero || isWide ? "text-[10px] tracking-[0.2em]" : "text-[9px] tracking-[0.16em]"}`}
      >
        {kindLabel}
      </span>

      {/* 横長でパック画像を置くときは、その幅ぶん(画像59px + 余白)を空ける。
          空けないと長い環境名が画像の下に潜り込む。 */}
      <div
        className={`relative flex flex-col gap-1 ${
          isWide && badgeImageUrl ? "pr-20" : ""
        }`}
      >
        <span
          className={`flex flex-col font-black leading-tight ${isHero ? "text-2xl" : isWide ? "text-lg" : "text-sm"}`}
        >
          <span
            // 環境名は長くなりうる。タイルの高さは決まっているので行数で止める
            // （正方形は2行、横長は3行まで。超えた分は省略する）
            style={
              isHero
                ? undefined
                : {
                    display: "-webkit-box",
                    WebkitLineClamp: isWide ? 3 : 2,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden",
                  }
            }
          >
            {title}
            {titleSuffix && isWide ? titleSuffix : null}
          </span>
          {titleSuffix && (isWide ? null : <span>{titleSuffix}</span>)}
        </span>
        <span
          style={{ color: color.sub }}
          className={`font-bold tabular-nums ${isHero || isWide ? "text-xs" : "text-[10px]"}`}
        >
          {subtitle}
        </span>
      </div>

      {isHero && (
        <LuArrowRight
          className="absolute right-5 top-1/2 h-5 w-5 -translate-y-1/2 transition-transform group-hover:translate-x-0.5"
          style={{ color: color.sub }}
        />
      )}
    </Link>
  );
}
