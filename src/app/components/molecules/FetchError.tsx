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
  /* カードに足すクラス。読み込み中の骨格と高さを揃えたい場合に使う */
  className?: string;
  /*
   * 並べ方。既定の card は「アイコン・文・ボタン」を縦に積む(約138px 要る)。
   * row は横一列に並べ、40px ほどの高さに収める。数値の1行だけを差し替える場所など、
   * 正常時の高さが低くて縦積みが入らないところで使う(FetchErrorBox を参照)。
   * stack は「アイコン＋文」の1行の下にボタンを置き、70px ほどの高さに収める。
   * row では文が長くて狭い幅で省略されてしまう場所で使う。
   */
  variant?: "card" | "row" | "stack";
};

// データ取得に失敗した箇所で共通して表示するエラーカード。
// 成功時のカードUIと同じ質感に揃え、失敗したデータだけを再取得できるようにする。
// 正常時と同じ高さで出したいときは FetchErrorBox で包む。
export default function FetchError({
  message = "データの取得に失敗しました",
  onRetry,
  isRetrying = false,
  compact = false,
  className = "",
  variant = "card",
}: Props) {
  const retryButton = (
    <Button
      size="sm"
      variant="flat"
      radius="lg"
      isLoading={isRetrying}
      onPress={onRetry}
      startContent={!isRetrying && <LuRotateCw className="text-medium" />}
      className={variant !== "card" ? "h-7 shrink-0 px-3 text-xs" : ""}
    >
      再読み込み
    </Button>
  );

  if (variant === "row") {
    return (
      <Card shadow="sm" className={`w-full border border-default-200 ${className}`}>
        <CardBody className="flex h-full flex-row items-center justify-center gap-2 px-3 py-2">
          <LuTriangleAlert className="shrink-0 text-medium text-default-400" />
          <p className="truncate text-tiny text-default-500">{message}</p>
          {retryButton}
        </CardBody>
      </Card>
    );
  }

  if (variant === "stack") {
    return (
      <Card shadow="sm" className={`w-full border border-default-200 ${className}`}>
        <CardBody className="flex h-full flex-col items-center justify-center gap-1.5 px-3 py-2">
          <div className="flex max-w-full items-center gap-2">
            <LuTriangleAlert className="shrink-0 text-medium text-default-400" />
            <p className="truncate text-tiny text-default-500">{message}</p>
          </div>
          {retryButton}
        </CardBody>
      </Card>
    );
  }

  return (
    <Card shadow="sm" className={`w-full border border-default-200 ${className}`}>
      <CardBody
        className={`flex h-full flex-col items-center justify-center gap-3 text-center ${
          compact ? "py-5 px-3" : "py-8 px-4"
        }`}
      >
        <LuTriangleAlert className="text-2xl text-default-400" />
        <p className="text-tiny text-default-500">{message}</p>
        {retryButton}
      </CardBody>
    </Card>
  );
}
