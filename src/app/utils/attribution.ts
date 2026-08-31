// 流入元計測(施策0-4)のクライアント側ユーティリティ。
// Cookie の発行はサーバ側(src/proxy.ts)が行い、ここは読むだけ。

// 流入元の Cookie 名。発行しているのは src/proxy.ts。
export const ATTRIBUTION_COOKIE_NAME = "vsr_attr";

// vsr_attr Cookie の生の値(encodeURIComponent 済みの JSON 文字列)を返す。
// そのまま signIn() に載せ、サーバ側(auth.ts)でデコードして送る。
// Cookie が無ければ空文字を返し、計測なしで進む。
//
// この Cookie は httpOnly ではないため、クライアントから読める前提で設計されている
// (Safari ITP 対策でサーバー発行にしているだけで、秘匿情報は入っていない)。
export const readAttributionCookie = (): string => {
  const entry = document.cookie
    .split("; ")
    .find((cookie) => cookie.startsWith(`${ATTRIBUTION_COOKIE_NAME}=`));

  return entry?.slice(ATTRIBUTION_COOKIE_NAME.length + 1) ?? "";
};

// Cookie に入っている utm_* を URL のクエリパラメータとして復元する。
//
// アプリ内ブラウザから外部ブラウザへ渡る際、Cookie は引き継がれない(施策0-4 §3.7 の
// 「Cookie断絶」)。着地直後ならURLに utm_* が残っているが、サイト内を遷移した後だと
// URLからも消えている。そこで Cookie に保存済みの utm_* をURLへ再付与して渡し、
// 外部ブラウザ側の proxy に Cookie を発行し直させる。
//
// source が無い Cookie(リファラだけ判明している着地)からは何も復元しない。
// リファラ推定はサーバが registration 時に行うもので、ここで utm_source に昇格させると
// 「確定値」として扱われてしまい、判明率を過大評価するため。
export const attributionUtmParams = (): Record<string, string> | null => {
  const raw = readAttributionCookie();
  if (!raw) return null;

  try {
    const attr = JSON.parse(decodeURIComponent(raw)) as {
      source?: unknown;
      medium?: unknown;
      campaign?: unknown;
      content?: unknown;
    };
    if (typeof attr.source !== "string" || !attr.source) return null;

    const params: Record<string, string> = { utm_source: attr.source };
    if (typeof attr.medium === "string" && attr.medium) params.utm_medium = attr.medium;
    if (typeof attr.campaign === "string" && attr.campaign) params.utm_campaign = attr.campaign;
    if (typeof attr.content === "string" && attr.content) params.utm_content = attr.content;

    return params;
  } catch {
    // 壊れた Cookie は「無いもの」として扱う(読めないだけで、消しはしない)
    return null;
  }
};
