"use client";

import { useEffect } from "react";

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
 * 1. 背面のアプリルート(body > [data-overlay-container])を position:fixed で
 *    現在のスクロール位置のまま固定する。文書のスクロール可能領域がビューポートと
 *    同寸になり、キーボード表示中でも iOS にスクロールさせる余地がなくなる。
 *    (overflow:hidden が無視されても「スクロールするものが無い」状態は無視できない)
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

    const apply = () => {
      const appRoot = document.querySelector<HTMLElement>(
        "body > [data-overlay-container]",
      );
      if (!appRoot) return;

      savedY = window.scrollY;
      savedHref = window.location.href;

      // 現在見えている位置(top: -scrollY)のままアプリルートを固定する。
      // fixed 化で文書フローから外れるため、文書のスクロール範囲が
      // ビューポート寸法まで縮み、背面をスクロールさせる余地がなくなる。
      // overflow:hidden は、はみ出した背面コンテンツが文書のスクロール範囲を
      // 再び押し広げないための保険(fixed 内の Header 等は clip されない)。
      const restores = [
        setStyle(appRoot, "position", "fixed"),
        setStyle(appRoot, "top", `${-savedY}px`),
        setStyle(appRoot, "left", "0"),
        setStyle(appRoot, "right", "0"),
        setStyle(appRoot, "bottom", "0"),
        setStyle(appRoot, "overflow", "hidden"),
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

    const sync = () => {
      // react-aria の usePreventScroll はモーダル表示中(入れ子があれば
      // その全体の間)だけ documentElement を overflow:hidden にする
      const locked = html.style.overflow === "hidden";
      if (locked && !applied) {
        applied = true;
        apply();
      } else if (!locked && applied) {
        applied = false;
        release();
      }
    };

    const observer = new MutationObserver(sync);
    observer.observe(html, { attributes: true, attributeFilter: ["style"] });
    sync();

    return () => {
      observer.disconnect();
      if (applied) {
        applied = false;
        release();
      }
    };
  }, []);
}
