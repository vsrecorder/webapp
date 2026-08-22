"use client";

import RecapCardFrame, { TONE } from "@app/components/organisms/Report/RecapCardFrame";
import { addMonths, monthOnlyLabel } from "@app/utils/yearMonth";
import { type RecapPeriod } from "@app/utils/recapPeriod";

type Props = {
  period: RecapPeriod;
  // その期間の総試合数
  totalMatches: number;
};

// 5枚目。締め。4枚の色面のあと、ここだけアプリの地色に戻して終える。
export default function RecapOutroCard({ period, totalMatches }: Props) {
  const t = TONE.light;
  /*
   * 「『〇〇』環境で記録した …」は、環境名が長いと折り返しの都合で
   * 「環境」が行をまたいで割れる（「…』環 / 境で記録した」）。
   * 名前が長いときは名前の直後で行を分け、「環境で記録した …」を必ず1行に収める。
   * （「環境で」の後で分けても、その前の『名前』が1行に収まらなければ割れてしまう）
   *
   * しきい値は実測から。fontSize 38 で本文に使える幅は 904px = 1行およそ23文字、
   * 名前を除いた固定部分（『』環境で記録した NN戦 は、）が15文字ぶんあるので、
   * 名前が8文字までなら分けなくても1行に収まる。
   */
  const breaksAfterEnvironmentName =
    period.kind === "environment" && [...period.environment.title].length > 8;

  // 月なら翌月を名指しし、環境は次が何になるか分からないので「次の環境」に留める
  const nextLabel =
    period.kind === "month"
      ? `${monthOnlyLabel(addMonths(period.yearMonth, 1))}も、`
      : "次の環境も、";

  return (
    <RecapCardFrame
      tone="light"
      period={period}
      footer={
        <div className="flex flex-col" style={{ gap: 40 }}>
          <div
            className="flex items-center"
            style={{ gap: 28, paddingTop: 40, borderTop: `3px solid ${t.rule}` }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/icon-512x512.png"
              alt=""
              width={96}
              height={96}
              style={{ borderRadius: 22 }}
            />
            <div className="flex flex-col" style={{ gap: 6 }}>
              <span
                style={{ fontSize: 40, letterSpacing: "-0.02em" }}
                className="font-black"
              >
                バトレコ
              </span>
              <span style={{ fontSize: 26, color: "rgba(15, 23, 42, 0.55)" }}>
                ポケカプレイヤーのための対戦記録サービス
              </span>
              <span style={{ fontSize: 26, color: t.accent }} className="font-bold">
                vsrecorder.mobi
              </span>
            </div>
          </div>
          <span
            style={{ fontSize: 30, color: "rgba(15, 23, 42, 0.35)" }}
            className="font-bold"
          >
            #バトレコ　#ポケカ
          </span>
        </div>
      }
    >
      <div className="flex flex-col" style={{ gap: 36, marginTop: -60 }}>
        <span
          style={{ fontSize: 108, lineHeight: 1.15, letterSpacing: "-0.045em" }}
          className="font-black"
        >
          {nextLabel}
          <br />1戦ずつ。
        </span>
        <span style={{ fontSize: 38, lineHeight: 1.55, color: "rgba(15, 23, 42, 0.6)" }}>
          {period.kind === "environment" ? (
            <>
              『{period.environment.title}』
              {breaksAfterEnvironmentName && <br />}
              環境で記録した{" "}
            </>
          ) : (
            <>{monthOnlyLabel(period.yearMonth)}に記録した{" "}</>
          )}
          <span style={{ color: t.accent }} className="font-black tabular-nums">
            {totalMatches}戦
          </span>{" "}
          は、
          <br />
          環境データの一部になっています。
        </span>
      </div>
    </RecapCardFrame>
  );
}
