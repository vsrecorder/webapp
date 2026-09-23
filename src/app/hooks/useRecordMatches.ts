"use client";

import { Dispatch, SetStateAction, useCallback, useEffect, useState } from "react";

import { fetchMatchesByRecordId } from "@app/utils/matchStats";

import { MatchGetResponseType } from "@app/types/match";

export type RecordMatches = {
  // 対戦一覧。取得中・取得に失敗した間は null(「0件」を表す空配列とは別物)
  matches: MatchGetResponseType[] | null;
  // 対戦の追加・更新・削除・並び替えを反映する
  setMatches: Dispatch<SetStateAction<MatchGetResponseType[] | null>>;
  // 読み込み中(骨格を出す)。取り直し中はここを立てない
  loading: boolean;
  // 取得に失敗した(エラーカードを出す)
  failed: boolean;
  // 失敗したあとの取り直し中(エラーカードは出したままボタンだけ回す)
  isRetrying: boolean;
  // 取り直し(FetchError の onRetry に渡す)
  retry: () => void;
};

/*
 * 記録詳細ページ・記録情報モーダルで共有する対戦一覧の取得。
 *
 * 取得に失敗したときに対戦一覧を空配列にしないことが要点。空にすると「対戦結果がありません」
 * と表示され、対戦を持つ記録に「まだ何も無い」と言うことになる(同じデータから集計する
 * 戦績パネルも 0勝0敗 になる)。matches は null のままにして失敗を failed で伝え、
 * 呼び出し側でエラーと0件を描き分ける。
 *
 * 記録が差し替わったときは、描画中に前の記録の一覧・失敗を捨てる。effect で捨てると
 * 前の記録の対戦結果が1フレーム見えてしまう。
 *
 * 汎用の useSeededResource は使わない。あちらは取得中の状態が「どの鍵のものか」を返さない
 * ため、記録を差し替えた直後の描画で前の記録の失敗を拾ってしまう。
 */
export function useRecordMatches(recordId: string): RecordMatches {
  const [matches, setMatches] = useState<MatchGetResponseType[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  // 何度目の取得か。retry で進めて effect を再実行させる
  const [attempt, setAttempt] = useState(0);

  // いま表示している記録。差し替わったら前の記録の結果を描画中に捨てる
  const [shownRecordId, setShownRecordId] = useState(recordId);
  if (shownRecordId !== recordId) {
    setShownRecordId(recordId);
    setMatches(null);
    setLoading(true);
    setFailed(false);
  }

  useEffect(() => {
    let ignore = false;

    fetchMatchesByRecordId(recordId)
      .then((data) => {
        if (ignore) return;
        setMatches(data);
        setFailed(false);
      })
      .catch((err) => {
        console.error(err);
        // 失敗を空配列で埋めない。0件として描かせないために null のままにする
        if (!ignore) setFailed(true);
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, [recordId, attempt]);

  const retry = useCallback(() => {
    setLoading(true);
    setAttempt((n) => n + 1);
  }, []);

  return {
    matches,
    setMatches,
    // 失敗しているあいだは骨格を出さない。取り直しでも骨格へ戻さず、
    // エラーカードのボタンだけを回す(エラー → 骨格 → エラーと往復させない)
    loading: loading && !failed,
    failed,
    isRetrying: failed && loading,
    retry,
  };
}
