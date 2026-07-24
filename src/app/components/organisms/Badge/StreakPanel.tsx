"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Card,
  CardBody,
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@heroui/react";
import { LuFlame, LuInfo, LuSnowflake } from "react-icons/lu";

import FetchError from "@app/components/molecules/FetchError";

import { UserStreakType } from "@app/types/streak";

type Props = {
  userId: string;
};

export default function StreakPanel({ userId }: Props) {
  const [streak, setStreak] = useState<UserStreakType | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);

  // 取得に失敗したことを「0週連続記録中」の表示で覆い隠さないよう、
  // 失敗はエラーとして扱い、この場だけで取り直せるようにする。
  const loadStreak = useCallback(async () => {
    setError(false);
    setIsLoading(true);

    try {
      const res = await fetch(`/api/users/${userId}/streak`, { cache: "no-store" });

      if (!res.ok) {
        throw new Error("Failed to fetch");
      }

      const data: UserStreakType = await res.json();

      setStreak(data);
    } catch (err) {
      console.log(err);
      setError(true);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadStreak();
  }, [loadStreak]);

  if (error) {
    return (
      <FetchError message="連続記録の取得に失敗しました" onRetry={loadStreak} compact />
    );
  }

  const currentWeeks = streak?.current_weeks ?? 0;
  const longestWeeks = streak?.longest_weeks ?? 0;
  const freezeUsedCount = streak?.freeze_used_count ?? 0;
  const maxFreezeCount = streak?.max_freeze_count ?? 0;
  const freezeRemaining = maxFreezeCount - freezeUsedCount;
  const freezeRegenRemainingWeeks = streak?.freeze_regen_remaining_weeks ?? 0;
  const freezeRegenWeeks = streak?.freeze_regen_weeks ?? 0;
  const isActive = !isLoading && currentWeeks > 0;
  // フリーズ枠を持つのは記録継続中だけなので、その時だけフリーズ関連の表示を出す
  const showFreeze = isActive && maxFreezeCount > 0;
  // フリーズを消費している間だけ、あと何週の連続記録で1枠戻るかを案内する
  const showFreezeRegen =
    showFreeze && freezeUsedCount > 0 && freezeRegenRemainingWeeks > 0;

  return (
    <Card className="shadow-md">
      <CardBody className="flex flex-row items-center gap-4 p-4">
        <div
          className={`flex items-center justify-center w-14 h-14 rounded-2xl shrink-0 ${
            isActive ? "bg-warning/15 text-warning" : "bg-default-100 text-default-300"
          }`}
        >
          <LuFlame className="w-7 h-7" />
        </div>

        <div className="flex flex-col gap-1 min-w-0 flex-1">
          {isLoading ? (
            <span className="text-2xl font-black text-default-300 animate-pulse leading-none">
              —
            </span>
          ) : (
            <span className="text-2xl font-black leading-none tabular-nums">
              {currentWeeks}
              <span className="text-sm font-bold text-default-500 ml-1">
                週連続記録中
              </span>
            </span>
          )}

          <div className="flex items-center gap-1.5 w-full text-[11px] text-default-400 font-medium">
            <span>最長記録 {longestWeeks}週</span>
            {showFreeze && (
              <>
                <span className="text-default-300" aria-hidden>
                  ·
                </span>
                {/* フリーズ枠を雪アイコンで可視化(残り=プライマリ色 / 使用済み=淡色) */}
                <span
                  className="inline-flex items-center gap-1"
                  aria-label={`フリーズ 残り${freezeRemaining} / 最大${maxFreezeCount}`}
                >
                  <span className="inline-flex items-center gap-0.5">
                    {Array.from({ length: maxFreezeCount }).map((_, i) => (
                      <LuSnowflake
                        key={i}
                        className={`w-3.5 h-3.5 ${
                          i < freezeRemaining ? "text-primary" : "text-default-200"
                        }`}
                      />
                    ))}
                  </span>
                  <span
                    className={
                      freezeRemaining > 0 ? "text-default-500" : "text-default-300"
                    }
                  >
                    残り{freezeRemaining}
                  </span>
                </span>
              </>
            )}
          </div>

          {showFreezeRegen && (
            <span className="inline-flex items-center gap-0.5 text-[11px] text-primary font-medium">
              <LuSnowflake className="w-3 h-3" />
              あと{freezeRegenRemainingWeeks}週の連続記録でフリーズが1つ復活します
            </span>
          )}
        </div>

        {/*
          フリーズの仕組みは初見だと分かりにくいので、右上に説明の入口を1つ置く。
          吹き出しの作りは KizunaHintPopover / CurrentEnvironment と揃える。
            backdrop         … 全面を覆う層で外側タップを受け止めて閉じる
            shouldBlockScroll… 表示中のスクロール抑止(iOS は touchmove も抑止)
            isNonModal={false}… 背面を aria-hidden にしフォーカス移動も封じる
            disableAnimation … 閉→即再オープンの死に窓を消す(理由は CurrentEnvironment 参照)
          StreakPanel はページ直下(モーダル外)かつカード自体は無反応なので、この構成で問題ない。
        */}
        {showFreeze && (
          <Popover
            placement="bottom-end"
            offset={8}
            showArrow
            backdrop="opaque"
            shouldBlockScroll
            isNonModal={false}
            disableAnimation
          >
            <PopoverTrigger>
              <button
                type="button"
                aria-label="フリーズの仕組みを見る"
                className="-m-1.5 flex shrink-0 items-center justify-center self-start rounded-full p-2.5 text-default-400 active:opacity-70"
              >
                <LuInfo className="w-4 h-4" />
              </button>
            </PopoverTrigger>
            <PopoverContent className="px-3 py-3">
              <div className="flex max-w-64 flex-col gap-2 text-left">
                <span className="flex items-center gap-1 text-small font-bold text-primary">
                  <LuSnowflake className="w-3.5 h-3.5" />
                  フリーズとは
                </span>
                <p className="text-tiny leading-relaxed text-default-600">
                  {
                    "記録できない週があっても、ストリークを止めずに守ってくれる予備です。"
                  }
                </p>
                <p className="text-tiny leading-relaxed text-default-600">
                  {`1週の空白ごとに1つ使い、最大${maxFreezeCount}個までためられます。フリーズを使わずに${freezeRegenWeeks}週続けて記録するごとに、使った枠が1つ戻ります。`}
                </p>
              </div>
            </PopoverContent>
          </Popover>
        )}
      </CardBody>
    </Card>
  );
}
