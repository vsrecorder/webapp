import { auth } from "@app/auth";

import Image from "next/image";

import SignUp from "./SignUp";
import SignIn from "./SignIn";
import UserMenu from "./UserMenu";
import ThemeSwitcher from "@app/components/molecules/Theme/ThemeSwitcher";
import { UserType } from "@app/types/user";

import Link from "next/link";

async function fetchUser(id: string) {
  const domain = process.env.VSRECORDER_DOMAIN;

  try {
    const res = await fetch(`https://${domain}/api/v1beta/users/${id}`, {
      cache: "no-store",
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    });

    const ret: UserType = await res.json();

    return ret;
  } catch (error) {
    throw error;
  }
}

function HeaderShell({ children }: { children: React.ReactNode }) {
  return (
    <header className="fixed z-50 top-0 left-0 right-0 h-14 bg-linear-to-br from-blue-600/90 via-indigo-600/90 to-violet-700/90 backdrop-blur-md border-b border-white/15">
      <div className="max-w-7xl mx-auto flex items-center justify-between px-4 h-full">
        {children}
      </div>
    </header>
  );
}

function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2.5">
      <div className="w-8 h-8 relative shrink-0">
        <Image
          src="/images/icon.png"
          alt="バトレコ"
          fill
          sizes="32px"
          className="object-contain rounded-lg"
        />
      </div>
      <span className="font-semibold text-white tracking-wide">
        バトレコ
      </span>
    </Link>
  );
}

export default async function Header() {
  const session = await auth();

  if (session) {
    // TODO: エラー処理
    try {
      const user: UserType = await fetchUser(session.user.id);

      return (
        <HeaderShell>
          <Logo />
          <div className="flex items-center gap-1">
            <ThemeSwitcher />
            <UserMenu user={user} />
          </div>
        </HeaderShell>
      );
    } catch (error) {
      console.log(error);

      return (
        <HeaderShell>
          <Logo />
          <div className="flex items-center gap-1">
            <ThemeSwitcher />
          </div>
        </HeaderShell>
      );
    }
  } else {
    return (
      <HeaderShell>
        <Logo />
        <div className="flex items-center gap-1">
          <SignUp />
          <SignIn />
        </div>
      </HeaderShell>
    );
  }
}
