import Image from "next/image";
import Link from "next/link";
import { LuExternalLink } from "react-icons/lu";

export default async function Footer() {
  return (
    <footer className="-mx-2 mt-8 bg-neutral-900 dark:bg-neutral-950 dark:border-t dark:border-neutral-800 text-neutral-400">
      <div className="max-w-2xl mx-auto px-6 pt-10 pb-8">
        {/* ブランド + リンクグループ */}
        <div className="flex flex-col sm:flex-row sm:justify-between gap-8 pb-8 border-b border-neutral-800">
          {/* ブランドエリア */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 relative shrink-0">
                <Image
                  src="/images/icon.png"
                  alt="バトレコ"
                  fill
                  sizes="32px"
                  className="object-contain rounded-lg"
                />
              </div>
              <span className="text-white font-bold text-base">バトレコ</span>
            </div>
            <p className="text-xs leading-relaxed">
              ポケカプレイヤーのための
              <br />
              対戦記録サービス
            </p>
          </div>

          {/* リンクグループ */}
          <div className="flex gap-10 sm:gap-12">
            <div className="flex flex-col gap-2.5">
              <span className="text-xs text-neutral-500 uppercase tracking-widest font-bold">
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
              <span className="text-xs text-neutral-500 uppercase tracking-widest font-bold">
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
            </div>
          </div>
        </div>

        {/* コピーライト */}
        <div className="flex justify-center pt-5 text-xs text-neutral-600">
          © {new Date().getFullYear()} バトレコ
        </div>
      </div>
    </footer>
  );
}
