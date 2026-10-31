import { signIn } from "next-auth/react";
import { FirebaseError } from "firebase/app";
import { deleteUser, getAdditionalUserInfo, signInWithPopup } from "firebase/auth";
import type { AuthProvider, UserCredential } from "firebase/auth";
import { sendGAEvent } from "@next/third-parties/google";

import { firebaseClientAuth } from "@firebase/client";

import { markAcquisitionSurveyPending } from "@app/utils/acquisitionSurvey";
import { readAttributionCookie } from "@app/utils/attribution";
import { watchFetchStart } from "@app/utils/fetchStartWatch";
import { navigateFullPage, reloadPage } from "@app/utils/fullPageNavigation";
import { watchPopupClosed } from "@app/utils/popupClosedWatch";

// ユーザ自身の操作でポップアップを閉じた／認可を拒否した場合に発生するエラーコード
const CANCELLED_ERROR_CODES = [
  "auth/popup-closed-by-user",
  "auth/cancelled-popup-request",
  "auth/user-cancelled",
];

// ポップアップ内でブラウザバックされた場合、ウィンドウ自体は閉じられないため
// Firebase の popup-closed 検知（window.closed のポーリング）も自前の見張り(下記)も働かず
// signInWithPopup が解決も拒否もされないまま止まってしまう。
// クロスオリジンの都合上その状態を直接検知する手段がないため、タイムアウトで打ち切る。
//
// これはあくまで「ハングした場合の最終手段」であり、認証にかかる時間の上限ではない。
// 短くすると、二段階認証のコード入力やパスワードの再設定などで時間がかかっただけの
// ユーザまで打ち切ってしまい、しかも認証が遅れて成功した場合は
// rollbackNewFirebaseUser で作成済みのアカウントを消してしまう。
// 一方、長くしても実害は「ポップアップを放置した場合にボタンのローディングが続く」だけで、
// ユーザがポップアップを閉じれば閉じ検知が働いて即座にキャンセル扱いになる。
// そのため誤って打ち切らない側に倒して長めに取る。
const POPUP_TIMEOUT_MS = 300_000;

// 認可が済んだあと SDK が結果(ID トークン)を取りに行く要求。これが始まっていれば認証は
// 成功しているので、ポップアップが閉じていても「利用者がやめた」ではない
const isSignInResultRequest = (url: string) => url.includes("/v1/accounts:signInWithIdp");

export type SignInErrorStatus = "cancelled" | "timeout" | "failed";

// Firebase の結果を待つのをこちらから打ち切った理由
type AbandonReason = "timeout" | "popup-closed";

class SignInAbandonedError extends Error {
  readonly reason: AbandonReason;

  constructor(reason: AbandonReason) {
    super(`sign-in abandoned: ${reason}`);
    this.reason = reason;
  }
}

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

/*
 * Firebase のポップアップでサインインし、結果(UserCredential)を待つ。
 *
 * 利用者がポップアップを閉じたときは、Firebase の通知(閉じてから 8〜10 秒後。utils/popupClosedWatch)
 * を待たず、自前の見張りで打ち切る。ポップアップを閉じずに放置された場合はタイムアウトで打ち切る。
 *
 * ただし「閉じた」が「やめた」とは限らない。モバイルブラウザと Firefox では、認可が成功すると
 * Firebase のハンドラがポップアップを自分で閉じ、その後に SDK が結果を取りに行く(デスクトップの
 * Chrome/Safari は SDK が結果を解決してから閉じる)。そこで結果の要求(signInWithIdp)が始まったことを
 * fetch の見張りで捉え、始まっていれば閉じても打ち切らずに Firebase の結果を待つ。
 *
 * 打ち切った後に遅れて結果が届いたときは onLateSuccess に渡す。誰も受け取らないと
 * Firebase にだけアカウントが残るので、受け取る側で続けるか取り消すかを決める。
 */
const signInWithPopupWatched = (
  provider: AuthProvider,
  onLateSuccess: (credential: UserCredential, reason: AbandonReason) => void,
): Promise<UserCredential> => {
  let abandoned: AbandonReason | null = null;
  let resultInFlight = false;

  // 見張りは window.open / window.fetch を包むので、signInWithPopup を呼ぶ前に仕掛ける
  const stopFetchWatch = watchFetchStart(isSignInResultRequest, () => {
    resultInFlight = true;
  });

  let stopPopupWatch: () => void = () => {};
  const popupClosed = new Promise<never>((_, reject) => {
    stopPopupWatch = watchPopupClosed(
      () => {
        abandoned = "popup-closed";
        reject(new SignInAbandonedError("popup-closed"));
      },
      { shouldIgnoreClose: () => resultInFlight },
    );
  });

  const signInPromise = signInWithPopup(firebaseClientAuth, provider);

  let timer: ReturnType<typeof setTimeout> | undefined;
  const timedOut = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      abandoned = "timeout";
      reject(new SignInAbandonedError("timeout"));
    }, POPUP_TIMEOUT_MS);
  });

  signInPromise.then(
    (credential) => {
      if (abandoned) {
        onLateSuccess(credential, abandoned);
      }
    },
    (error) => {
      // 打ち切る前の失敗は下の race が受ける。打ち切った後に届く失敗のうち、閉じ検知の後に
      // Firebase 側から来る popup-closed-by-user などのキャンセルは想定どおりなので何もしない。
      // それ以外(通信失敗など)は画面には出せないが、調査のために記録だけ残す
      if (
        abandoned &&
        !(error instanceof FirebaseError && CANCELLED_ERROR_CODES.includes(error.code))
      ) {
        console.error("Sign-in failed after being abandoned:", error);
      }
    },
  );

  return Promise.race([signInPromise, popupClosed, timedOut]).finally(() => {
    clearTimeout(timer);
    stopPopupWatch();
    stopFetchWatch();
  });
};

// Firebase の結果を待っている間に起きたエラーを、画面に出す状態へ写す
const toSignInErrorStatus = (error: unknown): SignInErrorStatus => {
  if (error instanceof SignInAbandonedError) {
    return error.reason === "timeout" ? "timeout" : "cancelled";
  }

  if (error instanceof FirebaseError && CANCELLED_ERROR_CODES.includes(error.code)) {
    return "cancelled";
  }

  console.error(error);
  return "failed";
};

// 今いるページ(パスとクエリ)。押した時点と遅れて結果が届いた時点を比べるのに使う
const currentLocation = () => window.location.pathname + window.location.search;

type CompleteSignInOptions = {
  // 成功したとき、押した時点の戻り先へ飛ばさずに今いるページを読み直す
  stayOnCurrentPage?: boolean;
};

/*
 * Firebase の認証が済んだあと、NextAuth へ渡してサインインを完了させ、画面を遷移する。
 * 辿り着けなかった場合は、このサインインで作られた Firebase の認証ユーザを取り消す。
 */
const completeSignIn = async (
  credential: UserCredential,
  redirectPathname: string,
  setIsLoading: React.Dispatch<React.SetStateAction<boolean>>,
  setErrorStatus?: React.Dispatch<React.SetStateAction<SignInErrorStatus | null>>,
  { stayOnCurrentPage = false }: CompleteSignInOptions = {},
) => {
  // 通常はもう立っている。閉じ検知の後に遅れて届いた経路では、いちどキャンセルの表示へ
  // 戻しているのでここで立て直す
  setIsLoading(true);
  setErrorStatus?.(null);

  try {
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
      // 流入元(施策0-4)。新規登録だったときだけ、サーバ側で core-apiserver へ送られる。
      // 既存ユーザのログインでは読み捨てられる。
      attribution: readAttributionCookie(),
      redirect: false,
    });

    // プロバイダ一覧の取得に失敗した場合など、next-auth 自身が画面遷移させて
    // 何も返さないことがある(型上はnon-nullだが実装上ありうる)。
    // 既に遷移が始まっているため、ここでは何もしない。
    if (!result) {
      return;
    }

    if (result.ok && !result.error) {
      // GA4の推奨イベント(sign_up / login)。流入(utm_*)から新規登録までを
      // 一つのプロパティ内で繋ぐための基点になるので、この2つは必ず送る。
      //
      // 直後に画面ごと遷移するが、gtag は送信に sendBeacon を使うため遷移が始まっても
      // ビーコンは飛ぶ。ただし順序は必ず「送信 → 遷移」にすること。
      const additionalUserInfo = getAdditionalUserInfo(credential);
      sendGAEvent("event", additionalUserInfo?.isNewUser ? "sign_up" : "login", {
        // GA4推奨の method パラメータ。値は "google.com" / "twitter.com" 等
        method: additionalUserInfo?.providerId ?? "unknown",
      });

      // 新規登録なら、遷移先で「どこで知ったか」の1問アンケートを出す(施策0-4 S4)。
      // localStorage への書き込みは同期なので、直後のページ遷移に間に合う。
      if (additionalUserInfo?.isNewUser) {
        markAcquisitionSurveyPending();
      }

      // 成功。サーバ側で発行されたセッションを読み込ませるため画面ごと遷移する
      if (stayOnCurrentPage) {
        reloadPage();
      } else {
        navigateFullPage(result.url ?? redirectPathname);
      }
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
    // 遷移はいずれもフルロード(utils/fullPageNavigation)。直前に Firebase のサインイン状態を
    // 触っており、サーバ側のセッション Cookie を読み直させる必要があるため。

    if (result.code === "withdrawn") {
      // 退会済みのアカウント。認証ユーザはサーバ側で削除済みなので、
      // ブラウザに残っているサインイン状態も消してからトップページへ戻す。
      // (既存アカウントのためロールバックは実質no-op)
      await rollbackNewFirebaseUser(credential);
      await signOutFromFirebase();
      navigateFullPage("/?notice=withdrawn");
      return result;
    }

    if (result.code === "backend_unavailable" || result.code === "registration_failed") {
      await rollbackNewFirebaseUser(credential);
      navigateFullPage(`/auth/error?code=${result.code}`);
      return result;
    }

    setErrorStatus?.("failed");
    await rollbackNewFirebaseUser(credential);

    return result;
  } catch (error) {
    setIsLoading(false);
    console.error(error);

    // エラー表示がロールバック(DB確認で数秒かかる)待ちにならないよう先に表示する
    setErrorStatus?.("failed");

    // Firebase の認証だけ成功して NextAuth へ渡せなかった場合（回線断など）は、
    // DB未登録のアカウントが残らないよう Firebase 側を取り消す。
    // ただし回線断の場合、サーバ側ではDB登録まで成功していて応答だけが
    // 届かなかった可能性もある。その見極めも rollbackNewFirebaseUser に委ねる。
    await rollbackNewFirebaseUser(credential);
  }
};

export const handleSignIn = async (
  provider: AuthProvider,
  redirectPathname: string,
  setIsLoading: React.Dispatch<React.SetStateAction<boolean>>,
  setErrorStatus?: React.Dispatch<React.SetStateAction<SignInErrorStatus | null>>,
) => {
  setIsLoading(true);
  setErrorStatus?.(null);

  const pressedAt = currentLocation();
  let credential: UserCredential;

  try {
    credential = await signInWithPopupWatched(provider, (lateCredential, reason) => {
      if (reason === "popup-closed") {
        // 閉じた直後に認証が済んでいた。利用者は認可まで終えているので、キャンセルの表示を
        // 取り下げてそのままログインする。Firebase 側が「閉じられた」と判断して拒否するまで
        // (閉じてから 10 秒ほど)の間にしか起きない。
        // その間に利用者が別のページへ移っていたら、押した時点の戻り先へ引き戻さず、
        // 今いるページを読み直してログイン済みの表示にする
        void completeSignIn(lateCredential, redirectPathname, setIsLoading, setErrorStatus, {
          stayOnCurrentPage: currentLocation() !== pressedAt,
        });
      } else {
        // タイムアウト(5 分)の後に届いた結果。利用者はもう別のことをしているので受け取らず、
        // Firebase にだけアカウントが残らないよう取り消す
        void rollbackNewFirebaseUser(lateCredential);
      }
    });
  } catch (error) {
    // 認証自体の失敗・キャンセル・打ち切り。アカウントは作られていないので取り消すものは無い
    setIsLoading(false);
    setErrorStatus?.(toSignInErrorStatus(error));
    return;
  }

  return completeSignIn(credential, redirectPathname, setIsLoading, setErrorStatus);
};
