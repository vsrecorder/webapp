import { NextResponse } from "next/server";

/*
 * BFF（src/app/api配下のルートハンドラ）から上流APIを叩くための共通処理。
 *
 * 上流が失敗（4xx/5xx）を返したときに、そのボディをstatus 200のまま返してしまうと、
 * ブラウザ側の `if (!res.ok)` が素通りし、カードの配列などが入っていないJSONを
 * 成功データとしてレンダリングしてしまう。`?? []` や `?.map()` はnull/undefinedしか
 * 守らず、エラーボディ（オブジェクト）はtruthyのまま通り抜けるため、
 * `xxx.map is not a function` がレンダー中に投げられ、その表示部分だけでなく
 * ページ全体がエラー画面（app/error.tsx）に落ちる。
 *
 * それを防ぐため、上流の失敗は必ず「失敗」として、上流のステータスのまま返す。
 * ルートハンドラは次の形に揃えること。
 *
 *   try {
 *     const data = await fetchUpstream<Type>(url, { headers: ... });
 *     return NextResponse.json(data, { status: 200 });
 *   } catch (error) {
 *     return upstreamErrorResponse(error);
 *   }
 */

// 上流APIのURLを組み立てるタグ付きテンプレート。埋め込んだ値は自動でencodeURIComponentされる。
//
//   upstreamUrl`/api/v1beta/records/${id}`
//   upstreamUrl`/api/v1beta/users/${id}/matches?${params}`   // URLSearchParamsはエンコード済みなのでそのまま展開
//
// 上流のURLを素のテンプレートリテラルで組み立ててはならない。
// Next.jsはパスパラメータをデコードして渡すため（%2F→"/"、%2E→"."）、
// `..` を含む値を送られるとURLパーサがパスを正規化し、意図した以外の上流エンドポイントへ
// リクエストを飛ばせてしまう。
// 例: /api/deckcards/..%2F..%2Fusers%2Fxxx/list → https://<domain>/api/users/xxx/list
// ルートハンドラ側の所有者チェック（session.user.id !== id で403）も、この経路では迂回される。
export function upstreamUrl(
  strings: TemplateStringsArray,
  ...values: (string | number | boolean | URLSearchParams | undefined | null)[]
): string {
  let url = `https://${process.env.VSRECORDER_DOMAIN}`;

  strings.forEach((str, index) => {
    url += str;

    const value = values[index];
    if (value === undefined || value === null) {
      return;
    }

    if (value instanceof URLSearchParams) {
      const query = value.toString();
      // 条件付きのクエリが1つも付かなかった場合に、末尾の "?" だけが残らないようにする
      if (!query && url.endsWith("?")) {
        url = url.slice(0, -1);
      }
      url += query;
      return;
    }

    url += encodeURIComponent(String(value));
  });

  return url;
}

// 上流APIが失敗を返したことを表す例外。返すべきステータスとボディを持つ。
export class UpstreamError extends Error {
  readonly status: number;
  readonly body: unknown;

  constructor(status: number, body: unknown) {
    super(`upstream responded with ${status}`);
    this.name = "UpstreamError";
    this.status = status;
    this.body = body;
  }
}

// JSONとして読めなければundefinedを返す（上流がHTMLのエラーページを返す場合がある）
function parseJson(text: string): unknown | undefined {
  if (!text) {
    return undefined;
  }

  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

// 上流APIを叩いてJSONを返す。上流が失敗したらUpstreamErrorを投げる。
// 204や空ボディの場合はnullを返す。
export async function fetchUpstream<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    cache: "no-store",
    ...init,
  });

  const text = await res.text();
  const body = parseJson(text);

  if (!res.ok) {
    throw new UpstreamError(res.status, body ?? { error: "upstream request failed" });
  }

  // 200だがJSONとして読めない応答は、成功として扱うと呼び出し側が壊れるため失敗にする
  if (text && body === undefined) {
    throw new UpstreamError(502, { error: "upstream returned a non-JSON response" });
  }

  return (body ?? null) as T;
}

// ルートハンドラのcatchで使う。上流の失敗はそのステータスのまま返し、
// それ以外の想定外のエラーはNext.jsに委ねる（500になる）。
export function upstreamErrorResponse(error: unknown): NextResponse {
  if (error instanceof UpstreamError) {
    return NextResponse.json(error.body, { status: error.status });
  }

  throw error;
}
