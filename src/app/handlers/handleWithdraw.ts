import { signOut } from "next-auth/react";

import { signOutFromFirebase } from "@app/handlers/handleSignOut";

export const handleWithdraw = async (userId: string): Promise<void> => {
  const res = await fetch(`/api/users/${userId}`, {
    method: "DELETE",
  });

  if (!res.ok) {
    throw new Error(`退会処理に失敗しました: ${res.status}`);
  }

  // Firebase のクライアント SDK は退会の実行時にだけ読む。読めなくてもセッションの側は終える
  await signOutFromFirebase();
  await signOut({ redirect: true, callbackUrl: "/" });
};
