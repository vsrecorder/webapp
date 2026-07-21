import { signIn } from "next-auth/react";
import { FirebaseError } from "firebase/app";
import { deleteUser, getAdditionalUserInfo, signInWithPopup } from "firebase/auth";
import type { AuthProvider, UserCredential } from "firebase/auth";

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
//
// これはあくまで「ハングした場合の最終手段」であり、認証にかかる時間の上限ではない。
// 短くすると、二段階認証のコード入力やパスワードの再設定などで時間がかかっただけの
// ユーザまで打ち切ってしまい、しかも認証が遅れて成功した場合は
// rollbackNewFirebaseUser で作成済みのアカウントを消してしまう。
// 一方、長くしても実害は「ポップアップを放置した場合にボタンのローディングが続く」だけで、
// ユーザがポップアップを閉じれば popup-closed-by-user が発火して即座にエラーになる。
// そのため誤って打ち切らない側に倒して長めに取る。
const POPUP_TIMEOUT_MS = 300_000;

export type SignInErrorStatus = "cancelled" | "timeout" | "failed";

// Firebase の認証ユーザは signInWithPopup が成功した時点で作成される。
// そこから NextAuth へのサインイン（＝DBへのユーザ登録）まで辿り着けなかった場合、
// 何もしないと「Firebaseにだけアカウントが存在する」状態で取り残されてしまう。
// このサインインで新規作成されたユーザに限り、削除してサインイン前の状態に戻す。
const rollbackNewFirebaseUser = async (credential: UserCredential) => {
  if (!getAdditionalUserInfo(credential)?.isNewUser) {
    return;
  }

  try {
    await deleteUser(credential.user);
  } catch (error) {
    // 消し残した場合はサーバ側の登録処理か cmd/check-firebase-users での回収に委ねる
    console.error("Failed to roll back firebase user:", error);
  }
};

// Firebase 側のサインイン状態を解除する。
// 失敗しても後続の遷移は続けたいので、ここで握り潰す。
const signOutFromFirebase = async () => {
  try {
    await firebaseClientAuth.signOut();
  } catch (error) {
    console.error("Failed to sign out from firebase:", error);
  }
};

export const handleSignIn = async (
  provider: AuthProvider,
  redirectPathname: string,
  setIsLoading: React.Dispatch<React.SetStateAction<boolean>>,
  setErrorStatus?: React.Dispatch<React.SetStateAction<SignInErrorStatus | null>>,
) => {
  let timedOut = false;
  let credential: UserCredential | null = null;

  try {
    setIsLoading(true);
    setErrorStatus?.(null);

    const signInPromise = signInWithPopup(firebaseClientAuth, provider);

    // タイムアウトで打ち切った後にポップアップ側の認証が完了した場合、
    // その結果は誰にも受け取られないまま Firebase にだけアカウントが残る。
    // 遅れて解決したときも取りこぼさないようここでロールバックする。
    signInPromise.then(
      (result) => {
        if (timedOut) {
          void rollbackNewFirebaseUser(result);
        }
      },
      () => {
        // 認証自体の失敗はアカウントが作られないため、下の catch 側の処理に任せる
      },
    );

    // Firebase でログイン（タイムアウトとの競争にする）
    credential = await new Promise<UserCredential>((resolve, reject) => {
      const timer = setTimeout(() => {
        timedOut = true;
        reject(new Error("signInWithPopup timed out"));
      }, POPUP_TIMEOUT_MS);

      signInPromise.then(
        (result) => {
          clearTimeout(timer);
          resolve(result);
        },
        (error) => {
          clearTimeout(timer);
          reject(error);
        },
      );
    });

    const idToken = await credential.user.getIdToken(true);

    // NextAuth に渡してサインイン。
    //
    // redirect:false にして遷移先を自分で決めている。
    // authorize が投げる CredentialsSignin は kind が "signIn" のため、
    // NextAuth は pages.error ではなく pages.signIn（未設定なら /api/auth/signin）へ
    // 飛ばしてしまい、用意した案内画面に辿り着けないため。
    const result = await signIn("credentials", {
      callbackUrl: redirectPathname,
      idToken,
      redirect: false,
    });

    if (result.ok && !result.error) {
      // 成功。サーバ側で発行されたセッションを読み込ませるため画面ごと遷移する
      window.location.href = result.url ?? redirectPathname;
      return result;
    }

    setIsLoading(false);
    console.error("Failed to sign in:", result.error, result.code);

    // サインインが成立しなかった以上、このサインインで作られた認証ユーザは
    // DB未登録のまま取り残される。サーバ側でも削除しているが、ID トークンの検証に
    // 失敗した場合など、サーバ側があえて削除しない経路もあるためここでも取り消す。
    // 既存ユーザ(isNewUser === false)は対象外なので、退会済みアカウントには影響しない。
    await rollbackNewFirebaseUser(credential);

    if (result.code === "withdrawn") {
      // 退会済みのアカウント。認証ユーザはサーバ側で削除済みなので、
      // ブラウザに残っているサインイン状態も消してからトップページへ戻す。
      await signOutFromFirebase();
      window.location.href = "/?notice=withdrawn";
      return result;
    }

    if (result.code === "backend_unavailable" || result.code === "registration_failed") {
      window.location.href = `/auth/error?code=${result.code}`;
      return result;
    }

    setErrorStatus?.("failed");

    return result;
  } catch (error) {
    setIsLoading(false);

    // Firebase の認証だけ成功して NextAuth へ渡せなかった場合（回線断など）は、
    // DB未登録のアカウントが残らないよう Firebase 側を取り消す。
    if (credential) {
      await rollbackNewFirebaseUser(credential);
    }

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
