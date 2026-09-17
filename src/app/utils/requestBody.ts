import { BadRequestError } from "@app/utils/upstream";

/*
 * リクエストの JSON ボディを読む。
 *
 * request.json() は壊れた JSON で SyntaxError を投げ、ルートハンドラの catch は
 * upstreamErrorResponse がそれを再スローするため 500 になっていた。情報は漏れないが、
 * ログイン済みの誰でも 5xx のアラートとログを量産できる。ここでは BadRequestError に
 * 変換して、同じ catch が 400 を返せるようにする。
 *
 * 各ルートはボディをそのまま JSON.stringify して上流へ渡す作りなので、オブジェクト以外
 * (null・数値・文字列)もここで弾く。項目ごとの検証は上流(core-apiserver)が行う。
 */
export async function readJsonBody<T>(request: Request): Promise<T> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    throw new BadRequestError("request body is not valid JSON");
  }

  if (body === null || typeof body !== "object") {
    throw new BadRequestError("request body must be a JSON object");
  }

  return body as T;
}
