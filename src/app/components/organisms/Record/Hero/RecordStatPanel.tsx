import WinRateRing from "@app/components/organisms/Record/Hero/WinRateRing";

import { MatchStats } from "@app/utils/matchStats";

/*
 * ヒーロー上段2カラムの幅比。左(イベント情報＋使用デッキ) : 右(戦績パネル) = 65 : 35。
 *
 * ビューポートではなくカードの実幅に対する比率で決める。記録詳細ページ・記録情報
 * モーダル・シェア画像(キャプチャ幅は固定)でカード幅が異なるため、メディアクエリでは
 * 追従できない。
 *
 * パネル側だけ外形幅を指定し、左カラムは flex-1 で残りを埋める。
 * カラム間には gap(0.75rem)があるので、単に 35% とすると gap のぶん右が太って
 * 比率がずれる。そのため gap の 35% を差し引く:
 *   右 = 0.35W - 0.35g / 左 = W - g - 右 = 0.65W - 0.65g  →  左:右 = 65:35(厳密)
 *
 * grow 比(flex-[65]/flex-[35])では比率どおりにならない。flex-basis:0 はパネルの
 * padding+border(18px)を下回れず、その 18px が分配の外側に加算されるため。
 *
 * 実表示とスケルトンで同じ比率にするため、クラス文字列をここから共有する
 * (Tailwind に検出させるため、分割せずリテラルのまま書く)。
 */
export const HERO_INFO_COL_CLASS = "flex-1";
export const STAT_PANEL_COL_CLASS = "w-[calc(35%_-_0.35*0.75rem)] shrink-0";

type Props = {
  stats: MatchStats;
};

/*
 * ヒーロー右カラムの戦績パネル。勝率リングと勝敗の内訳を1枚のサーフェスへ束ね、
 * カード背景のグラデーションから切り離した「ダッシュボード」として見せる。
 *
 * 左カラム(イベント情報＋使用デッキの縦積み)と高さを揃えるため、親の items-stretch で
 * 縦に引き伸ばされる。justify-center で中身を上下中央に置き、左右のバランスを取る。
 *
 * 背景は半透明にして、カード右上の勝率グロー(勝ち越し=緑 / 負け越し=赤)を
 * パネル越しに透かせる。対戦結果パネルと同じ枠線・角丸で系統を揃える。
 */
export default function RecordStatPanel({ stats }: Props) {
  // min-w-0: 中身(リング・勝敗タイル)の最小幅が 3/10 の割り当てを押し広げて
  // 7:3 が崩れるのを防ぐ
  return (
    <div
      className={`${STAT_PANEL_COL_CLASS} flex min-w-0 flex-col items-center justify-center rounded-2xl border border-divider bg-content1/60 px-2 py-2.5`}
    >
      {/* リングはパネルの内側幅いっぱいに広がる(パネル幅に追従して拡縮する) */}
      <WinRateRing winRate={stats.winRate} />

      {/* 勝敗の内訳。リングとは区切り線で分け、勝/敗を並列のタイルとして読ませる */}
      <div className="mt-2.5 flex w-full items-stretch border-t border-divider pt-2.5">
        <div className="flex flex-1 flex-col items-center leading-none">
          <span className="text-lg font-bold tabular-nums text-success">{stats.wins}</span>
          <span className="mt-1 text-[9px] font-bold text-default-500">勝</span>
        </div>
        <span aria-hidden className="w-px self-stretch bg-divider" />
        <div className="flex flex-1 flex-col items-center leading-none">
          <span className="text-lg font-bold tabular-nums text-danger">
            {stats.losses}
          </span>
          <span className="mt-1 text-[9px] font-bold text-default-500">敗</span>
        </div>
      </div>
    </div>
  );
}
