"use client";

import DesktopSignIn from "@app/components/molecules/SignIn/DesktopSignIn";
import MobileSignIn from "@app/components/molecules/SignIn/MobileSignIn";

export default function SignIn() {
  return (
    <>
      <DesktopSignIn />
      <MobileSignIn />
    </>
  );
}
