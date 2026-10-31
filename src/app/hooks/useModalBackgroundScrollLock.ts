"use client";

import { useEffect } from "react";

/*
 * 文書座標で置かれたオーバーレイが残っているとき、背面固定を待つ上限。
 *
 * HeroUI の Popover/Dropdown の退場アニメーションは本体 0.15 秒・暗幕 0.3 秒(framer-utils の
 * scaleSpringOpacity.exit / fade.exit)で、実測でも選んでから約 0.3 秒で DOM から消えた。
 * 待っている間は背面固定が無い(react-aria の overflow:hidden だけ)ので、閉じないオーバーレイが
 * 残っていても固定を諦めないよう、これを過ぎたら残っていても固定する。長くすると、その穴の
 * 時間がそのまま延びるので、退場アニメーションに少し余裕を見た値に留める。
 */
const DEFER_APPLY_MAX_MS = 500;

/*
 * ページ内容ラッパーの外(body 直下)に、文書座標で絶対配置されたオーバーレイが残っているか。
 *
 * HeroUI の Dropdown/Popover(react-aria の Overlay)は body 直下に
 * `position:absolute; top:<文書座標>px` のラッパーをポータルで置く。メニューの項目から
 * モーダルを開くと、メニューは閉じ始める(退場アニメーション中)が、その間この要素は残る。
 * ここでページ内容ラッパーを position:fixed にすると、文書のスクロール範囲が「残った
 * オーバーレイの下端」まで縮んで window.scrollY が折りたたまれ、文書座標のオーバーレイは
 * 折りたたまれた分だけ画面上で下へ飛ぶ(ホームを 1500px スクロールした状態でユーザメニューの
 * ログアウトを選ぶと、消えかけのメニューが 205px 下へ瞬間移動した。実測)。
 * ページの先頭では文書が縮んでも scrollY が変わらないので起きない。これが
 * 「背面によってちらつくことがある」の正体。残っている間は固定を待つ(sync 参照)。
 *
 * Next.js の next-route-announcer も absolute だが top を指定しておらず、
 * 文書末尾のフロー位置に置かれるだけなので対象にしない。
 */
export function hasDocumentAnchoredOverlay(body: HTMLElement, lockRoot: Element): boolean {
  for (const el of Array.from(body.children)) {
    if (!(el instanceof HTMLElement)) continue;
    if (el.contains(lockRoot)) continue;
    // 判定は要素のインラインスタイル。react-aria の useOverlayPosition は位置を計算した結果を
    // style 属性(position:absolute; top:…px; left:…px)として書く。クラス指定ではないので
    // ここで読める。表示されていない(display:none)ものは文書の高さに関わらない
    if (el.style.position !== "absolute" || el.style.top === "") continue;
    if (getComputedStyle(el).display === "none") continue;
    // 中身がオーバーレイのものに限る。body 直下に absolute＋top で常駐する別物(Firebase Auth の
    // 認証 iframe など)まで待つと、全モーダルの固定が毎回上限まで遅れる
    if (!el.querySelector(OVERLAY_CONTENT_SELECTOR)) continue;
    return true;
  }
  return false;
}

/*
 * オーバーレイの中身と見なすもの。HeroUI の Popover/Dropdown/Select/Tooltip の中身は
 * data-slot="base" の箱(実測: ラッパー > div > div[data-slot=base][role=dialog] > …)。
 * 素の react-aria のオーバーレイなら role で分かる
 */
const OVERLAY_CONTENT_SELECTOR =
  '[data-slot="base"], [role="menu"], [role="listbox"], [role="dialog"], [role="tooltip"]';

/*
 * モーダル表示中に「背面ページがスクロールできる余地」を構造的になくすグローバル対策。
 *
 * HeroUI(react-aria の usePreventScroll)は、モーダル表示中に documentElement へ
 * overflow:hidden を設定し、iOS ではさらに touchmove の preventDefault で
 * ページスクロールを抑止する。しかしソフトウェアキーボードの表示中はどちらも効かない:
 *
 * - iOS Safari はキーボード表示中、overflow:hidden と touchmove の preventDefault を
 *   無視してレイアウトビューポートごとページをスクロールさせる。
 * - Android Chrome(108+ 既定の resizes-visual)はキーボード表示中、レイアウト
 *   ビューポート内で visual viewport をパンできる。これはページのスクロールではない
 *   ため overflow も preventDefault も一切効かない。
 *
 * モーダル自体は globals.css の --vv-offset-top 追従で可視領域に固定されるため、
 * ユーザーにはモーダルのヘッダーやフッターをスワイプすると「背面だけが上下する」
 * ように見える。これが入力フォーカス中(=キーボード表示中)にだけ起こる理由。
 *
 * 対策(モーダル表示中のみ・全モーダル共通):
 * 1. 背面のページ内容ラッパー([data-scroll-lock-root]、Providers.tsx が children を
 *    括っている要素)を position:fixed で現在のスクロール位置のまま固定する。
 *    文書のスクロール可能領域がビューポートと同寸になり、キーボード表示中でも
 *    iOS にスクロールさせる余地がなくなる。
 *    (overflow:hidden が無視されても「スクロールするものが無い」状態は無視できない)
 *    アプリルート(body > [data-overlay-container])ごと固定しないのは、その内側に
 *    HeroUI のトースト領域(z-100)があるため。fixed は stacking context を作るので、
 *    まるごと固定するとトーストが閉じ込められてモーダル(z-50)の背後に描画されてしまう。
 * 2. viewport meta に interactive-widget=resizes-content を一時付与する。
 *    Android ではキーボード表示時にレイアウトビューポート自体が縮み、visual viewport
 *    とのずれ(=パンの余地)が生じなくなる。iOS/未対応ブラウザでは単に無視される。
 *
 * モーダルの開閉検知は、react-aria が documentElement の style.overflow を
 * hidden にする/戻すことを利用する(scrollIntoViewAfterKeyboard と同じ判定)。
 * これにより個々のモーダルへの変更なしで、全モーダルに適用される。
 */
export function useModalBackgroundScrollLock() {
  useEffect(() => {
    // キーボード起因の問題であり、タッチ端末以外では発生しない。
    // デスクトップまで巻き込まないようタッチ端末に限定する。
    if (!("ontouchstart" in window) && navigator.maxTouchPoints === 0) return;

    const html = document.documentElement;

    let applied = false;
    let savedY = 0;
    let savedHref = "";
    let restoreStyles: (() => void) | null = null;
    let restoreMeta: (() => void) | null = null;

    const setStyle = (
      el: HTMLElement,
      prop: string,
      value: string,
    ): (() => void) => {
      const prev = el.style.getPropertyValue(prop);
      el.style.setProperty(prop, value);
      return () => {
        if (prev) {
          el.style.setProperty(prop, prev);
        } else {
          el.style.removeProperty(prop);
        }
      };
    };

    // restoreY: 閉じたときに戻すスクロール位置。固定を保留していた場合は、保留を始めた
    // (メニューの項目を選んだ)時点の位置。待っている間にページが動いても、開く前の位置へ戻す
    const apply = (lockRoot: HTMLElement, restoreY: number) => {
      savedY = restoreY;
      savedHref = window.location.href;
      const fixedY = window.scrollY;

      // 現在見えている位置(top: -scrollY)のままページ内容ラッパーを固定する。
      // fixed 化で文書フローから外れるため、文書のスクロール範囲が
      // ビューポート寸法まで縮み、背面をスクロールさせる余地がなくなる。
      // overflow:hidden は、はみ出した背面コンテンツが文書のスクロール範囲を
      // 再び押し広げないための保険(fixed 内の Header 等は clip されない)。
      const restores = [
        setStyle(lockRoot, "position", "fixed"),
        setStyle(lockRoot, "top", `${-fixedY}px`),
        setStyle(lockRoot, "left", "0"),
        setStyle(lockRoot, "right", "0"),
        setStyle(lockRoot, "bottom", "0"),
        setStyle(lockRoot, "overflow", "hidden"),
      ];
      restoreStyles = () => restores.forEach((fn) => fn());

      // Android: キーボード表示時にレイアウトビューポートごと縮めて、
      // visual viewport のパン(背面が動いて見える原因)を根本的になくす。
      const meta = document.querySelector<HTMLMetaElement>(
        'meta[name="viewport"]',
      );
      const content = meta?.getAttribute("content");
      if (meta && content && !content.includes("interactive-widget")) {
        meta.setAttribute(
          "content",
          `${content}, interactive-widget=resizes-content`,
        );
        restoreMeta = () => {
          // ナビゲーション等で meta が差し替わっていたら触らない
          if (meta.getAttribute("content")?.includes("interactive-widget")) {
            meta.setAttribute("content", content);
          }
        };
      }
    };

    const release = () => {
      restoreStyles?.();
      restoreStyles = null;
      restoreMeta?.();
      restoreMeta = null;

      // モーダルから他ページへ遷移した場合は、旧ページのスクロール位置を
      // 新ページへ持ち込まない(Next.js のスクロールリセットを尊重する)
      if (window.location.href === savedHref) {
        window.scrollTo({ top: savedY, behavior: "instant" });
      }
    };

    /*
     * 背面固定の保留。文書座標のオーバーレイ(閉じかけのメニュー)が body 直下に残っている間は
     * apply() を待ち、それが外れたら(body の子が変わったら)sync し直す。
     * 上限を過ぎたら残っていても固定する(deferExpired)。
     */
    let deferObserver: MutationObserver | null = null;
    let deferTimer: ReturnType<typeof setTimeout> | null = null;
    let deferExpired = false;
    // 保留を始めた時点のスクロール位置(閉じたときの戻り先)
    let deferredFromY: number | null = null;

    const cancelDefer = () => {
      deferObserver?.disconnect();
      deferObserver = null;
      if (deferTimer !== null) {
        clearTimeout(deferTimer);
        deferTimer = null;
      }
      deferExpired = false;
      deferredFromY = null;
    };

    const deferApply = () => {
      if (deferObserver) return;
      deferredFromY = window.scrollY;
      // オーバーレイは DOM から外れて消える(body の子が減る)。style で隠れる・位置指定が
      // 外れる形も hasDocumentAnchoredOverlay は「消えた」と見るので、body 直下の要素の
      // style 変化も見ておく(モーダルの中の変化までは拾わないよう、子孫は見ない)。
      // 待っている間に body 直下へ増えた要素も同じように見る
      const watchStyle = (el: Node) => {
        if (el instanceof HTMLElement) {
          deferObserver?.observe(el, { attributes: true, attributeFilter: ["style"] });
        }
      };
      deferObserver = new MutationObserver((records) => {
        for (const record of records) record.addedNodes.forEach(watchStyle);
        sync();
      });
      deferObserver.observe(document.body, { childList: true });
      Array.from(document.body.children).forEach(watchStyle);
      deferTimer = setTimeout(() => {
        deferTimer = null;
        deferExpired = true;
        sync();
      }, DEFER_APPLY_MAX_MS);
    };

    const sync = () => {
      // react-aria の usePreventScroll はモーダル表示中(入れ子があれば
      // その全体の間)だけ documentElement を overflow:hidden にする。
      const locked = html.style.overflow === "hidden";

      // ただし overflow:hidden はモーダルに限らず、スクロールをブロックする
      // ポップオーバー(HeroUI の Dropdown/Select 等。既定で shouldBlockScroll=true)
      // を開いたときにも設定される。これらまで背面固定してしまうと、少しスクロール
      // した状態でメニューを開いた瞬間に apply() が背面を position:fixed 化 →
      // 文書のスクロール可能領域が消えて window.scrollY が 0 に折りたたまれ、その
      // scroll イベントで非モーダルのポップオーバーが即座に閉じてしまう(=メニューが
      // 開けない)。そこで「実際にモーダルが開いているか」を aria-modal で併せて確認する。
      // HeroUI Modal は開いている間 aria-modal="true" を付与するが、Dropdown/Select/
      // Popover は付与しないため両者を確実に区別できる。この属性要素は usePreventScroll
      // の layout effect(overflow 設定)より前の DOM コミットで挿入されるため、
      // observer 発火時点で必ず参照でき、判定にレースは生じない。
      const modalOpen = document.querySelector('[aria-modal="true"]') !== null;

      if (locked && modalOpen && !applied) {
        // 閉じかけのメニュー(文書座標のオーバーレイ)が残っていれば、消えるまで固定を待つ。
        // 先に固定すると文書が縮んで scrollY が折りたたまれ、メニューが画面上で飛ぶ
        // (hasDocumentAnchoredOverlay 参照)
        const lockRoot = document.querySelector<HTMLElement>("[data-scroll-lock-root]");
        if (!lockRoot) {
          // 固定する相手が無い(Providers の外で描かれている等)。待ちも残さない
          cancelDefer();
          return;
        }
        if (!deferExpired && hasDocumentAnchoredOverlay(document.body, lockRoot)) {
          deferApply();
          return;
        }
        const restoreY = deferredFromY ?? window.scrollY;
        cancelDefer();
        applied = true;
        apply(lockRoot, restoreY);
      } else if (!locked || !modalOpen) {
        // 保留中にモーダルが閉じたら、固定せずに待ちだけ取り消す
        cancelDefer();
        if (applied) {
          applied = false;
          release();
        }
      }
    };

    const observer = new MutationObserver(sync);
    // 主トリガー: モーダルの scroll ブロックは html の overflow:hidden として現れる。
    observer.observe(html, { attributes: true, attributeFilter: ["style"] });

    // 補助トリガー: Dropdown/Select 等(scroll ブロック中)を開いたまま、そのメニュー
    // 項目からモーダルを開くと、overflow:hidden が途切れず維持され html の style が
    // 変化しないことがあり、主トリガーだけではモーダルの開始を取りこぼしうる。
    // react-aria はモーダル表示中だけ背面アプリルートを ariaHideOutside で aria-hidden
    // にする(非モーダルの Dropdown/Select/Popover では付与しない)ため、これを監視して
    // モーダルの開閉を確実に捕捉する。sync() は冪等なので余分に発火しても害はない。
    const appRoot = document.querySelector<HTMLElement>(
      "body > [data-overlay-container]",
    );
    if (appRoot) {
      observer.observe(appRoot, {
        attributes: true,
        attributeFilter: ["aria-hidden"],
      });
    }
    sync();

    return () => {
      observer.disconnect();
      cancelDefer();
      if (applied) {
        applied = false;
        release();
      }
    };
  }, []);
}
