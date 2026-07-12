"use client";

import { useState, type RefObject, type Dispatch, type SetStateAction } from "react";

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
import GameStreak from "@app/components/organisms/Match/GameStreak";
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
  qualifying: "予選",
  final: "本戦",
  other: "その他",
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
  const sectionIndex = sections.findIndex((s) => s.items.some((m) => m.id === matchId));
  if (sectionIndex === -1) return null;

  const section = sections[sectionIndex];
  const itemIndex = section.items.findIndex((m) => m.id === matchId);

  if (direction === "up") {
    if (itemIndex > 0) {
      const items = [...section.items];
      [items[itemIndex - 1], items[itemIndex]] = [items[itemIndex], items[itemIndex - 1]];
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
      [items[itemIndex], items[itemIndex + 1]] = [items[itemIndex + 1], items[itemIndex]];
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

// 対戦結果1行の背景グラデーション(勝ち=緑・負け=赤)。
// 通常戦: 勝敗色を左からやわらかく敷き、右へフェードする。
// チーム戦: 左をチーム勝敗、右を個人勝敗の色とし、中央で両色が混ざり合うようにする。
// ※ Tailwind は動的なクラス名を検出できないため、全パターンをリテラルで列挙する。
function matchRowGradientClass(match: MatchGetResponseType): string {
  if (match.group_match_flg) {
    const team = match.group_match_victory_flg;
    const indiv = match.victory_flg;
    if (team && indiv)
      return "bg-linear-to-r from-success/10 to-success/10 dark:from-success/15 dark:to-success/15";
    if (team && !indiv)
      return "bg-linear-to-r from-success/15 to-danger/15 dark:from-success/20 dark:to-danger/20";
    if (!team && indiv)
      return "bg-linear-to-r from-danger/15 to-success/15 dark:from-danger/20 dark:to-success/20";
    return "bg-linear-to-r from-danger/10 to-danger/10 dark:from-danger/15 dark:to-danger/15";
  }
  return match.victory_flg
    ? "bg-linear-to-r from-success/10 to-transparent dark:from-success/15"
    : "bg-linear-to-r from-danger/10 to-transparent dark:from-danger/15";
}

type Props = {
  record: RecordGetByIdResponseType | null;
  // 対戦一覧は親で一元管理する(ヒーローの戦績と同じデータソースを共有し、
  // 追加・更新・削除・並び替えを即座に戦績へ反映させるため)
  matches: MatchGetResponseType[] | null;
  setMatches: Dispatch<SetStateAction<MatchGetResponseType[] | null>>;
  loading: boolean;
  enableCreateMatchModalButton: boolean;
  enableUpdateMatchModalButton: boolean;
  matchCardRef?: RefObject<HTMLDivElement | null>;
  // ボードのパネル内に置く場合は true。外側のカード枠(border/bg/影)を外す。
  flat?: boolean;
};

export default function Matches({
  record,
  matches,
  setMatches,
  loading,
  enableCreateMatchModalButton,
  enableUpdateMatchModalButton,
  matchCardRef,
  flat = false,
}: Props) {
  const [selectedMatch, setSelectedMatch] = useState<MatchGetResponseType | null>(null);

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

  if (loading) {
    return (
      <MatchSkeleton
        enableCreateMatchModalButton={enableCreateMatchModalButton}
        enableUpdateMatchModalButton={enableUpdateMatchModalButton}
        flat={flat}
      />
    );
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
            sectionIdx === sections.length - 1 && itemIdx === section.items.length - 1
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
        <Card className={flat ? "bg-transparent shadow-none" : ""}>
          <CardBody className={`${flat ? "p-0" : "px-1 py-1"} w-full`}>
            <div className="flex flex-col gap-1.5 w-full">
              <div ref={matchCardRef} className={flat ? "" : "p-1"}>
                <Card className={flat ? "bg-transparent shadow-none" : ""}>
                  <CardBody
                    className={`px-0 py-0.5 ${matches && matches.length === 0 ? "min-h-28" : ""} w-full`}
                  >
                    {matches && matches.length !== 0 ? (
                      <div className="px-0 py-0 w-full">
                        <Table
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
                                    <TableCell
                                      className={`px-2 pb-1.5 ${index === 0 ? "pt-1.5" : "pt-6"}`}
                                    >
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
                              // 連続する対戦行の間だけ区切り線を引く(先頭・見出し直後は引かない)
                              const showDivider =
                                index > 0 && orderedItems[index - 1].kind === "match";
                              return (
                                <TableRow key={match.id}>
                                  <TableCell
                                    className={
                                      showDivider ? "border-t border-divider" : ""
                                    }
                                  >
                                    {/* 勝敗でグラデ(勝ち=緑・負け=赤)。通常戦は左から敷いて右へフェード、
                                        チーム戦は左=チーム勝敗・右=個人勝敗の2色で表す。 */}
                                    <div
                                      className={`flex w-full items-center gap-1 rounded-lg ${matchRowGradientClass(
                                        match,
                                      )}`}
                                    >
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
                                            // チーム戦はチーム/個人の2勝敗をラベル付きバッジで並べる
                                            <div className="flex shrink-0 items-end gap-1.5">
                                              <div className="flex flex-col items-center gap-0.5">
                                                <span className="text-[9px] leading-none text-default-400">
                                                  チーム
                                                </span>
                                                <span
                                                  className={`flex h-7 w-7 items-center justify-center rounded-lg text-sm font-bold ${
                                                    match.group_match_victory_flg
                                                      ? "bg-success/15 text-success"
                                                      : "bg-danger/15 text-danger"
                                                  }`}
                                                >
                                                  {match.group_match_victory_flg
                                                    ? "W"
                                                    : "L"}
                                                </span>
                                              </div>
                                              <div className="flex flex-col items-center gap-0.5">
                                                <span className="text-[9px] leading-none text-default-400">
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
                                                match.victory_flg
                                                  ? "bg-success/15 text-success"
                                                  : "bg-danger/15 text-danger"
                                              }`}
                                            >
                                              {match.victory_flg ? "W" : "L"}
                                            </span>
                                          )}

                                          <div className="flex items-center gap-1.5 flex-1 min-w-0">
                                            {match.default_victory_flg ||
                                            match.default_defeat_flg ? (
                                              <>
                                                <>
                                                  <div className="flex items-center gap-0 shrink-0 ml-1.5">
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
                                                  <div className="flex items-center gap-0 shrink-0 ml-1.5">
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
                                                      {match.bo3_flg ? (
                                                        // BO3は複数ゲームあるため、勝敗の推移(W/L)と各ゲームの先後をまとめて表示する
                                                        <>
                                                          <Chip
                                                            size="sm"
                                                            variant="flat"
                                                            radius="sm"
                                                            color="primary"
                                                            classNames={{
                                                              base: "h-4 px-1",
                                                              content:
                                                                "px-1 text-[8px] font-bold",
                                                            }}
                                                          >
                                                            BO3
                                                          </Chip>
                                                          {/* 勝敗の推移（1本目→3本目の順にW/Lを並べる） */}
                                                          <Chip
                                                            size="sm"
                                                            variant="flat"
                                                            radius="sm"
                                                            classNames={{
                                                              base: "h-4 px-1",
                                                              content: "px-1",
                                                            }}
                                                          >
                                                            <GameStreak
                                                              games={match.games}
                                                              size={11}
                                                            />
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
                                                            {match.games
                                                              .map((game) =>
                                                                game.go_first
                                                                  ? "先攻"
                                                                  : "後攻",
                                                              )
                                                              .join(" / ")}
                                                          </Chip>
                                                        </>
                                                      ) : (
                                                        <>
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
                                                            {match.games[0]?.go_first
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
                                                            {match.games[0]
                                                              ?.your_prize_cards ?? 0}
                                                            {" - "}
                                                            {match.games[0]
                                                              ?.opponents_prize_cards ??
                                                              0}
                                                          </Chip>
                                                        </>
                                                      )}
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
                // flat(戦績カード内のパネル)ではパネル端に接しないよう、
                // 左右はテーブルの p-1.5 インセットに合わせ、下は少し広めに余白を持たせる。
                // ボタンは横幅いっぱい＋縦を高めにして押しやすくする。
                <div className={flat ? "px-1.5 pb-3" : ""}>
                  <CreateMatchModalButton
                    record={record}
                    setMatches={setMatches}
                    fullWidth={flat}
                  />
                </div>
              )}
            </div>
          </CardBody>
        </Card>
      </div>
    </>
  );
}
