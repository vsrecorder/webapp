"use client";

import ScrollUpFloating from "@app/components/atoms/Floating/ScrollUpFloating";
import WeeklyDeckUsagePanel from "@app/components/organisms/DeckMeta/WeeklyDeckUsagePanel";

export default function TemplateDeckMeta() {
  return (
    <>
      <ScrollUpFloating />
      <div className="pt-12 w-full">
        <div className="mx-auto w-full max-w-xl px-3">
          <h1 className="mb-3 text-lg font-black text-default-700">対戦環境分析</h1>
          <WeeklyDeckUsagePanel />
        </div>
      </div>
    </>
  );
}
