"use client";

import { useEffect, useRef, useState, useCallback, Fragment } from "react";

import { Spinner } from "@heroui/spinner";
import { Button, Link } from "@heroui/react";

import ScreenLockLoading from "@app/components/atoms/ScreenLockLoading";
import { useScreenLockLoading } from "@app/hooks/useScreenLockLoading";
import OfficialEventRecord from "@app/components/organisms/Record/OfficialEventRecord";
import TonamelEventRecord from "@app/components/organisms/Record/TonamelEventRecord";
import UnofficialEventRecord from "@app/components/organisms/Record/UnofficialEventRecord";
import { RecordCardSkeletons } from "@app/components/organisms/Record/Skeleton/RecordCardSkeleton";

import { LuCirclePlus, LuFilePen, LuClipboardList } from "react-icons/lu";

import { RecordType, RecordGetResponseType } from "@app/types/record";
import { isZeroDate } from "@app/utils/date";

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
  return !isZeroDate(data.event_date)
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
  // 初回ロードが終わり1件も無い状態になったかを親へ通知する。
  // 記録一覧ページの「すべて」タブでフローティング表示の切り替えに使う。
  onEmptyChange?: (isEmpty: boolean) => void;
  // true の間はデータが揃っていてもスケルトンを出し続ける。
  // 親モーダルの入場アニメーション中にカード一覧の実体化(大きなコミット)が走ると
  // シートの動きが止まるため、着地までの間これを立てて実体化を遅延させる。
  // 取得はマウント直後から並行して走る。モーダル外(記録一覧ページ等)では常に false。
  holdSkeleton?: boolean;
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
  onEmptyChange,
  holdSkeleton = false,
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
  // この一覧インスタンスの描画範囲。再開時に対象カードを探す起点にする。
  const listRef = useRef<HTMLDivElement>(null);
  /*
   * 再開が済むまで画面全体をローディングで覆う（デッキ一覧の再開時と同じ共通フック）。
   *
   * pendingReopenId とは別に持つ。pendingReopenId はカード側がモーダルを開く直前に
   * null になるが、対象カードへの自動スクロールはその後に走るため、それに合わせて
   * 覆いを外すと「勝手にスクロールする様子」が見えてしまう。
   * 覆いは自動スクロールとモーダルが開き切るところまで残す。
   */
  const {
    isLocked: isReopening,
    lock: lockScreen,
    release: releaseScreen,
  } = useScreenLockLoading();

  /*
   * 対象カードの位置まで移動する。
   *
   * 記録モーダルが開くより前に、同期的に呼ぶこと。モーダルが開くと背面が
   * position:fixed で固定され（useModalBackgroundScrollLock）、文書のスクロール範囲が
   * ビューポート寸法まで縮むため、以降 window.scrollTo は 0 に丸められて効かなくなる。
   * 併せて、そのとき固定される位置＝モーダルを閉じたときの戻り先になるので、
   * ここで合わせておくと閉じた後も対象カードが同じ位置に残る。
   *
   * 覆いの下で動かすので、なめらかに見せる必要はなく瞬間移動（behavior:auto）にする。
   */
  const scrollToCard = useCallback(
    (id: string) => {
      // 記録一覧では「すべて」タブと種別タブが同時にマウントされ、同じ記録のカードが
      // 同じ id で重複して存在しうる。document 全体から引くと非表示タブ側の
      // カード（位置が取れない）を掴んでしまうため、この一覧の中だけから探す。
      const el = listRef.current?.querySelector<HTMLElement>(`[id="record-card-${id}"]`);
      if (!el) return;

      const container = scrollContainerRef?.current;
      if (container) {
        // モーダル内：ModalBody（コンテナ）をスクロールする。
        // 固定タブに隠れないよう少し上に余白(56px)を取る。
        const elRect = el.getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();
        const y = container.scrollTop + (elRect.top - containerRect.top) - 56;
        container.scrollTo({ top: Math.max(0, y), behavior: "auto" });
      } else {
        // 通常ページ：window をスクロールする。
        const y = el.getBoundingClientRect().top + window.scrollY - 80;
        window.scrollTo({ top: Math.max(0, y), behavior: "auto" });
      }
    },
    [scrollContainerRef],
  );

  // カード側からモーダルを開く直前に呼ばれるコールバック。
  // 覆いは外さず、モーダルが開き切るまで（350ms）残す。
  const handleReopenComplete = useCallback(
    (id: string) => {
      scrollToCard(id);
      setPendingReopenId(null);
      releaseScreen(350);
    },
    [scrollToCard, releaseScreen],
  );

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
  }, [
    apiEventType,
    deck_id,
    nextCursor,
    isLoading,
    hasMore,
    isInitialLoaded,
    items.length,
    limit,
  ]);

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
      releaseScreen();
      return;
    }
    const id = sessionStorage.getItem("reopenModalRecordId");
    const storedType = sessionStorage.getItem("reopenModalEventType");
    // すべて表示では全種別を含むため、保存された種別に関わらず再開対象とする。
    if (id && (event_type === "all" || storedType === event_type)) {
      setPendingReopenId(id);
      // 対象カードを探し始める時点から覆う（自動追加読み込みの間も含む）。
      lockScreen();
    }
  }, [event_type, isActive, lockScreen, releaseScreen]);

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
        // 全件読み込んでも見つからなかった（削除済み等）。
        // スクロールする対象も無いので、覆いもここで外す。
        setPendingReopenId(null);
        releaseScreen();
      }
    }
  }, [
    pendingReopenId,
    isInitialLoaded,
    isLoading,
    items,
    hasMore,
    loadMore,
    releaseScreen,
  ]);

  // 初回ロードが終わり、追加読み込みも無く、1件も無い状態を「空」として親へ通知する。
  const isEmpty = isInitialLoaded && !isLoading && !hasMore && items.length === 0;
  useEffect(() => {
    onEmptyChange?.(isEmpty);
  }, [isEmpty, onEmptyChange]);

  return (
    <div ref={listRef} className="flex flex-col items-center space-y-3 pb-3">
      {/* 対象 record を探している間から、対象カードへの自動スクロール・モーダルが
          開き切るまでを覆い、その間の操作も受け付けないようにする
          （デッキ一覧の再開時と同じ部品・同じ見え方に揃えている）。 */}
      {isReopening && <ScreenLockLoading label="記録情報を開いています" />}
      {/* 空状態 */}
      {!holdSkeleton && isInitialLoaded && !isLoading && !hasMore && items.length === 0 && (
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
        {!holdSkeleton &&
          items.map((recordData, index) => {
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
        {/* ローディング表示(実体化を遅らせている間もスケルトンを出す) */}
        {(!isInitialLoaded || holdSkeleton) && (
          <RecordCardSkeletons desktopColumns={desktopColumns} />
        )}
        {!holdSkeleton && isInitialLoaded && isLoading && (
          <div className={`flex justify-center col-span-1 ${colSpanClass}`}>
            <Spinner size="lg" className="pt-0" />
          </div>
        )}
        {!holdSkeleton && !disable_more_load && isInitialLoaded && !isLoading && hasMore && (
          <div className={`flex justify-center col-span-1 ${colSpanClass}`}>
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
