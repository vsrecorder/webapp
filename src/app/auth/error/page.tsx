import type { Metadata } from "next";

import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";

import { Button } from "@heroui/react";
import { LuServerCrash, LuTriangleAlert } from "react-icons/lu";

import { getAppIconUrl, isDevEnv } from "@app/utils/appIcon";

// 認証エラーの表示用ページなので、検索結果に出さない。
export const metadata: Metadata = {
  title: "エラー",
  robots: {
    index: false,
    follow: false,
  },
};

type Props = {
  searchParams: Promise<{
    code?: string;
  }>;
};

export default async function Page({ searchParams }: Props) {
  const { code } = await searchParams;

  // 退会済みアカウントでのサインインは「失敗」ではなく、退会状態が保たれた結果。
  // エラー画面を見せる場面ではないため、トップページで理由を案内する。
  if (code === "withdrawn") {
    redirect("/?notice=withdrawn");
  }

  const isBackendDown = code === "backend_unavailable";
  // 新規ユーザのDB登録に失敗し、作成途中のアカウントを取り消した場合
  const isRegistrationFailed = code === "registration_failed";

  const devEnv = isDevEnv();
  const iconUrl = getAppIconUrl();

  const title = isBackendDown
    ? "サーバーに接続できません"
    : isRegistrationFailed
      ? "登録に失敗しました"
      : "ログインに失敗しました";

  const description = isBackendDown
    ? "現在サーバーに接続できないため、ログイン・新規登録を行うことができません。しばらく時間をおいてから、再度お試しください。"
    : isRegistrationFailed
      ? "アカウントの登録処理に失敗したため、作成途中のアカウントを取り消しました。お手数ですが、しばらく時間をおいてから、はじめからやり直してください。"
      : "認証処理に失敗しました。お手数ですが、もう一度お試しください。";

  return (
    <div className="flex flex-col items-center justify-center min-h-[70svh] gap-4 px-4 text-center">
      <div className="w-full max-w-md rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 shadow-sm overflow-hidden">
        <div
          className={`px-6 pt-8 pb-7 flex flex-col items-center gap-3 ${
            devEnv
              ? "bg-linear-to-br from-orange-500 via-orange-600 to-amber-700"
              : "bg-linear-to-br from-blue-600 via-indigo-600 to-violet-700"
          }`}
        >
          <div className="w-14 h-14 relative">
            <Image
              src={iconUrl}
              alt="バトレコ"
              fill
              priority
              sizes="56px"
              className="object-contain rounded-xl shadow-lg"
            />
          </div>
          <p className="text-white font-bold text-lg leading-tight">バトレコ</p>
        </div>

        <div className="flex flex-col items-center gap-3 px-6 pt-6 pb-8">
          {isBackendDown ? (
            <LuServerCrash className="w-8 h-8 text-danger" />
          ) : (
            <LuTriangleAlert className="w-8 h-8 text-danger" />
          )}

          <h1 className="text-lg font-black text-neutral-800 dark:text-neutral-100">
            {title}
          </h1>

          <p className="text-sm text-neutral-500 dark:text-neutral-400 leading-relaxed">
            {description}
          </p>

          <Button
            as={Link}
            href="/"
            color="primary"
            radius="full"
            size="sm"
            className="mt-2"
          >
            トップページに戻る
          </Button>
        </div>
      </div>
    </div>
  );
}
