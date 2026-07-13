import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "プライバシーポリシー",
  description:
    "バトレコにおけるユーザの個人情報の取扱いについて定めたプライバシーポリシーです。",
  alternates: {
    canonical: "/privacy",
  },
};

export default function Page() {
  return (
    <div className="flex flex-col">
      <div className="-mx-2 bg-linear-to-br from-slate-600 via-slate-700 to-neutral-800 text-white px-6 py-10 flex flex-col items-center gap-2 text-center">
        <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
          Legal
        </span>
        <h1 className="text-2xl font-black">プライバシーポリシー</h1>
        <p className="text-xs text-white/50 mt-1">最終改定日：2026年7月1日</p>
      </div>

      <div className="max-w-3xl mx-auto w-full px-4 pt-8 pb-12 flex flex-col gap-4">
        <p className="text-sm text-neutral-500 dark:text-neutral-400 leading-relaxed px-1">
          バトレコ（以下、「運営者」といいます。）は、本ウェブサイト上で提供するサービス（以下、「本サービス」といいます。）における、
          ユーザの個人情報の取扱いについて、以下のとおりプライバシーポリシー（以下、「本ポリシー」といいます。）を定めます。
        </p>

        <div className="rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 shadow-sm overflow-hidden">
          <Article no="第1条" title="個人情報">
            <p>
              「個人情報」とは、個人情報保護法にいう「個人情報」を指すものとし、生存する個人に関する情報であって、
              当該情報に含まれる氏名、生年月日、住所、電話番号、連絡先その他の記述等により特定の個人を識別できる情報及び
              容貌、指紋、声紋にかかるデータ、及び健康保険証の保険者番号などの当該情報単体から特定の個人を識別できる情報（個人識別情報）を指します。
            </p>
          </Article>

          <Article no="第2条" title="個人情報の収集方法">
            <p>
              運営者は、ユーザが利用登録をする際にメールアドレス、ユーザ名などの個人情報をお尋ねすることがあります。
              また、本サービスの利用に際してユーザが入力・登録したバトルデータ等の情報を収集します。
              有料サービスのご利用に際しては、決済代行業者を通じた支払情報の処理を行うことがありますが、クレジットカード情報等は運営者のサーバーには保存されません。
            </p>
          </Article>

          <Article no="第3条" title="個人情報を収集・利用する目的">
            <p className="mb-2">
              運営者が個人情報を収集・利用する目的は、以下のとおりです。
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>運営者サービスの提供・運営のため</li>
              <li>ユーザからのお問い合わせに回答するため（本人確認を行うことを含む）</li>
              <li>新機能、更新情報、キャンペーン等の案内メール送付のため</li>
              <li>メンテナンス、重要なお知らせなど必要に応じたご連絡のため</li>
              <li>不正利用ユーザの特定および利用停止のため</li>
              <li>登録情報の閲覧・変更・削除、ご利用状況の閲覧のため</li>
              <li>有料サービスの利用料金請求のため</li>
              <li>上記に付随する目的</li>
            </ul>
          </Article>

          <Article no="第4条" title="利用目的の変更">
            <ul className="list-disc pl-5 space-y-1">
              <li>合理的関連性がある場合に限り利用目的を変更します。</li>
              <li>変更後は通知またはウェブサイト上で公表します。</li>
            </ul>
          </Article>

          <Article no="第5条" title="個人情報の第三者提供">
            <ul className="list-disc pl-5 space-y-2">
              <li>
                法令で認められる場合を除き、ユーザの同意なく第三者提供は行いません。
                <ul className="list-disc pl-5 mt-2 space-y-1">
                  <li>生命・身体・財産保護のため必要な場合</li>
                  <li>公衆衛生向上や児童育成推進のため必要な場合</li>
                  <li>国や地方公共団体の法定事務への協力が必要な場合</li>
                  <li>事前告知・公表および個人情報保護委員会への届出を行った場合</li>
                </ul>
              </li>
              <li>委託・事業承継・共同利用の場合は第三者に該当しません。</li>
            </ul>
          </Article>

          <Article no="第6条" title="個人情報の開示">
            <ul className="list-disc pl-5 space-y-1">
              <li>
                本人から請求があった場合は遅滞なく開示します。
                ただし一定の場合は非開示とすることがあります。
                開示手数料は1件あたり1,000円です。
              </li>
              <li>履歴情報等は原則開示いたしません。</li>
            </ul>
          </Article>

          <Article no="第7条" title="個人情報の訂正および削除">
            <ul className="list-disc pl-5 space-y-1">
              <li>ユーザは訂正・追加・削除を請求できます。</li>
              <li>必要と判断した場合は遅滞なく対応します。</li>
              <li>結果は通知します。</li>
            </ul>
          </Article>

          <Article no="第8条" title="個人情報の利用停止等">
            <ul className="list-disc pl-5 space-y-1">
              <li>利用停止等の請求があった場合は調査を行います。</li>
              <li>必要と判断した場合は利用停止等を行います。</li>
              <li>結果は通知します。</li>
              <li>困難な場合は代替措置を講じます。</li>
            </ul>
          </Article>

          <Article no="第9条" title="Cookieおよびアクセス解析ツールの利用">
            <p>
              本サービスでは、サービス向上および利用状況の把握を目的として、Cookieおよびアクセス解析ツール（Google
              アナリティクス等）を使用することがあります。
              これらのツールはデータ収集のためにCookieを使用しますが、個人を特定する情報は収集しません。
              ブラウザの設定によりCookieを無効にすることができますが、一部機能が利用できなくなる場合があります。
              Google
              アナリティクスのデータ収集・処理の詳細については、Googleのプライバシーポリシーをご参照ください。
            </p>
          </Article>

          <Article no="第10条" title="プライバシーポリシーの変更">
            <ul className="list-disc pl-5 space-y-1">
              <li>本ポリシーは、必要に応じて変更することがあります。</li>
              <li>
                重要な変更がある場合は、ウェブサイト上での告知またはユーザへの通知により事前にお知らせします。
              </li>
              <li>変更後のポリシーは、掲載時から効力を生じます。</li>
            </ul>
          </Article>

          <Article no="第11条" title="お問い合わせ窓口" last>
            <p>
              本ポリシーに関するご質問、個人情報の開示・訂正・削除・利用停止のご請求、その他個人情報の取扱いに関するお問い合わせは、
              本サービスのお問い合わせフォームよりご連絡ください。
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
