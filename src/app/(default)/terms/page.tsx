export default function Page() {
  return (
    <div className="flex flex-col gap-10 py-10">
      <section className="px-12.5 text-sm">
        <h1 className="text-2xl font-bold mb-5">利用規約</h1>
        <p>
          この利用規約（以下、「本規約」といいます。）は、バトレコ（以下「運営者」といいます。）がこのウェブサイト上で提供するサービス（以下「本サービス」といいます。）の利用条件を定めるものです。
          本サービスの利用者の皆さま（以下「ユーザー」といいます。）には、本規約に従って、本サービスをご利用いただきます。
        </p>
      </section>

      <section className="px-12.5 text-sm">
        <h2 className="text-lg font-semibold mb-3">第1条（適用）</h2>
        <p>
          本規約は、ユーザーと運営者との間の本サービスの利用に関わる一切の関係に適用されるものとします。
          運営者は本サービスに関し、本規約のほか、ご利用にあたってのルール等、各種の定め（以下「個別規定」といいます。）をすることがあります。
          これら個別規定はその名称のいかんに関わらず、本規約の一部を構成するものとします。
          本規約の規定が個別規定の規定と矛盾する場合には、個別規定の規定が優先されるものとします。
        </p>
      </section>

      <section className="px-12.5 text-sm">
        <h2 className="text-lg font-semibold mb-3">第2条（利用資格）</h2>
        <p>本サービスは以下の条件をすべて満たす方に限りご利用いただくことができます。</p>
        <ul className="list-disc pl-6 mt-2 space-y-1">
          <li>本規約に同意かつ遵守できる方</li>
          <li>過去に本規約に違反したことのない方</li>
        </ul>
      </section>

      <section className="px-12.5 text-sm">
        <h2 className="text-lg font-semibold mb-3">第3条（認証情報の管理）</h2>
        <p>
          ユーザーは、自己の責任において、本サービスの認証情報を適切に管理するものとします。
          認証情報の管理不十分等により第三者によって使用されたことによって生じた損害について、
          運営者は一切の責任を負いません。
        </p>
      </section>

      <section className="px-12.5 text-sm">
        <h2 className="text-lg font-semibold mb-3">第5条（禁止事項）</h2>
        <p>ユーザーは、本サービスの利用にあたり、以下の行為をしてはなりません。</p>

        <ul className="list-disc pl-6 mt-2 space-y-2">
          <li>法令または公序良俗に違反する行為</li>
          <li>犯罪行為に関連する行為</li>
          <li>
            以下の表現を含む投稿行為
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>過度に暴力的な表現</li>
              <li>露骨な性的表現</li>
              <li>差別につながる表現</li>
              <li>自殺・薬物乱用を助長する表現</li>
              <li>その他反社会的な表現</li>
            </ul>
          </li>
          <li>宗教活動または宗教団体への勧誘行為</li>
          <li>その他、運営者が不適切と判断する行為</li>
        </ul>
      </section>

      <section className="px-12.5 text-sm">
        <h2 className="text-lg font-semibold mb-3">第6条（本サービスの提供の停止等）</h2>
        <p>
          運営者は、以下のいずれかの事由があると判断した場合、ユーザーに事前に通知することなく、
          本サービスの全部または一部の提供を停止または中断することができるものとします。
        </p>
        <ul className="list-disc pl-6 mt-2 space-y-1">
          <li>本サービスにかかるコンピュータシステムの保守点検または更新を行う場合</li>
          <li>
            地震、落雷、火災、停電または天災などの不可抗力により提供が困難となった場合
          </li>
          <li>コンピュータまたは通信回線等が事故により停止した場合</li>
          <li>その他、運営者が提供困難と判断した場合</li>
        </ul>
        <p className="mt-4">
          運営者は、停止または中断により生じた損害について一切の責任を負いません。
        </p>
      </section>

      <section className="px-12.5 text-sm">
        <h2 className="text-lg font-semibold mb-3">第7条（著作権）</h2>
        <p>
          ユーザーは、自ら必要な知的財産権を有するか、権利者の許諾を得た情報のみ投稿できます。
          投稿コンテンツの著作権はユーザーまたは既存の権利者に留保されます。
          ただし運営者は、本サービスの改良・周知等の目的で必要な範囲で利用できるものとします。
        </p>
      </section>

      <section className="px-12.5 text-sm">
        <h2 className="text-lg font-semibold mb-3">第8条（利用制限および登録抹消）</h2>
        <p>
          ユーザーが以下に該当する場合、運営者は事前通知なく利用制限または登録抹消を行うことができます。
        </p>
        <ul className="list-disc pl-6 mt-2 space-y-1">
          <li>本規約違反</li>
          <li>登録事項に虚偽が判明した場合</li>
          <li>決済手段が利用停止となった場合</li>
          <li>料金支払の不履行</li>
          <li>一定期間利用がない場合</li>
          <li>その他運営者が不適当と判断した場合</li>
        </ul>
        <p className="mt-4">これにより生じた損害について運営者は責任を負いません。</p>
      </section>

      <section className="px-12.5 text-sm">
        <h2 className="text-lg font-semibold mb-3">第9条（退会）</h2>
        <p>ユーザーは、運営者の定める手続きにより退会できます。</p>
      </section>

      <section className="px-12.5 text-sm">
        <h2 className="text-lg font-semibold mb-3">第10条（保証の否認および免責事項）</h2>
        <p>
          運営者は、本サービスに瑕疵がないことを保証しません。
          重過失を除き、本サービスに起因する損害について責任を負いません。
          賠償額は、当該月に受領した利用料を上限とします。
        </p>
      </section>

      <section className="px-12.5 text-sm">
        <h2 className="text-lg font-semibold mb-3">第11条（サービス内容の変更等）</h2>
        <p>
          運営者は、本サービスの内容を変更、追加または廃止することがあり、
          これにより生じた損害について責任を負いません。
        </p>
      </section>

      <section className="px-12.5 text-sm">
        <h2 className="text-lg font-semibold mb-3">第12条（利用規約の変更）</h2>
        <p>
          運営者は、通知またはウェブサイト上で告知することにより本規約を変更できます。
          変更により生じた損害について責任を負いません。
        </p>
      </section>

      <section className="px-12.5 text-sm">
        <h2 className="text-lg font-semibold mb-3">第13条（個人情報の取扱い）</h2>
        <p>
          本サービスの利用によって取得する個人情報は、別途定めるプライバシーポリシーに従い取り扱います。
        </p>
      </section>

      <section className="px-12.5 text-sm">
        <h2 className="text-lg font-semibold mb-3">第14条（通知または連絡）</h2>
        <p>
          ユーザーと運営者との間の通知は、運営者の定める方法により行います。
          登録連絡先へ発信した時点で到達したものとみなします。
        </p>
      </section>

      <section className="px-12.5 text-sm">
        <h2 className="text-lg font-semibold mb-3">第15条（権利義務の譲渡の禁止）</h2>
        <p>
          ユーザーは、運営者の事前承諾なく、利用契約上の地位または権利義務を第三者に譲渡できません。
        </p>
      </section>

      <section className="px-12.5 text-sm pb-16">
        <h2 className="text-lg font-semibold mb-3">第16条（準拠法・裁判管轄）</h2>
        <p>
          本規約の解釈にあたっては、日本法を準拠法とします。
          本サービスに関して紛争が生じた場合には、運営者の本店所在地を管轄する裁判所を専属的合意管轄とします。
        </p>
      </section>
    </div>
  );
}
