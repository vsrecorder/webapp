"use client";

import RecapCardFrame, { TONE } from "@app/components/organisms/Report/RecapCardFrame";
import RecapSprites from "@app/components/organisms/Report/RecapSprites";
import RecapRankRow from "@app/components/organisms/Report/RecapRankRow";
import { OpponentDeckUsageItemType } from "@app/types/opponent_deck_usage_stat";
import {
  periodHeadingFontSize,
  periodSubjectPrefix,
  type RecapPeriod,
} from "@app/utils/recapPeriod";

type Props = {
  period: RecapPeriod;
  // その期間に多く当たった相手デッキ（対面数の多い順・最大3件）。先頭が主役
  opponents: OpponentDeckUsageItemType[];
  // その期間の総試合数（「N戦中M回」の分母）
  totalMatches: number;
  // 同じ期間の環境全体での使用率(0〜1)。環境データが無い・圏外のデッキなら null
  envRate: number | null;
  // 環境側の母数（のべ対戦数）。率だけを出さないために必ず添える
  envTotalVotes: number | null;
};

// 相手デッキ名も自由入力なので、長さに応じて字を詰める。
function opponentNameFontSize(name: string): number {
  const length = [...name].length;
  if (length <= 8) return 68;
  if (length <= 12) return 56;
  if (length <= 18) return 44;
  return 36;
}

function barWidth(rate: number): string {
  return `${Math.min(100, Math.max(0, rate * 100))}%`;
}

/*
 * 3枚目。最も多く当たった相手デッキを、同じ期間の環境全体の使用率と並べる。
 *
 * 「自分がどれだけ当たったか」と「環境にどれだけ居るか」の差は、公式結果だけを持つ
 * サイトにも、記録だけのアプリにも出せない。このカードの主役はその比較。
 * 環境データが引けない（圏外・週データ無し）ときは比較を伏せ、自分の割合だけを出す。
 */
export default function RecapOpponentCard({
  period,
  opponents,
  totalMatches,
  envRate,
  envTotalVotes,
}: Props) {
  const t = TONE.dark;

  const opponent = opponents[0];
  const runnersUp = opponents.slice(1, 3);
  if (!opponent) return null;

  const name = opponent.deck_info.trim() || "デッキ名の記録なし";
  const mineRate = opponent.usage_rate;
  const diffPoints = envRate !== null ? (mineRate - envRate) * 100 : null;

  return (
    <RecapCardFrame
      tone="dark"
      period={period}
      bottom={
        <span style={{ fontSize: 36, lineHeight: 1.45 }} className="font-bold">
          {diffPoints === null ? (
            <>
              {totalMatches}戦のうち {opponent.count}回。
              <br />
              いちばん多く向き合ったデッキです。
            </>
          ) : (
            <>
              環境の平均より{" "}
              <span style={{ color: t.accent }} className="tabular-nums">
                {diffPoints >= 0 ? "+" : "−"}
                {Math.abs(diffPoints).toFixed(1)}pt
              </span>{" "}
              {diffPoints >= 0 ? "多く" : "少なく"}当たりました。
            </>
          )}
        </span>
      }
    >
      <div className="flex flex-col" style={{ gap: 32, marginTop: -30 }}>
        <span
          style={{
            fontSize: periodHeadingFontSize(period, 44),
            lineHeight: 1.35,
            color: t.fg,
            opacity: 0.85,
          }}
        >
          {periodSubjectPrefix(period)}
          {/* 環境名は長いので、読点で行を分けて本題を次の行へ送る（月は短いので分けない） */}
          {period.kind === "environment" && <br />}
          いちばん向き合った相手のデッキ
        </span>
        <div className="flex items-center" style={{ gap: 28 }}>
          <RecapSprites sprites={opponent.pokemon_sprites} size={132} />
          <span
            style={{
              fontSize: opponentNameFontSize(name),
              lineHeight: 1.1,
              letterSpacing: "-0.035em",
            }}
            className="font-black"
          >
            {name}
          </span>
        </div>
      </div>

      <div className="flex flex-col" style={{ gap: 40 }}>
        <div className="flex flex-col" style={{ gap: 14 }}>
          <span
            style={{ fontSize: 28, letterSpacing: "0.06em", color: t.accent }}
            className="font-bold"
          >
            あなたが当たった割合
          </span>
          <div className="flex items-end" style={{ gap: 20 }}>
            <span
              style={{
                fontSize: 168,
                lineHeight: 0.85,
                letterSpacing: "-0.045em",
                color: t.accent,
              }}
              className="font-black tabular-nums"
            >
              {(mineRate * 100).toFixed(1)}
              <span style={{ fontSize: 76 }} className="font-bold">
                %
              </span>
            </span>
            <span
              style={{ fontSize: 32, color: t.sub, paddingBottom: 16 }}
              className="tabular-nums"
            >
              {totalMatches}戦中 {opponent.count}回
            </span>
          </div>
          <Bar width={barWidth(mineRate)} color={t.accent} />
        </div>

        {envRate !== null && (
          <div className="flex flex-col" style={{ gap: 14 }}>
            {/* 自分の割合は全レギュレーション合算だが、プラットフォーム集計は
                スタンダード限定。分母の条件が違うことが読み取れるよう明記する。 */}
            <span
              style={{ fontSize: 28, letterSpacing: "0.06em", color: t.sub }}
              className="font-bold"
            >
              環境全体での使用率（スタンダード）
            </span>
            <div className="flex items-end" style={{ gap: 20 }}>
              <span
                style={{
                  fontSize: 88,
                  lineHeight: 0.9,
                  letterSpacing: "-0.035em",
                  color: "rgba(255, 255, 255, 0.75)",
                }}
                className="font-black tabular-nums"
              >
                {(envRate * 100).toFixed(1)}
                <span style={{ fontSize: 44 }} className="font-bold">
                  %
                </span>
              </span>
              {/* 率だけを出さない。環境側の母数を必ず添える */}
              {envTotalVotes !== null && (
                <span
                  style={{ fontSize: 26, color: t.sub, paddingBottom: 10 }}
                  className="tabular-nums"
                >
                  のべ {envTotalVotes.toLocaleString()}戦から集計
                </span>
              )}
            </div>
            <Bar width={barWidth(envRate)} color="rgba(255, 255, 255, 0.45)" />
          </div>
        )}
      </div>

      {runnersUp.length > 0 && (
        <div
          className="flex flex-col"
          style={{ gap: 16, paddingTop: 20, borderTop: `2px solid ${t.rule}` }}
        >
          {runnersUp.map((item, index) => (
            <RecapRankRow
              key={item.deck_info || index}
              tone="dark"
              rank={index + 2}
              sprites={item.pokemon_sprites}
              name={item.deck_info.trim() || "デッキ名の記録なし"}
              detail={`${item.count}回 ・ ${(item.usage_rate * 100).toFixed(1)}%`}
            />
          ))}
        </div>
      )}
    </RecapCardFrame>
  );
}

function Bar({ width, color }: { width: string; color: string }) {
  return (
    <div
      style={{ height: 18, borderRadius: 999, backgroundColor: "rgba(255,255,255,0.14)" }}
      className="overflow-hidden"
    >
      <div style={{ height: "100%", width, borderRadius: 999, backgroundColor: color }} />
    </div>
  );
}
