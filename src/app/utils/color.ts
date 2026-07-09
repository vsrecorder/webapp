// 16進カラーコードを白側に混色して明るく（薄く）した色を返す。
// amount は 0〜1 で、1に近いほど白に近づく。
export function lighten(hex: string, amount: number): string {
  const num = parseInt(hex.slice(1), 16);
  const r = (num >> 16) & 0xff;
  const g = (num >> 8) & 0xff;
  const b = num & 0xff;
  const mix = (c: number) => Math.round(c + (255 - c) * amount);
  return `#${[mix(r), mix(g), mix(b)].map((c) => c.toString(16).padStart(2, "0")).join("")}`;
}
