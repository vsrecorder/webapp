"use client";

import { useEffect, useState } from "react";

import { usePathname, useRouter } from "next/navigation";
import { useDisclosure } from "@heroui/react";
import useSWR from "swr";

import { LuCheck, LuCirclePlus, LuMapPin } from "react-icons/lu";
import { sendGAEvent } from "@next/third-parties/google";

import BottomBanner from "@app/components/molecules/BottomBanner";
import FinishRecordingModal from "@app/components/molecules/FinishRecordingModal";
import EventIcon from "@app/components/molecules/EventIcon";
import ScrollingText from "@app/components/molecules/ScrollingText";

import { RecordingNowGetResponseType } from "@app/types/recording_now";
import { writeClientCookie } from "@app/utils/clientCookie";
import { OPEN_CREATE_MATCH_RECORD_ID } from "@app/utils/createMatchIntent";
import {
  RECORDING_BAR_HIDDEN_KEY,
  RECORDING_DISMISSED_COOKIE,
  RECORDING_DISMISSED_COOKIE_MAX_AGE,
  isRecordingBarHidden,
  recordingBarHiddenUntil,
  recordingBarHiddenValue,
  recordingDismissedValue,
} from "@app/utils/recordingNow";
import {
  RECORDING_NOW_SWR_KEY,
  dropRecordingNowFromStoredLayout,
  refreshRecordingNow,
} from "@app/utils/recordingNowClient";
import { writeSessionStorage } from "@app/utils/sessionStorageStore";
import { useSessionStorageItem } from "@app/hooks/useSessionStorageItem";

/*
 * 画面下に常駐する「続きを記録」バー。
 *
 * 大会の合間にデッキやシティリーグ結果を見ていても、そこから1タップで追記へ戻れるようにする。
 * ホーム上部のカード(RecordingNowCard)と同じ記録を指すが、あちらはホームでしか見えない。
 *
 * 出す・出さないの判定は API(/api/recording_now)の向こうでカードと同じ関数が決める。
 * ここが持つのは「どの画面で出さないか」と「閉じられているか」だけ。
 *
 * 取得をブラウザからにしているのは、レイアウトのサーバ側で取ると記録中でない人を含む
 * 全ページのTTFBに往復が乗るため(詳しくは API 側のコメント)。
 */

// 取得の間引き。ページを移るたびに投げ直さない
const DEDUPING_INTERVAL_MS = 60 * 1000;


/*
 * バーを出さない画面。
 *   記録作成 … 新しく作っている最中に「続き」は邪魔
 *   きずな … 下部ナビ自体を出していない1枚もののページ
 * 記録中の記録そのものの詳細ページも出さない(下で記録IDを見て判断する)。
 *
 * ホームには上部に記録中カードがあるが、そこでも出す。カードは画面の上にあるので、
 * 下までスクロールすると押せなくなる。バーはどこにいても同じ位置にある。
 */
const HIDDEN_PATHNAMES = ["/records/create", "/records/quick", "/kizuna"];

async function fetcher(url: string): Promise<RecordingNowGetResponseType> {
  const res = await fetch(url, {
    method: "GET",
    headers: { Accept: "application/json" },
  });

  if (!res.ok) throw new Error("Failed to fetch");

  return res.json();
}

export default function RecordingNowBar() {
  const pathname = usePathname();
  const router = useRouter();

  const { data } = useSWR<RecordingNowGetResponseType, Error>(
    RECORDING_NOW_SWR_KEY,
    fetcher,
    { dedupingInterval: DEDUPING_INTERVAL_MS },
  );

  const recording = data?.recording ?? null;

  /*
   * バーを引っ込めた記録と、その時刻。
   *
   * 「記録を終える」(cookie)と違い、これは sessionStorage に置く。タブを閉じたり
   * PWA を起動し直したりすれば消えて、また出る。書き込むと同じタブのこのフックへ
   * 通知が飛ぶので、押した瞬間に反映される。
   */
  const hiddenValue = useSessionStorageItem(RECORDING_BAR_HIDDEN_KEY);

  /*
   * 引っ込めた状態の判定に使う「いま」。
   *
   * 時間で明けるので、開きっぱなしの画面でも戻ってくるようにタイマーで進める
   * (下の useEffect)。毎秒動かす必要はなく、明ける時刻に一度だけ起こせば足りる。
   */
  const [now, setNow] = useState(() => Date.now());

  const hidden =
    recording !== null && isRecordingBarHidden(hiddenValue, recording.recordId, now);

  useEffect(() => {
    if (recording === null) return;

    const until = recordingBarHiddenUntil(hiddenValue, recording.recordId);
    if (until === null) return;

    const delay = until - Date.now();
    if (delay <= 0) return;

    // 明ける時刻に一度だけ起こす。ここで state を動かすと hidden が false になる
    const timer = setTimeout(() => setNow(Date.now()), delay);
    return () => clearTimeout(timer);
  }, [hiddenValue, recording]);


  // 「記録を終える」の確認。押し間違いで今日のあいだ消えてしまうのを防ぐ
  const {
    isOpen: isFinishOpen,
    onOpen: onFinishOpen,
    onOpenChange: onFinishOpenChange,
  } = useDisclosure();

  const onHiddenPathname =
    HIDDEN_PATHNAMES.includes(pathname) ||
    // 当の記録を開いているなら、そこに追加ボタンがあるので要らない
    (recording !== null && pathname === `/records/${recording.recordId}`);

  const visible = recording !== null && !hidden && !onHiddenPathname;

  useEffect(() => {
    if (!visible) return;

    sendGAEvent("event", "recording_bar_impression");
    // 記録が変わったときだけ数える(ページを移るたびには送らない)
  }, [visible, recording?.recordId]);

  if (!visible || recording === null) return null;

  // 会場を持つのは公式イベントだけ。下段の組み方がこれで変わる
  const hasVenue = recording.venue !== "";

  /*
   * 会場のある/なしで組みが変わるので、共通の部品はここで作っておく。
   * 同じものを2通りの並びへ差し込むだけにして、書き分けが増えないようにする。
   */
  /*
   * イベントのアイコン。対戦記録カードと同じ枠に入れる。
   *
   * 「記録中」のしるしはこの中に持たせない。中に積むとアイコンの中心が下へずれて、
   * 隣に並ぶイベント名と水平に見えなくなる。行の外(上)に置く。
   */
  const icon = (
    <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-default-100 ring-1 ring-black/5 ring-inset">
      <EventIcon kind={recording.eventKind} iconUrl={recording.eventIconUrl} size={24} />
    </div>
  );

  /* 記録中のしるし。点だけだと何の帯か伝わらないので言葉を添える(動きは抑えられる) */
  const recordingMark = (
    <span className="flex items-center gap-1.5 text-xs font-bold leading-none text-primary">
      <span className="h-2 w-2 rounded-full bg-primary motion-safe:animate-pulse" />
      記録中
    </span>
  );

  const eventTitle = (
    <ScrollingText
      text={recording.eventTitle || "無題のイベント"}
      animationClass="animate-marquee-card-slow"
      className="min-w-0 flex-1 text-base leading-snug font-bold"
    />
  );

  // 集計が取れなかった場合は数字を出さない(0勝0敗と誤解させない)
  const summary = recording.hasSummary ? (
    <span className="shrink-0 text-xs font-bold tabular-nums text-default-600">
      {recording.total === 0 ? (
        <span className="text-default-400">まだ0戦</span>
      ) : (
        <>
          {recording.wins}勝{recording.losses}敗
          {recording.draws > 0 && `${recording.draws}分`}
        </>
      )}
    </span>
  ) : null;

  const finishButton = (
    <button
      type="button"
      onClick={onFinishOpen}
      /* 寸法は「対戦結果」と揃える。役割の違いは色で示す(こちらは枠線だけ) */
      /* 見た目は 32px、押せる範囲は上下に 6px ずつ広げて 44px にする */
      className="relative flex h-8 shrink-0 items-center justify-center gap-1.5 rounded-full border border-default-300 px-4 text-xs font-bold text-default-600 transition-transform after:absolute after:-inset-y-1.5 after:-inset-x-1 after:content-[''] active:scale-95 active:bg-default-100"
    >
      <LuCheck className="h-4 w-4" />
      記録終了
    </button>
  );

  // 会場の有無によらず同じ形。押す場所を変えない
  const addButton = (
    <button
      type="button"
      onClick={handleAddMatch}
      /* 見た目は 32px、押せる範囲は上下に 6px ずつ広げて 44px にする */
      className="relative flex h-8 shrink-0 items-center justify-center gap-1.5 rounded-full bg-primary px-4 text-xs font-bold text-white shadow-md transition-transform after:absolute after:-inset-y-1.5 after:-inset-x-1 after:content-[''] active:scale-95"
    >
      <LuCirclePlus className="h-4 w-4" />
      対戦追加
    </button>
  );

  function handleAddMatch() {
    if (recording === null) return;

    sendGAEvent("event", "recording_bar_add_match_click");
    // 着いた先で対戦追加モーダルを開いてもらう(ホームのカードと同じ仕組み)
    writeSessionStorage(OPEN_CREATE_MATCH_RECORD_ID, recording.recordId);
    router.push(`/records/${recording.recordId}`);
  }

  /*
   * 「記録を終える」。この大会はもう終わり、という意思表示なので、
   * ホームのカードと同じ cookie に書いて両方消す。確認モーダルで了解を得てから呼ぶ。
   */
  function handleFinish() {
    if (recording === null) return;

    sendGAEvent("event", "recording_bar_finish_click");
    writeClientCookie(
      RECORDING_DISMISSED_COOKIE,
      recordingDismissedValue(recording.recordId),
      RECORDING_DISMISSED_COOKIE_MAX_AGE,
    );
    dropRecordingNowFromStoredLayout();
    // API の結果を捨てて取り直す。この場でバーが消え、次にホームへ移ってもカードは出ない
    refreshRecordingNow();
    router.refresh();
  }

  /*
   * 「×」。いまは邪魔だからバーだけ引っ込める。記録中であることは終わらせないので、
   * ホームのカードはそのまま残る。バーも 10 分でまた出る(PWAを起動し直せばすぐ)。
   */
  function handleHide() {
    if (recording === null) return;

    sendGAEvent("event", "recording_bar_hide_click");
    writeSessionStorage(
      RECORDING_BAR_HIDDEN_KEY,
      recordingBarHiddenValue(recording.recordId),
    );
  }

  return (
    <BottomBanner dismissLabel="このバーを閉じる" onDismiss={handleHide}>
      <div className="flex items-stretch">
        {/*
          左端のアクセント。対戦記録カードと同じ言語で「記録の帯」だと示す。
          色はヘッダーと同じブランドの並び(青→藍→菫)。dev環境のヘッダーは
          見分けのためオレンジにしているが、ここは本番の配色で固定する。
        */}
        <span
          aria-hidden
          className="w-1 shrink-0 bg-linear-to-b from-blue-600 via-indigo-600 to-violet-700"
        />

        {/*
          組みはイベントの種別によらず同じ。左にアイコンとテキスト、右に操作を2段。
          会場を持つのは公式イベントだけなので、そこだけ行が1本増える。

          種別ごとに並べ方を変えていた時期があったが、公式と Tonamel を行き来すると
          同じ帯なのに要素が動いて見えた。差分は「会場の行があるか」だけに閉じる。
        */}
        <div className="flex min-w-0 flex-1 flex-col gap-1 px-4 py-2.5">
          {recordingMark}

          <div className="flex min-w-0 items-center gap-2.5">
            {icon}

            {/* イベント名と会場。会場は名前のすぐ下に、一段落とした文字で添える */}
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              {eventTitle}

              {/*
                会場名は長いことが多い(商業施設名＋店舗名など)ので、末尾を切らずに
                イベント名と同じく溢れたときだけ流す。ピンのアイコンは流さず左に留める。
              */}
              {hasVenue && (
                <div className="flex min-w-0 items-center gap-1 text-[0.6875rem] leading-snug text-default-500">
                  <LuMapPin aria-hidden className="h-3 w-3 shrink-0 text-default-400" />
                  <ScrollingText
                    text={recording.venue}
                    animationClass="animate-marquee-card-slow"
                    className="min-w-0 flex-1"
                  />
                </div>
              )}
            </div>

            {/*
              操作。上に戦績と記録終了、下に主操作。
              行間を広く取っているのは、2つのボタンが上下へ広げた押せる範囲(各6px)を
              重ねないため。詰めると境目でどちらが反応するか定まらない。
            */}
            <div className="flex shrink-0 flex-col items-end gap-3">
              <div className="flex items-center gap-2.5">
                {summary}
                {finishButton}
              </div>
              {addButton}
            </div>
          </div>
        </div>
      </div>

      <FinishRecordingModal
        eventTitle={recording.eventTitle}
        isOpen={isFinishOpen}
        onOpenChange={onFinishOpenChange}
        onConfirm={handleFinish}
      />
    </BottomBanner>
  );
}
