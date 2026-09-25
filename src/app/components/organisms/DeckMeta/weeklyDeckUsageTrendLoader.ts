import { generateWeekOptions } from "@app/utils/week";
import {
  DECK_USAGE_TREND_SELECTABLE_WEEKS,
  DeckUsageTrendRange,
  normalizeTrendRange,
} from "@app/utils/weeklyDeckUsageTrend";

import {
  WeeklyDeckUsageTrendMembersType,
  WeeklyDeckUsageTrendType,
} from "@app/types/weekly_deck_usage_trend";

/*
 * 使用率順位の推移(と、選んだ系列の組み合わせの内訳)の取得。推移パネル・内訳シートと、
 * 推移タブの先読み(DeckMeta テンプレート)で共有する。
 *
 * 取得結果(取得中の Promise を含む)を CACHE_MS だけ控えておく。
 * - タブに触れた時点で先読みを始め、押して開いたときには届いている(または途中)ようにする
 * - 一度見た期間・系列へ戻ったときは取り直さずに即座に出す
 * BFF 側も上流の集計を Data Cache に載せている(5分〜1時間)ので、ここで控える5分は
 * 画面の数字の鮮度をそれ以上に落とさない。
 */
const CACHE_MS = 5 * 60 * 1000;

type CacheEntry<T> = {
  at: number;
  promise: Promise<T>;
  // 届いた結果。Promise の中身は同期的に覗けないため、描画をすぐ始められるよう別に持つ
  data?: T;
};

// URL ごとに控える取得。失敗した取得は控えから外し、次の呼び出しで取り直せるようにする
function createCachedLoader<T>(label: string) {
  const cache = new Map<string, CacheEntry<T>>();

  const freshEntry = (url: string) => {
    const hit = cache.get(url);
    return hit && Date.now() - hit.at < CACHE_MS ? hit : undefined;
  };

  return {
    load(url: string, fresh: boolean): Promise<T> {
      const hit = freshEntry(url);
      if (!fresh && hit) return hit.promise;

      const promise = fetch(url, { cache: "no-store" }).then(async (res) => {
        if (!res.ok) throw new Error(`${label}: ${res.status}`);
        return (await res.json()) as T;
      });

      const entry: CacheEntry<T> = { at: Date.now(), promise };
      cache.set(url, entry);
      promise.then(
        (data) => {
          entry.data = data;
        },
        () => {
          // 後から取り直した控えまで消さないよう、自分が入れた控えのときだけ外す
          if (cache.get(url) === entry) cache.delete(url);
        },
      );
      return promise;
    },
    peek(url: string): T | undefined {
      return freshEntry(url)?.data;
    },
  };
}

const trendLoader = createCachedLoader<WeeklyDeckUsageTrendType>("weekly_usage_trend");
const membersLoader = createCachedLoader<WeeklyDeckUsageTrendMembersType>(
  "weekly_usage_trend/members",
);

const trendUrl = (range: DeckUsageTrendRange) =>
  `/api/deck_meta/weekly_usage_trend?${new URLSearchParams({ from: range.from, to: range.to })}`;

const membersUrl = (range: DeckUsageTrendRange, fingerprint: string) =>
  `/api/deck_meta/weekly_usage_trend/members?${new URLSearchParams({
    from: range.from,
    to: range.to,
    fingerprint,
  })}`;

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
 */
export function loadWeeklyDeckUsageTrend(
  range: DeckUsageTrendRange,
  { fresh = false }: { fresh?: boolean } = {},
): Promise<WeeklyDeckUsageTrendType> {
  return trendLoader.load(trendUrl(range), fresh);
}

// 届いている結果があれば同期的に返す(先読み済みなら読み込み中の表示を挟まずに描くため)
export function peekWeeklyDeckUsageTrend(
  range: DeckUsageTrendRange,
): WeeklyDeckUsageTrendType | undefined {
  return trendLoader.peek(trendUrl(range));
}

// 推移タブに触れたときの先読み。結果は控えに入るだけで、失敗しても何もしない
// (開いたときにパネルが取り直してエラーを出す)
export function prefetchWeeklyDeckUsageTrend(range: DeckUsageTrendRange): void {
  loadWeeklyDeckUsageTrend(range).catch(() => {});
}

// 推移グラフで選んだ1系列の、週ごとの組み合わせの内訳を取得する(控えの扱いは推移と同じ)
export function loadWeeklyDeckUsageTrendMembers(
  range: DeckUsageTrendRange,
  fingerprint: string,
  { fresh = false }: { fresh?: boolean } = {},
): Promise<WeeklyDeckUsageTrendMembersType> {
  return membersLoader.load(membersUrl(range, fingerprint), fresh);
}

export function peekWeeklyDeckUsageTrendMembers(
  range: DeckUsageTrendRange,
  fingerprint: string,
): WeeklyDeckUsageTrendMembersType | undefined {
  return membersLoader.peek(membersUrl(range, fingerprint));
}

// 線やポケモンを選んだ時点での先読み(内訳ボタンを押したときには届いているように)
export function prefetchWeeklyDeckUsageTrendMembers(
  range: DeckUsageTrendRange,
  fingerprint: string,
): void {
  loadWeeklyDeckUsageTrendMembers(range, fingerprint).catch(() => {});
}
