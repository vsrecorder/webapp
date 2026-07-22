"use client";

import { Card, CardBody, CardHeader } from "@heroui/react";

import { kizunaMetricLabel, kizunaTierOf } from "@app/utils/kizuna";
import { KizunaDeckType } from "@app/types/kizuna";

/*
 * デッキ詳細ページの「きずな」。
 *
 * 一覧カードではきずなLv.と段階名までしか出せないが、このページは1デッキに
 * 紙面を割けるため、何がその数値を作ったのか（6指標の内訳）まで見せる。
 *
 * 勝率は「そのデッキが強かったか」を、きずなは「どう歩んできたか」を語る。
 * このページでは対戦成績カードと並ぶ位置に置き、両方が対等に読めるようにする。
 */

const KIZUNA_MAX_LEVEL = 255;

type Props = {
  kizuna: KizunaDeckType;
};

export default function DeckKizunaPanel({ kizuna }: Props) {
  const tier = kizunaTierOf(kizuna.level);
  const ratio = Math.min(1, Math.max(0, kizuna.level / KIZUNA_MAX_LEVEL));

  return (
    <Card className="w-full">
      <CardHeader className="flex items-baseline justify-between gap-2 px-3 pt-3 pb-1">
        <span className="font-bold text-medium">きずな</span>
        <span className="text-tiny text-default-400">勝率では測れない歩み</span>
      </CardHeader>

      <CardBody className="flex flex-col gap-3 px-3 pt-1 pb-3">
        {/* 数値と段階名。灯の色（amber）で、一覧カードや結果カードと揃える */}
        <div className="flex items-end justify-between gap-3">
          <div className="flex items-baseline gap-2">
            <span className="font-black text-4xl leading-none tabular-nums text-amber-500 dark:text-amber-400">
              {kizuna.level}
            </span>
            <span className="text-tiny text-default-400">/ {KIZUNA_MAX_LEVEL}</span>
          </div>
          <div className="flex flex-col items-end gap-0.5 text-right">
            <span className="font-bold text-medium">{tier.name}</span>
            <span className="text-tiny text-default-500">{tier.message}</span>
          </div>
        </div>

        <div
          className="h-1.5 w-full overflow-hidden rounded-full bg-default-200"
          role="meter"
          aria-valuenow={kizuna.level}
          aria-valuemin={0}
          aria-valuemax={KIZUNA_MAX_LEVEL}
          aria-label="きずなLv."
        >
          <div
            className="h-full rounded-full bg-linear-to-r from-rose-500 to-amber-400"
            style={{ width: `${ratio * 100}%` }}
          />
        </div>

        {/* 内訳。6指標の獲得点を足すと、そのままきずなLv.になる。
            満点は出さない（％と点が並ぶと、意味の違う数字が2つ並んで読めなくなる）。 */}
        <div className="flex flex-col gap-1.5 pt-1">
          {kizuna.metrics.map((metric) => (
            <div key={metric.key} className="flex items-center gap-2">
              <span className="w-28 shrink-0 truncate text-tiny text-default-500">
                {kizunaMetricLabel(metric.key)}
              </span>
              <div className="h-1 min-w-0 flex-1 overflow-hidden rounded-full bg-default-200">
                <div
                  className="h-full rounded-full bg-amber-400"
                  style={{
                    width: `${Math.min(1, Math.max(0, metric.value)) * 100}%`,
                  }}
                />
              </div>
              <span className="w-7 shrink-0 text-right text-tiny font-bold tabular-nums text-default-600">
                {metric.points}
              </span>
            </div>
          ))}
        </div>

        {/* 算出方法は暫定であり、同じ記録でも数値が変わりうる（KIZUNA_PLAN.md §4）。
            数値を出す画面には必ず明記する。 */}
        <p className="text-[10px] leading-relaxed text-default-400">
          6指標の合計がきずなLv.です。勝率は含まれません。
          算出方法は開発中のため、今後変更される場合があります。
        </p>
      </CardBody>
    </Card>
  );
}
