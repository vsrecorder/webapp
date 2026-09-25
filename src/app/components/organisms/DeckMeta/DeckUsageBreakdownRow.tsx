"use client";

import { useState, type KeyboardEvent } from "react";

import { Chip } from "@heroui/react";
import { LuChevronDown } from "react-icons/lu";

import DeckSprites from "@app/components/molecules/DeckSprites";

import { WeeklyDeckUsageItemType } from "@app/types/weekly_deck_usage_stat";

/*
 * 週次デッキ使用率の「内訳」の1行。ランキング(WeeklyDeckUsagePanel)の内訳アコーディオンと、
 * 使用率順位の推移で選んだ系列の内訳シート(WeeklyDeckUsageTrendMembersSheet)で共有する。
 */

// 勝率に応じた色分け（既存の統計表示と同じ閾値に合わせる）
export function winRateChipColor(
  rate: number,
): "success" | "default" | "warning" | "danger" {
  if (rate >= 0.55) return "success";
  if (rate >= 0.45) return "default";
  if (rate >= 0.4) return "warning";
  return "danger";
}

// 行に束ねられた内訳の1件（「その他」に集約された変種／1体目でまとめた行の組み合わせ）。
// rank は「その他」の内訳だけに渡す（畳まれる前の順位を引き継ぐ）。渡さない場合も
// 番号の枠は残し、どちらの内訳でもスプライトの位置が揃うようにする。
//
// 「1体目でまとめる」表示では、「その他」の内訳(1体目でまとめた変種)がさらに組み合わせの
// 内訳を持つ。その他へ落ちた行は1体目しか出ていないため、何と組んだデッキだったのかは
// ここを開かないと分からない。行そのものを押して開く形にしたのは、1段目のような専用の
// ボタン行を内訳の行ごとに足すと、行数が多い(実測で44行)ぶん縦に倍伸びるため。
export default function BreakdownRow({
  item,
  rank,
  usageRate,
  rateNote,
  nested = false,
}: {
  item: WeeklyDeckUsageItemType;
  rank?: number;
  // 表示中の算出基準に合わせた使用率と、その分母を示す注記
  usageRate: number;
  rateNote: string;
  // さらに内訳として開かれた行。番号の枠を出さず、インデントのぶんだけ幅を返す
  nested?: boolean;
}) {
  const members = item.members ?? [];
  const canExpand = members.length > 0;
  const [expanded, setExpanded] = useState(false);
  const toggle = () => setExpanded((v) => !v);

  const row = (
    <div
      className={`flex items-center gap-2 rounded-lg bg-default-50 px-2 py-1.5 ${
        canExpand ? "cursor-pointer hover:bg-default-100" : ""
      }`}
      {...(canExpand
        ? {
            role: "button",
            tabIndex: 0,
            "aria-expanded": expanded,
            onClick: toggle,
            onKeyDown: (e: KeyboardEvent<HTMLDivElement>) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                toggle();
              }
            },
          }
        : {})}
    >
      {/* 開閉の目印は番号の下に置く(親の行が順位の下に変動を出しているのと同じ形)。
          スプライトの横に足すと、その幅のぶん狭い画面で使用率と勝率が収まらなくなる */}
      {!nested && (
        <span className="flex w-6 shrink-0 flex-col items-center gap-0.5">
          <span className="text-[0.625rem] font-black tabular-nums text-default-400">
            {rank ?? ""}
          </span>
          {canExpand && (
            <LuChevronDown
              className={`h-3 w-3 text-default-400 transition-transform ${
                expanded ? "rotate-180" : ""
              }`}
            />
          )}
        </span>
      )}
      <DeckSprites sprites={item.pokemon_sprites} size={32} />
      <div className="ml-auto flex flex-col items-end shrink-0 leading-none">
        <span className="text-sm font-black tabular-nums text-default-600">
          {(usageRate * 100).toFixed(1)}
          <span className="text-[0.625rem] font-bold text-default-400">%</span>
        </span>
        <span className="text-[0.5625rem] text-default-400 tabular-nums mt-0.5">
          {item.count}件・{rateNote}
        </span>
      </div>
      <Chip
        size="sm"
        variant="flat"
        color={winRateChipColor(item.win_rate)}
        classNames={{
          base: "h-5 px-0.5 shrink-0",
          content: "text-[0.625rem] font-bold tabular-nums px-1.5",
        }}
      >
        勝率 {(item.win_rate * 100).toFixed(1)}%
      </Chip>
    </div>
  );

  if (!canExpand) return row;

  return (
    <div className="flex flex-col gap-1">
      {row}
      {/* 組み合わせ単位の内訳。使用率の基準は親の行から引き継ぐ
          (「その他」の内訳は常に全体件数が分母) */}
      {expanded && (
        <div className="ml-4 flex flex-col gap-1 border-l-2 border-default-200 pl-2">
          {members.map((member, idx) => (
            <BreakdownRow
              key={`${member.fingerprint || "combination"}-${idx}`}
              item={member}
              usageRate={member.usage_rate}
              rateNote={rateNote}
              nested
            />
          ))}
        </div>
      )}
    </div>
  );
}
