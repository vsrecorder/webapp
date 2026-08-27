"use client";

import {
  Dispatch,
  SetStateAction,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  Button,
  DatePicker,
  Input,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  Spinner,
  Tab,
  Tabs,
  addToast,
  closeToast,
} from "@heroui/react";

import { CalendarDate, getLocalTimeZone, today } from "@internationalized/date";

import OfficialEventSelect from "@app/components/organisms/Record/OfficialEventSelect";
import TonamelEventInput from "@app/components/organisms/Record/TonamelEventInput";

import {
  RecordGetByIdResponseType,
  RecordUpdateRequestType,
  RecordUpdateResponseType,
} from "@app/types/record";
import {
  UnofficialEventCreateRequestType,
  UnofficialEventCreateResponseType,
  UnofficialEventGetByIdResponseType,
  UnofficialEventUpdateRequestType,
  UnofficialEventUpdateResponseType,
} from "@app/types/unofficial_event";

import { MAX_EVENT_TITLE_LENGTH, exceedsTextLength } from "@app/utils/textLength";
import { triggerNotificationsRefresh } from "@app/utils/notificationEvents";

type EventType = "official" | "tonamel" | "unofficial";

// 記録が持つIDから現在のイベント種別を判定する(記録作成時の分岐と同じ規則)
function getEventType(record: RecordGetByIdResponseType): EventType {
  if (record.official_event_id !== 0) return "official";
  if (record.tonamel_event_id !== "") return "tonamel";
  return "unofficial";
}

// 日付文字列(ISO)を DatePicker 用の CalendarDate へ変換する。
// 未設定の記録には "0001-01-01..." が入っているため、その場合は null を返す。
function toCalendarDate(value?: string | Date | null): CalendarDate | null {
  if (!value) return null;

  const str = typeof value === "string" ? value : value.toString();
  if (str.startsWith("0001-01-01")) return null;

  const date = new Date(str);
  if (Number.isNaN(date.getTime())) return null;

  return new CalendarDate(date.getFullYear(), date.getMonth() + 1, date.getDate());
}

function calendarDateToYmd(date: CalendarDate): string {
  return `${date.year}-${String(date.month).padStart(2, "0")}-${String(date.day).padStart(2, "0")}`;
}

async function fetchUnofficialEvent(
  id: string,
): Promise<UnofficialEventGetByIdResponseType> {
  const res = await fetch(`/api/unofficial_events/${id}`, {
    cache: "no-store",
    method: "GET",
    headers: { Accept: "application/json" },
  });
  if (!res.ok) throw new Error("Failed to fetch");
  return res.json();
}

type Props = {
  record: RecordGetByIdResponseType;
  setRecord: Dispatch<SetStateAction<RecordGetByIdResponseType | null>>;
  isOpen: boolean;
  onOpenChange: () => void;
  // 変更が完了したときの通知(イベント情報の表示を取り直してもらうために使う)
  onUpdated?: () => void;
};

/*
 * 記録のイベント情報(種別・開催日・イベント)を変更するモーダル。
 *
 * 入力UIは記録作成の各導線と揃えるため、公式イベントは OfficialEventSelect、
 * Tonamel は TonamelEventInput をそのまま再利用する。
 *
 * 自由形式のイベント名・開催日は、記録が既に自由形式イベントを参照していれば
 * そのイベントを更新する。他の種別から自由形式へ変更した場合は参照先が無いため、
 * 記録作成時と同じ流れで新しい自由形式イベントを作成してから紐づける。
 * 逆に自由形式から他の種別へ変更した場合は、参照されなくなった自由形式イベントを削除する。
 */
export default function EditEventInfoModal({
  record,
  setRecord,
  isOpen,
  onOpenChange,
  onUpdated,
}: Props) {
  const currentEventType = getEventType(record);

  const [eventType, setEventType] = useState<EventType>(currentEventType);
  // 開催日は種別をまたいで引き継ぐ(種別だけ付け替えたい場合に入れ直さずに済む)
  const [eventDate, setEventDate] = useState<CalendarDate>(today(getLocalTimeZone()));
  const [officialEventId, setOfficialEventId] = useState<number | null>(null);
  const [tonamelEventId, setTonamelEventId] = useState<string>("");
  const [isValidTonamelEventId, setIsValidTonamelEventId] = useState<boolean>(false);
  const [eventTitle, setEventTitle] = useState<string>("");

  // 変更の有無を判定するための初期値(モーダルを開いた時点の記録の内容)
  const [initialDate, setInitialDate] = useState<CalendarDate | null>(null);
  const [initialEventTitle, setInitialEventTitle] = useState<string>("");

  // 自由形式イベント(イベント名・開催日)の取得中フラグ
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isUpdating, setIsUpdating] = useState<boolean>(false);

  // セレクターを閉じたときにフォーカスを引き受ける要素
  // (フォーカストラップを満たしつつキーボードを閉じるために使用)
  const focusSinkRef = useRef<HTMLDivElement>(null);

  /*
   * モーダルを開いたときに、記録の内容で入力欄を初期化する。
   * 自由形式はイベント名が記録側に無いため、参照先の自由形式イベントを取得する。
   */
  useEffect(() => {
    if (!isOpen) return;

    const type = getEventType(record);
    const recordDate = toCalendarDate(record.event_date);

    setEventType(type);
    setOfficialEventId(record.official_event_id !== 0 ? record.official_event_id : null);
    setTonamelEventId(record.tonamel_event_id);
    setIsValidTonamelEventId(record.tonamel_event_id !== "");
    setEventTitle("");
    setInitialEventTitle("");

    if (type !== "unofficial" || !record.unofficial_event_id) {
      const date =
        recordDate ?? toCalendarDate(record.created_at) ?? today(getLocalTimeZone());
      setEventDate(date);
      setInitialDate(date);
      setIsLoading(false);
      return;
    }

    let ignore = false;
    setIsLoading(true);
    fetchUnofficialEvent(record.unofficial_event_id)
      .then((data) => {
        if (ignore) return;
        // 開催日は記録側(event_date)を優先し、無ければイベント側の日付を使う
        // (記録一覧・詳細の表示と同じ優先順位)
        const date =
          recordDate ??
          toCalendarDate(data.date) ??
          toCalendarDate(record.created_at) ??
          today(getLocalTimeZone());
        setEventDate(date);
        setInitialDate(date);
        setEventTitle(data.title);
        setInitialEventTitle(data.title);
      })
      .catch((error) => {
        console.error(error);
        if (ignore) return;
        const date =
          recordDate ?? toCalendarDate(record.created_at) ?? today(getLocalTimeZone());
        setEventDate(date);
        setInitialDate(date);
      })
      .finally(() => {
        if (!ignore) setIsLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, [isOpen, record]);

  const isEventTitleTooLong = exceedsTextLength(eventTitle, MAX_EVENT_TITLE_LENGTH);
  const isDateChanged =
    !!initialDate && calendarDateToYmd(eventDate) !== calendarDateToYmd(initialDate);

  // 入力が揃っているか(種別ごとの必須項目)
  let isFilled = false;
  if (eventType === "official") {
    isFilled = officialEventId !== null;
  } else if (eventType === "tonamel") {
    isFilled = tonamelEventId.trim() !== "" && isValidTonamelEventId;
  } else {
    isFilled = eventTitle.trim() !== "" && !isEventTitleTooLong;
  }

  // 記録の内容から実際に変わっているか(変更が無ければ「変更」ボタンは押せない)
  let isChanged = false;
  if (eventType !== currentEventType) {
    isChanged = true;
  } else if (eventType === "official") {
    isChanged = officialEventId !== record.official_event_id || isDateChanged;
  } else if (eventType === "tonamel") {
    isChanged = tonamelEventId.trim() !== record.tonamel_event_id || isDateChanged;
  } else {
    isChanged = eventTitle.trim() !== initialEventTitle.trim() || isDateChanged;
  }

  const canSubmit = !isLoading && !isUpdating && isFilled && isChanged;

  const handleDateChange = useCallback((value: CalendarDate | null) => {
    setEventDate(value == null ? today(getLocalTimeZone()) : value);
    // 開催日が変わるとその日の公式イベント候補も変わるため、選択をリセットする
    setOfficialEventId(null);
  }, []);

  /*
   *
   * 記録のイベント情報を更新する関数
   *
   */
  async function updateRecord(onClose: () => void) {
    setIsUpdating(true);

    const toastId = addToast({
      title: "変更中",
      description: "しばらくお待ちください",
      color: "default",
      promise: new Promise(() => {}),
    });

    const eventDateISO = `${calendarDateToYmd(eventDate)}T00:00:00Z`;

    try {
      // 自由形式は先に自由形式イベント側を確定させ、そのIDを記録へ紐づける。
      let unofficialEventId = "";
      if (eventType === "unofficial") {
        // 既に自由形式イベントを参照しているならそれを更新する。参照先を作り直すと
        // 古いイベントがどこからも参照されないまま残ってしまう。
        // 他の種別から変更した場合は参照先が無いので新規に作成する。
        const editingEventId =
          currentEventType === "unofficial" ? record.unofficial_event_id : "";

        if (editingEventId) {
          const unofficialEventReq: UnofficialEventUpdateRequestType = {
            title: eventTitle.trim(),
            date: eventDateISO,
          };

          const unofficialEventRes = await fetch(
            `/api/unofficial_events/${editingEventId}`,
            {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(unofficialEventReq),
            },
          );

          if (!unofficialEventRes.ok) {
            const t = await unofficialEventRes.json();
            throw new Error(
              `HTTP error: ${unofficialEventRes.status} Message: ${t.message}`,
            );
          }

          const unofficialEvent: UnofficialEventUpdateResponseType =
            await unofficialEventRes.json();
          unofficialEventId = unofficialEvent.id;
        } else {
          const unofficialEventReq: UnofficialEventCreateRequestType = {
            title: eventTitle.trim(),
            date: eventDateISO,
          };

          const unofficialEventRes = await fetch("/api/unofficial_events", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(unofficialEventReq),
          });

          if (!unofficialEventRes.ok) {
            const t = await unofficialEventRes.json();
            throw new Error(
              `HTTP error: ${unofficialEventRes.status} Message: ${t.message}`,
            );
          }

          const unofficialEvent: UnofficialEventCreateResponseType =
            await unofficialEventRes.json();
          unofficialEventId = unofficialEvent.id;
        }
      }

      // 種別をまたぐ変更でも記録に古い参照が残らないよう、イベント関連のIDは
      // 選択中の種別のものだけを入れ、他は必ず空にする。
      const data: RecordUpdateRequestType = {
        official_event_id:
          eventType === "official" && officialEventId !== null ? officialEventId : 0,
        tonamel_event_id: eventType === "tonamel" ? tonamelEventId.trim() : "",
        friend_id: record.friend_id,
        deck_id: record.deck_id,
        deck_code_id: record.deck_code_id,
        private_flg: record.private_flg,
        ignore_stats_flg: record.ignore_stats_flg,
        regulation_id: record.regulation_id,
        // TCGマイスターのURLは公式イベントの記録にのみ紐づく情報のため、
        // 他の種別へ変更した場合は一緒に外す
        tcg_meister_url: eventType === "official" ? record.tcg_meister_url : "",
        memo: record.memo,
        event_date: eventDateISO,
        unofficial_event_id: unofficialEventId,
        // tag_ids は送った集合に置き換わるため、変更しない場合も現在の付与を送り直す。
        tag_ids: (record.tags ?? []).map((tag) => tag.id),
      };

      const res = await fetch(`/api/records/${record.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const t = await res.json();
        throw new Error(`HTTP error: ${res.status} Message: ${t.message}`);
      }

      if (toastId) {
        closeToast(toastId);
      }

      const ret: RecordUpdateResponseType = await res.json();

      addToast({
        title: "変更完了",
        description: "変更しました",
        color: "success",
        timeout: 3000,
      });

      // 自由形式から他の種別へ変えた場合、参照されなくなった自由形式イベントを削除する。
      // 記録の更新が成功してから消すことで、参照が残ったままイベントだけ消える状態を避ける。
      // 記録自体の変更は完了しているため、削除に失敗しても操作は成功として扱う。
      if (
        currentEventType === "unofficial" &&
        eventType !== "unofficial" &&
        record.unofficial_event_id
      ) {
        try {
          const deleteRes = await fetch(
            `/api/unofficial_events/${record.unofficial_event_id}`,
            { method: "DELETE" },
          );

          if (!deleteRes.ok) {
            throw new Error(`HTTP error: ${deleteRes.status}`);
          }
        } catch (error) {
          console.error(error);
        }
      }

      setRecord((prev) => {
        if (!prev) return prev;

        return {
          ...prev,
          official_event_id: ret.official_event_id,
          tonamel_event_id: ret.tonamel_event_id,
          unofficial_event_id: ret.unofficial_event_id,
          tcg_meister_url: ret.tcg_meister_url,
          event_date: ret.event_date,
        };
      });

      triggerNotificationsRefresh();
      onUpdated?.();

      onClose();
    } catch (error) {
      console.error(error);

      const errorMessage =
        error instanceof Error ? error.message : "不明なエラーが発生しました";

      if (toastId) {
        closeToast(toastId);
      }

      addToast({
        title: "変更失敗",
        description: (
          <>
            変更に失敗しました
            <br />
            {errorMessage}
          </>
        ),
        color: "danger",
        timeout: 5000,
      });

      onClose();
    }
  }

  // 開催日の入力欄。公式イベント・自由形式のタブで共通のため1つにまとめる
  // (Tonamel は TonamelEventInput 側が開催日を内包している)。
  const dateField = (
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
        isDisabled={isUpdating}
        value={eventDate}
        onChange={handleDateChange}
      />
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      size="md"
      placement="center"
      // 公式イベントのプレビューやカレンダーで背が高くなるため、はみ出す分は
      // body 内スクロールにしてモーダル全体が画面から出ないようにする
      scrollBehavior="inside"
      isDismissable={false}
      // 更新処理中(isUpdating)はESC・閉じるボタン・onOpenChange経由のクローズを無効化する
      isKeyboardDismissDisabled={isUpdating}
      hideCloseButton={isUpdating}
      onOpenChange={() => {
        if (isUpdating) return;
        onOpenChange();
      }}
      onClose={() => {
        setIsUpdating(false);
        setIsLoading(false);
      }}
      classNames={{
        // イベント種別や選択したイベント名の長さでモーダルの寸法が変わらないよう、
        // 幅は全ブレークポイントで max-w-md に固定する。
        // min-w-0 は、長いイベント名の min-content 幅にモーダルが押し広げられるのを防ぐため
        // (flex アイテムの既定 min-width:auto だと内容の最小幅まで広がってしまう)。
        // scrollBehavior="inside" 既定の max-h(100%-8rem) は特にキーボード表示中に
        // 窮屈なため、余白を 3rem まで縮めてモーダルを大きく使う
        base: "w-full min-w-0 max-w-md sm:max-w-md max-h-[calc(100%-3rem)]",
        closeButton: "text-xl",
      }}
    >
      <ModalContent>
        {(onClose) => (
          <>
            <ModalHeader className="text-lg px-3">イベント情報を変更</ModalHeader>
            <ModalBody className="px-3 py-1">
              {/* イベント種別ごとに入力欄の量が違っても縦幅が変わらないよう、本文の高さを
                  揃える(一番背の高い Tonamel に合わせた値)。ModalBody 自体ではなく内側の
                  ラッパーに与えるのは、ModalBody の flex-1 が高さ指定を打ち消すため。
                  画面が低くて収まらない場合は ModalBody 側でスクロールする。 */}
              <div className="flex min-h-90 flex-col gap-4">
                {isLoading ? (
                  <div className="flex flex-1 items-center justify-center">
                    <Spinner size="lg" />
                  </div>
                ) : (
                  <>
                    {/* イベント種別は記録作成ページと同じタブで切り替える */}
                    <Tabs
                      fullWidth
                      size="md"
                      className="font-bold"
                      // タブリストの既定 overflow-x-scroll は、溢れていなくても
                      // iOS でこの上のスワイプが殺されモーダルがスクロールできなくなるため打ち消す
                      classNames={{ tabList: "overflow-x-visible" }}
                      selectedKey={eventType}
                      isDisabled={isUpdating}
                      onSelectionChange={(key) => setEventType(key as EventType)}
                    >
                      <Tab key="official" title="公式イベント">
                        <div className="flex flex-col gap-4">
                          {dateField}

                          {/* 公式イベント選択は記録作成と同等(WindowedSelect＋アイコン＋プレビュー) */}
                          <div className="flex flex-col gap-1">
                            <span className="text-sm font-medium text-default-700">
                              イベント<span className="text-danger ml-0.5">*</span>
                            </span>
                            <OfficialEventSelect
                              date={calendarDateToYmd(eventDate)}
                              selectedId={officialEventId}
                              onChange={setOfficialEventId}
                              onMenuClose={() => focusSinkRef.current?.focus()}
                            />
                          </div>
                        </div>
                      </Tab>

                      <Tab key="tonamel" title="Tonamel">
                        {/* Tonamelは記録作成と同等の入力(開催日DatePicker＋ID検証＋プレビュー) */}
                        <TonamelEventInput
                          date={eventDate}
                          onDateChange={setEventDate}
                          eventId={tonamelEventId}
                          onEventIdChange={setTonamelEventId}
                          onValidityChange={setIsValidTonamelEventId}
                        />
                      </Tab>

                      <Tab key="unofficial" title="自由形式">
                        <div className="flex flex-col gap-4">
                          {dateField}

                          <Input
                            isRequired
                            type="text"
                            label="イベント名"
                            labelPlacement="outside"
                            placeholder="例）〇〇自主大会"
                            isDisabled={isUpdating}
                            value={eventTitle}
                            onChange={(e) => setEventTitle(e.target.value)}
                            isInvalid={isEventTitleTooLong}
                            errorMessage={`イベント名は${MAX_EVENT_TITLE_LENGTH}文字以内で入力してください`}
                            // iOSズーム対策(入力を16pxに)
                            classNames={{ input: "text-base" }}
                          />
                        </div>
                      </Tab>
                    </Tabs>

                    {/* セレクターを閉じたときのフォーカス受け皿（キーボードを閉じるために使用） */}
                    <div
                      ref={focusSinkRef}
                      tabIndex={-1}
                      className="sr-only"
                      aria-hidden="true"
                    />
                  </>
                )}
              </div>
            </ModalBody>
            <ModalFooter>
              <Button
                color="default"
                variant="solid"
                isDisabled={isUpdating}
                onPress={onClose}
                className="font-bold"
              >
                戻る
              </Button>
              <Button
                color="success"
                variant="solid"
                isDisabled={!canSubmit}
                onPress={() => updateRecord(onClose)}
                className="text-white font-bold"
              >
                変更
              </Button>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
}
