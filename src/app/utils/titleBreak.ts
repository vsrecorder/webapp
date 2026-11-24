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

/*
 * 末尾の（）書きの前で行を分ける。半角・全角どちらの括弧でも、混ざっていても分ける。
 * 「トレカアライブ決勝大会（ポケモンカード）」→「トレカアライブ決勝大会」「（ポケモンカード）」。
 *
 * Tonamel・自由形式のイベント名では、（）はほぼ末尾の補足(部・形式・会場・対戦相手など)に使われ、
 * 先頭に付くものは無い(2026-11-24 に本番で確認: Tonamel 372 件中 63 件、自由形式 961 件中 19 件)。
 * 途中の（）は日付の曜日「10/11(日)15:00〜」やレアリティ「リーリエの決心(SR)争奪戦」で、
 * 分けると語が割れるので分けない。末尾でも中身が曜日だけのもの「Last Mycalinks杯 7/19(日)」は
 * 日付から切り離さない。
 *
 * （の直前の空白は区切りに吸収する(行末に空白を残さない)。（）の前に文字が無いときは分けない。
 */
const TRAILING_PAREN_NOTE = /^(.*?\S)\s*([（(][^（()）]*[）)])\s*$/;
const WEEKDAY_ONLY = /^[（(]\s*[月火水木金土日祝・]+\s*[）)]$/;

export function splitBeforeTrailingParen(line: string): string[] {
  const matched = TRAILING_PAREN_NOTE.exec(line);
  if (!matched || WEEKDAY_ONLY.test(matched[2])) return [line];

  return [matched[1], matched[2]];
}

// 末尾の（）書きだけの行か(splitBeforeTrailingParen で分けた後ろの行)
export function isParenNoteLine(line: string): boolean {
  return /^[（(][^（()）]*[）)]$/.test(line);
}

/*
 * イベント名を行に分ける。【】の注記の後ろ(splitAfterBracketLabels)と、
 * 末尾の（）書きの前(splitBeforeTrailingParen)で分ける。
 * （）書きはタイトルの末尾にしか付かないので、最後の行だけを見る。
 */
export function splitTitleLines(title: string): string[] {
  const lines = splitAfterBracketLabels(title);
  const last = lines.pop() ?? "";

  return [...lines, ...splitBeforeTrailingParen(last)];
}
