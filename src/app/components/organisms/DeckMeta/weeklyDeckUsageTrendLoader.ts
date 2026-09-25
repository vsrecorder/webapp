import { generateWeekOptions } from "@app/utils/week";
import {
  DECK_USAGE_TREND_SELECTABLE_WEEKS,
  DeckUsageTrendRange,
  normalizeTrendRange,
} from "@app/utils/weeklyDeckUsageTrend";

import { WeeklyDeckUsageTrendType } from "@app/types/weekly_deck_usage_trend";

/*
 * 使用率順位の推移の取得。推移パネルと、推移タブの先読み(DeckMeta テンプレート)で共有する。
 *
 * 取得結果(取得中の Promise を含む)を期間ごとに TREND_CACHE_MS だけ控えておく。
 * - タブに触れた時点で先読みを始め、押して開いたときには届いている(または途中)ようにする
 * - 一度見た期間へ戻ったときは取り直さずに即座に出す
 * BFF 側も上流の集計を Data Cache に載せている(5分〜1時間)ので、ここで控える5分は
 * 画面の数字の鮮度をそれ以上に落とさない。
 */
const TREND_CACHE_MS = 5 * 60 * 1000;

type CacheEntry = {
  at: number;
  promise: Promise<WeeklyDeckUsageTrendType>;
  // 届いた結果。Promise の中身は同期的に覗けないため、描画をすぐ始められるよう別に持つ
  data?: WeeklyDeckUsageTrendType;
};

const cache = new Map<string, CacheEntry>();

const cacheKey = (range: DeckUsageTrendRange) => `${range.from}/${range.to}`;

function freshEntry(range: DeckUsageTrendRange): CacheEntry | undefined {
  const hit = cache.get(cacheKey(range));
  return hit && Date.now() - hit.at < TREND_CACHE_MS ? hit : undefined;
}

// 期間の選択肢として遡れる範囲(新しい週が先頭。今週を含む)
export function trendWeekOptions() {
  return generateWeekOptions(DECK_USAGE_TREND_SELECTABLE_WEEKS);
}

// URL の from / to から最初に表示する期間を決める。無い・不正なら先週までの6週
export function initialTrendRange(searchParams: {
  get(name: string): string | null;
}): DeckUsageTrendRange {
  const options = trendWeekOptions();
  return normalizeTrendRange(
    searchParams.get("from"),
    searchParams.get("to"),
    options[0].value,
    options[options.length - 1].value,
  );
}

/*
 * 期間の推移を取得する。控えがあればそれを返す。
 * fresh を立てると控えを使わずに取り直す(「再読み込み」用)。
 * 失敗した取得は控えから外し、次の呼び出しで取り直せるようにする。
 */
export function loadWeeklyDeckUsageTrend(
  range: DeckUsageTrendRange,
  { fresh = false }: { fresh?: boolean } = {},
): Promise<WeeklyDeckUsageTrendType> {
  const key = cacheKey(range);
  const hit = freshEntry(range);
  if (!fresh && hit) return hit.promise;

  const params = new URLSearchParams({ from: range.from, to: range.to });
  const promise = fetch(`/api/deck_meta/weekly_usage_trend?${params.toString()}`, {
    cache: "no-store",
  }).then(async (res) => {
    if (!res.ok) throw new Error(`weekly_usage_trend: ${res.status}`);
    return (await res.json()) as WeeklyDeckUsageTrendType;
  });

  const entry: CacheEntry = { at: Date.now(), promise };
  cache.set(key, entry);
  promise.then(
    (data) => {
      entry.data = data;
    },
    () => {
      // 後から取り直した控えまで消さないよう、自分が入れた控えのときだけ外す
      if (cache.get(key) === entry) cache.delete(key);
    },
  );
  return promise;
}

// 届いている結果があれば同期的に返す(先読み済みなら読み込み中の表示を挟まずに描くため)
export function peekWeeklyDeckUsageTrend(
  range: DeckUsageTrendRange,
): WeeklyDeckUsageTrendType | undefined {
  return freshEntry(range)?.data;
}

// 推移タブに触れたときの先読み。結果は控えに入るだけで、失敗しても何もしない
// (開いたときにパネルが取り直してエラーを出す)
export function prefetchWeeklyDeckUsageTrend(range: DeckUsageTrendRange): void {
  loadWeeklyDeckUsageTrend(range).catch(() => {});
}
