"use client";

import { useCallback, useEffect, useState } from "react";
import { Card, CardBody } from "@heroui/react";
import { LuFlame, LuSnowflake } from "react-icons/lu";

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
  const isActive = !isLoading && currentWeeks > 0;

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

        <div className="flex flex-col gap-0.5 min-w-0">
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
          <div className="flex items-center justify-center gap-2 w-full text-[11px] text-default-400 font-medium">
            <span>最長記録 {longestWeeks}週</span>
            {isActive && maxFreezeCount > 0 && (
              <span
                className={`inline-flex items-center gap-0.5 ${
                  freezeRemaining > 0 ? "text-primary" : "text-default-300"
                }`}
              >
                <LuSnowflake className="w-3 h-3" />
                {freezeRemaining > 0
                  ? `フリーズ残り${freezeRemaining}`
                  : "フリーズ使用済み"}
              </span>
            )}
          </div>
        </div>
      </CardBody>
    </Card>
  );
}
