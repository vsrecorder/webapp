"use client";

import RecapCardFrame, { TONE } from "@app/components/organisms/Report/RecapCardFrame";
import RecapStats from "@app/components/organisms/Report/RecapStats";
import { drawCount } from "@app/components/molecules/UserStat/UserStatSummary";
import { UserStatType } from "@app/types/user_stat";
import {
  periodHeadingFontSize,
  periodSubjectPrefix,
  type RecapPeriod,
} from "@app/utils/recapPeriod";

type Props = {
  period: RecapPeriod;
  stat: UserStatType;
};

// 1枚目。その期間に何戦したかだけを主役にする。
export default function RecapSummaryCard({ period, stat }: Props) {
  const t = TONE.primary;
  const draws = drawCount(stat);

  return (
    <RecapCardFrame
      tone="primary"
      period={period}
      bottom={
        <RecapStats
          tone="primary"
          items={[
            { label: "勝ち", value: String(stat.wins) },
            {
              label: "負け",
              value: String(stat.losses),
              // 試合数と勝敗の合計が食い違って見えないよう、引き分けがある月だけ内訳を添える
              note: draws > 0 ? `（${draws}分）` : undefined,
            },
            { label: "勝率", value: (stat.win_rate * 100).toFixed(1), unit: "%" },
          ]}
        />
      }
    >
      <div className="flex flex-col" style={{ gap: 12, marginTop: -40 }}>
        <span
          style={{
            fontSize: periodHeadingFontSize(period, 54),
            lineHeight: 1.35,
            color: t.fg,
            opacity: 0.88,
          }}
        >
          {periodSubjectPrefix(period)}
          {/* 環境名は長いので、読点で行を分けて主語を次の行へ送る（月は短いので分けない） */}
          {period.kind === "environment" && <br />}
          あなたは
        </span>
        <span
          style={{
            fontSize: 300,
            lineHeight: 0.82,
            letterSpacing: "-0.045em",
            color: t.accent,
          }}
          className="font-black tabular-nums"
        >
          {stat.total_matches}
          {/* 数字側の負の字送りが後続の全角文字に食い込むため、単位側で相殺する */}
          <span
            style={{ fontSize: 120, letterSpacing: 0, marginLeft: 28 }}
            className="font-bold"
          >
            戦
          </span>
        </span>
        <span style={{ fontSize: 54, lineHeight: 1.35, color: t.fg, opacity: 0.88 }}>
          を記録しました。
        </span>
      </div>
    </RecapCardFrame>
  );
}
