"use client";

import { addToast } from "@heroui/react";

import { FaXTwitter } from "react-icons/fa6";
import { LuLink } from "react-icons/lu";

import { cityleagueDatePath, cityleagueDateXIntentUrl } from "@app/utils/cityleagueDateShare";

type Props = {
  // "YYYY-MM-DD"
  dateParam: string;
  // 「2026年9月26日(土)」
  dateLabel: string;
};

/*
 * 開催日ごとのシティリーグ入賞デッキ一覧のシェア。X へのポストと、URL のコピー。
 *
 * 大会の個別ページ(CityleagueResultByOfficialEventId)のシェアボタンと同じ見た目・同じ大きさ
 * (2rem の丸ボタン)にして、隣に並ぶ戻るリンク(BackLink)と高さを揃える。
 * URL はブラウザで開いているオリジンから組み立てる(開発機でも本番でもそのまま動くように)。
 */
export default function CityleagueDateShareButtons({ dateParam, dateLabel }: Props) {
  const postToX = () => {
    window.open(
      cityleagueDateXIntentUrl(dateParam, dateLabel, window.location.origin),
      "_blank",
      "noopener,noreferrer",
    );
  };

  const copyLink = async () => {
    const url = new URL(cityleagueDatePath(dateParam), window.location.origin).toString();
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
        aria-label="この日の入賞デッキ一覧を X にポストする"
        onClick={postToX}
        className="flex h-8 w-8 items-center justify-center rounded-full bg-content1 text-default-600 shadow-small hover:text-default-800 active:opacity-70"
      >
        <FaXTwitter className="text-sm" />
      </button>
      <button
        type="button"
        aria-label="この日の入賞デッキ一覧のリンクをコピーする"
        onClick={() => void copyLink()}
        className="flex h-8 w-8 items-center justify-center rounded-full bg-content1 text-default-600 shadow-small hover:text-default-800 active:opacity-70"
      >
        <LuLink className="text-base" />
      </button>
    </div>
  );
}
