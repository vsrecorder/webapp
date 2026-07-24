"use client";

import { useEffect, useState } from "react";
import { Card, CardBody, Button, useDisclosure } from "@heroui/react";
import { LuTriangleAlert, LuIdCard } from "react-icons/lu";

import LinkPlayerIdModal from "@app/components/organisms/User/Modal/LinkPlayerIdModal";
import { UserPlayerType } from "@app/types/user_player";

export default function PlayerLinkCard() {
  const [userPlayer, setUserPlayer] = useState<UserPlayerType | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isFeatureDisabled, setIsFeatureDisabled] = useState(false);
  const { isOpen, onOpen, onOpenChange } = useDisclosure();

  useEffect(() => {
    setIsLoading(true);
    fetch("/api/usersplayers", { cache: "no-store" })
      .then((r) => {
        if (r.status === 503) {
          setIsFeatureDisabled(true);
          return null;
        }
        return r.ok ? r.json() : null;
      })
      .then((data) => {
        setUserPlayer(data);
        setIsLoading(false);
      })
      .catch(() => setIsLoading(false));
  }, []);

  // ダッシュボードの「連携する」リンク(?link_player=1)から遷移してきた場合はモーダルを自動で開く
  useEffect(() => {
    if (isLoading || isFeatureDisabled) return;

    const params = new URLSearchParams(window.location.search);
    if (params.get("link_player") !== "1") return;

    const locked = userPlayer != null && new Date(userPlayer.locked_until) > new Date();
    if (!locked) onOpen();

    params.delete("link_player");
    const query = params.toString();
    window.history.replaceState(null, "", query ? `?${query}` : window.location.pathname);
  }, [isLoading, isFeatureDisabled, userPlayer, onOpen]);

  if (isLoading) {
    return (
      <Card className="shadow-md">
        <CardBody className="p-4 flex flex-col gap-3">
          <div className="w-40 h-3.5 rounded-full bg-default-100 animate-pulse" />
          <div className="w-full h-9 rounded-xl bg-default-100 animate-pulse" />
        </CardBody>
      </Card>
    );
  }

  if (isFeatureDisabled) {
    return (
      <Card className="shadow-md">
        <CardBody className="p-4 flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <LuIdCard className="w-4 h-4 text-default-400 shrink-0" />
            <span className="text-[9px] font-bold text-default-400 uppercase tracking-widest">
              プレイヤーズクラブとの連携
            </span>
          </div>
          <span className="text-xs text-default-500">
            現在、この機能は一時的に停止しております。
          </span>
        </CardBody>
      </Card>
    );
  }

  const isLocked = userPlayer != null && new Date(userPlayer.locked_until) > new Date();

  return (
    <>
      <Card className="shadow-md">
        <CardBody className="p-4 flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <LuIdCard className="w-4 h-4 text-default-400 shrink-0" />
            <span className="text-[9px] font-bold text-default-400 uppercase tracking-widest">
              プレイヤーズクラブとの連携
            </span>
          </div>

          {userPlayer ? (
            <span className="px-3 py-2 rounded-xl bg-default-100 text-xs font-mono text-default-600 break-all">
              プレイヤーID:{userPlayer.player_id}
            </span>
          ) : (
            <span className="text-xs text-default-500">まだ連携されていません</span>
          )}

          {isLocked && userPlayer && (
            <div className="flex items-start justify-center gap-2 text-xs text-warning-600 bg-warning-50 rounded-xl pt-3 pb-3">
              <LuTriangleAlert className="w-4 h-4 shrink-0" />
              <span>
                次に変更できるのは{" "}
                <span className="font-bold">
                  {new Date(userPlayer.locked_until).toLocaleDateString("ja-JP")}
                </span>{" "}
                以降です。
              </span>
            </div>
          )}

          <Button
            color="primary"
            variant="solid"
            size="sm"
            isDisabled={isLocked}
            onPress={onOpen}
            className="font-bold"
          >
            {userPlayer ? "プレイヤーIDを変更" : "プレイヤーIDを連携"}
          </Button>
        </CardBody>
      </Card>

      <LinkPlayerIdModal
        isOpen={isOpen}
        onOpenChange={onOpenChange}
        onLinked={(linked) => setUserPlayer(linked)}
      />
    </>
  );
}
