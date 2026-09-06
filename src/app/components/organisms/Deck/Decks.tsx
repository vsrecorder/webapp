"use client";

import { useEffect, useLayoutEffect, useRef, useState, useCallback } from "react";

import NextLink from "next/link";

import { Spinner } from "@heroui/spinner";
import { Button, Link, useDisclosure } from "@heroui/react";
import { addToast } from "@heroui/react";

import DeckCard from "@app/components/organisms/Deck/DeckCard";
import KizunaMark from "@app/components/atoms/Kizuna/KizunaMark";
import { DeckCardSkeletons } from "@app/components/organisms/Deck/Skeleton/DeckCardSkeleton";
import DeckViewToggleBar from "@app/components/organisms/Deck/DeckViewToggleBar";
import FetchError from "@app/components/molecules/FetchError";
import { useDeckListView } from "@app/hooks/useDeckListView";

import { LuCirclePlus, LuPlus, LuArchive, LuChevronRight } from "react-icons/lu";

import {
  DeckType,
  DeckData,
  DeckGetResponseType,
  isFavoritedDeck,
} from "@app/types/deck";
import { DeckUsageStatType } from "@app/types/deck_usage_stat";
import { KizunaType } from "@app/types/kizuna";
import { useDeckUsageAllTime } from "@app/hooks/useDeckUsageStats";
import { useKizunaDecksState } from "@app/hooks/useKizunaLevels";
import { stepDeckPage } from "@app/utils/deckListPage";
import { createLazyModal } from "@app/utils/lazyModal";

// デッキ登録モーダルはスプライト選択・タグ選択を抱えて重いので、開くまで読まない
// (理由と仕組みは createLazyModal を参照。デッキ詳細モーダルと同じ扱い)
const CreateDeckModal = createLazyModal(
  () => import("@app/components/organisms/Deck/Modal/CreateDeckModal"),
);
import {
  deckAnchorId,
  REOPEN_DECK_MODAL_DECK_ID,
  REOPEN_DECK_MODAL_WITH_RECORDS,
} from "@app/utils/deckModalReopen";
import { ZERO_DATE } from "@app/utils/date";

// 再開時のスクロール位置。画面上部に固定されたヘッダー＋タブの分だけ手前で止め、
// 対象デッキのカードがそれらに隠れないようにする。
const REOPEN_SCROLL_OFFSET = 100;

// APIが「未設定」を表すために返す日時のゼロ値(Goのtime.Timeのゼロ値)。
// お気に入りの解除を再取得を待たずに画面へ反映するとき、この値を入れる。

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

// 一覧の読み込み状態。親(TemplateDecks)がヘッダー(状態切替・表示切替)の出し分けと、
// デッキが1つも無い新規ユーザーの判定に使う。
export type DeckListLoadState = {
  // 初回の読み込みが終わったか(終わるまでヘッダーはスケルトン)
  isInitialLoaded: boolean;
  // 初回ロードが終わり、追加読み込みも無く、1件も無い
  isEmpty: boolean;
  // 1件以上表示している
  hasItems: boolean;
};

type Props = {
  userId: string;
  isArchived: boolean;
  // サーバで取った1ページ目(BFF /api/decks と同じ形)。渡されたときは初回の取得を省き、
  // 最初の描画からカードを出す(サーバ描画の HTML にもカードが載る)
  initialDecks?: DeckGetResponseType;
  // サーバで取ったきずな・戦績。無ければクライアントで取る
  initialKizuna?: KizunaType | null;
  initialUsage?: DeckUsageStatType | null;
  onCreated?: () => void;
  // 読み込み状態が変わるたびに親へ通知する(マウント直後にも一度呼ぶ)。
  onLoadStateChange?: (state: DeckListLoadState) => void;
  // 戻り遷移でデッキモーダルを再開する対象タブか。
  // 対象デッキが2ページ目以降にいると「更に読み込む」まで DeckCard が
  // マウントされず再開できないため、このタブでだけ自動で追加読み込みする。
  // 対象タブ以外が担うと、見つからないまま再開フラグを捨ててしまうので親が判定する。
  isReopenTargetTab?: boolean;
  // 再開の一連の処理（自動追加読み込み→対象デッキへの自動スクロール）が
  // 終わったことを親へ一度だけ通知する。見つからなかった場合・取得に失敗した場合も
  // 「これ以上は待たない」ことを伝えるために呼ぶ（親はこれで画面の覆いを外す）。
  onReopenSettled?: () => void;
  // 一覧ヘッダー(状態切替・表示切替)の中身。undefined ならヘッダーの行ごと出さない。
  // 何を出すか(スケルトン・切替・非表示)は親が読み込み状態(onLoadStateChange)から決める。
  header?: React.ReactNode;
};

export default function Decks({
  userId,
  isArchived,
  initialDecks,
  initialKizuna,
  initialUsage,
  onCreated,
  onLoadStateChange,
  isReopenTargetTab = false,
  onReopenSettled,
  header,
}: Props) {
  // サーバで取った1ページ目を、クライアントで取った場合と同じ手順(stepDeckPage)で初期状態にする
  const [initialStep] = useState(() =>
    initialDecks ? stepDeckPage(initialDecks, new Set(), "") : null,
  );
  const [items, setItems] = useState<DeckType[]>(() => initialStep?.appended ?? []);
  // デッキごとの全期間の戦績(対戦記録が無いデッキは含まれない)。
  // SWR で持ち、タブ切替や戻り遷移で Decks が作り直されても取り直しを待たずに出す
  const deckUsageStats = useDeckUsageAllTime(userId, initialUsage);
  const [nextCursor, setNextCursor] = useState<string>(() => initialStep?.nextCursor ?? "");
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(() => initialStep?.hasNext ?? true);
  const [isInitialLoaded, setIsInitialLoaded] = useState(initialStep !== null);
  /*
   * サーバで取った1ページ目を裏で取り直している間。
   *
   * ブラウザの「戻る」ではサーバ描画の結果(RSC)がそのまま再利用され、ページは再描画されない
   * (実測で確認)。記録を付けたりデッキ詳細でアーカイブしたりして戻ると initialDecks は古い。
   * 以前はマウントのたびに取り直していたので常に最新だった。同じ鮮度を保つため、初期値は
   * 最初の描画にだけ使い、マウント直後に1ページ目を取り直して差し替える。
   * 取り直しの間は骨格を出さず(カードは既に出ている)、追加読み込みだけ待たせる
   * (差し替えと2ページ目の追記が交錯しないように)。
   */
  const [isRefreshing, setIsRefreshing] = useState(initialStep !== null);
  // デッキ一覧の取得に失敗したか。失敗した位置（初回か追加読み込みか）に関わらず、
  // 一覧の末尾にエラーと再読み込みボタンを出す。
  const [error, setError] = useState(false);
  // 表示モードは localStorage に保存された値を購読する。
  const view = useDeckListView();
  const { isOpen, onOpen, onOpenChange } = useDisclosure();

  // deck_id → きずなの算出結果。灯の濃さ・揺れ方・きずなLv.の表示に使う。
  // 取得が終わるまで(kizunaLoading)はカードを出さず骨格のままにする。デッキだけ先に出すと、
  // きずな行(リスト29px/ギャラリー34px)が後から足されて一覧全体が伸びる二段ジャンプになる。
  // デッキ一覧ときずなは並行して取り、応答時間もほぼ同じ(本番 p50 でともに 30ms 台)なので、
  // 待つことで遅れる時間はごくわずか
  const { decks: kizunaDecks, isLoading: kizunaLoading } = useKizunaDecksState(
    userId,
    initialKizuna,
  );

  const handleRemove = (id: string) => {
    setItems((prev) => prev.filter((d) => d.data.id !== id));
  };

  /*
   * お気に入りの切り替え。
   *
   * お気に入りはユーザごとに最大1つで、設定すると他のデッキは解除される。
   * その解除は個々のカードからは反映できないため、API呼び出しも一覧全体への
   * 反映もここでまとめて行う（カードは★の表示とタップの通知だけを担う）。
   */
  const [favoritePendingDeckId, setFavoritePendingDeckId] = useState<string | null>(null);

  const handleToggleFavorite = useCallback(async (id: string, next: boolean) => {
    setFavoritePendingDeckId(id);

    try {
      const res = await fetch(`/api/decks/${id}/${next ? "favorite" : "unfavorite"}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!res.ok) {
        const t = await res.json();
        throw new Error(`HTTP error: ${res.status} Message: ${t.message}`);
      }

      const updated: DeckData = await res.json();

      // 対象のデッキだけをサーバの返した日時で更新し、他は解除済みとして揃える。
      // 「1つだけ」の状態を画面側でも守るため、解除の反映は対象以外にも及ぶ。
      setItems((prev) =>
        prev.map((d) => ({
          ...d,
          data: {
            ...d.data,
            favorited_at:
              d.data.id === id ? updated.favorited_at : (ZERO_DATE as unknown as Date),
          },
        })),
      );

      addToast({
        title: next ? "お気に入りに設定しました" : "お気に入りを解除しました",
        description: next
          ? "デッキ一覧と記録作成のデッキ選択で先頭に表示されます"
          : undefined,
        color: "success",
        timeout: 3000,
      });
    } catch (error) {
      console.error(error);

      const errorMessage =
        error instanceof Error ? error.message : "不明なエラーが発生しました";

      addToast({
        title: next ? "お気に入りの設定に失敗" : "お気に入りの解除に失敗",
        description: (
          <>
            お気に入りの更新に失敗しました
            <br />
            {errorMessage}
          </>
        ),
        color: "danger",
        timeout: 5000,
      });
    } finally {
      setFavoritePendingDeckId(null);
    }
  }, []);

  /*
   * これまでに取得済みのデッキID。重複表示の抑止と、
   * 「次のページに未取得のデッキがあるか」の判定に使う。
   *
   * 利用中タブの1ページ目だけはお気に入りのデッキが先頭へ繰り上げられるため、
   * そのデッキは本来の位置（＝より後ろのページ）でも再び返ってくる。
   * 先読みしたページを件数だけで判定すると、中身が取得済みのお気に入り1件でも
   * 「まだある」と誤判定し、押しても1件も増えない「更に読み込む」が出てしまう。
   */
  const loadedDeckIdsRef = useRef<Set<string>>(
    new Set(initialStep?.appended.map((d) => d.data.id)),
  );

  const loadMore = useCallback(async () => {
    if (isLoading || isRefreshing || !hasMore) return;

    setError(false);
    setIsLoading(true);

    try {
      const loadedDeckIds = loadedDeckIdsRef.current;
      let cursor = nextCursor;
      let hasNext = true;
      let appendedCount = 0;

      /*
       * 1ページ取って、未取得のデッキだけを足す(足す・続きの有無・カーソルの進め方は stepDeckPage)。
       * 「更に読み込む」を出すかは、BFF(/api/decks)が1件多く取って返す has_next で決める。
       * 以前は次のページを先読みして判定していたが、その往復が終わるまで骨格が消えず、
       * 初回表示が1往復ぶん遅れていた。
       *
       * 続けて次のページも読むのは、次のどちらかのときだけ:
       *   - 未取得のデッキが1件も増えなかった(取得済みのお気に入りだけのページだった)
       *   - 次ページの先頭が取得済みのデッキで、続きに未取得があるか読まないと分からない
       * 利用中タブの1ページ目では先頭へ繰り上げられたお気に入りのデッキが、本来の位置
       * (＝より後ろのページ)でも再び返るためこうなる。お気に入りが1件だけの現状では
       * 最終ページでしか起こらないためほぼ回らないが、繰り上げ対象が増えたときに
       * 一覧が途中で黙って止まったり、押しても増えない「更に読み込む」が出たりするのを防ぐ。
       * ページ数は有限で、カーソルが進まないときは打ち切るので必ず終わる。
       */
      for (;;) {
        const page: DeckGetResponseType = await fetchDecks(isArchived, cursor);
        const step = stepDeckPage(page, loadedDeckIds, cursor);

        step.appended.forEach((d) => loadedDeckIds.add(d.data.id));
        if (step.appended.length > 0) {
          appendedCount += step.appended.length;
          setItems((prev) => [...prev, ...step.appended]);
        }

        hasNext = step.hasNext;
        cursor = step.nextCursor;

        if (!hasNext) break;
        if (appendedCount > 0 && !step.peekLoaded) break;
      }

      setHasMore(hasNext);
      setNextCursor(cursor);
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
  }, [isArchived, nextCursor, isLoading, isRefreshing, hasMore, isInitialLoaded]);

  useEffect(() => {
    if (isInitialLoaded) return;
    loadMore();
  }, [isInitialLoaded, loadMore]);

  // サーバで取った1ページ目の取り直し(理由は isRefreshing のコメント)。マウント時に一度だけ
  useEffect(() => {
    if (initialStep === null) return;

    let cancelled = false;
    (async () => {
      try {
        const page = await fetchDecks(isArchived, "");
        if (cancelled) return;

        const step = stepDeckPage(page, new Set(), "");
        const loadedDeckIds = loadedDeckIdsRef.current;
        loadedDeckIds.clear();
        step.appended.forEach((d) => loadedDeckIds.add(d.data.id));
        setItems(step.appended);
        setNextCursor(step.nextCursor);
        setHasMore(step.hasNext);
      } catch (err) {
        // 取れなくても初期値の一覧は出ているので、そのまま使う
        console.error("Error refreshing decks:", err);
      } finally {
        if (!cancelled) setIsRefreshing(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [initialStep, isArchived]);

  // 戻り遷移で再開する対象デッキ。一覧に現れるまで自動で追加読み込みする。
  const [pendingReopenDeckId, setPendingReopenDeckId] = useState<string | null>(null);

  // 再開完了の通知は一度だけ。スクロール後も items（きずな・戦績の反映など）は
  // 更新され続けるため、通知済みかを ref で覚えておく。
  const reopenSettledRef = useRef(false);
  const onReopenSettledRef = useRef(onReopenSettled);
  onReopenSettledRef.current = onReopenSettled;

  const settleReopen = useCallback(() => {
    if (reopenSettledRef.current) return;
    reopenSettledRef.current = true;
    onReopenSettledRef.current?.();
  }, []);

  useEffect(() => {
    if (!isReopenTargetTab) return;
    const id = sessionStorage.getItem(REOPEN_DECK_MODAL_DECK_ID);
    if (id) {
      setPendingReopenDeckId(id);
    } else {
      // 再開対象が無い（既に消費済み等）。待つものが無いので親を待たせない。
      settleReopen();
    }
  }, [isReopenTargetTab, settleReopen]);

  // 対象デッキが一覧に現れたら、その位置までスクロールする。
  //
  // useLayoutEffect なのは順序のため。DeckCard はマウント時の useEffect(passive)で
  // モーダルを開くが、モーダルが開くと背面がスクロールロックされ、閉じたときに
  // ロック直前の位置へ戻される。レイアウトエフェクトは同じコミットの passive より
  // 必ず先に走るため、ここでロック前の位置を合わせておく。
  // スムーススクロールだとロックが掛かる頃には移動が終わっておらず、途中の位置が
  // 記録されてしまうため、瞬間移動(auto)にする。
  useLayoutEffect(() => {
    if (!pendingReopenDeckId) return;
    // きずな待ちの間はカードが描画されていない(骨格のまま)ので、描画されてから測る
    if (kizunaLoading) return;
    if (!items.some((item) => item.data.id === pendingReopenDeckId)) return;

    const el = document.getElementById(deckAnchorId(pendingReopenDeckId));
    if (el) {
      const y = el.getBoundingClientRect().top + window.scrollY - REOPEN_SCROLL_OFFSET;
      window.scrollTo({ top: Math.max(0, y), behavior: "auto" });
    }

    // 対象デッキが描画されてスクロールも済んだ時点で、再開処理としては終わり。
    // 追加読み込みの完了（次ページの先読み）まで待つと、その間ずっと覆いが残って
    // 開いたばかりのデッキモーダルまで隠してしまうため、ここで通知する。
    settleReopen();
  }, [pendingReopenDeckId, items, kizunaLoading, settleReopen]);

  // 対象デッキが描画されるまで自動ロードする。
  // 見つかった後の再開（モーダルを開く・フラグの削除）は DeckCard 側が担う。
  useEffect(() => {
    if (!pendingReopenDeckId) return;
    if (!isInitialLoaded || isLoading || isRefreshing || kizunaLoading) return;

    const found = items.some((item) => item.data.id === pendingReopenDeckId);
    if (found) {
      // 同じコミットのレイアウトエフェクトでスクロールと通知は済んでいるが、
      // 万一取りこぼしても覆いが残り続けないよう、ここでも通知する（二重呼び出しは無視される）。
      setPendingReopenDeckId(null);
      settleReopen();
      return;
    }

    if (error) {
      // 取得に失敗した状態で自動読み込みを続けると、同じ cursor を延々と
      // 取り直す（＝覆いも外れない）ため、ここで自動追加読み込みは打ち切る。
      // sessionStorage のフラグは残すので、末尾の再読み込みボタンから
      // 取り直して対象デッキが現れれば、DeckCard 側で再開はできる。
      setPendingReopenDeckId(null);
      settleReopen();
      return;
    }

    if (hasMore) {
      loadMore();
    } else {
      // 全件読み込んでも見つからない（削除済み・別タブのデッキ等）。
      // フラグを残すと、後で「更に読み込む」を押した時などに
      // 意図しないタイミングでモーダルが開いてしまうため捨てる。
      sessionStorage.removeItem(REOPEN_DECK_MODAL_DECK_ID);
      sessionStorage.removeItem(REOPEN_DECK_MODAL_WITH_RECORDS);
      setPendingReopenDeckId(null);
      settleReopen();
    }
  }, [
    pendingReopenDeckId,
    isInitialLoaded,
    isLoading,
    isRefreshing,
    kizunaLoading,
    items,
    hasMore,
    error,
    loadMore,
    settleReopen,
  ]);

  // 初回の読み込み(デッキ一覧ときずな)が済み、カードを出せる状態か。
  // 親へ通知する読み込み状態や、空状態・「更に読み込む」の出し分けはこれを基準にする
  const settled = isInitialLoaded && !kizunaLoading;
  // 初回読み込み中(サーバ描画を含む)と追加読み込み中は骨格を出す。
  // isLoading の初期値は false なので、settled を見ないとサーバ描画の HTML に骨格が入らず、
  // ハイドレーションまで一覧が空のままになる(PWA 起動やリロードで目立つ)
  const showSkeletons = !settled || isLoading;

  // 読み込み状態を親へ通知する(ヘッダーの出し分けと、デッキが1つも無い判定に使う)。
  const isEmpty = settled && !isLoading && !hasMore && items.length === 0;
  const hasItems = items.length > 0;
  useEffect(() => {
    onLoadStateChange?.({ isInitialLoaded: settled, isEmpty, hasItems });
  }, [settled, isEmpty, hasItems, onLoadStateChange]);

  return (
    <div className="flex flex-col items-center space-y-3 pb-3">
      {/* 一覧ヘッダー(状態切替・表示切替)。中身は親が決め、ここは位置だけを受け持つ。
          固定セグメント（マイデッキ｜みんなの公開デッキ。top-15＋高さ≒100px）の直下に、
          それと同じ position:fixed で貼り付ける（sticky だとスクロール中に間隔が揺れて見えるため。
          詳細は DeckViewToggleBar のコメント）。
          空状態の表示より前に置く: 固定バーの空き枠(useFixedBarAlignment)は「一覧の最初の要素」として
          位置を測るので、後ろに置くと空状態の高さぶん計算がずれてバーが浮く。 */}
      {header !== undefined && <DeckViewToggleBar>{header}</DeckViewToggleBar>}

      {/* 空状態：利用中 */}
      {isEmpty && !isArchived && (
        <div className="flex flex-col items-center justify-center py-10 px-2.5 gap-6">
          {/* きずな訴求：デッキ登録を「対戦記録の管理」ではなく「デッキとのきずなを育てる第一歩」
              として動機づける。きずなLv.は過去の記録から算出されるため、早く始めるほど深くなる——
              という一点を、灯（KizunaMark）の視覚言語で伝え、詳細は /kizuna のLPへ送る。 */}
          <div className="w-full max-w-sm overflow-hidden rounded-2xl border border-amber-300/50 bg-linear-to-br from-amber-50 to-rose-50 dark:border-amber-400/20 dark:from-amber-950/40 dark:to-rose-950/30">
            <div className="flex flex-col items-center gap-4 px-3 py-6 text-center">
              <span className="inline-flex items-center gap-2 rounded-full border border-amber-400/40 bg-amber-400/10 px-3 py-1 text-[0.6875rem] font-bold tracking-wider text-amber-700 dark:text-amber-300">
                <span className="h-1.5 w-1.5 shrink-0 animate-pulse rounded-full bg-amber-500" />
                新機能「きずな」β版公開中
              </span>

              <div className="flex flex-col items-center gap-2">
                <KizunaMark
                  size={44}
                  className="drop-shadow-[0_0_18px_rgba(251,191,36,0.55)]"
                />
                <p className="text-lg font-black leading-snug text-foreground">
                  最初のデッキと
                  <br />
                  きずなを育てよう
                </p>
              </div>

              <p className="text-xs leading-relaxed text-default-600 dark:text-default-400">
                負けても握り続けた回数、組み直した夜、連れて行った大会。
                勝率では測れないデッキとの歩みが「きずなLv.」になります。
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
      {isEmpty && isArchived && (
        <div className="flex flex-col items-center justify-center py-10 px-4 gap-3">
          <div className="p-4 rounded-full bg-default-100">
            <LuArchive className="w-10 h-10 text-default-400" />
          </div>
          <p className="font-bold text-default-500">アーカイブ済みのデッキはありません</p>
        </div>
      )}

      <div
        className={`grid w-full ${
          view === "gallery"
            ? "gap-4 grid-cols-1 lg:grid-cols-2 lg:gap-x-6"
            : "gap-3 grid-cols-1"
        }`}
      >
        {settled &&
          items.map((deck, index) => (
          <DeckCard
            key={deck.data.id}
            // ギャラリー表示の先頭2枚は最初の画面に入り LCP になるので、遅延させず優先して読む
            priorityImage={view === "gallery" && index < 2}
            deckData={deck.data}
            deckcodeData={deck.data.latest_deck_code}
            deckUsageStat={deckUsageStats.get(deck.data.id) ?? null}
            kizunaLevel={kizunaDecks.get(deck.data.id)?.level ?? null}
            onRemove={handleRemove}
            enableShowDeckModal={true}
            view={view}
            isFavorited={isFavoritedDeck(deck.data)}
            onToggleFavorite={handleToggleFavorite}
            isFavoritePending={favoritePendingDeckId === deck.data.id}
          />
        ))}

        {/* ローディング表示 */}
        {/* ★ボタンは利用中のデッキにだけ出るため、骨格もタブに合わせる */}
        {showSkeletons && <DeckCardSkeletons view={view} withFavorite={!isArchived} />}
        {settled && isLoading && (
          <div className="flex justify-center col-span-1 lg:col-span-2">
            <Spinner size="lg" className="pt-0" />
          </div>
        )}

        {/* 取得に失敗したときは、空の一覧を装わずに理由を出し、その場で取り直せるようにする。
            既に読み込めているデッキはそのまま残し、続きの取得だけをやり直す。 */}
        {settled && error && !isLoading && (
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

        {settled && !isLoading && !error && hasMore && (
          <div className="flex justify-center col-span-1 lg:col-span-2">
            <Button
              size="sm"
              radius="full"
              onPress={loadMore}
              // 1ページ目の取り直し中は押せない(押しても何も起きないより、待つことが分かるほうがよい)
              isDisabled={isRefreshing}
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
