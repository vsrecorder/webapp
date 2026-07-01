import { signIn } from "next-auth/react";
import { FirebaseError } from "firebase/app";
import { signInWithPopup } from "firebase/auth";
import type { AuthProvider } from "firebase/auth";

import { firebaseClientAuth } from "@firebase/client";

// ユーザ自身の操作でポップアップを閉じた／認可を拒否した場合に発生するエラーコード
const CANCELLED_ERROR_CODES = [
  "auth/popup-closed-by-user",
  "auth/cancelled-popup-request",
  "auth/user-cancelled",
];

// ポップアップ内でブラウザバックされた場合、ウィンドウ自体は閉じられないため
// Firebase の popup-closed 検知（window.closed のポーリング）が働かず
// signInWithPopup が解決も拒否もされないまま止まってしまう。
// クロスオリジンの都合上その状態を直接検知する手段がないため、タイムアウトで打ち切る。
const POPUP_TIMEOUT_MS = 60_000;

export type SignInErrorStatus = "cancelled" | "timeout" | "failed";

export const handleSignIn = async (
  provider: AuthProvider,
  redirectPathname: string,
  setIsLoading: React.Dispatch<React.SetStateAction<boolean>>,
  setErrorStatus?: React.Dispatch<React.SetStateAction<SignInErrorStatus | null>>,
) => {
  let timedOut = false;

  try {
    setIsLoading(true);
    setErrorStatus?.(null);

    // Firebase でログイン（タイムアウトとの競争にする）
    const credential = await new Promise<Awaited<ReturnType<typeof signInWithPopup>>>(
      (resolve, reject) => {
        const timer = setTimeout(() => {
          timedOut = true;
          reject(new Error("signInWithPopup timed out"));
        }, POPUP_TIMEOUT_MS);

        signInWithPopup(firebaseClientAuth, provider).then(
          (result) => {
            clearTimeout(timer);
            resolve(result);
          },
          (error) => {
            clearTimeout(timer);
            reject(error);
          },
        );
      },
    );

    const idToken = await credential.user.getIdToken(true);

    // NextAuth に渡してサインイン
    const result = await signIn("credentials", {
      callbackUrl: redirectPathname,
      idToken,
      redirect: true,
    });

    return result;
  } catch (error) {
    setIsLoading(false);

    if (timedOut) {
      setErrorStatus?.("timeout");
      return;
    }

    console.error(error);

    if (error instanceof FirebaseError && CANCELLED_ERROR_CODES.includes(error.code)) {
      setErrorStatus?.("cancelled");
    } else {
      setErrorStatus?.("failed");
    }
  }
};
