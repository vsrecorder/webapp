"use client";

import { useEffect, useState, useCallback } from "react";

import NextLink from "next/link";

import { Spinner } from "@heroui/spinner";
import { Button, Link, useDisclosure } from "@heroui/react";

import DeckCard from "@app/components/organisms/Deck/DeckCard";
import KizunaMark from "@app/components/atoms/Kizuna/KizunaMark";
import {
  DeckCardSkeletons,
  DeckViewToggleSkeleton,
} from "@app/components/organisms/Deck/Skeleton/DeckCardSkeleton";
import CreateDeckModal from "@app/components/organisms/Deck/Modal/CreateDeckModal";
import FetchError from "@app/components/molecules/FetchError";
import { useDeckListView, setDeckListView } from "@app/hooks/useDeckListView";

import {
  LuCirclePlus,
  LuPlus,
  LuLayoutGrid,
  LuArchive,
  LuList,
  LuChevronRight,
} from "react-icons/lu";

import { DeckType, DeckGetResponseType } from "@app/types/deck";
import { DeckUsageItemType, DeckUsageStatType } from "@app/types/deck_usage_stat";
import { useKizunaDecks } from "@app/hooks/useKizunaLevels";

async function fetchDecks(isArchived: boolean, cursor: string) {
  const res = await fetch(`/api/decks?archived=${isArchived}&cursor=${cursor}`, {
    cache: "no-store",
    method: "GET",
    headers: {
      Accept: "application/json",
    },
  });

  if (!res.ok) {
    throw new Error("Failed to fetch");
  }

  const ret: DeckGetResponseType = await res.json();

  // 想定外の形（decksが配列でない）で返ってきた場合も「取得失敗」として扱う
  if (!Array.isArray(ret?.decks)) {
    throw new Error("Unexpected decks response");
  }

  return ret;
}

// デッキ一覧カードに表示する、デッキごとの全期間の対戦数・勝率・先攻/後攻情報を取得する。
// 対戦記録が無いデッキは結果に含まれない。
async function fetchDeckUsageStats(
  userId: string,
): Promise<Map<string, DeckUsageItemType>> {
  try {
    const res = await fetch(`/api/users/${userId}/deck-usage?all_time=true`, {
      cache: "no-store",
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    });

    if (!res.ok) return new Map();

    const stat: DeckUsageStatType = await res.json();

    return new Map(stat.decks.map((deck) => [deck.deck_id, deck]));
  } catch {
    return new Map();
  }
}

type Props = {
  userId: string;
  isArchived: boolean;
  onCreated?: () => void;
};

export default function Decks({ userId, isArchived, onCreated }: Props) {
  const [items, setItems] = useState<DeckType[]>([]);
  const [deckUsageStats, setDeckUsageStats] = useState<Map<string, DeckUsageItemType>>(
    new Map(),
  );
  const [nextCursor, setNextCursor] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [isInitialLoaded, setIsInitialLoaded] = useState(false);
  // デッキ一覧の取得に失敗したか。失敗した位置（初回か追加読み込みか）に関わらず、
  // 一覧の末尾にエラーと再読み込みボタンを出す。
  const [error, setError] = useState(false);
  // 表示モードは localStorage に保存された値を購読する。
  const view = useDeckListView();
  const { isOpen, onOpen, onOpenChange } = useDisclosure();

  // deck_id → きずなの算出結果。灯の濃さ・揺れ方・きずなLv.の表示に使う
  const kizunaDecks = useKizunaDecks(userId);

  useEffect(() => {
    fetchDeckUsageStats(userId).then(setDeckUsageStats);
  }, [userId]);

  const handleRemove = (id: string) => {
    setItems((prev) => prev.filter((d) => d.data.id !== id));
  };

  const loadMore = useCallback(async () => {
    if (isLoading || !hasMore) return;

    setError(false);
    setIsLoading(true);

    try {
      const newItems: DeckGetResponseType = await fetchDecks(isArchived, nextCursor);

      if (newItems.decks.length === 0) {
        setHasMore(false);
        return;
      }

      // 失敗後の再読み込みでは同じページを取り直すことがあるため、
      // 既に一覧にあるデッキは足さない（重複表示を防ぐ）
      setItems((prev) => {
        const loaded = new Set(prev.map((d) => d.data.id));

        return [...prev, ...newItems.decks.filter((d) => !loaded.has(d.data.id))];
      });

      const lastItem = newItems.decks[newItems.decks.length - 1];
      if (lastItem && lastItem.cursor) {
        const nextItems: DeckGetResponseType = await fetchDecks(
          isArchived,
          lastItem.cursor,
        );

        if (nextItems.decks.length === 0) {
          setHasMore(false);
        } else {
          setNextCursor(lastItem.cursor);
        }

        setNextCursor(lastItem.cursor);
      } else {
        setHasMore(false);
      }
    } catch (err) {
      console.error("Error loading items:", err);
      // hasMoreはtrueのまま残す。再読み込みボタンから同じcursorで取り直せるようにするため。
      setError(true);
    } finally {
      setIsLoading(false);
      if (!isInitialLoaded) {
        setIsInitialLoaded(true);
      }
    }
  }, [isArchived, nextCursor, isLoading, hasMore]);

  useEffect(() => {
    if (isInitialLoaded) return;
    loadMore();
  }, [isInitialLoaded, loadMore]);

  return (
    <div className="flex flex-col items-center space-y-3 pb-3">
      {/* 空状態：利用中 */}
      {isInitialLoaded && !isLoading && !hasMore && items.length === 0 && !isArchived && (
        <div className="flex flex-col items-center justify-center py-10 px-4 gap-6">
          {/* きずな訴求：デッキ登録を「対戦記録の管理」ではなく「デッキとのきずなを育てる第一歩」
              として動機づける。きずなLv.は過去の記録から算出されるため、早く始めるほど深くなる——
              という一点を、灯（KizunaMark）の視覚言語で伝え、詳細は /kizuna のLPへ送る。 */}
          <div className="w-full max-w-sm overflow-hidden rounded-2xl border border-amber-300/50 bg-linear-to-br from-amber-50 to-rose-50 dark:border-amber-400/20 dark:from-amber-950/40 dark:to-rose-950/30">
            <div className="flex flex-col items-center gap-4 px-5 py-6 text-center">
              <span className="inline-flex items-center gap-2 rounded-full border border-amber-400/40 bg-amber-400/10 px-3 py-1 text-[11px] font-bold tracking-wider text-amber-700 dark:text-amber-300">
                <span className="h-1.5 w-1.5 shrink-0 animate-pulse rounded-full bg-amber-500" />
                新機能「きずな」β版公開中
              </span>

              <div className="flex flex-col items-center gap-2">
                <KizunaMark
                  size={44}
                  className="drop-shadow-[0_0_18px_rgba(251,191,36,0.55)]"
                />
                <p className="text-lg font-black leading-snug text-foreground">
                  最初のデッキと、
                  <br />
                  きずなを育てよう
                </p>
              </div>

              <p className="text-xs leading-relaxed text-default-600 dark:text-default-400">
                負けても握り続けた回数、組み直した夜、連れて行った大会。
                勝率では測れないデッキとの歩みが、「きずなLv.」になります。
              </p>

              <p className="w-full rounded-xl bg-amber-500/10 px-3 py-2 text-xs font-bold leading-relaxed text-amber-800 dark:text-amber-200">
                きずなLv.は過去の記録から算出されます。
                <br />
                1日でも早く始めるほど、深くなります。
              </p>

              <NextLink
                href="/kizuna"
                className="inline-flex items-center gap-0.5 text-xs font-bold text-amber-700 transition-opacity hover:opacity-80 dark:text-amber-300"
              >
                きずなについて詳しく
                <LuChevronRight className="text-sm" />
              </NextLink>
            </div>
          </div>

          <div className="w-full max-w-sm flex flex-col gap-3">
            <p className="text-xs font-bold text-center text-default-400 uppercase tracking-wider">
              デッキの登録方法
            </p>
            <div className="flex flex-col gap-2">
              <div className="flex items-start gap-3 p-3 rounded-xl bg-default-100">
                <div className="shrink-0 w-6 h-6 rounded-full bg-primary text-white text-xs font-bold flex items-center justify-center">
                  1
                </div>
                <div className="flex flex-col gap-0.5">
                  <p className="text-sm font-bold">デッキコードを準備する</p>
                  <p className="text-xs text-default-500">
                    <Link
                      isExternal
                      href="https://www.pokemon-card.com/deck/"
                      className="text-xs text-primary"
                      underline="always"
                    >
                      トレーナーズウェブサイト
                    </Link>
                    でデッキを作成し、<br></br>デッキコードを取得してください
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 rounded-xl bg-default-100">
                <div className="shrink-0 w-6 h-6 rounded-full bg-primary text-white text-xs font-bold flex items-center justify-center">
                  2
                </div>
                <div className="flex flex-col gap-0.5">
                  <p className="text-sm font-bold">デッキを登録する</p>
                  <p className="text-xs text-default-500">
                    下のボタンまたは右下の
                    <span className="font-bold">「＋」ボタン</span>
                    をタップして、<br></br>デッキ名とデッキコードを貼り付けてください
                  </p>
                </div>
              </div>
            </div>
          </div>

          <Button
            color="primary"
            size="md"
            radius="full"
            startContent={<LuPlus className="w-4 h-4" />}
            onPress={onOpen}
            className="font-bold shadow-md"
          >
            デッキを登録する
          </Button>

          <CreateDeckModal
            deck_code=""
            isOpen={isOpen}
            onOpenChange={onOpenChange}
            onCreated={() => {
              onCreated?.();
            }}
          />
        </div>
      )}

      {/* 空状態：アーカイブ済み */}
      {isInitialLoaded && !isLoading && !hasMore && items.length === 0 && isArchived && (
        <div className="flex flex-col items-center justify-center py-10 px-4 gap-3">
          <div className="p-4 rounded-full bg-default-100">
            <LuArchive className="w-10 h-10 text-default-400" />
          </div>
          <p className="font-bold text-default-500">アーカイブ済みのデッキはありません</p>
        </div>
      )}

      {/* 表示モード切り替え：一覧ヘッダー右上にセグメントコントロールを配置。
          リスト＝素早く探す、ギャラリー＝画像で見て探す、を用途で使い分ける。
          固定タブ（top-15＋タブ高さ≒100px）の直下にスクロール追従で固定する。
          初回ロード中はトグルのスケルトンを表示する。 */}
      {(!isInitialLoaded || items.length > 0) && (
        <div className="sticky top-25 z-40 w-full bg-background/85 backdrop-blur-sm py-2">
          {!isInitialLoaded ? (
            <DeckViewToggleSkeleton />
          ) : (
            <div
              role="group"
              aria-label="表示モード"
              className="flex w-full items-center gap-0.5 rounded-lg bg-default-100 p-0.5"
            >
              <button
                type="button"
                aria-pressed={view === "list"}
                onClick={() => setDeckListView("list")}
                className={`flex flex-1 items-center justify-center gap-1 rounded-md px-2.5 py-1.5 text-tiny font-bold transition-colors ${
                  view === "list"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-default-500"
                }`}
              >
                <LuList className="text-sm" />
                リスト
              </button>
              <button
                type="button"
                aria-pressed={view === "gallery"}
                onClick={() => setDeckListView("gallery")}
                className={`flex flex-1 items-center justify-center gap-1 rounded-md px-2.5 py-1.5 text-tiny font-bold transition-colors ${
                  view === "gallery"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-default-500"
                }`}
              >
                <LuLayoutGrid className="text-sm" />
                ギャラリー
              </button>
            </div>
          )}
        </div>
      )}

      <div
        className={`grid w-full ${
          view === "gallery"
            ? "gap-4 grid-cols-1 lg:grid-cols-2 lg:gap-x-6"
            : "gap-3 grid-cols-1"
        }`}
      >
        {items.map((deck) => (
          <DeckCard
            key={deck.data.id}
            deckData={deck.data}
            deckcodeData={deck.data.latest_deck_code}
            deckUsageStat={deckUsageStats.get(deck.data.id) ?? null}
            kizunaLevel={kizunaDecks.get(deck.data.id)?.level ?? null}
            onRemove={handleRemove}
            enableShowDeckModal={true}
            view={view}
          />
        ))}

        {/* ローディング表示 */}
        {isLoading && <DeckCardSkeletons view={view} />}
        {isInitialLoaded && isLoading && (
          <div className="flex justify-center col-span-1 lg:col-span-2">
            <Spinner size="lg" className="pt-0" />
          </div>
        )}

        {/* 取得に失敗したときは、空の一覧を装わずに理由を出し、その場で取り直せるようにする。
            既に読み込めているデッキはそのまま残し、続きの取得だけをやり直す。 */}
        {error && !isLoading && (
          <div className="col-span-1 lg:col-span-2">
            <FetchError
              message={
                items.length === 0
                  ? "デッキ一覧の取得に失敗しました"
                  : "続きのデッキの取得に失敗しました"
              }
              onRetry={loadMore}
            />
          </div>
        )}

        {isInitialLoaded && !isLoading && !error && hasMore && (
          <div className="flex justify-center col-span-1 lg:col-span-2">
            <Button
              size="sm"
              radius="full"
              onPress={loadMore}
              className="w-48 max-w-full"
            >
              <div className="flex items-center gap-1">
                <span className="text-xs">
                  <LuCirclePlus />
                </span>
                <span className="font-bold text-xs">更に読み込む</span>
              </div>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
