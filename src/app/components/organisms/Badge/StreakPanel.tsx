"use client";

import { ReactNode, useCallback, useEffect, useState } from "react";
import { Card, CardBody, Popover, PopoverContent, PopoverTrigger } from "@heroui/react";
import { LuFlame, LuInfo, LuSnowflake } from "react-icons/lu";

import FetchError from "@app/components/molecules/FetchError";

import { UserStreakType } from "@app/types/streak";

type Props = {
  userId: string;
};

// テキスト列は「週数 / 最長記録・フリーズ枠 / フリーズ復活の案内」の3行構成だが、
// 3行目はフリーズを消費しているときしか出ない。出るときだけ高さが増えると、データ到着で
// カードが伸びて下のセクションごと押し下がる(スケルトンとの差もそのまま揺れになる)ため、
// 常に3行ぶんの高さを確保しておく。
//
// 確保の仕方は px の決め打ちではなく、同じ字送りの見えない3行(サイザー)を実内容と
// グリッドの同じセルへ重ねる方式にしている。週数の行は text-2xl(leading-none)の中に
// text-sm を含むぶん行の高さがフォントのメトリクス次第で、実測でも 25px / 26px と環境で
// 変わる(Noto Sans CJK JP は 26px、DejaVu Sans / Liberation Sans は 25px)。px で固定すると
// 端末によっては1px ぶんの揺れが戻ってしまう。
// 3行に満たないときは justify-center で上下中央に置き、余白が下だけに溜まらないようにする。
function TextColumn({ children }: { children: ReactNode }) {
  return (
    <div className="grid min-w-0 flex-1">
      <div
        aria-hidden
        className="invisible col-start-1 row-start-1 flex w-0 flex-col gap-1 overflow-hidden whitespace-nowrap"
      >
        <span className="text-2xl font-black leading-none">
          0<span className="ml-1 text-sm font-bold">週</span>
        </span>
        <span className="text-[11px] font-medium">0</span>
        <span className="text-[11px] font-medium">0</span>
      </div>
      <div className="col-start-1 row-start-1 flex min-w-0 flex-col justify-center gap-1">
        {children}
      </div>
    </div>
  );
}

// フリーズ復活の案内。2行に折り返すと確保した高さを超えてしまうので1行に収める
// (週数が2桁でも収まる長さの文言。狭い端末向けの保険として truncate も掛けている)。
function FreezeRegenLine({ weeks }: { weeks: number }) {
  return (
    <span className="inline-flex items-center gap-0.5 text-[11px] text-primary font-medium">
      <LuSnowflake className="w-3 h-3 shrink-0" />
      <span className="truncate">あと{weeks}週でフリーズが1つ復活</span>
    </span>
  );
}

// info ボタン(-m-1.5 + p-2.5 + w-4 = 36px 角)の場所取り。読み込み中とフリーズ非表示のとき、
// 右端を空けたままにして列幅を揺らさないために置く。読み込み中だけ骨格として見せる。
function InfoButtonPlaceholder({ pulse = false }: { pulse?: boolean }) {
  return (
    <div
      aria-hidden
      className="-m-1.5 flex shrink-0 items-center justify-center self-start p-2.5"
    >
      <div
        className={`w-4 h-4 rounded-full ${pulse ? "bg-default-100 animate-pulse" : ""}`}
      />
    </div>
  );
}

// 骨格の1行。行の高さは実体と同じ字送りの見えないテキストから取り、その上にバーを重ねる。
// sampleClassName は必ず実体の行と同じ文字サイズにすること。見えないテキストを素の span で
// 包むと、行ボックスが親の strut(16px × 1.5 = 24px)まで膨らんで実体より高くなる。
function SkeletonLine({
  sampleClassName,
  sample,
  barClassName,
}: {
  sampleClassName: string;
  sample: ReactNode;
  barClassName: string;
}) {
  return (
    <span className="relative flex items-center">
      <span aria-hidden className={`invisible ${sampleClassName}`}>
        {sample}
      </span>
      <span
        className={`absolute left-0 rounded-full bg-default-100 animate-pulse ${barClassName}`}
      />
    </span>
  );
}

// 実体と同じ行の高さで置くスケルトン。3行目(フリーズ復活の案内)は出ない方が既定なので
// 骨格も2行にする。TextColumn が3行ぶんを確保するので、案内が出る場合も高さは動かない。
function StreakPanelSkeleton() {
  return (
    <Card className="shadow-md">
      <CardBody className="flex flex-row items-center gap-4 p-4">
        <div className="flex items-center justify-center w-14 h-14 rounded-2xl shrink-0 bg-default-100 text-default-200">
          <LuFlame className="w-7 h-7" />
        </div>

        <TextColumn>
          {/* バー幅は実データで実測した値(週数の行 102〜116px / 最長記録の行 141〜148px) */}
          <SkeletonLine
            sampleClassName="text-2xl font-black leading-none"
            sample={
              <>
                0<span className="ml-1 text-sm font-bold">週連続記録中</span>
              </>
            }
            barClassName="w-28 max-w-full h-4"
          />
          <SkeletonLine
            sampleClassName="text-[11px] font-medium"
            sample="最長記録 0週"
            barClassName="w-36 max-w-full h-2.5"
          />
        </TextColumn>

        <InfoButtonPlaceholder pulse />
      </CardBody>
    </Card>
  );
}

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
          <div className="flex items-center gap-1.5 w-full text-[11px] text-default-400 font-medium">
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

          {showFreezeRegen && <FreezeRegenLine weeks={freezeRegenRemainingWeeks} />}
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
