import Link from "next/link";

import { LuCalendar, LuLayers, LuTrophy } from "react-icons/lu";

// 一覧のタブは直近シーズンしか遡れないため、過去の結果へ辿り着く導線をここに置く。
// サーバコンポーネントのままにすることで、リンクがHTMLに載りクローラからも辿れる。
const AXES = [
  { href: "/cityleague_results/seasons", icon: LuTrophy, label: "シーズン" },
  { href: "/cityleague_results/environments", icon: LuLayers, label: "環境" },
  { href: "/cityleague_results/months", icon: LuCalendar, label: "開催月" },
];

export default function CityleagueBrowseSection() {
  return (
    /*
      スクロールしても常に手が届くよう sticky にする。
      top はリーグ種別タブ（fixed）の下端に合わせる。実測でタブ下端は
      モバイル 100px / lg 152px なので top-25（100px）・lg:top-38（152px）を指定する。
      z はタブとヘッダー（z-50）より下に置き、潜り込ませる。
      Header と同様、iOS の standalone PWA 対策でぼかし背景は別レイヤーに分離する。
    */
    <div className="sticky top-25 z-40 -mx-2 lg:top-38">
      <div className="absolute inset-0 border-b border-default-200/60 bg-white/90 backdrop-blur-md dark:bg-neutral-950/90" />

      {/* justify-center-safe: 横幅が足りず溢れたときは左寄せに戻り、先頭が見切れないようにする */}
      <nav
        aria-label="過去のシティリーグ結果を探す"
        className="relative flex items-center justify-center-safe gap-2 overflow-x-auto px-2.5 py-2"
      >
        <span className="shrink-0 font-bold text-tiny text-default-400">
          過去の結果を探す
        </span>

        {AXES.map((axis) => (
          <Link
            key={axis.href}
            href={axis.href}
            className="flex shrink-0 items-center gap-1 rounded-full border border-default-200 bg-content1 px-2.5 py-1 font-bold text-tiny text-default-600 hover:bg-default-100"
          >
            <axis.icon className="h-3 w-3 text-primary" />
            <span>{axis.label}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
}
