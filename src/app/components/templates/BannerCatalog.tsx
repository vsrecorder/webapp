"use client";

import { useState } from "react";

import { SWRConfig } from "swr";

import AcquisitionSurveyPrompt from "@app/components/molecules/PWA/AcquisitionSurveyPrompt";
import AddToHomeScreenBanner from "@app/components/molecules/PWA/AddToHomeScreenBanner";
import PushPermissionPrompt from "@app/components/molecules/PWA/PushPermissionPrompt";
import RecordingNowBar from "@app/components/organisms/Layout/RecordingNowBar";

import { RecordingNowBarType } from "@app/types/recording_now";
import { markAcquisitionSurveyPending } from "@app/utils/acquisitionSurvey";
import { markRecordCreatedForPushPrompt } from "@app/utils/pushPrompt";
import { RECORDING_NOW_SWR_KEY } from "@app/utils/recordingNowClient";
import { RECORDING_BAR_HIDDEN_KEY } from "@app/utils/recordingNow";
import { writeSessionStorage } from "@app/utils/sessionStorageStore";

/*
 * 画面下に出る4枚の帯の見本(開発環境のみ)。
 *
 * 実物のコンポーネントをそのまま置いている。作り直した張りぼてだと、直したつもりが
 * 本物に反映されていない、という取り違えが起きるため。
 *
 * 帯は4枚とも同じ位置に出るので、ここでは1枚ずつ切り替えて見せる
 * (実際の画面では PwaBanners が優先順位で1枚に絞っている)。
 */

type Sample = {
  id: string;
  label: string;
  // 何を確かめる見本か
  note: string;
  recording: RecordingNowBarType;
};

const SAMPLES: Sample[] = [
  {
    id: "official",
    label: "公式イベント",
    note: "アイコン・会場あり。いちばん要素が多い形",
    recording: {
      recordId: "01SAMPLE0000000000000OFFICIAL",
      eventTitle: "ジムバトル",
      eventIconUrl: "https://xx8nnpgt.user.webaccel.jp/images/icons/gym.png",
      eventKind: "official",
      venue: "TSUTAYA Trading Card 宇都宮インターパークビレッジ店",
      total: 4,
      wins: 3,
      losses: 1,
      draws: 0,
      hasSummary: true,
    },
  },
  {
    id: "official-long",
    label: "公式（長い名前）",
    note: "イベント名が溢れて流れる形",
    recording: {
      recordId: "01SAMPLE0000000000000000LONG",
      eventTitle: "チャンピオンズリーグ2026 横浜 マスターリーグ",
      eventIconUrl: "https://xx8nnpgt.user.webaccel.jp/images/icons/cl.png",
      eventKind: "official",
      venue: "パシフィコ横浜 展示ホール",
      total: 9,
      wins: 6,
      losses: 2,
      draws: 1,
      hasSummary: true,
    },
  },
  {
    id: "tonamel",
    label: "Tonamel",
    note: "会場を持たない。アイコンは T のしるし",
    recording: {
      recordId: "01SAMPLE00000000000000TONAMEL",
      eventTitle: "第3回 みんなのポケカ交流会",
      eventIconUrl: null,
      eventKind: "tonamel",
      venue: "",
      total: 2,
      wins: 1,
      losses: 1,
      draws: 0,
      hasSummary: true,
    },
  },
  {
    id: "unofficial",
    label: "自由形式（0戦）",
    note: "鉛筆のしるし。作ったばかりで対戦がまだ無い形",
    recording: {
      recordId: "01SAMPLE000000000000UNOFFICIAL",
      eventTitle: "PTCGL ランク戦",
      eventIconUrl: null,
      eventKind: "unofficial",
      venue: "",
      total: 0,
      wins: 0,
      losses: 0,
      draws: 0,
      hasSummary: true,
    },
  },
];

type BannerId = "recording" | "survey" | "install" | "push";

export default function BannerCatalog() {
  const [banner, setBanner] = useState<BannerId>("recording");
  const [sample, setSample] = useState<Sample>(SAMPLES[0]);
  // 見本を出し直すための番号。閉じたあともボタンで戻せるようにする
  const [generation, setGeneration] = useState(0);

  function showRecording(next: Sample) {
    // 前に閉じた記憶が残っていると出てこない
    writeSessionStorage(RECORDING_BAR_HIDDEN_KEY, null);
    setSample(next);
    setBanner("recording");
    setGeneration((n) => n + 1);
  }

  function showSurvey() {
    markAcquisitionSurveyPending();
    setBanner("survey");
    setGeneration((n) => n + 1);
  }

  function showInstall() {
    setBanner("install");
    setGeneration((n) => n + 1);
  }

  function showPush() {
    markRecordCreatedForPushPrompt();
    setBanner("push");
    setGeneration((n) => n + 1);
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 p-4">
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-bold">バナー見本</h1>
        <p className="text-sm text-default-500">
          画面下に出る4枚を1枚ずつ確かめる場所です（開発環境のみ）。実物のコンポーネントを
          そのまま置いています。実際の画面では同時に1枚しか出ず、優先順位は
          アンケート → ホームに追加 → 通知の許諾 → 記録中 の順です。
        </p>
      </div>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-bold">記録中バナー</h2>
        <div className="flex flex-wrap gap-2">
          {SAMPLES.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => showRecording(item)}
              className={`rounded-full border px-3 py-1.5 text-xs font-bold ${
                banner === "recording" && sample.id === item.id
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-divider text-default-600"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
        <p className="text-xs text-default-400">
          {banner === "recording" ? sample.note : "上のボタンで切り替えます"}
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-bold">その他のバナー</h2>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={showSurvey}
            className={`rounded-full border px-3 py-1.5 text-xs font-bold ${
              banner === "survey"
                ? "border-primary bg-primary/10 text-primary"
                : "border-divider text-default-600"
            }`}
          >
            アンケート
          </button>
          <button
            type="button"
            onClick={showInstall}
            className={`rounded-full border px-3 py-1.5 text-xs font-bold ${
              banner === "install"
                ? "border-primary bg-primary/10 text-primary"
                : "border-divider text-default-600"
            }`}
          >
            ホームに追加
          </button>
          <button
            type="button"
            onClick={showPush}
            className={`rounded-full border px-3 py-1.5 text-xs font-bold ${
              banner === "push"
                ? "border-primary bg-primary/10 text-primary"
                : "border-divider text-default-600"
            }`}
          >
            通知の許諾
          </button>
        </div>
        <p className="text-xs text-default-400">
          通知の許諾は、この端末が Web Push に対応していて、まだ許可も拒否もしていないとき
          だけ出ます（すでに許可済みなら出ません）。アンケートは回答・スキップで消えると、
          もう一度ボタンを押すまで出ません。
        </p>
      </section>

      <p className="text-xs text-default-400">
        帯は画面の下端（下部ナビの上）に出ます。スマートフォンの幅で見てください
        （デスクトップ幅ではアンケート以外は出ません）。
      </p>

      {/* 記録中バナー。実物は API から取るので、見本の値を SWR のキャッシュへ流し込む */}
      {banner === "recording" && (
        <SWRConfig
          key={`recording-${generation}`}
          value={{ fallback: { [RECORDING_NOW_SWR_KEY]: { recording: sample.recording } } }}
        >
          <RecordingNowBar />
        </SWRConfig>
      )}

      {banner === "survey" && <AcquisitionSurveyPrompt key={generation} userId="sample-user" />}

      {banner === "install" && (
        <AddToHomeScreenBanner
          key={generation}
          iconUrl="/icon_dev-512x512.png"
          installState="android"
          onInstall={() => {}}
          onDismiss={() => setBanner("recording")}
        />
      )}

      {banner === "push" && (
        <PushPermissionPrompt key={generation} userId="sample-user" installBannerState="none" />
      )}
    </div>
  );
}
