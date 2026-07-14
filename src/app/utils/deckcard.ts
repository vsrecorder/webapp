import { DeckCardSummaryType, DeckCardType } from "@app/types/deckcard";

// デッキに含まれるカードの取得（/api/deckcards/[code]/...）をここに集約する。
//
// これらのAPIは、上流の応答次第では期待した形（カードの配列を含むJSON）で返らないことがある。
// 検証せずにそのままレンダリングへ渡すと map やスプレッドで例外になり、
// カードの表示部分だけでなくページ全体がエラー画面（app/error.tsx）へ落ちてしまう。
// そのため取得時点で形を検証し、崩れていれば「取得失敗」として例外にする。
// 呼び出し側は失敗を捕まえて、その表示部分にだけエラー（FetchError）を出すこと。

const SUMMARY_CARD_KEYS = [
  "card_pke",
  "card_gds",
  "card_tool",
  "card_sup",
  "card_sta",
  "card_ene",
] as const;

function isDeckCardSummary(value: unknown): value is DeckCardSummaryType {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const summary = value as Record<string, unknown>;

  return SUMMARY_CARD_KEYS.every((key) => Array.isArray(summary[key]));
}

// デッキコードに紐づくカードの内訳（ポケモン・グッズ・エネルギーなど）を取得する
export async function fetchDeckCardSummary(code: string): Promise<DeckCardSummaryType> {
  const res = await fetch(`/api/deckcards/${code}/summary`, {
    cache: "no-store",
    method: "GET",
    headers: {
      Accept: "application/json",
    },
  });

  if (!res.ok) {
    throw new Error("Failed to fetch");
  }

  const ret: unknown = await res.json();

  if (!isDeckCardSummary(ret)) {
    throw new Error("Unexpected deck card summary response");
  }

  return ret;
}

// デッキコードに紐づくカードを1枚ずつ並べた一覧（60枚）を取得する
export async function fetchDeckCardList(code: string): Promise<DeckCardType[]> {
  const res = await fetch(`/api/deckcards/${code}/list`, {
    cache: "no-store",
    method: "GET",
    headers: {
      Accept: "application/json",
    },
  });

  if (!res.ok) {
    throw new Error("Failed to fetch");
  }

  const ret: unknown = await res.json();

  if (!Array.isArray(ret)) {
    throw new Error("Unexpected deck card list response");
  }

  return ret as DeckCardType[];
}
