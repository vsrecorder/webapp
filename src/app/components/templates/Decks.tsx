"use client";


import { useState, useCallback, useEffect } from "react";

import ScreenLockLoading from "@app/components/atoms/ScreenLockLoading";
import ScrollUpFloating from "@app/components/atoms/Floating/ScrollUpFloating";
import FloatingButtonClearance from "@app/components/atoms/Floating/FloatingButtonClearance";
import CreateDeckFloating from "@app/components/molecules/Floating/CreateDeckFloating";

import Decks, { DeckListLoadState } from "@app/components/organisms/Deck/Decks";
import { DeckViewToggleSkeleton } from "@app/components/organisms/Deck/Skeleton/DeckCardSkeleton";

import { useScreenLockLoading } from "@app/hooks/useScreenLockLoading";


import DeckSegmentedControl from "@app/components/molecules/DeckSegmentedControl";
import DeckStatusToggle from "@app/components/molecules/DeckStatusToggle";
import DeckViewToggle from "@app/components/molecules/DeckViewToggle";

const INITIAL_LOAD_STATE: DeckListLoadState = { isInitialLoaded: false, isEmpty: false, hasItems: false };

type TabKey = "inuse" | "archived";

const SELECTED_TAB_STORAGE_KEY = "decksSelectedTab";

type Props = {
  userId: string;
};

export default function TemplateDecks({ userId }: Props) {
  const [refreshKey, setRefreshKey] = useState(0);
  // SSR と一致させるため初期値は "inuse" で固定し、クライアント側でのみ復元する。
  const [selectedKey, setSelectedKey] = useState<"inuse" | "archived">("inuse");
  // 表示中の一覧(Decks)の読み込み状態。ヘッダー(状態切替・表示切替)の出し分けに使う。
  const [loadState, setLoadState] = useState<DeckListLoadState>(INITIAL_LOAD_STATE);
  // 利用中タブが空か（null=未判定）。デッキが1つも無い新規ユーザーの検出に使う。
  const [inUseEmpty, setInUseEmpty] = useState<boolean | null>(null);
  // 利用中が空になった回数。空になるたびにアーカイブ済みの有無を確認し直すための番号で、
  // 確認結果(archivedCheck)はこの番号と一致するものだけを有効とみなす。
  const [emptyToken, setEmptyToken] = useState(0);
  // アーカイブ済みにデッキがあるかの確認結果。利用中が空のときだけ確認する。
  const [archivedCheck, setArchivedCheck] = useState<{ token: number; has: boolean } | null>(null);
  const hasArchivedDecks = archivedCheck?.token === emptyToken ? archivedCheck.has : null;
  // 戻り遷移でデッキモーダルを再開する対象デッキが、アーカイブ済みタブ側か
  // （null=再開対象なし）。対象タブの Decks にだけ自動追加読み込みを担わせる。
  const [reopenTargetArchived, setReopenTargetArchived] = useState<boolean | null>(null);
  /*
   * 戻り遷移でのデッキモーダル再開が済むまで、画面全体をローディングで覆う。
   *
   * 再開時は「タブの切り替え → 対象デッキが出るまでの自動追加読み込み →
   * 対象デッキへの自動スクロール」が続けて走る。素のままだと一覧が伸びていく様子と
   * 勝手なスクロールが見えてしまい、その途中で触ると位置もずれるため、
   * 一連の処理が終わるまで覆って操作も受け付けないようにする。
   */
  const {
    isLocked: isReopening,
    lock: lockScreen,
    release: releaseScreen,
  } = useScreenLockLoading();

  // マウント後（クライアント専用）にタブを復元する。
  // 遷移再開フラグ（reopenDeckModalArchived）が立っていればそちらを優先し、
  // なければ sessionStorage に保存済みのタブを復元する。
  useEffect(() => {
    const archivedFlag = sessionStorage.getItem("reopenDeckModalArchived");
    if (archivedFlag === "1") {
      setSelectedKey("archived");
    } else {
      const saved = sessionStorage.getItem(SELECTED_TAB_STORAGE_KEY);
      if (saved === "archived") setSelectedKey("archived");
    }
    // 再開対象のデッキがどちらのタブに属するかを控えておく。
    // 対象デッキが2ページ目以降にいる場合に、そのタブでだけ自動で追加読み込みさせる。
    if (sessionStorage.getItem("reopenDeckModalDeckId") !== null) {
      setReopenTargetArchived(archivedFlag === "1");
      lockScreen();
    }
    // 役目を終えたフラグは削除（DeckCard が使う reopenDeckModalDeckId は残す）。
    sessionStorage.removeItem("reopenDeckModalArchived");
  }, [lockScreen]);

  // 選択タブを sessionStorage に保存し、リロード後も復元できるようにする。
  useEffect(() => {
    sessionStorage.setItem(SELECTED_TAB_STORAGE_KEY, selectedKey);
  }, [selectedKey]);

  const handleCreatedDeck = useCallback(() => {
    setRefreshKey((prev) => prev + 1);
    setSelectedKey("inuse");
  }, []);

  const handleSelectionChange = (key: React.Key) => {
    setSelectedKey(key as TabKey);
  };

  // 一覧の読み込み状態を受け取る。空判定は利用中タブのときだけ使う
  // （アーカイブ済みの空はタブ表示に使わない）。
  const handleLoadStateChange = useCallback(
    (state: DeckListLoadState) => {
      setLoadState(state);
      if (selectedKey !== "inuse") return;
      setInUseEmpty(state.isEmpty);
      if (state.isEmpty) setEmptyToken((token) => token + 1);
    },
    [selectedKey],
  );

  // 再開処理（自動追加読み込み→自動スクロール）が終わったら覆いを外す。
  // 対象デッキへスクロールした直後にデッキモーダルが開くため、すぐ外すと
  // モーダルが開き切る前の一覧が一瞬見えてしまう。開閉アニメーション（約300ms）が
  // 終わるまで覆いを残し、覆いが消えたときにはモーダルが出ている状態にする。
  const handleReopenSettled = useCallback(() => {
    releaseScreen(350);
  }, [releaseScreen]);

  // 利用中が空になったときだけ、アーカイブ済みデッキの有無を一度確認する。
  // これで「デッキが1つも無い（新規ユーザー）」と「利用中は空だがアーカイブ済みはある」を区別する。
  // 空になるたび(emptyToken が進むたび)に確認する。利用中に1件でもあれば確認しない
  // (古い確認結果は番号が合わなくなるので自然に無効になる)。
  useEffect(() => {
    if (inUseEmpty !== true) return;

    const token = emptyToken;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/decks?archived=true&cursor=`, {
          cache: "no-store",
          headers: { Accept: "application/json" },
        });
        if (!res.ok) {
          // 判定できないときはタブを残す側に倒し、アーカイブ済みへ辿れなくなるのを防ぐ。
          if (!cancelled) setArchivedCheck({ token, has: true });
          return;
        }
        const data = await res.json();
        if (!cancelled) {
          setArchivedCheck({ token, has: Array.isArray(data?.decks) && data.decks.length > 0 });
        }
      } catch {
        if (!cancelled) setArchivedCheck({ token, has: true });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [inUseEmpty, emptyToken]);

  // デッキが1つも無い（新規ユーザー）ときはタブを隠す。判定中は隠す側に倒し、
  // アーカイブ済みにデッキがあると分かった場合のみタブを残す（common caseのちらつき回避）。
  const hideTabs = inUseEmpty === true && hasArchivedDecks !== true;

  // 一覧ヘッダー(左: 利用中／アーカイブ済み、右: リスト／ギャラリー)。
  //   - 初回ロード中はスケルトン
  //   - 1件以上あるか、状態切替を出す(デッキが1つでもある)ならヘッダーを出す
  //     (一覧が空でも、空の利用中からアーカイブ済みへ移れるようにする)
  //   - デッキが1つも無い新規ユーザーには出さない
  const showHeader = !loadState.isInitialLoaded || loadState.hasItems || !hideTabs;
  const header = !showHeader ? undefined : !loadState.isInitialLoaded ? (
    <DeckViewToggleSkeleton />
  ) : (
    <div className="grid w-full grid-cols-2 items-center gap-1.5">
      {/* 左右を同じ幅(2列グリッド)にし、状態切替と表示切替を同じ大きさで揃える
          (文字の大きさ・余白・折り返し禁止は SegmentedButtons が持つ) */}
      <div className="min-w-0">
        {!hideTabs && <DeckStatusToggle value={selectedKey} onChange={handleSelectionChange} />}
      </div>
      {loadState.hasItems && <DeckViewToggle />}
    </div>
  );

  // 空状態のページは1画面に収め、余白へのスクロールを止める。
  // ただし背の低い端末で案内カードが1画面に収まらないときは止めない
  // (止めると下の「デッキを登録する」ボタンに届かなくなる)。
  useEffect(() => {
    if (!hideTabs) return;
    const html = document.documentElement;
    const body = document.body;
    const prevHtml = html.style.overflow;
    const prevBody = body.style.overflow;

    const apply = () => {
      const fits = html.scrollHeight <= window.innerHeight + 1;
      html.style.overflow = fits ? "hidden" : prevHtml;
      body.style.overflow = fits ? "hidden" : prevBody;
    };
    apply();
    window.addEventListener("resize", apply);

    return () => {
      window.removeEventListener("resize", apply);
      html.style.overflow = prevHtml;
      body.style.overflow = prevBody;
    };
  }, [hideTabs]);

  return (
    <>
      {/* 再開中の目隠し。デッキモーダルより前面に出したいので、
          この位置（ページ最前面のポータル）で描画する。 */}
      {isReopening && <ScreenLockLoading label="デッキ情報を開いています" />}

      {/* デッキが1つも無いときはフローティング（トップへ戻る／＋登録）も隠す。
          登録は空状態カード内の「デッキを登録する」ボタンから行える。 */}
      {!hideTabs && (
        <>
          <ScrollUpFloating />
          <CreateDeckFloating onCreated={handleCreatedDeck} />
        </>
      )}
      <div className="pt-12 w-full">
        {/* 「マイデッキ｜みんなの公開デッキ」はデッキの有無によらず常に最上部に出す */}
        <DeckSegmentedControl selected="mine" viewerId={userId} />

        {/* 最下部のカードがフローティングボタン（＋/トップへ戻る）と重ならないよう余白を確保するが、
            末尾がボタンに掛からないときは余白を出さず、空白へスクロールできてしまうのを防ぐ
            （FloatingButtonClearance が不足分だけ余白を出し分ける）。 */}
        <div className="pt-2 lg:pb-6 lg:max-w-4xl lg:mx-auto">
          <Decks
            key={`${selectedKey}-${refreshKey}`}
            userId={userId}
            isArchived={selectedKey === "archived"}
            onCreated={handleCreatedDeck}
            onLoadStateChange={handleLoadStateChange}
            header={header}
            isReopenTargetTab={
              reopenTargetArchived !== null &&
              reopenTargetArchived === (selectedKey === "archived")
            }
            onReopenSettled={handleReopenSettled}
          />
          <FloatingButtonClearance />
        </div>
      </div>
    </>
  );
}
