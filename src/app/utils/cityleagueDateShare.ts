import { DeckArchetypeType } from "@app/types/deck_archetype";

// 開催日ごとのシティリーグ入賞デッキ一覧(/cityleague_results/dates/[date])をシェアするための
// URL・文言と、OGP 画像に載せる「その日の優勝デッキ」の集計。

export function cityleagueDatePath(dateParam: string): string {
  return `/cityleague_results/dates/${dateParam}`;
}

// X のポスト文(URL は intent の url に別で渡す)。dateLabel は「2026年9月26日(土)」
export function cityleagueDatePostText(dateLabel: string): string {
  return [`${dateLabel}のシティリーグ入賞デッキ一覧`, "#バトレコ #ポケカ"].join("\n");
}

// X の投稿画面を開く URL。個別ページのシェアと同じく utm を付け、流入を追えるようにする
export function cityleagueDateXIntentUrl(
  dateParam: string,
  dateLabel: string,
  origin: string,
): string {
  const url = new URL(cityleagueDatePath(dateParam), origin);
  url.searchParams.set("utm_source", "x");
  url.searchParams.set("utm_medium", "share");
  url.searchParams.set("utm_campaign", "cityleague_date");

  const intent = new URL("https://x.com/intent/post");
  intent.searchParams.set("text", cityleagueDatePostText(dateLabel));
  intent.searchParams.set("url", url.toString());

  return intent.toString();
}

export type DateWinnerDeck = {
  // 主デッキ名(型は束ねる。例「ドラパルトex」)
  name: string;
  // 主デッキの 1 体目のスプライト(図鑑 ID)。型ごとに 2 体目が違うので 1 体目だけを使う
  spriteId?: string;
  // その日に優勝した回数
  wins: number;
};

/*
 * その日の優勝デッキを主デッキ(型は束ねる)ごとに数え、多い順に並べる。OGP 画像に載せる。
 *
 * 型まで分けると 1 回ずつに散って「何が勝ったか」が見えにくいので、主デッキでまとめる。
 * 分類が無いデッキ(旧シーズン・vslab の索引に無い)と未分類は数えない。
 * 同数は名前順にして、描き直しても並びが変わらないようにする。
 */
export function summarizeDateWinners(
  winnerArchetypes: (DeckArchetypeType | undefined)[],
  limit: number,
): DateWinnerDeck[] {
  const byName = new Map<string, DateWinnerDeck>();

  for (const archetype of winnerArchetypes) {
    const name = archetype?.archetypeName;
    if (!archetype?.label || !name) continue;

    const found = byName.get(name);
    if (found) {
      found.wins += 1;
    } else {
      byName.set(name, { name, spriteId: archetype.sprites[0], wins: 1 });
    }
  }

  return [...byName.values()]
    .sort((a, b) => b.wins - a.wins || a.name.localeCompare(b.name, "ja"))
    .slice(0, limit);
}
