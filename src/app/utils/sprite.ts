// 0384_mega (メガレックウザ) は通常の70%サイズで表示する
export function spriteScaleClass(id: string | undefined | null): string {
  if (id === "0384_mega") return "scale-[1.05]";
  return "scale-150";
}

const SPRITE_BASE = "https://xx8nnpgt.user.webaccel.jp/images/pokemon-sprites";

// ポケモンスプライト画像のURLを返す。
// id が未指定/空の場合はデフォルト(unknown)のスプライトを返す。
export function spriteImageUrl(id: string | undefined | null): string {
  if (!id) return `${SPRITE_BASE}/unknown.png`;
  return `${SPRITE_BASE}/${id.replace(/^0+(?!$)/, "")}.png`;
}

