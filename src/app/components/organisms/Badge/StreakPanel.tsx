"use client";

import { Card, CardBody, Popover, PopoverContent, PopoverTrigger } from "@heroui/react";
import { LuFlame, LuInfo, LuSnowflake } from "react-icons/lu";

import FetchError from "@app/components/molecules/FetchError";

import StreakPanelSkeleton, {
  InfoButtonPlaceholder,
  TextColumn,
} from "@app/components/organisms/Badge/Skeleton/StreakPanelSkeleton";

import { useSeededResource } from "@app/hooks/useSeededResource";
import { UserStreakType } from "@app/types/streak";

import { freezeRegenText } from "@app/utils/streak";

async function fetchStreak(userId: string): Promise<UserStreakType> {
  const res = await fetch(`/api/users/${userId}/streak`, { cache: "no-store" });

  if (!res.ok) {
    throw new Error("Failed to fetch");
  }

  return (await res.json()) as UserStreakType;
}

type Props = {
  userId: string;
  // サーバ描画(dashboardServer)で取った値。あればこれを出し、取りに行かない
  initialStreak?: UserStreakType;
};

// フリーズ復活の案内。2行に折り返すと確保した高さを超えてしまうので1行に収める
// (週数が2桁でも収まる長さの文言。狭い端末向けの保険として truncate も掛けている)。
function FreezeRegenLine({ text }: { text: string }) {
  return (
    <span className="inline-flex items-center gap-0.5 text-[0.6875rem] text-primary font-medium">
      <LuSnowflake className="w-3 h-3 shrink-0" />
      <span className="truncate">{text}</span>
    </span>
  );
}

export default function StreakPanel({ userId, initialStreak }: Props) {
  // 取得に失敗したことを「0週連続記録中」の表示で覆い隠さないよう、
  // 失敗はエラーとして扱い、この場だけで取り直せるようにする。
  const {
    data: streak,
    loading: isLoading,
    error,
    retry: loadStreak,
  } = useSeededResource(userId, fetchStreak, initialStreak);

  if (isLoading) {
    return <StreakPanelSkeleton />;
  }

  if (error) {
    return (
      <FetchError message="連続記録の取得に失敗しました" onRetry={loadStreak} compact />
    );
  }

  const currentWeeks = streak?.current_weeks ?? 0;
  const longestWeeks = streak?.longest_weeks ?? 0;
  const freezeUsedCount = streak?.freeze_used_count ?? 0;
  const maxFreezeCount = streak?.max_freeze_count ?? 0;
  // 使用済みが上限を超えた値で返ってきても「残り-1」を出さないよう 0 で止める
  const freezeRemaining = Math.max(maxFreezeCount - freezeUsedCount, 0);
  const freezeRegenRemainingWeeks = streak?.freeze_regen_remaining_weeks ?? 0;
  const freezeRegenWeeks = streak?.freeze_regen_weeks ?? 0;
  const isActive = currentWeeks > 0;
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

        <TextColumn>
          <span className="text-2xl font-black leading-none tabular-nums">
            {currentWeeks}
            <span className="text-sm font-bold text-default-500 ml-1">週連続記録中</span>
          </span>

          {/* この行が折り返すと確保した3行ぶんを超えてカードが伸びるので、子は全て
              shrink-0 にして折り返させない。極端に狭い端末では溢れた分をカードの
              overflow-hidden に任せる。 */}
          <div className="flex items-center gap-1.5 w-full text-[0.6875rem] text-default-400 font-medium">
            <span className="shrink-0">最長記録 {longestWeeks}週</span>
            {showFreeze && (
              <>
                <span className="shrink-0 text-default-300" aria-hidden>
                  ·
                </span>
                {/* フリーズ枠を雪アイコンで可視化(残り=プライマリ色 / 使用済み=淡色) */}
                <span
                  className="inline-flex shrink-0 items-center gap-1"
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
                  {/* 360px 未満では雪アイコンだけ残して桁を落とす(残数は aria-label が持つ)。
                      文字まで並べると行が溢れて折り返し、カードの高さが変わってしまう。 */}
                  <span
                    className={`max-[359px]:hidden ${
                      freezeRemaining > 0 ? "text-default-500" : "text-default-300"
                    }`}
                  >
                    残り{freezeRemaining}
                  </span>
                </span>
              </>
            )}
          </div>

          {showFreezeRegen && (
            <FreezeRegenLine
              text={freezeRegenText(
                freezeRegenRemainingWeeks,
                streak?.last_recorded_week,
              )}
            />
          )}
        </TextColumn>

        {/*
          フリーズの仕組みは初見だと分かりにくいので、右上に説明の入口を1つ置く。
          吹き出しの作りは KizunaHintPopover / CurrentEnvironment と揃える。
            backdrop         … 全面を覆う層で外側タップを受け止めて閉じる
            shouldBlockScroll… 表示中のスクロール抑止(iOS は touchmove も抑止)
            isNonModal={false}… 背面を aria-hidden にしフォーカス移動も封じる
            disableAnimation … 閉→即再オープンの死に窓を消す(理由は CurrentEnvironment 参照)
          StreakPanel はページ直下(モーダル外)かつカード自体は無反応なので、この構成で問題ない。
        */}
        {showFreeze ? (
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
                  {"記録できない週があっても、ストリークを止めずに守ってくれる予備です。"}
                </p>
                <p className="text-tiny leading-relaxed text-default-600">
                  {`1週の空白ごとに1つ使い、最大${maxFreezeCount}個までためられます。フリーズを使わずに${freezeRegenWeeks}週続けて記録するごとに、使った枠が1つ戻ります。`}
                </p>
              </div>
            </PopoverContent>
          </Popover>
        ) : (
          <InfoButtonPlaceholder />
        )}
      </CardBody>
    </Card>
  );
}
