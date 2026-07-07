import Image from "next/image";
import Link from "next/link";

import { Button } from "@heroui/react";
import { LuServerCrash, LuTriangleAlert } from "react-icons/lu";

import { getAppIconUrl, isDevEnv } from "@app/utils/appIcon";

type Props = {
  searchParams: Promise<{
    code?: string;
  }>;
};

export default async function Page({ searchParams }: Props) {
  const { code } = await searchParams;
  const isBackendDown = code === "backend_unavailable";

  const devEnv = isDevEnv();
  const iconUrl = getAppIconUrl();

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
            {isBackendDown ? "サーバーに接続できません" : "ログインに失敗しました"}
          </h1>

          <p className="text-sm text-neutral-500 dark:text-neutral-400 leading-relaxed">
            {isBackendDown
              ? "現在サーバーに接続できないため、ログイン・新規登録を行うことができません。しばらく時間をおいてから、再度お試しください。"
              : "認証処理に失敗しました。お手数ですが、もう一度お試しください。"}
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
