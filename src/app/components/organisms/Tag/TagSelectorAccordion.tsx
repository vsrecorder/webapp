"use client";

import { useEffect, useRef, type Key } from "react";

import { Accordion, AccordionItem } from "@heroui/react";
import { LuTag } from "react-icons/lu";

import TagSelector from "@app/components/organisms/Tag/TagSelector";

type Props = {
  selectedTagIds: string[];
  onChange: (tagIds: string[]) => void;
  title?: string;
  onManageModeChange?: (managing: boolean) => void;
};

// 展開アニメーション(framer-motion)の所要時間ぶん、下端を追いかけ続ける時間。
// アニメーションが少し長引いてもスクロールが取り残されないよう、やや長めに取る。
const FOLLOW_SCROLL_DURATION_MS = 420;

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
  const followRafRef = useRef<number | null>(null);

  const stopFollowScroll = () => {
    if (followRafRef.current !== null) {
      cancelAnimationFrame(followRafRef.current);
      followRafRef.current = null;
    }
  };

  // 追従が中途半端に残らないよう、アンマウント時にループを止める。
  useEffect(() => stopFollowScroll, []);

  // アコーディオンを開いたら、展開後の全体が見えるようスクロールコンテナ側を動かす。
  // 展開が終わってから一度だけ動かすと「開いてから間があいてスクロールする」ように見えるので、
  // 開いた瞬間からアニメーション中の高さ変化に毎フレーム追従させ、開ききった時点で
  // 全体が見えている状態にする。高さが滑らかに伸びるぶん、behavior は auto でも滑らかに見える。
  const handleSelectionChange = (keys: "all" | Set<Key>) => {
    stopFollowScroll();

    const opened = keys === "all" || keys.size > 0;
    if (!opened) return;

    const startedAt = performance.now();
    const step = () => {
      rootRef.current?.scrollIntoView({ behavior: "auto", block: "end" });

      if (performance.now() - startedAt < FOLLOW_SCROLL_DURATION_MS) {
        followRafRef.current = requestAnimationFrame(step);
      } else {
        followRafRef.current = null;
      }
    };
    followRafRef.current = requestAnimationFrame(step);
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
