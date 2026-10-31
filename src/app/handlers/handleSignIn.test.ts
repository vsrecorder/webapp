// @vitest-environment jsdom
import { FirebaseError } from "firebase/app";
import type { AuthProvider, UserCredential } from "firebase/auth";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/*
 * ログイン処理のうち、Firebase の結果を待つ部分の分岐。
 *  - 利用者がポップアップを閉じたのを見張りが知らせたら、Firebase の通知を待たずキャンセル扱いにする
 *  - 結果の要求(signInWithIdp)が始まったことを閉じ検知に伝える(閉じても「やめた」ではない)
 *  - その直後に認証が成功していたら、キャンセル表示を取り下げてログインを進める。別のページへ
 *    移っていたら、押した時点の戻り先へ飛ばさずに今いるページを読み直す
 *  - 放置して打ち切った(タイムアウト)あとの結果ではログインしない
 * Firebase・next-auth・GA・見張り・画面遷移は差し替え、ブラウザのポップアップは開かない
 */

const mocks = vi.hoisted(() => ({
  signInWithPopup: vi.fn(),
  getAdditionalUserInfo: vi.fn(),
  deleteUser: vi.fn(),
  signIn: vi.fn(),
  sendGAEvent: vi.fn(),
  watchPopupClosed: vi.fn(),
  watchFetchStart: vi.fn(),
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
vi.mock("@app/utils/popupClosedWatch", () => ({ watchPopupClosed: mocks.watchPopupClosed }));
vi.mock("@app/utils/fetchStartWatch", () => ({ watchFetchStart: mocks.watchFetchStart }));
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

// 積まれたマイクロタスクと 0ms タイマーを流し切る
const flush = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

const provider = {} as AuthProvider;

const credentialOf = (uid: string): UserCredential =>
  ({
    user: { uid, getIdToken: vi.fn().mockResolvedValue(`token-${uid}`) },
  }) as unknown as UserCredential;

// 見張りに渡された関数を取り出す
let notifyPopupClosed: (() => void) | null = null;
let popupWatchOptions: { shouldIgnoreClose?: () => boolean } = {};
let fetchWatch: { matches: (url: string) => boolean; onStart: () => void } | null = null;
const stopPopupWatch = vi.fn();
const stopFetchWatch = vi.fn();

beforeEach(() => {
  notifyPopupClosed = null;
  popupWatchOptions = {};
  fetchWatch = null;
  mocks.watchPopupClosed.mockImplementation(
    (onClosed: () => void, options: { shouldIgnoreClose?: () => boolean } = {}) => {
      notifyPopupClosed = onClosed;
      popupWatchOptions = options;
      return stopPopupWatch;
    },
  );
  mocks.watchFetchStart.mockImplementation(
    (matches: (url: string) => boolean, onStart: () => void) => {
      fetchWatch = { matches, onStart };
      return stopFetchWatch;
    },
  );
  mocks.getAdditionalUserInfo.mockReturnValue({ isNewUser: false, providerId: "google.com" });
  mocks.signIn.mockResolvedValue({ ok: true, error: undefined, url: "/records" });
  window.history.replaceState({}, "", "/");
  // 失敗の記録を黙らせる(呼ばれたかどうかだけを見る)
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.clearAllMocks();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe("handleSignIn: ポップアップの閉じ検知", () => {
  it("見張りが閉じられたと知らせたら、Firebase の通知を待たずにキャンセル扱いで画面を戻す", async () => {
    const popupSignIn = deferred<UserCredential>();
    mocks.signInWithPopup.mockReturnValue(popupSignIn.promise);
    const setIsLoading = vi.fn();
    const setErrorStatus = vi.fn();

    const done = handleSignIn(provider, "/records", setIsLoading, setErrorStatus);

    // 開始時に処理中にし、前回の表示を消す
    expect(setIsLoading).toHaveBeenLastCalledWith(true);
    expect(setErrorStatus.mock.calls[0]).toEqual([null]);
    expect(mocks.watchPopupClosed).toHaveBeenCalledTimes(1);
    expect(mocks.watchFetchStart).toHaveBeenCalledTimes(1);
    // 見張りは window.open / fetch を包んでから開かせる必要があるので、signInWithPopup より先に仕掛ける
    expect(mocks.watchPopupClosed.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.signInWithPopup.mock.invocationCallOrder[0],
    );
    expect(mocks.watchFetchStart.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.signInWithPopup.mock.invocationCallOrder[0],
    );

    notifyPopupClosed!();
    await done;

    expect(setIsLoading).toHaveBeenLastCalledWith(false);
    expect(setErrorStatus).toHaveBeenLastCalledWith("cancelled");
    expect(stopPopupWatch).toHaveBeenCalled();
    expect(stopFetchWatch).toHaveBeenCalled();
    // キャンセルは利用者の操作なので失敗として記録しない
    expect(console.error).not.toHaveBeenCalled();

    // 8〜10 秒後に届く Firebase 側の通知は無視する(表示を二度変えず、記録もしない)
    const statusCalls = setErrorStatus.mock.calls.length;
    popupSignIn.reject(new FirebaseError("auth/popup-closed-by-user", "closed"));
    await flush();
    expect(setErrorStatus.mock.calls.length).toBe(statusCalls);
    expect(console.error).not.toHaveBeenCalled();
    expect(mocks.signIn).not.toHaveBeenCalled();
  });

  it("結果の要求(signInWithIdp)が始まったことを閉じ検知に伝える", async () => {
    const popupSignIn = deferred<UserCredential>();
    mocks.signInWithPopup.mockReturnValue(popupSignIn.promise);

    const done = handleSignIn(provider, "/records", vi.fn(), vi.fn());

    expect(popupWatchOptions.shouldIgnoreClose?.()).toBe(false);
    expect(
      fetchWatch!.matches("https://identitytoolkit.googleapis.com/v1/accounts:signInWithIdp?key=k"),
    ).toBe(true);
    expect(
      fetchWatch!.matches("https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=k"),
    ).toBe(false);

    fetchWatch!.onStart();
    expect(popupWatchOptions.shouldIgnoreClose?.()).toBe(true);

    popupSignIn.resolve(credentialOf("u0"));
    await done;
  });

  it("正常に結果が届いたら見張りを止め、ログインには 1 回だけ進む", async () => {
    const popupSignIn = deferred<UserCredential>();
    mocks.signInWithPopup.mockReturnValue(popupSignIn.promise);
    const setIsLoading = vi.fn();
    const setErrorStatus = vi.fn();

    const done = handleSignIn(provider, "/records", setIsLoading, setErrorStatus);
    popupSignIn.resolve(credentialOf("u1"));
    await done;
    await flush();

    expect(stopPopupWatch).toHaveBeenCalled();
    expect(stopFetchWatch).toHaveBeenCalled();
    expect(mocks.signIn).toHaveBeenCalledTimes(1);
    expect(mocks.navigateFullPage).toHaveBeenCalledTimes(1);
    expect(mocks.navigateFullPage).toHaveBeenCalledWith("/records");
    expect(mocks.reloadPage).not.toHaveBeenCalled();
    expect(setErrorStatus).not.toHaveBeenCalledWith("cancelled");
  });

  it("閉じられたと知らせた直後に認証が成功していたら、キャンセル表示を取り下げてログインを進める", async () => {
    const popupSignIn = deferred<UserCredential>();
    mocks.signInWithPopup.mockReturnValue(popupSignIn.promise);
    const setIsLoading = vi.fn();
    const setErrorStatus = vi.fn();

    const done = handleSignIn(provider, "/records", setIsLoading, setErrorStatus);
    notifyPopupClosed!();
    await done;
    expect(setErrorStatus).toHaveBeenLastCalledWith("cancelled");

    popupSignIn.resolve(credentialOf("u1"));
    await vi.waitFor(() => expect(mocks.signIn).toHaveBeenCalledTimes(1));

    expect(mocks.signIn).toHaveBeenCalledWith(
      "credentials",
      expect.objectContaining({ callbackUrl: "/records", idToken: "token-u1", redirect: false }),
    );
    expect(setIsLoading).toHaveBeenLastCalledWith(true);
    expect(setErrorStatus).toHaveBeenLastCalledWith(null);
    await vi.waitFor(() =>
      expect(mocks.sendGAEvent).toHaveBeenCalledWith("event", "login", { method: "google.com" }),
    );
    // 同じページに居るので、押した時点の戻り先へ画面ごと遷移する
    await vi.waitFor(() => expect(mocks.navigateFullPage).toHaveBeenCalledWith("/records"));
    expect(mocks.reloadPage).not.toHaveBeenCalled();
  });

  it("遅れて成功が届いたとき別のページへ移っていたら、戻り先へ飛ばさずに今いるページを読み直す", async () => {
    const popupSignIn = deferred<UserCredential>();
    mocks.signInWithPopup.mockReturnValue(popupSignIn.promise);

    const done = handleSignIn(provider, "/records", vi.fn(), vi.fn());
    notifyPopupClosed!();
    await done;

    // キャンセル表示を見てモーダルを閉じ、別のページへ移った
    window.history.pushState({}, "", "/decks?tab=mine");

    popupSignIn.resolve(credentialOf("u1"));
    await vi.waitFor(() => expect(mocks.signIn).toHaveBeenCalledTimes(1));
    await vi.waitFor(() => expect(mocks.reloadPage).toHaveBeenCalledTimes(1));
    expect(mocks.navigateFullPage).not.toHaveBeenCalled();
  });

  it("打ち切ったあとに届いた失敗のうち、キャンセル以外は記録する", async () => {
    const popupSignIn = deferred<UserCredential>();
    mocks.signInWithPopup.mockReturnValue(popupSignIn.promise);

    const done = handleSignIn(provider, "/records", vi.fn(), vi.fn());
    notifyPopupClosed!();
    await done;
    expect(console.error).not.toHaveBeenCalled();

    popupSignIn.reject(new Error("network down"));
    await flush();
    expect(console.error).toHaveBeenCalledWith(
      "Sign-in failed after being abandoned:",
      expect.any(Error),
    );
  });

  it("見張りが働かない環境で Firebase 自身が popup-closed-by-user を返したときもキャンセル扱い", async () => {
    mocks.signInWithPopup.mockRejectedValue(
      new FirebaseError("auth/popup-closed-by-user", "closed"),
    );
    const setIsLoading = vi.fn();
    const setErrorStatus = vi.fn();

    await handleSignIn(provider, "/records", setIsLoading, setErrorStatus);

    expect(setIsLoading).toHaveBeenLastCalledWith(false);
    expect(setErrorStatus).toHaveBeenLastCalledWith("cancelled");
    expect(stopPopupWatch).toHaveBeenCalled();
    expect(stopFetchWatch).toHaveBeenCalled();
    expect(console.error).not.toHaveBeenCalled();
    expect(mocks.signIn).not.toHaveBeenCalled();
  });

  it("キャンセル以外の失敗は failed にして記録する", async () => {
    mocks.signInWithPopup.mockRejectedValue(new Error("network down"));
    const setIsLoading = vi.fn();
    const setErrorStatus = vi.fn();

    await handleSignIn(provider, "/records", setIsLoading, setErrorStatus);

    expect(setIsLoading).toHaveBeenLastCalledWith(false);
    expect(setErrorStatus).toHaveBeenLastCalledWith("failed");
    expect(console.error).toHaveBeenCalled();
  });

  it("ポップアップを放置して 5 分たつと打ち切り、その後に届いた結果ではログインしない", async () => {
    vi.useFakeTimers();
    const popupSignIn = deferred<UserCredential>();
    mocks.signInWithPopup.mockReturnValue(popupSignIn.promise);
    const setIsLoading = vi.fn();
    const setErrorStatus = vi.fn();

    const done = handleSignIn(provider, "/records", setIsLoading, setErrorStatus);
    await vi.advanceTimersByTimeAsync(300_000);
    await done;

    expect(setIsLoading).toHaveBeenLastCalledWith(false);
    expect(setErrorStatus).toHaveBeenLastCalledWith("timeout");
    expect(stopPopupWatch).toHaveBeenCalled();
    expect(stopFetchWatch).toHaveBeenCalled();

    // 遅れて届いた結果は、取り消しの要否(新規かどうか)の判断には回すがログインには進めない
    popupSignIn.resolve(credentialOf("u2"));
    await vi.advanceTimersByTimeAsync(0);
    expect(mocks.getAdditionalUserInfo).toHaveBeenCalled();
    expect(mocks.signIn).not.toHaveBeenCalled();
    expect(mocks.navigateFullPage).not.toHaveBeenCalled();
    expect(mocks.reloadPage).not.toHaveBeenCalled();
  });
});
