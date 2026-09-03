"use client";

import WinRateRing, {
  winRateColors,
} from "@app/components/organisms/Record/Hero/WinRateRing";
import TeamSynergyPanel, {
  phiTone,
} from "@app/components/organisms/Record/Hero/TeamSynergyPanel";
import {
  HERO_STAT_PANEL_CLASS,
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

/*
 * リングの下の「内訳」ブロックの中身の高さ。
 *
 * 個人戦の勝/敗タイルは 41px、チーム戦の凡例2行は 72px と必要な高さが違うため、
 * 素直に組むとパネルの寸法が戦型で 31px 変わる(実測: 個人 160.5px / チーム 191.5px)。
 * 凡例を 52px に詰めたうえで両方をこの高さに固定し、足りない側は中央寄せで埋める。
 */
const BREAKDOWN_HEIGHT_CLASS = "h-13";

/*
 * 表面(リング＋内訳)の高さを CSS だけで表した式。裏面(貢献度)を同じ高さに揃えるために使う。
 * リングは正方形でパネルの内側幅に追従するため、パネル本体をコンテナにして 100cqw で拾い、
 * 内訳ぶん(mt-2.5 の 10px ＋ 境界線 1px ＋ pt-2.5 の 10px ＋ 中身 52px)を足す。
 */
const FRONT_HEIGHT = "calc(100cqw + 73px)";

type LegendRowProps = {
  label: string;
  wins: number;
  losses: number;
  // 対応するリングのゲージ色(勝ち越し=緑 / 負け越し=赤)
  color: string;
};

/*
 * チーム戦の内訳1行。ドットの色でリングとの対応を示し(外周=チーム / 内周=個人)、
 * 「勝-敗」を添える。狭い戦績パネルに2行入れるため、勝/敗タイルではなく圧縮表記にしている。
 *
 * ラベルと数字は横並びにせず縦に積む。「ドット＋チーム＋14-13」を1行に並べると実測 93px 要り、
 * 戦績パネルの内側(390px 端末で 69px、320px で 52px)に収まらない。折り返させれば
 * 「チ/ー/ム」と1文字ずつ割れ、折り返しを止めれば数字がパネルの外へ出て切れる。
 * ドットはラベルと同じ行に置き、数字だけを次の行に落とす。これで最も広い行でも
 * 「ドット＋ラベル」の 45px に収まり、320px の 50px を超えない。
 */
function LegendRow({ label, wins, losses, color }: LegendRowProps) {
  return (
    // leading-none で行ボックスを文字サイズちょうどにする。既定の行送りのままだと
    // 1行 33px になり、2行が内訳の枠(52px)へ収まらない(10 + 2 + 12 = 24px/行)。
    <div className="flex w-full flex-col leading-none">
      <span className="flex items-center gap-1">
        <span
          aria-hidden
          className="h-2 w-2 shrink-0 rounded-sm"
          style={{ backgroundColor: color }}
        />
        <span className="whitespace-nowrap text-[0.625rem] font-bold text-default-500">
          {label}
        </span>
      </span>
      <span className="mt-0.5 text-xs font-bold tabular-nums">
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

  const panelClass = HERO_STAT_PANEL_CLASS;

  const panelBody = (
    <>
      {/* 勝率グロー(パネル背景)。中身は relative なラッパーで前面に置く */}
      <span aria-hidden className={`pointer-events-none absolute inset-0 ${glowClass}`} />

      <div
        style={{ containerType: "inline-size" }}
        className="relative flex w-full flex-col items-center"
      >
        {isSynergyView ? (
          // 裏面: チーム結果への貢献度(φ係数)。
          // 表面はリングが正方形で伸びるぶんこちらより高くなるため、同じ高さを確保して
          // 中身を上下中央に置く。確保しないと、パネルをタップして裏返すたびに
          // カードの高さが変わって行が跳ねる(実測で 33〜65px)。
          <div
            style={{ minHeight: FRONT_HEIGHT }}
            className="flex w-full flex-col justify-center"
          >
            <TeamSynergyPanel team={stats.team} />
          </div>
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
              <div className="mt-2.5 w-full border-t border-divider pt-2.5">
                <div
                  className={`flex ${BREAKDOWN_HEIGHT_CLASS} flex-col justify-center gap-1`}
                >
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
              </div>
            ) : (
              // 通常戦: 勝/敗を並列のタイルとして読ませる。
              // 両者引き分け(BO3のみ)がある記録では「分」タイルも追加する。
              <div className="mt-2.5 w-full border-t border-divider pt-2.5">
                <div className={`flex ${BREAKDOWN_HEIGHT_CLASS} items-stretch`}>
                  <div className="flex flex-1 flex-col items-center justify-center leading-none">
                    <span className="text-lg font-bold tabular-nums text-success">
                      {stats.wins}
                    </span>
                    <span className="mt-1 text-[0.5625rem] font-bold text-default-500">
                      勝
                    </span>
                  </div>
                  <span aria-hidden className="w-px self-stretch bg-divider" />
                  <div className="flex flex-1 flex-col items-center justify-center leading-none">
                    <span className="text-lg font-bold tabular-nums text-danger">
                      {stats.losses}
                    </span>
                    <span className="mt-1 text-[0.5625rem] font-bold text-default-500">
                      敗
                    </span>
                  </div>
                  {stats.draws > 0 && (
                    <>
                      <span aria-hidden className="w-px self-stretch bg-divider" />
                      <div className="flex flex-1 flex-col items-center justify-center leading-none">
                        <span className="text-lg font-bold tabular-nums text-default-500">
                          {stats.draws}
                        </span>
                        <span className="mt-1 text-[0.5625rem] font-bold text-default-500">
                          分
                        </span>
                      </div>
                    </>
                  )}
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
