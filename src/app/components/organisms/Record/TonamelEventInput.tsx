"use client";

import { useEffect } from "react";
import { Input, Image, Skeleton } from "@heroui/react";
import HydratedDatePicker from "@app/components/molecules/HydratedDatePicker";
import { CalendarDate, today } from "@internationalized/date";

import { scrollIntoViewAfterKeyboard } from "@app/utils/keyboard";
import { JST_TIME_ZONE } from "@app/utils/date";
import { useTonamelEventCheck } from "@app/hooks/useTonamelEventCheck";

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
  // イベントIDの実在確認(記録作成ページと同じ挙動。手が止まってから問い合わせる)
  const {
    isValid,
    isInvalidInput,
    title: tonamelEventTitle,
    image: tonamelEventImage,
  } = useTonamelEventCheck(eventId);

  // 保存可否を親へ伝える(確認結果が変わったときだけ)
  useEffect(() => {
    onValidityChange(isValid);
    // onValidityChange は親が useCallback 化しない前提で依存から外す
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isValid]);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <span className="text-sm font-medium text-default-700">
          開催日<span className="text-danger ml-0.5">*</span>
        </span>
        <HydratedDatePicker
          name="tonamel-event-date"
          isRequired
          aria-label="開催日"
          radius="none"
          size="sm"
          firstDayOfWeek="sun"
          value={date}
          onChange={(value) =>
            onDateChange(value == null ? today(JST_TIME_ZONE) : value)
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
          isInvalid={isInvalidInput}
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
            {isInvalidInput && <Skeleton className="absolute inset-0" />}
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
