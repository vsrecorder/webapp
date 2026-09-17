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

/*
 * 上流(core-apiserver)のオリジン。
 *
 * 既定は公開ドメイン経由(https://VSRECORDER_DOMAIN → nginx → core-apiserver)。同じホストの中で
 * TLS と nginx を往復する形で、接続の張り直しが入ると 1 回あたり数十 ms かかる
 * (keep-alive は src/instrumentation.ts で延ばしている)。
 * VSRECORDER_UPSTREAM_ORIGIN を設定すると(例: 同じ docker network 上の http://core-apiserver:8940)、
 * TLS と nginx を通さず直接つなぐ。設定が無ければ従来どおり。
 */
export function upstreamOrigin(): string {
  return process.env.VSRECORDER_UPSTREAM_ORIGIN || `https://${process.env.VSRECORDER_DOMAIN}`;
}

// リクエスト側の不備(壊れた JSON のボディ、パスに使えない値)を表す例外。
// upstreamErrorResponse が 400 にする。上流の失敗(UpstreamError)と同じ catch で扱えるようにしてある。
export class BadRequestError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BadRequestError";
  }
}

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
//
// encodeURIComponent は "." を残すため、値がちょうど "." や ".." だとセグメントごと
// 正規化されて一つ上のパスへ飛ぶ(/users/../deck_code_posts → /deck_code_posts)。
// 本番は手前の nginx が %2E%2E を正規化して届かないが、ここでも拒否して 400 にする。
export function upstreamUrl(
  strings: TemplateStringsArray,
  ...values: (string | number | boolean | URLSearchParams | undefined | null)[]
): string {
  let url = upstreamOrigin();

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

    const text = String(value);
    if (text === "." || text === "..") {
      throw new BadRequestError("path parameter must not be a dot segment");
    }

    url += encodeURIComponent(text);
  });

  return url;
}

// 上流APIが失敗を返したことを表す例外。返すべきステータスとボディを持つ。
export class UpstreamError extends Error {
  readonly status: number;
  readonly body: unknown;
  // 上流の応答をJSONとして読めたか。読めなかったとき body は既定のエラーオブジェクトになる。
  //
  // 同じステータスでも、バックエンドが答えたのか手前のプロキシが答えたのかで意味が変わる
  // 場合に使う。nginx はデプロイ中の 502/504 を deploying.html の 503 に、手動メンテナンスを
  // maintenance.html の 503 に変えるため、上流の失敗がHTMLで返ることがある。
  readonly bodyIsJson: boolean;

  constructor(status: number, body: unknown, bodyIsJson: boolean = true) {
    super(`upstream responded with ${status}`);
    this.name = "UpstreamError";
    this.status = status;
    this.body = body;
    this.bodyIsJson = bodyIsJson;
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
    throw new UpstreamError(
      res.status,
      body ?? { error: "upstream request failed" },
      body !== undefined,
    );
  }

  // 200だがJSONとして読めない応答は、成功として扱うと呼び出し側が壊れるため失敗にする
  if (text && body === undefined) {
    throw new UpstreamError(502, { error: "upstream returned a non-JSON response" });
  }

  return (body ?? null) as T;
}

// ルートハンドラのcatchで使う。上流の失敗はそのステータスのまま返し、リクエスト側の不備は
// 400 で返す。それ以外の想定外のエラーはNext.jsに委ねる（500になる）。
export function upstreamErrorResponse(error: unknown): NextResponse {
  if (error instanceof UpstreamError) {
    return NextResponse.json(error.body, { status: error.status });
  }

  if (error instanceof BadRequestError) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  throw error;
}
