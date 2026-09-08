"use client";

import { useEffect, useMemo, useRef, useState, useCallback, Fragment } from "react";

import { Spinner } from "@heroui/spinner";
import { Button, Link } from "@heroui/react";

import ScreenLockLoading from "@app/components/atoms/ScreenLockLoading";
import FetchError from "@app/components/molecules/FetchError";
import { useScreenLockLoading } from "@app/hooks/useScreenLockLoading";
import OfficialEventRecord from "@app/components/organisms/Record/OfficialEventRecord";
import TonamelEventRecord from "@app/components/organisms/Record/TonamelEventRecord";
import UnofficialEventRecord from "@app/components/organisms/Record/UnofficialEventRecord";
import { RecordCardSkeletons } from "@app/components/organisms/Record/Skeleton/RecordCardSkeleton";

import { LuCirclePlus, LuFilePen, LuClipboardList } from "react-icons/lu";

import { RecordType, RecordGetResponseType } from "@app/types/record";
import { formatJSTYearMonth, nonZeroDate } from "@app/utils/date";
import { resolveRecordEventType, stepRecordPage } from "@app/utils/recordListPage";
import { REOPEN_MODAL_EVENT_TYPE, REOPEN_MODAL_RECORD_ID } from "@app/utils/recordModalReopen";
import { writeSessionStorage } from "@app/utils/sessionStorageStore";
import { useSessionStorageItem } from "@app/hooks/useSessionStorageItem";

// 月見出し("YYYY年M月")の判定に使う日付（開催日が無ければ作成日）。
// JST の暦日で決める(サーバ描画とブラウザで同じ見出しになるように。utils/date 参照)
function getMonthKey(data: RecordType["data"]): string {
  return formatJSTYearMonth(nonZeroDate(data.event_date) ?? data.created_at);
}

async function fetchRecords(
  event_type: string,
  deck_id: string,
  cursor: string,
): Promise<RecordGetResponseType> {
  const params = new URLSearchParams({ event_type, deck_id, cursor });
  const res = await fetch(`/api/records?${params}`, {
    cache: "no-store",
    method: "GET",
    headers: {
      Accept: "application/json",
    },
  });

  if (!res.ok) {
    throw new Error("Failed to fetch");
  }

  const ret: RecordGetResponseType = await res.json();

  // 想定外の形（records が配列でない）で返ってきた場合も「取得失敗」として扱う
  if (!Array.isArray(ret?.records)) {
    throw new Error("Unexpected records response");
  }

  return ret;
}

type Props = {
  event_type: string;
  deck_id?: string;
  disable_more_load?: boolean;
  limit?: number;
  // サーバで取った1ページ目(BFF /api/records と同じ形。カードの周辺情報 details も付いている)。
  // 渡されたときは初回の取得を省き、最初の描画からカードを出す(サーバ描画の HTML にもカードが載る)
  initialPage?: RecordGetResponseType;
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
  initialPage,
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

  // サーバで取った1ページ目を、クライアントで取った場合と同じ手順(stepRecordPage)で初期状態にする
  const [initialStep] = useState(() =>
    initialPage ? stepRecordPage(initialPage, new Set(), "") : null,
  );
  const [items, setItems] = useState<RecordType[]>(() => {
    const appended = initialStep?.appended ?? [];
    return limit !== 0 ? appended.slice(0, limit) : appended;
  });
  const [nextCursor, setNextCursor] = useState<string>(() => initialStep?.nextCursor ?? "");
  const [hasMore, setHasMore] = useState(() => {
    if (!initialStep) return true;
    if (limit !== 0 && initialStep.appended.length >= limit) return false;
    return initialStep.hasNext;
  });
  const [isInitialLoaded, setIsInitialLoaded] = useState(initialStep !== null);
  /*
   * サーバで取った1ページ目を裏で取り直している間。
   *
   * ブラウザの「戻る」ではサーバ描画の結果(RSC)がそのまま再利用され、ページは再描画されない。
   * 記録を付けたり詳細ページで対戦を足したりして戻ると initialPage は古い。以前はマウントの
   * たびに取り直していたので常に最新だった。同じ鮮度を保つため、初期値は最初の描画にだけ使い、
   * マウント直後に1ページ目を取り直して差し替える(デッキ一覧と同じ)。
   * 取り直しの間は骨格を出さず(カードは既に出ている)、追加読み込みだけ待たせる。
   */
  const [isRefreshing, setIsRefreshing] = useState(initialStep !== null);
  // 一覧の取得に失敗したか。失敗した位置(初回か追加読み込みか)に関わらず、
  // 一覧の末尾にエラーと再読み込みボタンを出す
  const [error, setError] = useState(false);
  // 「更に読み込む」(または失敗後の再読み込み)を押して、続きを待っている間
  const [manualLoadPending, setManualLoadPending] = useState(false);

  /*
   * 戻り遷移で再開する対象の記録。
   * sessionStorage のフラグを「外部ストア」として描画中に読む(useSessionStorageItem)。
   * 非アクティブなタブのインスタンスはスピナーを表示せず再開も担わない
   * (アクティブなインスタンスとのキー奪い合いを防ぐ)。
   * すべて表示では全種別を含むため、保存された種別に関わらず再開対象とする。
   * フラグはカード側がモーダルを開く直前(handleReopenComplete)に消し、その場で null になる
   */
  const savedReopenId = useSessionStorageItem(REOPEN_MODAL_RECORD_ID);
  const savedReopenEventType = useSessionStorageItem(REOPEN_MODAL_EVENT_TYPE);
  const pendingReopenId =
    isActive && savedReopenId && (event_type === "all" || savedReopenEventType === event_type)
      ? savedReopenId
      : null;
  const reopenTargetFound =
    pendingReopenId !== null && items.some((item) => item.data.id === pendingReopenId);
  // 対象 record が描画されるまで自動で続きを読む(取得に失敗したら打ち切る)
  const autoLoadPending = pendingReopenId !== null && !reopenTargetFound && hasMore && !error;
  /*
   * 全件読み込んでも見つからなかった(削除済み等)、または取得に失敗した。
   * スクロールする対象も無いので、覆いも外す。フラグは残しておく: 取得の失敗なら、
   * 末尾の再読み込みで取り直して対象が現れたときにカード側で再開できる
   * (そのときは自動読み込みも続きから再開する)
   */
  const reopenGaveUp =
    pendingReopenId !== null &&
    !reopenTargetFound &&
    isInitialLoaded &&
    !isRefreshing &&
    (!hasMore || error);
  // この一覧インスタンスの描画範囲。再開時に対象カードを探す起点にする。
  const listRef = useRef<HTMLDivElement>(null);
  // 取得済みの記録 ID。失敗後の再読み込みなどで同じ記録が再び返っても重複させない
  const loadedIdsRef = useRef<Set<string>>(
    new Set(initialStep?.appended.map((r) => r.data.id)),
  );
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
  // 再開の対象は済んだのでフラグを消す(pendingReopenId も null になる)。
  const handleReopenComplete = useCallback(
    (id: string) => {
      scrollToCard(id);
      writeSessionStorage(REOPEN_MODAL_RECORD_ID, null);
      writeSessionStorage(REOPEN_MODAL_EVENT_TYPE, null);
      releaseScreen(350);
    },
    [scrollToCard, releaseScreen],
  );

  /*
   * 続きを読み込んでいる最中か。読み込みの「要求」は state ではなく条件から導く:
   * 初回の読み込み・対象カードを探すための自動読み込み・「更に読み込む」の押下のいずれかで、
   * 読める続きがあり(hasMore)、1ページ目の取り直し中でない間。
   * 下の effect はこれが立っている間、次のページを取って一覧に足す。足し終えると
   * (nextCursor が進むので)条件を見直し、まだ立っていれば次のページを取る。
   *
   * 続きの有無は BFF が付ける has_next で決める(以前は2ページ目を先読みして判定していたので、
   * 表示のたびに往復が1つ余計に走っていた)。limit(ダッシュボードの「最近の記録」)が
   * あるときはその件数で打ち切る。
   */
  const isLoading =
    !isRefreshing && hasMore && (!isInitialLoaded || autoLoadPending || manualLoadPending);
  const itemCount = items.length;

  useEffect(() => {
    if (!isLoading) return;

    let cancelled = false;
    fetchRecords(apiEventType, deck_id, nextCursor)
      .then((page) => {
        if (cancelled) return;

        const step = stepRecordPage(page, loadedIdsRef.current, nextCursor);

        let appended = step.appended;
        let more = step.hasNext;
        if (limit !== 0 && itemCount + appended.length >= limit) {
          appended = appended.slice(0, Math.max(0, limit - itemCount));
          more = false;
        }

        for (const record of appended) loadedIdsRef.current.add(record.data.id);
        setItems((prev) => [...prev, ...appended]);
        setNextCursor(step.nextCursor);
        setHasMore(more);
      })
      .catch((error) => {
        if (cancelled) return;
        console.error("Error loading items:", error);
        setError(true);
      })
      .finally(() => {
        if (cancelled) return;
        setIsInitialLoaded(true);
        setManualLoadPending(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isLoading, apiEventType, deck_id, nextCursor, limit, itemCount]);

  // 「更に読み込む」と、失敗後の再読み込み。読み込み中・取り直し中・続きが無いときは何もしない
  const loadMore = () => {
    if (isLoading || isRefreshing || !hasMore) return;

    setError(false);
    setManualLoadPending(true);
  };

  // サーバで取った1ページ目を、マウント直後に裏で取り直して差し替える(理由は isRefreshing を参照)
  useEffect(() => {
    if (!isRefreshing) return;

    let cancelled = false;
    (async () => {
      try {
        const page = await fetchRecords(apiEventType, deck_id, "");
        if (cancelled) return;

        const step = stepRecordPage(page, new Set(), "");
        const appended = limit !== 0 ? step.appended.slice(0, limit) : step.appended;
        loadedIdsRef.current = new Set(appended.map((r) => r.data.id));
        setItems(appended);
        setNextCursor(step.nextCursor);
        setHasMore(limit !== 0 && appended.length >= limit ? false : step.hasNext);
        setError(false);
      } catch (error) {
        // 取り直しに失敗しても、サーバで取った1ページ目は出ているのでそのまま残す
        console.error("Error refreshing items:", error);
      } finally {
        if (!cancelled) setIsRefreshing(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isRefreshing, apiEventType, deck_id, limit]);

  // 対象カードを探し始める時点から覆う(自動追加読み込みの間も含む)。
  // 見つかったときはカード側の handleReopenComplete が(モーダルが開き切るまで残して)外し、
  // 諦めたときと非アクティブになったときはここで外す
  useEffect(() => {
    if (pendingReopenId !== null && !reopenGaveUp) {
      lockScreen();
    } else {
      releaseScreen();
    }
  }, [pendingReopenId, reopenGaveUp, lockScreen, releaseScreen]);

  // 初回ロードが終わり、追加読み込みも無く、1件も無い状態を「空」として親へ通知する。
  const isEmpty = isInitialLoaded && !isLoading && !hasMore && !error && items.length === 0;
  useEffect(() => {
    onEmptyChange?.(isEmpty);
  }, [isEmpty, onEmptyChange]);

  // 月見出しの判定に使うキー(件数ぶんの日付整形を描画ごとに繰り返さない)
  const monthKeys = useMemo(() => items.map((record) => getMonthKey(record.data)), [items]);

  return (
    <div ref={listRef} className="flex flex-col items-center space-y-3 pb-3">
      {/* 対象 record を探している間から、対象カードへの自動スクロール・モーダルが
          開き切るまでを覆い、その間の操作も受け付けないようにする
          （デッキ一覧の再開時と同じ部品・同じ見え方に揃えている）。 */}
      {isReopening && <ScreenLockLoading label="記録情報を開いています" />}
      {/* 空状態 */}
      {!holdSkeleton && isEmpty && (
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
          const monthKey = monthKeys[index];
          const prevMonthKey = index > 0 ? monthKeys[index - 1] : null;

          // "all" のときはレコードごとに種別を判定し、それ以外は固定の event_type を使う。
          const recordType =
            event_type === "all" ? resolveRecordEventType(recordData.data) : event_type;

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
        {/* 取得に失敗したら一覧の末尾に出す(初回の失敗でも空状態ではなくこちら) */}
        {!holdSkeleton && error && !isLoading && (
          <div className={`col-span-1 ${colSpanClass}`}>
            <FetchError message="記録の取得に失敗しました" onRetry={loadMore} compact />
          </div>
        )}
        {!holdSkeleton &&
          !disable_more_load &&
          isInitialLoaded &&
          !isLoading &&
          !error &&
          hasMore && (
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
