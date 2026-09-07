"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { Tabs, Tab } from "@heroui/react";

import ScrollUpFloating from "@app/components/atoms/Floating/ScrollUpFloating";
import FloatingButtonClearance from "@app/components/atoms/Floating/FloatingButtonClearance";
import CreateRecordFloating from "@app/components/atoms/Floating/CreateRecordFloating";

import Records from "@app/components/organisms/Record/Records";

import { RecordGetResponseType } from "@app/types/record";
import { RECORDS_TABS, RecordsTab } from "@app/utils/recordListPrefs";
import { writeRecordsSelectedTab } from "@app/utils/recordsSelectedTab";

const TAB_TITLES: Record<RecordsTab, string> = {
  all: "すべて",
  official: "公式イベント",
  tonamel: "Tonamel",
  unofficial: "自由形式",
};

type Props = {
  // サーバで取った initialTab のタブの1ページ目。無ければクライアントで取る
  initial?: RecordGetResponseType | null;
  // サーバが cookie から読んだ選択中タブ(recordListPrefs)。initial はこのタブの一覧
  initialTab?: RecordsTab;
};

export default function TemplateRecords({ initial, initialTab = "all" }: Props) {
  // サーバ描画と同じタブから始める(cookie に無ければ「すべて」)。
  // 以前は sessionStorage からマウント後に復元していたので、別のタブを選んでいた人には
  // 「すべて」の一覧が一瞬出てから切り替わって見えていた
  const [selectedKey, setSelectedKey] = useState<RecordsTab>(initialTab);
  /*
   * 一度でも選んだタブ。選んだタブの一覧(Records)だけをマウントし、以後は hidden で残す。
   *
   * 以前は4タブぶんを最初から全部マウントしていたので、見ていないタブの取得
   * (一覧＋カードごとの周辺情報)が初回表示に同時に走っていた。開いたタブだけ取れば
   * 初回は1タブぶんで済み、一度開いたタブは残すので切り替えの体感は変わらない
   * (スクロール位置・読み込んだページも保たれる)。
   */
  const [mountedTabs, setMountedTabs] = useState<ReadonlySet<RecordsTab>>(
    () => new Set([initialTab]),
  );
  // 「すべて」タブが空か（null=未判定）。全種別を含むため、これが空＝記録が1件も無い。
  const [allEmpty, setAllEmpty] = useState<boolean | null>(null);

  // 「すべて」タブの空判定を受け取る（全記録を含むため記録ゼロの検出に使える）。
  const handleAllEmptyChange = useCallback((isEmpty: boolean) => {
    setAllEmpty(isEmpty);
  }, []);

  // 記録が1つも無いときはフローティング（トップへ戻る／＋作成）を隠す。
  // 作成は空状態カード内の「記録を作成する」ボタンから行える。
  const hideFloating = allEmpty === true;

  // タブごとのスクロール位置を保存
  const scrollPositions = useRef<Record<RecordsTab, number>>({
    all: 0,
    official: 0,
    tonamel: 0,
    unofficial: 0,
  });

  const handleSelectionChange = (key: React.Key) => {
    const tab = key as RecordsTab;

    // 切り替え前のスクロール位置を保存
    scrollPositions.current[selectedKey] = window.scrollY;

    // リロード後もサーバ描画の時点から同じタブで描けるように保存する
    writeRecordsSelectedTab(tab);

    setSelectedKey(tab);
    setMountedTabs((prev) => (prev.has(tab) ? prev : new Set(prev).add(tab)));
  };

  // タブ切り替え後にスクロール復元
  useEffect(() => {
    window.scrollTo({
      top: scrollPositions.current[selectedKey],
      behavior: "auto",
    });
  }, [selectedKey]);

  return (
    <>
      {!hideFloating && (
        <>
          <ScrollUpFloating />
          <CreateRecordFloating eventType={selectedKey} />
        </>
      )}
      <div className="pt-12 w-full">
        <Tabs
          fullWidth
          size="md"
          selectedKey={selectedKey}
          onSelectionChange={handleSelectionChange}
          className="fixed z-50 top-15 left-0 right-0 lg:left-56 pl-1 pr-1"
          classNames={{
            cursor: "",
            tab: "h-8",
            tabList: "",
            tabContent: "font-bold",
          }}
        >
          {RECORDS_TABS.map((tab) => (
            <Tab key={tab} title={TAB_TITLES[tab]} />
          ))}
        </Tabs>
      </div>

      {RECORDS_TABS.map((tab) => (
        <div
          key={tab}
          className="w-full pt-2 lg:pb-6 lg:max-w-4xl lg:mx-auto"
          hidden={selectedKey !== tab}
        >
          {mountedTabs.has(tab) && (
            <Records
              event_type={tab}
              isActive={selectedKey === tab}
              // サーバで取った1ページ目は、そのタブの一覧にだけ渡す
              initialPage={tab === initialTab ? (initial ?? undefined) : undefined}
              onEmptyChange={tab === "all" ? handleAllEmptyChange : undefined}
            />
          )}
        </div>
      ))}

      {/* 表示中のパネル以外は hidden(display:none)で高さを持たないため、
          クリアランスは4パネルの後に1つ置けば表示中パネル末尾に付く。
          記録が少ないタブ(Tonamel / 自由形式など)でも、末尾がフローティングボタンに
          掛かるときは不足分だけ余白が入る（掛からなければ余白は出ない）。 */}
      <FloatingButtonClearance />
    </>
  );
}
