import { CDN_ORIGIN } from "@app/utils/cdn";

const SPRITE_BASE = `${CDN_ORIGIN}/images/pokemon-sprites`;

// ポケモンスプライト画像のURLを返す。
// id が未指定/空の場合はデフォルト(unknown)のスプライトを返す。
export function spriteImageUrl(id: string | undefined | null): string {
  if (!id) return `${SPRITE_BASE}/unknown.png`;
  return `${SPRITE_BASE}/${id.replace(/^0+(?!$)/, "")}.png`;
}

