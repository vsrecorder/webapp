// @vitest-environment jsdom
import type { AuthProvider, UserCredential } from "firebase/auth";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/*
 * handleSignIn と本物の見張り(utils/popupClosedWatch, utils/fetchStartWatch)の結線。
 * handleSignIn.test.ts は見張りを差し替えているので、ここでは Firebase の側だけを偽物にする:
 * signInWithPopup は window.open でハンドラを開き、認可が済むと window.fetch で結果(signInWithIdp)を
 * 取りに行く。モバイル/Firefox ではハンドラが先にポップアップを閉じるので、その順序を再現して
 * 「閉じてもキャンセルにならず、ログインまで進む」ことを確かめる
 */

const mocks = vi.hoisted(() => ({
  signInWithPopup: vi.fn(),
  getAdditionalUserInfo: vi.fn(),
  deleteUser: vi.fn(),
  signIn: vi.fn(),
  sendGAEvent: vi.fn(),
  navigateFullPage: vi.fn(),
  reloadPage: vi.fn(),
}));

vi.mock("firebase/auth", () => ({
  signInWithPopup: mocks.signInWithPopup,
  getAdditionalUserInfo: mocks.getAdditionalUserInfo,
  deleteUser: mocks.deleteUser,
}));
vi.mock("next-auth/react", () => ({ signIn: mocks.signIn }));
vi.mock("@next/third-parties/google", () => ({ sendGAEvent: mocks.sendGAEvent }));
vi.mock("@firebase/client", () => ({ firebaseClientAuth: { signOut: vi.fn() } }));
vi.mock("@app/utils/fullPageNavigation", () => ({
  navigateFullPage: mocks.navigateFullPage,
  reloadPage: mocks.reloadPage,
}));

import { handleSignIn } from "./handleSignIn";

type Deferred<T> = {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (error: unknown) => void;
};

const deferred = <T>(): Deferred<T> => {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
};

type FakePopup = { closed: boolean };

const IDP_URL = "https://identitytoolkit.googleapis.com/v1/accounts:signInWithIdp?key=k";
const provider = {} as AuthProvider;
const credential = {
  user: { uid: "u1", getIdToken: vi.fn().mockResolvedValue("token-u1") },
} as unknown as UserCredential;

const realOpen = window.open;
const realFetch = window.fetch;
let popup: FakePopup;
let fakeOpen: ReturnType<typeof vi.fn>;
let fakeFetch: ReturnType<typeof vi.fn>;
let popupSignIn: Deferred<UserCredential>;

beforeEach(() => {
  vi.useFakeTimers();
  popup = { closed: false };
  fakeOpen = vi.fn(() => popup as unknown as Window);
  window.open = fakeOpen as unknown as typeof window.open;
  fakeFetch = vi.fn(async () => "response" as unknown as Response);
  window.fetch = fakeFetch as unknown as typeof window.fetch;

  popupSignIn = deferred<UserCredential>();
  // Firebase は初期化のあと window.open でハンドラを開き、結果が出るまで解決しない
  mocks.signInWithPopup.mockImplementation(() => {
    window.open(
      "https://example.test/__/auth/handler?providerId=google.com",
      "auth",
      "width=500,height=600",
    );
    return popupSignIn.promise;
  });
  mocks.getAdditionalUserInfo.mockReturnValue({ isNewUser: false, providerId: "google.com" });
  mocks.signIn.mockResolvedValue({ ok: true, error: undefined, url: "/records" });
  window.history.replaceState({}, "", "/");
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.useRealTimers();
  window.open = realOpen;
  window.fetch = realFetch;
  vi.clearAllMocks();
  vi.restoreAllMocks();
});

// SDK が結果を取りに行く(呼び出しのたびに self.fetch を読むので、包まれた fetch を通る)
const sdkRequestsResult = () => window.fetch(IDP_URL, { method: "POST", body: "{}" });

describe("handleSignIn と見張りの結線", () => {
  it("利用者がポップアップを閉じると約 2 秒でキャンセル表示になり、包みは元に戻る", async () => {
    const setIsLoading = vi.fn();
    const setErrorStatus = vi.fn();

    const done = handleSignIn(provider, "/records", setIsLoading, setErrorStatus);
    await vi.advanceTimersByTimeAsync(0);

    expect(fakeOpen).toHaveBeenCalledTimes(1);
    // ポップアップを捕まえた時点で window.open は戻り、fetch は結果待ちの間だけ見張る
    expect(window.open).toBe(fakeOpen);
    expect(window.fetch).not.toBe(fakeFetch);

    popup.closed = true;
    await vi.advanceTimersByTimeAsync(500 + 1499);
    expect(setErrorStatus).not.toHaveBeenCalledWith("cancelled");
    await vi.advanceTimersByTimeAsync(1);
    await done;

    expect(setErrorStatus).toHaveBeenLastCalledWith("cancelled");
    expect(setIsLoading).toHaveBeenLastCalledWith(false);
    expect(window.fetch).toBe(fakeFetch);
    expect(mocks.signIn).not.toHaveBeenCalled();
  });

  it("モバイル/Firefox の成功の順序(結果の要求 → ハンドラが閉じる → 通信完了)ではキャンセルにせず、ログインまで進む", async () => {
    const setIsLoading = vi.fn();
    const setErrorStatus = vi.fn();

    const done = handleSignIn(provider, "/records", setIsLoading, setErrorStatus);
    await vi.advanceTimersByTimeAsync(0);

    // 認可が済み、SDK が結果を取りに行く(ハンドラが閉じる前に始まる)
    await sdkRequestsResult();
    expect(fakeFetch).toHaveBeenCalledTimes(1);
    // ハンドラがポップアップを閉じ、利用者は元のタブに戻ってくる
    popup.closed = true;
    document.dispatchEvent(new Event("visibilitychange"));

    // 通信が長引いても(10 秒)キャンセルにしない
    await vi.advanceTimersByTimeAsync(10_000);
    expect(setErrorStatus).not.toHaveBeenCalledWith("cancelled");
    expect(setIsLoading).not.toHaveBeenCalledWith(false);

    popupSignIn.resolve(credential);
    await vi.advanceTimersByTimeAsync(0);
    await done;

    expect(mocks.signIn).toHaveBeenCalledTimes(1);
    expect(mocks.navigateFullPage).toHaveBeenCalledWith("/records");
    expect(window.open).toBe(fakeOpen);
    expect(window.fetch).toBe(fakeFetch);
  });

  it("閉じたのに気づいた後、猶予の間に結果の要求が始まった場合もキャンセルにしない", async () => {
    const setErrorStatus = vi.fn();

    const done = handleSignIn(provider, "/records", vi.fn(), setErrorStatus);
    await vi.advanceTimersByTimeAsync(0);

    popup.closed = true;
    await vi.advanceTimersByTimeAsync(500); // 閉じたのに気づいて猶予に入る
    await sdkRequestsResult();
    await vi.advanceTimersByTimeAsync(1500); // 猶予が明ける
    expect(setErrorStatus).not.toHaveBeenCalledWith("cancelled");
    await vi.advanceTimersByTimeAsync(10_000);
    expect(setErrorStatus).not.toHaveBeenCalledWith("cancelled");

    popupSignIn.resolve(credential);
    await vi.advanceTimersByTimeAsync(0);
    await done;

    expect(mocks.signIn).toHaveBeenCalledTimes(1);
    expect(mocks.navigateFullPage).toHaveBeenCalledWith("/records");
    expect(window.fetch).toBe(fakeFetch);
  });

  it("正常にデスクトップで完了したとき(閉じる前に解決)は見張りが黙って止まり、包みは元に戻る", async () => {
    const setErrorStatus = vi.fn();

    const done = handleSignIn(provider, "/records", vi.fn(), setErrorStatus);
    await vi.advanceTimersByTimeAsync(0);

    await sdkRequestsResult();
    popupSignIn.resolve(credential);
    await vi.advanceTimersByTimeAsync(0);
    // SDK は解決した後にポップアップを閉じる
    popup.closed = true;
    await vi.advanceTimersByTimeAsync(10_000);
    await done;

    expect(setErrorStatus).not.toHaveBeenCalledWith("cancelled");
    expect(mocks.signIn).toHaveBeenCalledTimes(1);
    expect(window.open).toBe(fakeOpen);
    expect(window.fetch).toBe(fakeFetch);
  });
});
