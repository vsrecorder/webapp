"use client";

import { useState } from "react";

import { ModalHeader } from "@heroui/react";

import { useClientValue } from "@app/hooks/useClientValue";

import SignInModal from "./SignInModal";

const isMounted = () => true;

/*
 * ログインが要るページから、未ログインのまま飛ばされてきた人への案内(utils/signInReturn)。
 * トップを開いた時点でログインのモーダルを出す。ログインすると、ボタンが URL の next を読んで
 * 開こうとしていたページへ戻す(SocialSignIn)。
 *
 * 主に、セッション(14日)が切れた端末で push 通知をタップした人がここに来る。
 * ただし X の投稿は /records/quick などの会員ページへリンクしているので、アカウントを
 * 持っていない初めての人も来る。文言は「ログイン」だけにせず、そのまま登録できることを伝える
 * (ボタンは同じ。Firebase の初回ログインがそのまま新規登録になる)。
 * 閉じてもランディングはそのまま見られ、ヘッダのログイン・新規登録からでも同じページへ戻る。
 *
 * モーダルはハイドレーションの後に開く(サーバ描画で開いた状態にすると、ポータルの
 * 有無でハイドレーションが食い違う)。
 */
export default function SignInRequiredPrompt() {
  const mounted = useClientValue(isMounted, false);
  const [isDismissed, setIsDismissed] = useState(false);

  return (
    <SignInModal
      isOpen={mounted && !isDismissed}
      onOpenChange={() => setIsDismissed(true)}
      header={<ModalHeader className="text-base">ログインして続ける</ModalHeader>}
      intro={
        <p className="text-sm text-default-500">
          開こうとしたページは、ログインすると使えます。はじめての方も、下のボタンからそのまま登録できます(無料)。終わると、そのページへ移動します。
        </p>
      }
    />
  );
}
