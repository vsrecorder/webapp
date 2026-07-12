import WinRateRing from "@app/components/organisms/Record/Hero/WinRateRing";

import { MatchStats } from "@app/utils/matchStats";

// 戦績パネルの外形幅(px)。使用デッキ行の編集ボタンをパネル中心の真下へ揃えるため、
// パネル側と使用デッキ行側でこの値を共有する。
export const STAT_PANEL_WIDTH = 116;

// パネル内の勝率リング直径(px)
const RING_SIZE = 96;

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
  return (
    <div
      style={{ width: STAT_PANEL_WIDTH }}
      className="flex shrink-0 flex-col items-center justify-center rounded-2xl border border-divider bg-content1/60 px-2 py-2.5"
    >
      <WinRateRing winRate={stats.winRate} size={RING_SIZE} />

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
