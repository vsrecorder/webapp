import { Card, CardBody, Skeleton } from "@heroui/react";

import StepLabel from "@app/components/molecules/StepLabel";
import { RecordCreateTab } from "@app/utils/recordCreatePrefs";

/*
 * /records/create のフォームの骨格。
 *
 * 実体(templates/RecordCreate)の各タブと同じ入れ子・同じ余白で組み、データに依存する
 * 入力欄と画像だけを Skeleton に置き換えている。手順ラベル(StepLabel)と固定の文言は
 * 実体と同じ部品をそのまま使うので、切り替わっても行がずれない。
 *
 * 寸法は実体を描いた HTML から採っている:
 *   DatePicker size="sm" radius="none" → h-8 / 角丸なし
 *   Tonamel のイベントID Input → h-10 / rounded-medium
 *   自由形式のイベント名 Input radius="none" → h-10 / 角丸なし
 *   react-select のコントロール → min-height 38px(emotion が注入)
 *   作成ボタン(既定 md) → h-10 / rounded-medium
 *
 * タブによって違うのは2番目のブロック(イベントの指定)だけで、その下の
 * デッキ・バージョン・デッキ画像・レギュレーション・作成ボタンは3タブ共通。
 */

// react-select のコントロール(既定 minHeight 38px)。Tailwind の刻みに無いので実寸で置く
const SELECT_HEIGHT = "h-[38px]";

// レギュレーションのセグメント。実体(RegulationSegmentedControl)と同じ枠に、
// 取得前のフォールバック(スタンダード/エクストラ/殿堂/その他)と同じ4つを置く
function RegulationSkeleton() {
  return (
    <div className="grid grid-cols-4 gap-1 rounded-xl border border-divider bg-default-100 p-1">
      {Array.from({ length: 4 }).map((_, i) => (
        <Skeleton key={i} className="h-8 rounded-lg" />
      ))}
    </div>
  );
}

// 開催日。3タブとも DatePicker size="sm" radius="none"(実体は h-8 / 角丸なし)
function EventDateSkeleton() {
  return (
    <div className="flex flex-col gap-1 pt-1">
      <div className="flex flex-col gap-2">
        <StepLabel num={1} required>
          開催日
        </StepLabel>
      </div>
      <Skeleton className="h-8 w-full rounded-none" />
    </div>
  );
}

// 公式イベント: 検索セレクト＋選んだイベントのプレビューカード(未選択でも枠は出る)
function OfficialEventFieldSkeleton() {
  return (
    <>
      <div className="flex flex-col gap-1 pt-1">
        <div className="flex flex-col gap-2">
          <StepLabel num={2} required>
            イベント
          </StepLabel>
        </div>
        <Skeleton className={`${SELECT_HEIGHT} w-full rounded`} />
      </div>

      <div className="pt-1">
        <Card radius="none" shadow="sm">
          <CardBody>
            <div className="pl-1 pr-1 flex items-center gap-5 w-full min-w-0">
              <div className="flex items-center justify-center gap-5 min-w-0">
                <div className="z-0 shrink-0">
                  <Skeleton className="h-18 w-18 rounded-none" />
                </div>
              </div>
              <div className="flex flex-col gap-2 min-w-0 flex-1">
                {/* イベント名・日時・会場・住所の4行。実体はアイコン＋テキストで h-5 */}
                {["w-3/4", "w-1/2", "w-2/3", "w-1/3"].map((w) => (
                  <div key={w} className="flex items-center gap-2 min-w-0">
                    <Skeleton className={`h-5 ${w} rounded-md`} />
                  </div>
                ))}
              </div>
            </div>
          </CardBody>
        </Card>
      </div>
    </>
  );
}

// Tonamel: イベントIDの入力＋『イベント名』とカバー画像
function TonamelEventFieldSkeleton() {
  return (
    <>
      <div className="flex flex-col gap-1 pt-1">
        <div className="flex flex-col gap-2">
          <StepLabel num={2} required>
            イベントID
          </StepLabel>
        </div>
        <Skeleton className="h-10 w-full rounded-medium" />
      </div>

      <div className="flex flex-col items-center gap-1.5">
        <div className="flex justify-center w-4/5">
          <Skeleton className="h-5 w-1/2 rounded-md" />
        </div>
        <div className="w-2/5 pb-3">
          <Skeleton className="w-full aspect-video rounded-lg" />
        </div>
      </div>
    </>
  );
}

// 自由形式: イベント名の入力だけ(公式イベントへの誘導は入力後にだけ出る)
function UnofficialEventFieldSkeleton() {
  return (
    <div className="flex flex-col gap-1 pt-1">
      <div className="flex flex-col gap-2">
        <StepLabel num={2} required>
          イベント名
        </StepLabel>
      </div>
      <Skeleton className="h-10 w-full rounded-none" />
    </div>
  );
}

export default function RecordCreateFormSkeleton({ tab }: { tab: RecordCreateTab }) {
  return (
    <div className="pt-9 pb-1.5 flex flex-col gap-2" aria-hidden="true">
      <EventDateSkeleton />

      {tab === "official" && <OfficialEventFieldSkeleton />}
      {tab === "tonamel" && <TonamelEventFieldSkeleton />}
      {tab === "unofficial" && <UnofficialEventFieldSkeleton />}

      {/* 使用デッキ。Tonamel だけ実体に上の余白が無い */}
      <div className={`flex flex-col gap-1 ${tab === "tonamel" ? "" : "pt-1.5"}`}>
        <div className="flex flex-col gap-2">
          <StepLabel num={3}>デッキ</StepLabel>
        </div>
        <div>
          <Skeleton className={`${SELECT_HEIGHT} w-full rounded`} />
        </div>
      </div>

      {/* バージョン。ここだけ手順ラベルではなく素の label */}
      <div className="pb-1.5 flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">バージョン</span>
        </div>
        <div>
          <Skeleton className={`${SELECT_HEIGHT} w-full rounded`} />
        </div>
      </div>

      {/* 選んだデッキの画像 */}
      <div className="flex flex-col items-center gap-2 pb-1.5">
        <div className="relative w-full aspect-2/1 overflow-hidden">
          <Skeleton className="absolute inset-0 rounded-lg" />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <StepLabel num={4}>レギュレーション</StepLabel>
      </div>
      <RegulationSkeleton />

      <Skeleton className="h-10 w-full rounded-medium" />
    </div>
  );
}
