"use client";

import { useEffect, useState } from "react";

import { Card, CardHeader, CardBody, CardFooter } from "@heroui/react";
import { Chip } from "@heroui/react";
import { Link } from "@heroui/react";

//import { A11y, Autoplay, Navigation, Pagination, Scrollbar } from "swiper/modules";
import { A11y, Pagination } from "swiper/modules";
import { Swiper, SwiperSlide } from "swiper/react";
import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";
import "swiper/css/scrollbar";

import CityleagueResultCard from "@app/components/organisms/Cityleague/CityleagueResultCard";

import { CityleagueResultType } from "@app/types/cityleague_result";
import { OfficialEventGetByIdResponseType } from "@app/types/official_event";

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
};

export default function CityleagueResult({ event_result }: Props) {
  const [event, setEvent] = useState<OfficialEventGetByIdResponseType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!event_result.official_event_id) {
      setLoading(false);
      return;
    }

    setLoading(true);

    const fetchData = async () => {
      try {
        setLoading(true);
        const data = await fetchOfficialEventById(event_result.official_event_id);
        setEvent(data);
      } catch (err) {
        console.log(err);
        setError("データの取得に失敗しました");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [event_result.official_event_id]);

  const isNew = (date: Date) => {
    const now = new Date();

    const diffInMs = now.getTime() - date.getTime();
    const diffInHours = diffInMs / (1000 * 60 * 60);

    return diffInHours <= 36;
  };

  if (loading) {
    return <div>読み込み中...</div>;
  }

  if (error) {
    return <div className="text-red-500">{error}</div>;
  }

  if (!event) {
    return;
  }

  return (
    <Card className="pt-3">
      <CardHeader className="pb-0 pt-0 px-3 flex-col items-start gap-0.5">
        <small className="text-default-500">{event.title}</small>
        <p className="font-bold text-tiny">
          {new Date(event.date).toLocaleString("ja-JP", {
            year: "numeric",
            month: "long",
            day: "numeric",
            weekday: "short",
          })}
        </p>
        <div className="font-bold text-medium">{event.shop_name}</div>
        <div className="flex flex-wrap items-start gap-1 pt-0.5">
          <Chip size="sm" radius="md" variant="bordered">
            <small className="font-bold">{event.prefecture_name}</small>
          </Chip>
          <Chip size="sm" radius="md" variant="bordered">
            <small className="font-bold">{event.league_title}リーグ</small>
          </Chip>
          <Chip size="sm" radius="md" variant="bordered">
            <small className="font-bold">{event.environment_title}</small>
          </Chip>
          {isNew(new Date(event.date)) && (
            <Chip
              size="sm"
              radius="md"
              classNames={{
                base: "bg-linear-to-br from-indigo-500 to-pink-500 border-small border-white/50 ",
                //base: "bg-linear-to-br from-indigo-500 to-pink-500 border-small border-white/50 shadow-pink-500/30",
                content: "drop-shadow-xs shadow-black text-white",
              }}
              variant="shadow"
            >
              <small className="font-bold">New</small>
            </Chip>
          )}
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
            /*
            autoplay={{
              delay: 1500,
              disableOnInteraction: false,
            }}
            */
            pagination={{
              clickable: true,
            }}
          >
            {event_result.results.map(
              (result, index) =>
                result.rank < 9 && (
                  <SwiperSlide key={index} className="p-2">
                    <CityleagueResultCard result={result} />
                  </SwiperSlide>
                ),
            )}
          </Swiper>
        </div>
      </CardBody>
      <CardFooter className="pt-0 pb-2">
        <div>
          <Link
            isExternal
            showAnchorIcon
            underline="always"
            href={`/cityleague_results/${event.id}`}
            className="text-xs"
          >
            <span>このイベント結果の詳細ページを見る</span>
          </Link>
        </div>
      </CardFooter>
    </Card>
  );
}
