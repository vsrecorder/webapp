"use client";

import KizunaRadarChart from "@app/components/molecules/Kizuna/KizunaRadarChart";

import type { KizunaMetric } from "@app/utils/kizuna";

type Props = {
  deckName: string;
  score: number;
  tierName: string;
  metrics: KizunaMetric[];
};

/*
 * きずなレベルの内訳カード。
 * 結果カードと同じく、画面に表示するものとシェア画像として書き出すものを
 * 同じコンポーネントで描く（見えているものがそのまま画像になる）。
 *
 * 画像を含めないのは意図的。captureThemedPng は cloneNode で静的スナップショットを
 * 取るため、遅延読み込みされる画像は書き出しで欠けやすい（KizunaShareCard のコメント参照）。
 * 内訳はテキストとバーだけで構成し、書き出しの失敗要因をつくらない。
 */
export default function KizunaBreakdownCard({
  deckName,
  score,
  tierName,
  metrics,
}: Props) {
  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-amber-500/30 bg-linear-to-br from-indigo-950 via-slate-900 to-neutral-950 px-6 py-6 text-white">
      <div className="flex items-baseline justify-between gap-3">
        <div className="flex min-w-0 flex-col">
          <span className="text-[10px] font-bold tracking-[0.28em] text-white/50">
            きずなレベルの内訳
          </span>
          <span className="truncate text-base font-bold">{deckName}</span>
        </div>
        {/* 何の数値かを明示する。内訳だけを見た人に「255満点の何か」と読ませない */}
        <div className="flex shrink-0 flex-col items-end">
          <span className="text-[9px] font-bold tracking-[0.22em] text-white/45">
            きずなレベル
          </span>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-black tabular-nums text-amber-400">
              {score}
            </span>
            <span className="text-xs text-white/40">/ 255</span>
          </div>
        </div>
      </div>

      {/* 6指標の「かたち」を一目で掴ませる。正確な値は下の一覧で読ませる。 */}
      <KizunaRadarChart metrics={metrics} />

      <div className="flex flex-col gap-2.5">
        {metrics.map((metric) => (
          <div key={metric.key} className="flex items-baseline gap-2.5">
            {/* ラベル列は「逆境ロイヤルティ」(8文字)が折り返さない幅にする */}
            <span className="w-[5.75rem] shrink-0 whitespace-nowrap text-right text-[10px] font-bold text-white/85">
              {metric.label}
            </span>
            <span className="flex w-11 shrink-0 items-baseline justify-end gap-0.5">
              <span className="text-sm font-bold tabular-nums text-amber-400">
                {Math.round(metric.value * 100)}
              </span>
              <span className="text-[9px] text-white/30">/{metric.weight}%</span>
            </span>
            {/* 評価文は必ず1行。折り返すと6行の並びが崩れ、内訳が読みにくくなる */}
            <span className="min-w-0 flex-1 truncate text-[11px] text-white/55">
              {metric.detail}
            </span>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-1 border-t border-white/10 pt-3">
        <span className="text-xs font-bold text-white/80">「{tierName}」</span>
        <span className="text-[10px] leading-relaxed text-white/40">
          対戦記録・デッキの組み直し履歴・メモから算出（勝率は含みません）
        </span>
        {/* 内訳＝算出方法そのものを見せる画像なので、確定でないことをここで断る */}
        <span className="text-[10px] leading-relaxed text-white/30">
          算出方法は開発中です。指標や重み付けは今後変更される場合があります
        </span>
      </div>

      <span className="text-[10px] tracking-widest text-white/35">
        きずな試算 ｜ vsrecorder.mobi/kizuna
      </span>
    </div>
  );
}
