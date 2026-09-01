import { ReactNode } from "react";
import { LuHouse, LuMapPin } from "react-icons/lu";

import { ShopType } from "@app/types/shop";

/*
 * 店舗1件の行。Myジムを扱う画面すべて(ホームのパネル・ユーザページの設定カード・
 * 設定モーダルの登録中/検索結果)で共有する。
 *
 * 同じ店舗が画面ごとに違う形で出ると、どれが同じものを指すのか読み替えが要る。
 * 以前は各所に同じJSXを写していて実際にズレたため(設定カードだけアイコンが無い等)、
 * 一箇所に集約してある。画面ごとに変えてよいのは variant と endContent だけ。
 */

type Props = {
  shop: ShopType;
  // registered: 登録済み(塗り + 家アイコン) / candidate: 検索結果の候補(枠線 + ピン)。
  // 「もう登録してある店」と「これから登録できる店」を地の違いで見分けられるようにする。
  variant?: "registered" | "candidate";
  // 右端に置く操作(解除・追加など)。表示するだけの画面では渡さない。
  endContent?: ReactNode;
};

export default function MyGymShopRow({
  shop,
  variant = "registered",
  endContent,
}: Props) {
  const Icon = variant === "registered" ? LuHouse : LuMapPin;

  return (
    <div
      className={`flex items-center gap-2 rounded-xl px-3 py-2 ${
        variant === "registered" ? "bg-default-100" : "border border-default-200"
      }`}
    >
      <Icon className="h-4 w-4 shrink-0 text-default-400" />
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-xs font-bold text-default-700">{shop.name}</span>
        <span className="truncate text-[0.6875rem] text-default-500">
          {shop.prefecture_name}
          {shop.address}
        </span>
      </div>
      {endContent}
    </div>
  );
}
