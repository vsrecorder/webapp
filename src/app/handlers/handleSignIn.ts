import { signIn } from "next-auth/react";
import { signInWithPopup } from "firebase/auth";
import type { AuthProvider } from "firebase/auth";

import { firebaseClientAuth } from "@firebase/client";

export const handleSignIn = async (
  provider: AuthProvider,
  redirectPathname: string,
  setIsLoading: React.Dispatch<React.SetStateAction<boolean>>,
) => {
  try {
    setIsLoading(true);

    // Firebase でログイン
    const credential = await signInWithPopup(firebaseClientAuth, provider);
    const idToken = await credential.user.getIdToken(true);

    // NextAuth に渡してサインイン
    const result = await signIn("credentials", {
      callbackUrl: redirectPathname,
      idToken,
      redirect: true,
    });

    return result;
  } catch (error) {
    console.error(error);
    setIsLoading(false);
  }
};
