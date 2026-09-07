import { Card, CardBody, Skeleton } from "@heroui/react";

import { LuBookmark } from "react-icons/lu";
import { LuCalendar } from "react-icons/lu";
import { LuHouse } from "react-icons/lu";
import { LuMapPin } from "react-icons/lu";

import StepLabel from "@app/components/molecules/StepLabel";
import { RecordCreateTab } from "@app/utils/recordCreatePrefs";

/*
 * /records/create のフォームの骨格。
 *
 * 実体(templates/RecordCreate)の各タブと同じ入れ子・同じ余白で組み、データに依存する
 * 入力欄と画像だけを Skeleton に置き換えている。手順ラベル(StepLabel)と、選ぶ前から
 * 実体に出ている固定の文言(「イベント名」「イベント日時」…)は実体と同じものをそのまま
 * 置くので、切り替わっても行がずれない。
 *
 * 寸法は実体を描いた HTML から採っている:
 *   DatePicker size="sm" radius="none" → h-8 / 角丸なし
 *   イベントID・イベント名の Input radius="none" → h-10 / 角丸なし
 *   react-select のコントロール → min-height 38px(emotion が注入)
 *   レギュレーションのセグメント → h-8.5(枠1px + py-2 + leading-4)
 *   作成ボタン(既定 md) → h-10 / rounded-medium
 *
 * タブによって違うのは2番目のブロック(イベントの指定)だけで、その下の
 * デッキ・バージョン・デッキ画像・レギュレーション・作成ボタンは3タブ共通。
 *
 * 手順ラベルの付いた5つの項目は、実体と同じく「flex flex-col gap-1 pt-1」で揃える。
 */

// react-select のコントロール(既定 minHeight 38px)。Tailwind の刻みに無いので実寸で置く
const SELECT_HEIGHT = "h-[38px]";

/*
 * レギュレーションのセグメント。実体(RegulationSegmentedControl)と同じ枠に、
 * 取得前のフォールバック(スタンダード/エクストラ/殿堂/その他)と同じ4つを置く。
 * セグメント1つの高さは leading-4(16px) + py-2(16px) + 枠(2px) = 34px。
 */
function RegulationSkeleton() {
  return (
    <div className="flex flex-col gap-1 pt-1">
      <StepLabel num={4}>レギュレーション</StepLabel>

      <div className="grid grid-cols-4 gap-1 rounded-xl border border-divider bg-default-100 p-1">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-8.5 rounded-lg" />
        ))}
      </div>
    </div>
  );
}

/*
 * 集計オプション(この記録を戦績集計に含めない)。
 *
 * 実体(IgnoreStatsOption)と同じ枠に、見出し1行と説明2行ぶんを置く。説明は
 * ON/OFF どちらでも2行に揃うよう min-h-8 が入っているので、骨格でも同じ高さを取る。
 */
function IgnoreStatsSkeleton() {
  return (
    <div className="flex flex-col gap-1 pt-1">
      <StepLabel num={5}>集計オプション</StepLabel>

      <div className="flex items-center justify-between gap-4 rounded-lg border border-divider bg-default-50 px-3 py-2.5">
        <div className="flex flex-col gap-0.5">
          <Skeleton className="h-5 w-52 rounded-md" />
          {/* 説明は実体でも2行に揃えてある(min-h-8) */}
          <div className="min-h-8 flex flex-col gap-0.5">
            <Skeleton className="h-3.5 w-64 max-w-full rounded-md" />
            <Skeleton className="h-3.5 w-40 max-w-full rounded-md" />
          </div>
        </div>
        {/* Switch size="sm" のつまみ(w-10 h-6 相当) */}
        <Skeleton className="h-6 w-10 shrink-0 rounded-full" />
      </div>
    </div>
  );
}

// 開催日。3タブとも DatePicker size="sm" radius="none"(実体は h-8 / 角丸なし)
function EventDateSkeleton() {
  return (
    <div className="flex flex-col gap-1 pt-1">
      <StepLabel num={1} required>
        開催日
      </StepLabel>

      <Skeleton className="h-8 w-full rounded-none" />
    </div>
  );
}

/*
 * 公式イベント: 検索セレクト＋選んだイベントのプレビューカード。
 *
 * プレビューカードは未選択でも枠が出て、中身は「イベント名」「イベント日時」…の
 * 決まり文句になる。実体と同じアイコン・同じ文言・同じ入れ子で置く(ここを
 * Skeleton のバーで代用すると、行の高さが 16px→20px に膨らみカードが16px高くなる)。
 */
const OFFICIAL_EVENT_PLACEHOLDER_ROWS = [
  { key: "title", icon: <LuBookmark color="gray" />, label: "イベント名" },
  { key: "datetime", icon: <LuCalendar color="gray" />, label: "イベント日時" },
  { key: "shop", icon: <LuHouse color="gray" />, label: "イベント主催者" },
  { key: "address", icon: <LuMapPin color="gray" />, label: "イベント会場" },
];

function OfficialEventFieldSkeleton() {
  return (
    <>
      <div className="flex flex-col gap-1 pt-1">
        <StepLabel num={2} required>
          イベント
        </StepLabel>

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

                <div className="flex flex-col gap-2 min-w-0 flex-1">
                  {OFFICIAL_EVENT_PLACEHOLDER_ROWS.map((row) => (
                    <div key={row.key} className="flex items-center gap-2 min-w-0">
                      <span className="shrink-0">{row.icon}</span>
                      <span className="flex-1 min-w-0 overflow-hidden whitespace-nowrap text-xs text-default-600">
                        {row.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardBody>
        </Card>
      </div>
    </>
  );
}

/*
 * Tonamel: イベントIDの入力＋『イベント名』とカバー画像。
 * 『イベント名』の行も実体と同じ文言をそのまま置く(バーにすると行が 24px→20px に縮む)。
 */
function TonamelEventFieldSkeleton() {
  return (
    <>
      <div className="flex flex-col gap-1 pt-1">
        <StepLabel num={2} required>
          イベントID
        </StepLabel>

        <Skeleton className="h-10 w-full rounded-none" />
      </div>

      <div className="flex flex-col items-center gap-1.5">
        <div className="flex justify-center w-4/5">
          <span>『</span>
          <span className="truncate">イベント名</span>
          <span>』</span>
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
      <StepLabel num={2} required>
        イベント名など
      </StepLabel>

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

      {/* 使用デッキ */}
      <div className="flex flex-col gap-1 pt-1">
        <StepLabel num={3}>デッキ</StepLabel>

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

      <RegulationSkeleton />

      <IgnoreStatsSkeleton />

      <Skeleton className="h-10 w-full rounded-medium" />
    </div>
  );
}
