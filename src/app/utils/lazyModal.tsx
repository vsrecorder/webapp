"use client";

import { ComponentType, useEffect, useState } from "react";

import dynamic from "next/dynamic";

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
 * ここでは dynamic(ssr:false) でチャンクを初期JSから外し、さらに「一度でも開くまで
 * マウントしない」ことで 2 も同時に消す。ssr:false が要るのは DashboardChartPanels と
 * 同じ理由で、SSRするとハイドレーションにJSが必要になり初期JSから外れないため。
 *
 * チャンクは手が空いた時点で先に取っておく。初期表示の邪魔をせず、かつ最初のタップで
 * ダウンロードを待たされないようにするための折衷で、これが無いと回線が細い端末では
 * 「カードを叩いてもしばらく何も出ない」状態になる。
 */

// アイドル時の先読みが遅れすぎないよう、この時間で打ち切って実行する
const PRELOAD_TIMEOUT_MS = 3000;

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
  const Modal = dynamic(loader, { ssr: false });

  // 先読みは「モジュール1つにつき1回」でよい。カードの枚数ぶん呼ばれるため、
  // ここで潰しておかないと同じ import() を何十回も叩くことになる
  // (ESモジュールはキャッシュされるので通信は増えないが、無駄な呼び出しは避ける)。
  let preloadStarted = false;

  return function LazyModal(props: P) {
    // 一度でも開いたか。閉じても false へは戻さない。
    // CardListAccordion と同じ考え方で、開き直しのたびに再取得・状態リセットが
    // 起きるのを防ぐ。
    const [hasOpened, setHasOpened] = useState(props.isOpen);

    useEffect(() => {
      if (props.isOpen) setHasOpened(true);
    }, [props.isOpen]);

    useEffect(() => {
      if (preloadStarted) return;

      return schedulePreload(() => {
        if (preloadStarted) return;
        preloadStarted = true;
        void loader();
      });
    }, []);

    if (!hasOpened) return null;

    return <Modal {...props} />;
  };
}
