"use clinet";

import React, { useState } from "react";

import { usePathname } from "next/navigation";

import { TwitterAuthProvider, GoogleAuthProvider } from "firebase/auth";

import { Button } from "@heroui/react";

import { RiGoogleFill } from "react-icons/ri";
import { FcGoogle } from "react-icons/fc";

import { RiTwitterXLine } from "react-icons/ri";

import { handleSignIn } from "@app/handlers/handleSignIn";

export default function SocialSignIn() {
  const [isLoadingGoogleSignInButton, setIsLoadingGoogleSignInButton] = useState(false);
  const [isLoadingXSignInButton, setIsLoadingXSignInButton] = useState(false);

  const redirectPathname = usePathname();

  const twitterProvider = new TwitterAuthProvider();
  const googleProvider = new GoogleAuthProvider();

  return (
    <>
      <div className="flex items-center">
        <div className="mx-3">
          <Button
            size="md"
            isDisabled={false}
            isLoading={isLoadingGoogleSignInButton}
            onPress={() => {
              handleSignIn(
                googleProvider,
                redirectPathname,
                setIsLoadingGoogleSignInButton,
              );
            }}
          >
            <FcGoogle className="text-xl" />
          </Button>
        </div>

        <div className="mx-3">
          <Button
            size="md"
            isDisabled={false}
            isLoading={isLoadingXSignInButton}
            onPress={() => {
              handleSignIn(twitterProvider, redirectPathname, setIsLoadingXSignInButton);
            }}
          >
            <RiTwitterXLine className="text-xl" />
          </Button>
        </div>
      </div>
    </>
  );
}
