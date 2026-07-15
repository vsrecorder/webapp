"use client";

import { useEffect, useState, useCallback } from "react";

import { Spinner } from "@heroui/spinner";
import { Button, Link, useDisclosure } from "@heroui/react";

import DeckCard, { DeckCardView } from "@app/components/organisms/Deck/DeckCard";
import {
  DeckCardSkeletons,
  DeckViewToggleSkeleton,
} from "@app/components/organisms/Deck/Skeleton/DeckCardSkeleton";
import CreateDeckModal from "@app/components/organisms/Deck/Modal/CreateDeckModal";
import FetchError from "@app/components/molecules/FetchError";

import { LuCirclePlus, LuPlus, LuLayoutGrid, LuArchive, LuList } from "react-icons/lu";

import { DeckType, DeckGetResponseType } from "@app/types/deck";
import { DeckUsageItemType, DeckUsageStatType } from "@app/types/deck_usage_stat";

// デッキ一覧の表示モードを localStorage に保存するキー。
// 表示密度の好みはユーザーごとの習慣なので、次回アクセス時も同じ状態で開く。
const DECK_VIEW_STORAGE_KEY = "deckListView";

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
  // 表示モード。SSR とのハイドレーション不一致を避けるため初期値は固定（ギャラリー）にし、
  // マウント後に localStorage から復元する。
  const [view, setView] = useState<DeckCardView>("gallery");
  const { isOpen, onOpen, onOpenChange } = useDisclosure();

  useEffect(() => {
    fetchDeckUsageStats(userId).then(setDeckUsageStats);
  }, [userId]);

  useEffect(() => {
    const saved = localStorage.getItem(DECK_VIEW_STORAGE_KEY);
    if (saved === "list" || saved === "gallery") {
      setView(saved);
    }
  }, []);

  const handleChangeView = (next: DeckCardView) => {
    setView(next);
    localStorage.setItem(DECK_VIEW_STORAGE_KEY, next);
  };

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
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="p-4 rounded-full bg-primary/10">
              <LuLayoutGrid className="w-12 h-12 text-primary" />
            </div>
            <div className="flex flex-col gap-1">
              <p className="font-bold text-lg">デッキを登録しましょう</p>
              <p className="text-sm text-default-500">
                デッキを登録して対戦記録を管理できます
              </p>
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
                    をタップして、<br></br>デッキ名とデッキコードを入力してください
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
                onClick={() => handleChangeView("list")}
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
                onClick={() => handleChangeView("gallery")}
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
            <Button size="sm" radius="full" onPress={loadMore} className="w-48 max-w-full">
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
