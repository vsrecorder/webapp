import Link from "next/link";

import {
  LuHeartHandshake,
  LuWrench,
  LuCalendarHeart,
  LuSwords,
  LuSprout,
  LuPawPrint,
  LuBadgeJapaneseYen,
  LuMegaphoneOff,
} from "react-icons/lu";

import Footer from "@app/components/organisms/Layout/Footer";
import KizunaDeckCardPreview from "@app/components/organisms/Kizuna/KizunaDeckCardPreview";
import KizunaEstimatorSection from "@app/components/organisms/Kizuna/KizunaEstimatorSection";
import { KizunaPreviewProvider } from "@app/components/organisms/Kizuna/KizunaPreviewContext";
import KizunaScrollLink from "@app/components/molecules/Kizuna/KizunaScrollLink";
import SocialSignIn from "@app/components/molecules/SignIn/SocialSingIn";

// 「きずな」を構成する指標の抜粋。いずれも勝率を含まないことが重要で、
// 逆境ロイヤルティに至っては負けるほど値が上がる。
const metrics = [
  {
    icon: <LuHeartHandshake />,
    title: "逆境ロイヤルティ",
    description:
      "負けが続いても持ち替えずに握り続けた回数。この指標だけは勝てないほど深くなります。",
  },
  {
    icon: <LuWrench />,
    title: "手入れ度",
    description:
      "デッキを組み直した回数とその時刻。大会前夜に1枚を入れ替えて悩んだ時間も記録には残っています。",
  },
  {
    icon: <LuCalendarHeart />,
    title: "同行日数",
    description:
      "棚に置いていた期間ではなく、実際に一緒に会場へ行った日数。持っているだけの日は数えません。",
  },
  {
    icon: <LuSwords />,
    title: "託し度",
    description:
      "どの舞台に連れて行ったか。ジムバトル100回より、シティリーグの3回のほうが「託した」と言えます。",
  },
  {
    icon: <LuSprout />,
    title: "共成長",
    description:
      "勝率が上がったかではなく、負け方が良くなったか。サイドを取れずに負けていた人が、あと1枚まで詰めて落とすようになったなら、それは成長です。",
  },
  {
    icon: <LuPawPrint />,
    title: "相棒ポケモン",
    description:
      "デッキを横断して集計します。構築が別物になってもそのポケモンだけは連れて行った——を見つけ出します。",
  },
];

// 新規獲得の核。きずなLv.は過去の記録から算出されるため、
// 「早く記録を始めた人ほど深くなる」という構造そのものが、今日はじめる理由になる。
const reasons = [
  {
    no: "1",
    title: "きずなLv.は、過去の記録から算出される",
    description:
      "今からゼロで始まるのではありません。あなたがこれまでに積み重ねた対戦記録が、そのまま今のきずなLv.になります。",
  },
  {
    no: "2",
    title: "今日つけた記録が、明日の同行日数になる",
    description:
      "同行日数も、手入れ度も、逆境ロイヤルティも、記録がなければ計算できません。記録していない日は、なかったことになります。",
  },
  {
    no: "3",
    title: "だから、1日でも早く始めた人ほど深い",
    description:
      "昨日から記録している人と、今日から始める人。いま表示されるきずなLv.は、同じにはなりません。",
  },
];

type Props = {
  // 未ログインなら null。CTAの出し分けと、きずなLv.の算出方法の切り替えに使う。
  userId: string | null;
};

export default function TemplateKizuna({ userId }: Props) {
  const isLoggedIn = userId !== null;
  /*
   * <main>（templates/Layout.tsx）の余白を負のマージンで打ち消し、地色と
   * ヒーローをページ全面に広げるための指定。
   * <main> の余白はログイン状態で変わる（会員のみ pb-14 と md 以上の横余白が付く）ため、
   * 打ち消す量も出し分ける。打ち消したうえで px-2 を敷き直し、内側からは
   * ログイン状態によらず同じ箱に見えるようにしている。
   */
  const bleedClass = isLoggedIn
    ? "-mx-2 -mb-14 md:-mx-32 lg:-mx-12 lg:-mb-6 xl:-mx-20 2xl:-mx-32"
    : "-mx-2 -mb-2 lg:-mb-6";

  return (
    /*
     * このページは端末のテーマ設定によらず、常にダークの配色で表示する
     * （黄昏に灯がともる、という世界観を崩さないため）。
     *
     * globals.css の `@custom-variant dark (&:is(.dark *):not(.light *))` により、
     * 祖先に .dark があれば配下の dark: バリアントと HeroUI のセマンティックカラー
     * （default-200 / content1 など）がダーク側に切り替わる。
     */
    <div
      className={`dark -mt-14 min-h-svh bg-neutral-950 px-2 pt-14 text-foreground lg:-mt-28 lg:pt-28 ${bleedClass}`}
    >
      {/* ヒーロー：OGP画像と同じ「黄昏に灯がともる」世界観。
          トップページの青系ヒーローとは意図的に色を変え、β版の新機能であることを視覚的に区別する。 */}
      <section className="-mx-2 -mt-14 lg:-mt-28 relative overflow-hidden bg-linear-to-br from-indigo-950 via-slate-900 to-neutral-950 px-6 pt-24 pb-16 lg:px-8 lg:pt-40 lg:pb-24 text-white">
        {/* 焚き火の残光 */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-32 right-0 h-96 w-96 rounded-full bg-amber-500/20 blur-3xl"
        />

        <div className="relative mx-auto flex w-full max-w-2xl lg:max-w-5xl flex-col gap-8 lg:gap-9">
          <span className="inline-flex w-fit items-center gap-2.5 rounded-full border border-amber-400/40 bg-amber-400/10 px-4 py-2 text-xs lg:text-sm font-bold tracking-widest text-amber-200">
            <span className="h-2 w-2 shrink-0 animate-pulse rounded-full bg-amber-400" />
            新機能「きずな」β版公開中
          </span>

          {/* 主語（勝率／きずな）を一段大きくし、述部と色を揃える。
              読む前に「どちらの話か」が色で伝わることが、この見出しの狙い。 */}
          {/* lg以上では1行に収まるためnowrapで折り返しを禁止する。
              text-4xl以上に上げると max-w-5xl を超えて「を語／る。」が割れる。 */}
          <h1 className="flex flex-col gap-3 text-2xl lg:text-4xl font-black leading-relaxed lg:leading-relaxed tracking-tight text-balance lg:whitespace-nowrap">
            <span className="text-white/60">
              <span className="text-[1.28em] text-slate-300">勝率</span>
              は、そのデッキが
              <span className="text-slate-400">強かったか</span>を語る。
            </span>
            <span className="text-white/90">
              <span className="text-[1.28em] text-amber-400 drop-shadow-[0_0_28px_rgba(251,191,36,0.5)]">
                きずな
              </span>
              は、そのデッキと
              <span className="text-amber-400">どう歩んできたか</span>を語る。
            </span>
          </h1>

          <p className="max-w-xl text-sm lg:text-lg leading-relaxed text-white/60">
            負けても持ち替えなかった回数。
            <br />
            大会前夜に組み直した時刻。
            <br />
            対戦環境が変わっても連れて行ったポケモン。
            <br />
            <br className="hidden lg:block" />
            バトレコは対戦記録から「きずなLv.」を算出します。いま、β版として公開中です。
          </p>

          {/* β版であることを、試算を試す前に伝える。
              数値が後から変わったときに「勝手に下がった」と受け取られないための予防線。 */}
          <p className="max-w-xl rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-xs lg:text-sm leading-relaxed text-white/50">
            きずなは
            <span className="font-bold text-white/70">β版</span>
            です。いまは6指標で算出しており、今後、指標を追加していく予定です。指標の内容や重み付けは変更される可能性があり、同じ対戦記録でも数値が変わることがあります。
          </p>

          <div className="pt-3 flex flex-col gap-5 sm:flex-row sm:items-center">
            <KizunaScrollLink
              targetId="simulator"
              className="inline-flex items-center justify-center rounded-full bg-amber-400 px-8 py-3.5 text-base font-bold text-neutral-900 transition-opacity hover:opacity-90"
            >
              きずなLv.を試算してみる
            </KizunaScrollLink>
          </div>
        </div>
      </section>

      <div className="mx-auto flex w-full max-w-2xl lg:max-w-5xl flex-col gap-16 lg:gap-24 pt-14 lg:pt-24 lg:px-8">
        {/* なぜ今日から記録するのか（新規獲得の主動線） */}
        <section className="flex flex-col gap-4">
          <div className="flex flex-col items-center gap-1 text-center">
            <span className="text-xs lg:text-sm font-bold uppercase tracking-widest text-amber-600 dark:text-amber-400">
              Why today
            </span>
            <h2 className="text-2xl lg:text-4xl font-black">
              きずなLv.は記録した
              <br />
              その日から貯まりはじめる
            </h2>
            <p className="max-w-xl pt-2 text-sm lg:text-base leading-relaxed text-default-500">
              「きずな」は新しい入力を求めません。
              <br />
              あなたがこれまでつけてきた対戦記録から
              <br />
              そのまま算出されます。
            </p>
          </div>

          <div className="flex flex-col gap-4 pt-4 sm:flex-row lg:gap-6 lg:pt-8">
            {reasons.map((reason) => (
              <div
                key={reason.no}
                className="flex flex-1 flex-col gap-3 rounded-2xl border border-default-200 px-6 py-6 lg:px-7 lg:py-8"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-rose-500 to-amber-500 text-sm font-black text-white">
                  {reason.no}
                </span>
                <h3 className="text-base lg:text-lg font-bold leading-snug">
                  {reason.title}
                </h3>
                <p className="text-sm leading-relaxed text-default-500">
                  {reason.description}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* 試算セクションで選んだデッキ・試算した数値を、下のプレビューカードに映すための入れ物。
            Provider はDOMを生成しないため、配下のセクションは親の flex の直接の子のまま。 */}
        <KizunaPreviewProvider>
          {/* きずなLv.の試算。ログイン済みなら登録デッキの実データから算出し、
            未ログインなら質問に答えてもらう（KizunaEstimatorSection が出し分ける）。 */}
          <section id="simulator" className="flex scroll-mt-20 flex-col gap-4">
            <div className="flex flex-col items-center gap-1 text-center">
              <span className="text-xs lg:text-sm font-bold uppercase tracking-widest text-amber-600 dark:text-amber-400">
                Simulator
              </span>
              <h2 className="text-2xl lg:text-4xl font-black">きずなLv.を試算する</h2>
              <p className="max-w-xl pt-2 text-sm lg:text-base leading-relaxed text-default-500">
                {userId
                  ? "登録済みのデッキを選ぶだけです。あなたの対戦記録・デッキの組み直し履歴・メモから、きずなLv.を自動で算出します。質問には答えなくて構いません。"
                  : "いちばん長く使っているデッキを1つ思い浮かべて、その主役のポケモンを選び、5つの質問に答えてください。登録は不要です。結果は、そのポケモンが写ったカード画像にしてシェアできます。"}
              </p>
            </div>

            <div className="pt-4 lg:pt-8">
              <KizunaEstimatorSection userId={userId} />
            </div>
          </section>

          {/* 実装イメージ：β版のデッキ一覧できずなLv.がどう見えるか。
              試算の直後に置く。試算した値がそのままカードに載るため、
              「何を見て決まった数字か（指標）」より先に「どこに出るか」を見せる。 */}
          <section className="flex flex-col gap-4">
            <div className="flex flex-col items-center gap-1 text-center">
              <span className="text-xs lg:text-sm font-bold uppercase tracking-widest text-amber-600 dark:text-amber-400">
                Preview
              </span>
              <h2 className="text-2xl lg:text-4xl font-black">
                デッキ一覧では、
                <br className="sm:hidden" />
                こう見えます
              </h2>
              <p className="max-w-xl pt-2 text-sm lg:text-base leading-relaxed text-default-500">
                いま使っているデッキ一覧に、きずなLv.が加わります。ポケモンの背後に灯がともり、勝率の隣にもうひとつの軸が並びます。
                上で試算していれば、そのデッキで表示します。
              </p>
            </div>

            {/* 断り書き（架空の値か、試算した値か）はカードの状態で変わるため、
              KizunaDeckCardPreview 側が持つ。 */}
            <div className="pt-4 lg:pt-8">
              <KizunaDeckCardPreview />
            </div>
          </section>

          {/* 指標の紹介 */}
          <section className="flex flex-col gap-4">
            <div className="flex flex-col items-center gap-1 text-center">
              <span className="text-xs lg:text-sm font-bold uppercase tracking-widest text-amber-600 dark:text-amber-400">
                Metrics
              </span>
              <h2 className="text-2xl lg:text-4xl font-black">きずなLv.が見ているもの</h2>
              <p className="max-w-xl pt-2 text-sm lg:text-base leading-relaxed text-default-500">
                きずなLv.に勝率は一切含まれません。
                <br />
                強いデッキを持っている人ほど「きずな」が深い、
                <br />
                という設計は破綻しているからです。
              </p>
            </div>

            <div className="grid gap-4 pt-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6 lg:pt-8">
              {metrics.map((metric) => (
                <div
                  key={metric.title}
                  className="flex flex-col gap-3 rounded-2xl border border-default-200 px-6 py-6"
                >
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-xl text-amber-600 dark:text-amber-400">
                    {metric.icon}
                  </span>
                  <h3 className="text-base lg:text-lg font-bold">{metric.title}</h3>
                  <p className="text-sm leading-relaxed text-default-500">
                    {metric.description}
                  </p>
                </div>
              ))}
            </div>

            {/* 指標を見せた直後に、これが確定仕様ではないことを断る。
              数値が後から変わったときに「勝手に下がった」と受け取られないための予防線。 */}
            <p className="pt-2 text-center text-xs lg:text-sm leading-relaxed text-default-400">
              ❈きずなはβ版です。いまは6指標で算出しており、今後、指標を追加していく予定です。
              <br />
              指標の内容や重み付けは変更される可能性があり、同じ対戦記録でも数値が変わることがあります。
            </p>
          </section>
        </KizunaPreviewProvider>

        {/* 最終CTA */}
        <section
          id="start"
          className="flex scroll-mt-20 flex-col items-center gap-6 rounded-3xl bg-linear-to-br from-indigo-950 via-slate-900 to-neutral-950 px-6 py-10 lg:px-14 lg:py-16 text-center text-white"
        >
          <div className="flex flex-col items-center gap-3">
            <h2 className="text-2xl lg:text-4xl font-black leading-snug">
              今日から、
              <br className="sm:hidden" />
              きずなLv.を高めよう。
            </h2>
            <p className="max-w-lg text-sm lg:text-base leading-relaxed text-white/60">
              {isLoggedIn
                ? "今日つけた1件の記録が、あなたのきずなLv.を積み上げます。これまでの記録もすべて、いまのきずなLv.に反映されています。"
                : "今日つけた1件の記録が、あなたのきずなLv.を積み上げます。これまでの記録もすべて対象です。登録は無料、広告はありません。"}
            </p>
          </div>

          {/* ログイン済みのユーザーは自分のきずなLv.をデッキ一覧で見られるので、そこへ送る */}
          {isLoggedIn ? (
            <Link
              href="/decks"
              className="inline-flex items-center justify-center rounded-full bg-amber-400 px-8 py-3.5 text-base font-bold text-neutral-900 transition-opacity hover:opacity-90"
            >
              デッキ一覧できずなLv.を見る
            </Link>
          ) : (
            <>
              <div className="w-full max-w-xs">
                <SocialSignIn mode="signup" />
              </div>

              <div className="flex flex-wrap items-center justify-center gap-3">
                <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 text-xs lg:text-sm font-bold">
                  <LuMegaphoneOff className="shrink-0 text-sm lg:text-base" />
                  広告なし
                </span>
                <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 text-xs lg:text-sm font-bold">
                  <LuBadgeJapaneseYen className="shrink-0 text-sm lg:text-base" />
                  完全無料
                </span>
              </div>

              <p className="text-xs text-white/40">
                アカウントをお持ちの方はそのまま記録を続けてください。
                <br />
                過去の記録もすべて対象です。
              </p>
            </>
          )}
        </section>
      </div>

      <Footer />
    </div>
  );
}
