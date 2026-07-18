"use client";

import { useCallback, useEffect, useState } from "react";

import Link from "next/link";
import NextLink from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

import { Card, CardBody, CardHeader } from "@heroui/react";
import { Chip, Tabs, Tab, useDisclosure, addToast } from "@heroui/react";
import { Link as HeroLink } from "@heroui/react";
import { Dropdown, DropdownTrigger, DropdownMenu, DropdownItem } from "@heroui/dropdown";
import { Snippet } from "@heroui/react";

import { LuCalendar } from "react-icons/lu";
import { LuChevronLeft } from "react-icons/lu";
import { LuSwords } from "react-icons/lu";
import { LuFilePen } from "react-icons/lu";
import { LuBookPlus } from "react-icons/lu";
import { LuLayers } from "react-icons/lu";
import { LuSquarePen } from "react-icons/lu";
import { LuFolderInput } from "react-icons/lu";
import { LuFolderOutput } from "react-icons/lu";
import { LuTrash2 } from "react-icons/lu";
import { LuEllipsis } from "react-icons/lu";
import { LuLink } from "react-icons/lu";
import { LuCopy } from "react-icons/lu";
import { LuCheck } from "react-icons/lu";

import PokemonSprite from "@app/components/atoms/PokemonSprite";
import DeckCodeCard from "@app/components/organisms/Deck/DeckCodeCard";
import DeckCardDetailRow from "@app/components/organisms/Deck/DeckCardDetailRow";
import DeckOpponentAnalysisPanel from "@app/components/organisms/Deck/DeckOpponentAnalysisPanel";
import Records from "@app/components/organisms/Record/Records";
import FetchError from "@app/components/molecules/FetchError";

import UpdateDeckModal from "@app/components/organisms/Deck/Modal/UpdateDeckModal";
import CreateDeckCodeModal from "@app/components/organisms/Deck/Modal/CreateDeckCodeModal";
import DeleteDeckModal from "@app/components/organisms/Deck/Modal/DeleteDeckModal";
import ArchiveDeckModal from "@app/components/organisms/Deck/Modal/ArchiveDeckModal";
import UnarchiveDeckModal from "@app/components/organisms/Deck/Modal/UnarchiveDeckModal";

import { useDeckCodes, getDeckCodeVersionNumber } from "@app/hooks/useDeckCodes";

import { DeckGetByIdResponseType } from "@app/types/deck";
import { DeckCodeType } from "@app/types/deck_code";
import { DeckUsageItemType, DeckUsageStatType } from "@app/types/deck_usage_stat";

type RecordTabKey = "all" | "official" | "tonamel" | "unofficial";

// 勝率に応じた色分け（DeckCard/UserStatPanel などの勝率表示と同じ閾値に合わせる）
function winRateTextColor(rate: number): string {
  if (rate >= 0.55) return "text-success";
  if (rate >= 0.45) return "text-default-500";
  if (rate >= 0.4) return "text-warning";
  return "text-danger";
}

// 小数点第1位までフォーマットした数値文字列から、ちょうど割り切れる場合の
// 末尾".0"を取り除く（例: "50.0" → "50", "33.3" はそのまま）
function trimTrailingZeroDecimal(value: string): string {
  return value.endsWith(".0") ? value.slice(0, -2) : value;
}

// 割合(0〜1)を小数点第1位までのパーセント表記にする
function formatPercent(rate: number): string {
  return `${trimTrailingZeroDecimal((rate * 100).toFixed(1))}%`;
}

// 先攻時/後攻時の勝率が、デッキ全体の勝率からどれだけ乖離しているかを
// ポイント差（引き算）で表すラベルと色を算出する。
function formatWinRateDeviation(rate: number, overallWinRate: number) {
  const diffPt = Math.round((rate - overallWinRate) * 1000) / 10;
  const absLabel = trimTrailingZeroDecimal(Math.abs(diffPt).toFixed(1));

  return {
    label: diffPt === 0 ? "±0" : diffPt > 0 ? `+${absLabel}` : `-${absLabel}`,
    colorClass:
      diffPt > 0 ? "text-success" : diffPt < 0 ? "text-danger" : "text-default-400",
  };
}

// デッキ本体を取得する。
async function fetchDeckById(id: string): Promise<DeckGetByIdResponseType> {
  const res = await fetch(`/api/decks/${id}`, {
    cache: "no-store",
    method: "GET",
    headers: { Accept: "application/json" },
  });

  if (!res.ok) {
    throw new Error("Failed to fetch");
  }

  return res.json();
}

// このデッキの全期間の対戦数・勝率・先攻/後攻情報を取得する。
// deck-usage は全デッキ分をまとめて返すため、対象デッキ分だけ抜き出す。
// 対戦記録が無いデッキは結果に含まれないため null を返す。
async function fetchDeckUsageStat(
  userId: string,
  deckId: string,
): Promise<DeckUsageItemType | null> {
  try {
    const res = await fetch(`/api/users/${userId}/deck-usage?all_time=true`, {
      cache: "no-store",
      method: "GET",
      headers: { Accept: "application/json" },
    });

    if (!res.ok) return null;

    const stat: DeckUsageStatType = await res.json();

    return stat.decks.find((d) => d.deck_id === deckId) ?? null;
  } catch {
    return null;
  }
}

type Props = {
  id: string;
};

export default function DeckById({ id }: Props) {
  const router = useRouter();
  const { data: session } = useSession();
  const userId = session?.user?.id;

  const [deck, setDeck] = useState<DeckGetByIdResponseType | null>(null);
  // 画面上部に表示する代表デッキコード（＝最新バージョン）。
  const [deckcode, setDeckCode] = useState<DeckCodeType | null>(null);
  const [usageStat, setUsageStat] = useState<DeckUsageItemType | null>(null);

  const [loading, setLoading] = useState(true);
  const [deckError, setDeckError] = useState(false);

  const [recordTab, setRecordTab] = useState<RecordTabKey>("all");

  // このページの絶対URL（NFCタグに書き込む用途でコピーできるようにする）。
  // window はクライアントでのみ参照できるため、マウント後に組み立てる。
  const [pageUrl, setPageUrl] = useState("");
  const [copied, setCopied] = useState(false);

  // 各操作モーダルの開閉状態
  const {
    isOpen: isOpenForUpdateDeckModal,
    onOpen: onOpenForUpdateDeckModal,
    onOpenChange: onOpenChangeForUpdateDeckModal,
  } = useDisclosure();
  const {
    isOpen: isOpenForCreateDeckCodeModal,
    onOpen: onOpenForCreateDeckCodeModal,
    onOpenChange: onOpenChangeForCreateDeckCodeModal,
  } = useDisclosure();
  const {
    isOpen: isOpenForDeleteDeckModal,
    onOpen: onOpenForDeleteDeckModal,
    onOpenChange: onOpenChangeForDeleteDeckModal,
  } = useDisclosure();
  const {
    isOpen: isOpenForArchiveDeckModal,
    onOpen: onOpenForArchiveDeckModal,
    onOpenChange: onOpenChangeForArchiveDeckModal,
  } = useDisclosure();
  const {
    isOpen: isOpenForUnarchiveDeckModal,
    onOpen: onOpenForUnarchiveDeckModal,
    onOpenChange: onOpenChangeForUnarchiveDeckModal,
  } = useDisclosure();

  // このデッキの全バージョン（デッキコード）。バージョン履歴と件数の表示に使う。
  const { deckcodes } = useDeckCodes(deck?.id, deckcode?.id);
  const versionCount = deckcodes?.length ?? null;

  const loadDeck = useCallback(async () => {
    if (!id) return;

    setDeckError(false);
    setLoading(true);

    try {
      const data = await fetchDeckById(id);
      setDeck(data);
      setDeckCode(data.latest_deck_code ?? null);
    } catch (err) {
      console.log(err);
      setDeckError(true);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadDeck();
  }, [loadDeck]);

  // 対戦成績（勝率など）は userId とデッキ確定後に取得する。
  useEffect(() => {
    if (!userId || !deck) return;
    let cancelled = false;

    fetchDeckUsageStat(userId, deck.id).then((stat) => {
      if (!cancelled) setUsageStat(stat);
    });

    return () => {
      cancelled = true;
    };
  }, [userId, deck]);

  // 削除・アーカイブ操作の完了後はデッキ一覧へ戻す（このデッキはもう表示できないため）。
  const handleRemove = useCallback(() => {
    router.push("/decks");
  }, [router]);

  // このデッキ詳細ページの絶対URLを組み立てる（クエリは含めず正規のパスにする）。
  useEffect(() => {
    if (!deck) return;
    setPageUrl(`${window.location.origin}/decks/${deck.id}`);
  }, [deck]);

  // ページURLをクリップボードへコピーする。NFCタグへの書き込みに使ってもらう。
  const handleCopyUrl = useCallback(async () => {
    if (!pageUrl) return;
    try {
      await navigator.clipboard.writeText(pageUrl);
      setCopied(true);
      addToast({ title: "URLをコピーしました", color: "success", timeout: 2000 });
      setTimeout(() => setCopied(false), 1500);
    } catch {
      addToast({ title: "コピーに失敗しました", color: "danger", timeout: 3000 });
    }
  }, [pageUrl]);

  if (loading) {
    return (
      <div className="flex justify-center py-16 text-default-400">読み込み中...</div>
    );
  }

  if (deckError) {
    return <FetchError onRetry={loadDeck} />;
  }

  if (!deck) {
    return null;
  }

  const createdDate = new Date(deck.created_at).toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short",
  });

  // archived_atがゼロ値(年が1)なら未アーカイブ
  const isArchived = new Date(deck.archived_at).getFullYear() !== 1;

  // 対戦成績の各種指標
  const hasStats = !!usageStat && usageStat.count > 0;
  const winRate = usageStat?.win_rate ?? 0;
  const ignoredCount = usageStat?.ignored_count ?? 0;

  const goFirstHasStats = !!usageStat && usageStat.go_first_count > 0;
  const goSecondHasStats = !!usageStat && usageStat.go_second_count > 0;

  const goFirstDeviation =
    goFirstHasStats &&
    usageStat!.go_first_win_rate > 0 &&
    usageStat!.go_first_win_rate < 1
      ? formatWinRateDeviation(usageStat!.go_first_win_rate, usageStat!.win_rate)
      : null;
  const goSecondDeviation =
    goSecondHasStats &&
    usageStat!.go_second_win_rate > 0 &&
    usageStat!.go_second_win_rate < 1
      ? formatWinRateDeviation(usageStat!.go_second_win_rate, usageStat!.win_rate)
      : null;

  const ringRadius = 26;
  const ringCircumference = 2 * Math.PI * ringRadius;

  return (
    <div className="pb-3 mx-auto flex w-full max-w-2xl flex-col gap-3">
      {/* 戻る導線：デッキ一覧へ。スクロールしても追従させる。 */}
      <div className="sticky top-14 z-40 -mx-2 lg:top-28">
        <div className="absolute inset-0 border-b border-default-200/60 bg-white/90 backdrop-blur-md dark:bg-neutral-950/90" />
        <HeroLink
          as={NextLink}
          href="/decks"
          className="relative w-fit gap-0.5 px-2.5 py-2 font-bold text-tiny text-default-600"
        >
          <LuChevronLeft />
          <span>デッキ一覧</span>
        </HeroLink>
      </div>

      {/* ヘッダー：スプライト・デッキ名・登録日・アーカイブ状態 */}
      <Card className="w-full">
        <CardHeader className="flex flex-col items-center gap-1.5 px-3 pt-4 pb-3">
          <div className="flex items-center gap-0 shrink-0">
            <PokemonSprite id={deck.pokemon_sprites[0]?.id} size={52} />
            <PokemonSprite id={deck.pokemon_sprites[1]?.id} size={52} />
          </div>
          <div className="w-full min-w-0 truncate text-center font-bold text-xl">
            {deck.name}
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2">
            <span className="flex items-center gap-1 text-tiny text-default-400">
              <LuCalendar className="text-xs" />
              {createdDate} 登録
            </span>
            {isArchived && (
              <Chip
                size="sm"
                variant="flat"
                color="warning"
                className="h-5 text-[10px] font-bold"
              >
                アーカイブ済み
              </Chip>
            )}
          </div>
        </CardHeader>
      </Card>

      {/* 操作：記録する・新バージョン・編集・その他 */}
      <div className="grid grid-cols-4 gap-1.5">
        {isArchived ? (
          <div className="flex flex-col items-center justify-center gap-1 rounded-xl bg-default-50 py-2.5 text-default-300">
            <LuFilePen className="text-base" />
            <span className="text-tiny font-medium">記録する</span>
          </div>
        ) : (
          <Link
            href={`/records/create?deck_id=${deck.id}${deckcode?.id ? `&deck_code_id=${deckcode.id}` : ""}`}
            className="flex flex-col items-center justify-center gap-1 rounded-xl bg-primary py-2.5 text-white active:opacity-85"
          >
            <LuFilePen className="text-base" />
            <span className="text-tiny font-bold">記録する</span>
          </Link>
        )}

        {isArchived ? (
          <div className="flex flex-col items-center justify-center gap-1 rounded-xl bg-default-50 py-2.5 text-default-300">
            <LuBookPlus className="text-base" />
            <span className="text-tiny font-medium">新バージョン</span>
          </div>
        ) : (
          <button
            type="button"
            onClick={onOpenForCreateDeckCodeModal}
            className="flex flex-col items-center justify-center gap-1 rounded-xl bg-default-100 py-2.5 active:opacity-70"
          >
            <LuBookPlus className="text-base" />
            <span className="text-tiny font-medium">新バージョン</span>
          </button>
        )}

        <button
          type="button"
          onClick={onOpenForUpdateDeckModal}
          className="flex flex-col items-center justify-center gap-1 rounded-xl bg-default-100 py-2.5 active:opacity-70"
        >
          <LuSquarePen className="text-base" />
          <span className="text-tiny font-medium">編集</span>
        </button>

        <Dropdown placement="bottom-end">
          <DropdownTrigger>
            <button
              type="button"
              className="flex flex-col items-center justify-center gap-1 rounded-xl bg-default-100 py-2.5 text-default-500 active:opacity-70"
            >
              <LuEllipsis className="text-base" />
              <span className="text-tiny font-medium">その他</span>
            </button>
          </DropdownTrigger>
          <DropdownMenu aria-label="デッキの操作">
            <DropdownItem
              key="archive-toggle"
              startContent={isArchived ? <LuFolderOutput /> : <LuFolderInput />}
              onPress={
                isArchived ? onOpenForUnarchiveDeckModal : onOpenForArchiveDeckModal
              }
            >
              {isArchived ? "整理を解除する" : "整理する"}
            </DropdownItem>
            <DropdownItem
              key="delete"
              color="danger"
              className="text-danger"
              startContent={<LuTrash2 />}
              onPress={onOpenForDeleteDeckModal}
            >
              このデッキを削除する
            </DropdownItem>
          </DropdownMenu>
        </Dropdown>
      </div>

      {/* ページURLのワンタップコピー。NFCタグに書き込んでおくと、かざすだけで
          このデッキ詳細ページを開き、そのまま記録を追加できる。 */}
      <button
        type="button"
        onClick={handleCopyUrl}
        aria-label="このページのURLをコピー"
        className="flex w-full items-center gap-2.5 rounded-xl bg-default-100 px-3 py-2.5 text-left transition-colors hover:bg-default-200 active:opacity-80"
      >
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
          <LuLink className="text-base" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-tiny font-bold text-default-600">ページのURLをコピー</div>
          <div className="truncate text-[10px] text-default-400">
            {pageUrl || `/decks/${deck.id}`}
          </div>
        </div>
        {copied ? (
          <LuCheck className="h-4 w-4 shrink-0 text-success" />
        ) : (
          <LuCopy className="h-4 w-4 shrink-0 text-default-400" />
        )}
      </button>
      {/* NFC活用のヒント */}
      <p className="-mt-1.5 px-1 text-[10px] text-default-400">
        NFCタグに書き込むと、かざすだけでこのページを開いて素早く記録を追加できます。
      </p>

      {/* 対戦成績：勝率リング＋戦績＋先攻/後攻の内訳 */}
      <Card className="w-full">
        <CardHeader className="px-3 pt-3 pb-1">
          <span className="font-bold text-medium">対戦成績</span>
        </CardHeader>
        <CardBody className="px-3 pt-1 pb-3 flex flex-col gap-3">
          {hasStats ? (
            <>
              <div className="flex items-center gap-4">
                {/* 勝率リング */}
                <div className="relative h-20 w-20 shrink-0">
                  <svg
                    viewBox="0 0 64 64"
                    className={`h-full w-full ${winRateTextColor(winRate)}`}
                  >
                    <circle
                      cx="32"
                      cy="32"
                      r={ringRadius}
                      fill="none"
                      strokeWidth="7"
                      className="text-default-200"
                      stroke="currentColor"
                    />
                    <circle
                      cx="32"
                      cy="32"
                      r={ringRadius}
                      fill="none"
                      strokeWidth="7"
                      stroke="currentColor"
                      strokeLinecap="round"
                      strokeDasharray={ringCircumference}
                      strokeDashoffset={ringCircumference * (1 - winRate)}
                      transform="rotate(-90 32 32)"
                    />
                  </svg>
                  <div
                    className={`absolute inset-0 flex flex-col items-center justify-center ${winRateTextColor(winRate)}`}
                  >
                    <span className="text-medium font-black leading-none tabular-nums">
                      {formatPercent(winRate)}
                    </span>
                    <span className="text-[9px] font-bold opacity-80">勝率</span>
                  </div>
                </div>

                <div className="flex flex-col gap-0.5">
                  <span className="text-2xl font-black tabular-nums leading-none">
                    {usageStat!.count}
                    <span className="ml-0.5 text-sm font-bold text-default-400">戦</span>
                  </span>
                  <span className="text-tiny tabular-nums text-default-500">
                    {`${usageStat!.wins}勝 ${usageStat!.losses}敗`}
                  </span>
                </div>
              </div>

              {/* 先攻/後攻の内訳 */}
              {usageStat!.game_count > 0 && (
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-lg bg-default-100 px-2.5 py-2">
                    <div className="text-tiny font-bold text-default-600 mb-1">先攻</div>
                    <div className="grid grid-cols-[auto_1fr] items-baseline gap-x-2 gap-y-0.5 text-[11px] tabular-nums">
                      <span className="text-default-400">割合</span>
                      <span className="text-right text-default-600">
                        {usageStat!.go_first_count > 0 ? (
                          <>
                            {formatPercent(usageStat!.go_first_rate)}
                            <span className="text-default-400">
                              （{usageStat!.go_first_count}件）
                            </span>
                          </>
                        ) : (
                          "-"
                        )}
                      </span>
                      <span className="text-default-400">勝率</span>
                      <span
                        className={`text-right font-bold ${goFirstHasStats ? winRateTextColor(usageStat!.go_first_win_rate) : "text-default-500"}`}
                      >
                        {goFirstHasStats
                          ? formatPercent(usageStat!.go_first_win_rate)
                          : "-"}
                        {goFirstDeviation && (
                          <span
                            className={`ml-1 text-[10px] font-semibold ${goFirstDeviation.colorClass}`}
                          >
                            （全体差 {goFirstDeviation.label}）
                          </span>
                        )}
                      </span>
                    </div>
                  </div>
                  <div className="rounded-lg bg-default-100 px-2.5 py-2">
                    <div className="text-tiny font-bold text-default-600 mb-1">後攻</div>
                    <div className="grid grid-cols-[auto_1fr] items-baseline gap-x-2 gap-y-0.5 text-[11px] tabular-nums">
                      <span className="text-default-400">割合</span>
                      <span className="text-right text-default-600">
                        {usageStat!.go_second_count > 0 ? (
                          <>
                            {formatPercent(1 - usageStat!.go_first_rate)}
                            <span className="text-default-400">
                              （{usageStat!.go_second_count}件）
                            </span>
                          </>
                        ) : (
                          "-"
                        )}
                      </span>
                      <span className="text-default-400">勝率</span>
                      <span
                        className={`text-right font-bold ${goSecondHasStats ? winRateTextColor(usageStat!.go_second_win_rate) : "text-default-500"}`}
                      >
                        {goSecondHasStats
                          ? formatPercent(usageStat!.go_second_win_rate)
                          : "-"}
                        {goSecondDeviation && (
                          <span
                            className={`ml-1 text-[10px] font-semibold ${goSecondDeviation.colorClass}`}
                          >
                            （全体差 {goSecondDeviation.label}）
                          </span>
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {ignoredCount > 0 && (
                <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
                  <Chip
                    size="sm"
                    variant="flat"
                    color="warning"
                    className="h-5 text-[10px] font-bold"
                  >
                    ⚠ 集計対象外 {ignoredCount}件
                  </Chip>
                  <span className="text-[10px] text-default-400">
                    勝率などの集計に未反映
                  </span>
                </div>
              )}
            </>
          ) : ignoredCount > 0 ? (
            <div className="flex flex-col items-center gap-2 rounded-lg bg-warning/10 px-3 py-4 text-center">
              <span aria-hidden className="text-base text-warning">
                ⚠
              </span>
              <div className="text-tiny font-bold text-warning">
                集計対象外の記録が{ignoredCount}件あります
              </div>
              <div className="text-[10px] text-default-400">
                勝率・先攻/後攻などの集計には含まれていません
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 rounded-lg bg-default-100 px-3 py-4 text-center">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10">
                <LuSwords className="text-base text-primary" />
              </div>
              <div className="text-tiny font-bold text-default-600">
                まだ対戦記録がありません
              </div>
              <div className="text-[10px] text-default-400">
                対戦を記録すると勝率や先攻・後攻の成績が見られます
              </div>
            </div>
          )}
        </CardBody>
      </Card>

      {/* デッキ画像・デッキコード・カード構成 */}
      <Card className="w-full">
        <CardHeader className="px-3 pt-3 pb-1">
          <span className="font-bold text-medium">最新のデッキ</span>
        </CardHeader>
        <CardBody className="px-3 pt-1 pb-3 flex flex-col gap-3">
          <DeckCodeCard
            deckcode={deckcode}
            totalVersionCount={versionCount}
            onCreateVersion={isArchived ? undefined : onOpenForCreateDeckCodeModal}
            isArchived={isArchived}
          />
          {deckcode?.code && (
            <div className="rounded-xl bg-default-100 p-2">
              <DeckCardDetailRow code={deckcode.code} />
            </div>
          )}
        </CardBody>
      </Card>

      {/* バージョン履歴 */}
      {deckcodes && deckcodes.length > 0 && (
        <Card className="w-full">
          <CardHeader className="px-3 pt-3 pb-1 flex items-center justify-between">
            <span className="font-bold text-medium">バージョン履歴</span>
            <span className="flex items-center gap-1 text-tiny text-default-400">
              <LuLayers className="text-xs" />
              {versionCount}件
            </span>
          </CardHeader>
          <CardBody className="px-3 pt-1 pb-3">
            <ol className="flex flex-col gap-2">
              {deckcodes.map((dc) => {
                const versionNo = getDeckCodeVersionNumber(deckcodes, dc.id);
                const dcDate = new Date(dc.created_at).toLocaleDateString("ja-JP", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                });
                const isCurrent = dc.id === deckcode?.id;

                return (
                  <li
                    key={dc.id}
                    className={`rounded-lg border px-3 py-2 ${isCurrent ? "border-primary/40 bg-primary/5" : "border-default-200 bg-content1"}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-small">
                          Ver.{versionNo ?? "-"}
                        </span>
                        {isCurrent && (
                          <Chip
                            size="sm"
                            variant="flat"
                            color="primary"
                            className="h-5 text-[10px] font-bold"
                          >
                            最新
                          </Chip>
                        )}
                      </div>
                      <span className="flex items-center gap-1 text-tiny text-default-400">
                        <LuCalendar className="text-xs" />
                        {dcDate}
                      </span>
                    </div>
                    {dc.code && (
                      <div className="mt-1 flex min-w-0 items-center gap-2">
                        <span className="shrink-0 text-tiny text-default-500">
                          コード
                        </span>
                        <Snippet
                          size="sm"
                          radius="none"
                          timeout={3000}
                          disableTooltip
                          hideSymbol
                          classNames={{
                            base: "min-w-0 bg-transparent p-0",
                            pre: "truncate",
                          }}
                        >
                          {dc.code}
                        </Snippet>
                      </div>
                    )}
                    {dc.memo && (
                      <p className="mt-1 whitespace-pre-wrap wrap-break-word text-tiny text-default-500">
                        {dc.memo}
                      </p>
                    )}
                  </li>
                );
              })}
            </ol>
          </CardBody>
        </Card>
      )}

      {/* 対戦相手のデッキ分布・勝率の分析 */}
      <Card className="w-full">
        <CardHeader className="px-3 pt-3 pb-1">
          <span className="font-bold text-medium">対戦分析</span>
        </CardHeader>
        <CardBody className="px-3 pt-1 pb-3">
          <DeckOpponentAnalysisPanel deckId={deck.id} />
        </CardBody>
      </Card>

      {/* 対戦記録一覧 */}
      <Card className="w-full">
        <CardHeader className="px-3 pt-3 pb-2 flex flex-col items-start gap-2">
          <span className="font-bold text-medium">記録一覧</span>
          <Tabs
            fullWidth
            size="sm"
            selectedKey={recordTab}
            onSelectionChange={(key) => setRecordTab(key as RecordTabKey)}
            classNames={{ tab: "h-8", tabContent: "font-bold" }}
          >
            <Tab key="all" title="すべて" />
            <Tab key="official" title="公式イベント" />
            <Tab key="tonamel" title="Tonamel" />
            <Tab key="unofficial" title="自由形式" />
          </Tabs>
        </CardHeader>
        <CardBody className="px-2 pt-0 pb-3">
          {/* タブ切り替えごとに Records を作り直す（再開用の重複排除ロジックを避けるため）。 */}
          <Records key={recordTab} event_type={recordTab} deck_id={deck.id} />
        </CardBody>
      </Card>

      {/* 操作モーダル群 */}
      <UpdateDeckModal
        deck={deck}
        setDeck={setDeck}
        isOpen={isOpenForUpdateDeckModal}
        onOpenChange={onOpenChangeForUpdateDeckModal}
      />

      <CreateDeckCodeModal
        deck={deck}
        setDeck={setDeck}
        deckcode={deckcode}
        setDeckCode={setDeckCode}
        isOpen={isOpenForCreateDeckCodeModal}
        onOpenChange={onOpenChangeForCreateDeckCodeModal}
      />

      <DeleteDeckModal
        deck={deck}
        isOpen={isOpenForDeleteDeckModal}
        onOpenChange={onOpenChangeForDeleteDeckModal}
        onRemove={handleRemove}
      />

      <ArchiveDeckModal
        deck={deck}
        isOpen={isOpenForArchiveDeckModal}
        onOpenChange={onOpenChangeForArchiveDeckModal}
        onRemove={handleRemove}
      />

      <UnarchiveDeckModal
        deck={deck}
        isOpen={isOpenForUnarchiveDeckModal}
        onOpenChange={onOpenChangeForUnarchiveDeckModal}
        onRemove={handleRemove}
      />
    </div>
  );
}
