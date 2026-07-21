import Image from "next/image";

import {
  LuFilePen,
  LuLayers,
  LuFileText,
  LuTrophy,
  LuMoon,
  LuBadgeJapaneseYen,
  LuMegaphoneOff,
} from "react-icons/lu";

import Footer from "@app/components/organisms/Layout/Footer";
import CityleagueEvents from "@app/components/organisms/Cityleague/CityleagueEvents";
import StatsCounter from "@app/components/molecules/StatsCounter";
import PhoneMock from "@app/components/molecules/PhoneMock";

import { CityleagueScheduleType } from "@app/types/cityleague_schedule";
import { EnvironmentType } from "@app/types/environment";
import { isDevEnv } from "@app/utils/appIcon";
import { getEnvDotColor } from "@app/utils/environment";

import { upstreamUrl } from "@app/utils/upstream";

const GRAFANA_DASHBOARD_UID = "55c83543db74465b895ff8301f4b9d5d";

async function getGrafanaStat(panelId: number): Promise<number | undefined> {
  try {
    const res = await fetch(
      `https://dashboard.vsrecorder.mobi/api/public/dashboards/${GRAFANA_DASHBOARD_UID}/panels/${panelId}/query`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // 対象パネルは「その日時点の生存ベース累計」を日次で返す。範囲の開始位置に関わらず
        // 各点が累計値なので、最新値だけ欲しい here では短い範囲で十分(日数分の行数を抑える)。
        // 範囲を明示することで、ダッシュボード側の既定期間の変更に影響されない。
        body: JSON.stringify({
          timeRange: { from: "now-2d", to: "now", timezone: "Asia/Tokyo" },
        }),
        next: { revalidate: 300 },
      },
    );
    if (!res.ok) return undefined;
    const data = await res.json();

    const frame = data?.results?.A?.frames?.[0];
    const fields = frame?.schema?.fields;
    const columns = frame?.data?.values;
    if (!Array.isArray(fields) || !Array.isArray(columns)) return undefined;

    // 時系列パネルは [Time, value] の2列を返すため、時刻列を読むとエポックミリ秒になる。
    // 時刻以外の最後の列を値列とみなす(単一値を返すパネルにもそのまま通用する)。
    let valueIndex = -1;
    for (let i = 0; i < fields.length; i++) {
      if (fields[i]?.type !== "time") valueIndex = i;
    }
    if (valueIndex < 0) return undefined;

    // 日次系列は末尾が最新。null を挟むことがあるため後ろから最初の数値を採る。
    const column = columns[valueIndex];
    if (!Array.isArray(column)) return undefined;
    for (let i = column.length - 1; i >= 0; i--) {
      if (typeof column[i] === "number") return Math.floor(column[i]);
    }
    return undefined;
  } catch {
    return undefined;
  }
}

async function getCityleagueScheduleByDate(date: Date): Promise<CityleagueScheduleType> {
  try {
    const today = date.toISOString().split("T")[0];

    const res = await fetch(upstreamUrl`/api/v1beta/cityleague_schedules?date=${today}`, {
      // シティリーグの開催情報は最大でも日次更新のため、毎回取得(no-store)は不要。
      // 5分キャッシュ(stale-while-revalidate)にしてサーバ応答(TTFB)を短縮し、FCP/LCPを改善する。
      next: { revalidate: 300 },
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    });

    if (res.status === 200) {
      const ret: CityleagueScheduleType = await res.json();
      return ret;
    } else if (res.status === 404) {
      throw new Error("not found");
    } else {
      throw new Error("error");
    }
  } catch (error) {
    throw error;
  }
}

async function getEnvironmentByDate(date: Date): Promise<EnvironmentType> {
  try {
    const today = date.toISOString().split("T")[0];

    const res = await fetch(upstreamUrl`/api/v1beta/environments?date=${today}`, {
      // 対戦環境情報も日次更新のため、5分キャッシュにしてTTFBを短縮する。
      next: { revalidate: 300 },
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    });

    if (res.status === 200) {
      const ret: EnvironmentType = await res.json();
      return ret;
    } else if (res.status === 400) {
      throw new Error("bad request");
    } else {
      throw new Error("error");
    }
  } catch (error) {
    throw error;
  }
}

const features = [
  {
    icon: <LuLayers />,
    title: "デッキを管理",
    description: (
      <>
        デッキコードからデッキを登録して一覧で確認。
        <br />
        どのデッキを使っているかすぐわかります。
      </>
    ),
    images: [
      {
        src: "https://xx8nnpgt.user.webaccel.jp/images/icons/decks.png",
        rotateClass: "rotate",
      },
    ],
  },
  {
    icon: <LuFilePen />,
    title: "対戦を記録",
    description: (
      <>
        イベントと使用デッキの紐付けが可能。
        <br />
        相手のデッキ・先後・勝敗を1戦ずつ記録。
      </>
    ),
    images: [
      {
        src: "https://xx8nnpgt.user.webaccel.jp/images/icons/records-create.png",
        rotateClass: "-rotate-1",
      },
      {
        src: "https://xx8nnpgt.user.webaccel.jp/images/icons/records-id.png",
        rotateClass: "rotate-1",
      },
    ],
  },
  {
    icon: <LuFileText />,
    title: "戦績を振り返る",
    description: (
      <>
        対戦した相手のデッキ分布を円グラフで確認。
        <br />
        積み重ねた戦績が次の対戦へのヒントに。
      </>
    ),
    images: [
      {
        src: "https://xx8nnpgt.user.webaccel.jp/images/icons/user_stats.png",
        rotateClass: "-rotate-1",
      },
      {
        src: "https://xx8nnpgt.user.webaccel.jp/images/icons/opponents_deck_info_stats.png",
        rotateClass: "rotate-1",
      },
    ],
  },
  {
    icon: <LuTrophy />,
    title: "シティリーグ結果",
    description: (
      <>
        全国のシティリーグの入賞デッキをチェック。
        <br />
        環境の最前線をいつでも把握できます。
      </>
    ),
    images: [
      {
        src: "https://xx8nnpgt.user.webaccel.jp/images/icons/cityleague_results.png",
        rotateClass: "rotate",
      },
    ],
  },
  {
    icon: <LuMoon />,
    title: "ダークモードに対応",
    description: (
      <>
        端末の設定に合わせて自動で切り替え。
        <br />
        暗い場所でも目に優しく快適に使えます。
      </>
    ),
    images: [
      {
        src: "https://xx8nnpgt.user.webaccel.jp/images/icons/records-darkmode.png",
        rotateClass: "-rotate-1",
      },
      {
        src: "https://xx8nnpgt.user.webaccel.jp/images/icons/darkmode-decks_history.png",
        rotateClass: "rotate-1",
      },
    ],
  },
];

const steps = [
  {
    no: "1",
    title: "デッキを登録",
    description: "使うデッキをデッキコードから登録します。",
  },
  {
    no: "2",
    title: "対戦を記録",
    description: "対戦ごとに相手のデッキと勝敗を記録します。",
  },
  {
    no: "3",
    title: "戦績を分析",
    description: "勝率やマッチアップを振り返ります。",
  },
];

export default async function TemplateHome() {
  const date = new Date(Date.now() + 9 * 60 * 60 * 1000);

  // シティリーグ・対戦環境・Grafana統計(パネルID: 7=デッキコード数, 5=対戦数, 2=ユーザ数)を
  // すべて並列取得する。直列にawaitするとfetch分だけTTFBが積み上がり、FCP/LCPが悪化するため。
  // 失敗しても描画を止めないよう、cs/envはcatchでundefinedにフォールバックする。
  const [cs, env, deckCodeCount, recordCount, userCount] = await Promise.all([
    getCityleagueScheduleByDate(date).catch(() => undefined),
    getEnvironmentByDate(date).catch(() => undefined),
    getGrafanaStat(7),
    getGrafanaStat(5),
    getGrafanaStat(2),
  ]);

  const statsItems = [
    { value: deckCodeCount, label: "デッキコード数" },
    { value: recordCount, label: "対戦数" },
    { value: userCount, label: "ユーザ数" },
  ].filter((item) => item.value !== undefined) as { value: number; label: string }[];

  return (
    <>
      {/* ヒーローセクション：グラデーション背景で全幅に広げる（-mt-14でmainのpt-14分も覆い、ヘッダー裏の白背景を隠す。lg以上はヘッダーがh-28になる分-mt-28で揃える） */}
      <section
        className={`relative overflow-hidden -mx-2 -mt-14 lg:-mt-28 text-white px-6 pt-22 pb-14 lg:px-8 lg:pt-36 lg:pb-20 flex flex-col items-center gap-5 lg:gap-7 ${
          isDevEnv()
            ? "bg-linear-to-br from-orange-500 via-orange-600 to-amber-700"
            : "bg-linear-to-br from-blue-600 via-indigo-600 to-violet-700"
        }`}
      >
        {/*
         * 装飾：「きずな」ページの“焚き火の残光”と同じ手法。大きくぼかした光を背面に散らし、
         * 平坦なグラデーションに奥行きと華やかさを与える。
         * 以降の兄弟要素には relative を付け、絶対配置のこの光より前面に描画させる
         * （z-index を使わず、位置指定要素同士のDOM順で重なりを決めている）。
         */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-24 -left-24 h-80 w-80 rounded-full bg-cyan-300/25 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-32 -right-16 h-96 w-96 rounded-full bg-amber-400/30 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute top-1/4 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-violet-400/20 blur-3xl"
        />

        <div className="w-20 h-20 lg:w-28 lg:h-28 relative">
          <Image
            // LCP要素。本番でも外部CDNではなくローカル静的ファイルを使い、
            // クロスオリジンの往復を排してLCPを短縮する（表示は最大112pxなのでsizesで小さく最適化される）。
            src={isDevEnv() ? "/icon_dev-512x512.png" : "/icon-512x512.png"}
            alt="バトレコ"
            fill
            priority
            sizes="(min-width: 1024px) 112px, 80px"
            className="object-contain rounded-2xl shadow-lg"
          />
        </div>

        <div className="relative flex flex-col items-center gap-2 lg:gap-4 text-center">
          <h1 className="text-3xl lg:text-6xl font-black tracking-tight leading-snug lg:leading-tight drop-shadow-[0_2px_24px_rgba(2,6,23,0.35)]">
            対戦を記録するほど、
            <br />
            デッキは物語になる。
          </h1>
          {/*
           * 一番読ませたい訴求。見出し直下に置き、文字自体を発光させて「きずな」の灯と
           * 世界観を揃える。淡い放射グラデーションは要素自身の background に置いている
           * （子要素 + 負のz-indexだと、親が重なりコンテキストを作らずヒーロー背景の裏に回るため）。
           * モバイルを text-sm 止まりにしているのは、text-base だと1行が約358pxになり、
           * 幅375pxの端末(可用幅約343px)で意図しない折り返しが起きるため。
           */}
          <p className="bg-radial from-amber-300/20 to-transparent to-70% pt-1 text-sm font-bold leading-relaxed text-amber-100 drop-shadow-[0_0_28px_rgba(251,191,36,0.5)] lg:px-10 lg:text-2xl">
            勝敗だけじゃ語れない、デッキとの歩みを残す。
            <br />
            ポケカトレーナーとデッキの物語をここに。
          </p>

          {/* 訴求と補足を分ける区切り。両端が消える金の罫線＋中央の菱形で紋章的な“格”を出す */}
          <div
            aria-hidden="true"
            className="relative flex w-full max-w-2xs items-center justify-center lg:max-w-md"
          >
            <span className="h-px w-full bg-linear-to-r from-transparent via-amber-200/60 to-transparent" />
            <span className="absolute h-2.5 w-2.5 rotate-45 bg-amber-200 shadow-[0_0_12px_rgba(251,191,36,0.9)]" />
          </div>

          {/* 機能の要約とサービスの定義。主役は上の訴求文なので、小さく控えめにまとめる */}
          <p className="text-xs lg:text-base text-white/70 leading-relaxed">
            対戦記録/デッキ管理/シティリーグの結果閲覧まで。
            <br />
            ポケカトレーナーのための対戦記録サービス。
          </p>
        </div>

        <div className="relative flex items-center gap-3 lg:gap-4 flex-wrap justify-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/15 px-5 py-2 lg:px-6 lg:py-2.5 text-sm lg:text-base font-bold backdrop-blur-sm">
            <LuMegaphoneOff className="text-base lg:text-lg shrink-0" />
            広告なし
          </span>
          <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/15 px-5 py-2 lg:px-6 lg:py-2.5 text-sm lg:text-base font-bold backdrop-blur-sm">
            <LuBadgeJapaneseYen className="text-base lg:text-lg shrink-0" />
            完全無料
          </span>
        </div>

        {env && (
          <div className="relative inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/20 backdrop-blur-sm px-4 py-1.5 lg:px-5 lg:py-2 text-xs lg:text-sm font-bold">
            {/* 残り日数による配色は、ログイン済みヘッダーの表示と同じ getEnvDotColor に揃える */}
            <span
              className={`w-2 h-2 lg:w-2.5 lg:h-2.5 rounded-full ${getEnvDotColor(env.to_date)} animate-pulse shrink-0`}
            />
            現在の対戦環境：『{env.title}』
          </div>
        )}
      </section>

      <div className="flex flex-col gap-16 lg:gap-24 max-w-2xl lg:max-w-6xl xl:max-w-7xl mx-auto w-full pt-14 lg:pt-20 lg:px-8">
        {/* 統計カウンター */}
        {statsItems.length > 0 && (
          <section className="flex flex-col gap-3">
            <div className="grid grid-cols-3 divide-x divide-default-200">
              {statsItems.map((item) => (
                <div
                  key={item.label}
                  className="flex flex-col items-center gap-1 lg:gap-2 px-4 py-2 lg:px-8 lg:py-4"
                >
                  <span className="text-3xl lg:text-5xl font-black tabular-nums text-foreground">
                    <StatsCounter value={item.value} />
                    <span className="text-xl lg:text-3xl text-primary">+</span>
                  </span>
                  <span className="text-xs lg:text-sm text-default-500">
                    {item.label}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* できること別の画面イメージ */}
        <section className="flex flex-col gap-4">
          <div className="flex flex-col items-center gap-1 text-center">
            <span className="text-xs lg:text-sm font-bold text-primary uppercase tracking-widest">
              FEATURES
            </span>
            <h2 className="text-2xl lg:text-4xl font-black">バトレコでできること</h2>
          </div>

          <div className="flex flex-col gap-14 lg:gap-24 pt-4 lg:pt-8">
            {features.map((feature, index) => (
              <div
                key={index}
                className={`flex flex-col items-center gap-8 lg:gap-16 lg:flex-row ${
                  index % 2 === 1 ? "lg:flex-row-reverse" : ""
                }`}
              >
                {/* 機能の説明 */}
                <div className="flex flex-1 flex-col items-center gap-3 lg:gap-4 text-center lg:items-start lg:text-left">
                  <span className="flex items-center justify-center w-12 h-12 lg:w-16 lg:h-16 rounded-2xl bg-primary/10 text-2xl lg:text-3xl text-primary">
                    {feature.icon}
                  </span>
                  <div className="flex flex-col gap-1.5 lg:gap-2">
                    <h3 className="text-xl lg:text-2xl font-black">{feature.title}</h3>
                    <p className="text-sm lg:text-base text-default-500 leading-relaxed max-w-xs lg:max-w-sm">
                      {feature.description}
                    </p>
                  </div>
                </div>

                {/* 画面イメージ */}
                <div className="flex flex-1 flex-wrap justify-center items-end gap-4 lg:gap-6">
                  {feature.images.map((img) => (
                    <PhoneMock
                      key={img.src}
                      src={img.src}
                      alt={feature.title}
                      rotateClass={img.rotateClass}
                      sizeClass={
                        feature.images.length > 1 ? "w-40 lg:w-56" : "w-44 lg:w-64"
                      }
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* かんたん3ステップ */}
        <section className="rounded-3xl bg-linear-to-br from-blue-50 via-indigo-50 to-violet-50 dark:from-blue-950/50 dark:via-indigo-950/40 dark:to-violet-950/50 px-6 py-8 lg:px-14 lg:py-14 flex flex-col gap-4">
          <div className="flex flex-col items-center gap-1 text-center">
            <span className="text-xs lg:text-sm font-bold text-indigo-500 dark:text-indigo-400 uppercase tracking-widest">
              HOW TO USE
            </span>
            <h2 className="text-2xl lg:text-4xl font-black">かんたん3ステップ</h2>
          </div>

          <div className="flex flex-col sm:flex-row gap-6 sm:gap-2 lg:gap-8 pt-4 lg:pt-8">
            {steps.map((step, index) => (
              <div
                key={step.no}
                className="flex sm:flex-col sm:items-center gap-4 sm:gap-3 lg:gap-4 flex-1 sm:text-center"
              >
                <div className="relative flex items-center justify-center shrink-0 w-12 h-12 lg:w-16 lg:h-16 rounded-full bg-linear-to-br from-blue-500 to-violet-600 text-white font-black text-lg lg:text-2xl shadow-md">
                  {step.no}
                  {index < steps.length - 1 && (
                    <span className="hidden sm:block absolute -right-4 lg:-right-6 top-1/2 -translate-y-1/2 text-indigo-300 dark:text-indigo-600 text-lg lg:text-2xl font-black">
                      ›
                    </span>
                  )}
                </div>
                <div className="flex flex-col gap-0.5 lg:gap-1">
                  <span className="text-sm lg:text-lg font-bold">{step.title}</span>
                  <span className="text-xs lg:text-sm text-default-500 leading-relaxed">
                    {step.description}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 本日のシティリーグ */}
        {cs && (
          <section className="flex flex-col gap-4">
            <div className="flex flex-col items-center gap-1 text-center">
              <span className="text-xs lg:text-sm font-bold text-primary uppercase tracking-widest">
                TODAY
              </span>
              <h2 className="text-2xl lg:text-4xl font-black">{cs.title} 開催中！</h2>
              <p className="text-sm lg:text-base text-default-500">
                本日開催のシティリーグ会場
              </p>
            </div>
            <CityleagueEvents />
          </section>
        )}
      </div>

      <Footer />
    </>
  );
}
