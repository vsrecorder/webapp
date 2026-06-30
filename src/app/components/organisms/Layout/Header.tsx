import { auth } from "@app/auth";

import Image from "next/image";

import SignUp from "./SignUp";
import SignIn from "./SignIn";
import UserMenu from "./UserMenu";
import ThemeSwitcher from "@app/components/molecules/Theme/ThemeSwitcher";
import ScrollingText from "@app/components/molecules/ScrollingText";
import { UserType } from "@app/types/user";
import { EnvironmentType } from "@app/types/environment";

import Link from "next/link";

async function fetchUser(id: string): Promise<UserType> {
  const domain = process.env.VSRECORDER_DOMAIN;

  const res = await fetch(`https://${domain}/api/v1beta/users/${id}`, {
    cache: "no-store",
    method: "GET",
    headers: { Accept: "application/json" },
  });

  const ret: UserType = await res.json();
  return ret;
}

async function fetchCurrentEnvironment(): Promise<EnvironmentType | null> {
  const domain = process.env.VSRECORDER_DOMAIN;
  const today = new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().split("T")[0];

  try {
    const res = await fetch(`https://${domain}/api/v1beta/environments?date=${today}`, {
      cache: "no-store",
      method: "GET",
      headers: { Accept: "application/json" },
    });
    if (res.status === 200) return res.json();
    return null;
  } catch {
    return null;
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

// 残り日数に応じてドットの色を返す（14日以上: 緑, 14日以内: 黄=warning, 7日以内: 赤=critical）
function getEnvDotColor(toDate: Date): string {
  const now = new Date(Date.now() + 9 * 60 * 60 * 1000);
  const daysLeft = Math.ceil(
    (new Date(toDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
  );

  if (daysLeft <= 7) return "bg-red-400";
  if (daysLeft <= 14) return "bg-yellow-400";
  return "bg-green-400";
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
    </Link>
  );
}

export default async function Header() {
  const session = await auth();

  if (session) {
    const [user, env] = await Promise.allSettled([
      fetchUser(session.user.id),
      fetchCurrentEnvironment(),
    ]);

    const resolvedUser = user.status === "fulfilled" ? user.value : null;
    const resolvedEnv = env.status === "fulfilled" ? env.value : null;

    return (
      <HeaderShell>
        <Logo />
        {resolvedEnv && (
          <div className="flex flex-1 items-center gap-1.5 min-w-0 mx-3">
            <span
              className={`w-1.5 h-1.5 rounded-full ${getEnvDotColor(resolvedEnv.to_date)} animate-pulse shrink-0`}
            />
            <ScrollingText
              text={`現在の対戦環境：『${resolvedEnv.title}』`}
              className="text-white/80 text-xs font-medium min-w-0"
            />
          </div>
        )}

        <div className="flex items-center gap-3 shrink-0">
          <ThemeSwitcher />
          {resolvedUser && <UserMenu user={resolvedUser} />}
        </div>
      </HeaderShell>
    );
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
