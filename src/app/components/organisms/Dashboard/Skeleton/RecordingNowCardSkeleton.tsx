import { Card, CardBody } from "@heroui/react";

/*
 * 「記録中のイベント」カードの骨格。
 *
 * 実体(RecordingNowCard)は表示回数の GA イベントを持つため、骨格として実体を描くと
 * 二重に飛ぶ。FirstRecordCtaCardSkeleton と同じく、同じ寸法の骨格を別に持つ。
 *
 * 高さの内訳は実体に合わせること:
 *   ・見出し行 …… 「記録を終える」ボタン(h-7 = 28px)が決める
 *   ・イベント行 … アイコン枠(40px)が決める(中身はイベント名 + 会場)
 *   ・デッキ行 …… スプライト(28px)。使用デッキが未登録の記録では実体ごと無いので出さない
 *   ・ボタン …… 44px(指で押す領域の下限に合わせてある)
 *
 * 使用デッキの行を描くかは呼び出し側が決める(どちらを描いたかは cookie のブロックIDで
 * 覚えてある。中身が2種類ある節と同じ扱い。utils/dashboardLayout)。
 */
export default function RecordingNowCardSkeleton({ withDeck = true }: { withDeck?: boolean }) {
  return (
    <Card className="shadow-md border-2 border-primary bg-primary/5">
      <CardBody className="p-4 flex flex-col gap-3">
        {/* 「●記録中」「最後の記録から◯分」「記録を終える」の行 */}
        <div className="flex h-7 items-center gap-2">
          <div className="h-2.5 w-14 rounded-full bg-primary/20 animate-pulse" />
          <div className="h-2.5 w-28 rounded-full bg-default-200 animate-pulse" />
          <div className="ml-auto h-7 w-24 rounded-full bg-default-100 animate-pulse" />
        </div>

        {/* アイコン枠 + イベント名/会場 + 戦績 */}
        <div className="flex items-center gap-2.5">
          <div className="h-10 w-10 shrink-0 rounded-xl bg-default-100 animate-pulse" />
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            {/* 行の高さはフォントのメトリクスで決まるので、決め打ちせず
                実物と同じ文字組の見えないテキストで取ってからバーを重ねる */}
            <div className="relative flex items-center">
              <span aria-hidden className="invisible text-sm leading-snug font-bold">
                イベント名
              </span>
              <span className="absolute inset-y-0.5 left-0 w-40 max-w-full rounded-md bg-primary/20 animate-pulse" />
            </div>
            {/* 会場(RecordMetaRows の1行と同じ文字組) */}
            <div className="relative flex items-center">
              <span aria-hidden className="invisible text-[0.6875rem] leading-snug">
                会場
              </span>
              <span className="absolute inset-y-0 left-0 w-32 max-w-full rounded-full bg-default-200 animate-pulse" />
            </div>
          </div>
          <div className="h-3.5 w-16 shrink-0 rounded-full bg-default-200 animate-pulse" />
        </div>

        {/* 使用デッキ(スプライト2枠 28px × 2 + デッキ名) */}
        {withDeck && (
          <div className="flex h-7 items-center gap-1.5">
            <div className="h-7 w-14 rounded-md bg-default-200 animate-pulse" />
            <div className="h-3 w-24 rounded-full bg-default-200 animate-pulse" />
          </div>
        )}

        {/* 「対戦結果を追加する」 */}
        <div className="h-11 w-full rounded-full bg-primary/20 animate-pulse" />
      </CardBody>
    </Card>
  );
}
