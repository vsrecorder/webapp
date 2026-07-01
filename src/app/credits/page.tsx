export default function Page() {
  return (
    <div className="flex flex-col">
      <div className="-mx-2 bg-linear-to-br from-slate-600 via-slate-700 to-neutral-800 text-white px-6 py-10 flex flex-col items-center gap-2 text-center">
        <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
          Legal
        </span>
        <h1 className="text-2xl font-black">クレジット</h1>
      </div>

      <div className="max-w-3xl mx-auto w-full px-4 pt-8 pb-12 flex flex-col gap-4">
        <div className="rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 shadow-sm overflow-hidden">
          <div className="px-6 py-5 text-sm leading-relaxed">
            <h2 className="font-bold text-foreground mb-2.5">ポケモン画像スプライト</h2>
            <p className="text-neutral-600 dark:text-neutral-400 mb-3">
              本サービスで使用しているポケモンの画像スプライトは「National Pokedex - Icon
              Dex」プロジェクトの素材を使用しています。
              制作に関わった方々の詳細なクレジットは下記のリンクをご参照ください。
            </p>
            <a
              href="https://docs.google.com/spreadsheets/d/1kI_PDXnbghxjN2LBvxA6Pz-QqMYlVGN3Z1EivXOYwNY"
              className="inline-flex items-center gap-1.5 text-primary hover:underline font-medium"
            >
              クレジット一覧
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                <polyline points="15 3 21 3 21 9" />
                <line x1="10" y1="14" x2="21" y2="3" />
              </svg>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
