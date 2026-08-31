"use client";

import { Button } from "@heroui/react";
import { LuInfo } from "react-icons/lu";

/*
 * 自由形式の記録作成でイベント名に公式イベントのキーワード(ジムバトル等)が
 * 入力されたときに表示する誘導パネル。
 *
 * 公式イベントに紐づく記録として作成できることを伝え、ボタンで公式イベントの
 * 選択(タブ/イベント種別の切り替え)へ誘導する。
 * 記録作成ページ・簡素化フォーム・イベント情報の変更モーダルで共有する。
 *
 * 公式イベントを選ぶと、記録には公式イベント側の名称・店舗名が使われ、入力中の
 * イベント名は残らない。切り替えてから気づくと入力し直しになるため、文面で先に伝える。
 *
 * 入力に応じて後から現れる通知のため role="status" を付ける。
 * 付けないと、スクリーンリーダー利用時に出現したこと自体が伝わらない。
 */
export default function OfficialEventGuideNote({
  keyword,
  onSelectOfficial,
}: {
  keyword: string;
  onSelectOfficial: () => void;
}) {
  return (
    <div
      role="status"
      className="flex items-start gap-2 rounded-lg border border-primary/40 bg-primary/10 px-3 py-2.5"
    >
      <LuInfo className="w-4 h-4 text-primary shrink-0 mt-0.5" />
      <div className="flex flex-col items-start gap-1.5 min-w-0">
        <span className="text-tiny">
          この日の「{keyword}」が登録されています。公式イベントに紐づけると、店舗名や開催時間が記録に自動で設定されます（入力中のイベント名の代わりに使われます）。
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
