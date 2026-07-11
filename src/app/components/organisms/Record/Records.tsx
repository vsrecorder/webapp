"use client";

import { useEffect, useRef, useState, useCallback, Fragment } from "react";
import { createPortal } from "react-dom";

import { Spinner } from "@heroui/spinner";
import { Button, Link } from "@heroui/react";

import OfficialEventRecord from "@app/components/organisms/Record/OfficialEventRecord";
import TonamelEventRecord from "@app/components/organisms/Record/TonamelEventRecord";
import UnofficialEventRecord from "@app/components/organisms/Record/UnofficialEventRecord";
import { RecordCardSkeletons } from "@app/components/organisms/Record/Skeleton/RecordCardSkeleton";

import { LuCirclePlus, LuFilePen, LuClipboardList } from "react-icons/lu";

import { RecordType, RecordGetResponseType } from "@app/types/record";

// レコードのデータから種別（公式 / Tonamel / 自由形式）を判定する。
// すべて表示("all")のとき、各カードをどのコンポーネントで描画するか決めるために使う。
function resolveEventType(
  data: RecordType["data"],
): "official" | "tonamel" | "unofficial" | null {
  if (data.official_event_id && data.official_event_id !== 0) return "official";
  if (data.tonamel_event_id) return "tonamel";
  if (data.unofficial_event_id) return "unofficial";
  return null;
}

// 月見出しの判定に使う日付（開催日が無ければ作成日）を取得する。
function getRawDate(data: RecordType["data"]): string {
  return data.event_date && !data.event_date.startsWith("0001-01-01")
    ? data.event_date
    : (data.created_at as unknown as string);
}

// "YYYY年M月" 形式の月キーを生成する。
function getMonthKey(data: RecordType["data"]): string {
  const d = new Date(getRawDate(data));
  return `${d.getFullYear()}年${d.getMonth() + 1}月`;
}

async function fetchRecords(event_type: string, deck_id: string, cursor: string) {
  try {
    const res = await fetch(
      `/api/records?event_type=${event_type}&deck_id=${deck_id}&cursor=${cursor}`,
      {
        cache: "no-store",
        method: "GET",
        headers: {
          Accept: "application/json",
        },
      },
    );

    if (!res.ok) {
      throw new Error("Failed to fetch");
    }

    const ret: RecordGetResponseType = await res.json();

    return ret;
  } catch (error) {
    throw error;
  }
}

type Props = {
  event_type: string;
  deck_id?: string;
  disable_more_load?: boolean;
  limit?: number;
  // このインスタンスが現在表示中（アクティブ）のタブか。
  // 記録一覧では「すべて」タブと種別タブの両インスタンスが同時にマウントされ、
  // 同一記録が重複するため、アクティブなインスタンスだけが
  // reopenModalRecordId を消費してモーダル再開を担う。
  isActive?: boolean;
  // 親モーダル（デッキの記録一覧モーダル）が開閉アニメーション完了済みか。
  // 再開時、親モーダルがまだアニメーション中だと記録カードのモーダルが
  // HeroUI のフォーカス管理と競合して表示されないため、true になるまで開かない。
  // 親モーダルが無い通常の利用（記録一覧ページ等）では常に true。
  parentReady?: boolean;
  // デッキの記録一覧モーダル内に表示されているか。
  // 記録モーダルが親モーダルのバックドロップと重なって暗くなるのを防ぐために使う。
  nestedInModal?: boolean;
  // 再開時に対象カードへスクロールする際のスクロール対象コンテナ。
  // モーダル内では window ではなくこのコンテナ（ModalBody）をスクロールする。
  // 未指定（記録一覧ページ等）の場合は window をスクロールする。
  scrollContainerRef?: React.RefObject<HTMLElement | null>;
  // デスクトップ(lg以上)でのグリッド列数。ダッシュボードの「最近の記録」だけ
  // 横に3枚並べたいため、呼び出し元から明示的に指定できるようにしている。
  desktopColumns?: 2 | 3;
};

export default function Records({
  event_type,
  deck_id = "",
  disable_more_load = false,
  limit = 0,
  isActive = true,
  parentReady = true,
  nestedInModal = false,
  scrollContainerRef,
  desktopColumns = 2,
}: Props) {
  // desktopColumns=3 のときは lg(1024px〜)で2列、xl(1280px〜)で3列と段階的に増やす。
  // 画面幅が狭まった際にカードが窮屈にならないようにするため。
  const gridColsClass = nestedInModal
    ? ""
    : desktopColumns === 3
      ? "lg:grid-cols-2 xl:grid-cols-3 lg:gap-x-6"
      : "lg:grid-cols-2 lg:gap-x-6";
  const colSpanClass = nestedInModal
    ? ""
    : desktopColumns === 3
      ? "lg:col-span-2 xl:col-span-3"
      : "lg:col-span-2";
  // "all"(すべて)のときはバックエンドの event_type フィルタを掛けずに全件取得する。
  const apiEventType = event_type === "all" ? "" : event_type;

  const [items, setItems] = useState<RecordType[]>([]);
  const [nextCursor, setNextCursor] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [isInitialLoaded, setIsInitialLoaded] = useState(false);
  const [pendingReopenId, setPendingReopenId] = useState<string | null>(null);
  const scrollToIdRef = useRef<string | null>(null);

  // カード側からモーダルを開く直前に呼ばれるコールバック
  const handleReopenComplete = useCallback((id: string) => {
    scrollToIdRef.current = id;
    setPendingReopenId(null);
  }, []);

  // スピナーが消えた後（= pendingReopenId が null になった後）にスクロール実行
  useEffect(() => {
    if (pendingReopenId !== null) return;
    const id = scrollToIdRef.current;
    if (!id) return;
    scrollToIdRef.current = null;
    requestAnimationFrame(() => {
      const el = document.getElementById(`record-card-${id}`);
      if (!el) return;
      const container = scrollContainerRef?.current;
      if (container) {
        // モーダル内：ModalBody（コンテナ）をスクロールする。
        // 固定タブに隠れないよう少し上に余白(56px)を取る。
        const elRect = el.getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();
        const y = container.scrollTop + (elRect.top - containerRect.top) - 56;
        container.scrollTo({ top: Math.max(0, y), behavior: "smooth" });
      } else {
        // 通常ページ：window をスクロールする。
        const y = el.getBoundingClientRect().top + window.scrollY - 80;
        window.scrollTo({ top: Math.max(0, y), behavior: "smooth" });
      }
    });
  }, [pendingReopenId]);

  const loadMore = useCallback(async () => {
    if (isLoading || !hasMore) return;

    setIsLoading(true);

    try {
      const newItems: RecordGetResponseType = await fetchRecords(
        apiEventType,
        deck_id,
        nextCursor,
      );

      if (newItems.records.length === 0) {
        setHasMore(false);
        return;
      }

      setItems((prev) => {
        const next = [...prev, ...newItems.records];
        return limit != 0 ? next.slice(0, limit) : next;
      });

      const lastItem = newItems.records[newItems.records.length - 1];

      if (limit != 0 && items.length + newItems.records.length >= limit) {
        setHasMore(false);
      } else if (lastItem && lastItem.cursor) {
        const nextItems: RecordGetResponseType = await fetchRecords(
          apiEventType,
          deck_id,
          lastItem.cursor,
        );

        if (nextItems.records.length === 0) {
          setHasMore(false);
        } else {
          setNextCursor(lastItem.cursor);
        }

        setNextCursor(lastItem.cursor);
      } else {
        setHasMore(false);
      }
    } catch (error) {
      console.error("Error loading items:", error);
      setHasMore(false);
    } finally {
      setIsLoading(false);
      if (!isInitialLoaded) {
        setIsInitialLoaded(true);
      }
    }
  }, [apiEventType, deck_id, nextCursor, isLoading, hasMore, isInitialLoaded]);

  useEffect(() => {
    if (isInitialLoaded) return;
    loadMore();
  }, [isInitialLoaded, loadMore]);

  // 戻り遷移時に対象 record の event_type が一致する場合だけ ID を保持
  useEffect(() => {
    // 非アクティブなタブのインスタンスはスピナーを表示せず再開も担わない
    //（アクティブなインスタンスとのキー奪い合いを防ぐ）。
    if (!isActive) {
      setPendingReopenId(null);
      return;
    }
    const id = sessionStorage.getItem("reopenModalRecordId");
    const storedType = sessionStorage.getItem("reopenModalEventType");
    // すべて表示では全種別を含むため、保存された種別に関わらず再開対象とする。
    if (id && (event_type === "all" || storedType === event_type)) {
      setPendingReopenId(id);
    }
  }, [event_type, isActive]);

  // 対象 record が描画されるまで自動ロード
  // found になったときは何もしない（カード側の handleReopenComplete が pendingReopenId を null にする）
  useEffect(() => {
    if (!pendingReopenId) return;
    if (!isInitialLoaded || isLoading) return;

    const found = items.some((item) => item.data.id === pendingReopenId);
    if (!found) {
      if (hasMore) {
        loadMore();
      } else {
        // 全件読み込んでも見つからなかった場合はスピナーを解除
        setPendingReopenId(null);
      }
    }
  }, [pendingReopenId, isInitialLoaded, isLoading, items, hasMore, loadMore]);

  return (
    <div className="flex flex-col items-center space-y-3 pb-3">
      {/* 対象 record を探している間はオーバーレイでスピナーを表示 */}
      {/* createPortal で body 直下に置くことで、祖先要素の包含ブロック問題を回避しビューポート全体を覆う */}
      {pendingReopenId &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            style={{ zIndex: 9999 }}
            className="fixed inset-0 flex items-center justify-center bg-background/80"
          >
            <Spinner size="lg" />
          </div>,
          document.body,
        )}
      {/* 空状態 */}
      {isInitialLoaded && !isLoading && !hasMore && items.length === 0 && (
        <div className="flex flex-col items-center justify-center py-10 px-4 gap-6">
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="p-4 rounded-full bg-primary/10">
              <LuClipboardList className="w-12 h-12 text-primary" />
            </div>
            <div className="flex flex-col gap-1">
              <p className="font-bold text-lg">記録を作成しましょう</p>
              <p className="text-sm text-default-500">
                {event_type === "all"
                  ? "公式・Tonamel・自由形式の対戦記録を管理できます"
                  : event_type === "official"
                    ? "公式イベントの対戦記録を管理できます"
                    : event_type === "tonamel"
                      ? "Tonamelイベントの対戦記録を管理できます"
                      : "自由形式でイベントの対戦記録を管理できます"}
              </p>
            </div>
          </div>

          <div className="w-full max-w-sm flex flex-col gap-3">
            <p className="text-xs font-bold text-center text-default-400 uppercase tracking-wider">
              記録の作成方法
            </p>
            <div className="flex flex-col gap-2">
              <div className="flex items-start gap-3 p-3 rounded-xl bg-default-100">
                <div className="shrink-0 w-6 h-6 rounded-full bg-primary text-white text-xs font-bold flex items-center justify-center">
                  1
                </div>
                <div className="flex flex-col gap-0.5">
                  <p className="text-sm font-bold">デッキを登録する</p>
                  <p className="text-xs text-default-500">
                    まだデッキを登録していない場合は先に
                    <Link
                      href="/decks"
                      className="text-xs text-primary"
                      underline="always"
                    >
                      デッキページ
                    </Link>
                    で登録してください
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 rounded-xl bg-default-100">
                <div className="shrink-0 w-6 h-6 rounded-full bg-primary text-white text-xs font-bold flex items-center justify-center">
                  2
                </div>
                <div className="flex flex-col gap-0.5">
                  <p className="text-sm font-bold">記録を作成する</p>
                  <p className="text-xs text-default-500">
                    {event_type === "all"
                      ? "下のボタンから記録を作成してください"
                      : event_type === "official"
                        ? "下のボタンから開催日・イベント・デッキを選択して記録を作成してください"
                        : event_type === "tonamel"
                          ? "下のボタンから開催日・TonamelイベントID・デッキを選択して記録を作成してください"
                          : "下のボタンから開催日・イベント名・デッキを入力して記録を作成してください"}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <Button
            as={Link}
            href={`/records/create?event_type=${event_type === "all" ? "official" : event_type}`}
            color="primary"
            size="md"
            radius="full"
            startContent={<LuFilePen className="w-4 h-4" />}
            className="font-bold shadow-md"
          >
            記録を作成する
          </Button>
        </div>
      )}

      <div className={`grid grid-cols-1 w-full gap-3 ${gridColsClass}`}>
        {items.map((recordData, index) => {
          const monthKey = getMonthKey(recordData.data);
          const prevMonthKey = index > 0 ? getMonthKey(items[index - 1].data) : null;

          // "all" のときはレコードごとに種別を判定し、それ以外は固定の event_type を使う。
          const recordType =
            event_type === "all" ? resolveEventType(recordData.data) : event_type;

          const onReopenComplete =
            recordData.data.id === pendingReopenId
              ? () => handleReopenComplete(recordData.data.id)
              : undefined;

          return (
            <Fragment key={recordData.data.id}>
              {monthKey !== prevMonthKey && (
                <div
                  className={`flex items-center gap-3 pt-1 pb-0.5 col-span-1 ${colSpanClass}`}
                >
                  <span className="text-xs font-bold text-default-400 tracking-wide shrink-0">
                    {monthKey}
                  </span>
                  <div className="flex-1 h-px bg-divider" />
                </div>
              )}
              {recordType === "official" ? (
                <OfficialEventRecord
                  recordData={recordData}
                  enableDisplayRecordModal={true}
                  onReopenComplete={onReopenComplete}
                  enableReopen={isActive}
                  reopenReady={parentReady}
                  nestedInModal={nestedInModal}
                />
              ) : recordType === "tonamel" ? (
                <TonamelEventRecord
                  recordData={recordData}
                  enableDisplayRecordModal={true}
                  onReopenComplete={onReopenComplete}
                  enableReopen={isActive}
                  reopenReady={parentReady}
                  nestedInModal={nestedInModal}
                />
              ) : recordType === "unofficial" ? (
                <UnofficialEventRecord
                  recordData={recordData}
                  enableDisplayRecordModal={true}
                  onReopenComplete={onReopenComplete}
                  enableReopen={isActive}
                  reopenReady={parentReady}
                  nestedInModal={nestedInModal}
                />
              ) : null}
            </Fragment>
          );
        })}
        {/* ローディング表示 */}
        {!isInitialLoaded && <RecordCardSkeletons desktopColumns={desktopColumns} />}
        {isInitialLoaded && isLoading && (
          <div className={`flex justify-center col-span-1 ${colSpanClass}`}>
            <Spinner size="lg" className="pt-0" />
          </div>
        )}
        {!disable_more_load && isInitialLoaded && !isLoading && hasMore && (
          <div className={`flex justify-center col-span-1 ${colSpanClass}`}>
            <Button size="sm" radius="full" onPress={loadMore}>
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
