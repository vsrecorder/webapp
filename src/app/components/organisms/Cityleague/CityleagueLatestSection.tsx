import Link from "next/link";

import { LuChevronRight } from "react-icons/lu";

import CityleagueEventLinkList from "@app/components/organisms/Cityleague/CityleagueEventLinkList";

import { getLatestCityleagueEvents } from "@app/utils/cityleague";

// 一覧のタブ（CityleagueResults）は結果そのものをクライアント側で展開する作りで、
// 個別ページへのリンクを1本も持たない。そのため個別ページは開催月ハブ経由でしか
// 辿れず、トップから数えて深さ4に沈んでいた。
// ここに直近ぶんのリンクを置くことで、個別ページへの最も浅い入口を作る。
const LIMIT = 100;

export default async function CityleagueLatestSection() {
  // 一覧トップはタブ側のコンテンツで成立するため、ここの取得失敗でページ全体を
  // 落とさない（getJson は障害時に例外を投げる）。セクションを出さないに留める。
  const events = await getLatestCityleagueEvents(LIMIT).catch(() => []);

  if (events.length === 0) return null;

  return (
    <section className="mx-auto flex w-full max-w-2xl flex-col gap-3 px-3 pt-10 pb-6">
      <div className="flex flex-col gap-1">
        <span className="font-bold text-tiny text-primary">LATEST</span>
        <h2 className="font-black text-large leading-snug text-default-800">
          最近開催されたシティリーグ
        </h2>
        <p className="text-tiny text-default-500">
          店舗ごとの結果ページで、入賞者のデッキコードをまとめて確認できます。
        </p>
      </div>

      <CityleagueEventLinkList events={events} />

      <Link
        href="/cityleague_results/months"
        className="flex w-fit items-center gap-0.5 pl-0.5 font-bold text-tiny text-default-500 hover:text-default-700"
      >
        <span>開催月から過去の結果を探す</span>
        <LuChevronRight />
      </Link>
    </section>
  );
}
