"use client";

import { useRef, type Key } from "react";

import { Accordion, AccordionItem } from "@heroui/react";
import { LuTag } from "react-icons/lu";

import TagSelector from "@app/components/organisms/Tag/TagSelector";

type Props = {
  selectedTagIds: string[];
  onChange: (tagIds: string[]) => void;
  title?: string;
  onManageModeChange?: (managing: boolean) => void;
};

// タグ付与を、たたんだ状態のアコーディオンに入れて置くためのラッパ。
// デッキ登録・新バージョン作成のように、普段はタグ欄を隠しておきたい場所で使う。
// 付与済みの件数を見出しに出すので、開かなくても付けたかどうかが分かる。
export default function TagSelectorAccordion({
  selectedTagIds,
  onChange,
  title = "タグを付ける",
  onManageModeChange,
}: Props) {
  const heading =
    selectedTagIds.length > 0 ? `${title}（${selectedTagIds.length}）` : title;

  const rootRef = useRef<HTMLDivElement>(null);

  // アコーディオンを開いたら、展開後の全体が見えるようスクロールコンテナ側を動かす。
  // 高さの展開アニメーション(framer-motion)が終わってからでないと最終位置が出ないため、
  // アニメーション時間ぶん待ってから scrollIntoView する。
  const handleSelectionChange = (keys: "all" | Set<Key>) => {
    const opened = keys === "all" || keys.size > 0;
    if (!opened) return;

    window.setTimeout(() => {
      rootRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    }, 320);
  };

  return (
    <div ref={rootRef}>
      <Accordion
        isCompact
        className="px-0"
        itemClasses={{
          base: "rounded-lg px-3 bg-default-100",
          trigger: "py-2",
          title: "text-tiny font-bold text-default-600",
          indicator: "text-default-500",
          content: "pt-0 pb-2.5",
        }}
        onSelectionChange={handleSelectionChange}
      >
        <AccordionItem
          key="tags"
          aria-label={title}
          title={heading}
          startContent={<LuTag className="text-sm text-primary" />}
        >
          <TagSelector
            selectedTagIds={selectedTagIds}
            onChange={onChange}
            showLabel={false}
            onManageModeChange={onManageModeChange}
          />
        </AccordionItem>
      </Accordion>
    </div>
  );
}
