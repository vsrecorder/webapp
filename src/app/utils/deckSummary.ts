import {
  DeckCardDetailType,
  DeckSummaryCardType,
  DeckSummaryGroupType,
  DeckSummaryType,
} from "@app/types/deckcard";

// デッキの中身をテキストとして扱うための純粋な変換。
// 取得(サーバ側)は deckSummaryServer.ts にあり、こちらはクライアントからも import できる。

// ルールを持つポケモン(ex / V / VSTAR / VMAX / GX)の名前の末尾。
const RULE_BOX_SUFFIX = /(ex|V|VSTAR|VMAX|GX)$/;

// 「主なポケモン」に採る最大数と採用枚数の下限。
// 1枚差しの ex(ニャースex 等)はデッキの種類を表さないので下限で除く。
const MAIN_POKEMON_MAX = 2;
const MAIN_POKEMON_MIN_COUNT = 2;

type CardListKey =
  | "card_pke"
  | "card_gds"
  | "card_tool"
  | "card_tech"
  | "card_sup"
  | "card_sta"
  | "card_ene";

// 表示順とラベル。card_tech は現行の応答では常に空だが、どうぐ扱いで取りこぼさないようにする。
const GROUPS: { keys: CardListKey[]; label: string }[] = [
  { keys: ["card_pke"], label: "ポケモン" },
  { keys: ["card_gds"], label: "グッズ" },
  { keys: ["card_tool", "card_tech"], label: "ポケモンのどうぐ" },
  { keys: ["card_sup"], label: "サポート" },
  { keys: ["card_sta"], label: "スタジアム" },
  { keys: ["card_ene"], label: "エネルギー" },
];

// 印刷(絵柄)違いを同じカード名に畳み、枚数の多い順に並べる。
// 同数なら元の並び(公式サイトの掲載順)を保つ(Map の挿入順 + 安定ソート)。
function aggregateByName(
  cards: { card_name: string; card_count: number }[],
): DeckSummaryCardType[] {
  const counts = new Map<string, number>();

  for (const card of cards) {
    counts.set(card.card_name, (counts.get(card.card_name) ?? 0) + card.card_count);
  }

  return [...counts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);
}

// デッキの種類を大まかに表すポケモンを選ぶ。
// ルールを持つポケモンを枚数順に優先し(進化ラインの下位より上位が残る)、
// 無ければ単に枚数の多いものを採る。厳密なデッキ分類ではなく「何のデッキか」の目安。
export function pickMainPokemon(pokemon: DeckSummaryCardType[]): string[] {
  const sorted = [...pokemon].sort((a, b) => b.count - a.count);

  const ruleBox = sorted.filter(
    (card) => RULE_BOX_SUFFIX.test(card.name) && card.count >= MAIN_POKEMON_MIN_COUNT,
  );

  return (ruleBox.length > 0 ? ruleBox : sorted)
    .slice(0, MAIN_POKEMON_MAX)
    .map((card) => card.name);
}

export function buildDeckSummary(
  code: string,
  detail: DeckCardDetailType,
): DeckSummaryType {
  const groups: DeckSummaryGroupType[] = [];

  for (const { keys, label } of GROUPS) {
    const cards = aggregateByName(keys.flatMap((key) => detail[key]));

    if (cards.length === 0) continue;

    groups.push({
      label,
      count: cards.reduce((sum, card) => sum + card.count, 0),
      cards,
    });
  }

  const pokemon = groups.find((group) => group.label === "ポケモン")?.cards ?? [];

  return {
    code,
    total: groups.reduce((sum, group) => sum + group.count, 0),
    mainPokemon: pickMainPokemon(pokemon),
    aceSpec: detail.card_acespec?.card_name ?? null,
    groups,
  };
}

// 「ドラパルトex・ヨノワール」の形。空なら空文字。
export function formatMainPokemon(names: string[]): string {
  return names.join("・");
}
