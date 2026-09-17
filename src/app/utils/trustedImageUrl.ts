import { CDN_ORIGIN } from "@app/utils/cdn";

/*
 * サーバ側で取りに行ってよい画像 URL か。
 *
 * ユーザのアイコン(users.image_url)は本人が PUT /api/users/{id} で自由に設定でき、
 * OGP 画像の生成(utils/ogImage の fetchImageAsDataUri)が webapp サーバからその URL を
 * 取りに行く。取得先を絞らないと、内部ネットワークへ向けた URL や、そこへリダイレクトする
 * 外部 URL を仕込んで、サーバに任意の GET を撃たせられる(SSRF)。
 *
 * 正規の値は次の 3 系統しか無いので、ホストをこの集合に限定する。
 *   - CDN: 既定アイコン(auth.ts)、アップロード結果(api/users/[id]/images)、デッキ画像
 *   - Google / X: 認証プロバイダのアイコンをそのまま持っているユーザ
 *     (next.config.ts の images.remotePatterns と同じ集合)
 *
 * PUT /api/users/{id} の image_url もこの判定で受け入れを決める(保存する時点で絞れば、
 * 取りに行く側の判定が漏れても内部へは届かない)。
 */
const ALLOWED_HOSTS = new Set(
  [CDN_ORIGIN, process.env.SAKURA_OBJECTSTORAGE_CDN_URL]
    .flatMap((origin) => {
      try {
        return origin ? [new URL(origin).hostname] : [];
      } catch {
        return [];
      }
    })
    .concat(["lh3.googleusercontent.com", "pbs.twimg.com"]),
);

export function isTrustedImageUrl(value: unknown): value is string {
  if (typeof value !== "string" || value === "") return false;

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return false;
  }

  // https 以外(http・data・javascript 等)と、認証情報付きの URL は通さない
  if (url.protocol !== "https:" || url.username || url.password) return false;

  return ALLOWED_HOSTS.has(url.hostname.toLowerCase());
}
