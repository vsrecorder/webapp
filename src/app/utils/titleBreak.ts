/*
 * 見出しの中の名前(環境名など)を、改行してよい所で区切る。
 *
 * 改行してよいのは「/」の後ろと空白。区切った各部分は、見出し側で改行しないまとまり
 * (whitespace-nowrap)にして、「サイバージャッ / ジ』」「コレクシ / ョン』」のように語の途中で
 * 切れるのを防ぐ。
 *   - 「/」は直前の部分の末尾に付ける(行末に「/」が残る形で改行する)
 *   - 空白は部分の外に文字列として置く(まとまりの内側に入れると、そこで改行できなくなる)
 */
export type TitleSegment = string | { text: string };

export function splitAtBreakPoints(title: string): TitleSegment[] {
  const segments: TitleSegment[] = [];
  let current = "";

  for (const token of title.split(/([/／ 　])/)) {
    if (token === "") continue;

    if (token === "/" || token === "／") {
      segments.push({ text: current + token });
      current = "";
    } else if (token === " " || token === "　") {
      if (current) segments.push({ text: current });
      current = "";
      segments.push(token);
    } else {
      current += token;
    }
  }

  if (current) segments.push({ text: current });

  return segments;
}
