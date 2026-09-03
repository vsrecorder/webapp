"use client";

import { useEffect, useRef, useState } from "react";

import { Tabs, Tab } from "@heroui/react";

import ScrollUpFloating from "@app/components/atoms/Floating/ScrollUpFloating";

import CityleagueResults from "@app/components/organisms/Cityleague/CityleagueResults";

type TabKey = "league_type_1" | "league_type_3" | "league_type_2";

// マウント後に復元すべきタブを算出する。必ずクライアント側（useEffect 内）からのみ呼ぶ。
function resolveRestoredTab(): TabKey {
  const savedTab = sessionStorage.getItem("cityleagueResultsSelectedTab");
  if (
    savedTab === "league_type_1" ||
    savedTab === "league_type_3" ||
    savedTab === "league_type_2"
  )
    return savedTab;
  return "league_type_1";
}

type Props = {
  // 過去の結果を探す軸チップ。サーバコンポーネントのまま受け取るため、props で差し込む。
  // タブが fixed で画面上部に固定されているため、タブの下（スクロール領域の先頭）に置く。
  browseSection?: React.ReactNode;
  // 個別ページへのリンク集。上のタブは結果をその場に展開するだけでリンクを持たないため、
  // 個別ページへの導線をここで補う。タブの表示を邪魔しないよう末尾に置く。
  latestSection?: React.ReactNode;
};

export default function TemplateCityleagueResults({
  browseSection,
  latestSection,
}: Props) {
  // SSR と初回クライアントレンダリングを一致させるため、初期値は必ず "league_type_1" にする。
  // 実際の復元はマウント後の useEffect で行う（ハイドレーション不整合の回避）。
  const [selectedKey, setSelectedKey] = useState<TabKey>("league_type_1");

  // マウント後に保存済みタブを復元する。
  useEffect(() => {
    const restored = resolveRestoredTab();
    if (restored !== "league_type_1") {
      setSelectedKey(restored);
    }
  }, []);

  // タブごとのスクロール位置を保存
  const scrollPositions = useRef<Record<TabKey, number>>({
    league_type_1: 0,
    league_type_3: 0,
    league_type_2: 0,
  });

  const handleSelectionChange = (key: React.Key) => {
    // 切り替え前のスクロール位置を保存
    scrollPositions.current[selectedKey] = window.scrollY;

    // リロード時の復元用に選択タブを保存
    sessionStorage.setItem("cityleagueResultsSelectedTab", key as string);

    setSelectedKey(key as TabKey);
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
          <Tab key="league_type_1" title="オープンリーグ" />
          <Tab key="league_type_3" title="シニアリーグ" />
          <Tab key="league_type_2" title="ジュニアリーグ" />
        </Tabs>
      </div>

      {browseSection}

      <div className="w-full" hidden={selectedKey !== "league_type_1"}>
        <CityleagueResults league_type={1} />
      </div>
      <div className="w-full" hidden={selectedKey !== "league_type_3"}>
        <CityleagueResults league_type={3} />
      </div>
      <div className="w-full" hidden={selectedKey !== "league_type_2"}>
        <CityleagueResults league_type={2} />
      </div>

      {latestSection}
    </>
  );
}
