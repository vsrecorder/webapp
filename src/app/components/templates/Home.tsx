import Image from "next/image";
import Link from "next/link";

import { Card, CardBody } from "@heroui/react";
import { Button } from "@heroui/react";
import { Chip } from "@heroui/react";

import { LuFilePen, LuLayers, LuFileText, LuTrophy, LuArrowRight } from "react-icons/lu";

import Footer from "@app/components/organisms/Layout/Footer";

import CityleagueEvents from "@app/components/organisms/Cityleague/CityleagueEvents";

import { CityleagueScheduleType } from "@app/types/cityleague_schedule";
import { EnvironmentType } from "@app/types/environment";

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

// トップページで紹介する機能一覧（機能ごとに画面イメージを表示）
const features = [
  {
    icon: <LuLayers />,
    title: "デッキを管理",
    description: "デッキコードからデッキを登録して一覧で管理できます。",
    images: ["/images/decks.png"],
  },
  {
    icon: <LuFilePen />,
    title: "対戦を記録",
    description:
      "参加したイベントと使用デッキを紐付け、1戦ごとに勝敗をかんたんに記録できます。",
    images: ["/images/records-create.png", "/images/records-id.png"],
  },
  {
    icon: <LuFileText />,
    title: "戦績を振り返る",
    description: "作成した対戦記録を一覧で振り返り、次の対戦に活かせます。",
    images: ["/images/records.png"],
  },
  {
    icon: <LuTrophy />,
    title: "シティリーグ結果",
    description: "全国のシティリーグの入賞デッキをチェックできます。",
    images: ["/images/cityleague_results.png"],
  },
];

// 使い方の3ステップ
const steps = [
  {
    no: "1",
    title: "デッキを登録",
    description: "使うデッキをデッキコードから登録します。",
  },
  {
    no: "2",
    title: "対戦を記録",
    description: "対戦ごとに相手デッキと勝敗を記録します。",
  },
  {
    no: "3",
    title: "戦績を分析",
    description: "勝率やマッチアップを振り返ります。",
  },
];

// スマホ実機風フレームにスクリーンショットを表示するコンポーネント
function PhoneMock({ src, alt }: { src: string; alt: string }) {
  return (
    <div className="w-37.5 shrink-0 rounded-[1.6rem] border-[5px] border-neutral-800 bg-neutral-800 shadow-lg overflow-hidden dark:border-neutral-700 dark:bg-neutral-700">
      <div className="relative aspect-864/1920 w-full overflow-hidden rounded-[1.2rem] bg-white">
        <Image
          src={src}
          alt={alt}
          fill
          sizes="150px"
          className="object-cover object-top"
        />
      </div>
    </div>
  );
}

export default async function TemplateHome() {
  const date = new Date(Date.now() + 9 * 60 * 60 * 1000);

  let cs: CityleagueScheduleType | undefined;
  try {
    cs = await getCityleagueScheduleByDate(date);
  } catch (error) {
    cs = undefined;
  }

  // 現在の環境（レギュレーション）を取得
  let env: EnvironmentType | undefined;
  try {
    env = await getEnvironmentByDate(date);
  } catch (error) {
    env = undefined;
  }

  return (
    <>
      <div className="flex flex-col gap-8 max-w-2xl mx-auto w-full">
        {/* ヒーローセクション */}
        <div className="pt-6 flex flex-col items-center justify-center gap-4 w-full">
          <div className="w-24 h-24 relative"></div>

          <span className="text-3xl font-bold">バトレコ β版</span>

          <div className="flex flex-col items-center justify-center gap-0.5">
            <span className="text-tiny">友達との　勝負や</span>
            <span className="text-tiny">特殊な　施設での　勝負を</span>
            <span className="text-tiny">記録できる　かっこいい　アプリ。</span>
          </div>

          {env && (
            <Chip size="sm" radius="md" variant="bordered">
              <small className="font-bold">現在のポケカ環境：『{env.title}』</small>
            </Chip>
          )}

          {/*
          <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
            <Button
              as={Link}
              href="/records/create"
              color="primary"
              radius="full"
              size="md"
              className="font-bold"
              endContent={<LuArrowRight />}
            >
              対戦を記録する
            </Button>
            <Button
              as={Link}
              href="/cityleague_results"
              variant="bordered"
              radius="full"
              size="md"
              className="font-bold"
            >
              シティリーグ結果を見る
            </Button>
          </div>
          */}
        </div>

        {/* できること別の画面イメージ */}
        <div className="flex flex-col gap-10 w-full">
          <div className="flex flex-col items-center justify-center">
            <div className="text-base font-bold underline">バトレコでできること</div>
          </div>

          {features.map((feature, index) => (
            <div
              key={index}
              className={`flex flex-col items-center gap-4 lg:gap-10 lg:flex-row ${
                index % 2 === 1 ? "lg:flex-row-reverse" : ""
              }`}
            >
              {/* 機能の説明 */}
              <div className="flex flex-1 flex-col items-center gap-2 text-center lg:items-start lg:text-left">
                <div className="flex items-center gap-2">
                  <span className="flex items-center justify-center w-9 h-9 rounded-xl bg-primary/10 text-xl text-primary">
                    {feature.icon}
                  </span>
                  <span className="text-lg font-bold">{feature.title}</span>
                </div>
                <span className="max-w-xs text-sm text-default-500">
                  {feature.description}
                </span>
              </div>

              {/* 画面イメージ（スマホのモックアップ） */}
              <div className="flex flex-1 flex-wrap justify-center gap-3">
                {feature.images.map((src) => (
                  <PhoneMock key={src} src={src} alt={feature.title} />
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* 使い方 */}
        <div className="flex flex-col gap-3 w-full">
          <div className="flex flex-col items-center justify-center">
            <div className="text-base font-bold underline">かんたん3ステップ</div>
          </div>

          <div className="flex flex-col gap-2 w-full">
            {steps.map((step) => (
              <Card key={step.no} className="w-full">
                <CardBody className="flex flex-row items-center gap-3 p-3">
                  <div className="flex items-center justify-center shrink-0 w-7 h-7 rounded-full bg-primary text-white font-bold text-sm">
                    {step.no}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-bold">{step.title}</span>
                    <span className="text-tiny text-default-500">{step.description}</span>
                  </div>
                </CardBody>
              </Card>
            ))}
          </div>
        </div>

        {/* 本日のシティリーグ */}
        {cs && (
          <div className="flex flex-col gap-1.5">
            <div className="flex flex-col items-center justify-center">
              <div className="text-lg font-bold">{cs.title} 開催中！</div>
            </div>
            <div className="flex flex-col gap-3 w-full">
              <div className="pb-0 flex flex-col items-center justify-center gap-0">
                <div className="text-base font-bold underline">本日のシティリーグ</div>
              </div>
              <CityleagueEvents />
            </div>
          </div>
        )}
      </div>
      <Footer />
    </>
  );
}
