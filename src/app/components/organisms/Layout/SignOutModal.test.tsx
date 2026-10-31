// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const handleSignOut = vi.fn<() => Promise<void>>();
vi.mock("@app/handlers/handleSignOut", () => ({ handleSignOut: () => handleSignOut() }));

import SignOutModal from "@app/components/organisms/Layout/SignOutModal";

beforeEach(() => {
  handleSignOut.mockReset();
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

function renderModal() {
  render(
    <SignOutModal iconUrl="/icon-512x512.png" isDevEnv={false} isOpen onOpenChange={() => {}} />,
  );
  return {
    signOut: screen.getByRole("button", { name: "ログアウト" }),
    cancel: screen.getByRole("button", { name: "キャンセル" }),
  };
}

describe("SignOutModal", () => {
  it("ログアウトを連打しても処理は 1 回しか走らず、処理中はキャンセルも押せない", async () => {
    let finish!: () => void;
    handleSignOut.mockImplementation(() => new Promise<void>((resolve) => { finish = resolve; }));
    const { signOut, cancel } = renderModal();

    fireEvent.click(signOut);
    fireEvent.click(signOut);
    fireEvent.click(signOut);

    await waitFor(() => expect(signOut.hasAttribute("disabled")).toBe(true));
    expect(handleSignOut).toHaveBeenCalledTimes(1);
    expect(cancel.hasAttribute("disabled")).toBe(true);

    finish();
  });

  it("成功したのに遷移が始まらなければ、しばらくして処理中を解く", async () => {
    // 逃げ道のタイマーを進めるため、押す前からフェイクタイマーにする
    vi.useFakeTimers();
    handleSignOut.mockResolvedValue(undefined);
    const { signOut, cancel } = renderModal();

    await act(async () => {
      fireEvent.click(signOut);
    });
    await act(async () => {
      await Promise.resolve();
    });
    expect(handleSignOut).toHaveBeenCalledTimes(1);
    expect(signOut.hasAttribute("disabled")).toBe(true);

    await act(async () => {
      vi.advanceTimersByTime(4999);
    });
    expect(signOut.hasAttribute("disabled")).toBe(true);

    await act(async () => {
      vi.advanceTimersByTime(1);
    });
    expect(signOut.hasAttribute("disabled")).toBe(false);
    expect(cancel.hasAttribute("disabled")).toBe(false);
  });

  it("失敗したら処理中を解いて押し直せる", async () => {
    handleSignOut.mockRejectedValueOnce(new Error("network"));
    handleSignOut.mockImplementationOnce(() => new Promise<void>(() => {}));
    vi.spyOn(console, "error").mockImplementation(() => {});
    const { signOut } = renderModal();

    fireEvent.click(signOut);
    await waitFor(() => expect(handleSignOut).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(signOut.hasAttribute("disabled")).toBe(false));

    fireEvent.click(signOut);
    await waitFor(() => expect(handleSignOut).toHaveBeenCalledTimes(2));
  });
});
