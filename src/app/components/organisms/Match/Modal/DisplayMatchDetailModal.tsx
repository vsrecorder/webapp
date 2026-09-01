"use client";

import { useLayoutEffect, useMemo, useRef, useState } from "react";

import {
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Skeleton,
  ScrollShadow,
} from "@heroui/react";
import useSWR from "swr";

import { LuStickyNote, LuSwords, LuTags } from "react-icons/lu";

import { Modal } from "@app/components/atoms/AppModal";
import PokemonSprite from "@app/components/atoms/PokemonSprite";
import TagChips from "@app/components/molecules/TagChips";
import { getSpriteBySlot } from "@app/utils/spriteSlot";
import { fingerprintKey } from "@app/utils/fingerprint";
import { findDeckPosition, rankableDecks } from "@app/utils/deckEnv";
import { lastWeekValue, isInCurrentWeekJST, weekValueOfJSTDate } from "@app/utils/week";
import { closingPassthroughClassNames } from "@app/utils/modal";

import { MatchGetResponseType } from "@app/types/match";
import { RecordGetByIdResponseType } from "@app/types/record";
import { WeeklyDeckUsageStatType } from "@app/types/weekly_deck_usage_stat";

// 記録情報モーダル(閲覧モード)で対戦結果をタップしたときに開く詳細モーダル。
// その1戦を振り返るための情報をまとめて表示する:
// - 相手デッキと勝敗、ゲーム内容(先攻/後攻・サイド・BO3の推移)
// - 対戦環境分析(週次デッキ使用率)から見た相手デッキの立ち位置(順位・使用率・全体勝率)
// - 付与タグとメモ

type Props = {
  match: MatchGetResponseType | null;
  // 環境データの参照週を記録の開催日から決めるために使う
  record: RecordGetByIdResponseType | null;
  isOpen: boolean;
  onOpenChange: () => void;
};

// 週次デッキ使用率(対戦環境分析)の取得。SWR で週ごとにキャッシュし、
// 同じ記録内の別の対戦をタップしたときに再取得しないようにする。
async function fetchWeeklyUsage(url: string): Promise<WeeklyDeckUsageStatType> {
  const res = await fetch(url, {
    cache: "no-store",
    headers: { Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`HTTP error: ${res.status}`);
  return res.json();
}

// 週の値("YYYY-MM-DD"=月曜)から「M/D〜M/D」の範囲ラベルを作る
function weekRangeLabel(week: string): string {
  const start = new Date(`${week}T00:00:00Z`);
  if (Number.isNaN(start.getTime())) return "";
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 6);
  return `${start.getUTCMonth() + 1}/${start.getUTCDate()}〜${end.getUTCMonth() + 1}/${end.getUTCDate()}`;
}

export default function DisplayMatchDetailModal({
  match,
  record,
  isOpen,
  onOpenChange,
}: Props) {
  // 不戦勝/不戦敗は相手が存在しないため、ゲーム内容と環境データは表示しない
  const isDefaultMatch =
    !!match && (match.default_victory_flg || match.default_defeat_flg);

  const spriteIds = useMemo(
    () => (match?.pokemon_sprites ?? []).map((s) => s.id),
    [match],
  );
  const fingerprint = fingerprintKey(spriteIds);

  // 環境データの参照週: 記録の開催日が属する週(=対戦当時の環境)。
  // 今週の対戦は集計が途中経過のため、確定している先週のデータで代用する。
  // 開催日未設定(ゼロ値)の記録は作成日で見る(RecordHero の日付表示と同じフォールバック)。
  const week = useMemo(() => {
    if (!record) return lastWeekValue();
    const eventDate =
      record.event_date && !record.event_date.startsWith("0001-01-01")
        ? record.event_date
        : record.created_at;
    if (!eventDate || isInCurrentWeekJST(eventDate)) return lastWeekValue();
    return weekValueOfJSTDate(eventDate) || lastWeekValue();
  }, [record]);

  // モーダルを開いたときだけ取得する(キーを null にして SWR を止める)
  const shouldFetchEnv = isOpen && !!match && !isDefaultMatch && fingerprint !== "";
  const {
    data: envStat,
    error: envError,
    isLoading: envLoading,
  } = useSWR<WeeklyDeckUsageStatType>(
    shouldFetchEnv ? `/api/deck_meta/weekly_usage?week=${week}` : null,
    fetchWeeklyUsage,
    { revalidateOnFocus: false, dedupingInterval: 5 * 60 * 1000 },
  );

  const position = envStat ? findDeckPosition(envStat, spriteIds) : null;
  const hasEnvData = envStat ? rankableDecks(envStat).length > 0 : false;
  const rank = position?.rank ?? null;
  const medal = rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : null;
  // 使用率は環境リターン・環境の窓カードと同じ「その他を除いた割合」で表示する
  const usageRate =
    position && position.exclOtherTotal > 0
      ? position.row.count / position.exclOtherTotal
      : null;

  const games = match?.games ?? [];

  // メモ枠が実際に縦へ溢れているかどうか。溢れているときだけ overflow-y-auto にする。
  // 理由は HScrollRow と同じ(iOS では overflow スタイルを持つのに溢れていない要素から
  // 始まるスワイプが react-aria に殺されるため。溢れていないときは visible に切り替える)。
  const memoRef = useRef<HTMLDivElement>(null);
  const [memoOverflows, setMemoOverflows] = useState(true);
  useLayoutEffect(() => {
    const el = memoRef.current;
    if (!el) return;

    const update = () => setMemoOverflows(el.scrollHeight > el.clientHeight);
    update();

    // 画面回転やモーダル幅の変化に追従する
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  });

  return (
    <Modal
      isOpen={isOpen}
      size={"md"}
      placement="center"
      scrollBehavior="inside"
      hideCloseButton
      onOpenChange={onOpenChange}
      classNames={{ ...closingPassthroughClassNames(isOpen) }}
    >
      <ModalContent>
        {(onClose) => (
          <>
            <ModalHeader className="px-3 flex items-center gap-2">
              <LuSwords className="text-xl" />
              対戦の詳細
            </ModalHeader>
            <ModalBody className="px-3 py-1 gap-3">
              {match && (
                <>
                  {/* 相手デッキと勝敗・ゲーム内容 */}
                  <div className="flex flex-col gap-2.5 rounded-2xl bg-default-50 border border-default-100 p-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="flex items-center gap-0.5 shrink-0">
                        {/* 不戦勝/不戦敗は相手不明のためデフォルト(unknown)スプライトを表示 */}
                        {([1, 2] as const).map((slot) => (
                          <PokemonSprite
                            key={slot}
                            id={
                              isDefaultMatch
                                ? undefined
                                : getSpriteBySlot(match.pokemon_sprites, slot)?.id
                            }
                            size={44}
                          />
                        ))}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-[0.625rem] font-bold tracking-wide text-default-400">
                          対戦相手のデッキ
                        </div>
                        <div className="text-sm font-bold leading-tight wrap-break-word mt-0.5">
                          {isDefaultMatch
                            ? match.default_victory_flg
                              ? "不戦勝"
                              : "不戦敗"
                            : match.opponents_deck_info}
                        </div>
                      </div>
                      {/* 勝敗バッジ(一覧の行と同じ配色) */}
                      {match.group_match_flg ? (
                        <div className="flex shrink-0 items-end gap-1.5">
                          <div className="flex flex-col items-center gap-0.5">
                            <span className="text-[0.5625rem] leading-none text-default-400">
                              チーム
                            </span>
                            <span
                              className={`flex h-7 w-7 items-center justify-center rounded-lg text-sm font-bold ${
                                match.group_match_victory_flg
                                  ? "bg-success/15 text-success"
                                  : "bg-danger/15 text-danger"
                              }`}
                            >
                              {match.group_match_victory_flg ? "W" : "L"}
                            </span>
                          </div>
                          <div className="flex flex-col items-center gap-0.5">
                            <span className="text-[0.5625rem] leading-none text-default-400">
                              個人
                            </span>
                            <span
                              className={`flex h-7 w-7 items-center justify-center rounded-lg text-sm font-bold ${
                                match.victory_flg
                                  ? "bg-success/15 text-success"
                                  : "bg-danger/15 text-danger"
                              }`}
                            >
                              {match.victory_flg ? "W" : "L"}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <span
                          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-base font-bold ${
                            match.draw_flg
                              ? "bg-default-300/40 text-default-600"
                              : match.victory_flg
                                ? "bg-success/15 text-success"
                                : "bg-danger/15 text-danger"
                          }`}
                        >
                          {match.draw_flg ? "D" : match.victory_flg ? "W" : "L"}
                        </span>
                      )}
                    </div>

                    {/* ゲーム内容(先攻/後攻・サイド・BO3の推移) */}
                    {!isDefaultMatch && games.length > 0 && (
                      <div className="flex flex-col gap-1.5 border-t border-default-200 pt-2.5">
                        {match.bo3_flg ? (
                          games.map((game, i) => (
                            <div
                              key={game.id || i}
                              className="flex items-center gap-2.5 text-xs"
                            >
                              <span className="w-10 shrink-0 font-bold text-default-400">
                                {i + 1}本目
                              </span>
                              <span
                                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md text-[0.625rem] font-bold ${
                                  game.winnging_flg
                                    ? "bg-success/15 text-success"
                                    : "bg-danger/15 text-danger"
                                }`}
                              >
                                {game.winnging_flg ? "W" : "L"}
                              </span>
                              <span className="font-bold">
                                {game.go_first ? "先攻" : "後攻"}
                              </span>
                              {/* チーム戦はサイド枚数を扱わないため非表示(一覧と同じ) */}
                              {!match.group_match_flg && (
                                <span className="tabular-nums text-default-500">
                                  サイド {game.your_prize_cards} -{" "}
                                  {game.opponents_prize_cards}
                                </span>
                              )}
                            </div>
                          ))
                        ) : (
                          <div className="flex items-center gap-2.5 text-xs">
                            <span className="font-bold">
                              {games[0]?.go_first ? "先攻" : "後攻"}
                            </span>
                            {!match.group_match_flg && (
                              <span className="tabular-nums text-default-500">
                                サイド {games[0]?.your_prize_cards ?? 0} -{" "}
                                {games[0]?.opponents_prize_cards ?? 0}
                              </span>
                            )}
                          </div>
                        )}
                        {/* 引き分け(BO3のみ): 1勝1敗のまま決着しなかった対戦 */}
                        {match.draw_flg && (
                          <div className="text-[0.6875rem] text-default-400">
                            この対戦は両者引き分けです
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* 対戦環境分析から見た相手デッキの立ち位置 */}
                  {!isDefaultMatch && (
                    <div className="flex flex-col gap-2.5 rounded-2xl bg-default-50 border border-default-100 p-3">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="text-[0.625rem] font-bold tracking-wide text-default-400">
                          対戦環境での立ち位置
                        </span>
                        <span className="text-[0.625rem] text-default-400 whitespace-nowrap">
                          {weekRangeLabel(week)} の週のデータ
                        </span>
                      </div>

                      {fingerprint === "" ? (
                        // スプライト未設定は環境データと突合できない(指紋が「その他」と同値になるため)
                        <span className="text-[0.6875rem] text-default-400 leading-snug">
                          相手のポケモンが未設定のため、環境データと照合できません
                        </span>
                      ) : envLoading ? (
                        <div className="grid grid-cols-3 gap-3">
                          {[0, 1, 2].map((i) => (
                            <Skeleton key={i} className="h-9 rounded-lg" />
                          ))}
                        </div>
                      ) : envError || !envStat ? (
                        <span className="text-[0.6875rem] text-default-400 leading-snug">
                          環境データを取得できませんでした
                        </span>
                      ) : !hasEnvData ? (
                        <span className="text-[0.6875rem] text-default-400 leading-snug">
                          この週の環境データはありません
                        </span>
                      ) : position ? (
                        <div className="grid grid-cols-3">
                          <div className="flex flex-col gap-1 px-0.5 min-w-0">
                            <span className="text-[0.625rem] font-bold text-default-400">
                              環境順位
                            </span>
                            <span className="text-[1.0625rem] font-black tabular-nums leading-none whitespace-nowrap">
                              {medal && <span className="mr-0.5">{medal}</span>}
                              {rank}位
                            </span>
                          </div>
                          <div className="flex flex-col gap-1 pl-3 border-l border-default-200 min-w-0">
                            <span className="text-[0.625rem] font-bold text-default-400">
                              使用率
                            </span>
                            <span className="text-[1.0625rem] font-black tabular-nums leading-none">
                              {((usageRate ?? 0) * 100).toFixed(1)}%
                            </span>
                          </div>
                          <div className="flex flex-col gap-1 pl-3 border-l border-default-200 min-w-0">
                            <span className="text-[0.625rem] font-bold text-default-400">
                              全体勝率
                            </span>
                            <span className="text-[1.0625rem] font-black tabular-nums leading-none">
                              {(position.row.win_rate * 100).toFixed(1)}%
                            </span>
                          </div>
                        </div>
                      ) : (
                        // この週の環境ランキング外(出現数が少ない)。順位・勝率は出せない。
                        <div className="flex flex-col gap-0.5">
                          <span className="text-sm font-black text-default-600">
                            環境ランキング外
                          </span>
                          <span className="text-[0.6875rem] text-default-400 leading-snug">
                            この週の出現が少ない、珍しい相手です
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* 付与タグ */}
                  {match.tags && match.tags.length > 0 && (
                    <div className="flex flex-col gap-1.5 px-0.5">
                      <div className="flex items-center gap-1 text-[0.625rem] font-bold tracking-wide text-default-400">
                        <LuTags className="text-sm" />
                        タグ
                      </div>
                      <TagChips tags={match.tags} />
                    </div>
                  )}

                  {/* メモ */}
                  {match.memo && match.memo !== "" && (
                    <div className="flex flex-col gap-1.5 px-0.5">
                      <div className="flex items-center gap-1 text-[0.625rem] font-bold tracking-wide text-default-400">
                        <LuStickyNote className="text-sm" />
                        メモ
                      </div>
                      {/* 長いメモはこの枠内だけでスクロールさせる(上のデッキ・環境情報は
                          固定のまま)。高さ上限を行高の整数倍からずらし、続きがあるときは
                          必ず途中で切れた行が見えるようにする。溢れた側の端は ScrollShadow が
                          控えめにフェードさせる。 */}
                      <ScrollShadow
                        ref={memoRef}
                        size={20}
                        className={`max-h-38 rounded-xl border border-default-100 bg-default-50 px-3 py-2.5 ${
                          memoOverflows ? "" : "overflow-y-visible"
                        }`}
                      >
                        {/* メモの内容（改行を保持して表示） */}
                        <div className="whitespace-pre-wrap wrap-break-word text-sm">
                          {match.memo}
                        </div>
                      </ScrollShadow>
                    </div>
                  )}
                </>
              )}
            </ModalBody>
            <ModalFooter>
              <Button
                color="default"
                variant="solid"
                onPress={onClose}
                className="font-bold"
              >
                閉じる
              </Button>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
}
