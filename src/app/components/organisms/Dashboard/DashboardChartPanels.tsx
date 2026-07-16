"use client";

import dynamic from "next/dynamic";

import ChartPanelFallback from "@app/components/organisms/Dashboard/ChartPanelFallback";

/*
 * chart.js を抱えるパネルを初期JSから切り離すためのラッパー。
 *
 * ssr: false はサーバコンポーネントでは使えず、指定しないとチャートが初期ツリーで
 * SSRされてハイドレーションにJSが必要になり、結局 First Load JS から外れない。
 * そのため dynamic() の呼び出しをこのクライアントコンポーネント側に置き、
 * ssr: false でチャンクを完全に遅延させる。
 * ダッシュボードは認証済みユーザー向けでSEO対象外のため、SSRしなくても問題ない。
 *
 * DashboardSections は非表示設定されたセクションを描画しないので、
 * チャートを非表示にしているユーザーはチャンク自体を読み込まずに済む。
 */

export const UserStatHistoryChart = dynamic(
  () => import("@app/components/organisms/UserStat/UserStatHistoryChart"),
  { ssr: false, loading: () => <ChartPanelFallback /> },
);

export const RecentMatchWinRateChart = dynamic(
  () => import("@app/components/organisms/UserStat/RecentMatchWinRateChart"),
  { ssr: false, loading: () => <ChartPanelFallback /> },
);

export const DeckUsagePanel = dynamic(
  () => import("@app/components/organisms/DeckUsage/DeckUsagePanel"),
  { ssr: false, loading: () => <ChartPanelFallback /> },
);

export const OpponentDeckUsagePanel = dynamic(
  () => import("@app/components/organisms/DeckUsage/OpponentDeckUsagePanel"),
  { ssr: false, loading: () => <ChartPanelFallback /> },
);
