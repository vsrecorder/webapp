import { signOut } from "next-auth/react";

import { firebaseClientAuth } from "@firebase/client";

export const handleSignOut = async () => {
  await firebaseClientAuth.signOut();
  await signOut({ redirect: true, callbackUrl: "/" });
};
