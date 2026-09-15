import { createHash } from "node:crypto";

import { DeckCodePostType } from "@app/types/deck_code_post";
import { renderDeckCodePostOgImage } from "@app/utils/ogImage";
import { ensureOgImage, ogImageUrlFor } from "@app/utils/ogStorage";

// みんなの公開デッキの OGP 画像。個別ページの generateMetadata と、公開直後(POST の応答後)の
// 先回り生成の両方から同じキーで呼び、最初に個別ページを開いた人(多くは X のカード取得)が
// 画像の生成を待たされないようにする。

// この画像のレイアウトの版。描き方(配置・大きさ)を変えたらこの値を上げると、
// 別のキー(別の画像)として作り直される。
//
// ogStorage の OG_IMAGE_VERSION は全ページのOGP画像で共通なので、そちらを上げると
// シティリーグ結果など無関係な画像まで作り直しになる。ここだけの変更はこの版で扱う。
const OG_LAYOUT_VERSION = "6";

// 画像に描く内容の指紋。画像は CDN に不変として置くため、デッキ名・スプライト・投稿者の
// 表示名やアイコン・称号、そしてレイアウトの版が変わったら別のキー(別の画像)にする。
function ogImageFingerprint(post: DeckCodePostType): string {
  const source = [
    OG_LAYOUT_VERSION,
    post.deck_name,
    post.pokemon_sprites.map((sprite) => `${sprite.position}:${sprite.id}`).join(","),
    post.user.name,
    post.user.image_url,
    String(post.user.designation_tier),
    post.ace_spec_card_name,
  ].join("\n");

  return createHash("sha1").update(source).digest("hex").slice(0, 10);
}

// 投稿ID(公開し直しは別の投稿)と表示内容の指紋をキーにする
export function deckCodePostOgImageKey(post: DeckCodePostType): string {
  return `deck_code_posts/${post.id}-${ogImageFingerprint(post)}`;
}

// 個別ページの generateMetadata 用。CDN の URL を返し、画像がまだ無ければ裏で用意させる
// (配信元が未設定なら null)。描画を止めないので、待つのは下の先回り生成のほうに任せる。
export function deckCodePostOgImageUrl(post: DeckCodePostType): string | null {
  return ogImageUrlFor(deckCodePostOgImageKey(post), () =>
    renderDeckCodePostOgImage(post),
  );
}

// 公開直後(POST の応答後)の先回り生成用。応答を返したあとに走るので、ここでは待ってよい。
export function ensureDeckCodePostOgImage(post: DeckCodePostType): Promise<void> {
  return ensureOgImage(deckCodePostOgImageKey(post), () => renderDeckCodePostOgImage(post));
}
