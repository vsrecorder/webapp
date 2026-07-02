import { signOut } from "next-auth/react";

import { firebaseClientAuth } from "@firebase/client";

export const handleWithdraw = async (userId: string): Promise<void> => {
  const res = await fetch(`/api/users/${userId}`, {
    method: "DELETE",
  });

  if (!res.ok) {
    throw new Error(`退会処理に失敗しました: ${res.status}`);
  }

  await firebaseClientAuth.signOut();
  await signOut({ redirect: true, callbackUrl: "/" });
};
