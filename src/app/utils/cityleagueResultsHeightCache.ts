"use client";

import { useCallback, useSyncExternalStore } from "react";

// 「入賞したシティリーグ」(PlayerCityleagueResults)の高さキャッシュ。
//
// この節の高さは入賞の件数と中身で決まり、実測で 0件=120px / 2件=459px と3倍以上変わる。
// 取得するまで件数が分からないので、固定の骨格ではどちらかに必ずズレる。
// 前回そのシーズンで描画できた高さを覚えておき、次回はその高さを確保する。
// 初回(キャッシュなし)は従来どおりの既定値を使う。
//
// あくまで場所取りの予想値で、表示内容の判断には使わない。ズレても取得後に正しい高さへ
// 落ち着くだけなので、古い値が残っていても壊れない。
const KEY = "cityleague_results_height_v1";
// 覚えておくシーズン数。シーズンは年に1つ増える程度なので、これで十分足りる
const MAX_ENTRIES = 8;
// キャッシュが無いときの高さ(従来の h-52)
export const DEFAULT_CITYLEAGUE_RESULTS_HEIGHT = 208;
// 場所取りの上限。Swiper は1枚ずつ表示(slidesPerView=1)なので、入賞が何件あっても
// 実際の高さはカード1枚ぶん(実測で最大500px程度)にしかならない。壊れた値が入っていても
// 画面が巨大な空白で埋まらないように頭を抑える。
const MAX_CITYLEAGUE_RESULTS_HEIGHT = 1200;

type HeightMap = Record<string, number>;

function readMap(): HeightMap {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    return parsed && typeof parsed === "object" ? (parsed as HeightMap) : {};
  } catch {
    return {};
  }
}

export function loadCityleagueResultsHeight(season: string): number {
  const height = readMap()[season];
  if (typeof height !== "number" || !(height > 0)) {
    return DEFAULT_CITYLEAGUE_RESULTS_HEIGHT;
  }

  return Math.min(height, MAX_CITYLEAGUE_RESULTS_HEIGHT);
}

export function saveCityleagueResultsHeight(season: string, height: number): void {
  if (!(height > 0)) return;

  try {
    const map = readMap();
    if (map[season] === height) return;

    map[season] = height;

    // 古いシーズンから落として上限に収める(キーはシーズン識別子で昇順=古い順)
    const seasons = Object.keys(map).sort();
    for (const old of seasons.slice(0, Math.max(0, seasons.length - MAX_ENTRIES))) {
      delete map[old];
    }

    localStorage.setItem(KEY, JSON.stringify(map));
  } catch {
    // 保存できなければ次回も既定値で場所取りするだけ
  }
}

// 読むだけで購読はしない理由は playerLinkCache と同じ。
const NO_SUBSCRIBE = () => () => {};

export function useCityleagueResultsHeight(season: string): number {
  const getSnapshot = useCallback(() => loadCityleagueResultsHeight(season), [season]);

  return useSyncExternalStore(
    NO_SUBSCRIBE,
    getSnapshot,
    () => DEFAULT_CITYLEAGUE_RESULTS_HEIGHT,
  );
}
