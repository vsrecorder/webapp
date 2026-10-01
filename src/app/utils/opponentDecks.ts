// 相手デッキの一括編集で使う、一覧の絞り込み・並び替えと、置き換えの指定の組み立て。

import {
  OpponentDeckMatchType,
  OpponentDeckSpecType,
  OpponentDeckType,
} from "@app/types/opponent_deck";
import { MatchPokemonSpriteType, PokemonSpriteType } from "@app/types/pokemon_sprite";
import { getSpriteBySlot } from "@app/utils/spriteSlot";

export type OpponentDeckOrder = "recent" | "count" | "name";

// 組み合わせ(表記 × 1体目 × 2体目)を一意に表す文字列。一覧の key と同一判定に使う
export function opponentDeckKey(spec: OpponentDeckSpecType): string {
  return [
    spec.opponents_deck_info,
    getSpriteBySlot(spec.pokemon_sprites, 1)?.id ?? "",
    getSpriteBySlot(spec.pokemon_sprites, 2)?.id ?? "",
  ].join("|");
}

/*
 * 検索用に表記を正規化する。全角・半角(NFKC)、大文字・小文字、カタカナ・ひらがなの違いを無視する。
 * 表記ゆれを探すための検索なので、「どらぱ」でも「ドラパ」「ﾄﾞﾗﾊﾟ」が引けるようにしている
 */
export function normalizeForSearch(text: string): string {
  return text
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[ァ-ヶ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60))
    .replace(/\s+/g, "");
}

export function filterOpponentDecks(
  decks: OpponentDeckType[],
  query: string,
): OpponentDeckType[] {
  const q = normalizeForSearch(query);
  if (!q) return decks;

  return decks.filter((deck) => normalizeForSearch(deck.opponents_deck_info).includes(q));
}

/*
 * 並び替え。
 *   - 新しい順: 最後に対戦した開催日の新しい順。いまの環境で当たっている相手デッキから直せる。
 *     同じ日なら対戦の多い順(開催日は YYYY-MM-DD なので文字列の比較で日付順になる)
 *   - 件数順: 上流の並び(対戦の多い順・同数は最近対戦した順)をそのまま使う
 *   - 名前順: 表記ゆれ(「ドラパ」「ドラパルト」「ドラパルトex」)が隣に並ぶので見つけやすい。
 *     同じ表記はスプライト違いなので、対戦の多い順にする
 */
export function sortOpponentDecks(
  decks: OpponentDeckType[],
  order: OpponentDeckOrder,
): OpponentDeckType[] {
  if (order === "count") return decks;

  if (order === "recent") {
    return [...decks].sort(
      (a, b) => b.last_event_date.localeCompare(a.last_event_date) || b.count - a.count,
    );
  }

  const collator = new Intl.Collator("ja");
  return [...decks].sort(
    (a, b) =>
      collator.compare(a.opponents_deck_info, b.opponents_deck_info) || b.count - a.count,
  );
}

// 置き換え先の指定を組み立てる。表記は前後の空白を落とし(対戦結果の保存と同じ)、
// スプライトは選んだ枠だけを position 付きで送る(空いた枠は含めない)
export function toOpponentDeckSpec(
  opponentsDeckInfo: string,
  sprite1: PokemonSpriteType | null,
  sprite2: PokemonSpriteType | null,
): OpponentDeckSpecType {
  const sprites: MatchPokemonSpriteType[] = [];
  if (sprite1) sprites.push({ id: sprite1.id, position: 1 });
  if (sprite2) sprites.push({ id: sprite2.id, position: 2 });

  return { opponents_deck_info: opponentsDeckInfo.trim(), pokemon_sprites: sprites };
}

// 置き換え元の指定。一覧の 1 件をそのまま使う(上流が返したスプライトは position を持つ)
export function specOfOpponentDeck(deck: OpponentDeckType): OpponentDeckSpecType {
  return {
    opponents_deck_info: deck.opponents_deck_info,
    pokemon_sprites: deck.pokemon_sprites.map((s) => ({
      id: s.id,
      position: s.position,
    })),
  };
}

// 開催日(YYYY-MM-DD)を「2026/9/28」の形にする。読めない値は空文字
export function formatLastEventDate(value: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!m) return "";

  return `${m[1]}/${Number(m[2])}/${Number(m[3])}`;
}

// 組み合わせ 1 つの対戦の一覧を取る URL。表記・1体目・2体目で指定し、空いた枠は送らない
// (上流は省略を「その枠が空いている組み合わせ」として扱う)
export function opponentDeckMatchesUrl(spec: OpponentDeckSpecType): string {
  const params = new URLSearchParams();
  if (spec.opponents_deck_info) params.set("opponents_deck_info", spec.opponents_deck_info);

  const sprite1 = getSpriteBySlot(spec.pokemon_sprites, 1)?.id;
  const sprite2 = getSpriteBySlot(spec.pokemon_sprites, 2)?.id;
  if (sprite1) params.set("pokemon_sprite_id_1", sprite1);
  if (sprite2) params.set("pokemon_sprite_id_2", sprite2);

  return `/api/matches/opponent_decks/matches?${params}`;
}

export type OpponentDeckMatchResult = {
  label: string;
  tone: "win" | "lose" | "draw";
};

/*
 * 対戦結果の勝敗の表記。相手デッキと当たった本人の結果なので、チーム戦も個人の勝敗で色を付け、
 * チームの勝敗は括弧で添える。両者引き分け(BO3のみ)は勝ちでも負けでもない色にする
 */
export function opponentDeckMatchResult(match: OpponentDeckMatchType): OpponentDeckMatchResult {
  if (match.default_victory_flg) return { label: "不戦勝", tone: "win" };
  if (match.default_defeat_flg) return { label: "不戦敗", tone: "lose" };
  if (match.draw_flg) return { label: "引き分け", tone: "draw" };

  const label = match.victory_flg ? "勝ち" : "負け";
  const tone = match.victory_flg ? "win" : "lose";
  if (match.group_match_flg) {
    return { label: `${label}（チーム${match.group_match_victory_flg ? "勝ち" : "負け"}）`, tone };
  }

  return { label, tone };
}
