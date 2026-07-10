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
import { getAppIconUrl, isDevEnv } from "@app/utils/appIcon";

const GRAFANA_DASHBOARD_UID = "636db44742fb4dca801d0b1c9343642a";

async function getGrafanaStat(panelId: number): Promise<number | undefined> {
  try {
    const res = await fetch(
      `https://dashboard.vsrecorder.mobi/api/public/dashboards/${GRAFANA_DASHBOARD_UID}/panels/${panelId}/query`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ timeRange: { timezone: "Asia/Tokyo" } }),
        next: { revalidate: 300 },
      },
    );
    if (!res.ok) return undefined;
    const data = await res.json();
    const value = data?.results?.A?.frames?.[0]?.data?.values?.[0]?.[0];
    return typeof value === "number" ? Math.floor(value) : undefined;
  } catch {
    return undefined;
  }
}

async function getCityleagueScheduleByDate(date: Date): Promise<CityleagueScheduleType> {
  try {
    const domain = process.env.VSRECORDER_DOMAIN;

    const today = date.toISOString().split("T")[0];

    const res = await fetch(
      `https://${domain}/api/v1beta/cityleague_schedules?date=${today}`,
      {
        cache: "no-store",
        method: "GET",
        headers: {
          Accept: "application/json",
        },
      },
    );

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
    const domain = process.env.VSRECORDER_DOMAIN;

    const today = date.toISOString().split("T")[0];

    const res = await fetch(`https://${domain}/api/v1beta/environments?date=${today}`, {
      cache: "no-store",
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
        どのデッキを使ったかすぐわかります。
      </>
    ),
    images: [{ src: "https://xx8nnpgt.user.webaccel.jp/images/icons/decks.png", rotateClass: "rotate" }],
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
      { src: "https://xx8nnpgt.user.webaccel.jp/images/icons/records-create.png", rotateClass: "-rotate-1" },
      { src: "https://xx8nnpgt.user.webaccel.jp/images/icons/records-id.png", rotateClass: "rotate-1" },
    ],
  },
  {
    icon: <LuFileText />,
    title: "戦績を振り返る",
    description: (
      <>
        作成した対戦記録を一覧で確認。
        <br />
        積み重ねた戦績が次の対戦へのヒントに。
      </>
    ),
    images: [
      { src: "https://xx8nnpgt.user.webaccel.jp/images/icons/user_stats.png", rotateClass: "-rotate-1" },
      { src: "https://xx8nnpgt.user.webaccel.jp/images/icons/opponents_deck_info_stats.png", rotateClass: "rotate-1" },
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
    images: [{ src: "https://xx8nnpgt.user.webaccel.jp/images/icons/cityleague_results.png", rotateClass: "rotate" }],
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
      { src: "https://xx8nnpgt.user.webaccel.jp/images/icons/records-darkmode.png", rotateClass: "-rotate-1" },
      { src: "https://xx8nnpgt.user.webaccel.jp/images/icons/darkmode-decks_history.png", rotateClass: "rotate-1" },
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

  let cs: CityleagueScheduleType | undefined;
  try {
    cs = await getCityleagueScheduleByDate(date);
  } catch {
    cs = undefined;
  }

  let env: EnvironmentType | undefined;
  try {
    env = await getEnvironmentByDate(date);
  } catch {
    env = undefined;
  }

  // Grafanaから統計データを並列取得（パネルID: 3=デッキ数, 2=対戦数, 7=ユーザ数,）
  const [deckCount, recordCount, userCount] = await Promise.all([
    getGrafanaStat(3),
    getGrafanaStat(2),
    getGrafanaStat(7),
  ]);

  const statsItems = [
    { value: deckCount, label: "デッキ数" },
    { value: recordCount, label: "対戦数" },
    { value: userCount, label: "ユーザ数" },
  ].filter((item) => item.value !== undefined) as { value: number; label: string }[];

  return (
    <>
      {/* ヒーローセクション：グラデーション背景で全幅に広げる（-mt-14でmainのpt-14分も覆い、ヘッダー裏の白背景を隠す。lg以上はヘッダーがh-28になる分-mt-28で揃える） */}
      <section
        className={`-mx-2 -mt-14 lg:-mt-28 text-white px-6 pt-22 pb-14 lg:px-8 lg:pt-36 lg:pb-20 flex flex-col items-center gap-5 lg:gap-7 ${
          isDevEnv()
            ? "bg-linear-to-br from-orange-500 via-orange-600 to-amber-700"
            : "bg-linear-to-br from-blue-600 via-indigo-600 to-violet-700"
        }`}
      >
        <div className="w-20 h-20 lg:w-28 lg:h-28 relative">
          <Image
            src={getAppIconUrl()}
            alt="バトレコ"
            fill
            priority
            sizes="(min-width: 1024px) 112px, 80px"
            className="object-contain rounded-2xl shadow-lg"
          />
        </div>

        <div className="flex flex-col items-center gap-2 lg:gap-4 text-center">
          <h1 className="text-3xl lg:text-6xl font-black tracking-tight leading-snug lg:leading-tight">
            ポケカの対戦を、
            <br />
            記録しよう。
          </h1>
          <p className="text-sm lg:text-lg text-white/80 max-w-s lg:max-w-xl leading-relaxed pt-1">
            対戦記録・デッキ管理・シティリーグの結果閲覧まで。
            <br />
            ポケカプレイヤーのための対戦記録サービス。
          </p>
        </div>

        <div className="flex items-center gap-3 lg:gap-4 flex-wrap justify-center">
          <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-5 py-2 lg:px-6 lg:py-2.5 text-sm lg:text-base font-bold">
            <LuMegaphoneOff className="text-base lg:text-lg shrink-0" />
            広告なし
          </span>
          <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-5 py-2 lg:px-6 lg:py-2.5 text-sm lg:text-base font-bold">
            <LuBadgeJapaneseYen className="text-base lg:text-lg shrink-0" />
            完全無料
          </span>
        </div>

        {env && (
          <div className="inline-flex items-center gap-2 rounded-full bg-white/20 backdrop-blur-sm px-4 py-1.5 lg:px-5 lg:py-2 text-xs lg:text-sm font-bold">
            <span className="w-2 h-2 lg:w-2.5 lg:h-2.5 rounded-full bg-green-300 animate-pulse shrink-0" />
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
                  <span className="text-xs lg:text-sm text-default-500">{item.label}</span>
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
                      sizeClass={feature.images.length > 1 ? "w-40 lg:w-56" : "w-44 lg:w-64"}
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
              <p className="text-sm lg:text-base text-default-500">本日開催のシティリーグ会場</p>
            </div>
            <CityleagueEvents />
          </section>
        )}
      </div>

      <Footer />
    </>
  );
}
