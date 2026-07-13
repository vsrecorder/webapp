"use client";

import WinRateRing, {
  winRateColors,
} from "@app/components/organisms/Record/Hero/WinRateRing";
import TeamSynergyPanel, {
  phiTone,
} from "@app/components/organisms/Record/Hero/TeamSynergyPanel";
import {
  HERO_STAT_COL_CLASS,
  heroStatColStyle,
} from "@app/components/organisms/Record/Hero/heroColumns";

import { MatchStats } from "@app/utils/matchStats";

type Props = {
  stats: MatchStats;
  // 裏面(貢献度)を表示するか。表示状態は親が持つ
  // (シェア画像は別インスタンスの RecordHero を描画するため、同じ面を撮るには
  //  状態を共有する必要がある)。
  showSynergy?: boolean;
  // 未指定ならタップできない静的パネルになる(シェア画像のキャプチャ用)
  onToggleSynergy?: () => void;
};

type LegendRowProps = {
  label: string;
  wins: number;
  losses: number;
  // 対応するリングのゲージ色(勝ち越し=緑 / 負け越し=赤)
  color: string;
};

/*
 * チーム戦の内訳1行。行頭のドットの色でリングとの対応を示し(外周=チーム / 内周=個人)、
 * 右端に「勝-敗」を置く。狭い戦績パネルに2行入れるため、勝/敗タイルではなく
 * 圧縮表記にしている。
 */
function LegendRow({ label, wins, losses, color }: LegendRowProps) {
  return (
    <div className="flex items-center gap-1.5">
      <span
        aria-hidden
        className="h-2 w-2 shrink-0 rounded-sm"
        style={{ backgroundColor: color }}
      />
      <span className="text-[10px] font-bold text-default-500">{label}</span>
      <span className="ml-auto text-xs font-bold tabular-nums">
        <span className="text-success">{wins}</span>
        <span className="mx-px text-default-400">-</span>
        <span className="text-danger">{losses}</span>
      </span>
    </div>
  );
}

// 貢献度(φ係数)に連動したパネル背景の glow
function synergyGlowClass(phi: number | null): string {
  const tone = phiTone(phi);
  if (tone === "positive") return "record-stat-glow";
  if (tone === "negative") return "record-stat-glow-loss";
  return "record-stat-glow-neutral";
}

/*
 * ヒーロー右カラムの戦績パネル。勝率リングと勝敗の内訳を1枚のサーフェスへ束ね、
 * カード背景のグラデーションから切り離した「ダッシュボード」として見せる。
 *
 * チーム戦を含む記録では、リングを2重(外周=チーム勝率 / 内周=個人勝率)にし、
 * 内訳もチーム・個人の2行にする。さらにパネルのタップで裏面へ切り替わり、
 * チーム結果への貢献度(φ係数)を表示する。チーム戦を含まない記録は従来通り
 * 1本のリングと勝/敗タイルで、タップもできない。
 *
 * 左カラム(イベント情報＋使用デッキの縦積み)と高さを揃えるため、親の items-stretch で
 * 縦に引き伸ばされる。justify-center で中身を上下中央に置き、左右のバランスを取る。
 *
 * 勝率グロー(勝ち越し=緑 / 負け越し=赤)はパネル右上から放射させる。対戦結果パネルと
 * 同じ枠線・角丸で系統を揃え、グローは角丸からはみ出さないよう overflow-hidden で切る。
 */
export default function RecordStatPanel({
  stats,
  showSynergy = false,
  onToggleSynergy,
}: Props) {
  const hasTeamStats = stats.team.total > 0;

  // 裏面(貢献度)はチーム戦の記録でのみ表示できる
  const isSynergyView = hasTeamStats && showSynergy;

  // パネルの glow は表示中の指標に連動させる。
  //   表面(勝率)   : 負け越し(50%未満)なら負け色、それ以外は勝ち色
  //   裏面(貢献度) : φが正なら勝ち色、負なら負け色、連動なし/算出不可はグレー
  const glowClass = isSynergyView
    ? synergyGlowClass(stats.team.phi)
    : stats.winRate < 50
      ? "record-stat-glow-loss"
      : "record-stat-glow";

  const panelClass = `${HERO_STAT_COL_CLASS} relative flex flex-col items-center justify-center overflow-hidden rounded-2xl border border-divider bg-content1/60 px-2 py-2.5`;

  const panelBody = (
    <>
      {/* 勝率グロー(パネル背景)。中身は relative なラッパーで前面に置く */}
      <span aria-hidden className={`pointer-events-none absolute inset-0 ${glowClass}`} />

      <div className="relative flex w-full flex-col items-center">
        {isSynergyView ? (
          // 裏面: チーム結果への貢献度(φ係数)
          <TeamSynergyPanel team={stats.team} />
        ) : (
          <>
            {/* リングはパネルの内側幅いっぱいに広がる(パネル幅に追従して拡縮する) */}
            <WinRateRing
              winRate={stats.winRate}
              teamWinRate={hasTeamStats ? stats.team.winRate : undefined}
            />

            {/* 勝敗の内訳。リングとは区切り線で分ける */}
            {hasTeamStats ? (
              // チーム戦: リングの色と対応させた2行。ドットが2重リングの凡例を兼ねる
              <div className="mt-2.5 flex w-full flex-col gap-1.5 border-t border-divider pt-2.5">
                <LegendRow
                  label="チーム"
                  wins={stats.team.wins}
                  losses={stats.team.losses}
                  color={winRateColors(stats.team.winRate).gauge}
                />
                <LegendRow
                  label="個人"
                  wins={stats.wins}
                  losses={stats.losses}
                  color={winRateColors(stats.winRate).gauge}
                />
              </div>
            ) : (
              // 通常戦: 勝/敗を並列のタイルとして読ませる
              <div className="mt-2.5 flex w-full items-stretch border-t border-divider pt-2.5">
                <div className="flex flex-1 flex-col items-center leading-none">
                  <span className="text-lg font-bold tabular-nums text-success">
                    {stats.wins}
                  </span>
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
            )}
          </>
        )}
      </div>
    </>
  );

  // チーム戦以外(裏面を持たない)、またはシェア画像のキャプチャ用(onToggleSynergy 未指定)は、
  // タップできない静的なパネルにする
  if (!hasTeamStats || !onToggleSynergy) {
    return (
      <div style={heroStatColStyle} className={panelClass}>
        {panelBody}
      </div>
    );
  }

  return (
    <button
      type="button"
      style={heroStatColStyle}
      onClick={onToggleSynergy}
      aria-pressed={isSynergyView}
      aria-label={isSynergyView ? "勝率を表示する" : "貢献度を表示する"}
      className={`${panelClass} transition-opacity hover:opacity-80`}
    >
      {panelBody}
    </button>
  );
}
