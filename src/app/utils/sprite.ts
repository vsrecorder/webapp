// 0384_mega (メガレックウザ) は通常の70%サイズで表示する
// 0718_mega (メガジガルデ) は表示開始位置を少し下げる
export function spriteScaleClass(id: string | undefined | null): string {
  if (id === "0384_mega") return "scale-[1.05]";
  if (id === "0718_mega") return "scale-150 translate-y-1";
  return "scale-150";
}

const SPRITE_BASE = "https://xx8nnpgt.user.webaccel.jp/images/pokemon-sprites";

// ポケモンスプライト画像のURLを返す。
// id が未指定/空の場合はデフォルト(unknown)のスプライトを返す。
export function spriteImageUrl(id: string | undefined | null): string {
  if (!id) return `${SPRITE_BASE}/unknown.png`;
  return `${SPRITE_BASE}/${id.replace(/^0+(?!$)/, "")}.png`;
}

