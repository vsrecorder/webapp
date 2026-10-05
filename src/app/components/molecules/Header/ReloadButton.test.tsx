// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import ReloadButton from "@app/components/molecules/Header/ReloadButton";
import {
  RELOAD_BUTTON_ATTR,
  RELOAD_RESTORE_END_EVENT,
  RELOAD_RESTORING_ATTR,
  RELOAD_SCROLL_KEY,
} from "@app/utils/reloadScrollRestore";

const reload = vi.fn();

function stubReload() {
  vi.stubGlobal("location", { ...window.location, href: window.location.href, reload });
}

afterEach(() => {
  cleanup();
  reload.mockClear();
  vi.unstubAllGlobals();
  sessionStorage.clear();
  document.documentElement.removeAttribute(RELOAD_RESTORING_ATTR);
});

const button = () => screen.getByRole("button", { name: "ページを再読み込み" });

describe("ReloadButton", () => {
  it("押すと位置を保存して再読み込みする", () => {
    stubReload();
    render(<ReloadButton />);

    fireEvent.click(button());

    expect(reload).toHaveBeenCalledTimes(1);
    expect(sessionStorage.getItem(RELOAD_SCROLL_KEY)).not.toBeNull();
  });

  it("直前の位置へ戻している最中は押せず、終わると押せるようになる", () => {
    // 途中で再読み込みすると、戻している途中の位置が保存されてしまう
    stubReload();
    document.documentElement.setAttribute(RELOAD_RESTORING_ATTR, "1500");
    render(<ReloadButton />);

    expect((button() as HTMLButtonElement).disabled).toBe(true);
    // 無効の間もタップをボタン自身で受け止める(すり抜けて下で click にならないように)
    expect(button().className).toContain("pointer-events-auto");
    expect(button().className).not.toContain("pointer-events-none");
    fireEvent.click(button());
    expect(reload).not.toHaveBeenCalled();

    act(() => {
      document.documentElement.removeAttribute(RELOAD_RESTORING_ATTR);
      window.dispatchEvent(new Event(RELOAD_RESTORE_END_EVENT));
    });

    expect((button() as HTMLButtonElement).disabled).toBe(false);
    fireEvent.click(button());
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it("押せる状態で描かれていても、押した時点で戻している最中なら何もしない", () => {
    // ハイドレーション直後の描画はサーバの値(押せる)のまま。ハイドレーション前のタップも
    // React がその描画に対して送り直してくる
    stubReload();
    render(<ReloadButton />);
    document.documentElement.setAttribute(RELOAD_RESTORING_ATTR, "1500");

    fireEvent.click(button());
    expect(reload).not.toHaveBeenCalled();
  });

  it("復元スクリプトが click を無視するための目印を持つ", () => {
    render(<ReloadButton />);
    expect(button().hasAttribute(RELOAD_BUTTON_ATTR)).toBe(true);
  });
});
