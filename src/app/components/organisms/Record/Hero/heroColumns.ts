import type { CSSProperties } from "react";

/*
 * 戦績カード(RecordHero)上段2カラムのレイアウト定義。
 *
 *   左カラム = イベント情報(上) ＋ 使用デッキ(下)
 *   右カラム = 戦績パネル(勝率リング ＋ 勝敗の内訳)
 *
 * ▼ 比率を変えたいときは HERO_COL_RATIO の2つの数字だけを書き換える。
 *   例: { left: 7, right: 3 } → { left: 13, right: 7 } など、任意の整数でよい。
 *   リング径・勝率の文字サイズはパネル幅に追従するため、他に直す箇所はない。
 */
export const HERO_COL_RATIO = { left: 7, right: 3 };

// 左右カラムの間隔。比率の計算に使うため、Tailwind の gap-* ではなくここで一元管理する。
export const HERO_COL_GAP = "0.75rem";

/*
 * なぜ Tailwind のクラスではなくインラインスタイルなのか:
 * Tailwind はソース上のリテラルなクラス名しか拾えないため、比率から動的に組み立てた
 * `w-[calc(...)]` は CSS が生成されない。比率を可変にするにはスタイル側で計算する必要がある。
 *
 * なぜ grow 比(flex: 7 / flex: 3)ではないのか:
 * flex-basis: 0 は戦績パネルの padding+border(18px)を下回れず、その 18px が比率配分の
 * 外側に加算されてしまう。実測で 7:3 のつもりが 6.5:3.5 になる。
 * そこで右カラムだけ外形幅を確定させ、左カラムは flex-1 で残りを埋める。
 *
 *   右 = fR * (W - gap)
 *   左 = W - gap - 右 = (1 - fR) * (W - gap)
 *   → 左 : 右 = left : right (gap の影響を受けず厳密)
 */

// 上段の行(左右カラムを並べる flex コンテナ)に渡すスタイル
export const heroColRowStyle: CSSProperties = { gap: HERO_COL_GAP };

// 左カラム(イベント情報＋使用デッキ)。残り幅を埋める
export const HERO_INFO_COL_CLASS = "min-w-0 flex-1";

// 右カラム(戦績パネル)の外形幅
export const heroStatColStyle: CSSProperties = {
  width: `calc(${HERO_COL_RATIO.right} / ${
    HERO_COL_RATIO.left + HERO_COL_RATIO.right
  } * (100% - ${HERO_COL_GAP}))`,
};

// 右カラム共通のクラス。min-w-0 は、中身(リング・勝敗タイル)の最小幅が
// 割り当て幅を押し広げて比率を崩すのを防ぐ
export const HERO_STAT_COL_CLASS = "min-w-0 shrink-0";
