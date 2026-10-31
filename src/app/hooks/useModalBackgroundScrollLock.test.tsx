// @vitest-environment jsdom
import { cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  hasDocumentAnchoredOverlay,
  useModalBackgroundScrollLock,
  willOpenKeyboard,
} from "@app/hooks/useModalBackgroundScrollLock";

// MutationObserver の通知はマイクロタスクで届く。フェイクタイマー中でも本物のまま
const flushObservers = async () => {
  await Promise.resolve();
  await Promise.resolve();
};

function setScrollY(value: number) {
  Object.defineProperty(window, "scrollY", { value, configurable: true, writable: true });
}

// react-aria がモーダル表示中に行うことを真似る: html の overflow:hidden と aria-modal の要素
function openModal(): HTMLElement {
  const dialog = document.createElement("section");
  dialog.setAttribute("role", "dialog");
  dialog.setAttribute("aria-modal", "true");
  document.body.appendChild(dialog);
  document.documentElement.style.overflow = "hidden";
  return dialog;
}

function closeModal(dialog: HTMLElement) {
  dialog.remove();
  document.documentElement.style.overflow = "";
}

// モーダルの中の文字入力にフォーカスする(キーボードが出る操作)
function focusInput(dialog: HTMLElement, tag: "input" | "textarea" = "input"): HTMLElement {
  const input = document.createElement(tag);
  dialog.appendChild(input);
  input.focus();
  return input;
}

function focusButton(dialog: HTMLElement): HTMLElement {
  const button = document.createElement("button");
  dialog.appendChild(button);
  button.focus();
  return button;
}

// HeroUI の Popover/Dropdown が body 直下に置く、文書座標のラッパー(中身は data-slot="base" の箱)
function appendAnchoredOverlay(top: number): HTMLElement {
  const el = document.createElement("div");
  el.style.position = "absolute";
  el.style.top = `${top}px`;
  el.style.left = "40px";
  el.style.zIndex = "100000";
  const base = document.createElement("div");
  base.setAttribute("data-slot", "base");
  base.setAttribute("role", "dialog");
  el.appendChild(base);
  document.body.appendChild(el);
  return el;
}

// body 直下に absolute＋top で常駐する、オーバーレイではないもの(Firebase Auth の認証 iframe など)
function appendResidentAbsolute(): HTMLElement {
  const el = document.createElement("div");
  el.style.position = "absolute";
  el.style.top = "-100px";
  el.style.width = "1px";
  el.style.height = "1px";
  el.appendChild(document.createElement("iframe"));
  document.body.appendChild(el);
  return el;
}

describe("willOpenKeyboard", () => {
  const input = (type: string) => {
    const el = document.createElement("input");
    el.type = type;
    return el;
  };

  it("文字を打つ input・textarea・contenteditable はキーボードが出る", () => {
    expect(willOpenKeyboard(input("text"))).toBe(true);
    expect(willOpenKeyboard(input("number"))).toBe(true);
    expect(willOpenKeyboard(input("search"))).toBe(true);
    expect(willOpenKeyboard(document.createElement("textarea"))).toBe(true);
    const editable = document.createElement("div");
    editable.setAttribute("contenteditable", "true");
    document.body.appendChild(editable);
    expect(willOpenKeyboard(editable)).toBe(true);
    const notEditable = document.createElement("div");
    notEditable.setAttribute("contenteditable", "false");
    expect(willOpenKeyboard(notEditable)).toBe(false);
  });

  it("ボタン類・チェックボックス・読み取り専用・ボタン要素では出ない", () => {
    expect(willOpenKeyboard(input("checkbox"))).toBe(false);
    expect(willOpenKeyboard(input("submit"))).toBe(false);
    expect(willOpenKeyboard(input("range"))).toBe(false);
    const readOnly = input("text");
    readOnly.readOnly = true;
    expect(willOpenKeyboard(readOnly)).toBe(false);
    expect(willOpenKeyboard(document.createElement("button"))).toBe(false);
    expect(willOpenKeyboard(null)).toBe(false);
  });
});

describe("hasDocumentAnchoredOverlay", () => {
  let lockRoot: HTMLElement;

  beforeEach(() => {
    document.body.innerHTML = "";
    const app = document.createElement("div");
    app.setAttribute("data-overlay-container", "true");
    lockRoot = document.createElement("div");
    lockRoot.setAttribute("data-scroll-lock-root", "");
    app.appendChild(lockRoot);
    document.body.appendChild(app);
  });

  it("body 直下に top 付きの absolute 要素があれば true", () => {
    appendAnchoredOverlay(1555);
    expect(hasDocumentAnchoredOverlay(document.body, lockRoot)).toBe(true);
  });

  it("何も無ければ false", () => {
    expect(hasDocumentAnchoredOverlay(document.body, lockRoot)).toBe(false);
  });

  it("top を指定しない absolute 要素(next-route-announcer)は対象にしない", () => {
    const announcer = document.createElement("next-route-announcer");
    announcer.style.position = "absolute";
    announcer.style.height = "1px";
    document.body.appendChild(announcer);
    expect(hasDocumentAnchoredOverlay(document.body, lockRoot)).toBe(false);
  });

  it("ページ内容ラッパーを含む要素は見ない", () => {
    const app = lockRoot.parentElement as HTMLElement;
    app.style.position = "absolute";
    app.style.top = "0px";
    expect(hasDocumentAnchoredOverlay(document.body, lockRoot)).toBe(false);
  });

  it("display:none の要素は対象にしない", () => {
    const el = appendAnchoredOverlay(1555);
    el.style.display = "none";
    expect(hasDocumentAnchoredOverlay(document.body, lockRoot)).toBe(false);
  });

  it("中身がオーバーレイでない absolute 要素(認証 iframe など)は対象にしない", () => {
    appendResidentAbsolute();
    expect(hasDocumentAnchoredOverlay(document.body, lockRoot)).toBe(false);
  });
});

// react-aria が付ける aria-hidden(補助トリガー)。メニューを開いたまま項目からモーダルを開くと
// html の overflow:hidden は途切れず変化しないので、フックはこちらでモーダルの開始を知る
function setAppRootAriaHidden(hidden: boolean) {
  const app = document.querySelector("[data-overlay-container]") as HTMLElement;
  if (hidden) app.setAttribute("aria-hidden", "true");
  else app.removeAttribute("aria-hidden");
}

describe("useModalBackgroundScrollLock", () => {
  let lockRoot: HTMLElement;
  let scrollToSpy: ReturnType<typeof vi.fn>;
  const originals = {
    maxTouchPoints: Object.getOwnPropertyDescriptor(navigator, "maxTouchPoints"),
    scrollTo: Object.getOwnPropertyDescriptor(window, "scrollTo"),
    scrollY: Object.getOwnPropertyDescriptor(window, "scrollY"),
  };

  beforeEach(() => {
    vi.useFakeTimers();
    // タッチ端末でだけ動く
    Object.defineProperty(navigator, "maxTouchPoints", { value: 5, configurable: true });
    scrollToSpy = vi.fn();
    Object.defineProperty(window, "scrollTo", { value: scrollToSpy, configurable: true, writable: true });
    setScrollY(1500);

    document.body.innerHTML = "";
    document.documentElement.style.overflow = "";
    const app = document.createElement("div");
    app.setAttribute("data-overlay-container", "true");
    lockRoot = document.createElement("div");
    lockRoot.setAttribute("data-scroll-lock-root", "");
    app.appendChild(lockRoot);
    document.body.appendChild(app);
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    for (const [name, desc] of [
      ["maxTouchPoints", originals.maxTouchPoints],
      ["scrollTo", originals.scrollTo],
      ["scrollY", originals.scrollY],
    ] as const) {
      const target = name === "maxTouchPoints" ? navigator : window;
      if (desc) Object.defineProperty(target, name, desc);
      else delete (target as unknown as Record<string, unknown>)[name];
    }
  });

  it("モーダルを開いただけでは固定せず、閉じてもスクロール位置を触らない", async () => {
    renderHook(() => useModalBackgroundScrollLock());

    const dialog = openModal();
    await flushObservers();
    expect(lockRoot.style.position).toBe("");

    // ボタンへのフォーカス(キーボードは出ない)でも固定しない
    focusButton(dialog);
    expect(lockRoot.style.position).toBe("");

    closeModal(dialog);
    await flushObservers();
    expect(scrollToSpy).not.toHaveBeenCalled();
  });

  it("モーダルの中の入力にフォーカスするとページ内容ラッパーを今の位置で固定し、閉じると戻す", async () => {
    renderHook(() => useModalBackgroundScrollLock());

    const dialog = openModal();
    await flushObservers();
    focusInput(dialog);

    expect(lockRoot.style.position).toBe("fixed");
    expect(lockRoot.style.top).toBe("-1500px");

    // フォーカスが外れても閉じるまで固定を保つ(出入りのたびに切り替えない)
    focusButton(dialog);
    expect(lockRoot.style.position).toBe("fixed");

    closeModal(dialog);
    await flushObservers();

    expect(lockRoot.style.position).toBe("");
    expect(scrollToSpy).toHaveBeenCalledWith({ top: 1500, behavior: "instant" });
  });

  it("textarea や contenteditable(DatePicker の桁)でも固定する", async () => {
    renderHook(() => useModalBackgroundScrollLock());

    const dialog = openModal();
    await flushObservers();
    focusInput(dialog, "textarea");
    expect(lockRoot.style.position).toBe("fixed");
    closeModal(dialog);
    await flushObservers();

    const dialog2 = openModal();
    await flushObservers();
    const editable = document.createElement("div");
    editable.setAttribute("contenteditable", "true");
    editable.tabIndex = 0;
    dialog2.appendChild(editable);
    editable.focus();
    expect(lockRoot.style.position).toBe("fixed");
    closeModal(dialog2);
    await flushObservers();
  });

  it("開いた時点で入力にフォーカスがある(autoFocus)なら、その場で固定する", async () => {
    renderHook(() => useModalBackgroundScrollLock());

    const dialog = document.createElement("section");
    dialog.setAttribute("role", "dialog");
    dialog.setAttribute("aria-modal", "true");
    document.body.appendChild(dialog);
    focusInput(dialog);
    document.documentElement.style.overflow = "hidden";
    await flushObservers();

    expect(lockRoot.style.position).toBe("fixed");
  });

  it("閉じかけのメニュー(文書座標のオーバーレイ)が残っている間は固定を待ち、消えたら固定する", async () => {
    renderHook(() => useModalBackgroundScrollLock());

    // メニューを開いたまま、その項目から入力のあるモーダルを開き、すぐ入力にフォーカスした状態
    const menu = appendAnchoredOverlay(1555);
    const dialog = openModal();
    await flushObservers();
    focusInput(dialog);

    expect(lockRoot.style.position).toBe("");

    // 退場アニメーションが終わってメニューが外れる
    menu.remove();
    await flushObservers();

    expect(lockRoot.style.position).toBe("fixed");
    expect(lockRoot.style.top).toBe("-1500px");

    closeModal(dialog);
    await flushObservers();
    expect(lockRoot.style.position).toBe("");
  });

  it("オーバーレイが消えなくても上限を過ぎたら固定する", async () => {
    renderHook(() => useModalBackgroundScrollLock());

    appendAnchoredOverlay(1555);
    const dialog = openModal();
    await flushObservers();
    focusInput(dialog);
    expect(lockRoot.style.position).toBe("");

    vi.advanceTimersByTime(499);
    expect(lockRoot.style.position).toBe("");

    vi.advanceTimersByTime(1);
    expect(lockRoot.style.position).toBe("fixed");
  });

  it("待っている間にモーダルが閉じたら固定しない", async () => {
    renderHook(() => useModalBackgroundScrollLock());

    const menu = appendAnchoredOverlay(1555);
    const dialog = openModal();
    await flushObservers();
    focusInput(dialog);
    expect(lockRoot.style.position).toBe("");

    closeModal(dialog);
    await flushObservers();
    menu.remove();
    await flushObservers();
    vi.advanceTimersByTime(500);

    expect(lockRoot.style.position).toBe("");
    expect(scrollToSpy).not.toHaveBeenCalled();
  });

  it("実経路: メニューを開いたまま項目からモーダルを開く(overflow は途切れず aria-hidden で知る)", async () => {
    renderHook(() => useModalBackgroundScrollLock());

    // メニュー表示中: scroll ブロックは掛かるがモーダルではない → 何もしない
    const menu = appendAnchoredOverlay(1555);
    document.documentElement.style.overflow = "hidden";
    await flushObservers();
    expect(lockRoot.style.position).toBe("");

    // 項目を選ぶ: 同じコミットでモーダルが開き、react-aria が背面を aria-hidden にする。
    // html の overflow は hidden のまま変化しない
    const dialog = document.createElement("section");
    dialog.setAttribute("role", "dialog");
    dialog.setAttribute("aria-modal", "true");
    document.body.appendChild(dialog);
    setAppRootAriaHidden(true);
    await flushObservers();
    focusInput(dialog);
    expect(lockRoot.style.position).toBe("");

    // メニューの退場アニメーションが終わる
    menu.remove();
    await flushObservers();
    expect(lockRoot.style.position).toBe("fixed");
    expect(lockRoot.style.top).toBe("-1500px");

    dialog.remove();
    setAppRootAriaHidden(false);
    document.documentElement.style.overflow = "";
    await flushObservers();
    expect(lockRoot.style.position).toBe("");
    expect(scrollToSpy).toHaveBeenCalledWith({ top: 1500, behavior: "instant" });
  });

  it("固定済みのモーダルの中でメニューを開いても(オーバーレイが現れても)固定は保たれる", async () => {
    renderHook(() => useModalBackgroundScrollLock());

    const dialog = openModal();
    await flushObservers();
    focusInput(dialog);
    expect(lockRoot.style.position).toBe("fixed");

    const select = appendAnchoredOverlay(300);
    await flushObservers();
    vi.advanceTimersByTime(500);
    expect(lockRoot.style.position).toBe("fixed");

    select.remove();
    closeModal(dialog);
    await flushObservers();
    expect(lockRoot.style.position).toBe("");
    expect(scrollToSpy).toHaveBeenCalledTimes(1);
  });

  it("待っている間にページが動いても、閉じたときは開く前の位置へ戻す", async () => {
    renderHook(() => useModalBackgroundScrollLock());

    const menu = appendAnchoredOverlay(1555);
    const dialog = openModal();
    await flushObservers();
    focusInput(dialog);
    expect(lockRoot.style.position).toBe("");

    // iOS がキーボード表示に合わせてページを動かしたとする
    setScrollY(1800);
    menu.remove();
    await flushObservers();

    // 固定は今見えている位置で
    expect(lockRoot.style.position).toBe("fixed");
    expect(lockRoot.style.top).toBe("-1800px");

    closeModal(dialog);
    await flushObservers();
    expect(scrollToSpy).toHaveBeenCalledWith({ top: 1500, behavior: "instant" });
  });

  it("オーバーレイが DOM に残ったまま display:none になっても固定する", async () => {
    renderHook(() => useModalBackgroundScrollLock());

    const menu = appendAnchoredOverlay(1555);
    const dialog = openModal();
    await flushObservers();
    focusInput(dialog);
    expect(lockRoot.style.position).toBe("");

    menu.style.display = "none";
    await flushObservers();
    expect(lockRoot.style.position).toBe("fixed");
  });

  it("待っている間に増えたオーバーレイが style で消えても固定する", async () => {
    renderHook(() => useModalBackgroundScrollLock());

    const first = appendAnchoredOverlay(1555);
    const dialog = openModal();
    await flushObservers();
    focusInput(dialog);
    expect(lockRoot.style.position).toBe("");

    const second = appendAnchoredOverlay(900);
    await flushObservers();
    first.remove();
    await flushObservers();
    expect(lockRoot.style.position).toBe("");

    second.style.display = "none";
    await flushObservers();
    expect(lockRoot.style.position).toBe("fixed");
  });

  it("常駐する absolute 要素(認証 iframe など)が居ても待たない", async () => {
    renderHook(() => useModalBackgroundScrollLock());

    appendResidentAbsolute();
    const dialog = openModal();
    await flushObservers();
    focusInput(dialog);

    expect(lockRoot.style.position).toBe("fixed");
  });

  it("top を持たない absolute 要素(next-route-announcer)が居ても待たない", async () => {
    renderHook(() => useModalBackgroundScrollLock());

    const announcer = document.createElement("next-route-announcer");
    announcer.style.position = "absolute";
    document.body.appendChild(announcer);
    const dialog = openModal();
    await flushObservers();
    focusInput(dialog);

    expect(lockRoot.style.position).toBe("fixed");
  });
});
