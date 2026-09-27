"use client";

import { addToast } from "@heroui/react";

import { FaXTwitter } from "react-icons/fa6";
import { LuLink } from "react-icons/lu";

import { CityleagueHubShare, cityleagueHubXIntentUrl } from "@app/utils/cityleagueHubShare";

/*
 * シティリーグ結果の一覧ページ(開催日・開催月・シーズン・環境ごとの入賞デッキ一覧)のシェア。
 * X へのポストと、URL のコピー。
 *
 * 大会の個別ページ(CityleagueResultByOfficialEventId)のシェアボタンと同じ見た目・同じ大きさ
 * (2rem の丸ボタン)にして、隣に並ぶ戻るリンク(BackLink)と高さを揃える。
 * URL はブラウザで開いているオリジンから組み立てる(開発機でも本番でもそのまま動くように)。
 */
export default function CityleagueHubShareButtons({ path, title, utmCampaign }: CityleagueHubShare) {
  const postToX = () => {
    window.open(
      cityleagueHubXIntentUrl({ path, title, utmCampaign }, window.location.origin),
      "_blank",
      "noopener,noreferrer",
    );
  };

  const copyLink = async () => {
    const url = new URL(path, window.location.origin).toString();
    try {
      await navigator.clipboard.writeText(url);
      addToast({ title: "リンクをコピーしました", color: "success", timeout: 2000 });
    } catch {
      addToast({ title: "コピーに失敗しました", color: "danger", timeout: 3000 });
    }
  };

  return (
    <div className="flex shrink-0 items-center gap-1.5">
      <button
        type="button"
        aria-label="このページを X にポストする"
        onClick={postToX}
        className="flex h-8 w-8 items-center justify-center rounded-full bg-content1 text-default-600 shadow-small hover:text-default-800 active:opacity-70"
      >
        <FaXTwitter className="text-sm" />
      </button>
      <button
        type="button"
        aria-label="このページのリンクをコピーする"
        onClick={() => void copyLink()}
        className="flex h-8 w-8 items-center justify-center rounded-full bg-content1 text-default-600 shadow-small hover:text-default-800 active:opacity-70"
      >
        <LuLink className="text-base" />
      </button>
    </div>
  );
}
