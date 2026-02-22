export default function Page() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-12 text-sm leading-relaxed">
      <div className="flex flex-col gap-10">
        {/* タイトル */}
        <section className="px-12.5text-sm">
          <h1 className="text-2xl font-bold mb-5">プライバシーポリシー</h1>
          <p>
            バトレコ（以下、「運営者」といいます。）は、本ウェブサイト上で提供するサービス（以下、「本サービス」といいます。）における、
            ユーザーの個人情報の取扱いについて、以下のとおりプライバシーポリシー（以下、「本ポリシー」といいます。）を定めます。
          </p>
        </section>

        {/* 第1条 */}
        <section className="px-12.5text-sm">
          <h2 className="text-lg font-semibold mb-3">第1条（個人情報）</h2>
          <p>
            「個人情報」とは、個人情報保護法にいう「個人情報」を指すものとし、生存する個人に関する情報であって、
            当該情報に含まれる氏名、生年月日、住所、電話番号、連絡先その他の記述等により特定の個人を識別できる情報及び
            容貌、指紋、声紋にかかるデータ、及び健康保険証の保険者番号などの当該情報単体から特定の個人を識別できる情報（個人識別情報）を指します。
          </p>
        </section>

        {/* 第2条 */}
        <section className="px-12.5text-sm">
          <h2 className="text-lg font-semibold mb-3">第2条（個人情報の収集方法）</h2>
          <p>
            運営者は、ユーザーが利用登録をする際に氏名、生年月日、住所、電話番号、メールアドレス、銀行口座番号、
            クレジットカード番号、運転免許証番号などの個人情報をお尋ねすることがあります。
            また、ユーザーと提携先などとの間でなされたユーザーの個人情報を含む取引記録や決済に関する情報を、
            運営者の提携先（情報提供元、広告主、広告配信先などを含みます。以下、「提携先」といいます。）などから収集することがあります。
          </p>
        </section>

        {/* 第3条 */}
        <section className="px-12.5text-sm">
          <h2 className="text-lg font-semibold mb-3">
            第3条（個人情報を収集・利用する目的）
          </h2>
          <p>運営者が個人情報を収集・利用する目的は、以下のとおりです。</p>
          <ul className="list-disc pl-6 mt-2 space-y-1">
            <li>運営者サービスの提供・運営のため</li>
            <li>ユーザーからのお問い合わせに回答するため（本人確認を行うことを含む）</li>
            <li>新機能、更新情報、キャンペーン等の案内メール送付のため</li>
            <li>メンテナンス、重要なお知らせなど必要に応じたご連絡のため</li>
            <li>不正利用ユーザーの特定および利用停止のため</li>
            <li>登録情報の閲覧・変更・削除、ご利用状況の閲覧のため</li>
            <li>有料サービスの利用料金請求のため</li>
            <li>上記に付随する目的</li>
          </ul>
        </section>

        {/* 第4条 */}
        <section className="px-12.5text-sm">
          <h2 className="text-lg font-semibold mb-3">第4条（利用目的の変更）</h2>
          <ul className="list-disc pl-6 space-y-1">
            <li>合理的関連性がある場合に限り利用目的を変更します。</li>
            <li>変更後は通知またはウェブサイト上で公表します。</li>
          </ul>
        </section>

        {/* 第5条 */}
        <section className="px-12.5text-sm">
          <h2 className="text-lg font-semibold mb-3">第5条（個人情報の第三者提供）</h2>
          <ul className="list-disc pl-6 space-y-2">
            <li>
              法令で認められる場合を除き、ユーザーの同意なく第三者提供は行いません。
              <ul className="list-disc pl-6 mt-2 space-y-1">
                <li>生命・身体・財産保護のため必要な場合</li>
                <li>公衆衛生向上や児童育成推進のため必要な場合</li>
                <li>国や地方公共団体の法定事務への協力が必要な場合</li>
                <li>事前告知・公表および個人情報保護委員会への届出を行った場合</li>
              </ul>
            </li>
            <li>委託・事業承継・共同利用の場合は第三者に該当しません。</li>
          </ul>
        </section>

        {/* 第6条 */}
        <section className="px-12.5text-sm">
          <h2 className="text-lg font-semibold mb-3">第6条（個人情報の開示）</h2>
          <ul className="list-disc pl-6 space-y-1">
            <li>
              本人から請求があった場合は遅滞なく開示します。
              ただし一定の場合は非開示とすることがあります。
              開示手数料は1件あたり1,000円です。
            </li>
            <li>履歴情報等は原則開示いたしません。</li>
          </ul>
        </section>

        {/* 第7条 */}
        <section className="px-12.5text-sm">
          <h2 className="text-lg font-semibold mb-3">
            第7条（個人情報の訂正および削除）
          </h2>
          <ul className="list-disc pl-6 space-y-1">
            <li>ユーザーは訂正・追加・削除を請求できます。</li>
            <li>必要と判断した場合は遅滞なく対応します。</li>
            <li>結果は通知します。</li>
          </ul>
        </section>

        {/* 第8条 */}
        <section className="px-12.5text-sm">
          <h2 className="text-lg font-semibold mb-3">第8条（個人情報の利用停止等）</h2>
          <ul className="list-disc pl-6 space-y-1">
            <li>利用停止等の請求があった場合は調査を行います。</li>
            <li>必要と判断した場合は利用停止等を行います。</li>
            <li>結果は通知します。</li>
            <li>困難な場合は代替措置を講じます。</li>
          </ul>
        </section>

        {/* 第9条 */}
        <section className="px-12.5text-sm pb-16">
          <h2 className="text-lg font-semibold mb-3">
            第9条（プライバシーポリシーの変更）
          </h2>
          <ul className="list-disc pl-6 space-y-1">
            <li>本ポリシーは通知なく変更できるものとします。</li>
            <li>掲載時から効力を生じます。</li>
          </ul>
        </section>
      </div>
    </div>
  );
}
