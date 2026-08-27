"use client";

import { useEffect, useRef, useState, type Key } from "react";

import { Accordion, AccordionItem } from "@heroui/react";
import { LuTag } from "react-icons/lu";

import TagSelector from "@app/components/organisms/Tag/TagSelector";

import { TagPresetCategory } from "@app/types/tag";

type Props = {
  selectedTagIds: string[];
  onChange: (tagIds: string[]) => void;
  title?: string;
  // 別枠で見せるプリセットタグの群(TagSelector にそのまま渡す)。
  presetCategory?: TagPresetCategory;
  onManageModeChange?: (managing: boolean) => void;
};

const ITEM_KEY = "tags";

// 展開アニメーション(framer-motion)の所要時間。TRANSITION_VARIANTS.collapse の
// height は duration 0.3s の spring なので、それより少しだけ後に最終位置を取る。
const EXPAND_DURATION_MS = 340;

// 実際に動くスクロールコンテナ(overflow を持つ最も近い祖先)を探す。
// 見つからなければ null を返し、呼び出し側でウィンドウスクロールにフォールバックする。
function findScrollContainer(el: HTMLElement): HTMLElement | null {
  let node = el.parentElement;

  while (node && node !== document.body) {
    const { overflowY } = window.getComputedStyle(node);
    if (overflowY === "auto" || overflowY === "scroll") return node;
    node = node.parentElement;
  }

  return null;
}

// タグ付与を、たたんだ状態のアコーディオンに入れて置くためのラッパ。
// デッキ登録・新バージョン作成のように、普段はタグ欄を隠しておきたい場所で使う。
// 付与済みの件数を見出しに出すので、開かなくても付けたかどうかが分かる。
export default function TagSelectorAccordion({
  selectedTagIds,
  onChange,
  title = "タグを付ける",
  presetCategory,
  onManageModeChange,
}: Props) {
  const heading =
    selectedTagIds.length > 0 ? `${title}（${selectedTagIds.length}）` : title;

  const rootRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const scrollTimerRef = useRef<number | null>(null);
  // HeroUI(@react-types)の Key は string | number で React の Key(bigint を含む)とは
  // 別物なので、そのまま持つと selectedKeys に渡せない。文字列に寄せて保持する。
  const [openKeys, setOpenKeys] = useState<Set<string>>(() => new Set());
  // 中身(タグ候補チップ群と入力欄)をマウント済みにしてよいか。
  const [isContentReady, setIsContentReady] = useState(false);

  const isOpen = openKeys.has(ITEM_KEY);

  // 中身の初回マウントを、アコーディオンを開く前のアイドル時間に前倒ししておく。
  //
  // TagSelector は入力欄に加えてタグ候補チップを最大80個描画し、初回マウント時に
  // タグ一覧(/api/tags, /api/tags/presets)の取得も走る。これを展開と同時にやると、
  // その描画と取得でメインスレッドが埋まって高さアニメーションの出だしが遅れ、
  // 「押してからワンテンポ置いて開く」ように見える。取得が後から返ることで
  // 展開し終えた後に高さが変わってしまう問題もある。
  //
  // モーダル表示自体を重くしないよう、マウント直後ではなくアイドル時に回す。
  useEffect(() => {
    if (typeof window.requestIdleCallback === "function") {
      const id = window.requestIdleCallback(() => setIsContentReady(true), {
        timeout: 1000,
      });
      return () => window.cancelIdleCallback(id);
    }

    // requestIdleCallback が無い環境(主に Safari の古い版)向けのフォールバック。
    const id = window.setTimeout(() => setIsContentReady(true), 300);
    return () => window.clearTimeout(id);
  }, []);

  useEffect(() => {
    return () => {
      if (scrollTimerRef.current !== null) {
        window.clearTimeout(scrollTimerRef.current);
      }
    };
  }, []);

  // 展開後にコンテンツが占める高さ。たたんでいる間も中身はDOMに居て、外側の
  // section が height:0 / overflow:hidden で隠しているだけなので、開く前に実寸を測れる。
  const measureExpandedHeight = () => {
    const content = contentRef.current?.closest('[data-slot="content"]');
    return content ? content.getBoundingClientRect().height : 0;
  };

  // 展開後の下端がスクロールコンテナからはみ出るぶんだけ、下方向に寄せる。
  // extraHeight には、これから展開する(まだ高さに現れていない)ぶんを渡す。
  //
  // 上方向には決して動かさない。scrollIntoView(block:"end") のように下端を「揃える」と、
  // 展開前は要素が小さいぶん上に戻され、展開後に今度は下がるので上下にバウンドする。
  // ここでは「はみ出ていたら、はみ出たぶんだけ下げる」に限定する。
  //
  // 目標はスクロール量ではなく絶対位置として求まるので、アニメーション中に何度呼んでも
  // 同じ位置に収束する(scrollTop が増えたぶん要素の下端は上がるため相殺される)。
  const scrollToShowWhole = (extraHeight: number) => {
    const root = rootRef.current;
    if (!root) return;

    const container = findScrollContainer(root);
    const bottom = root.getBoundingClientRect().bottom + extraHeight;
    const viewportBottom = container
      ? container.getBoundingClientRect().bottom
      : window.innerHeight;

    const overflow = bottom - viewportBottom;
    if (overflow <= 0) return;

    if (container) {
      container.scrollTo({
        top: container.scrollTop + overflow,
        behavior: "smooth",
      });
      return;
    }

    window.scrollBy({ top: overflow, behavior: "smooth" });
  };

  const handleSelectionChange = (keys: "all" | Set<Key>) => {
    const next =
      keys === "all"
        ? new Set([ITEM_KEY])
        : new Set(Array.from(keys, (key) => String(key)));
    setOpenKeys(next);

    if (scrollTimerRef.current !== null) {
      window.clearTimeout(scrollTimerRef.current);
      scrollTimerRef.current = null;
    }

    if (!next.has(ITEM_KEY)) return;

    // アイドル待ちが終わる前に開かれた場合に備えて、ここでも中身を出す。
    setIsContentReady(true);

    // 展開後の高さを見込んで、最終位置へ一度で動かす。
    scrollToShowWhole(measureExpandedHeight());

    // 測り損ねたぶんの保険。展開し終えた時点でまだはみ出ていれば追加で寄せる。
    // この時点の高さは実測値に含まれているので extraHeight は 0。
    // 下方向にしか動かさないため、既に収まっていれば何も起きない。
    scrollTimerRef.current = window.setTimeout(() => {
      scrollTimerRef.current = null;
      scrollToShowWhole(0);
    }, EXPAND_DURATION_MS);
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
        selectedKeys={openKeys}
        onSelectionChange={handleSelectionChange}
      >
        <AccordionItem
          key={ITEM_KEY}
          // 中身をマウントしたままにして、展開時の仕事を高さアニメーションだけにする。
          keepContentMounted
          aria-label={title}
          title={heading}
          startContent={<LuTag className="text-sm text-primary" />}
        >
          {/* たたんでいる間は高さ0で見えないだけでDOMには残るので、
              inert でフォーカス・支援技術の対象から外す。
              これが無いと閉じているタグ入力欄にTabで入り込める。 */}
          <div ref={contentRef} inert={!isOpen}>
            {isContentReady && (
              <TagSelector
                selectedTagIds={selectedTagIds}
                onChange={onChange}
                showLabel={false}
                presetCategory={presetCategory}
                onManageModeChange={onManageModeChange}
              />
            )}
          </div>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
