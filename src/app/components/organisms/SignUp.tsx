"use client";

import DesktopSignUp from "@app/components/molecules/SignUp/DesktopSignUp";
import MobileSignUp from "@app/components/molecules/SignUp/MobileSignUp";

export default function SignUp() {
  return (
    <>
      <DesktopSignUp />
      <MobileSignUp />
    </>
  );
}
