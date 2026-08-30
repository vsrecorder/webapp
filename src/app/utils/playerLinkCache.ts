"use client";

import { useSyncExternalStore } from "react";

// プレイヤーズクラブ連携の有無を端末に覚えておくキャッシュ。
//
// 連携済みかどうかで、
//   - 「プレイヤーズクラブとの連携」カードの本文がチップ1つぶん高くなる
//   - 「称号・ランク」カードに「入賞したシティリーグ」の節が増える
// ため、スケルトンの高さが変わる。連携状態は /api/usersplayers を叩かないと分からず、
// 取得を待ってから骨格を出すのでは骨格の意味が無いので、前回の結果を初回描画に使う。
//
// 判定そのものは毎回 API で取り直し、結果でここを上書きする(別アカウントでのログインや
// 連携直後にも追従させるため)。あくまで高さの予想に使うだけで、表示の可否には使わない。
const PLAYER_LINKED_KEY = "player_linked_v1";

export function loadPlayerLinkedCache(): boolean {
  try {
    return localStorage.getItem(PLAYER_LINKED_KEY) === "1";
  } catch {
    // ストレージが使えない環境では未連携として扱う(多数派の高さに寄せる)
    return false;
  }
}

export function savePlayerLinkedCache(linked: boolean): void {
  try {
    localStorage.setItem(PLAYER_LINKED_KEY, linked ? "1" : "0");
  } catch {
    // 保存できなければ次回も予想が外れるだけ
  }
}

// localStorage はこのセッション中に他所から書き換わらないので、購読はしない。
// useEffect + setState で読むとハイドレーション後に描画が1回増えるうえ、
// その1回のあいだ骨格が別の高さで出てしまうため、サーバ用スナップショットを
// 持てる useSyncExternalStore で読む。
const NO_SUBSCRIBE = () => () => {};

export function usePlayerLinkedHint(): boolean {
  return useSyncExternalStore(NO_SUBSCRIBE, loadPlayerLinkedCache, () => false);
}
