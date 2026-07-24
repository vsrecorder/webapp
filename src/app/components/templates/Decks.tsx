"use client";

import { useState, useCallback, useEffect } from "react";

import ScrollUpFloating from "@app/components/atoms/Floating/ScrollUpFloating";
import FloatingButtonClearance from "@app/components/atoms/Floating/FloatingButtonClearance";
import CreateDeckFloating from "@app/components/molecules/Floating/CreateDeckFloating";

import Decks from "@app/components/organisms/Deck/Decks";

import { Tabs, Tab } from "@heroui/react";

type TabKey = "inuse" | "archived";

const SELECTED_TAB_STORAGE_KEY = "decksSelectedTab";

type Props = {
  userId: string;
};

export default function TemplateDecks({ userId }: Props) {
  const [refreshKey, setRefreshKey] = useState(0);
  // SSR と一致させるため初期値は "inuse" で固定し、クライアント側でのみ復元する。
  const [selectedKey, setSelectedKey] = useState<"inuse" | "archived">("inuse");
  // 利用中タブが空か（null=未判定）。デッキが1つも無い新規ユーザーの検出に使う。
  const [inUseEmpty, setInUseEmpty] = useState<boolean | null>(null);
  // アーカイブ済みにデッキがあるか（null=未確認）。利用中が空のときだけ確認する。
  const [hasArchivedDecks, setHasArchivedDecks] = useState<boolean | null>(null);

  // マウント後（クライアント専用）にタブを復元する。
  // 遷移再開フラグ（reopenDeckModalArchived）が立っていればそちらを優先し、
  // なければ sessionStorage に保存済みのタブを復元する。
  useEffect(() => {
    if (sessionStorage.getItem("reopenDeckModalArchived") === "1") {
      setSelectedKey("archived");
    } else {
      const saved = sessionStorage.getItem(SELECTED_TAB_STORAGE_KEY);
      if (saved === "archived") setSelectedKey("archived");
    }
    // 役目を終えたフラグは削除（DeckCard が使う reopenDeckModalDeckId は残す）。
    sessionStorage.removeItem("reopenDeckModalArchived");
  }, []);

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

  // 利用中タブの空判定を受け取る（アーカイブ済みタブの通知は渡さないので混ざらない）。
  const handleInUseEmptyChange = useCallback((isEmpty: boolean) => {
    setInUseEmpty(isEmpty);
  }, []);

  // 利用中が空になったときだけ、アーカイブ済みデッキの有無を一度確認する。
  // これで「デッキが1つも無い（新規ユーザー）」と「利用中は空だがアーカイブ済みはある」を区別する。
  useEffect(() => {
    if (inUseEmpty !== true) {
      // 利用中に1件でもあれば判定不要。次に空になったとき再確認するため未確認へ戻す。
      setHasArchivedDecks(null);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/decks?archived=true&cursor=`, {
          cache: "no-store",
          headers: { Accept: "application/json" },
        });
        if (!res.ok) {
          // 判定できないときはタブを残す側に倒し、アーカイブ済みへ辿れなくなるのを防ぐ。
          if (!cancelled) setHasArchivedDecks(true);
          return;
        }
        const data = await res.json();
        if (!cancelled) {
          setHasArchivedDecks(Array.isArray(data?.decks) && data.decks.length > 0);
        }
      } catch {
        if (!cancelled) setHasArchivedDecks(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [inUseEmpty]);

  // デッキが1つも無い（新規ユーザー）ときはタブを隠す。判定中は隠す側に倒し、
  // アーカイブ済みにデッキがあると分かった場合のみタブを残す（common caseのちらつき回避）。
  const hideTabs = inUseEmpty === true && hasArchivedDecks !== true;

  // 空状態のページは1画面に収め、余白へのスクロールを止める。
  useEffect(() => {
    if (!hideTabs) return;
    const html = document.documentElement;
    const body = document.body;
    const prevHtml = html.style.overflow;
    const prevBody = body.style.overflow;
    html.style.overflow = "hidden";
    body.style.overflow = "hidden";
    return () => {
      html.style.overflow = prevHtml;
      body.style.overflow = prevBody;
    };
  }, [hideTabs]);

  return (
    <>
      {/* デッキが1つも無いときはフローティング（トップへ戻る／＋登録）も隠す。
          登録は空状態カード内の「デッキを登録する」ボタンから行える。 */}
      {!hideTabs && (
        <>
          <ScrollUpFloating />
          <CreateDeckFloating onCreated={handleCreatedDeck} />
        </>
      )}
      <div className={`${hideTabs ? "" : "pt-12"} w-full`}>
        {/* デッキが1つも無いときはタブを隠す（新規ユーザーには一覧の切り替えは不要なため）。 */}
        {!hideTabs && (
          <Tabs
            fullWidth
            size="md"
            selectedKey={selectedKey}
            onSelectionChange={handleSelectionChange}
            // 背景が固定のパステル色のため、ダークモードでも文字色などを
            // ライトモードの見た目に固定する（light クラスでテーマをライトに再スコープ）
            className="light fixed z-50 top-15 left-0 right-0 lg:left-56 pl-1 pr-1"
            classNames={{
              cursor: selectedKey === "inuse" ? "bg-green-200" : "bg-red-200",
              tab: "h-8",
              tabList: selectedKey === "inuse" ? "bg-red-100" : "bg-green-100",
              tabContent: "font-bold",
            }}
          >
            <Tab key="inuse" title="利用中" />
            <Tab key="archived" title="アーカイブ済み" />
          </Tabs>
        )}
        {/* 最下部のカードがフローティングボタン（＋/トップへ戻る）と重ならないよう余白を確保するが、
            デッキが少なく1画面に収まるときは余白を出さず、空白へスクロールできてしまうのを防ぐ
            （FloatingButtonClearance がコンテンツの溢れを検知して余白を出し分ける）。 */}
        <div className="pt-2 lg:pb-6 lg:max-w-4xl lg:mx-auto">
          <Decks
            key={`${selectedKey}-${refreshKey}`}
            userId={userId}
            isArchived={selectedKey === "archived"}
            onCreated={handleCreatedDeck}
            // 利用中タブのときだけ空通知を受け取る（アーカイブ済みの空はタブ表示に使わない）。
            onEmptyChange={selectedKey === "inuse" ? handleInUseEmptyChange : undefined}
          />
          <FloatingButtonClearance />
        </div>
      </div>
    </>
  );
}
