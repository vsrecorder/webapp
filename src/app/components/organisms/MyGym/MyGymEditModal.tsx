"use client";

import { useEffect, useRef, useState } from "react";
import {
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Input,
  Spinner,
  addToast,
} from "@heroui/react";
import { LuPlus, LuSearch, LuTrash2 } from "react-icons/lu";

import { Modal } from "@app/components/atoms/AppModal";
import MyGymShopRow from "@app/components/organisms/MyGym/MyGymShopRow";

import { ShopGetResponseType, ShopType } from "@app/types/shop";
import { scrollToTopAfterKeyboard } from "@app/utils/keyboard";
import { UserGymType } from "@app/types/user_gym";

type Props = {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  userGyms: UserGymType[];
  // 上限(上流の usecase.MaxUserGymsPerUser)。枠の数はサーバ側の値に従う。
  limit: number;
  // 登録・解除が成功したときの再取得。呼び出し側がSWRのキャッシュを更新する。
  onChanged: () => void;
};

// 検索は入力のたびには投げず、打ち終わりを待ってから1回だけ投げる。
const SEARCH_DEBOUNCE_MS = 400;

export default function MyGymEditModal({
  isOpen,
  onOpenChange,
  userGyms,
  limit,
  onChanged,
}: Props) {
  const [keyword, setKeyword] = useState("");
  const [shops, setShops] = useState<ShopType[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  // 送信中の店舗ID(登録・解除)。二重送信を防ぎ、押した行だけをローディングにする。
  const [pendingShopId, setPendingShopId] = useState<number | null>(null);

  // 検索の世代。古い応答が新しい応答を上書きしないように使う。
  const searchSeq = useRef(0);
  // 入力を終えたときにフォーカスを引き受ける要素
  // (フォーカストラップを満たしつつキーボードを閉じるために使う)
  const focusSinkRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    setKeyword("");
    setShops([]);
    setHasSearched(false);
    setPendingShopId(null);
  }, [isOpen]);

  // キーワードが変わったら検索し直す。空なら検索しない
  // (上流はキーワードの無いリクエストを400で弾く)。
  useEffect(() => {
    if (!isOpen) return;

    const trimmed = keyword.trim();
    if (!trimmed) {
      setShops([]);
      setHasSearched(false);
      setIsSearching(false);
      return;
    }

    const seq = ++searchSeq.current;
    setIsSearching(true);

    const timer = setTimeout(async () => {
      const params = new URLSearchParams({ keyword: trimmed });

      try {
        const res = await fetch(`/api/shops?${params.toString()}`, { cache: "no-store" });
        if (!res.ok) throw new Error("failed to search shops");

        const data: ShopGetResponseType = await res.json();
        if (seq !== searchSeq.current) return;

        setShops(data.shops ?? []);
      } catch {
        if (seq !== searchSeq.current) return;
        setShops([]);
      } finally {
        if (seq === searchSeq.current) {
          setIsSearching(false);
          setHasSearched(true);
        }
      }
    }, SEARCH_DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [isOpen, keyword]);

  const registeredIds = new Set(userGyms.map((userGym) => userGym.shop.id));
  const isFull = userGyms.length >= limit;

  const handleRegister = async (shop: ShopType) => {
    setPendingShopId(shop.id);

    try {
      const res = await fetch("/api/users/my_gyms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shop_id: shop.id }),
      });

      if (!res.ok) {
        // 上流は「上限に達した」と「その店舗は登録済み」の両方を409で返すため、
        // 本文で見分ける。登録済みは、一覧を取り直す前に押したときなどに起こりうる
        // (登録済みの店舗はボタンを無効にしているが、同時操作までは防げない)。
        if (res.status === 409) {
          const body = await res.json().catch(() => null);
          const message = typeof body?.message === "string" ? body.message : "";

          if (message.includes("already exists")) {
            throw new Error("この店舗はすでにMyジムに登録されています。");
          }

          throw new Error(
            `Myジムは${limit}件までです。登録済みの店舗を解除してから追加してください。`,
          );
        }
        if (res.status === 404) {
          throw new Error("この店舗は登録できませんでした。時間をおいてお試しください。");
        }
        throw new Error(`登録に失敗しました: ${res.status}`);
      }

      addToast({
        title: "Myジムに登録しました",
        description: shop.name,
        color: "success",
        timeout: 3000,
      });

      onChanged();
    } catch (error) {
      addToast({
        title: "登録に失敗しました",
        description: error instanceof Error ? error.message : "不明なエラー",
        color: "danger",
        timeout: 8000,
      });
    } finally {
      setPendingShopId(null);
    }
  };

  const handleDelete = async (userGym: UserGymType) => {
    setPendingShopId(userGym.shop.id);

    try {
      const res = await fetch(`/api/users/my_gyms/${userGym.shop.id}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error(`解除に失敗しました: ${res.status}`);

      addToast({
        title: "Myジムを解除しました",
        description: userGym.shop.name,
        color: "success",
        timeout: 3000,
      });

      onChanged();
    } catch (error) {
      addToast({
        title: "解除に失敗しました",
        description: error instanceof Error ? error.message : "不明なエラー",
        color: "danger",
        timeout: 8000,
      });
    } finally {
      setPendingShopId(null);
    }
  };

  return (
    <Modal
      size="sm"
      placement="center"
      scrollBehavior="inside"
      isOpen={isOpen}
      isDismissable={pendingShopId === null}
      hideCloseButton={pendingShopId !== null}
      onOpenChange={(open) => {
        if (pendingShopId !== null) return;
        onOpenChange(open);
      }}
    >
      <ModalContent>
        {(onClose) => (
          <>
            <ModalHeader className="flex flex-col gap-1 px-3">
              <span>Myジムの設定</span>
              <span className="text-xs font-normal text-default-500">
                よく行く店舗を{limit}件まで登録できます（{userGyms.length}/{limit}）
              </span>
            </ModalHeader>

            <ModalBody
              // キーボード表示時にどこをスクロールさせるかを scrollToTopAfterKeyboard へ伝える。
              // 指定が無いと overflow-y が auto に計算された別の要素を誤って掴むことがある。
              data-keyboard-scroll-container
              className="px-3 py-1 flex flex-col gap-4"
            >
              {/* 登録済みの枠 */}
              <div className="flex flex-col gap-2">
                <span className="text-[9px] font-bold text-default-400 uppercase tracking-widest">
                  登録中のMyジム
                </span>

                {userGyms.length === 0 ? (
                  <span className="text-xs text-default-500">まだ登録されていません</span>
                ) : (
                  <div className="flex flex-col gap-1.5">
                    {userGyms.map((userGym) => (
                      <MyGymShopRow
                        key={userGym.shop.id}
                        shop={userGym.shop}
                        endContent={
                          <Button
                            isIconOnly
                            size="sm"
                            variant="light"
                            color="danger"
                            aria-label={`${userGym.shop.name}を解除する`}
                            isLoading={pendingShopId === userGym.shop.id}
                            isDisabled={pendingShopId !== null}
                            onPress={() => handleDelete(userGym)}
                          >
                            <LuTrash2 className="w-4 h-4" />
                          </Button>
                        }
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* 店舗の検索 */}
              <div data-my-gym-search className="flex flex-col gap-2">
                <span className="text-[9px] font-bold text-default-400 uppercase tracking-widest">
                  店舗を探す
                </span>

                <Input
                  size="sm"
                  name="my-gym-keyword"
                  value={keyword}
                  onValueChange={setKeyword}
                  placeholder="店舗名・住所で検索（例）町田"
                  startContent={<LuSearch className="w-4 h-4 text-default-400" />}
                  isClearable
                  onClear={() => setKeyword("")}
                  // 【Android】キーボードが出ると react-aria は入力欄が「見える最小限」しか
                  // スクロールしないため、入力欄がキーボードのすぐ上に貼り付き、その下に出る
                  // 検索結果がキーボードの裏に隠れる。検索ブロックごと可視領域の上端へ
                  // 引き上げて、結果まで見えるようにする(CreateMatchModal の履歴候補と同じ)。
                  onFocus={(e) =>
                    scrollToTopAfterKeyboard(
                      e.currentTarget.closest("[data-my-gym-search]"),
                    )
                  }
                  // 入力を終えた合図の Enter で、モバイルのソフトウェアキーボードを引っ込める。
                  // 検索は入力のたびに走っているので、Enter は「打ち終わった」以上の意味を持たない。
                  //
                  // isComposing 中(IMEの変換候補を確定する Enter)では閉じない。ここで閉じると
                  // 「まちだ」を変換した瞬間にキーボードが消え、続きを打てなくなる。
                  //
                  // blur() ではなくモーダル内の受け皿へフォーカスを移すのは、モーダルが
                  // フォーカストラップを張っているため。blur で外へ抜けると、トラップが
                  // モーダル内へフォーカスを戻し、入力欄が再フォーカスされてキーボードが
                  // 開き直してしまう(Android で顕著)。同じ理由で EditEventInfoModal も
                  // セレクターを閉じるときに受け皿へ逃がしている。
                  onKeyDown={(e) => {
                    if (e.key !== "Enter" || e.nativeEvent.isComposing) return;

                    e.preventDefault();
                    focusSinkRef.current?.focus();
                  }}
                />

                {isSearching ? (
                  <div className="flex justify-center py-4">
                    <Spinner size="sm" />
                  </div>
                ) : shops.length > 0 ? (
                  <div className="flex flex-col gap-1.5">
                    {shops.map((shop) => {
                      const isRegistered = registeredIds.has(shop.id);

                      return (
                        <MyGymShopRow
                          key={shop.id}
                          shop={shop}
                          variant="candidate"
                          endContent={
                            <Button
                              isIconOnly
                              size="sm"
                              variant="flat"
                              color="primary"
                              aria-label={`${shop.name}をMyジムに登録する`}
                              isLoading={pendingShopId === shop.id}
                              // 登録済みと、上限に達しているときは押せない
                              isDisabled={
                                isRegistered || isFull || pendingShopId !== null
                              }
                              onPress={() => handleRegister(shop)}
                            >
                              <LuPlus className="w-4 h-4" />
                            </Button>
                          }
                        />
                      );
                    })}
                  </div>
                ) : hasSearched ? (
                  <span className="py-2 text-center text-xs text-default-500">
                    該当する店舗が見つかりません
                  </span>
                ) : (
                  <span className="py-2 text-center text-xs text-default-500">
                    店舗名や住所の一部を入力してください
                  </span>
                )}

                {/* 入力を終えたときのフォーカス受け皿(キーボードを閉じるために使う) */}
                <div
                  ref={focusSinkRef}
                  tabIndex={-1}
                  className="sr-only"
                  aria-hidden="true"
                />

                {isFull && (
                  <span className="text-[11px] text-warning">
                    登録できるのは{limit}
                    件までです。
                    <br />
                    追加するには、登録中のMyジムを解除してください。
                  </span>
                )}
              </div>
            </ModalBody>

            <ModalFooter>
              <Button
                color="primary"
                variant="solid"
                className="font-bold"
                isDisabled={pendingShopId !== null}
                onPress={onClose}
              >
                閉じる
              </Button>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
}
