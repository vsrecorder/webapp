"use client";

import dynamic from "next/dynamic";

/*
 * 未ログインのヘッダーに出す「新規登録」「ログイン」。
 *
 * SignIn / SignUp は Firebase のクライアント SDK(圧縮後 約25KB)を引く。Header(サーバ部品)から
 * 静的に import すると、ログイン中は描画されないのに、Firebase がレイアウト共通のチャンクに
 * 同梱されて全ページの初期 JS に載っていた(本番ビルドの実測)。
 * ここで動的 import にして、未ログインで描画されるときだけ読む。サーバ描画は既定どおり行うので、
 * 未ログインの初回表示でボタンが遅れて現れることはない。
 */
const SignUp = dynamic(() => import("./SignUp"));
const SignIn = dynamic(() => import("./SignIn"));

type Props = {
  iconUrl: string;
  isDevEnv: boolean;
};

export default function GuestAuthButtons({ iconUrl, isDevEnv }: Props) {
  return (
    <>
      <SignUp iconUrl={iconUrl} isDevEnv={isDevEnv} />
      <SignIn iconUrl={iconUrl} isDevEnv={isDevEnv} />
    </>
  );
}
