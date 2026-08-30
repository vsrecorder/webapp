// ふりかえりカードをシェアするときのポスト文。
// カード1枚ごとに、その1枚が言っていることだけを書く。
// 末尾のハッシュタグまで含めた完成形を返す（呼び出し側で足さない）。
//
// ハッシュタグは分析パネルのシェア（utils/panelPostText.ts）と揃えること。

import { UserStatType } from "@app/types/user_stat";
import { DeckUsageItemType } from "@app/types/deck_usage_stat";
import { OpponentDeckUsageItemType } from "@app/types/opponent_deck_usage_stat";
import { UserStreakType } from "@app/types/streak";
import { drawCount } from "@app/components/molecules/UserStat/UserStatSummary";
import { periodNextLabel, periodTitle, type RecapPeriod } from "@app/utils/recapPeriod";

const HASHTAG = "#バトレコ";

export type RecapCardKind = "summary" | "deck" | "opponent" | "streak" | "outro";

export type RecapPostContext = {
  period: RecapPeriod;
  stat: UserStatType;
  deck?: DeckUsageItemType;
  opponent?: OpponentDeckUsageItemType;
  // 相手デッキ集計側の総試合数。usage_rate の分母はこちらなので、
  // 「N戦中M回」を書くときは stat.total_matches ではなくこれを使う
  opponentTotalMatches?: number;
  // 相手デッキの、同じ期間の環境全体での使用率(0〜1)。引けなければ null
  envRate?: number | null;
  streak?: UserStreakType;
};

function recordText(wins: number, losses: number, draws: number): string {
  return `${wins}勝${losses}敗${draws > 0 ? `${draws}分` : ""}`;
}

/*
 * 全ページをまとめてシェアするときのポスト文。
 *
 * 画像を1枚ずつ説明すると長くなるので、レポート全体の要点だけを並べる。
 * 相棒・相手・連続記録は、そのページが出ているときだけ触れる
 * （ページが無いのに文だけ載ると、画像と食い違う）。
 */
export function buildRecapAllPostText(ctx: RecapPostContext): string {
  const { stat } = ctx;
  const record = recordText(stat.wins, stat.losses, drawCount(stat));
  const lines: string[] = [
    `${periodTitle(ctx.period)}のバトルレポート`,
    "",
    `${stat.total_matches}戦 ${record}（勝率 ${(stat.win_rate * 100).toFixed(1)}%）`,
  ];

  if (ctx.deck) {
    lines.push(`相棒デッキは『${ctx.deck.name.trim() || "名前のないデッキ"}』`);
  }
  if (ctx.opponent) {
    lines.push(
      `いちばん当たったのは『${ctx.opponent.deck_info.trim() || "デッキ名の記録なし"}』`,
    );
  }
  // 連続記録は環境別のレポートには出ない（→ TemplateUserReport のカード組み立て）
  if (ctx.period.kind !== "environment" && ctx.streak && ctx.streak.current_weeks > 0) {
    lines.push(`${ctx.streak.current_weeks}週連続で記録中`);
  }

  return [...lines, "", HASHTAG].join("\n");
}

export function buildRecapPostText(kind: RecapCardKind, ctx: RecapPostContext): string {
  const { stat } = ctx;
  const title = periodTitle(ctx.period);
  const lines: string[] = [];

  switch (kind) {
    case "summary": {
      const record = recordText(stat.wins, stat.losses, drawCount(stat));
      lines.push(
        `${title}のふりかえり`,
        "",
        `${stat.total_matches}戦 ${record}（勝率 ${(stat.win_rate * 100).toFixed(1)}%）`,
      );
      break;
    }

    case "deck": {
      const deck = ctx.deck;
      if (!deck) return buildRecapPostText("summary", ctx);

      const draws = Math.max(0, deck.count - deck.wins - deck.losses);
      const share =
        stat.total_matches > 0 ? Math.round((deck.count / stat.total_matches) * 100) : 0;
      lines.push(
        `${title}の相棒デッキは『${deck.name.trim() || "名前のないデッキ"}』`,
        "",
        `${deck.count}戦 ${recordText(deck.wins, deck.losses, draws)}（勝率 ${(deck.win_rate * 100).toFixed(1)}%）`,
        `この期間の試合の ${share}% がこのデッキでした`,
      );
      break;
    }

    case "opponent": {
      const opponent = ctx.opponent;
      if (!opponent) return buildRecapPostText("summary", ctx);

      const denominator = ctx.opponentTotalMatches || stat.total_matches;
      lines.push(
        `${title}にいちばん当たった相手は『${opponent.deck_info.trim() || "デッキ名の記録なし"}』`,
        "",
        `${denominator}戦中 ${opponent.count}回（${(opponent.usage_rate * 100).toFixed(1)}%）`,
      );
      // 環境と比べられるときだけ、その差まで書く（この比較がこのカードの主役）
      if (ctx.envRate != null) {
        const diff = (opponent.usage_rate - ctx.envRate) * 100;
        lines.push(
          `環境全体の使用率は ${(ctx.envRate * 100).toFixed(1)}%（${diff >= 0 ? "+" : "−"}${Math.abs(diff).toFixed(1)}pt）`,
        );
      }
      break;
    }

    case "streak": {
      const streak = ctx.streak;
      if (!streak) return buildRecapPostText("summary", ctx);

      lines.push(`${streak.current_weeks}週連続で記録中`, "");
      lines.push(
        streak.current_weeks >= streak.longest_weeks
          ? "自己ベストを更新中です"
          : `最長記録は ${streak.longest_weeks}週`,
      );
      break;
    }

    case "outro": {
      // 「今週も1戦ずつ」「9月も1戦ずつ」「次の環境も1戦ずつ」(言い回しの選び方は periodNextLabel)
      const next = `${periodNextLabel(ctx.period)}も1戦ずつ`;
      lines.push(`${title}、${stat.total_matches}戦を記録しました`, "", next);
      break;
    }
  }

  return [...lines, "", HASHTAG].join("\n");
}
