"use client";

import { useEffect } from "react";

/**
 * Next.js 16.3.0 の dev ツールインジケーターを、スマホでもドラッグできるようにする。
 *
 * 【問題1】タッチではドラッグが即死する
 * インジケーターのドラッグは Pointer Events で実装されているが、ドラッグハンドルに
 * touch-action の指定が無い(devtools のバンドル全体で touch-action の出現数は0)。
 * このためタッチ環境では、指が動いた瞬間にブラウザがジェスチャをページのパンと判定して
 * pointercancel を発火し、以降 pointermove が届かなくなる。
 * 実装側は window に pointermove / pointerup しか登録しておらず pointercancel を
 * 扱っていないため、ドラッグはそのまま死ぬ。マウスでは pointercancel が飛ばないので動く。
 *
 * 実測(Chromium・タッチ入力をCDPで発行、390x844):
 *   修正なし … pointermove 1回 → pointercancel、隅は変わらない
 *   修正あり … pointermove 25回 → pointerup、対角の隅へ移動できる
 *
 * 【対処1】
 * ドラッグハンドルに touch-action: none を入れてブラウザにパンを開始させない。
 * dev オーバーレイは <nextjs-portal> の open な shadow root にいるので、外から
 * shadowRoot 経由で触れる。CSS では shadow 境界を越えられないため JS で当てている。
 *
 * 【問題2】ドラッグが中断されると、以降タップのたびに例外が出続ける
 * touch-action を入れてもマルチタッチやOSのジェスチャで pointercancel は起こりうる。
 * devtools 側の後片付け関数は
 *
 *   state==="drag" && el.releasePointerCapture(pointerId)  ← 先頭の一文
 *   → 状態を idle へ / window のリスナ解除 / grabbing クラスと user-select の復帰
 *
 * という順で書かれている。pointercancel はキャプチャを失効させるが devtools は
 * それを購読していないので状態は "drag" のまま残り、window のリスナも生きたまま。
 * その後どこかを一度タップすると、生き残った pointerup ハンドラが後片付けを呼び、
 * 失効済みIDに対する releasePointerCapture が
 *   NotFoundError: No active pointer with the given id is found
 * を投げる。先頭の一文で投げるので後片付けは丸ごと飛び、状態は "drag" のまま。
 * つまり一度中断すると、以降タップのたびに同じ例外が出続ける(自然には治らない)。
 *
 * 実測(Chromium・CDPでドラッグ中に touchCancel を発行、390x844):
 *   修正なし … 中断地点(276,730)に取り残されたまま grabbing クラスと user-select:none が残る。
 *              無関係なスワイプでインジケーターが指に追従して(-92,-266)移動し、
 *              その後のタップ3回で NotFoundError が3回
 *   修正あり … 中断した時点で隅(22,790)へ吸着してクラスもスタイルも戻る。
 *              無関係なスワイプでの移動量は(0,0)、タップ3回でも例外0回
 *
 * 【対処2】
 *   a) キャプチャを持つ要素の releasePointerCapture を、失効済みIDなら黙って捨てる
 *      実装に差し替える(その要素だけの自前プロパティ)。これで後片付けが最後まで走る。
 *   b) pointercancel を拾って、代わりの pointerup を window へ直接流す。
 *      target が window なので document 以下のアプリ側リスナには届かない。
 *      ドラッグ中(grabbing クラスが付いている)のときだけ流す。
 *
 * 本家が直したら丸ごと削除すること。Layout 側で開発時のみ描画しているため、
 * 本番ビルドではこのモジュールごと落ちる。
 */
export default function DevToolsDragFix() {
  useEffect(() => {
    const HANDLE = "[data-nextjs-dev-tools-button]";
    // ポインタキャプチャと grabbing クラスを持つのはインジケーター直下の div。
    // 目印になる data 属性が無いので構造で引く。
    const DRAGGABLE = "#devtools-indicator > div";
    const GRABBING = "dev-tools-grabbing";

    const observers: MutationObserver[] = [];
    const watched = new WeakSet<ShadowRoot>();
    const patched = new WeakSet<HTMLElement>();
    // pointercancel 時に「ドラッグ中か」を見るため、最後に見つけた要素を覚えておく
    let draggable: HTMLElement | null = null;

    const applyIn = (root: ShadowRoot) => {
      const handle = root.querySelector<HTMLElement>(HANDLE);
      if (handle && handle.style.touchAction !== "none") {
        handle.style.touchAction = "none";
      }

      const target = root.querySelector<HTMLElement>(DRAGGABLE);
      if (!target) return;
      draggable = target;

      if (!patched.has(target)) {
        patched.add(target);
        Object.defineProperty(target, "releasePointerCapture", {
          configurable: true,
          value(this: Element, pointerId: number) {
            // 既に失効しているIDは捨てる。ここで投げると呼び出し元(devtools の
            // 後片付け)が先頭で止まり、ドラッグ状態が永久に残る。
            if (!this.hasPointerCapture(pointerId)) return;
            Element.prototype.releasePointerCapture.call(this, pointerId);
          },
        });
      }
    };

    // オーバーレイは非同期にマウントされ、開閉のたびに中身が作り直される。
    // ポータル(light DOM)の出現と、その shadow root 内の変化の両方を見る必要がある。
    const scan = () => {
      for (const host of document.querySelectorAll("nextjs-portal")) {
        const root = host.shadowRoot;
        if (!root) continue;

        applyIn(root);

        if (!watched.has(root)) {
          watched.add(root);
          const observer = new MutationObserver(() => applyIn(root));
          observer.observe(root, { childList: true, subtree: true });
          observers.push(observer);
        }
      }
    };

    scan();

    const portalObserver = new MutationObserver(scan);
    portalObserver.observe(document.body, { childList: true, subtree: true });
    observers.push(portalObserver);

    // ドラッグ中の pointercancel を pointerup に読み替えて後片付けさせる
    const onPointerCancel = (event: PointerEvent) => {
      if (!draggable?.classList.contains(GRABBING)) return;
      window.dispatchEvent(
        new PointerEvent("pointerup", { pointerId: event.pointerId }),
      );
    };
    window.addEventListener("pointercancel", onPointerCancel, true);

    return () => {
      window.removeEventListener("pointercancel", onPointerCancel, true);
      for (const observer of observers) observer.disconnect();
    };
  }, []);

  return null;
}
