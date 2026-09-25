"use client";

import { useDeferredValue, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

import { LuChartColumn, LuChartSpline, LuListOrdered } from "react-icons/lu";
import { Chip, Tab, Tabs } from "@heroui/react";

import ScrollUpFloating from "@app/components/atoms/Floating/ScrollUpFloating";
import WeeklyDeckUsagePanel from "@app/components/organisms/DeckMeta/WeeklyDeckUsagePanel";
import WeeklyDeckUsageTrendPanel from "@app/components/organisms/DeckMeta/WeeklyDeckUsageTrendPanel";
import {
  initialTrendRange,
  prefetchWeeklyDeckUsageTrend,
} from "@app/components/organisms/DeckMeta/weeklyDeckUsageTrendLoader";

// ページ内の表示の切り替え。URL の view パラメータでも指定できる(共有・再訪用)
type DeckMetaView = "ranking" | "trend";

function normalizeView(value: string | null): DeckMetaView {
  return value === "trend" ? "trend" : "ranking";
}

export default function TemplateDeckMeta() {
  const searchParams = useSearchParams();
  const [view, setView] = useState<DeckMetaView>(() =>
    normalizeView(searchParams.get("view")),
  );
  /*
   * 中身の切り替えは遅らせた値(contentView)で行う。タブの選択表示は押した瞬間に変え、
   * 推移のグラフ(線50〜70本・スプライト60個)の組み立ては、React が細切れにして後から進める。
   * 同じ操作の中で組み立てまで済ませると、押してから画面が動くまでが1つの長い処理になる
   * (先読みで結果が届いている場合に顕著で、CPU 4倍低速で100ms)。
   * 組み立てが済むまでは前のタブの中身が出たままになる。
   */
  const contentView = useDeferredValue(view);

  // 推移は一度開くまで読み込まない(数週ぶんの集計を取るため、見ない人に取らせない)。
  // 一度開いた後は隠すだけにして、タブを往復しても取り直しや線の選択のリセットが起きないようにする。
  // 開いたかどうかは遅らせた値で判定し、パネルを作るのも遅らせた描画の中で行う
  const [trendOpened, setTrendOpened] = useState(view === "trend");
  if (contentView === "trend" && !trendOpened) setTrendOpened(true);

  // タブを切り替えるたびにこのテンプレートは描き直すが、中のパネルは巻き込まない。
  // 同じ要素を渡し続けると React は子の描き直しを省く(ランキングは約50行あり、
  // 隠れているのに押すたび作り直すと、タブを押してから動くまでが重くなる)
  const rankingPanel = useMemo(() => <WeeklyDeckUsagePanel />, []);
  const trendPanel = useMemo(() => <WeeklyDeckUsageTrendPanel />, []);

  /*
   * 推移タブに触れた(指を置いた・マウスを載せた・フォーカスした)時点で推移の取得を始める。
   * 押して離すまでの間に通信を済ませ、開いたときの待ち時間を縮める。触れていない人には
   * 取らせない方針(上の trendOpened)は変えない。先読みは一度だけでよい
   * (結果はローダーが控えるので、同じ期間を2回取りに行くことはない)。
   */
  function prefetchTrend(target: EventTarget) {
    if (trendOpened) return;
    if (!(target instanceof Element) || !target.closest('[data-key="trend"]')) return;
    prefetchWeeklyDeckUsageTrend(initialTrendRange(searchParams));
  }

  function changeView(next: DeckMetaView) {
    setView(next);

    // 週・集計単位など他のパラメータは残したまま view だけを書き換える
    // (Next の history.replaceState 連携で useSearchParams とも同期する)
    const url = new URL(window.location.href);
    if (next === "ranking") {
      url.searchParams.delete("view");
    } else {
      url.searchParams.set("view", next);
    }
    window.history.replaceState(window.history.state, "", url.toString());
  }

  return (
    <>
      <ScrollUpFloating />
      <div className="pt-6 pb-6 w-full">
        <div className="mx-auto w-full max-w-2xl px-1.5 pb-15 flex flex-col gap-5">
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
                    content: "text-[0.625rem] font-black px-1.5",
                  }}
                >
                  β機能
                </Chip>
              </div>
              <p className="text-xs text-default-400 leading-relaxed">
                バトレコ利用者の対戦記録から集計した、週ごとのデッキ使用率ランキングと順位の推移です。
              </p>
            </div>
          </div>

          <div
            onPointerOverCapture={(e) => prefetchTrend(e.target)}
            onPointerDownCapture={(e) => prefetchTrend(e.target)}
            onFocusCapture={(e) => prefetchTrend(e.target)}
          >
            <Tabs
              fullWidth
              aria-label="表示の切り替え"
              selectedKey={view}
              onSelectionChange={(key) => changeView(key as DeckMetaView)}
              classNames={{ tab: "h-9", tabContent: "font-bold text-sm" }}
            >
              <Tab
                key="ranking"
                title={
                  <div className="flex items-center gap-1.5">
                    <LuListOrdered className="w-4 h-4" />
                    <span>ランキング</span>
                  </div>
                }
              />
              <Tab
                key="trend"
                title={
                  <div className="flex items-center gap-1.5">
                    <LuChartSpline className="w-4 h-4" />
                    <span>推移</span>
                  </div>
                }
              />
            </Tabs>
          </div>

          {/* ランキングは週・集計単位・内訳の開閉を持つため、隠すだけにして状態を保つ */}
          <div className={contentView === "ranking" ? "" : "hidden"}>{rankingPanel}</div>
          {trendOpened && (
            <div className={contentView === "trend" ? "" : "hidden"}>{trendPanel}</div>
          )}
        </div>
      </div>
    </>
  );
}
