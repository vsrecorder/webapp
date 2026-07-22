"use client";

import { kizunaTierOf } from "@app/utils/kizuna";

/*
 * デッキ一覧カードに出すきずなLv.の表示。
 *
 * 勝率は「そのデッキが強かったか」を、きずなは「どう歩んできたか」を語る。
 * 一覧では両者を必ず並べて、対比がその場で読めるようにする。
 * 見た目の対比も付けており、勝率は「円」、きずなは「線」で表す。
 *
 * level が null のとき（未取得・他人のデッキ）は何も出さない。
 * 読み込み中に骨組みだけ出すと、数値が入った瞬間に行が動いて落ち着かないため。
 */

const KIZUNA_MAX_LEVEL = 255;

function ratioOf(level: number): number {
  return Math.min(1, Math.max(0, level / KIZUNA_MAX_LEVEL));
}

// きずなLv.の数値。リスト形式で戦績（勝敗）と同じ行に並べる。
export function KizunaLevelInline({ level }: { level: number }) {
  return (
    <span className="flex shrink-0 items-baseline gap-1">
      <span className="text-[9px] text-default-400">きずなLv.</span>
      <span className="text-[11px] font-bold tabular-nums text-amber-500 dark:text-amber-400">
        {level}
      </span>
    </span>
  );
}

// きずなLv.の線（4px）と、その下の段階名。
export function KizunaLevelBar({
  level,
  showTierName = true,
}: {
  level: number;
  showTierName?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1">
      <div className="h-1 w-full overflow-hidden rounded-full bg-default-200">
        <div
          className="h-full rounded-full bg-linear-to-r from-rose-500 to-amber-400"
          style={{ width: `${ratioOf(level) * 100}%` }}
        />
      </div>
      {showTierName && (
        <span className="truncate text-[11px] font-bold text-default-600">
          {kizunaTierOf(level).name}
        </span>
      )}
    </div>
  );
}

/*
 * ギャラリー形式の二枚看板。カードの中心に「強かったか／どう歩んできたか」を並べる。
 * 勝率側は呼び出し元から渡す（色分けの閾値など、既存の表示をそのまま使いたいため）。
 *
 * ここに線（KizunaLevelBar）は置かない。ギャラリー形式では畳んだ状態でも見えるよう
 * ヘッダー側に既に線があり、アコーディオンを開くと同じ線が2本並んでしまうため。
 */
export function KizunaLevelBillboard({
  level,
  winRateNode,
  matchSummary,
}: {
  level: number;
  winRateNode: React.ReactNode;
  matchSummary: string;
}) {
  return (
    <div className="grid grid-cols-[1fr_1px_1fr] items-center gap-2">
      <div className="flex flex-col items-center gap-0.5">
        <span className="font-bold text-tiny text-default-400">勝率</span>
        {winRateNode}
        <span className="text-tiny tabular-nums text-default-500">{matchSummary}</span>
      </div>
      <div className="h-12 w-px bg-default-200" />
      <div className="flex flex-col items-center gap-0.5">
        <span className="font-bold text-tiny text-amber-500 dark:text-amber-400">
          きずなLv.
        </span>
        <span className="font-black text-3xl leading-none tabular-nums text-amber-500 dark:text-amber-400">
          {level}
        </span>
        <span className="text-tiny text-default-500">{kizunaTierOf(level).name}</span>
      </div>
    </div>
  );
}
