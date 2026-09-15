"use client";

import { useEffect, useState } from "react";

import { useRouter } from "next/navigation";

import { Button, Card, CardBody, useDisclosure } from "@heroui/react";
import { LuCheck, LuCirclePlus, LuMapPin } from "react-icons/lu";
import { sendGAEvent } from "@next/third-parties/google";

import DeckSprites from "@app/components/molecules/DeckSprites";
import FinishRecordingModal from "@app/components/molecules/FinishRecordingModal";
import EventIcon from "@app/components/molecules/EventIcon";
import ScrollingText from "@app/components/molecules/ScrollingText";
import RecordMetaRows from "@app/components/organisms/Record/RecordMetaRows";

import { MatchSummaryType } from "@app/types/match";
import { RecordCardDeckType, RecordGetByIdResponseType } from "@app/types/record";
import { writeClientCookie } from "@app/utils/clientCookie";
import { OPEN_CREATE_MATCH_RECORD_ID } from "@app/utils/createMatchIntent";
import {
  dropRecordingNowFromStoredLayout,
  refreshRecordingNow,
} from "@app/utils/recordingNowClient";
import {
  RECORDING_DISMISSED_COOKIE,
  RECORDING_DISMISSED_COOKIE_MAX_AGE,
  formatElapsedDuration,
  isWithinRecordingWindow,
  recordingDismissedValue,
} from "@app/utils/recordingNow";
import { writeSessionStorage } from "@app/utils/sessionStorageStore";

// 経過時間の表示を更新する間隔。分単位でしか出さないので1分で足りる
const ELAPSED_REFRESH_MS = 60 * 1000;

type Props = {
  record: RecordGetByIdResponseType;
  eventTitle: string;
  // 公式イベントのアイコン画像。Tonamel と自由形式は null(種別ごとの印をここで描く)
  eventIconUrl: string | null;
  // 会場(公式イベントのみ)。空なら行ごと出さない
  venue: string;
  deck: RecordCardDeckType | null;
  summary: MatchSummaryType | null;
  // 最後に手が動いた時刻(ISO文字列)
  lastActiveAt: string;
  /*
   * その起点から数える窓の長さ(ミリ秒)。対戦0件なら18時間、1件以上なら6時間
   * (utils/recordingNow)。サーバの判定と食い違わないよう、ここでは決め直さずに受け取る。
   */
  windowMs: number;
  // サーバで組み立てた経過時間(「42分」)。ハイドレーションで文言がずれないよう、
  // 初回はこの値をそのまま使い、マウント後に自分で計算し直す
  initialElapsedLabel: string;
};

/*
 * ホーム上部に固定で出す「記録中のイベント」カード。
 *
 * 大会やPTCGLの合間に2戦目・3戦目を足すまでが遠い(記録カード → メニュー → 詳細ページ →
 * 対戦結果を追加する、の4タップ)というお問い合わせへの対応。
 *
 * 『対戦結果を追加する』はここでモーダルを開かず、その記録の詳細ページへ移ってから開く
 * (utils/createMatchIntent)。入力を終えたあとに、対戦一覧と戦績がそのまま目の前にある
 * ほうが、何戦目まで入れたかを確かめやすいため。
 *
 * 出す・出さないの判定はサーバ側(utils/recordingNowServer)が済ませてあり、
 * このコンポーネントは「出すと決まったとき」だけ描画される。
 * クライアントで面倒を見るのは、描画したあとに変わる次の2つだけ:
 *   ・「記録を終える」を押した(cookie に残して消す)
 *   ・開いたまま窓を過ぎた(消す)
 */
export default function RecordingNowCard({
  record,
  eventTitle,
  eventIconUrl,
  venue,
  deck,
  summary,
  lastActiveAt,
  windowMs,
  initialElapsedLabel,
}: Props) {
  const router = useRouter();

  // 「記録を終える」を押したか。押した時点でこのカードは消える
  const [dismissed, setDismissed] = useState(false);
  const [elapsedLabel, setElapsedLabel] = useState(initialElapsedLabel);
  // 開いたまま窓を過ぎたら消す(PWAでホームを出しっぱなしにしている場合)
  const [expired, setExpired] = useState(false);

  // 「記録を終える」の確認。押し間違いで今日のあいだ消えてしまうのを防ぐ
  const {
    isOpen: isFinishOpen,
    onOpen: onFinishOpen,
    onOpenChange: onFinishOpenChange,
  } = useDisclosure();

  useEffect(() => {
    function refresh() {
      setElapsedLabel(formatElapsedDuration(lastActiveAt));
      setExpired(!isWithinRecordingWindow(lastActiveAt, windowMs));
    }

    // 受け取った値に合わせてから、以後は1分ごとに更新する
    refresh();
    const timer = setInterval(refresh, ELAPSED_REFRESH_MS);
    return () => clearInterval(timer);
  }, [lastActiveAt, windowMs]);

  useEffect(() => {
    sendGAEvent("event", "recording_now_impression");
  }, []);

  /*
   * カードが消えたら、次にホームを開いたときの骨格からも外す。
   *
   * cookie は同期で直し(すぐリロードされても効く)、サーバが組み立てる構成(pinnedIds)は
   * router.refresh() で取り直す。後者をやらないと、このページで並べ替え設定を触った
   * ときに DashboardSections が古い pinnedIds から並びを書き戻してしまう。
   */
  useEffect(() => {
    if (!dismissed && !expired) return;

    dropRecordingNowFromStoredLayout();
    router.refresh();
  }, [dismissed, expired, router]);

  if (dismissed || expired) return null;

  const total = summary?.total ?? 0;
  const draws = summary?.draws ?? 0;


  function handleAddMatch() {
    sendGAEvent("event", "recording_now_add_match_click");
    // 着いた先で対戦追加モーダルを開いてもらう(遷移先が読んだ時点で消える)
    writeSessionStorage(OPEN_CREATE_MATCH_RECORD_ID, record.id);
    router.push(`/records/${record.id}`);
  }

  // 確認モーダルで了解を得てから呼ぶ
  function handleFinish() {
    sendGAEvent("event", "recording_now_finish_click");
    // 日付を含めた値にしておくと、日が変わった時点で古い値は一致しなくなる
    writeClientCookie(
      RECORDING_DISMISSED_COOKIE,
      recordingDismissedValue(record.id),
      RECORDING_DISMISSED_COOKIE_MAX_AGE,
    );
    setDismissed(true);
    // 画面下のバーも同じ記録を指しているので、取り直させて一緒に消す
    refreshRecordingNow();
  }

  return (
    <Card className="shadow-md border-2 border-primary bg-primary/5">
      <CardBody className="p-4 flex flex-col gap-3">
        <div className="flex items-center gap-2">
          {/* 記録中であることの合図。動きを抑えている人には点滅させない */}
          <span className="flex items-center gap-1.5 text-xs font-bold text-primary">
            <span className="w-2 h-2 rounded-full bg-primary motion-safe:animate-pulse" />
            記録中
          </span>
          {/*
            起点が対戦か記録の作成かで言い回しを変える。「最後の記録から」だと、
            対戦をまだ入れていない記録で何を指しているのか分からない。
          */}
          <span className="text-tiny text-default-400">
            {total > 0 ? "最後の対戦から" : "記録を作成してから"}
            {elapsedLabel}経過
          </span>
          <Button
            size="sm"
            variant="bordered"
            radius="full"
            className="ml-auto h-7 border-default-300 px-2.5 text-tiny font-bold text-default-600"
            startContent={<LuCheck className="w-3.5 h-3.5" />}
            onPress={onFinishOpen}
          >
            記録終了
          </Button>
        </div>

        <div className="flex items-center gap-2.5">
          {/* イベントのアイコン枠。対戦記録カード(RecordCardBase)と同じ寸法・同じ面 */}
          <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-default-100 ring-1 ring-black/5 ring-inset">
            <EventIcon
              kind={
                record.official_event_id !== 0
                  ? "official"
                  : record.tonamel_event_id !== ""
                    ? "tonamel"
                    : "unofficial"
              }
              iconUrl={eventIconUrl}
            />
          </div>

          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            {/*
              イベント名の出し方は対戦記録カードに揃える。長い公式イベント名でも端を
              切らずに流して読ませたいので truncate ではなく ScrollingText を使い、
              文字組と未設定時の文言も同じにする。
            */}
            <ScrollingText
              text={eventTitle || "無題のイベント"}
              animationClass="animate-marquee-card-slow"
              className="min-w-0 w-full text-sm leading-snug font-bold"
            />
            {/* 会場。対戦記録カード・記録詳細のヒーローと同じ部品で出す */}
            {venue !== "" && (
              <RecordMetaRows
                rows={[{ icon: <LuMapPin className="h-3 w-3" />, text: venue }]}
              />
            )}
          </div>

          {/* 戦績。集計が取れなかった場合は数字を出さない(0勝0敗と誤解させない) */}
          {summary && (
            <span className="shrink-0 text-sm font-bold tabular-nums">
              {total === 0 ? (
                <span className="text-default-400">まだ0戦</span>
              ) : (
                <>
                  {summary.wins}勝{summary.losses}敗{draws > 0 && `${draws}分`}
                </>
              )}
            </span>
          )}
        </div>

        {/*
          使用デッキ。対戦記録カードと同じく、イベントの情報とは行を分ける。
          未登録なら行ごと出さない(「未登録」とだけ書かれた行は場所を取るだけなので)。

          高さはスプライト(28px)で固定する。スプライトが未設定のデッキでも行が縮まず、
          同じ寸法で描いた骨格から差し替わったときにカードの高さが変わらない。
        */}
        {deck && (
          <span className="flex h-7 min-w-0 items-center gap-1.5 text-xs text-default-500">
            {/* 記録作成ページのデッキ選択と同じ大きさに揃える */}
            <DeckSprites sprites={deck.pokemon_sprites} size={28} hideWhenEmpty />
            <span className="truncate">{deck.name}</span>
          </span>
        )}

        <Button
          fullWidth
          color="primary"
          radius="full"
          className="font-bold shadow-md"
          startContent={<LuCirclePlus className="w-4 h-4" />}
          onPress={handleAddMatch}
        >
          対戦結果を追加する
        </Button>
      </CardBody>

      <FinishRecordingModal
        eventTitle={eventTitle}
        isOpen={isFinishOpen}
        onOpenChange={onFinishOpenChange}
        onConfirm={handleFinish}
      />
    </Card>
  );
}
