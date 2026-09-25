"use client";

import { Card, CardHeader, CardBody, CardFooter } from "@heroui/react";
import { ModalContent, ModalHeader, ModalBody } from "@heroui/react";
import { useDisclosure } from "@heroui/react";

import { Chip } from "@heroui/react";

import { Modal } from "@app/components/atoms/AppModal";
import CityleagueEventInfo from "@app/components/organisms/Cityleague/CityleagueEventInfo";
import CityleagueResult from "@app/components/organisms/Cityleague/CityleagueResult";

import { OfficialEventListItemType } from "@app/types/official_event";
import { CityleagueResultType } from "@app/types/cityleague_result";
import { formatJSTDateWithWeekday } from "@app/utils/date";

type Props = {
  event: OfficialEventListItemType;
  results: CityleagueResultType[];
};

export default function CityleagueEventCard({ event, results }: Props) {
  const { isOpen, onOpen, onOpenChange } = useDisclosure();

  // event.idと一致するresultを取得
  const matchedResult = results.find((result) => result.official_event_id === event.id);

  // resultを取得できている場合は大会が終了しており、シティリーグの結果が出ている
  const isFinished = !!matchedResult;

  const date = formatJSTDateWithWeekday(event.date);

  // 受け取ったイベント情報は書き換えない。CityleagueResults が日単位でまとめて取得した
  // 一覧をカード間で共有しているため、書き換えると共有しているオブジェクトを壊す。
  const shopName = event.shop_name.replace(/ポケモンカードステーション・/g, "");

  return (
    <>
      {/* 大会が終わっていれば結果を、まだなら開催情報を出す */}
      <Modal
        isOpen={isOpen}
        size={"md"}
        placement="center"
        //hideCloseButton
        onOpenChange={onOpenChange}
        classNames={{
          base: "sm:max-w-full",
          closeButton: "text-xl",
        }}
      >
        <ModalContent>
          {() => (
            <>
              <ModalHeader className="px-3 pb-1">
                <div className="">
                  {isFinished ? "シティリーグの結果発表！" : "シティリーグの開催情報"}
                </div>
              </ModalHeader>
              <ModalBody className="px-1.5">
                {matchedResult ? (
                  /* このカード自身が event を持っているので、モーダル内での再取得を省く */
                  <CityleagueResult
                    event_result={matchedResult}
                    official_event={event}
                    eagerAllSlides
                  />
                ) : (
                  <CityleagueEventInfo event={event} />
                )}
              </ModalBody>
            </>
          )}
        </ModalContent>
      </Modal>

      <div className="w-full cursor-pointer" onClick={onOpen}>
        {/*
          カードの高さはデータによらず一定にする(ホームの「本日のシティリーグ結果」が
          読み込みのたびに揺れないように)。
          Swiper は並んだカードのうち一番高いものに全体の高さを合わせるため、1枚でも背が伸びると
          パネルごと伸び、骨格(CityleagueEventSkeleton)から実体に替わる瞬間に下が押し下がっていた。
          伸びる原因は2つあった(390px 幅の実測、2026-09-26):
            ・店名の折り返し(26会場中1会場で2行、カード +19px)
            ・「大会終了」チップでチップ列が2行になる(結果の出た日は全会場、+28px)
          店名は1行で省略し(全文は title に残す)、チップ列は1行に収めて長い環境名だけ省略する。
          「大会終了」はシーズン名の行の右端へ置く(店名・チップの行の幅は削らない)。
        */}
        <Card className="pt-1.5 w-full max-w-full">
          <CardHeader className="pt-2.5 pb-1.5 px-3 flex-col items-start">
            <div className="w-full">
              {/* 1行目: シーズン名と、結果が出ていれば右端に「大会終了」。
                  small はインラインのまま div で包む。block にすると親の行の高さ(24px)が
                  効かなくなり 16px に縮んで、骨格(CityleagueEventSkeleton)と合わなくなる。
                  チップ(size="sm")の高さも 24px なので、置いても行の高さは変わらない */}
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 truncate">
                  <small className="font-bold text-tiny text-default-400">{event.title}</small>
                </div>
                {isFinished && (
                  <Chip
                    size="sm"
                    radius="md"
                    classNames={{
                      base: "shrink-0 bg-linear-to-br from-indigo-500 to-pink-500 border-small border-white/50 ",
                      content: "drop-shadow-xs shadow-black text-white",
                    }}
                    variant="shadow"
                  >
                    <small className="font-bold">大会終了</small>
                  </Chip>
                )}
              </div>
              <div className="font-bold text-tiny text-default-500">{date}</div>
              <div className="pt-1 pb-1 truncate font-bold text-[0.8125rem]" title={shopName}>
                {shopName}
              </div>
              <div className="flex flex-nowrap items-start gap-1 overflow-hidden pt-0.5">
                <Chip size="sm" radius="md" variant="bordered" className="shrink-0">
                  <small className="font-bold">{event.prefecture_name}</small>
                </Chip>
                <Chip size="sm" radius="md" variant="bordered" className="shrink-0">
                  <small className="font-bold">{event.league_title}リーグ</small>
                </Chip>
                <Chip
                  size="sm"
                  radius="md"
                  variant="bordered"
                  classNames={{ base: "min-w-0 shrink", content: "truncate" }}
                >
                  <small className="font-bold">『{event.environment_title}』</small>
                </Chip>
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
