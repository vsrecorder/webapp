"use client";

import { useEffect, useRef, useState } from "react";

import { Tabs, Tab } from "@heroui/react";

import ScrollUpFloating from "@app/components/atoms/Floating/ScrollUpFloating";

import CityleagueResults from "@app/components/organisms/Cityleague/CityleagueResults";

import {
  CITYLEAGUE_TABS,
  CityleagueTab,
  DEFAULT_CITYLEAGUE_TAB,
  cityleagueTabToLeagueType,
} from "@app/utils/cityleagueListPrefs";
import { CityleagueListInitialData } from "@app/utils/cityleagueListServer";
import { writeCityleagueSelectedTab } from "@app/utils/cityleagueSelectedTab";

const TAB_TITLES: Record<CityleagueTab, string> = {
  league_type_1: "オープンリーグ",
  league_type_3: "シニアリーグ",
  league_type_2: "ジュニアリーグ",
};

type Props = {
  // 過去の結果を探す軸チップ。サーバコンポーネントのまま受け取るため、props で差し込む。
  // タブが fixed で画面上部に固定されているため、タブの下（スクロール領域の先頭）に置く。
  browseSection?: React.ReactNode;
  // 個別ページへのリンク集。上のタブは結果をその場に展開するだけでリンクを持たないため、
  // 個別ページへの導線をここで補う。タブの表示を邪魔しないよう末尾に置く。
  latestSection?: React.ReactNode;
  // サーバで取った initialTab のタブの1ページ目。無ければクライアントで取る
  initial?: CityleagueListInitialData | null;
  // サーバが cookie から読んだ選択中タブ(cityleagueListPrefs)。initial はこのタブのぶん
  initialTab?: CityleagueTab;
};

export default function TemplateCityleagueResults({
  browseSection,
  latestSection,
  initial,
  initialTab = DEFAULT_CITYLEAGUE_TAB,
}: Props) {
  // サーバ描画と同じタブから始める(cookie に無ければオープンリーグ)。
  // 以前は sessionStorage からマウント後に復元していたので、別のタブを選んでいた人には
  // オープンリーグの結果が一瞬出てから切り替わって見えていた
  const [selectedKey, setSelectedKey] = useState<CityleagueTab>(initialTab);

  /*
   * 一度でも選んだタブ。選んだタブの一覧(CityleagueResults)だけをマウントし、
   * 以後は hidden で残す。
   *
   * 以前は3タブぶんを最初から全部マウントしていたので、見ていないタブの取得
   * (結果＋その日の公式イベント)が初回表示に同時に走っていた(本番の実測でも
   * 結果APIと公式イベントAPIが常に3本ずつ飛んでいた)。開いたタブだけ取れば初回は
   * 1タブぶんで済み、一度開いたタブは残すので切り替えの体感は変わらない
   * (スクロール位置・読み込んだページも保たれる)。
   */
  const [mountedTabs, setMountedTabs] = useState<ReadonlySet<CityleagueTab>>(
    () => new Set([initialTab]),
  );

  // タブごとのスクロール位置を保存
  const scrollPositions = useRef<Record<CityleagueTab, number>>({
    league_type_1: 0,
    league_type_3: 0,
    league_type_2: 0,
  });

  const handleSelectionChange = (key: React.Key) => {
    const tab = key as CityleagueTab;

    // 切り替え前のスクロール位置を保存
    scrollPositions.current[selectedKey] = window.scrollY;

    // リロード後もサーバ描画の時点から同じタブで描けるように保存する
    writeCityleagueSelectedTab(tab);

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
      <ScrollUpFloating />
      <div className="pt-12 w-full">
        <Tabs
          fullWidth
          size="md"
          selectedKey={selectedKey}
          onSelectionChange={handleSelectionChange}
          /*
            上端をヘッダーの下端に合わせ(top-14=56px)、タブ自体は pt-1 で元の 60px に置く。
            以前は top-15(60px)から始まっていたため、ヘッダー下端との間に 4px の透明な帯が
            残り、そこと tabList の角丸のすき間から本文が透けて流れていた
            (実測でこの帯のピクセルが 12px スクロールごとに 7.68% 変化)。
            背景をページと同じ地色で不透明に敷いて塞ぐ。
            lg はヘッダーが h-28 でタブの top-28 と一致するため隙間が無く、pt は 0 に戻す。
          */
          className="fixed z-50 top-14 left-0 right-0 lg:top-28 pt-1 lg:pt-0 pl-1 pr-1 app-dot-bg-plain"
          classNames={{
            cursor: "",
            tab: "h-8",
            tabList: "",
            tabContent: "font-bold",
          }}
        >
          {/*
            HeroUI(React Aria)の Tabs は children をコレクションとして読むため、
            map で組み立てると key を item のキーとして拾えず
            「Each child in a list should have a unique key prop」になる。
            3つで固定なのでそのまま並べる。
          */}
          <Tab key="league_type_1" title={TAB_TITLES.league_type_1} />
          <Tab key="league_type_3" title={TAB_TITLES.league_type_3} />
          <Tab key="league_type_2" title={TAB_TITLES.league_type_2} />
        </Tabs>
      </div>

      {browseSection}

      {CITYLEAGUE_TABS.map((tab) =>
        mountedTabs.has(tab) ? (
          <div key={tab} className="w-full" hidden={selectedKey !== tab}>
            <CityleagueResults
              league_type={cityleagueTabToLeagueType(tab)}
              initial={tab === initialTab ? initial : undefined}
              scheduleContext={initial}
            />
          </div>
        ) : null,
      )}

      {latestSection}
    </>
  );
}
