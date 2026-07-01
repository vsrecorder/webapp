export default function Page() {
  return (
    <div className="flex flex-col">
      <div className="-mx-2 bg-linear-to-br from-slate-600 via-slate-700 to-neutral-800 text-white px-6 py-10 flex flex-col items-center gap-2 text-center">
        <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
          Legal
        </span>
        <h1 className="text-2xl font-black">本サービスにつきまして</h1>
      </div>

      <div className="max-w-3xl mx-auto w-full px-4 pt-8 pb-12 flex flex-col gap-4">
        <div className="rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 shadow-sm overflow-hidden">
          <div className="px-6 py-5 text-sm leading-relaxed border-b border-neutral-100 dark:border-neutral-800">
            <h2 className="font-bold text-foreground mb-2.5">商標について</h2>
            <p className="text-neutral-600 dark:text-neutral-400">
              ポケットモンスター・ポケモン・Pokémonは任天堂、クリーチャーズ、ゲームフリークの登録商標です。
              当サービスはファンサービスであり、任天堂、クリーチャーズ、ゲームフリーク、および株式会社ポケモンとは一切関係ありません。
              本サービスはポケモン関連の権利者の権利を侵害する意図はありません。
            </p>
          </div>

          <div className="px-6 py-5 text-sm leading-relaxed">
            <h2 className="font-bold text-foreground mb-2.5">権利者の方へ</h2>
            <p className="text-neutral-600 dark:text-neutral-400">
              本サービスのコンテンツが権利者の権利を侵害していると思われる場合は、本サービスのお問い合わせフォームよりご連絡ください。
              内容を確認の上、速やかに対応いたします。
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
