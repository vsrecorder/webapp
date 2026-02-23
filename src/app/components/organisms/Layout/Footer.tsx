import { LuExternalLink } from "react-icons/lu";

export default async function Footer() {
  return (
    <footer className="text-center pt-27 pb-0 p-6 w-full">
      <div className="flex flex-col items-center">
        {/* 上段リンク */}
        <div className="flex gap-3">
          <a href="/faq" className="text-sm">
            FAQ
          </a>

          <a href="/terms" className="text-sm">
            利用規約
          </a>

          <a href="/privacy" className="text-sm">
            プライバシー ポリシー
          </a>
        </div>

        {/* 下段リンク */}
        <div className="flex gap-3 mt-2">
          <a href="/policy" className="text-sm">
            本サービスにつきまして
          </a>

          <a
            href="https://forms.gle/pN8vUF9sQMPnZWc5A"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-0.75 text-sm"
          >
            <span className="pr-1">問い合わせフォーム</span>
            <LuExternalLink />
          </a>
        </div>

        <div className="p-3" />

        <p>© {new Date().getFullYear()} バトレコ</p>
      </div>
    </footer>
  );
}
