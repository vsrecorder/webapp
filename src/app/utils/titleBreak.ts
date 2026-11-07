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

/*
 * 空白を含むが、途中で改行すると名前として読みづらくなるもの。
 * 「30th / CELEBRATION」と割れないよう、表示するときだけ空白を NBSP に置き換える。
 *
 * cleanOfficialEventTitle には入れない。整形後のタイトルはアイコンの判定(半角空白で照合)や
 * カレンダー・投稿文にも使うので、NBSP が混ざると一致しなくなる。
 */
const UNBROKEN_NAMES = ["30th CELEBRATION"];

export function keepNamesUnbroken(title: string): string {
  return UNBROKEN_NAMES.reduce(
    (result, name) => result.replaceAll(name, name.replaceAll(" ", " ")),
    title,
  );
}
