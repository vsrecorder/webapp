"use client";

import { Card, CardHeader, CardBody, CardFooter } from "@heroui/react";
import { Chip } from "@heroui/react";
import { Image } from "@heroui/react";
import { Link as HeroLink } from "@heroui/react";

import { LuClock } from "react-icons/lu";

import { OfficialEventListItemType } from "@app/types/official_event";
import { formatJSTDateWithWeekday, formatJSTTime } from "@app/utils/date";
import { formatEventTimeRange } from "@app/utils/cityleagueEventInfo";

type Props = {
  event: OfficialEventListItemType;
};

/*
 * まだ結果の出ていない大会の開催情報。ホームの「本日のシティリーグ結果」で会場カードを
 * タップしたときのモーダルに出す(結果が出ている大会は CityleagueResult を出す)。
 *
 * 上の段は結果モーダル(CityleagueResult)の見出しと同じ見た目にそろえ、
 * 下に開催時間と、公式サイトの大会詳細への導線を置く。
 */
export default function CityleagueEventInfo({ event }: Props) {
  const date = formatJSTDateWithWeekday(event.date);
  const shopName = event.shop_name.replace(/ポケモンカードステーション・/g, "");
  const timeRange = formatEventTimeRange(
    formatJSTTime(event.started_at),
    formatJSTTime(event.ended_at),
  );
  const officialUrl = `https://players.pokemon-card.com/event/detail/${event.id}`;

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
            <HeroLink isExternal href={officialUrl} aria-label="公式サイトで大会の詳細を見る">
              <Image
                alt="シティリーグ"
                src="https://xx8nnpgt.user.webaccel.jp/images/icons/city.png"
                radius="none"
                className="h-9 w-9 object-contain"
              />
            </HeroLink>
          </div>
        </div>
      </CardHeader>

      <CardBody className="px-3 pt-3 pb-1">
        <dl className="flex flex-col gap-2 text-tiny">
          {timeRange && (
            <div className="flex items-start gap-2">
              <dt className="flex shrink-0 items-center gap-1 pt-px font-bold text-default-500">
                <LuClock className="text-sm" aria-hidden />
                時間
              </dt>
              <dd className="font-bold text-default-700">{timeRange}</dd>
            </div>
          )}
        </dl>

        <p className="mt-3 rounded-lg bg-default-100 px-3 py-2 text-tiny text-default-500">
          大会が終わると、ここに入賞者のデッキが表示されます
        </p>
      </CardBody>

      <CardFooter className="pt-1 pb-2">
        <HeroLink
          isExternal
          showAnchorIcon
          underline="always"
          href={officialUrl}
          className="text-xs"
        >
          公式サイトで大会の詳細を見る
        </HeroLink>
      </CardFooter>
    </Card>
  );
}
