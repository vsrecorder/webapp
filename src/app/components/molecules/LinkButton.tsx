"use client";

import Link from "next/link";
import { Button, type ButtonProps } from "@heroui/react";

/**
 * next/link へ遷移する HeroUI Button。
 *
 * サーバコンポーネントから <Button as={Link}> と書くと、next/link の
 * コンポーネント「関数」そのものが props としてクライアントコンポーネントへ
 * 渡ることになる。Next.js 16 ではこれが RSC の境界を越えられず
 * 「Functions cannot be passed directly to Client Components」で実行時に弾かれる
 * (ページ自体は200を返すがサーバログにエラーが出続ける)。
 *
 * as= の結線をこのクライアント境界の内側に閉じ込めることで回避する。
 * Button は元々クライアントコンポーネントなので、クライアントバンドルは増えない。
 */
type LinkButtonProps = Omit<ButtonProps, "as"> & {
  href: string;
};

export default function LinkButton({ href, ...props }: LinkButtonProps) {
  return <Button as={Link} href={href} {...props} />;
}
