"use client";

import { ComponentType, useEffect, useRef, useState } from "react";

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
 *
 * さらに、画面に近づくまでマウント自体を遅らせている。dynamic import で初期JSからは
 * 外れていても、マウントすれば chart.js のモジュール評価とチャートの初期化は走る。
 * 4つのパネルはいずれも初期表示では画面外にあるのに、ハイドレーション直後に他のセクション
 * もろとも一斉にマウントされるため、ページで最も忙しい時間帯をさらに押し上げていた。
 * 本番ビルド・CPU6x絞りの実測では、プロフィールカードのカウントアップ前後1.3秒に走る
 * JS 488ms のうち chart.js が 228ms を占めており、カウントアップが途中で止まる主因だった。
 * 遅延させた後は同じ区間のJSが 264ms に減り、chart.js は区間から消えている。
 */

// 画面に入るどれくらい手前でマウントを始めるか。
// プレースホルダと実体の高さは完全には一致しない（実体の高さはデータ量で変わる）ため、
// 画面内で差し替わるとその差のぶんだけ下の内容がずれる。モバイルの画面高（約840px）に近い距離を
// 先読みして、差し替えを画面外で終わらせる。
const ROOT_MARGIN = "600px";

function deferUntilVisible<P extends object>(
  Component: ComponentType<P>,
  { withHeading = false }: { withHeading?: boolean } = {},
) {
  return function DeferredChartPanel(props: P) {
    const [isVisible, setIsVisible] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
      const node = ref.current;
      if (!node) return;

      const observer = new IntersectionObserver(
        (entries) => {
          if (!entries[0].isIntersecting) return;
          setIsVisible(true);
          observer.disconnect();
        },
        { rootMargin: ROOT_MARGIN },
      );

      observer.observe(node);

      return () => observer.disconnect();
    }, []);

    // この div は「画面内に入ったか」を観測するための箱。display:contents だと
    // レイアウトボックスを持たず IntersectionObserver が働かないため、実体を包む。
    // 見出し行とカードを返すパネル（DeckUsagePanel など）は、これまで親セクションの
    // flex-col gap-2 で間隔が付いていたので、同じ指定をこの箱にも持たせて見た目を保つ。
    //
    // プレースホルダには実体に近い高さを持たせる。高さ0だと画面内判定が常に真になり、
    // 遅延がまったく効かなくなる。
    return (
      <div ref={ref} className="flex flex-col gap-2">
        {isVisible ? (
          <Component {...props} />
        ) : (
          <ChartPanelFallback withHeading={withHeading} />
        )}
      </div>
    );
  };
}

export const UserStatHistoryChart = deferUntilVisible(
  dynamic(() => import("@app/components/organisms/UserStat/UserStatHistoryChart"), {
    ssr: false,
    loading: () => <ChartPanelFallback />,
  }),
);

export const RecentMatchWinRateChart = deferUntilVisible(
  dynamic(() => import("@app/components/organisms/UserStat/RecentMatchWinRateChart"), {
    ssr: false,
    loading: () => <ChartPanelFallback />,
  }),
);

// 見出し行はパネル自身が描く（Dashboard 側に h2 が無い）ため、
// プレースホルダにも見出し行を持たせる。
export const DeckUsagePanel = deferUntilVisible(
  dynamic(() => import("@app/components/organisms/DeckUsage/DeckUsagePanel"), {
    ssr: false,
    loading: () => <ChartPanelFallback withHeading />,
  }),
  { withHeading: true },
);

export const OpponentDeckUsagePanel = deferUntilVisible(
  dynamic(() => import("@app/components/organisms/DeckUsage/OpponentDeckUsagePanel"), {
    ssr: false,
    loading: () => <ChartPanelFallback withHeading />,
  }),
  { withHeading: true },
);
