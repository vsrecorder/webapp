import { Card, CardHeader, CardBody } from "@heroui/react";
import { Skeleton } from "@heroui/react";

import { CALENDAR_LEGEND } from "@app/components/organisms/Calendar/calendarLegend";

const WEEKDAY_COUNT = 7;
// カレンダーグリッドは常に6週(42セル)固定で描画されるため、スケルトンも合わせる
const CALENDAR_CELL_COUNT = 42;

// 読み込み中・取得失敗のどちらでも使う器。
//
// カレンダーの高さは「幅」から決まる(セルが aspect-square の7列グリッド)ため、
// 失敗表示に高さを決め打ちすると端末幅ごとに骨格とズレる。骨格をそのまま置いて
// 場所を取り、失敗時はそれを伏せて文言を重ねる。こうすると読み込み中と失敗で
// カードの寸法が変わらず、下のセクションが跳ねない。
//
// 骨格の各行は「実体の行ボックスと同じ高さの器」に骨格の棒を入れる形にしてある。
// 棒の高さをそのまま行の高さにすると、実体のテキスト(text-tiny なら 16px)より
// 低くなり、切り替わった瞬間にカレンダー全体が下へ伸びる。
function DashboardCalendarBox({ message }: { message?: string }) {
  const isError = message != null;
  // 場所取りだけに使うときは伏せる(visibility:hidden なので支援技術からも外れる)
  const placeholder = isError ? "invisible" : "";

  return (
    <Card shadow="none" className="border border-divider">
      <CardHeader
        className={`flex items-center justify-between px-2 pt-3 pb-1 ${placeholder}`}
      >
        <Skeleton className="h-8 w-8 rounded-full" />
        {/* 実体のヘッダー中央は「YYYY年M月(text-sm)」と「今月へ戻る(text-tiny)」の2行 */}
        <div className="flex flex-col items-center">
          <div className="flex h-5 items-center">
            <Skeleton className="h-4 w-20 rounded-md" />
          </div>
          {/* 実体は当月でも「今月へ戻る」の領域を常に確保しているので、骨格でも空ける */}
          <div className="h-4 mt-0.5" />
        </div>
        <Skeleton className="h-8 w-8 rounded-full" />
      </CardHeader>
      <CardBody className={`px-3 pb-3 pt-1 ${placeholder}`}>
        <div className="grid grid-cols-7 gap-1 mb-1">
          {Array.from({ length: WEEKDAY_COUNT }).map((_, index) => (
            <div key={index} className="flex h-4 items-center">
              <Skeleton className="h-3.5 w-full rounded-md" />
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: CALENDAR_CELL_COUNT }).map((_, index) => (
            <Skeleton key={index} className="aspect-square rounded-lg" />
          ))}
        </div>

        {/* 実体と同じ凡例定義から描く。文言と同じ幅を取るので折返しの位置も揃う */}
        <div className="flex items-center gap-x-4 gap-y-1.5 flex-wrap justify-center pt-3 text-tiny">
          {CALENDAR_LEGEND.map((item) => (
            <div key={item.type} className="flex items-center gap-1.5">
              <Skeleton className="w-1.5 h-1.5 rounded-full shrink-0" />
              {/* 文言そのもので幅と行の高さを取り、骨格の棒はその上に重ねる */}
              <span className="relative">
                <span className="invisible">{item.label}</span>
                <Skeleton className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-3 rounded-md" />
              </span>
            </div>
          ))}
        </div>
      </CardBody>

      {isError && (
        <div className="absolute inset-0 flex items-center justify-center px-4 text-center text-sm text-default-400">
          {message}
        </div>
      )}
    </Card>
  );
}

// DashboardCalendar と同じ骨格のローディングスケルトン
export function DashboardCalendarSkeleton() {
  return <DashboardCalendarBox />;
}

// 取得に失敗したときの表示。骨格と同じ寸法を保つ(上の DashboardCalendarBox を参照)
export function DashboardCalendarError({ message }: { message: string }) {
  return <DashboardCalendarBox message={message} />;
}
