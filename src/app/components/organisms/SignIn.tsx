"use client";

import DesktopSignIn from "../molecules/SignIn/DesktopSignIn";
import MobileSignIn from "../molecules/SignIn/MobileSignIn";

export default function SignIn() {
  return (
    <>
      <DesktopSignIn />
      <MobileSignIn />
    </>
  );
}
