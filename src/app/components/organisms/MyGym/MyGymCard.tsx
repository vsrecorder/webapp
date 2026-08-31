"use client";

import { useEffect, useState } from "react";
import { Button, Card, CardBody, useDisclosure } from "@heroui/react";
import { LuHouse } from "react-icons/lu";

import MyGymEditModal from "@app/components/organisms/MyGym/MyGymEditModal";
import MyGymShopRow from "@app/components/organisms/MyGym/MyGymShopRow";

import { UserGymGetResponseType, UserGymType } from "@app/types/user_gym";

/*
 * ユーザページ(/users)の設定カード。
 *
 * 登録・解除のUIはホームのパネル(MyGymPanel)と同じモーダルを使う。ここは
 * 「今なにが登録されているか」を見せて、そこから編集へ入れるだけに留める。
 * イベント一覧を出さないのは、予定を見る場所はホームに1つあれば足りるため。
 */
export default function MyGymCard() {
  const [userGyms, setUserGyms] = useState<UserGymType[]>([]);
  const [limit, setLimit] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const { isOpen, onOpen, onOpenChange } = useDisclosure();

  const load = async () => {
    try {
      const res = await fetch("/api/users/my_gyms", { cache: "no-store" });
      if (!res.ok) return;

      const data: UserGymGetResponseType = await res.json();
      setUserGyms(data.user_gyms ?? []);
      setLimit(data.limit);
    } catch {
      // 取得できなくてもカードは出す(空状態として見える)
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  // 読み込み中のスケルトン。実カードと同じ「見出し行＋本文＋ボタン」の3段構成で組む。
  if (isLoading) {
    return (
      <Card className="shadow-md">
        <CardBody className="flex flex-col gap-3 p-4">
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 shrink-0 animate-pulse rounded-md bg-default-100" />
            <div className="h-2.5 w-24 animate-pulse rounded-full bg-default-100" />
          </div>
          <div className="flex h-4 items-center">
            <div className="h-3 w-40 animate-pulse rounded-full bg-default-100" />
          </div>
          <div className="h-8 w-full animate-pulse rounded-lg bg-default-100" />
        </CardBody>
      </Card>
    );
  }

  return (
    <>
      <Card className="shadow-md">
        <CardBody className="flex flex-col gap-3 p-4">
          <div className="flex items-center gap-2">
            <LuHouse className="h-4 w-4 shrink-0 text-default-400" />
            <span className="text-[9px] font-bold uppercase tracking-widest text-default-400">
              Myジム
            </span>
          </div>

          {userGyms.length === 0 ? (
            <span className="text-xs text-default-500">まだ登録されていません</span>
          ) : (
            <div className="flex flex-col gap-1.5">
              {userGyms.map((userGym) => (
                <MyGymShopRow key={userGym.shop.id} shop={userGym.shop} />
              ))}
            </div>
          )}

          <Button
            size="sm"
            variant="flat"
            color="primary"
            className="w-full font-bold"
            onPress={onOpen}
          >
            {userGyms.length === 0 ? "Myジムを登録する" : "Myジムを編集する"}
          </Button>
        </CardBody>
      </Card>

      <MyGymEditModal
        isOpen={isOpen}
        onOpenChange={onOpenChange}
        userGyms={userGyms}
        limit={limit}
        onChanged={load}
      />
    </>
  );
}
