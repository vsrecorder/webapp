"use client";

import { ComponentType, useEffect, useState } from "react";

/*
 * 一覧カードにぶら下がる重量級モーダルを、初期表示から切り離すためのラッパー。
 *
 * 一覧のカードは「カードごとに詳細モーダルを1つ持ち、isOpen で開閉する」形になっている。
 * 素直に書くとモーダルは常にマウントされるため、次の2つのコストを初期表示で払っていた。
 *
 *   1. モーダルが依存するライブラリが初期JSに載る。デッキ詳細モーダルは子モーダルを9つ
 *      抱えており、そこから chart.js・react-select・画像書き出し(modern-screenshot)まで
 *      芋づるで初期バンドルに入っていた。本番ビルドの実測で /decks の初期JSは962KB。
 *   2. 開いてもいないモーダルのツリーがカードの枚数ぶんマウントされる。
 *      デッキが50件あれば詳細モーダル50個ぶんの描画がハイドレーション時に走る。
 *
 * ここでは import() でチャンクを初期JSから外し、さらに「一度でも開くまでマウントしない」
 * ことで 2 も同時に消す。サーバでは常に null を返す(＝SSRしない)。SSRすると
 * ハイドレーションにJSが必要になり、結局チャンクが初期JSから外れないため。
 *
 * チャンクは手が空いた時点で先に取っておく。初期表示の邪魔をせず、かつ最初のタップで
 * ダウンロードを待たされないようにするための折衷で、これが無いと回線が細い端末では
 * 「カードを叩いてもしばらく何も出ない」状態になる。
 *
 * next/dynamic(ssr:false)を使わないのは、その中身の React.lazy が「読み込み済みでも
 * 初回レンダーでは必ずサスペンドする」ため。ssr:false の dynamic は fallback 付きの
 * Suspense 境界を張るので、先読みが済んでいても最初の一発だけは
 * 「サスペンド → fallback(null) → 再開」を通る。React は fallback を出した直後の
 * コミットを FALLBACK_THROTTLE_MS(300ms, react-dom)ぶん遅らせるため、
 * 「ページを開いて最初にモーダルを開くときだけ重い」という形で表に出ていた。
 * 読み込み状態を自前で持てば、解決済みのモジュールはその場で同期的に描き始められる。
 */

// アイドル時の先読みが遅れすぎないよう、この時間で打ち切って実行する
const PRELOAD_TIMEOUT_MS = 3000;

/*
 * HeroUI の Modal は入場・退場アニメーションを framer-motion の LazyMotion で描いており、
 * その機能一式(features)を「モーダルを初めて表示するとき」に動的 import する
 * (@heroui/modal: features={() => import("@heroui/dom-animation")})。
 * 到着するまでモーダルは動かないので、そのぶん「出たのに止まったまま」の時間が生まれる。
 * モーダル本体と一緒に先読みしておく(本番ビルド/CPU4x の実測で、出現から動き出すまでが
 * 255ms → 183ms、着地が 456ms → 388ms)。
 */
const preloadMotionFeatures = () => import("@heroui/dom-animation");

type Loader<P> = () => Promise<{ default: ComponentType<P> }>;

function schedulePreload(run: () => void): () => void {
  // requestIdleCallback は Safari 16.4 以降。未対応環境では setTimeout に落とす。
  if (typeof window !== "undefined" && "requestIdleCallback" in window) {
    const id = window.requestIdleCallback(run, { timeout: PRELOAD_TIMEOUT_MS });
    return () => window.cancelIdleCallback(id);
  }

  const id = setTimeout(run, PRELOAD_TIMEOUT_MS);
  return () => clearTimeout(id);
}

export function createLazyModal<P extends { isOpen: boolean }>(loader: Loader<P>) {
  // 読み込みが済んだコンポーネント。モジュールにつき1つなので、
  // 一度どれかのカードが読み込めば、以降はどのカードでも待たずに描ける。
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
          // webpack 側は再試行可能な扱いなので、次の load()（エラーバウンダリの
          // reset 後や別カードでの開き直し）で取り直せるようにする。
          loading = null;
          throw err;
        },
      );
    }

    return loading;
  }

  // 先読みは「モジュール1つにつき1回」でよい。カードの枚数ぶん呼ばれるため、
  // ここで潰しておかないと同じ import() を何十回も叩くことになる
  // (ESモジュールはキャッシュされるので通信は増えないが、無駄な呼び出しは避ける)。
  let preloadStarted = false;

  return function LazyModal(props: P) {
    // 一度でも開いたか。閉じても false へは戻さない。
    // CardListAccordion と同じ考え方で、開き直しのたびに再取得・状態リセットが
    // 起きるのを防ぐ。
    const [hasOpened, setHasOpened] = useState(props.isOpen);
    // 読み込みの完了で描き直すためだけの state。
    const [, forceRender] = useState(0);
    // 開いているのに読み込みに失敗した場合のエラー。レンダーで投げ直して
    // エラーバウンダリ(error.tsx)へ届ける。ChunkLoadError なら「再読み込み」が
    // location.reload に切り替わる、既存の復旧フローに乗せるため。
    const [loadError, setLoadError] = useState<unknown>(null);

    useEffect(() => {
      if (props.isOpen) setHasOpened(true);
    }, [props.isOpen]);

    useEffect(() => {
      if (preloadStarted) return;

      return schedulePreload(() => {
        if (preloadStarted) return;
        preloadStarted = true;
        // 先読みの失敗はここでは握りつぶす。開くときに load() が取り直し、
        // それでも失敗したら下の effect がエラーバウンダリへ届ける。
        load().catch(() => {});
        preloadMotionFeatures().catch(() => {});
      });
    }, []);

    // 先読みが間に合わないうちに開かれた場合。読み込みを始め、届いたら描き直す。
    useEffect(() => {
      if (!hasOpened) return;

      if (Loaded) {
        // レンダー(null)と effect の隙間で読み込みが完了していた場合を取りこぼさない
        // よう、無条件に描き直す。hasOpened の変化時に高々1回しか走らないので、
        // 既に実体を描いていても無駄なコミットが1回増えるだけで済む。
        forceRender((n) => n + 1);
        return;
      }

      let cancelled = false;

      preloadStarted = true;
      preloadMotionFeatures().catch(() => {});
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
    }, [hasOpened]);

    if (loadError) throw loadError;

    if (!hasOpened || !Loaded) return null;

    const Modal = Loaded;

    return <Modal {...props} />;
  };
}
