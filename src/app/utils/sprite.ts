const SPRITE_BASE = "https://xx8nnpgt.user.webaccel.jp/images/pokemon-sprites";

// ポケモンスプライト画像のURLを返す。
// id が未指定/空の場合はデフォルト(unknown)のスプライトを返す。
export function spriteImageUrl(id: string | undefined | null): string {
  if (!id) return `${SPRITE_BASE}/unknown.png`;
  return `${SPRITE_BASE}/${id.replace(/^0+(?!$)/, "")}.png`;
}

