"use client";

import { useMemo, useState } from "react";
import useSWR from "swr";

import { Card, CardHeader, CardBody, Button, useDisclosure } from "@heroui/react";

import { LuChevronLeft, LuChevronRight } from "react-icons/lu";

import CalendarDayDetailModal from "@app/components/organisms/Calendar/CalendarDayDetailModal";
import { DashboardCalendarSkeleton } from "@app/components/organisms/Calendar/Skeleton/DashboardCalendarSkeleton";

import { CalendarGetResponseType, CalendarEventType } from "@app/types/calendar";
import { getCalendarGrid, getJstNow, toDateKey } from "@app/utils/calendar";

const WEEKDAY_LABELS = ["日", "月", "火", "水", "木", "金", "土"];

const EVENT_DOT_CLASS: Record<CalendarEventType, string> = {
  record: "bg-primary",
  match_added: "bg-warning",
  deck_created: "bg-success",
  deck_code_added: "bg-secondary",
  deck_archived: "bg-default-400",
};

async function fetcher(url: string): Promise<CalendarGetResponseType> {
  const res = await fetch(url, {
    method: "GET",
    headers: { Accept: "application/json" },
  });

  if (!res.ok) {
    throw new Error("Failed to fetch");
  }

  return res.json();
}

type Props = {
  userId: string;
};

export default function DashboardCalendar({ userId }: Props) {
  const { data, error, isLoading } = useSWR<CalendarGetResponseType, Error>(
    `/api/users/${userId}/calendar`,
    fetcher,
  );

  const today = useMemo(() => getJstNow(), []);
  const todayYear = today.getUTCFullYear();
  const todayMonth = today.getUTCMonth();
  const todayKey = useMemo(() => toDateKey(Date.now()), []);

  const [currentYear, setCurrentYear] = useState(todayYear);
  const [currentMonth, setCurrentMonth] = useState(todayMonth);

  const { isOpen, onOpen, onOpenChange, onClose } = useDisclosure();
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const grid = useMemo(
    () => getCalendarGrid(currentYear, currentMonth),
    [currentYear, currentMonth],
  );

  // 今後発生する予定のイベントは無いため、未来の月へは移動できないようにする
  const isCurrentMonth = currentYear === todayYear && currentMonth === todayMonth;

  const goToPrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentYear((y) => y - 1);
      setCurrentMonth(11);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  };

  const goToNextMonth = () => {
    if (isCurrentMonth) return;

    if (currentMonth === 11) {
      setCurrentYear((y) => y + 1);
      setCurrentMonth(0);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  };

  const goToCurrentMonth = () => {
    setCurrentYear(todayYear);
    setCurrentMonth(todayMonth);
  };

  const handleSelectDate = (dateKey: string) => {
    setSelectedDate(dateKey);
    onOpen();
  };

  if (isLoading) {
    return <DashboardCalendarSkeleton />;
  }

  if (error || !data) {
    return (
      <Card shadow="none" className="border border-divider">
        <CardBody className="py-8 text-center text-sm text-default-400">
          カレンダーの読み込みに失敗しました
        </CardBody>
      </Card>
    );
  }

  return (
    <>
      <Card shadow="none" className="border border-divider">
        <CardHeader className="flex items-center justify-between px-2 pt-3 pb-1">
          <Button isIconOnly size="sm" variant="light" onPress={goToPrevMonth}>
            <LuChevronLeft className="text-lg" />
          </Button>
          <div className="flex flex-col items-center">
            <div className="font-bold text-sm">
              {currentYear}年{currentMonth + 1}月
            </div>
            {/* 表示/非表示の切り替えで高さが変わりチラつくため、常に領域を確保しておく */}
            <button
              type="button"
              onClick={goToCurrentMonth}
              tabIndex={isCurrentMonth ? -1 : 0}
              aria-hidden={isCurrentMonth}
              className={`text-tiny font-bold text-primary mt-0.5 ${
                isCurrentMonth ? "invisible pointer-events-none" : ""
              }`}
            >
              今月へ戻る
            </button>
          </div>
          <Button
            isIconOnly
            size="sm"
            variant="light"
            isDisabled={isCurrentMonth}
            onPress={goToNextMonth}
          >
            <LuChevronRight
              className={`text-lg ${isCurrentMonth ? "text-default-200" : ""}`}
            />
          </Button>
        </CardHeader>
        <CardBody className="px-3 pb-3 pt-1">
          <div className="grid grid-cols-7 gap-1 mb-1">
            {WEEKDAY_LABELS.map((label) => (
              <div
                key={label}
                className="text-center text-tiny font-bold text-default-400"
              >
                {label}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {grid.map((cell) => {
              const events = data.data[cell.dateKey] ?? [];
              const eventTypes = Array.from(new Set(events.map((e) => e.type)));
              const isToday = cell.dateKey === todayKey;

              return (
                <button
                  key={cell.dateKey}
                  type="button"
                  disabled={events.length === 0}
                  onClick={() => handleSelectDate(cell.dateKey)}
                  className={`flex flex-col items-center justify-center gap-0.5 aspect-square rounded-lg text-tiny
                    ${cell.inCurrentMonth ? "text-foreground" : "text-default-300"}
                    ${isToday ? "bg-primary/10 font-bold" : ""}
                    ${events.length > 0 ? "cursor-pointer hover:bg-default-100" : "cursor-default"}
                  `}
                >
                  <span>{cell.date.getUTCDate()}</span>
                  <div className="flex gap-0.5 h-1.5">
                    {eventTypes.map((type) => (
                      <span
                        key={type}
                        className={`w-1.5 h-1.5 rounded-full ${EVENT_DOT_CLASS[type]}`}
                      />
                    ))}
                  </div>
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-x-4 gap-y-1.5 flex-wrap justify-center pt-3 text-tiny text-default-500">
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-primary" />
              記録作成
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-warning" />
              対戦結果の追加
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-success" />
              デッキ登録
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-secondary" />
              新しいデッキのバージョンを作成
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-default-400" />
              デッキをアーカイブ
            </div>
          </div>
        </CardBody>
      </Card>

      <CalendarDayDetailModal
        isOpen={isOpen}
        onOpenChange={onOpenChange}
        onClose={onClose}
        date={selectedDate}
        events={selectedDate ? (data.data[selectedDate] ?? []) : []}
      />
    </>
  );
}
