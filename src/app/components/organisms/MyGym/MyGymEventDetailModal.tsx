"use client";

import { ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  Button,
  Chip,
  Image,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
} from "@heroui/react";
import {
  LuCalendar,
  LuFilePen,
  LuHouse,
  LuMapPin,
  LuScrollText,
  LuTrophy,
  LuUsers,
} from "react-icons/lu";

import { Modal } from "@app/components/atoms/AppModal";
import { formatEventTime } from "@app/components/organisms/MyGym/myGymHelpers";
import {
  cleanOfficialEventTitle,
  getEventIconUrl,
  getEventVenueLabel,
  shouldShowEnvironmentChip,
} from "@app/components/organisms/Record/officialEventHelpers";

import { OfficialEventType } from "@app/types/official_event";
import { toDateKey } from "@app/utils/calendar";
import { navigateAfterModalClose } from "@app/utils/modalHistory";

type Props = {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  // 閉じるアニメーションの間も中身を描き続けられるよう、開いていたイベントは
  // 呼び出し側が保持する。まだ一度も開いていない間だけ null になる。
  event: OfficialEventType | null;
};

// 上流が「その他」を入れてくる項目(リーグ・レギュレーション)は、
// 実質「区分なし」の意味なので表示しない。
const NO_VALUE_LABEL = "その他";

// 「2026年9月5日(金) 10:00 ~ 12:00」。パネルの日付見出しは月日だけだが、
// こちらは1件だけを見る画面なので年も出す。時刻が未設定のイベントでは日付だけになる。
function formatEventDateTime(event: OfficialEventType): string {
  // date は上流がローカル時刻の0時で返すため、そのまま整形してよい(時刻も同じ規約)
  const date = new Date(event.date).toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short",
  });
  const time = formatEventTime(event);

  return time ? `${date} ${time}` : date;
}

// レギュレーションの表示。スタンダードのときだけ、対象のマーク(H・I・J)を添える。
function formatRegulation(event: OfficialEventType): string {
  const title = event.regulation_title?.trim();
  if (!title || title === NO_VALUE_LABEL) return "";

  const marks = event.standard_regulation_marks?.trim();
  if (title === "スタンダード" && marks) return `${title}（${marks}）`;

  return title;
}

/*
 * 記録作成ページへの導線。
 *
 * 開催日と公式イベントIDを渡すと、公式イベントタブでその日のイベントが
 * 選択済みの状態で開く(/records/create 側が両方を読む)。
 */
function buildRecordCreateHref(event: OfficialEventType): string {
  const params = new URLSearchParams({
    event_type: "official",
    official_event_id: String(event.id),
    event_date: toDateKey(event.date),
  });

  return `/records/create?${params.toString()}`;
}

// 明細1行。何の項目かはアイコンと値の書式で読み取れるため、
// ラベルは読み上げ用にだけ置く(狭い画面でラベル列に幅を割かない)。
// 「定員 32人」のように値そのものが項目名を含む行では label を渡さない。
function DetailRow({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label?: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-2">
      <span className="mt-px shrink-0 text-default-400">{icon}</span>
      {label && <span className="sr-only">{label}</span>}
      <span className="min-w-0 flex-1 text-[0.6875rem] text-default-700 wrap-break-word">
        {value}
      </span>
    </div>
  );
}

export default function MyGymEventDetailModal({ isOpen, onOpenChange, event }: Props) {
  const router = useRouter();

  if (!event) return null;

  const venue = getEventVenueLabel(event);
  const address = event.address?.trim();
  const league = event.league_title?.trim();
  const regulation = formatRegulation(event);
  const iconClassName = "h-3 w-3";

  return (
    <Modal
      size="sm"
      placement="center"
      scrollBehavior="inside"
      isOpen={isOpen}
      onOpenChange={onOpenChange}
    >
      <ModalContent>
        {(onClose) => (
          <>
            <ModalHeader className="px-3 text-medium">イベント詳細</ModalHeader>

            <ModalBody className="flex flex-col gap-3 px-3 py-1">
              {/* 見出し。アイコン・種別チップの語彙は記録詳細(OfficialEventInfo)と揃える */}
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-default-50">
                  <Image
                    alt=""
                    src={getEventIconUrl(event)}
                    radius="none"
                    // max-w-none が無いと、固定幅の枠に入れた img が枠幅へ潰される
                    className="h-8 w-8 max-w-none object-contain"
                  />
                </div>

                <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                  <span className="text-xs font-bold text-default-700 wrap-break-word">
                    {cleanOfficialEventTitle(event.title)}
                  </span>

                  <div className="flex flex-wrap items-center gap-1 empty:hidden">
                    {event.environment_title && shouldShowEnvironmentChip(event) && (
                      <Chip
                        size="sm"
                        variant="flat"
                        color="default"
                        className="h-5 max-w-30"
                        classNames={{ content: "text-[0.625rem] truncate min-w-0" }}
                      >
                        {`『${event.environment_title}』`}
                      </Chip>
                    )}
                    {event.csp_flg && (
                      <Chip
                        size="sm"
                        variant="flat"
                        color="warning"
                        className="h-5 text-[0.625rem] font-bold"
                      >
                        CSP対象
                      </Chip>
                    )}
                  </div>
                </div>
              </div>

              {/* 開催の詳細。上流が値を持たない項目は行ごと出さない */}
              <div className="flex flex-col gap-2 rounded-xl bg-default-50 px-3 py-2.5">
                <DetailRow
                  icon={<LuCalendar className={iconClassName} />}
                  label="開催日時"
                  value={formatEventDateTime(event)}
                />
                {venue && (
                  <DetailRow
                    icon={<LuHouse className={iconClassName} />}
                    label="会場"
                    value={venue}
                  />
                )}
                {address && (
                  <DetailRow
                    icon={<LuMapPin className={iconClassName} />}
                    label="住所"
                    value={address}
                  />
                )}
                {event.capacity > 0 && (
                  <DetailRow
                    icon={<LuUsers className={iconClassName} />}
                    value={`定員 ${event.capacity}人`}
                  />
                )}
                {league && league !== NO_VALUE_LABEL && (
                  <DetailRow
                    icon={<LuTrophy className={iconClassName} />}
                    value={`${league}リーグ`}
                  />
                )}
                {regulation && (
                  <DetailRow
                    icon={<LuScrollText className={iconClassName} />}
                    label="レギュレーション"
                    value={regulation}
                  />
                )}
              </div>
            </ModalBody>

            {/* 閉じるはヘッダーの×と背景タップに任せ、フッターは記録作成だけにする */}
            <ModalFooter className="px-3">
              <Button
                fullWidth
                color="primary"
                variant="solid"
                className="text-sm font-bold"
                startContent={<LuFilePen className="h-4 w-4" />}
                onPress={() => {
                  const href = buildRecordCreateHref(event);

                  onClose();
                  // 閉じるときの履歴の巻き戻しを待ってから移る
                  // (待たずに push すると遷移が打ち消される)
                  navigateAfterModalClose(() => router.push(href));
                }}
              >
                記録を作成する
              </Button>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
}
