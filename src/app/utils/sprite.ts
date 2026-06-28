// 0384_mega (メガレックウザ) は通常の70%サイズで表示する
export function spriteScaleClass(id: string | undefined | null): string {
  if (id === "0384_mega") return "scale-[1.05]";
  return "scale-150";
}
