"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import NextLink from "next/link";

import { Card, CardHeader, CardBody, CardFooter } from "@heroui/react";
import { Chip } from "@heroui/react";
import { Link as HeroLink } from "@heroui/react";
import { Image } from "@heroui/react";

//import { A11y, Autoplay, Navigation, Pagination, Scrollbar } from "swiper/modules";
import { A11y, Pagination } from "swiper/modules";
import { Swiper, SwiperSlide } from "swiper/react";
import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";
import "swiper/css/scrollbar";

import CityleagueResultCard from "@app/components/organisms/Cityleague/CityleagueResultCard";
import { CityleagueResultSkeleton } from "@app/components/organisms/Cityleague/Skeleton/CityleagueResultSkeleton";
import FetchError from "@app/components/molecules/FetchError";

import { CityleagueResultType } from "@app/types/cityleague_result";
import {
  OfficialEventGetByIdResponseType,
  OfficialEventListItemType,
} from "@app/types/official_event";
import { formatJSTDateWithWeekday } from "@app/utils/date";

async function fetchOfficialEventById(id: number) {
  try {
    const res = await fetch(`/api/official_events/${id}`, {
      cache: "no-store",
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    });

    if (!res.ok) {
      throw new Error("Failed to fetch");
    }

    const ret: OfficialEventGetByIdResponseType = await res.json();

    return ret;
  } catch (error) {
    throw error;
  }
}

type Props = {
  event_result: CityleagueResultType;
  /*
   * 呼び出し側が既に公式イベント情報を持っている場合に渡す。渡されたときは
   * /api/official_events/{id} の個別フェッチを行わない。一覧ページでは
   * カードごとに個別フェッチするとN+1(1日分で数十本)になるため、
   * CityleagueResults 側が日単位の一覧APIでまとめて取得して配ってくる。
   */
  official_event?: OfficialEventListItemType;
  /*
   * 入賞スライドを最初から全部描くか。
   *
   * 一覧では画面に近づくまで2位以下を描かない(下の showAllSlides)。一方モーダルのように
   * 「開いた時点で見るために出すもの」では待つ意味が無く、ページネーションの点の数が
   * 開いた直後に 1 個から 8 個へ変わって見えてしまう。そこでは最初から全部描く。
   */
  eagerAllSlides?: boolean;
};

/*
 * 入賞カードのうち、最初から描くのは何枚か。
 *
 * Swiper は1枚目(優勝)しか画面に映さないので、初期表示に要るのはここまで。
 */
const EAGER_SLIDE_COUNT = 1;

// 何ピクセル手前で残りのスライドを用意し始めるか。スクロールで近づいてから
// 描き始めても間に合うよう、画面の高さ程度は先回りする。
const SLIDE_PRELOAD_MARGIN = "600px";

export default function CityleagueResult({
  event_result,
  official_event,
  eagerAllSlides = false,
}: Props) {
  const [fetchedEvent, setFetchedEvent] = useState<OfficialEventGetByIdResponseType | null>(null);
  const [loading, setLoading] = useState(!official_event);
  const [error, setError] = useState(false);

  // 公式イベント情報だけを取得（失敗時のリロードから再利用）
  const loadEvent = useCallback(async () => {
    if (!event_result.official_event_id) {
      setLoading(false);
      return;
    }

    setError(false);
    setLoading(true);

    try {
      const data = await fetchOfficialEventById(event_result.official_event_id);
      setFetchedEvent(data);
    } catch (err) {
      console.log(err);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [event_result.official_event_id]);

  useEffect(() => {
    // 親からイベント情報が渡されていれば取得は不要
    if (official_event) return;
    loadEvent();
  }, [official_event, loadEvent]);

  const event = official_event ?? fetchedEvent;

  /*
   * 2位以下のスライドを描くかどうか。カードが画面に近づいてから true にする。
   *
   * 1イベントに最大8人分の入賞カードが入り、1日ぶんの一覧では 21×8=168 枚になる。
   * 全部を最初から描くと DOM が 5,072 ノードに膨らみ、ハイドレーションが終わって
   * 操作できるようになるまで 3.9 秒かかっていた(本番ビルド・CPU4倍の実測)。
   * 最初に見えるのは各カードの優勝ぶん1枚だけなので、残りは近づいてから足す
   * (実測: ハイドレーション完了 3.9秒 → 1.6秒、DOM 5,072 → 2,257、HTML 987KB → 529KB)。
   *
   * 初期値は呼び出し側と揃うので(サーバ・ブラウザとも eagerAllSlides)、
   * ハイドレーションの不一致は起きない。
   */
  const [showAllSlides, setShowAllSlides] = useState(eagerAllSlides);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (showAllSlides) return;

    const el = cardRef.current;
    if (!el) return;

    // 対応していない環境では出し惜しみせず全部描く(表示が欠けるより遅い方がまし)
    if (typeof IntersectionObserver === "undefined") {
      setShowAllSlides(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;

        setShowAllSlides(true);
        observer.disconnect();
      },
      { rootMargin: SLIDE_PRELOAD_MARGIN },
    );

    observer.observe(el);

    return () => observer.disconnect();
  }, [showAllSlides]);

  const isNew = (date: Date) => {
    const now = new Date();

    const diffInMs = now.getTime() - date.getTime();
    const diffInHours = diffInMs / (1000 * 60 * 60);

    return diffInHours <= 36;
  };

  if (loading) {
    return <CityleagueResultSkeleton />;
  }

  if (error) {
    return <FetchError onRetry={loadEvent} compact />;
  }

  if (!event) {
    return;
  }

  const date = formatJSTDateWithWeekday(event.date);

  // 9位以下は一覧に載せない(個別ページで見せる)。近づくまでは先頭だけ描く
  const rankedResults = event_result.results.filter((result) => result.rank < 9);
  const slideResults = showAllSlides
    ? rankedResults
    : rankedResults.slice(0, EAGER_SLIDE_COUNT);

  // 受け取ったイベント情報は書き換えない。CityleagueResults が日単位でまとめて取得した
  // 一覧をカード間で共有しているため、書き換えると共有しているオブジェクトを壊す。
  const shopName = event.shop_name.replace(/ポケモンカードステーション・/g, "");

  return (
    <div className="" ref={cardRef}>
      <Card className="pt-3 w-full">
        <CardHeader className="pt-0 pb-0 px-3 flex-col items-start gap-0.5">
          {/* 両端配置 */}
          <div className="flex items-center justify-between w-full">
            <div>
              <small className="font-bold text-default-400">{event.title}</small>
              <div className="font-bold text-tiny text-default-500">{date}</div>
              <div className="pt-1 pb-1 font-bold text-[0.8125rem]">{shopName}</div>
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
                  {isNew(new Date(event.date)) && (
                    <Chip
                      size="sm"
                      radius="md"
                      classNames={{
                        base: "bg-linear-to-br from-indigo-500 to-pink-500 border-small border-white/50 ",
                        content: "drop-shadow-xs shadow-black text-white",
                      }}
                      variant="shadow"
                    >
                      <small className="font-bold">New</small>
                    </Chip>
                  )}
                </div>
              </div>
            </div>

            <div className="z-0 shrink-0 translate-x-1 -translate-y-5">
              <HeroLink
                isExternal
                href={`https://players.pokemon-card.com/event/detail/${event.id}/result`}
              >
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
        <CardBody className="px-0 py-1">
          <div>
            <Swiper
              modules={[A11y, Pagination]}
              slidesPerView={"auto"}
              centeredSlides={true}
              loop={false}
              speed={500}
              pagination={{
                clickable: true,
              }}
            >
              {slideResults.map((result, index) => (
                <SwiperSlide key={index} className="px-2 pt-2 pb-10">
                  <CityleagueResultCard result={result} date={event_result.date} />
                </SwiperSlide>
              ))}
            </Swiper>
          </div>
        </CardBody>
        <CardFooter className="pt-1 pb-2">
          <div>
            {/*
              as={NextLink}: 素の<a>のままだと詳細ページへの遷移がフルページロードになり、
              戻るときもブラウザがドキュメントを取り直す(実測で1回の「戻る」につき
              180件前後のリクエストが再発行される)。クライアント遷移にすることで
              戻りはNext.jsのルーターが処理し、ブラウザのドキュメントキャッシュを引かない。
            */}
            <HeroLink
              as={NextLink}
              showAnchorIcon
              underline="always"
              href={`/cityleague_results/${event.id}`}
              className="text-xs"
              onPress={() => {
                // 個別ページから戻ってきたとき、対象カードまで自動スクロールするための保存
                sessionStorage.setItem(
                  "cityleagueResultScrollToId",
                  String(event_result.official_event_id),
                );
                sessionStorage.setItem(
                  "cityleagueResultScrollToLeagueType",
                  String(event_result.league_type),
                );
              }}
            >
              <span>このイベント結果の詳細ページを見る</span>
            </HeroLink>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
