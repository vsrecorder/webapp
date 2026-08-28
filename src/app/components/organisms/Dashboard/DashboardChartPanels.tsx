"use client";

import { ComponentType, useEffect, useRef, useState } from "react";

import ChartPanelFallback from "@app/components/organisms/Dashboard/ChartPanelFallback";

/*
 * chart.js を抱えるパネルを初期JSから切り離すためのラッパー。
 *
 * チャートを初期ツリーでSSRするとハイドレーションにJSが必要になり、結局
 * First Load JS から外れない。そのため import() をこのクライアントコンポーネント側に
 * 置き、サーバでは常にプレースホルダを返してチャンクを完全に遅延させる。
 * ダッシュボードは認証済みユーザー向けでSEO対象外のため、SSRしなくても問題ない。
 *
 * DashboardSections は非表示設定されたセクションを描画しないので、
 * チャートを非表示にしているユーザーはチャンク自体を読み込まずに済む。
 *
 * さらに、画面に近づくまでマウント自体を遅らせている。import() で初期JSからは
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

/*
 * 読み込みは next/dynamic ではなく自前で持つ。dynamic(ssr:false) の中身は
 * React.lazy + Suspense 境界で、チャンクの取得が済んでいても初回レンダーでは
 * 必ずサスペンドし、fallback を出した直後のコミットは FALLBACK_THROTTLE_MS
 * (300ms, react-dom)ぶん遅延する(詳細は utils/lazyModal.tsx を参照)。
 * ここでは画面接近でマウントするため、その300msがそのまま実体表示の遅れに乗っていた。
 * 読み込み済みモジュールを自前で持てば、到着したその場で同期的に差し替えられる。
 * サーバでは常にプレースホルダを返すので SSR もしない(ssr:false と同じ)。
 */
function deferUntilVisible<P extends object>(
  loader: () => Promise<{ default: ComponentType<P> }>,
  { withHeading = false }: { withHeading?: boolean } = {},
) {
  // 読み込みが済んだコンポーネント。モジュールにつき1つ。
  let Loaded: ComponentType<P> | null = null;
  let loading: Promise<void> | null = null;

  function load() {
    if (!loading) {
      loading = loader().then(
        (mod) => {
          Loaded = mod.default;
        },
        (err) => {
          // 失敗をキャッシュしない。デプロイ跨ぎでチャンクが消えた等の取得失敗は、
          // 次の load()（エラーバウンダリの reset 後）で取り直せるようにする。
          loading = null;
          throw err;
        },
      );
    }

    return loading;
  }

  return function DeferredChartPanel(props: P) {
    const [isVisible, setIsVisible] = useState(false);
    // 読み込みの完了で描き直すためだけの state。
    const [, forceRender] = useState(0);
    // 読み込みに失敗した場合のエラー。レンダーで投げ直してエラーバウンダリ
    // (error.tsx)へ届ける。ChunkLoadError なら「再読み込み」が location.reload に
    // 切り替わる、既存の復旧フローに乗せるため(スケルトンのまま黙って固まらせない)。
    const [loadError, setLoadError] = useState<unknown>(null);
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

    // 画面に近づいたら読み込みを始め、届いたら実体へ差し替える。
    // チャートを非表示にしているユーザーや、パネルまでスクロールしない閲覧では
    // ここに来ないので、チャンク自体を読み込まない性質は保たれる。
    useEffect(() => {
      if (!isVisible) return;

      if (Loaded) {
        // レンダーと effect の隙間で読み込みが完了していた場合を取りこぼさない
        // よう、無条件に描き直す。isVisible の変化時に高々1回しか走らない。
        forceRender((n) => n + 1);
        return;
      }

      let cancelled = false;
      load().then(
        () => {
          if (!cancelled) forceRender((n) => n + 1);
        },
        (err) => {
          if (!cancelled) setLoadError(err);
        },
      );

      return () => {
        cancelled = true;
      };
    }, [isVisible]);

    if (loadError) throw loadError;

    // この div は「画面内に入ったか」を観測するための箱。display:contents だと
    // レイアウトボックスを持たず IntersectionObserver が働かないため、実体を包む。
    // 見出し行とカードを返すパネル（DeckUsagePanel など）は、これまで親セクションの
    // flex-col gap-2 で間隔が付いていたので、同じ指定をこの箱にも持たせて見た目を保つ。
    //
    // プレースホルダには実体に近い高さを持たせる。高さ0だと画面内判定が常に真になり、
    // 遅延がまったく効かなくなる。
    return (
      <div ref={ref} className="flex flex-col gap-2">
        {isVisible && Loaded ? (
          <Loaded {...props} />
        ) : (
          <ChartPanelFallback withHeading={withHeading} />
        )}
      </div>
    );
  };
}

export const UserStatHistoryChart = deferUntilVisible(
  () => import("@app/components/organisms/UserStat/UserStatHistoryChart"),
);

export const RecentMatchWinRateChart = deferUntilVisible(
  () => import("@app/components/organisms/UserStat/RecentMatchWinRateChart"),
);

// 見出し行はパネル自身が描く（Dashboard 側に h2 が無い）ため、
// プレースホルダにも見出し行を持たせる。
export const DeckUsagePanel = deferUntilVisible(
  () => import("@app/components/organisms/DeckUsage/DeckUsagePanel"),
  { withHeading: true },
);

export const OpponentDeckUsagePanel = deferUntilVisible(
  () => import("@app/components/organisms/DeckUsage/OpponentDeckUsagePanel"),
  { withHeading: true },
);
