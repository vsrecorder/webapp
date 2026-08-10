"use client";

import { useEffect, useRef, useState, type Key } from "react";

import { Accordion, AccordionItem } from "@heroui/react";
import { LuTag } from "react-icons/lu";

import TagSelector from "@app/components/organisms/Tag/TagSelector";

type Props = {
  selectedTagIds: string[];
  onChange: (tagIds: string[]) => void;
  title?: string;
  onManageModeChange?: (managing: boolean) => void;
};

const ITEM_KEY = "tags";

// 展開アニメーション(framer-motion)の所要時間。TRANSITION_VARIANTS.collapse の
// height は duration 0.3s の spring なので、それより少しだけ後に最終位置を取る。
const EXPAND_DURATION_MS = 340;

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

  // アコーディオンを開いたら、展開後の全体が見えるようスクロールコンテナ側を動かす。
  // 展開の開始時と完了時の2回に分けて smooth スクロールを投げる。
  // 開始時の1回で即座に動き出すので「開いたのに動かない」間が無く、完了時の1回で
  // 伸びきった後の下端に合わせ直すため全体が収まる。
  // アニメーション中ずっと追従させると毎フレーム同期レイアウトが走り、
  // モーダル内の大きなフォームでは展開自体がカクつくので、呼ぶのはこの2回だけにする。
  const scrollToShowWhole = () => {
    rootRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
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

    scrollToShowWhole();
    scrollTimerRef.current = window.setTimeout(() => {
      scrollTimerRef.current = null;
      scrollToShowWhole();
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
          <div inert={!isOpen}>
            {isContentReady && (
              <TagSelector
                selectedTagIds={selectedTagIds}
                onChange={onChange}
                showLabel={false}
                onManageModeChange={onManageModeChange}
              />
            )}
          </div>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
