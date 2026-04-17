import Image from "next/image";

import Footer from "@app/components/organisms/Layout/Footer";

import CityleagueEvents from "@app/components/organisms/Cityleague/CityleagueEvents";

import { CityleagueScheduleType } from "@app/types/cityleague_schedule";

async function getCityleagueScheduleByDate(date: Date): Promise<CityleagueScheduleType> {
  try {
    const domain = process.env.VSRECORDER_DOMAIN;

    const today = date.toISOString().split("T")[0];

    const res = await fetch(
      `https://${domain}/api/v1beta/cityleague_schedules?date=${today}`,
      {
        cache: "no-store",
        method: "GET",
        headers: {
          Accept: "application/json",
        },
      },
    );

    if (res.status === 200) {
      const ret: CityleagueScheduleType = await res.json();
      return ret;
    } else if (res.status === 404) {
      throw new Error("not found");
    } else {
      throw new Error("error");
    }
  } catch (error) {
    throw error;
  }
}

export default async function TemplateHome() {
  const date = new Date(Date.now() + 9 * 60 * 60 * 1000);

  let cs: CityleagueScheduleType | undefined;
  try {
    cs = await getCityleagueScheduleByDate(date);
  } catch (error) {
    cs = undefined;
  }

  return (
    <>
      <div className="flex flex-col gap-6">
        <div className="pt-6 flex flex-col items-center justify-center gap-4.5 w-full">
          <div className="w-24 h-24 relative">
            <Image
              alt="バトレコ"
              src="https://xx8nnpgt.user.webaccel.jp/images/icons/logo.png"
              fill
              className="object-contain"
              sizes="96px"
              priority
            />
          </div>

          <span className="text-3xl font-bold">バトレコ</span>

          <div className="flex flex-col justify-center gap-0.5">
            <span className="text-tiny">友達との　勝負や</span>
            <span className="text-tiny">特殊な　施設での　勝負を</span>
            <span className="text-tiny">記録できる　かっこいい　アプリ。</span>
          </div>
        </div>

        {cs && (
          <div className="flex flex-col gap-1.5">
            <div className="flex flex-col items-center justify-center">
              <div className="text-lg font-bold">{cs.title} 開催中！</div>
            </div>
            <div className="flex flex-col gap-3 w-full">
              <div className="pb-0 flex flex-col items-center justify-center gap-0">
                <div className="text-base font-bold underline">本日のシティリーグ</div>
              </div>
              <CityleagueEvents />
            </div>
          </div>
        )}
      </div>
      <Footer />
    </>
  );
}
