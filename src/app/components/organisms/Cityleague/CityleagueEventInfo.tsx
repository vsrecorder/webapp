"use client";

import { Card, CardHeader, CardBody } from "@heroui/react";
import { Chip } from "@heroui/react";
import { Image } from "@heroui/react";

import { LuClock } from "react-icons/lu";

import { OfficialEventListItemType } from "@app/types/official_event";
import { formatJSTDateWithWeekday, formatJSTTime } from "@app/utils/date";

type Props = {
  event: OfficialEventListItemType;
};

/*
 * まだ結果の出ていない大会の開催情報。ホームの「本日のシティリーグ結果」で会場カードを
 * タップしたときのモーダルに出す(結果が出ている大会は CityleagueResult を出す)。
 *
 * 上の段は結果モーダル(CityleagueResult)の見出しと同じ見た目にそろえ、下に大会開始時間を置く。
 * 公式サイトへの導線(アイコンのリンクも含む)は置かない。
 */
export default function CityleagueEventInfo({ event }: Props) {
  const date = formatJSTDateWithWeekday(event.date);
  const shopName = event.shop_name.replace(/ポケモンカードステーション・/g, "");
  // 終了時刻は出さない(上流は未設定だと開催日 0:00 を返し、29会場中16会場がそうだった)
  const startTime = formatJSTTime(event.started_at);

  return (
    <Card className="pt-3 w-full">
      <CardHeader className="pt-0 pb-0 px-3 flex-col items-start gap-0.5">
        {/* 両端配置 */}
        <div className="flex items-center justify-between w-full">
          <div>
            <small className="font-bold text-default-400">{event.title}</small>
            <div className="font-bold text-tiny text-default-500">{date}</div>
            <div className="pt-1 pb-1 font-bold text-[0.8125rem]">{shopName}</div>
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
            </div>
          </div>

          <div className="z-0 shrink-0 translate-x-1 -translate-y-5">
            <Image
              alt="シティリーグ"
              src="https://xx8nnpgt.user.webaccel.jp/images/icons/city.png"
              radius="none"
              className="h-9 w-9 object-contain"
            />
          </div>
        </div>
      </CardHeader>

      <CardBody className="px-3 pt-3 pb-3">
        <dl className="flex flex-col gap-2 text-tiny">
          {startTime && (
            <div className="flex items-start gap-2">
              <dt className="flex shrink-0 items-center gap-1 pt-px font-bold text-default-500">
                <LuClock className="text-sm" aria-hidden />
                大会開始時間
              </dt>
              <dd className="font-bold text-default-700">{startTime}</dd>
            </div>
          )}
        </dl>

        <p className="mt-3 rounded-lg bg-default-100 px-3 py-2 text-tiny text-default-500">
          大会が終わると、ここに入賞者のデッキが表示されます
        </p>
      </CardBody>

    </Card>
  );
}
