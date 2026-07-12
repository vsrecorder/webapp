import WinRateRing from "@app/components/organisms/Record/Hero/WinRateRing";
import {
  HERO_STAT_COL_CLASS,
  heroStatColStyle,
} from "@app/components/organisms/Record/Hero/heroColumns";

import { MatchStats } from "@app/utils/matchStats";

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
      style={heroStatColStyle}
      className={`${HERO_STAT_COL_CLASS} flex flex-col items-center justify-center rounded-2xl border border-divider bg-content1/60 px-2 py-2.5`}
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
