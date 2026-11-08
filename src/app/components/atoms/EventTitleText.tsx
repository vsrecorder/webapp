import { Fragment } from "react";

import { keepNamesUnbroken, splitAfterBracketLabels } from "@app/utils/titleBreak";

/*
 * 複数行で見せるイベント名の中身。
 * 【】で囲まれた注記の後ろで改行し(splitAfterBracketLabels)、
 * 「30th CELEBRATION」のような名前は途中で割らない(keepNamesUnbroken)。
 *
 * 外側の要素(太字・折り返しの指定など)は呼び出し側が持つ。
 */
export default function EventTitleText({ title }: { title: string }) {
  return splitAfterBracketLabels(title).map((line, i) => (
    <Fragment key={i}>
      {i > 0 && <br />}
      {keepNamesUnbroken(line)}
    </Fragment>
  ));
}
