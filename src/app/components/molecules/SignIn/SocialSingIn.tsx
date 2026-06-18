"use client";

import React, { useState } from "react";

import { usePathname } from "next/navigation";

import { TwitterAuthProvider, GoogleAuthProvider } from "firebase/auth";

import { Button } from "@heroui/react";

import { FcGoogle } from "react-icons/fc";
import { RiTwitterXLine } from "react-icons/ri";

import { handleSignIn } from "@app/handlers/handleSignIn";

export default function SocialSignIn() {
  const [isLoadingGoogle, setIsLoadingGoogle] = useState(false);
  const [isLoadingX, setIsLoadingX] = useState(false);

  const redirectPathname = usePathname();

  const googleProvider = new GoogleAuthProvider();
  const twitterProvider = new TwitterAuthProvider();

  return (
    <div className="flex flex-col gap-3 w-full">
      <Button
        size="md"
        variant="bordered"
        fullWidth
        className="gap-2 border-default-200 font-medium"
        isLoading={isLoadingGoogle}
        onPress={() => handleSignIn(googleProvider, redirectPathname, setIsLoadingGoogle)}
      >
        <FcGoogle className="text-xl shrink-0" />
        Googleでつづける
      </Button>

      <Button
        size="md"
        variant="bordered"
        fullWidth
        className="gap-2 border-default-200 font-medium"
        isLoading={isLoadingX}
        onPress={() => handleSignIn(twitterProvider, redirectPathname, setIsLoadingX)}
      >
        <RiTwitterXLine className="text-xl shrink-0" />
        Xでつづける
      </Button>
    </div>
  );
}
