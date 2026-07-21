"use client";

import { useEffect, useState } from "react";

import { Button, Card, CardBody } from "@heroui/react";
import { LuInfo, LuX } from "react-icons/lu";

import { firebaseClientAuth } from "@firebase/client";

// 退会済みのアカウントでサインインしようとした場合に、トップページで理由を伝える通知。
//
// 退会時にFirebaseの認証ユーザを消し損ねると、DB上は退会済みなのにログインだけは
// できてしまう状態が残る。その状態でサインインを試みた場合、認証ユーザを削除した上で
// ここへ戻ってくる。無言でトップに戻すと本人には理由が分からないため案内する。
export default function WithdrawnNotice() {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    // 認証ユーザ自体はサーバ側で削除済みだが、ブラウザにはサインイン状態が
    // 残ったままなので明示的にサインアウトさせる。
    void firebaseClientAuth.signOut().catch((error) => {
      console.error("Failed to sign out from firebase:", error);
    });

    // リロードやURLの共有で通知が再表示されないようクエリを取り除く。
    // router.replace()だと再描画でこの通知自体が消えてしまうため、
    // ルーティングを伴わないhistory APIでURLだけを書き換える。
    window.history.replaceState(null, "", "/");
  }, []);

  if (!isVisible) {
    return null;
  }

  // ヒーローセクションが -mt-14(lg:-mt-28) でヘッダー裏まで広がる作りのため、
  // 通常のフローに差し込むと重なって隠れてしまう。ヘッダーの直下に浮かせる。
  return (
    <div className="fixed inset-x-0 top-14 lg:top-28 z-40 flex justify-center px-3 pt-3 pointer-events-none">
      <Card shadow="lg" className="w-full max-w-md border border-default-200 pointer-events-auto">
        <CardBody className="flex flex-row items-start gap-3 py-4 px-4">
          <LuInfo className="mt-0.5 shrink-0 text-medium text-default-400" />

          <div className="flex flex-col gap-1">
            <p className="text-small font-bold text-default-700">
              このアカウントは退会済みです
            </p>
            <p className="text-tiny text-default-500 leading-relaxed">
              退会手続きが完了しているためログインできません。
              引き続きご利用いただく場合は、新規登録をお願いします。
            </p>
          </div>

          <Button
            isIconOnly
            size="sm"
            variant="light"
            radius="full"
            aria-label="通知を閉じる"
            className="ml-auto shrink-0"
            onPress={() => setIsVisible(false)}
          >
            <LuX className="text-medium text-default-400" />
          </Button>
        </CardBody>
      </Card>
    </div>
  );
}
