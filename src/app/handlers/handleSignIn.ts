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

// ロールバック前のDB登録確認1回あたりのタイムアウト（ミリ秒）。
// エラー画面へ遷移する経路ではこの確認の完了を待ってから遷移するため、
// 応答が遅い場合は打ち切って「確認できなかった＝削除しない」側に倒す。
const ROLLBACK_CHECK_TIMEOUT_MS = 5000;

// ロールバック前にDBの登録状態を確認する回数と間隔。
// クライアントのfetchが失敗しても、リクエストを受け取ったサーバ側では
// 登録処理が続いていることがあり、1回の404だけで削除を確定すると
// INSERTコミット前の一瞬を「不在」と誤認しうる。そのため1回では確定させず、
// 間隔を空けて複数回確認する(サーバ側 auth.ts の checkUserExistence と同じ考え方)。
const ROLLBACK_CHECK_COUNT = 3;
const ROLLBACK_CHECK_INTERVAL_MS = 1000;

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

// DBにユーザが登録されていないことを確認できたときだけtrueを返す。
// 不在の確定は、全確認がcore-apiserver由来のJSON形式の404だった場合に限る。
// content-typeまで確認するのは、プロキシ層の障害時などはバックエンドを経由しない
// HTMLの404が返ることがあり、それを不在と誤認しないため
// (BFF側でも502に区別しているが、BFF自体に届かない404にも備えて二重に確認する)。
// 疎通できない場合や404以外の応答は、その時点でfalse(不在を確認できず)に倒す。
const isConfirmedAbsentInDb = async (uid: string): Promise<boolean> => {
  for (let attempt = 1; attempt <= ROLLBACK_CHECK_COUNT; attempt++) {
    let res: Response;

    try {
      res = await fetch(`/api/users/${encodeURIComponent(uid)}`, {
        cache: "no-store",
        signal: AbortSignal.timeout(ROLLBACK_CHECK_TIMEOUT_MS),
      });
    } catch (error) {
      console.error("Failed to check user existence before rollback:", error);
      return false;
    }

    const isBackendNotFound =
      res.status === 404 &&
      (res.headers.get("content-type") ?? "").includes("application/json");

    if (!isBackendNotFound) {
      return false;
    }

    if (attempt < ROLLBACK_CHECK_COUNT) {
      await sleep(ROLLBACK_CHECK_INTERVAL_MS);
    }
  }

  return true;
};

// Firebase の認証ユーザは signInWithPopup が成功した時点で作成される。
// そこから NextAuth へのサインイン（＝DBへのユーザ登録）まで辿り着けなかった場合、
// 何もしないと「Firebaseにだけアカウントが存在する」状態で取り残されてしまう。
// このサインインで新規作成され、かつDBに未登録であることを確認できたユーザに限り、
// 削除してサインイン前の状態に戻す。
//
// DBの確認を挟むのは、サーバ側でDB登録まで成功したのに応答だけが届かなかった場合
// （回線断など）に、確認せず削除すると「DBには居るのにログインできないユーザ」を
// 作ってしまうため。確認できない場合は削除しない側に倒す。削除を見送った認証ユーザは
// 次回サインイン時のDB登録で回収されるか、cmd/check-firebase-users で検出できる。
const rollbackNewFirebaseUser = async (credential: UserCredential) => {
  if (!getAdditionalUserInfo(credential)?.isNewUser) {
    return;
  }

  if (!(await isConfirmedAbsentInDb(credential.user.uid))) {
    console.warn("Skipped firebase user rollback because DB registration may have succeeded");
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

    // プロバイダ一覧の取得に失敗した場合など、next-auth 自身が画面遷移させて
    // 何も返さないことがある(型上はnon-nullだが実装上ありうる)。
    // 既に遷移が始まっているため、ここでは何もしない。
    if (!result) {
      return;
    }

    if (result.ok && !result.error) {
      // 成功。サーバ側で発行されたセッションを読み込ませるため画面ごと遷移する
      window.location.href = result.url ?? redirectPathname;
      return result;
    }

    setIsLoading(false);
    console.error("Failed to sign in:", result.error, result.code);

    // このサインインで作られた認証ユーザがDB未登録のまま取り残されている可能性がある。
    // サーバ側でも削除しているが、ID トークンの検証に失敗した場合など、
    // サーバ側があえて削除しない経路もあるためここでも取り消す。
    // 削除の要否は rollbackNewFirebaseUser 内でDBの登録状態を確認してから判断する。
    // 既存ユーザ(isNewUser === false)は対象外なので、退会済みアカウントには影響しない。
    //
    // ページ遷移する経路では、遷移によってロールバック中のfetchが中断されないよう
    // 完了を待ってから遷移する。同一画面でエラー表示する経路では、
    // 表示がロールバック(DB確認で数秒かかる)待ちにならないよう先に表示する。

    if (result.code === "withdrawn") {
      // 退会済みのアカウント。認証ユーザはサーバ側で削除済みなので、
      // ブラウザに残っているサインイン状態も消してからトップページへ戻す。
      // (既存アカウントのためロールバックは実質no-op)
      await rollbackNewFirebaseUser(credential);
      await signOutFromFirebase();
      window.location.href = "/?notice=withdrawn";
      return result;
    }

    if (result.code === "backend_unavailable" || result.code === "registration_failed") {
      await rollbackNewFirebaseUser(credential);
      window.location.href = `/auth/error?code=${result.code}`;
      return result;
    }

    setErrorStatus?.("failed");
    await rollbackNewFirebaseUser(credential);

    return result;
  } catch (error) {
    setIsLoading(false);

    // エラー表示がロールバック(DB確認で数秒かかる)待ちにならないよう先に表示する
    if (timedOut) {
      setErrorStatus?.("timeout");
    } else {
      console.error(error);

      if (error instanceof FirebaseError && CANCELLED_ERROR_CODES.includes(error.code)) {
        setErrorStatus?.("cancelled");
      } else {
        setErrorStatus?.("failed");
      }
    }

    // Firebase の認証だけ成功して NextAuth へ渡せなかった場合（回線断など）は、
    // DB未登録のアカウントが残らないよう Firebase 側を取り消す。
    // ただし回線断の場合、サーバ側ではDB登録まで成功していて応答だけが
    // 届かなかった可能性もある。その見極めも rollbackNewFirebaseUser に委ねる。
    if (credential) {
      await rollbackNewFirebaseUser(credential);
    }
  }
};
