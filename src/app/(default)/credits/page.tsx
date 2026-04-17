export default function Page() {
  return (
    <div className="max-w-3xl mx-auto px-3 py-6 text-sm leading-relaxed">
      <div className="flex flex-col gap-10 py-3">
        <section className="px-6 text-sm">
          <h1 className="text-2xl font-bold mb-5">クレジット</h1>
          <p>
            本サービスで使用しているポケモンの画像スプライトは「National Pokedex - Icon
            Dex」プロジェクトの素材を使用しています。
            制作に関わった方々の詳細なクレジットは下記のリンクをご参照ください。
          </p>
          <a
            href="https://docs.google.com/spreadsheets/d/1kI_PDXnbghxjN2LBvxA6Pz-QqMYlVGN3Z1EivXOYwNY"
            className="underline"
          >
            クレジット一覧
          </a>
        </section>
      </div>
    </div>
  );
}
