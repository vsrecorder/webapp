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

import { spriteScaleClass } from "@app/utils/sprite";
import { Card, CardBody } from "@heroui/react";

import { useDisclosure } from "@heroui/react";

import { LuStickyNote } from "react-icons/lu";

import UpdateMatchModal from "@app/components/organisms/Match/Modal/UpdateMatchModal";
import DisplayMatchMemoModal from "@app/components/organisms/Match/Modal/DisplayMatchMemoModal";
import CreateMatchModalButton from "@app/components/organisms/Match/CreateMatchModalButton";
import MatchSkeleton from "@app/components/organisms/Match/Skeleton/MatchSkeleton";

import { RecordGetByIdResponseType } from "@app/types/record";
import { MatchGetResponseType } from "@app/types/match";

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
                          {matches && matches.length !== 0 ? (
                            matches.map((match) => (
                              <TableRow key={match.id}>
                                <TableCell>
                                  <Button
                                    radius="md"
                                    variant="light"
                                    className="pl-3 pr-2 py-6 w-full"
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
                                    <div className="flex items-center gap-3 w-full">
                                      <div>
                                        {match.victory_flg === true ? "⭕" : "❌"}
                                      </div>

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

                                            <div className="font-bold truncate">
                                              {match.default_victory_flg
                                                ? "不戦勝"
                                                : "不戦敗"}
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

                                                <div className="flex gap-1">
                                                  <div className="text-xs text-default-400">
                                                    {match.games[0].go_first
                                                      ? "先攻"
                                                      : "後攻"}
                                                  </div>
                                                  <div className="text-xs text-default-400">
                                                    {match.games[0].your_prize_cards}
                                                    {" - "}
                                                    {match.games[0].opponents_prize_cards}
                                                  </div>
                                                </div>
                                              </div>
                                            </div>
                                          </>
                                        )}
                                      </div>

                                      {/* メモがある場合は右端にアイコンを表示 */}
                                      {match.memo && match.memo !== "" && (
                                        <LuStickyNote className="ml-auto shrink-0 text-lg text-default-400" />
                                      )}
                                    </div>
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))
                          ) : (
                            <TableRow>
                              <TableCell>
                                <div className="pt-10 text-center">
                                  対戦結果がありません
                                </div>
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </CardBody>
                </Card>
              </div>

              {enableCreateMatchModalButton && (
                <CreateMatchModalButton record={record} setMatches={setMatches} />
              )}
            </div>
          </CardBody>
        </Card>
      </div>
    </>
  );
}
