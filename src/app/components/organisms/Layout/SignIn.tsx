"use client";

import DesktopSignIn from "@app/components/molecules/SignIn/DesktopSignIn";
import MobileSignIn from "@app/components/molecules/SignIn/MobileSignIn";

type Props = {
  iconUrl: string;
  isDevEnv: boolean;
};

export default function SignIn({ iconUrl, isDevEnv }: Props) {
  return (
    <>
      <DesktopSignIn iconUrl={iconUrl} isDevEnv={isDevEnv} />
      <MobileSignIn iconUrl={iconUrl} isDevEnv={isDevEnv} />
    </>
  );
}
