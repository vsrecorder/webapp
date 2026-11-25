/*
 * 失敗した応答(res.ok が false)から、トーストに出す1行を作る。
 *
 * これまでは各画面が `HTTP error: ${res.status} Message: ${(await res.json()).message}` と
 * 書いていた。message を持つのは core-apiserver が自分で返した失敗だけなので、それ以外は崩れていた。
 *
 *   BFF 自身の失敗(ログイン切れの 401、入力の不備の 400、アップデート中の 503 など)
 *     → 本文は { error: "..." }。message が無く「Message: undefined」と出ていた
 *   nginx が返す HTML(流量制限の 429、入れ替え中の 502/503/504)
 *     → res.json() が例外になり、「Unexpected token '<' ...」が出ていた
 *
 * ここでは message → error の順に探し、どちらも無ければ状態コードだけにする。
 * 利用者が自分で直せるもの(ログイン切れ・混雑・一時的な不通)は、何をすればよいかを先に添える。
 */

type ErrorBody = { message?: unknown; error?: unknown };

/** 本文から、サーバが添えた説明を取り出す。JSON でない・説明が無いなら null */
async function readDetail(res: Response): Promise<string | null> {
  let body: ErrorBody | null;
  try {
    body = (await res.json()) as ErrorBody | null;
  } catch {
    // HTML のエラーページや空の本文
    return null;
  }

  for (const value of [body?.message, body?.error]) {
    if (typeof value === "string" && value.trim() !== "") return value;
  }
  return null;
}

/** 状態コードから分かる、利用者にしてほしいこと。特に無ければ null */
function hintFor(status: number): string | null {
  if (status === 401) return "ログインし直してください";
  if (status === 429) return "アクセスが集中しています。少し待ってからもう一度お試しください";
  if (status === 502 || status === 503 || status === 504) {
    return "サーバーに繋がりませんでした。少し待ってからもう一度お試しください";
  }
  return null;
}

// 説明が日本語なら、それ自体が利用者向けの案内になっている(アップデート中の文言など)
function isJapanese(text: string): boolean {
  return /[ぁ-んァ-ヶ一-龠]/.test(text);
}

export async function httpErrorMessage(res: Response): Promise<string> {
  const detail = await readDetail(res);
  const technical =
    detail === null
      ? `HTTP error: ${res.status}`
      : `HTTP error: ${res.status} Message: ${detail}`;

  const hint = detail !== null && isJapanese(detail) ? null : hintFor(res.status);
  return hint === null ? technical : `${hint} (${technical})`;
}
