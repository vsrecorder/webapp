"use client";

import { LuChartColumn } from "react-icons/lu";
import { Chip } from "@heroui/react";

import ScrollUpFloating from "@app/components/atoms/Floating/ScrollUpFloating";
import WeeklyDeckUsagePanel from "@app/components/organisms/DeckMeta/WeeklyDeckUsagePanel";

export default function TemplateDeckMeta() {
  return (
    <>
      <ScrollUpFloating />
      <div className="pt-9 pb-6 w-full">
        <div className="mx-auto w-full max-w-2xl px-3 flex flex-col gap-5">
          {/* ページヘッダー */}
          <div className="flex items-start gap-3">
            <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-primary/15 text-primary shrink-0">
              <LuChartColumn className="w-6 h-6" />
            </div>
            <div className="flex flex-col gap-1 min-w-0 pt-0.5">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-lg font-black text-default-700 leading-tight">
                  対戦環境分析
                </h1>
                <Chip
                  size="sm"
                  color="warning"
                  variant="flat"
                  classNames={{
                    base: "h-5 px-0.5",
                    content: "text-[10px] font-black px-1.5",
                  }}
                >
                  試作中
                </Chip>
              </div>
              <p className="text-xs text-default-400 leading-relaxed">
                バトレコ利用者の対戦記録から集計した、週ごとのデッキ使用率ランキングです。
              </p>
            </div>
          </div>

          <WeeklyDeckUsagePanel />
        </div>
      </div>
    </>
  );
}
