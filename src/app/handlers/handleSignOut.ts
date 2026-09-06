import { signOut } from "next-auth/react";

// Firebase のクライアント SDK(圧縮後 約25KB)は、サインアウトを実行するときだけ読む。
// 静的に import すると、ログイン後の全ページ(ヘッダーのメニューがこの関数を参照する)の
// 初期JSに常に載ってしまう。
export const handleSignOut = async () => {
  await signOutFromFirebase();
  await signOut({ redirect: true, callbackUrl: "/" });
};

// Firebase 側のサインアウト。SDK の読み込み(デプロイ直後に古いページから押すとチャンクが無い等)や
// 通信に失敗しても、セッション側(next-auth)のサインアウトは進める。Firebase のサインイン状態は
// 端末内に残るだけで、次のログインでは改めて認証するので害はない
export async function signOutFromFirebase(): Promise<void> {
  try {
    const { firebaseClientAuth } = await import("@firebase/client");
    await firebaseClientAuth.signOut();
  } catch (error) {
    console.error("Failed to sign out from firebase:", error);
  }
}
