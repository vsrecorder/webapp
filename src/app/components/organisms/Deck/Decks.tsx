"use client";

import { useEffect, useLayoutEffect, useRef, useState, useCallback } from "react";

import NextLink from "next/link";

import { Spinner } from "@heroui/spinner";
import { Button, Link, useDisclosure } from "@heroui/react";
import { addToast } from "@heroui/react";

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

import {
  DeckType,
  DeckData,
  DeckGetResponseType,
  isFavoritedDeck,
} from "@app/types/deck";
import { DeckUsageItemType, DeckUsageStatType } from "@app/types/deck_usage_stat";
import { useKizunaDecks } from "@app/hooks/useKizunaLevels";
import {
  deckAnchorId,
  REOPEN_DECK_MODAL_DECK_ID,
  REOPEN_DECK_MODAL_WITH_RECORDS,
} from "@app/utils/deckModalReopen";

// 再開時のスクロール位置。画面上部に固定されたヘッダー＋タブの分だけ手前で止め、
// 対象デッキのカードがそれらに隠れないようにする。
const REOPEN_SCROLL_OFFSET = 100;

// APIが「未設定」を表すために返す日時のゼロ値(Goのtime.Timeのゼロ値)。
// お気に入りの解除を再取得を待たずに画面へ反映するとき、この値を入れる。
const ZERO_DATE = "0001-01-01T00:00:00Z";

/*
 * 画面上部に固定表示するバーの「横位置合わせ」。
 *
 * position:sticky はスクロール量に応じて毎フレーム位置が決まるため、iOS のように
 * スクロールを別スレッドで処理する環境では固定タブ(position:fixed)より遅れて追従し、
 * 上下に揺れて見える。そこで上のタブと同じ position:fixed に揃えて、
 * スクロール量から完全に切り離す。
 *
 * ただし fixed はレイアウトの流れから外れるので、横幅・横位置を自分で決める必要がある。
 * ここでは「流れの中に残した空き枠(slot)」の実測値をバーへ写すことで解決する。
 * <main> の左右余白(ログイン状態やブレークポイントで変わる)や lg:max-w-4xl を
 * 書き写さずに済み、将来それらが変わってもデッキカードの列と必ず揃う。
 *
 * 位置の再計算はリサイズ時だけで、スクロール中は何もしない。
 */
function useFixedBarAlignment() {
  const slotRef = useRef<HTMLDivElement | null>(null);
  const barRef = useRef<HTMLDivElement | null>(null);
  // 空き枠に確保する高さ。バーの実測値を入れて、抜けたぶんのズレを埋める。
  const [slotHeight, setSlotHeight] = useState<number | undefined>(undefined);

  useLayoutEffect(() => {
    const slot = slotRef.current;
    const bar = barRef.current;
    if (!slot || !bar) return;

    const sync = () => {
      const rect = slot.getBoundingClientRect();
      const left = `${rect.left}px`;
      const width = `${rect.width}px`;
      // 同じ値の書き戻しは ResizeObserver のループ警告を招くので避ける
      if (bar.style.left !== left) bar.style.left = left;
      if (bar.style.width !== width) bar.style.width = width;

      /*
       * 空き枠の縦位置を、バーの貼り付き位置に合わせて持ち上げる。
       *
       * 空き枠は「上の余白ぶん下」から始まるが、バーは常に top-25 に貼り付く。
       * 揃えないと、ページ最上部にいるときだけバーが空き枠より上にずれ、
       * バーとカードの間隔がスクロール開始の瞬間に詰まって見える。
       * ずれ量は余白の合計（ヘッダー・タブぶん）から決まるので、
       * 数値を書き写さずに実測の差から求める。
       */
      slot.style.marginTop = "0px";
      const slotDocumentTop = slot.getBoundingClientRect().top + window.scrollY;
      // fixed なのでバーの top はビューポート基準＝スクロール量0のときの文書上の位置
      const barPinnedTop = bar.getBoundingClientRect().top;
      slot.style.marginTop = `${barPinnedTop - slotDocumentTop}px`;

      // 高さは横幅を当てたあとに測る(幅が決まらないと折り返しで変わるため)
      const height = bar.offsetHeight;
      setSlotHeight((prev) =>
        prev !== undefined && Math.abs(prev - height) < 0.5 ? prev : height,
      );
    };

    sync();

    const observer = new ResizeObserver(sync);
    observer.observe(slot);
    observer.observe(bar);
    window.addEventListener("resize", sync);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", sync);
    };
  }, []);

  return { slotRef, barRef, slotHeight };
}

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
  // 初回ロードが終わり1件も無い状態になったかを親へ通知する。
  // 親（TemplateDecks）はこれを使ってタブ表示・スクロール可否を切り替える。
  onEmptyChange?: (isEmpty: boolean) => void;
  // 戻り遷移でデッキモーダルを再開する対象タブか。
  // 対象デッキが2ページ目以降にいると「更に読み込む」まで DeckCard が
  // マウントされず再開できないため、このタブでだけ自動で追加読み込みする。
  // 対象タブ以外が担うと、見つからないまま再開フラグを捨ててしまうので親が判定する。
  isReopenTargetTab?: boolean;
  // 再開の一連の処理（自動追加読み込み→対象デッキへの自動スクロール）が
  // 終わったことを親へ一度だけ通知する。見つからなかった場合・取得に失敗した場合も
  // 「これ以上は待たない」ことを伝えるために呼ぶ（親はこれで画面の覆いを外す）。
  onReopenSettled?: () => void;
};

export default function Decks({
  userId,
  isArchived,
  onCreated,
  onEmptyChange,
  isReopenTargetTab = false,
  onReopenSettled,
}: Props) {
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
  // リスト/ギャラリー切り替えバーを、上の固定タブと同じく画面へ固定するための位置合わせ。
  const {
    slotRef: viewToggleSlotRef,
    barRef: viewToggleBarRef,
    slotHeight: viewToggleSlotHeight,
  } = useFixedBarAlignment();
  const { isOpen, onOpen, onOpenChange } = useDisclosure();

  // deck_id → きずなの算出結果。灯の濃さ・揺れ方・きずなLv.の表示に使う
  const kizunaDecks = useKizunaDecks(userId);

  useEffect(() => {
    fetchDeckUsageStats(userId).then(setDeckUsageStats);
  }, [userId]);

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
  const loadedDeckIdsRef = useRef<Set<string>>(new Set());

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

      // 失敗後の再読み込みやお気に入りの繰り上げで同じデッキが再び返ることがあるため、
      // 既に取得済みのデッキは足さない（重複表示を防ぐ）
      const loadedDeckIds = loadedDeckIdsRef.current;
      const appended = newItems.decks.filter((d) => !loadedDeckIds.has(d.data.id));
      appended.forEach((d) => loadedDeckIds.add(d.data.id));

      if (appended.length > 0) {
        setItems((prev) => [...prev, ...appended]);
      }

      const lastItem = newItems.decks[newItems.decks.length - 1];
      if (lastItem && lastItem.cursor) {
        // 次のページを先読みして「更に読み込む」を出すかどうかを決める。
        // 件数ではなく未取得のデッキが含まれるかで判定する。
        //
        // 全件が取得済みだったページは、そこで打ち切らずカーソルを進めて次を見る。
        // 「1ページ全部が取得済み」は、お気に入りが1件だけの現状では最終ページでしか
        // 起こらないためループは実際には回らないが、繰り上げ対象が増えたときに
        // 一覧が途中で黙って止まるのを防ぐ。ページ数は有限なので必ず終わる。
        const hasUnloaded = (page: DeckGetResponseType) =>
          page.decks.some((d) => !loadedDeckIds.has(d.data.id));

        let cursor = lastItem.cursor;
        let nextItems: DeckGetResponseType = await fetchDecks(isArchived, cursor);

        while (nextItems.decks.length > 0 && !hasUnloaded(nextItems)) {
          const nextLast = nextItems.decks[nextItems.decks.length - 1];

          // カーソルが進まないとき（サーバが同じページを返し続ける等）は
          // 無限に取得し続けてしまうため、ここで打ち切る。
          if (!nextLast?.cursor || nextLast.cursor === cursor) break;

          cursor = nextLast.cursor;
          nextItems = await fetchDecks(isArchived, cursor);
        }

        setHasMore(hasUnloaded(nextItems));
        setNextCursor(cursor);
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
  }, [isArchived, nextCursor, isLoading, hasMore, isInitialLoaded]);

  useEffect(() => {
    if (isInitialLoaded) return;
    loadMore();
  }, [isInitialLoaded, loadMore]);

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
  }, [pendingReopenDeckId, items, settleReopen]);

  // 対象デッキが描画されるまで自動ロードする。
  // 見つかった後の再開（モーダルを開く・フラグの削除）は DeckCard 側が担う。
  useEffect(() => {
    if (!pendingReopenDeckId) return;
    if (!isInitialLoaded || isLoading) return;

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
    items,
    hasMore,
    error,
    loadMore,
    settleReopen,
  ]);

  // 初回ロードが終わり、追加読み込みも無く、1件も無い状態を「空」として親へ通知する。
  const isEmpty = isInitialLoaded && !isLoading && !hasMore && items.length === 0;
  useEffect(() => {
    onEmptyChange?.(isEmpty);
  }, [isEmpty, onEmptyChange]);

  return (
    <div className="flex flex-col items-center space-y-3 pb-3">
      {/* 空状態：利用中 */}
      {isInitialLoaded && !isLoading && !hasMore && items.length === 0 && !isArchived && (
        <div className="flex flex-col items-center justify-center py-10 px-2.5 gap-6">
          {/* きずな訴求：デッキ登録を「対戦記録の管理」ではなく「デッキとのきずなを育てる第一歩」
              として動機づける。きずなLv.は過去の記録から算出されるため、早く始めるほど深くなる——
              という一点を、灯（KizunaMark）の視覚言語で伝え、詳細は /kizuna のLPへ送る。 */}
          <div className="w-full max-w-sm overflow-hidden rounded-2xl border border-amber-300/50 bg-linear-to-br from-amber-50 to-rose-50 dark:border-amber-400/20 dark:from-amber-950/40 dark:to-rose-950/30">
            <div className="flex flex-col items-center gap-4 px-3 py-6 text-center">
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
          固定タブ（top-15＋タブ高さ≒100px）の直下に、そのタブと同じ position:fixed で
          貼り付ける（sticky だとスクロール中にタブとの間隔が揺れて見えるため。
          詳細は useFixedBarAlignment のコメント）。
          初回ロード中はトグルのスケルトンを表示する。 */}
      {(!isInitialLoaded || items.length > 0) && (
        // 親の space-y-3 は「隣り合う子」に上マージンを付ける。バーを直接の子にすると
        // fixed なのにそのマージンぶん下へずれてしまうため、空き枠と一緒に包んで避ける。
        <div className="w-full">
          {/* 流れの中に残す空き枠。バーの横位置・横幅の基準になり、
              同時に fixed で抜けたぶんの高さを埋めてカードの重なりを防ぐ。
              h-12 はバーの実寸(py-2 16px＋トグル32px)と同じ既定値で、
              実測が入るまで（サーバ描画〜ハイドレーション）の高さを埋める。 */}
          <div
            ref={viewToggleSlotRef}
            aria-hidden
            className="h-12"
            style={{ height: viewToggleSlotHeight }}
          />
          {/* 半透明にすると下を流れるカードが透けて揺らいで見えるため、背景は不透明にする。
              地色はページのドット背景と同じにして、境目が出ないようにする。
              left-0 right-0 は実測が入るまでの仮の横幅。無いと横幅が内容依存に縮んで
              ハイドレーション前だけバーが潰れて見える（実測後はインラインの left/width が勝つ）。 */}
          <div
            ref={viewToggleBarRef}
            className="app-dot-bg-plain fixed top-25 right-0 left-0 z-40 py-2"
          >
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
            isFavorited={isFavoritedDeck(deck.data)}
            onToggleFavorite={handleToggleFavorite}
            isFavoritePending={favoritePendingDeckId === deck.data.id}
          />
        ))}

        {/* ローディング表示 */}
        {/* ★ボタンは利用中のデッキにだけ出るため、骨格もタブに合わせる */}
        {isLoading && <DeckCardSkeletons view={view} withFavorite={!isArchived} />}
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
