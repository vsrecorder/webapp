"use client";

import { Button } from "@heroui/react";
import { LuInfo } from "react-icons/lu";

/*
 * 自由形式の記録作成でイベント名に公式イベントのキーワード(ジムバトル等)が
 * 入力されたときに表示する誘導パネル。
 *
 * 公式イベントに紐づく記録として作成できることを伝え、ボタンで公式イベントの
 * 選択(タブ/イベント種別の切り替え)へ誘導する。
 * RecordCreate(記録作成ページ)と QuickRecordCreate(簡素化フォーム)で共有する。
 */
export default function OfficialEventGuideNote({
  keyword,
  onSelectOfficial,
}: {
  keyword: string;
  onSelectOfficial: () => void;
}) {
  return (
    <div className="flex items-start gap-2 rounded-lg border border-primary/40 bg-primary/10 px-3 py-2.5">
      <LuInfo className="w-4 h-4 text-primary shrink-0 mt-0.5" />
      <div className="flex flex-col items-start gap-1.5 min-w-0">
        <span className="text-tiny">
          「{keyword}」は公式イベントに紐づく記録として作成できます。公式イベントに紐づけると、開催店舗などのイベント情報が自動で記録に設定されます。
        </span>
        <Button
          size="sm"
          color="primary"
          radius="lg"
          className="font-bold"
          onPress={onSelectOfficial}
        >
          公式イベントから選ぶ
        </Button>
      </div>
    </div>
  );
}
