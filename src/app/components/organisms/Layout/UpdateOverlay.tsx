"use client";

/*
 * アップデート中の覆い。**core-apiserver に届かない間**、画面全体を覆って伝える。
 * 流れの全体は utils/upstreamOutage.ts、状態は utils/upstreamOutageClient.ts。
 *
 * nginx のアップデート中の画面(proxy リポジトリの deploying.html)は webapp に繋がらないときにしか
 * 出ないので、core-apiserver だけを入れ替えている間はこちらが受け持つ。開いていた画面で
 * webapp が入れ替わったとき(BFF への取得が nginx の 503 になる)もここが出る。
 *
 * **見た目と文言は deploying.html と揃える**(どちらの経路で出ても同じ画面に見えるように)。
 * 片方だけ直さないこと。違うのは次の点だけ:
 *   - ページを読み込み直さない。復旧したら覆いを外し、サーバコンポーネントの描き直し
 *     (router.refresh)と SWR の取り直しだけをする。記録の入力中に裏の取得(通知など)が
 *     失敗して覆いが出ても、入力した内容は消えない(だからボタンも「再読み込み」ではなく「今すぐ確認」)
 *     webapp が入れ替わっていたときは router.refresh もしない(ビルドの食い違いで Next がページ全体を
 *     読み込み直し、入力が消えるため。utils/upstreamOutageClient.ts の webappRestarted)
 *   - 3 文目を「入力中の内容はそのまま残ります。」にしている(上の理由)
 *   - 計画メンテナンス(maintenance.html)だと分かったら、ページを読み込み直して nginx の
 *     メンテナンス画面(終了予定日時が載っている)を出す。「まもなく戻ります」と出し続けないため
 *
 * z-index は HeroUI のモーダル(z-50)より上、トースト(z-100)より下。書き込みに失敗したときは
 * モーダルが開いたままここが出るので、下に回ると見えない。
 */

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { mutate } from "swr";

import { CDN_ORIGIN } from "@app/utils/cdn";
import {
  checkUpstream,
  getUpstreamOutageServerSnapshot,
  getUpstreamOutageSnapshot,
  installUpstreamOutageWatch,
  leaveUpstreamOutage,
  setUpstreamOutageChecking,
  subscribeUpstreamOutage,
} from "@app/utils/upstreamOutageClient";

// モジュールを読んだ時点で fetch を包む。useEffect だと、子のコンポーネントの初回の取得
// (effect は子から先に走る)を見逃す
installUpstreamOutageWatch();

/** 確認の間隔(deploying.html の INTERVAL_SEC と同じ) */
const INTERVAL_SEC = 3;

export default function UpdateOverlay() {
  const outage = useSyncExternalStore(
    subscribeUpstreamOutage,
    getUpstreamOutageSnapshot,
    getUpstreamOutageServerSnapshot,
  );

  if (outage === null) return null;
  return <OverlayBody checking={outage.checking} webappRestarted={outage.webappRestarted} />;
}

function OverlayBody({
  checking,
  webappRestarted,
}: {
  checking: boolean;
  webappRestarted: boolean;
}) {
  const router = useRouter();
  const [remaining, setRemaining] = useState(INTERVAL_SEC);
  const remainingRef = useRef(INTERVAL_SEC);
  const checkingRef = useRef(false);
  const dialogRef = useRef<HTMLDivElement>(null);

  const check = useCallback(async () => {
    if (checkingRef.current) return;
    checkingRef.current = true;
    setUpstreamOutageChecking(true);

    const result = await checkUpstream();

    if (result === "maintenance") {
      window.location.reload();
      return;
    }

    checkingRef.current = false;
    setUpstreamOutageChecking(false);
    remainingRef.current = INTERVAL_SEC;
    setRemaining(INTERVAL_SEC);

    // unavailable(まだ止まっている)・unreachable(回線の問題)は待ち続ける
    if (result !== "ok") return;

    leaveUpstreamOutage();
    // 失敗したまま描かれていたサーバコンポーネントを描き直す(クライアントの状態は残る)
    if (!webappRestarted) router.refresh();
    // SWR で取っていたものを全部取り直す(引数1つだと値は変えずに再検証だけする)
    void mutate(() => true);
  }, [router, webappRestarted]);

  // 1秒ごとに数え、0 になったら確かめる。確かめている間は数えない
  useEffect(() => {
    const timer = window.setInterval(() => {
      if (checkingRef.current) return;
      remainingRef.current -= 1;
      if (remainingRef.current > 0) {
        setRemaining(remainingRef.current);
        return;
      }
      void check();
    }, 1000);
    return () => window.clearInterval(timer);
  }, [check]);

  // 読み上げ・キーボード操作の起点を覆いに移す(後ろの画面を操作し続けないように)
  useEffect(() => {
    dialogRef.current?.focus();
  }, []);

  return (
    <div
      ref={dialogRef}
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="update-overlay-title"
      aria-describedby="update-overlay-description"
      tabIndex={-1}
      className="app-dot-bg pointer-events-auto fixed inset-0 z-[95] flex justify-center overflow-y-auto p-6 outline-none"
    >
      <div className="mt-[min(7vh,56px)] mb-6 h-fit w-full max-w-[440px] rounded-3xl border border-transparent bg-white px-8 pt-10 pb-8 text-center text-[#27272a] shadow-[0_20px_45px_rgba(15,23,42,0.08),0_2px_8px_rgba(15,23,42,0.06)] dark:border-white/[0.14] dark:bg-[#1d1d21] dark:text-[#e4e4e7] dark:shadow-[0_20px_45px_rgba(0,0,0,0.45)]">
        <div className="mb-6 flex justify-center">
          {/* eslint-disable-next-line @next/next/no-img-element -- deploying.html と同じ画像をそのまま出す */}
          <img
            src={`${CDN_ORIGIN}/images/icons/logo.png`}
            alt="バトレコ"
            width={88}
            className="h-auto w-[88px] rounded-[20px] shadow-[0_8px_20px_rgba(37,99,235,0.35)]"
          />
        </div>

        <span className="mb-[18px] inline-flex items-center gap-[7px] rounded-full bg-[#eef2ff] px-3.5 py-1.5 text-[13px] font-semibold text-[#4338ca] dark:bg-[rgba(129,140,248,0.16)] dark:text-[#c7d2fe]">
          <span className="update-overlay-dot size-[7px] rounded-full bg-[#818cf8]" />
          アップデート中
        </span>

        <h2 id="update-overlay-title" className="mb-3 text-xl leading-normal font-bold">
          ただいまアップデート中です
        </h2>
        <div
          id="update-overlay-description"
          className="space-y-1.5 text-sm leading-[1.8] text-[#6b7280] dark:text-[#a1a1aa]"
        >
          <p>新しいバージョンを反映しています。</p>
          <p>まもなく自動で元の画面に戻ります。</p>
          <p>入力中の内容はそのまま残ります。</p>
        </div>

        <div className="mt-6 rounded-[14px] border-t border-[rgba(15,23,42,0.08)] p-4 dark:border-white/[0.12]">
          <span className="mb-1.5 block text-xs text-[#6b7280] dark:text-[#a1a1aa]">
            復旧の確認
          </span>
          <span role="status" className="block text-base font-bold">
            {checking ? "接続を確認しています..." : `${remaining}秒後に確認します`}
          </span>
          {/* 待っている間の「進んでいる感」。残り時間を示すものではない */}
          <div
            aria-hidden
            className="mt-3.5 h-1 overflow-hidden rounded-full bg-[rgba(79,70,229,0.14)] dark:bg-[rgba(129,140,248,0.18)]"
          >
            <div className="update-overlay-progress h-full w-2/5 rounded-full bg-[#4f46e5] dark:bg-[#818cf8]" />
          </div>
        </div>

        <button
          type="button"
          onClick={() => void check()}
          disabled={checking}
          className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#4f46e5] px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-[#4338ca] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4f46e5] active:translate-y-px disabled:opacity-60 dark:bg-[#6366f1] dark:hover:bg-[#818cf8]"
        >
          <svg
            className="size-4"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M21 12a9 9 0 1 1-2.64-6.36" />
            <polyline points="21 3 21 9 15 9" />
          </svg>
          今すぐ確認
        </button>
      </div>
    </div>
  );
}
