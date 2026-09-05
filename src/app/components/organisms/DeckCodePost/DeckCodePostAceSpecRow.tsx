"use client";

import { Skeleton } from "@heroui/react";

import { useAceSpec } from "@app/hooks/useAceSpec";

type AceSpec = {
  card_id: string;
  card_name: string;
  image_url: string;
};

type Props = {
  // 投稿に保存された ACE SPEC(公開時にバックエンドが判定したもの)
  aceSpec: AceSpec;
  // 保存値が無い・足りないときに acespec API から取り直すためのデッキコード
  code: string;
  // false の間は取り直さない(投稿カードが画面に入ってから取る)
  enabled?: boolean;
  // 置く面の地色。バージョン履歴(bg-default-100)の上では content1 にする
  background?: "default-100" | "content1";
};

/*
 * デッキに入っている ACE SPEC を画像と名前で示す。入っていないデッキでは行ごと出さない。
 * カード名は省略せず全文を出す。表示専用で、押しても何も起きない(外部サイトへは飛ばない)。
 *
 * 表示は投稿に保存された値から組むので、一覧でカードごとに acespec API を呼ばない。
 * ただし保存値が無い投稿(公開時に deckcard-api が応答しなかった、画像URLを保存する前に
 * 公開された)は、画面に入ったときに acespec API から取り直す。保存に失敗しただけで
 * 「ACE SPEC なし」と決めつけると、実際には入っているデッキで行が出ないままになるため。
 */
export default function DeckCodePostAceSpecRow({
  aceSpec,
  code,
  enabled = true,
  background = "default-100",
}: Props) {
  // 保存値が揃っていない(ID が無い / 画像URLが無い)ときだけ取り直す
  const needsFetch = !aceSpec.card_id || !aceSpec.image_url;
  const { acespec: fetched, isLoading, error } = useAceSpec(code, enabled && needsFetch);
  const bg = background === "content1" ? "bg-content1" : "bg-default-100";

  const imageUrl = aceSpec.image_url || fetched?.image_url || "";
  const cardName = aceSpec.card_name || fetched?.card_name || "";

  if (!imageUrl) {
    // 取り直した結果 ACE SPEC が入っていない(fetched が null)・取れなかったときは出さない。
    // 取り直し中だけ行の高さを確保して、表示後に下の要素が動かないようにする
    if (!needsFetch || error || fetched === null) return null;
    if (!isLoading) return null;
    return <Skeleton className={`h-11 rounded-lg ${bg}`} />;
  }

  // 表示だけの行。タップしても何も起きない(外部リンクにも飛ばない)
  return (
    <div className={`flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 ${bg}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={imageUrl} alt={cardName} className="h-8 w-auto rounded-[3px] shrink-0" loading="lazy" />
      <span className="shrink-0 rounded bg-pink-100 px-1.5 text-[0.5625rem] font-black tracking-wider text-pink-700 dark:bg-pink-950 dark:text-pink-300">
        ACE SPEC
      </span>
      <span className="text-xs font-bold leading-snug">{cardName}</span>
    </div>
  );
}
