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
 * 表示するときだけ、名前の中の空白を NBSP に置き換える。
 *
 * - 「30th CELEBRATION」: 「30th / CELEBRATION」と割れないようにする
 * - 「〈区分〉リーグ 〈日程〉」: チャンピオンズリーグのイベント名の後半
 *   (例:「チャンピオンズリーグ2027 横浜 マスターリーグ 本戦」「… シニアリーグ 1日目大会」
 *   「… ジュニアリーグ 1日目大会or2日目大会どちらでも可」)。戦績カードの見出し(RecordHero)は
 *   空白ごとに行を分けるので、そのままだと「本戦」「1日目大会」だけが 1 行になる。
 *   日程の表記(予選・本戦・大会、何日目か)は大会ごとに変わり得るので、名前を列挙せず
 *   区分名の直後の空白と、それに続く語をまとめる
 *
 * cleanOfficialEventTitle には入れない。整形後のタイトルはアイコンの判定(半角空白で照合)や
 * カレンダー・投稿文にも使うので、NBSP が混ざると一致しなくなる。
 */
const UNBROKEN_NAMES: readonly RegExp[] = [
  /30th CELEBRATION/g,
  /(?:マスター|シニア|ジュニア|オープン)リーグ \S+/g,
];

export function keepNamesUnbroken(title: string): string {
  return UNBROKEN_NAMES.reduce(
    (result, name) => result.replace(name, (matched) => matched.replaceAll(" ", "\u00A0")),
    title,
  );
}

/*
 * イベント名を【】で囲まれた注記の後ろで行に分ける。
 * 「【10_11月開催】30th CELEBRATION」→「【10_11月開催】」「30th CELEBRATION」。
 *
 * 】の直後の空白は区切りに吸収する(行頭に空白を残さない)。
 * 】の後ろに文字が続かないとき(末尾の【】)は分けない。
 */
export function splitAfterBracketLabels(title: string): string[] {
  return title.replace(/(【[^【】]*】)\s*(?=\S)/g, "$1\n").split("\n");
}
