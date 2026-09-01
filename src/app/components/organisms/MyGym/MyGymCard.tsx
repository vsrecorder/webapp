"use client";

import { useEffect, useState } from "react";
import { Button, Card, CardBody, useDisclosure } from "@heroui/react";
import { LuHouse } from "react-icons/lu";

import FetchError from "@app/components/molecules/FetchError";
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
  // 一度でも取得できたか。取得できていないと上限(limit)が初期値の0のままで、
  // 編集モーダルの isFull(userGyms.length >= limit)が 0 >= 0 で成立してしまう。
  // 登録ボタンが全て無効になり「登録できるのは0件までです(0/0)」と出て、
  // 再読み込みするまで1件も登録できなくなる。登録済みの一覧も空に見えるので、
  // 空状態として見せること自体が誤りになる。取得できるまでは編集へ入れない。
  const [isLoaded, setIsLoaded] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);
  const { isOpen, onOpen, onOpenChange } = useDisclosure();

  const load = async () => {
    try {
      const res = await fetch("/api/users/my_gyms", { cache: "no-store" });
      if (!res.ok) return;

      const data: UserGymGetResponseType = await res.json();
      setUserGyms(data.user_gyms ?? []);
      setLimit(data.limit);
      setIsLoaded(true);
    } catch {
      // 失敗しても、一度取得できていればその内容を保つ(登録・解除後の再取得が
      // 失敗しただけで、開いている編集モーダルまで消さないため)。初回から
      // 取得できていない場合だけ、下で再取得のカードに切り替わる。
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const retry = async () => {
    setIsRetrying(true);
    try {
      await load();
    } finally {
      setIsRetrying(false);
    }
  };

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

  if (!isLoaded) {
    return (
      <FetchError
        message="Myジムの取得に失敗しました"
        onRetry={retry}
        isRetrying={isRetrying}
        compact
      />
    );
  }

  return (
    <>
      <Card className="shadow-md">
        <CardBody className="flex flex-col gap-3 p-4">
          <div className="flex items-center gap-2">
            <LuHouse className="h-4 w-4 shrink-0 text-default-400" />
            <span className="text-[0.5625rem] font-bold uppercase tracking-widest text-default-400">
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
