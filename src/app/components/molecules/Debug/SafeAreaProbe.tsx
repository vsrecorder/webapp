"use client";

import { useEffect, useRef } from "react";

import { useLocalStorageItem } from "@app/hooks/useLocalStorageItem";
import { writeLocalStorage } from "@app/utils/localStorageStore";

/*
 * セーフエリアの実測値を画面に出す確認用の表示。
 *
 * env(safe-area-inset-*) は開発機のブラウザでは常に 0 で、実機の PWA でしか本当の値が
 * 分からない。viewport-fit=cover を入れても Android の PWA で下端の白い帯が消えなかったため、
 * 「env が 0 のままなのか、値は来ているが別の理由で帯が残るのか」を切り分けるために置いている。
 *
 * 出し方: ブラウザで `?safearea` を開くと、以降は同じオリジンで出続ける(PWA には
 * アドレスバーが無くクエリを付けられないため、localStorage に覚えさせる)。
 * 消すときは `?safearea=off`。切り分けが済んだらこのファイルごと消してよい。
 *
 * 表示の更新は state ではなく textContent への直接書き込みで行う。デバッグ用の
 * 読み取り専用の表示で、React の再描画に乗せる必要が無いため。
 */
const STORAGE_KEY = "vsrec:debug:safearea";

function measure(): string {
  // env() は CSS の中でしか評価されないので、値を padding に入れた見えない箱を作って読む
  const probe = document.createElement("div");
  probe.style.cssText = [
    "position:fixed",
    "top:0",
    "left:0",
    "width:0",
    "height:0",
    "visibility:hidden",
    "padding-top:env(safe-area-inset-top)",
    "padding-right:env(safe-area-inset-right)",
    "padding-bottom:env(safe-area-inset-bottom)",
    "padding-left:env(safe-area-inset-left)",
  ].join(";");
  document.body.appendChild(probe);
  const p = getComputedStyle(probe);
  const inset = `${p.paddingTop} / ${p.paddingRight} / ${p.paddingBottom} / ${p.paddingLeft}`;
  probe.remove();

  const root = getComputedStyle(document.documentElement);
  const nav = document.querySelector("nav.fixed");
  const header = document.querySelector("header");

  return [
    `inset T/R/B/L: ${inset}`,
    `--header-height: ${root.getPropertyValue("--header-height").trim()}`,
    `--mobile-nav-height: ${root.getPropertyValue("--mobile-nav-height").trim()}`,
    `header: ${header ? Math.round(header.getBoundingClientRect().height) : "-"}px`,
    `nav: ${nav ? Math.round(nav.getBoundingClientRect().height) : "-"}px`,
    `body bg: ${getComputedStyle(document.body).backgroundColor}`,
    `innerHeight: ${window.innerHeight} / screen: ${window.screen.height}`,
    `standalone: ${window.matchMedia("(display-mode: standalone)").matches}`,
    // 下端の帯がシステム由来かを切り分ける材料。html の色宣言と、OS 側の設定が食い違っていないか
    `color-scheme: ${root.colorScheme} / html class: ${document.documentElement.className || "(なし)"}`,
    `OS dark: ${window.matchMedia("(prefers-color-scheme: dark)").matches}`,
  ].join("\n");
}

export default function SafeAreaProbe() {
  const enabled = useLocalStorageItem(STORAGE_KEY) === "1";
  const ref = useRef<HTMLPreElement>(null);

  // ?safearea / ?safearea=off で切り替える。書き込むとストア経由で enabled が追随する
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (!params.has("safearea")) return;
    writeLocalStorage(STORAGE_KEY, params.get("safearea") === "off" ? null : "1");
  }, []);

  useEffect(() => {
    if (!enabled) return;

    const update = () => {
      if (ref.current) ref.current.textContent = measure();
    };

    update();
    // 回転や、Android のジェスチャーバーの出入りで値が変わる
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [enabled]);

  if (!enabled) return null;

  return (
    <pre
      ref={ref}
      className="fixed z-[200] left-1 right-1 top-[calc(env(safe-area-inset-top)+3.75rem)] overflow-x-auto rounded-lg bg-black/85 px-2 py-1.5 font-mono text-[0.625rem] leading-tight text-lime-300"
    />
  );
}
