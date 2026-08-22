"use client";

import RecapCardFrame, { TONE } from "@app/components/organisms/Report/RecapCardFrame";
import RecapStats, {
  RecapStatUnit,
  type RecapStatItem,
} from "@app/components/organisms/Report/RecapStats";
import RecapSprites from "@app/components/organisms/Report/RecapSprites";
import RecapRankRow from "@app/components/organisms/Report/RecapRankRow";
import { DeckUsageItemType } from "@app/types/deck_usage_stat";
import {
  periodHeadingFontSize,
  periodPossessive,
  type RecapPeriod,
} from "@app/utils/recapPeriod";

type Props = {
  period: RecapPeriod;
  // その期間に多く使ったデッキ（試合数の多い順・最大3件）。先頭が主役
  decks: DeckUsageItemType[];
  // その期間の総試合数（このデッキが占める割合の分母）
  totalMatches: number;
};

// デッキ名はユーザーの自由入力なので、長さに応じて字を詰める。
// 1080px 幅から左右の余白(88×2)を引いた 904px に収まる範囲で段階的に落とす。
function deckNameFontSize(name: string): number {
  const length = [...name].length;
  if (length <= 8) return 104;
  if (length <= 11) return 84;
  if (length <= 15) return 66;
  return 52;
}

// 2枚目。その期間の相棒（最も多く使ったデッキ）を主役に据え、2位・3位を下に添える。
export default function RecapDeckCard({ period, decks, totalMatches }: Props) {
  const t = TONE.secondary;

  const deck = decks[0];
  const runnersUp = decks.slice(1, 3);
  if (!deck) return null;

  // deck_usage の count は COUNT(DISTINCT matches.id)＝試合数。件数ではない。
  const draws = Math.max(0, deck.count - deck.wins - deck.losses);
  const record = `${deck.wins}勝${deck.losses}敗${draws > 0 ? `${draws}分` : ""}`;
  const share = totalMatches > 0 ? Math.round((deck.count / totalMatches) * 100) : 0;
  // デッキ名が未設定の記録もあるため、空文字のまま大きく出さない
  const name = deck.name.trim() || "名前のないデッキ";

  /*
   * 戦績（13勝8敗）は桁数によって幅が大きく変わる。列幅はおよそ275pxなので、
   * 3桁同士（108勝92敗）まで来ると既定の88pxでは収まらず2行に折り返す。
   * 数字の合計桁数で段階的に落とし、単位もそれに合わせる。
   */
  const recordDigits = String(deck.wins).length + String(deck.losses).length;
  const recordSize = recordDigits <= 4 ? 88 : recordDigits <= 5 ? 66 : 56;

  const items: RecapStatItem[] = [
    { label: "試合数", value: String(deck.count) },
    {
      label: "戦績",
      // 引き分けはここには出さない（3列に収まらない）。上の一文には含めてある
      value: (
        <span style={{ fontSize: recordSize }}>
          {deck.wins}
          <RecapStatUnit size={Math.round(recordSize / 2)}>勝</RecapStatUnit>
          {deck.losses}
          <RecapStatUnit size={Math.round(recordSize / 2)}>敗</RecapStatUnit>
        </span>
      ),
    },
    { label: "勝率", value: (deck.win_rate * 100).toFixed(1), unit: "%" },
  ];

  return (
    <RecapCardFrame
      tone="secondary"
      period={period}
      bottom={<RecapStats tone="secondary" items={items} />}
    >
      <div className="flex flex-col" style={{ gap: 32, marginTop: -20 }}>
        <span
          style={{
            fontSize: periodHeadingFontSize(period, 44),
            lineHeight: 1.35,
            color: t.fg,
            opacity: 0.88,
          }}
        >
          {periodPossessive(period)}の
          {/* 環境名は長いので、そこで行を分けて「相棒デッキは」を次の行へ送る（月は短いので分けない） */}
          {period.kind === "environment" && <br />}
          相棒デッキは
        </span>

        <RecapSprites sprites={deck.pokemon_sprites} size={148} />

        <span
          style={{
            fontSize: deckNameFontSize(name),
            lineHeight: 1.05,
            letterSpacing: "-0.04em",
            color: t.accent,
          }}
          className="font-black"
        >
          {name}
        </span>

        <span style={{ fontSize: 34, lineHeight: 1.5, color: t.sub }}>
          {deck.count}戦 {record}。
          <br />
          あなたの試合の {share}% がこのデッキでした。
        </span>

        {runnersUp.length > 0 && (
          <div
            className="flex flex-col"
            style={{ gap: 16, paddingTop: 20, borderTop: `2px solid ${t.rule}` }}
          >
            {runnersUp.map((item, index) => (
              <RecapRankRow
                key={item.deck_id || item.name || index}
                tone="secondary"
                rank={index + 2}
                sprites={item.pokemon_sprites}
                name={item.name.trim() || "名前のないデッキ"}
                detail={`${item.count}戦 ・ ${(item.win_rate * 100).toFixed(1)}%`}
              />
            ))}
          </div>
        )}
      </div>
    </RecapCardFrame>
  );
}
