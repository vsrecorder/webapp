"use client";

import { LuFlame } from "react-icons/lu";

import RecapCardFrame, { TONE } from "@app/components/organisms/Report/RecapCardFrame";
import { UserStreakType } from "@app/types/streak";
import { type RecapPeriod } from "@app/utils/recapPeriod";

type Props = {
  period: RecapPeriod;
  streak: UserStreakType;
};

/*
 * 4枚目。連続記録の週数。
 *
 * 面の色は画面のストリーク表示と同じ warning(#f5a524)。5枚のうちここだけ明るい面に
 * 反転させ、めくったときに落差が出るようにしている。
 */
export default function RecapStreakCard({ period, streak }: Props) {
  const t = TONE.amber;
  const { current_weeks: current, longest_weeks: longest } = streak;
  // 最長に並んでいる（＝更新中）なら、あと何週という言い方はしない
  const isBest = current >= longest;
  // 最長を「超える」のに必要な週数
  const weeksToBest = longest - current + 1;

  return (
    <RecapCardFrame
      tone="amber"
      period={period}
      bottom={
        <span style={{ fontSize: 38, lineHeight: 1.45 }} className="font-bold">
          {isBest ? (
            <>
              これがあなたの自己ベストです。
              <br />
              来週も記録すれば、記録はさらに伸びます。
            </>
          ) : (
            <>
              最長記録は{longest}週。
              <br />
              あと{weeksToBest}週で、自己ベストを更新します。
            </>
          )}
        </span>
      }
    >
      <div className="flex flex-col" style={{ gap: 28, marginTop: -40 }}>
        <LuFlame size={132} strokeWidth={1.5} color={t.fg} />
        <span style={{ fontSize: 48, lineHeight: 1.35, color: t.fg, opacity: 0.8 }}>
          記録は、続いている。
        </span>
        <span
          style={{ fontSize: 240, lineHeight: 0.85, letterSpacing: "-0.05em" }}
          className="font-black tabular-nums"
        >
          {current}
          {/* 数字側の負の字送りが後続の全角文字に食い込むため、単位側で相殺する */}
          <span
            style={{ fontSize: 108, letterSpacing: "-0.02em", marginLeft: 24 }}
            className="font-bold"
          >
            週連続
          </span>
        </span>
      </div>
    </RecapCardFrame>
  );
}
