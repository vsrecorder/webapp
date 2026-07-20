"use client";

import { useEffect, useState } from "react";
import { DatePicker, Input, Image, Skeleton } from "@heroui/react";
import { CalendarDate, today, getLocalTimeZone } from "@internationalized/date";

import { scrollIntoViewAfterKeyboard } from "@app/utils/keyboard";

// 記録作成ページ(RecordCreate)のTonamelタブと同等のUI/挙動を提供する共有コンポーネント。
// 開催日(DatePicker)＋イベントID(入力＋外部検証)＋イベント名/画像プレビュー。

type Props = {
  date: CalendarDate;
  onDateChange: (date: CalendarDate) => void;
  eventId: string;
  onEventIdChange: (eventId: string) => void;
  // 有効なイベントIDが入っているか(保存可否の判定に使う)を親へ伝える
  onValidityChange: (valid: boolean) => void;
};

export default function TonamelEventInput({
  date,
  onDateChange,
  eventId,
  onEventIdChange,
  onValidityChange,
}: Props) {
  const [tonamelEventTitle, setTonamelEventTitle] = useState("");
  const [tonamelEventImage, setTonamelEventImage] = useState("");
  // 入力に対する検証結果(エラー表示用)。空入力時はエラー表示しない(true)。
  const [isValidated, setIsValidated] = useState(true);

  // イベントIDが変わるたびにTonamel APIで有効性を確認する(記録作成ページと同じ挙動)。
  useEffect(() => {
    if (!eventId) {
      setTonamelEventTitle("");
      setTonamelEventImage("");
      setIsValidated(true);
      onValidityChange(false);
      return;
    }

    let cancelled = false;
    const checkTonamelEventId = async () => {
      try {
        const res = await fetch(`/api/tonamel_events/${eventId}`, { method: "GET" });
        if (!res.ok) throw new Error(`HTTP error: ${res.status}`);
        const data = await res.json();
        if (cancelled) return;
        setTonamelEventTitle(data.title);
        setTonamelEventImage(data.image);
        setIsValidated(true);
        onValidityChange(true);
      } catch (error) {
        console.error(error);
        if (cancelled) return;
        setTonamelEventTitle("");
        setTonamelEventImage("");
        setIsValidated(false);
        onValidityChange(false);
      }
    };

    checkTonamelEventId();
    return () => {
      cancelled = true;
    };
    // onValidityChange は親が useCallback 化しない前提で依存から外す
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId]);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <span className="text-sm font-medium text-default-700">
          開催日<span className="text-danger ml-0.5">*</span>
        </span>
        <DatePicker
          isRequired
          aria-label="開催日"
          radius="none"
          size="sm"
          firstDayOfWeek="sun"
          value={date}
          onChange={(value) =>
            onDateChange(value == null ? today(getLocalTimeZone()) : value)
          }
        />
      </div>

      <div className="flex flex-col gap-1">
        <span className="text-sm font-medium text-default-700">
          イベントID<span className="text-danger ml-0.5">*</span>
        </span>
        <Input
          isRequired
          type="text"
          placeholder="例) YFUVY"
          isInvalid={!isValidated}
          errorMessage="無効なイベントIDです"
          value={eventId}
          onChange={(e) => onEventIdChange(e.target.value)}
          onFocus={(e) => scrollIntoViewAfterKeyboard(e.currentTarget)}
        />
      </div>

      <div className="flex flex-col items-center gap-1.5">
        <div className="flex justify-center w-4/5">
          <span>『</span>
          <span className="truncate">{tonamelEventTitle ? tonamelEventTitle : "イベント名"}</span>
          <span>』</span>
        </div>
        <div className="w-2/5 pb-1">
          <div className="relative w-full aspect-video overflow-hidden rounded-lg">
            {!isValidated && <Skeleton className="absolute inset-0" />}
            <Image
              removeWrapper
              className="absolute inset-0 z-0 w-full h-full object-contain"
              radius="none"
              shadow="none"
              alt={tonamelEventTitle ? tonamelEventTitle : "Tonamelイベント画像"}
              src={
                tonamelEventImage
                  ? tonamelEventImage
                  : "https://tonamel.com/nuxt/6421c0babd-048e71d12e-3c73406b87-f5f712130f/_nuxt/assets/images/figures/logo/cover.3df31ff29b40f8d4032c417f126b9713.jpg"
              }
            />
          </div>
        </div>
      </div>
    </div>
  );
}
