"use client";

import { Card, CardBody, Button } from "@heroui/react";
import { LuTriangleAlert, LuRotateCw } from "react-icons/lu";

type Props = {
  /* 表示メッセージ（省略時は既定文言） */
  message?: string;
  /* 押下時に「そのデータだけ」再取得するローダ関数 */
  onRetry: () => void;
  /* 再取得中はボタンをローディング表示にする */
  isRetrying?: boolean;
  /* カード内に埋め込む場合など、余白を詰める */
  compact?: boolean;
};

// データ取得に失敗した箇所で共通して表示するエラーカード。
// 成功時のカードUIと同じ質感に揃え、失敗したデータだけを再取得できるようにする。
export default function FetchError({
  message = "データの取得に失敗しました",
  onRetry,
  isRetrying = false,
  compact = false,
}: Props) {
  return (
    <Card shadow="sm" className="w-full border border-default-200">
      <CardBody
        className={`flex flex-col items-center justify-center gap-3 text-center ${
          compact ? "py-5 px-3" : "py-8 px-4"
        }`}
      >
        <LuTriangleAlert className="text-2xl text-default-400" />
        <p className="text-tiny text-default-500">{message}</p>
        <Button
          size="sm"
          variant="flat"
          radius="lg"
          isLoading={isRetrying}
          onPress={onRetry}
          startContent={!isRetrying && <LuRotateCw className="text-medium" />}
        >
          再読み込み
        </Button>
      </CardBody>
    </Card>
  );
}
