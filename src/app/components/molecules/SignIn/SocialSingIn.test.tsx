// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { SignInErrorStatus } from "@app/handlers/handleSignIn";

/*
 * ログインボタン群の結果表示。キャンセルは利用者自身の操作なので、失敗(赤い警告)と同じ見せ方にせず
 * 通常色の案内で出す。ログイン処理そのものは差し替え、結果を state に書く部分だけを真似る
 */

const handleSignIn = vi.hoisted(() => vi.fn());
vi.mock("@app/handlers/handleSignIn", () => ({ handleSignIn }));
vi.mock("next/navigation", () => ({ usePathname: () => "/" }));
vi.mock("firebase/auth", () => ({
  GoogleAuthProvider: class {},
  TwitterAuthProvider: class {},
}));

import SocialSignIn from "./SocialSingIn";

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

type SetLoading = (isLoading: boolean) => void;
type SetStatus = (status: SignInErrorStatus | null) => void;

// 押したログインが status で終わったことにする
const endWith = (status: SignInErrorStatus) => {
  handleSignIn.mockImplementation(
    async (_provider: unknown, _path: string, setIsLoading: SetLoading, setStatus: SetStatus) => {
      setIsLoading(false);
      setStatus(status);
    },
  );
};

const pressGoogle = () => fireEvent.click(screen.getAllByRole("button")[0]);

describe("SocialSignIn のログイン結果の表示", () => {
  it("キャンセルは赤い警告(alert)ではなく、通常色の案内(status)で出す", async () => {
    endWith("cancelled");
    render(<SocialSignIn />);
    pressGoogle();

    const status = await screen.findByRole("status");
    expect(status.textContent).toBe("ログインをキャンセルしました");
    expect(status.className).toContain("text-default-500");
    expect(status.className).not.toContain("text-danger");
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("案内が無いときも 1 行分の枠を確保しておき、案内はその枠の中に出す(モーダルの高さが変わらない)", async () => {
    endWith("cancelled");
    const { container } = render(<SocialSignIn />);

    const slot = container.querySelector(".min-h-4");
    expect(slot).not.toBeNull();
    expect(slot!.textContent).toBe("");

    pressGoogle();
    const status = await screen.findByRole("status");
    expect(slot!.contains(status)).toBe(true);
  });

  it("新規登録の文脈では「登録をキャンセルしました」になる", async () => {
    endWith("cancelled");
    render(<SocialSignIn mode="signup" />);
    pressGoogle();

    expect((await screen.findByRole("status")).textContent).toBe("登録をキャンセルしました");
  });

  it("失敗は赤い警告(alert)で出し、キャンセルの案内は出さない", async () => {
    endWith("failed");
    render(<SocialSignIn />);
    pressGoogle();

    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toBe("ログインに失敗しました。時間をおいて再度お試しください");
    expect(alert.className).toContain("text-danger");
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("もう一度押すと前回の案内は消える(handleSignIn が開始時に null へ戻す)", async () => {
    endWith("cancelled");
    render(<SocialSignIn />);
    pressGoogle();
    await screen.findByRole("status");

    // 2 回目は結果を書かずに処理中のままにする
    handleSignIn.mockImplementation(
      async (_provider: unknown, _path: string, setIsLoading: SetLoading, setStatus: SetStatus) => {
        setIsLoading(true);
        setStatus(null);
      },
    );
    pressGoogle();

    expect(screen.queryByRole("status")).toBeNull();
    expect(screen.queryByRole("alert")).toBeNull();
  });
});
