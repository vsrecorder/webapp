"use client";

import { useEffect, useState, type RefObject } from "react";

import {
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
} from "@heroui/react";

import { Button } from "@heroui/react";
import { Image } from "@heroui/react";
import { Chip } from "@heroui/react";
import { addToast } from "@heroui/react";

import { spriteScaleClass } from "@app/utils/sprite";
import { Card, CardBody } from "@heroui/react";

import { useDisclosure } from "@heroui/react";

import { LuStickyNote, LuSwords, LuChevronUp, LuChevronDown } from "react-icons/lu";

import UpdateMatchModal from "@app/components/organisms/Match/Modal/UpdateMatchModal";
import DisplayMatchMemoModal from "@app/components/organisms/Match/Modal/DisplayMatchMemoModal";
import CreateMatchModalButton from "@app/components/organisms/Match/CreateMatchModalButton";
import MatchSkeleton from "@app/components/organisms/Match/Skeleton/MatchSkeleton";

import { RecordGetByIdResponseType } from "@app/types/record";
import { MatchGetResponseType, MatchOrderItemType } from "@app/types/match";

type SectionKey = "qualifying" | "final" | "other";

const SECTION_LABELS: Record<SectionKey, string> = {
  qualifying: "🎯 予選",
  final: "🏆 本戦",
  other: "📝 その他",
};

const SECTION_FLAGS: Record<
  SectionKey,
  { qualifying_round_flg: boolean; final_tournament_flg: boolean }
> = {
  qualifying: { qualifying_round_flg: true, final_tournament_flg: false },
  final: { qualifying_round_flg: false, final_tournament_flg: true },
  other: { qualifying_round_flg: false, final_tournament_flg: false },
};

function sectionKeyOf(match: MatchGetResponseType): SectionKey {
  if (match.qualifying_round_flg) return "qualifying";
  if (match.final_tournament_flg) return "final";
  return "other";
}

type Section = {
  key: SectionKey | "all";
  label: string | null;
  items: MatchGetResponseType[];
};

// 予選/本戦/その他のセクションに分ける。いずれのフラグも立っていない場合は
// セクション分けせず単一グループとして扱う(見出しは表示しない)。
function buildSections(matches: MatchGetResponseType[]): Section[] {
  const hasAnyPhaseFlag = matches.some(
    (m) => m.qualifying_round_flg || m.final_tournament_flg,
  );

  if (!hasAnyPhaseFlag) {
    return [{ key: "all", label: null, items: matches }];
  }

  return (["qualifying", "final", "other"] as SectionKey[])
    .map((key) => ({
      key,
      label: SECTION_LABELS[key],
      items: matches.filter((m) => sectionKeyOf(m) === key),
    }))
    .filter((section) => section.items.length > 0);
}

// 指定した対戦を1つ上/下に移動する。セクションの境界を跨ぐ場合は、
// 移動先セクションに応じて qualifying_round_flg / final_tournament_flg を付け替える。
// 移動できない(先頭/末尾)場合は null を返す。
function moveMatch(
  matches: MatchGetResponseType[],
  matchId: string,
  direction: "up" | "down",
): MatchGetResponseType[] | null {
  const sections = buildSections(matches);
  const sectionIndex = sections.findIndex((s) =>
    s.items.some((m) => m.id === matchId),
  );
  if (sectionIndex === -1) return null;

  const section = sections[sectionIndex];
  const itemIndex = section.items.findIndex((m) => m.id === matchId);

  if (direction === "up") {
    if (itemIndex > 0) {
      const items = [...section.items];
      [items[itemIndex - 1], items[itemIndex]] = [
        items[itemIndex],
        items[itemIndex - 1],
      ];
      sections[sectionIndex] = { ...section, items };
    } else {
      if (sectionIndex === 0) return null;

      const prevSection = sections[sectionIndex - 1];
      const moving =
        prevSection.key === "all"
          ? section.items[0]
          : { ...section.items[0], ...SECTION_FLAGS[prevSection.key] };

      sections[sectionIndex - 1] = {
        ...prevSection,
        items: [...prevSection.items, moving],
      };
      sections[sectionIndex] = { ...section, items: section.items.slice(1) };
    }
  } else {
    if (itemIndex < section.items.length - 1) {
      const items = [...section.items];
      [items[itemIndex], items[itemIndex + 1]] = [
        items[itemIndex + 1],
        items[itemIndex],
      ];
      sections[sectionIndex] = { ...section, items };
    } else {
      if (sectionIndex === sections.length - 1) return null;

      const nextSection = sections[sectionIndex + 1];
      const moving =
        nextSection.key === "all"
          ? section.items[itemIndex]
          : { ...section.items[itemIndex], ...SECTION_FLAGS[nextSection.key] };

      sections[sectionIndex + 1] = {
        ...nextSection,
        items: [moving, ...nextSection.items],
      };
      sections[sectionIndex] = {
        ...section,
        items: section.items.slice(0, itemIndex),
      };
    }
  }

  return sections.filter((s) => s.items.length > 0).flatMap((s) => s.items);
}

async function fetchMatches(record_id: string) {
  try {
    const res = await fetch(`/api/records/${record_id}/matches`, {
      cache: "no-store",
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    });

    if (!res.ok) {
      throw new Error("Failed to fetch");
    }

    const ret: MatchGetResponseType[] = await res.json();

    return ret;
  } catch (error) {
    throw error;
  }
}

type Props = {
  record: RecordGetByIdResponseType | null;
  enableCreateMatchModalButton: boolean;
  enableUpdateMatchModalButton: boolean;
  matchCardRef?: RefObject<HTMLDivElement | null>;
};

export default function Matches({
  record,
  enableCreateMatchModalButton,
  enableUpdateMatchModalButton,
  matchCardRef,
}: Props) {
  const [selectedMatch, setSelectedMatch] = useState<MatchGetResponseType | null>(null);
  const [matches, setMatches] = useState<MatchGetResponseType[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const {
    isOpen: isOpenForUpdateMatchModal,
    onOpen: onOpenForUpdateMatchModal,
    onOpenChange: onOpenChangeForUpdateMatchModal,
    onClose: onCloseForUpdateMatchModal,
  } = useDisclosure();

  const {
    isOpen: isOpenForDisplayMatchMemoModal,
    onOpen: onOpenForDisplayMatchMemoModal,
    onOpenChange: onOpenChangeForDisplayMatchMemoModal,
  } = useDisclosure();

  useEffect(() => {
    if (!record) {
      setLoading(false);
      return;
    }

    setLoading(true);

    const fetchData = async () => {
      try {
        setLoading(true);
        const data = await fetchMatches(record.id);
        setMatches(data);
      } catch (err) {
        console.log(err);
        setError("データの取得に失敗しました");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [record]);

  if (loading) {
    return <MatchSkeleton enableCreateMatchModalButton={enableCreateMatchModalButton} />;
  }

  if (error) {
    return <div className="text-red-500">{error}</div>;
  }

  // フェーズフラグの有無でセクション分けするかを決定
  const orderedItems = (() => {
    if (!matches || matches.length === 0) return [];

    const sections = buildSections(matches);

    const items: Array<
      | { kind: "header"; label: string; id: string }
      | {
          kind: "match";
          match: MatchGetResponseType;
          canMoveUp: boolean;
          canMoveDown: boolean;
        }
    > = [];

    sections.forEach((section, sectionIdx) => {
      if (section.label) {
        items.push({
          kind: "header",
          label: section.label,
          id: `section-${section.key}`,
        });
      }

      section.items.forEach((match, itemIdx) => {
        items.push({
          kind: "match",
          match,
          canMoveUp: !(sectionIdx === 0 && itemIdx === 0),
          canMoveDown: !(
            sectionIdx === sections.length - 1 &&
            itemIdx === section.items.length - 1
          ),
        });
      });
    });

    return items;
  })();

  // 並び替え結果をAPIへ反映する。失敗時は直前の状態に戻す。
  const handleMove = async (matchId: string, direction: "up" | "down") => {
    if (!matches || !record) return;

    const reordered = moveMatch(matches, matchId, direction);
    if (!reordered) return;

    const previous = matches;
    setMatches(reordered);

    try {
      const body: { matches: MatchOrderItemType[] } = {
        matches: reordered.map((m) => ({
          id: m.id,
          qualifying_round_flg: m.qualifying_round_flg,
          final_tournament_flg: m.final_tournament_flg,
        })),
      };

      const res = await fetch(`/api/records/${record.id}/matches/order`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        throw new Error(`HTTP error: ${res.status}`);
      }
    } catch (err) {
      console.error(err);
      setMatches(previous);

      addToast({
        title: "並び替えに失敗",
        description: "対戦結果の並び替えに失敗しました",
        color: "danger",
        timeout: 5000,
      });
    }
  };

  return (
    <>
      <UpdateMatchModal
        match={selectedMatch}
        setMatches={setMatches}
        isOpen={isOpenForUpdateMatchModal && enableUpdateMatchModalButton}
        onOpenChange={onOpenChangeForUpdateMatchModal}
        onClose={onCloseForUpdateMatchModal}
      />

      <DisplayMatchMemoModal
        match={selectedMatch}
        isOpen={isOpenForDisplayMatchMemoModal}
        onOpenChange={onOpenChangeForDisplayMatchMemoModal}
      />

      <div>
        <Card>
          <CardBody className="px-2 py-2 w-full">
            <div className="flex flex-col gap-1.5 w-full">
              <div ref={matchCardRef} className="p-1">
                <Card>
                  <CardBody
                    className={`px-0 py-0.5 ${matches && matches.length === 0 ? "min-h-28" : ""} w-full`}
                  >
                    {matches && matches.length !== 0 ? (
                      <div className="px-0 py-0 w-full">
                        <Table
                          isStriped
                          hideHeader
                          aria-label="対戦結果"
                          className=""
                          classNames={{
                            wrapper: "p-1.5 shadow-none overflow-x-hidden",
                            table: "",
                            th: "px-0 py-0",
                            td: "px-0 py-0",
                          }}
                        >
                          <TableHeader>
                            <TableColumn>対戦結果</TableColumn>
                          </TableHeader>
                          <TableBody>
                            {orderedItems.map((item, index) => {
                              if (item.kind === "header") {
                                return (
                                  <TableRow
                                    key={item.id}
                                    className="bg-content1! hover:bg-content1! cursor-default"
                                  >
                                    <TableCell className={`px-2 pb-1.5 ${index === 0 ? "pt-1.5" : "pt-6"}`}>
                                      <div className="flex items-center gap-2">
                                        <div className="flex-1 h-px bg-default-200" />
                                        <span className="text-[10px] font-bold text-default-400">
                                          {item.label}
                                        </span>
                                        <div className="flex-1 h-px bg-default-200" />
                                      </div>
                                    </TableCell>
                                  </TableRow>
                                );
                              }

                              const { match, canMoveUp, canMoveDown } = item;
                              return (
                                <TableRow key={match.id}>
                                  <TableCell>
                                  <div className="flex items-center gap-1 w-full">
                                    {/*
                                      並び替えボタンが表示される場合のみガターを描画する。
                                      BO1/チーム戦に関わらず同じ位置にボタンを表示する。
                                      data-capture-hide は画像保存時にこの要素ごと除去する対象の目印。
                                    */}
                                    {enableUpdateMatchModalButton && (
                                      <div
                                        className="flex flex-col gap-1.5 shrink-0 pt-1 pb-1 items-start pl-1.5 w-8"
                                        data-capture-hide="true"
                                      >
                                        <Button
                                          isIconOnly
                                          size="sm"
                                          variant="flat"
                                          radius="md"
                                          className="min-w-6 w-6 h-6"
                                          isDisabled={!canMoveUp}
                                          aria-label="上に移動"
                                          onPress={() => handleMove(match.id, "up")}
                                        >
                                          <LuChevronUp className="text-lg" />
                                        </Button>
                                        <Button
                                          isIconOnly
                                          size="sm"
                                          variant="flat"
                                          radius="md"
                                          className="min-w-6 w-6 h-6"
                                          isDisabled={!canMoveDown}
                                          aria-label="下に移動"
                                          onPress={() => handleMove(match.id, "down")}
                                        >
                                          <LuChevronDown className="text-lg" />
                                        </Button>
                                      </div>
                                    )}
                                    <Button
                                      radius="md"
                                      variant="light"
                                      className="pl-3 pr-1 py-8 w-full"
                                      onPress={() => {
                                        setSelectedMatch(match);
                                        // 編集可能な場合は編集モーダル、
                                        // それ以外でメモがある場合はメモ表示モーダルを開く
                                        if (enableUpdateMatchModalButton) {
                                          onOpenForUpdateMatchModal();
                                        } else if (match.memo && match.memo !== "") {
                                          onOpenForDisplayMatchMemoModal();
                                        }
                                      }}
                                    >
                                      <div className="flex flex-wrap items-center gap-1.5 w-full">
                                        {/* チーム戦は個人とチームの勝敗を並べて表示、BO1は個人の勝敗のみ */}
                                        {match.group_match_flg ? (
                                          <div className="flex shrink-0 items-stretch gap-1.5">
                                            <div className="flex flex-col items-center gap-1">
                                              <span className="text-[9px] leading-none text-default-400">
                                                個人
                                              </span>
                                              <span className="text-base leading-none">
                                                {match.victory_flg === true ? "⭕" : "❌"}
                                              </span>
                                            </div>
                                            <div className="flex flex-col items-center gap-1">
                                              <span className="text-[9px] leading-none text-default-400">
                                                チーム
                                              </span>
                                              <span className="text-base leading-none">
                                                {match.group_match_victory_flg
                                                  ? "⭕"
                                                  : "❌"}
                                              </span>
                                            </div>
                                          </div>
                                        ) : (
                                          // チーム戦の「チーム」列と同じ位置に勝敗が来るよう、
                                          // 「個人」列と同じ構造を invisible で幅だけ確保して揃える
                                          <div className="flex shrink-0 items-stretch gap-1.5">
                                            <div className="flex flex-col items-center gap-1 invisible">
                                              <span className="text-[9px] leading-none">
                                                個人
                                              </span>
                                              <span className="text-base leading-none">
                                                ⭕
                                              </span>
                                            </div>
                                            <div className="flex flex-col items-center gap-1">
                                              <span className="text-[9px] leading-none text-default-400 invisible">
                                                チーム
                                              </span>
                                              <span className="text-base leading-none">
                                                {match.victory_flg === true ? "⭕" : "❌"}
                                              </span>
                                            </div>
                                          </div>
                                        )}

                                        <div className="flex items-center gap-1.5 flex-1 min-w-0">
                                          {match.default_victory_flg ||
                                          match.default_defeat_flg ? (
                                            <>
                                              <>
                                                <div className="flex items-center gap-0 shrink-0">
                                                  <Image
                                                    alt="unknown"
                                                    src="https://xx8nnpgt.user.webaccel.jp/images/pokemon-sprites/unknown.png"
                                                    className="w-11 h-11 object-contain scale-150 origin-bottom"
                                                  />

                                                  <Image
                                                    alt="unknown"
                                                    src="https://xx8nnpgt.user.webaccel.jp/images/pokemon-sprites/unknown.png"
                                                    className="w-11 h-11 object-contain scale-150 origin-bottom"
                                                  />
                                                </div>
                                              </>

                                              <div className="flex flex-col justify-center gap-1 min-w-0 flex-1">
                                                <div className="min-w-0">
                                                  <div className="font-bold truncate text-left">
                                                    {match.default_victory_flg
                                                      ? "不戦勝"
                                                      : "不戦敗"}
                                                  </div>
                                                  <div className="mt-0.5 flex flex-wrap items-center gap-1">
                                                    {match.group_match_flg && (
                                                      <Chip
                                                        size="sm"
                                                        variant="flat"
                                                        radius="sm"
                                                        color="secondary"
                                                        classNames={{
                                                          base: "h-4 px-1",
                                                          content:
                                                            "px-1 text-[8px] font-bold",
                                                        }}
                                                      >
                                                        チーム戦
                                                      </Chip>
                                                    )}
                                                  </div>
                                                </div>
                                              </div>
                                            </>
                                          ) : (
                                            <>
                                              <>
                                                <div className="flex items-center gap-0 shrink-0">
                                                  {match.pokemon_sprites[0] ? (
                                                    <Image
                                                      alt={match.pokemon_sprites[0].id.replace(
                                                        /^0+(?!$)/,
                                                        "",
                                                      )}
                                                      src={`https://xx8nnpgt.user.webaccel.jp/images/pokemon-sprites/${match.pokemon_sprites[0].id.replace(/^0+(?!$)/, "")}.png`}
                                                      className={`w-11 h-11 object-contain ${spriteScaleClass(match.pokemon_sprites[0].id)} origin-bottom`}
                                                    />
                                                  ) : (
                                                    <Image
                                                      alt="unknown"
                                                      src="https://xx8nnpgt.user.webaccel.jp/images/pokemon-sprites/unknown.png"
                                                      className="w-11 h-11 object-contain scale-150 origin-bottom"
                                                    />
                                                  )}

                                                  {match.pokemon_sprites[1] ? (
                                                    <Image
                                                      alt={match.pokemon_sprites[1].id.replace(
                                                        /^0+(?!$)/,
                                                        "",
                                                      )}
                                                      src={`https://xx8nnpgt.user.webaccel.jp/images/pokemon-sprites/${match.pokemon_sprites[1].id.replace(/^0+(?!$)/, "")}.png`}
                                                      className={`w-11 h-11 object-contain ${spriteScaleClass(match.pokemon_sprites[1].id)} origin-bottom`}
                                                    />
                                                  ) : (
                                                    <Image
                                                      alt="unknown"
                                                      src="https://xx8nnpgt.user.webaccel.jp/images/pokemon-sprites/unknown.png"
                                                      className="w-11 h-11 object-contain scale-150 origin-bottom "
                                                    />
                                                  )}
                                                </div>
                                              </>

                                              <div className="flex flex-col justify-center gap-1 min-w-0 flex-1">
                                                <div className="min-w-0">
                                                  <div className="font-bold truncate text-left">
                                                    {match.opponents_deck_info}
                                                  </div>

                                                  {/* 種別・先後・サイド数を chip で表示（種別を先頭に配置） */}
                                                  <div className="mt-1 flex flex-wrap items-center gap-1">
                                                    {match.group_match_flg && (
                                                      <Chip
                                                        size="sm"
                                                        variant="flat"
                                                        radius="sm"
                                                        color="secondary"
                                                        classNames={{
                                                          base: "h-4 px-1",
                                                          content:
                                                            "px-1 text-[8px] font-bold",
                                                        }}
                                                      >
                                                        チーム戦
                                                      </Chip>
                                                    )}
                                                    <Chip
                                                      size="sm"
                                                      variant="flat"
                                                      radius="sm"
                                                      classNames={{
                                                        base: "h-4 px-1",
                                                        content:
                                                          "px-1 text-[8px] font-bold",
                                                      }}
                                                    >
                                                      {match.games[0].go_first
                                                        ? "先攻"
                                                        : "後攻"}
                                                    </Chip>
                                                    <Chip
                                                      size="sm"
                                                      variant="flat"
                                                      radius="sm"
                                                      classNames={{
                                                        base: "h-4 px-1",
                                                        content:
                                                          "px-1 text-[8px] font-bold",
                                                      }}
                                                    >
                                                      {match.games[0].your_prize_cards}
                                                      {" - "}
                                                      {match.games[0].opponents_prize_cards}
                                                    </Chip>
                                                  </div>
                                                </div>
                                              </div>
                                            </>
                                          )}
                                        </div>

                                        {/* メモがある場合は右端にアイコンを表示 */}
                                        {match.memo && match.memo !== "" && (
                                          <LuStickyNote className="ml-auto mr-0.5 shrink-0 text-lg text-default-400" />
                                        )}
                                      </div>
                                    </Button>
                                  </div>
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center gap-5 py-8 px-4">
                        <div className="flex items-center justify-center w-16 h-16 rounded-full bg-default-100">
                          <LuSwords className="text-3xl text-default-400" />
                        </div>
                        <div className="flex flex-col items-center gap-1.5 text-center">
                          <div className="font-bold text-sm text-default-600">
                            対戦結果がありません
                          </div>
                          <div className="text-tiny text-default-400 max-w-75">
                            {enableCreateMatchModalButton
                              ? "対戦を記録して勝率や傾向を把握しましょう！"
                              : "このイベントの対戦結果は登録されていません"}
                          </div>
                        </div>
                        {enableCreateMatchModalButton && (
                          <CreateMatchModalButton
                            record={record}
                            setMatches={setMatches}
                          />
                        )}
                      </div>
                    )}
                  </CardBody>
                </Card>
              </div>

              {matches && matches.length !== 0 && enableCreateMatchModalButton && (
                <CreateMatchModalButton record={record} setMatches={setMatches} />
              )}
            </div>
          </CardBody>
        </Card>
      </div>
    </>
  );
}
