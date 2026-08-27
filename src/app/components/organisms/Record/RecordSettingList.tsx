"use client";

import { Dispatch, SetStateAction, useEffect, useState } from "react";

import {
  Button,
  Card,
  CardBody,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
} from "@heroui/react";

import {
  LuChartNoAxesColumn,
  LuChevronRight,
  LuScrollText,
  LuTag,
  LuTriangleAlert,
} from "react-icons/lu";

import TagChips from "@app/components/molecules/TagChips";
import IgnoreStatsFlgSetting from "@app/components/organisms/Record/IgnoreStatsFlgSetting";
import RegulationSetting from "@app/components/organisms/Record/RegulationSetting";
import RecordTagSetting from "@app/components/organisms/Record/RecordTagSetting";
import {
  ignoreStatsSummary,
  regulationSummary,
} from "@app/components/organisms/Record/recordSettings";

import { RecordGetByIdResponseType } from "@app/types/record";

type SettingKey = "regulation" | "tag" | "ignoreStats";

// 行に並べて出すタグの上限。これを超えたぶんは「+N」に畳む。
const MAX_TAGS_IN_ROW = 2;

const SETTING_LABELS: Record<SettingKey, string> = {
  regulation: "レギュレーション",
  tag: "タグ",
  ignoreStats: "戦績集計",
};

type Props = {
  record: RecordGetByIdResponseType;
  setRecord: Dispatch<SetStateAction<RecordGetByIdResponseType | null>>;
  // 「いま閉じられると困る」状態(シートを開いている / 保存中)を親へ通知する。
  // 親モーダルはこの間、スワイプ・Escでの閉じるを無効化する。
  onBlockCloseChange?: (blocked: boolean) => void;
};

/*
 * 記録情報モーダルの「この記録の設定」。
 *
 * 設定(レギュレーション・タグ・戦績集計)を、ラベルと現在値だけの3行にして一覧で読ませ、
 * 変更は行をタップして開くシートで行う。モーダルは画面の高さが端末に固定されていて、
 * ボードに辿り着く頃には残りが少ない。コントロールを3つとも開いたまま置くと、
 * 「この記録がいまどうなっているか」を読むだけでもスクロールが要る状態だった。
 *
 * 記録詳細ページは縦に余裕があるため、こちらはコントロールを開いたままにしてある
 * (DisplayRecordById)。同じ設定でも画面によって見せ方を変えている。
 */
export default function RecordSettingList({
  record,
  setRecord,
  onBlockCloseChange,
}: Props) {
  const [openKey, setOpenKey] = useState<SettingKey | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  // シートを開いている間と保存中は、親モーダルを閉じさせない。
  useEffect(() => {
    onBlockCloseChange?.(openKey !== null || isUpdating);
  }, [openKey, isUpdating, onBlockCloseChange]);

  const tags = record.tags ?? [];
  const shownTags = tags.slice(0, MAX_TAGS_IN_ROW);
  const restTagCount = tags.length - shownTags.length;

  function closeSheet() {
    // 保存の往復中に閉じると結果が見えないため、終わるまで待たせる。
    if (isUpdating) return;
    setOpenKey(null);
  }

  return (
    <>
      <Card shadow="sm" className="w-full overflow-hidden">
        <CardBody className="p-0">
          <div className="px-4 pt-3.5 pb-2.5">
            <span className="text-xs font-bold tracking-wide text-default-500">
              この記録の設定
            </span>
          </div>

          <SettingRow
            icon={<LuScrollText />}
            label={SETTING_LABELS.regulation}
            onPress={() => setOpenKey("regulation")}
          >
            <span className="truncate text-tiny font-bold">
              {regulationSummary(record)}
            </span>
          </SettingRow>

          <SettingRow
            icon={<LuTag />}
            label={SETTING_LABELS.tag}
            onPress={() => setOpenKey("tag")}
          >
            {tags.length > 0 ? (
              <span className="flex min-w-0 items-center gap-1">
                {/* 行の高さを保つため折り返さない。溢れるぶんは「+N」に寄せる */}
                <TagChips tags={shownTags} nowrap className="min-w-0 overflow-hidden" />
                {restTagCount > 0 && (
                  <span className="shrink-0 text-tiny font-bold text-default-400">
                    +{restTagCount}
                  </span>
                )}
              </span>
            ) : (
              <span className="text-tiny font-bold text-default-400">未設定</span>
            )}
          </SettingRow>

          <SettingRow
            icon={<LuChartNoAxesColumn />}
            label={SETTING_LABELS.ignoreStats}
            onPress={() => setOpenKey("ignoreStats")}
          >
            <span
              className={`flex items-center gap-1 truncate text-tiny font-bold ${
                record.ignore_stats_flg ? "text-warning" : ""
              }`}
            >
              {record.ignore_stats_flg && (
                <LuTriangleAlert className="h-3 w-3 shrink-0" />
              )}
              {ignoreStatsSummary(record)}
            </span>
          </SettingRow>
        </CardBody>
      </Card>

      {/*
        変更用のシート。記録情報モーダルの中から開く入れ子だが、記録の削除・シェアの
        モーダルと同じ扱い(あとから開いたものが上に載る)で成立する。
        親モーダルは isDismissable={false} のため、シート内のタップが親の「外側タップ」
        として拾われる心配はない。
      */}
      <Modal
        isOpen={openKey !== null}
        onOpenChange={closeSheet}
        placement="bottom"
        size="md"
        hideCloseButton
        isDismissable={!isUpdating}
        isKeyboardDismissDisabled={isUpdating}
        className="my-0 mb-0 max-h-[calc(100dvh-104px)] rounded-b-none"
        classNames={{ base: "sm:max-w-full lg:max-w-2xl" }}
      >
        <ModalContent>
          {() => (
            <>
              <ModalHeader className="pb-2 text-medium">
                {openKey ? SETTING_LABELS[openKey] : ""}
              </ModalHeader>

              <ModalBody className="pt-0 pb-2">
                {openKey === "regulation" && (
                  <RegulationSetting
                    record={record}
                    setRecord={setRecord}
                    flat={true}
                    onUpdatingChange={setIsUpdating}
                  />
                )}
                {openKey === "tag" && (
                  <RecordTagSetting
                    record={record}
                    setRecord={setRecord}
                    flat={true}
                    onUpdatingChange={setIsUpdating}
                  />
                )}
                {openKey === "ignoreStats" && (
                  <IgnoreStatsFlgSetting
                    record={record}
                    setRecord={setRecord}
                    flat={true}
                    onUpdatingChange={setIsUpdating}
                  />
                )}
              </ModalBody>

              <ModalFooter className="pt-1">
                {/* 選んだ時点で保存されるので、ここは「閉じる」だけでよい */}
                <Button
                  fullWidth
                  variant="flat"
                  isDisabled={isUpdating}
                  onPress={closeSheet}
                >
                  閉じる
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </>
  );
}

type SettingRowProps = {
  icon: React.ReactNode;
  label: string;
  onPress: () => void;
  children: React.ReactNode;
};

// ラベルと現在値だけの1行。押すと変更用のシートが開く。
function SettingRow({ icon, label, onPress, children }: SettingRowProps) {
  return (
    <button
      type="button"
      onClick={onPress}
      className="flex w-full items-center gap-2.5 border-t border-divider px-4 py-3 text-left transition-colors active:bg-default-100"
    >
      <span className="flex shrink-0 text-sm text-primary">{icon}</span>
      <span className="shrink-0 text-xs font-bold tracking-wide text-default-500">
        {label}
      </span>
      <span className="ml-auto flex min-w-0 items-center justify-end gap-1.5">
        {children}
      </span>
      <LuChevronRight className="shrink-0 text-sm text-default-300" />
    </button>
  );
}
