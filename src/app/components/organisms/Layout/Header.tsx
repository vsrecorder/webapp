import { auth } from "@app/auth";

import Image from "next/image";

import GuestAuthButtons from "./GuestAuthButtons";
import UserMenu from "./UserMenu";
import NotificationBell from "./NotificationBell";
import CurrentEnvironment from "./CurrentEnvironment";
import ThemeSwitcher from "@app/components/molecules/Theme/ThemeSwitcher";
import ReloadButton from "@app/components/molecules/Header/ReloadButton";
import { UserType } from "@app/types/user";
import { EnvironmentType } from "@app/types/environment";
import { getAppIconUrl, isDevEnv } from "@app/utils/appIcon";
import { getStatusBarColor } from "@app/utils/pwaColors";
import { todayJSTDateString } from "@app/utils/date";

import Link from "next/link";

import { upstreamUrl } from "@app/utils/upstream";

async function fetchUser(id: string): Promise<UserType> {
  const res = await fetch(upstreamUrl`/api/v1beta/users/${id}`, {
    cache: "no-store",
    method: "GET",
    headers: { Accept: "application/json" },
  });

  // エラー応答の本文(JSON)をユーザ情報として描かないよう、200 以外は失敗として扱う
  if (res.status !== 200) throw new Error(`failed to fetch user: ${res.status}`);

  const ret: UserType = await res.json();
  return ret;
}

async function fetchCurrentEnvironment(): Promise<EnvironmentType | null> {
  const today = todayJSTDateString();

  try {
    const res = await fetch(upstreamUrl`/api/v1beta/environments?date=${today}`, {
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
    <header className="fixed z-50 top-0 left-0 right-0 h-14 lg:h-28">
      {/*
        iOS の standalone PWA では、position:fixed な要素に直接 backdrop-blur を
        かけると、その中の transform アニメーション（マーキー）が再描画されなく
        なることがあるため、ぼかし背景だけを別レイヤー（absolute）に分離し、
        コンテンツ側は backdrop-filter の直接の対象にならないようにする。

        本文との区切りはこのレイヤーの下向きの薄い影で表す。以前は白15%の
        下端境界線だったが、ダークモードでは背後が暗く、明るい線がはっきり
        浮いて見えたため、影に置き換えた。影は箱の外側へ落ちるので、境界線の
        ように1pxぶん背景が抜ける問題も起きない。
      */}
      <div
        className={`absolute inset-0 ${gradientClass} backdrop-blur-md shadow-[0_3px_8px_-2px_rgba(0,0,0,0.18)]`}
      />
      {/*
        ホーム画面アプリでは、真上の通知バーを OS が単色(getStatusBarColor)で塗る。
        斜めのグラデーションのままだと、特に右側(紫)で通知バーとの境目がはっきり見えるので、
        上端をその単色にして下へ向かって透明に抜き、下地のグラデーションへ溶かす。
        ブラウザ表示では通知バーの色を指定していないので出さない(globals.css の
        .header-statusbar-blend。目印の data-standalone は platformDetectScript が付ける)。
      */}
      <div
        aria-hidden
        className="header-statusbar-blend absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `linear-gradient(to bottom, ${getStatusBarColor()}, ${getStatusBarColor()}00)`,
        }}
      />
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

function Logo({ iconUrl }: { iconUrl: string }) {
  return (
    <Link href="/" className="flex items-center gap-2.5">
      <div className="w-8 h-8 lg:w-10 lg:h-10 relative shrink-0">
        <Image
          src={iconUrl}
          alt="バトレコ"
          fill
          // 固定ヘッダー内なので常にファーストビューに入る。利用規約のような
          // テキスト主体のページではこのロゴが唯一の画像＝LCP要素になるため、
          // 遅延読み込みさせず優先的に取りに行かせる。
          preload
          // sizes はビューポート幅に依存させない。lg(1024px)を境に候補が変わると、
          // <head>のpreloadを評価した時点と<img>のレイアウト時点で幅が違った場合
          // (DevToolsの開閉やウィンドウのリサイズ)に別の候補が選ばれ、
          // 先読みした画像が捨てられる(preloaded but not used)。
          // 40px固定なら候補はDPRだけで決まるので必ず一致する。
          sizes="40px"
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
        {resolvedEnv && <CurrentEnvironment environment={resolvedEnv} />}

        <div className="flex items-center gap-1 shrink-0">
          <ReloadButton />
          <ThemeSwitcher />
          {resolvedUser && (
            <div className="-ml-1.5">
              <NotificationBell userId={resolvedUser.id} />
            </div>
          )}
          {/* アバターはアイコンボタンと違い枠内に余白がないため、見た目の間隔を揃えるためのマージン */}
          <div className="ml-2">
            {resolvedUser ? (
              <UserMenu user={resolvedUser} iconUrl={iconUrl} isDevEnv={isDev} />
            ) : (
              /*
                ユーザ情報が取れなかった(上流の失敗・無応答)ときは、アイコンを消さずに
                同じ大きさ(Avatar size="md" = 40px)の骨格を残す。消すと右端の並びが詰まり、
                ホームのプロフィールカードの骨格とも食い違う
              */
              <div
                aria-hidden
                className="w-10 h-10 rounded-full bg-white/25 ring-2 ring-white/40 animate-pulse"
              />
            )}
          </div>
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
          {/* Firebase を引く部品は未ログインのときだけ読む(GuestAuthButtons 参照) */}
          <GuestAuthButtons iconUrl={iconUrl} isDevEnv={isDev} />
        </div>
      </HeaderShell>
    );
  }
}
