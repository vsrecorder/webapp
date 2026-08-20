import Image from "next/image";
import Link from "next/link";
import { LuExternalLink } from "react-icons/lu";

import { auth } from "@app/auth";
import FooterWithdrawLink from "@app/components/organisms/Layout/FooterWithdrawLink";
import { getAppIconUrl } from "@app/utils/appIcon";

export default async function Footer() {
  const session = await auth();
  const iconUrl = getAppIconUrl();

  return (
    <footer className="-mx-2 mt-8 bg-neutral-900 dark:bg-neutral-950 dark:border-t dark:border-neutral-800 text-neutral-400">
      {/* 本体コンテンツ(Home/Dashboard)と同じ最大幅に揃える。
          片方だけ狭いとデスクトップでフッターの中身が中央に寄って見える */}
      <div className="max-w-2xl lg:max-w-6xl xl:max-w-7xl mx-auto px-6 lg:px-8 pt-10 pb-8">
        {/* ブランド + リンクグループ */}
        <div className="flex flex-col sm:flex-row sm:justify-between gap-8 pb-8 border-b border-neutral-800">
          {/* ブランドエリア */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 relative shrink-0">
                <Image
                  src={iconUrl}
                  alt="バトレコ"
                  fill
                  sizes="32px"
                  className="object-contain rounded-lg"
                />
              </div>
              <span className="text-white font-bold text-md">バトレコ</span>
            </div>
            <p className="text-xs leading-relaxed">
              ポケカプレイヤーのための
              <br />
              対戦記録サービス
            </p>
          </div>

          {/* リンクグループ。
              3グループをモバイルで横一列に並べると幅375pxの端末で折り返すため、
              モバイルだけ2列のグリッドに畳む。 */}
          <div className="grid grid-cols-2 gap-x-10 gap-y-8 sm:flex sm:gap-12">
            {/* 未ログインでも読めるコンテンツへの導線。
                シティリーグ結果は個別ページが7,000件以上あるが、ここから辿れないと
                サイト内のどこからもリンクされない孤立ページ群になる。 */}
            <div className="flex flex-col gap-2.5">
              <span className="text-xs text-neutral-400 uppercase tracking-widest font-bold">
                コンテンツ
              </span>
              <Link
                href="/cityleague_results"
                className="text-sm hover:text-white transition-colors duration-150"
              >
                シティリーグ結果
              </Link>
              <Link
                href="/cityleague_results/months"
                className="text-sm hover:text-white transition-colors duration-150"
              >
                開催月から探す
              </Link>
              <Link
                href="/deck_meta"
                className="text-sm hover:text-white transition-colors duration-150"
              >
                デッキ環境
              </Link>
            </div>

            <div className="flex flex-col gap-2.5">
              <span className="text-xs text-neutral-400 uppercase tracking-widest font-bold">
                サービス
              </span>
              <Link
                href="/terms"
                className="text-sm hover:text-white transition-colors duration-150"
              >
                利用規約
              </Link>
              <Link
                href="/privacy"
                className="text-sm hover:text-white transition-colors duration-150"
              >
                プライバシーポリシー
              </Link>
              <Link
                href="/policy"
                className="text-sm hover:text-white transition-colors duration-150"
              >
                本サービスにつきまして
              </Link>
              <Link
                href="/credits"
                className="text-sm hover:text-white transition-colors duration-150"
              >
                クレジット
              </Link>
            </div>

            <div className="flex flex-col gap-2.5">
              <span className="text-xs text-neutral-400 uppercase tracking-widest font-bold">
                サポート
              </span>
              <a
                href="https://forms.gle/pN8vUF9sQMPnZWc5A"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-sm hover:text-white transition-colors duration-150"
              >
                お問い合わせ
                <LuExternalLink className="text-xs shrink-0" />
              </a>
              {session && <FooterWithdrawLink userId={session.user.id} />}
            </div>
          </div>
        </div>

        {/* コピーライト */}
        <div className="flex justify-center pt-5 text-xs text-neutral-400">
          © {new Date().getFullYear()} バトレコ
        </div>
      </div>
    </footer>
  );
}
