import { DeckSummaryType } from "@app/types/deckcard";
import { mapWithConcurrency } from "@app/utils/concurrency";
import { isDeckCardDetail } from "@app/utils/deckcard";
import { buildDeckSummary } from "@app/utils/deckSummary";

// デッキコードからカード内訳の要約を、サーバコンポーネントで取得する。
//
// シティリーグ結果ページはこれまでデッキを CDN の画像とデッキコードでしか出しておらず、
// 「優勝デッキ」と題しながら本文には何のデッキかが一文字も無かった。検索エンジンに
// カード名・主なポケモンを読ませるため、クライアントではなくここで取得して HTML に載せる。

// デッキコードの中身は公式サイト側で不変なので長くキャッシュする。
// deckcard-api 側でカード名の表記が直ることはあるため、無期限にはしない。
const REVALIDATE_SECONDS = 60 * 60 * 24 * 30;

// deckcard-api はキャッシュに無いデッキコードを公式サイトから取りに行く(1件 0.4秒前後)。
// 1ページに16件並ぶため、一度に投げる数を絞って公式サイトへの同時要求を抑える。
const CONCURRENCY = 6;

function deckcardApiUrl(code: string): string {
  return `https://${process.env.VSRECORDER_DOMAIN}/api/v1beta/deckcards/${encodeURIComponent(code)}/detail`;
}

// 取れなければ null。カード内訳は本文の付随物なので、失敗してもページ自体は出す
// (画像とデッキコードだけの、これまでどおりの表示になる)。
export async function getDeckSummary(code: string): Promise<DeckSummaryType | null> {
  if (!code) return null;

  let res: Response;

  try {
    res = await fetch(deckcardApiUrl(code), {
      method: "GET",
      headers: { Accept: "application/json" },
      next: { revalidate: REVALIDATE_SECONDS },
    });
  } catch {
    return null;
  }

  if (!res.ok) return null;

  const detail: unknown = await res.json().catch(() => null);

  if (!isDeckCardDetail(detail)) return null;

  return buildDeckSummary(code, detail);
}

// 複数のデッキコードをまとめて引く。デッキコードをキーにした辞書を返し、取れなかったものは含めない。
export async function getDeckSummaries(
  codes: string[],
): Promise<Record<string, DeckSummaryType>> {
  const unique = [...new Set(codes.filter((code) => !!code))];

  const summaries = await mapWithConcurrency(unique, CONCURRENCY, getDeckSummary);

  const byCode: Record<string, DeckSummaryType> = {};

  unique.forEach((code, index) => {
    const summary = summaries[index];
    if (summary) byCode[code] = summary;
  });

  return byCode;
}
