"use client";

import DesktopSignUp from "@app/components/molecules/SignUp/DesktopSignUp";
import MobileSignUp from "@app/components/molecules/SignUp/MobileSignUp";

type Props = {
  iconUrl: string;
  isDevEnv: boolean;
};

export default function SignUp({ iconUrl, isDevEnv }: Props) {
  return (
    <>
      <DesktopSignUp iconUrl={iconUrl} isDevEnv={isDevEnv} />
      <MobileSignUp iconUrl={iconUrl} isDevEnv={isDevEnv} />
    </>
  );
}
