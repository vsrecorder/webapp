"use client";

import { Card, CardHeader, CardBody, CardFooter } from "@heroui/react";
import { Modal, ModalContent, ModalHeader, ModalBody } from "@heroui/react";
import { useDisclosure } from "@heroui/react";

import { Chip } from "@heroui/react";
import { Image } from "@heroui/react";

import CityleagueResult from "@app/components/organisms/Cityleague/CityleagueResult";

import { OfficialEventGetByIdResponseType } from "@app/types/official_event";
import { CityleagueResultType } from "@app/types/cityleague_result";

type Props = {
  event: OfficialEventGetByIdResponseType;
  results: CityleagueResultType[];
};

export default function CityleagueEventCard({ event, results }: Props) {
  const { isOpen, onOpen, onOpenChange } = useDisclosure();

  // event.idと一致するresultを取得
  const matchedResult = results.find((result) => result.official_event_id === event.id);

  // resultを取得できている場合は大会が終了しており、シティリーグの結果が出ている
  const isFinished = !!matchedResult;

  const date = new Date(event.date).toLocaleString("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short",
  });

  return (
    <>
      {isFinished && (
        <Modal
          isOpen={isOpen}
          size={"md"}
          placement="center"
          //hideCloseButton
          onOpenChange={onOpenChange}
          classNames={{
            base: "sm:max-w-full",
            closeButton: "text-2xl",
          }}
        >
          <ModalContent>
            {() => (
              <>
                <ModalHeader className="px-3 pb-1">
                  <div className="">シティリーグの結果発表！</div>
                </ModalHeader>
                <ModalBody className="px-1.5">
                  <CityleagueResult event_result={matchedResult} />
                </ModalBody>
              </>
            )}
          </ModalContent>
        </Modal>
      )}

      <div className="w-full" onClick={onOpen}>
        <Card className="pt-3 w-full max-w-full">
          <CardHeader className="pt-2.5 pb-1.5 px-3 flex-col items-start">
            {/* 両端配置 */}
            <div className="flex items-center justify-between w-full">
              <div className="w-full">
                <small className="font-bold text-default-400 w-full truncate block">
                  {event.title}
                </small>
                <div className="font-bold text-tiny text-default-500">{date}</div>
                <div className="pt-1 pb-1 font-bold text-small">{event.shop_name}</div>
                <div>
                  <div className="flex flex-wrap items-start gap-1 pt-0.5">
                    <Chip size="sm" radius="md" variant="bordered">
                      <small className="font-bold">{event.prefecture_name}</small>
                    </Chip>
                    <Chip size="sm" radius="md" variant="bordered">
                      <small className="font-bold">{event.league_title}リーグ</small>
                    </Chip>
                    <Chip size="sm" radius="md" variant="bordered">
                      <small className="font-bold">『{event.environment_title}』</small>
                    </Chip>
                    {isFinished && (
                      <Chip
                        size="sm"
                        radius="md"
                        classNames={{
                          base: "bg-linear-to-br from-indigo-500 to-pink-500 border-small border-white/50 ",
                          content: "drop-shadow-xs shadow-black text-white",
                        }}
                        variant="shadow"
                      >
                        <small className="font-bold">大会終了</small>
                      </Chip>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardBody className="px-0 py-1"></CardBody>
          <CardFooter className="pt-1 pb-2"></CardFooter>
        </Card>
      </div>
    </>
  );
}
