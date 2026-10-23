import { mutate } from "swr";

import { KizunaDeckType, KizunaType } from "@app/types/kizuna";

/*
 * きずなLv.をブラウザ側で取る・取り直させるための部品。
 * フック(useKizunaDecksState)と、きずなを動かす書き込み(記録・対戦・デッキ・バージョン)の
 * 両方から使う。
 */

// これ以上待つと一覧が出ない。デッキ一覧はきずなが揃うまでカードを出さないので、
// 上流が固まったときに一覧まで道連れにしないための上限(本番の応答は p90 でも 0.06 秒)
const TIMEOUT_MS = 8000;

// useKizunaDecksState が SWR に使うキー
export function kizunaSwrKey(userId: string): string {
  return `/api/users/${userId}/kizuna`;
}

const KIZUNA_KEY_PATTERN = /^\/api\/users\/[^/]+\/kizuna$/;

// デッキごとのきずな。失敗(タイムアウト・通信断・HTTPエラー)は投げる
export async function fetchKizunaDecks(url: string): Promise<KizunaDeckType[]> {
  const res = await fetch(url, {
    cache: "no-store",
    method: "GET",
    headers: {
      Accept: "application/json",
    },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });

  if (!res.ok) throw new Error(`HTTP error: ${res.status}`);

  const kizuna: KizunaType = await res.json();

  return Array.isArray(kizuna?.decks) ? kizuna.decks : [];
}

/*
 * きずなLv.を今の値に取り直させる。きずなを動かす書き込みが成功したあとに呼ぶ。
 *
 * きずなは記録(使用デッキ・開催日・イベント)・対戦(勝敗・メモ)・デッキ・バージョンから
 * 算出される(core-apiserver の infrastructure/kizuna.go)。呼ばないと、
 *   - 表示中のもの(デッキ詳細のパネル、デッキ一覧から開いたモーダルなど)は
 *     画面を開き直すまで古いまま
 *   - 表示していないもの(記録の画面にいる間のデッキ一覧など)は、次に開いたときに
 *     古い値が一瞬出てから新しい値へ跳ねる
 * になる。
 *
 * 表示しているかどうかに関わらず、手元にあるきずなのキャッシュをすべて取り直して差し替える。
 * 書き込みのあと画面を移るまでには間があるので、次に開いたときには新しい値が出る。
 * 失敗したときは古い値を残す(空にすると、きずなの演出がまとめて消える)。
 * 待たずに投げっぱなしにする(失敗しても次に開いたときのマウント時の取り直しで追いつく)。
 *
 * デッキの登録では呼ばない。新しいデッキのきずなは他のデッキに影響せず、新しいデッキを出す
 * 画面(デッキ一覧の作り直しなど)はマウント時に自分で取り直す。ここで呼ぶとかえって害がある:
 * SWR は mutate の途中に始まった取り直しの結果を捨て、その時点で isValidating を下ろすため、
 * 作り直したデッキ一覧が「新しいデッキのきずなが揃った」と誤認して、きずなの行が無いカードを先に出す。
 */
export function refreshKizuna(): void {
  // キャッシュにあるきずなのキーを集める。キーを渡す形の mutate でないと
  // 「表示していないキャッシュの差し替え」ができないため、ここでは選ぶだけにする(false を返す)
  // (いまの SWR はフィルタを同期で呼ぶが、それに頼らず集め終わってから取り直す)
  const keys: string[] = [];
  void mutate((key) => {
    if (typeof key === "string" && KIZUNA_KEY_PATTERN.test(key)) keys.push(key);
    return false;
  }).then(() => {
    for (const key of keys) {
      mutate(key, fetchKizunaDecks(key), { revalidate: false }).catch(() => {});
    }
  });
}
