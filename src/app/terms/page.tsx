export default function Page() {
  return (
    <div className="flex flex-col">
      <div className="-mx-2 bg-linear-to-br from-slate-600 via-slate-700 to-neutral-800 text-white px-6 py-10 flex flex-col items-center gap-2 text-center">
        <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
          Legal
        </span>
        <h1 className="text-2xl font-black">利用規約</h1>
        <p className="text-xs text-white/50 mt-1">最終改定日：2026年7月1日</p>
      </div>

      <div className="max-w-3xl mx-auto w-full px-4 pt-8 pb-12 flex flex-col gap-4">
        <p className="text-sm text-neutral-500 dark:text-neutral-400 leading-relaxed px-1">
          この利用規約（以下、「本規約」といいます。）は、バトレコ（以下「運営者」といいます。）がこのウェブサイト上で提供するサービス（以下「本サービス」といいます。）の利用条件を定めるものです。
          本サービスの利用者の皆さま（以下「ユーザー」といいます。）には、本規約に従って、本サービスをご利用いただきます。
        </p>

        <div className="rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 shadow-sm overflow-hidden">
          <Article no="第1条" title="適用">
            <p>
              本規約は、ユーザーと運営者との間の本サービスの利用に関わる一切の関係に適用されるものとします。
              運営者は本サービスに関し、本規約のほか、ご利用にあたってのルール等、各種の定め（以下「個別規定」といいます。）をすることがあります。
              これら個別規定はその名称のいかんに関わらず、本規約の一部を構成するものとします。
              本規約の規定が個別規定の規定と矛盾する場合には、個別規定の規定が優先されるものとします。
            </p>
          </Article>

          <Article no="第2条" title="利用資格">
            <p className="mb-2">
              本サービスは以下の条件をすべて満たす方に限りご利用いただくことができます。
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>本規約に同意かつ遵守できる方</li>
              <li>過去に本規約に違反したことのない方</li>
              <li>未成年の方は、保護者の同意を得た上でご利用ください</li>
            </ul>
          </Article>

          <Article no="第3条" title="認証情報の管理">
            <p>
              ユーザーは、自己の責任において、本サービスの認証情報（パスワード等を含みます。）を適切に管理するものとします。
              認証情報の管理不十分等により第三者によって使用されたことによって生じた損害について、
              運営者は一切の責任を負いません。
            </p>
          </Article>

          <Article no="第4条" title="利用登録">
            <p className="mb-2">
              本サービスへの登録を希望する方は、本規約に同意のうえ、運営者の定める方法により利用登録を申請するものとします。
              運営者は、以下の場合に登録を拒否することがあります。
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>虚偽の事項を届け出た場合</li>
              <li>本規約に違反したことがある者からの申請である場合</li>
              <li>その他、運営者が利用登録を相当でないと判断した場合</li>
            </ul>
          </Article>

          <Article no="第5条" title="禁止事項">
            <p className="mb-2">ユーザーは、本サービスの利用にあたり、以下の行為をしてはなりません。</p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>法令または公序良俗に違反する行為</li>
              <li>犯罪行為に関連する行為</li>
              <li>著作権、商標権その他の知的財産権を侵害する行為</li>
              <li>他のユーザーまたは第三者になりすます行為</li>
              <li>不正アクセスその他のコンピュータへの不正な操作行為</li>
              <li>
                以下の表現を含む投稿行為
                <ul className="list-disc pl-5 mt-1.5 space-y-1">
                  <li>過度に暴力的な表現</li>
                  <li>露骨な性的表現</li>
                  <li>差別につながる表現</li>
                  <li>自殺・薬物乱用を助長する表現</li>
                  <li>その他反社会的な表現</li>
                </ul>
              </li>
              <li>宗教活動または宗教団体への勧誘行為</li>
              <li>スパム行為その他の迷惑行為</li>
              <li>その他、運営者が不適切と判断する行為</li>
            </ul>
          </Article>

          <Article no="第6条" title="本サービスの提供の停止等">
            <p className="mb-2">
              運営者は、以下のいずれかの事由があると判断した場合、ユーザーに事前に通知することなく、
              本サービスの全部または一部の提供を停止または中断することができるものとします。
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>本サービスにかかるコンピュータシステムの保守点検または更新を行う場合</li>
              <li>地震、落雷、火災、停電または天災などの不可抗力により提供が困難となった場合</li>
              <li>コンピュータまたは通信回線等が事故により停止した場合</li>
              <li>その他、運営者が提供困難と判断した場合</li>
            </ul>
            <p className="mt-3">
              運営者は、停止または中断により生じた損害について一切の責任を負いません。
            </p>
          </Article>

          <Article no="第7条" title="著作権">
            <p>
              ユーザーは、自ら必要な知的財産権を有するか、権利者の許諾を得た情報のみ投稿できます。
              投稿コンテンツの著作権はユーザーまたは既存の権利者に留保されます。
              ただし運営者は、本サービスの改良・周知等の目的で必要な範囲で利用できるものとします。
            </p>
          </Article>

          <Article no="第8条" title="利用制限および登録抹消">
            <p className="mb-2">
              ユーザーが以下に該当する場合、運営者は事前通知なく利用制限または登録抹消を行うことができます。
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>本規約違反</li>
              <li>登録事項に虚偽が判明した場合</li>
              <li>決済手段が利用停止となった場合</li>
              <li>料金支払の不履行</li>
              <li>一定期間利用がない場合</li>
              <li>その他運営者が不適当と判断した場合</li>
            </ul>
            <p className="mt-3">これにより生じた損害について運営者は責任を負いません。</p>
          </Article>

          <Article no="第9条" title="退会">
            <p>ユーザーは、運営者の定める手続きにより退会できます。</p>
          </Article>

          <Article no="第10条" title="保証の否認および免責事項">
            <p>
              運営者は、本サービスに瑕疵がないことを保証しません。
              法令上ユーザーに対して負う責任を除き、本サービスに起因する損害について責任を負いません。
              賠償額は、当該月に受領した利用料を上限とします。
            </p>
          </Article>

          <Article no="第11条" title="サービス内容の変更等">
            <p>
              運営者は、本サービスの内容を変更、追加または廃止することがあり、
              これにより生じた損害について責任を負いません。
            </p>
          </Article>

          <Article no="第12条" title="利用規約の変更">
            <p>
              運営者は、必要と判断した場合には、ユーザーへの通知またはウェブサイト上での告知をもって本規約を変更することができます。
              ユーザーに不利益となる変更を行う場合には、事前に相当な期間をもってお知らせします。
              変更後も本サービスをご利用になった場合は、変更後の規約に同意したものとみなします。
            </p>
          </Article>

          <Article no="第13条" title="個人情報の取扱い">
            <p>
              本サービスの利用によって取得する個人情報は、別途定めるプライバシーポリシーに従い取り扱います。
            </p>
          </Article>

          <Article no="第14条" title="通知または連絡">
            <p>
              ユーザーと運営者との間の通知は、運営者の定める方法により行います。
              登録連絡先へ発信した時点で到達したものとみなします。
            </p>
          </Article>

          <Article no="第15条" title="権利義務の譲渡の禁止">
            <p>
              ユーザーは、運営者の事前承諾なく、利用契約上の地位または権利義務を第三者に譲渡できません。
            </p>
          </Article>

          <Article no="第16条" title="準拠法・裁判管轄" last>
            <p>
              本規約の解釈にあたっては、日本法を準拠法とします。
              本サービスに関して紛争が生じた場合には、運営者の本店所在地を管轄する裁判所を専属的合意管轄とします。
            </p>
          </Article>
        </div>
      </div>
    </div>
  );
}

function Article({
  no,
  title,
  children,
  last = false,
}: {
  no: string;
  title: string;
  children: React.ReactNode;
  last?: boolean;
}) {
  return (
    <div
      className={`px-6 py-5 text-sm leading-relaxed ${
        !last ? "border-b border-neutral-100 dark:border-neutral-800" : ""
      }`}
    >
      <h2 className="font-bold text-foreground mb-2.5 flex items-baseline gap-2">
        <span className="text-xs font-bold text-primary shrink-0">{no}</span>
        <span>{title}</span>
      </h2>
      <div className="text-neutral-600 dark:text-neutral-400">{children}</div>
    </div>
  );
}
