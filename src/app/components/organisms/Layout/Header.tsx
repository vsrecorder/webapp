import { auth } from "@app/auth";

import Image from "next/image";

import SignUp from "./SignUp";
import SignIn from "./SignIn";
import UserMenu from "./UserMenu";
import NotificationBell from "./NotificationBell";
import ThemeSwitcher from "@app/components/molecules/Theme/ThemeSwitcher";
import ReloadButton from "@app/components/molecules/Header/ReloadButton";
import ScrollingText from "@app/components/molecules/ScrollingText";
import { UserType } from "@app/types/user";
import { EnvironmentType } from "@app/types/environment";
import { getAppIconUrl, isDevEnv } from "@app/utils/appIcon";

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

// header の背景自体は画面全幅のまま表示し（サイドバー左上に隙間を作らないため）、
// 中身だけをサイドバー幅ぶん右に寄せることで、中央寄せの基準をメインコンテンツ側
// （サイドバーを除いた表示領域）と揃える。
function HeaderShell({
  children,
  hasSidebar = false,
}: {
  children: React.ReactNode;
  hasSidebar?: boolean;
}) {
  // dev環境は本番の青系グラデーションと一目で区別できるようオレンジ系にする
  const gradientClass = isDevEnv()
    ? "bg-linear-to-br from-orange-500/90 via-orange-600/90 to-amber-700/90"
    : "bg-linear-to-br from-blue-600/90 via-indigo-600/90 to-violet-700/90";

  return (
    <header className="fixed z-50 top-0 left-0 right-0 h-14 lg:h-28 border-b border-white/15">
      {/*
        iOS の standalone PWA では、position:fixed な要素に直接 backdrop-blur を
        かけると、その中の transform アニメーション（マーキー）が再描画されなく
        なることがあるため、ぼかし背景だけを別レイヤー（absolute）に分離し、
        コンテンツ側は backdrop-filter の直接の対象にならないようにする。
      */}
      <div className={`absolute inset-0 ${gradientClass} backdrop-blur-md`} />
      {/* 本サービスはモバイル専用のため、デスクトップ幅（lg以上）でのみ非対応の旨を表示する */}
      <div
        className={`relative hidden lg:flex items-center justify-center h-8 bg-amber-400 text-amber-950 text-xs font-semibold ${hasSidebar ? "lg:pl-56" : ""}`}
      >
        本サービスはモバイル専用です。デスクトップでの動作は保証されません。
      </div>
      <div
        className={`relative max-w-7xl mx-auto flex items-center justify-between px-4 h-14 lg:h-20 ${hasSidebar ? "lg:pl-56" : ""}`}
      >
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

function Logo({ iconUrl }: { iconUrl: string }) {
  return (
    <Link href="/" className="flex items-center gap-2.5">
      <div className="w-8 h-8 lg:w-10 lg:h-10 relative shrink-0">
        <Image
          src={iconUrl}
          alt="バトレコ"
          fill
          sizes="(min-width: 1024px) 40px, 32px"
          className="object-contain rounded-lg"
        />
      </div>
    </Link>
  );
}

export default async function Header() {
  const session = await auth();
  const iconUrl = getAppIconUrl();
  const isDev = isDevEnv();

  if (session) {
    const [user, env] = await Promise.allSettled([
      fetchUser(session.user.id),
      fetchCurrentEnvironment(),
    ]);

    const resolvedUser = user.status === "fulfilled" ? user.value : null;
    const resolvedEnv = env.status === "fulfilled" ? env.value : null;

    return (
      <HeaderShell hasSidebar>
        <Logo iconUrl={iconUrl} />
        {resolvedEnv && (
          <div className="flex flex-1 items-center gap-1.5 min-w-0 mx-3">
            <span
              className={`w-1.5 h-1.5 rounded-full ${getEnvDotColor(resolvedEnv.to_date)} animate-pulse shrink-0`}
            />
            <ScrollingText
              text={`現在の対戦環境：『${resolvedEnv.title}』`}
              className="flex-1 text-white/80 text-xs font-medium min-w-0"
            />
          </div>
        )}

        <div className="flex items-center gap-1 shrink-0">
          <ReloadButton />
          <ThemeSwitcher />
          {resolvedUser && (
            <div className="-ml-1.5">
              <NotificationBell userId={resolvedUser.id} />
            </div>
          )}
          {/* アバターはアイコンボタンと違い枠内に余白がないため、見た目の間隔を揃えるためのマージン */}
          {resolvedUser && (
            <div className="ml-2">
              <UserMenu user={resolvedUser} iconUrl={iconUrl} isDevEnv={isDev} />
            </div>
          )}
        </div>
      </HeaderShell>
    );
  } else {
    return (
      <HeaderShell>
        <Logo iconUrl={iconUrl} />
        <div className="flex items-center gap-1">
          <ReloadButton />
          <ThemeSwitcher />
          <SignUp iconUrl={iconUrl} isDevEnv={isDev} />
          <SignIn iconUrl={iconUrl} isDevEnv={isDev} />
        </div>
      </HeaderShell>
    );
  }
}
