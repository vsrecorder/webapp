"use client";

import { Chip } from "@heroui/react";

import { TagType } from "@app/types/tag";
import { tagTextColor } from "@app/utils/tagColor";

type Props = {
  tags: TagType[] | undefined | null;
  // 指定すると各チップに×が付き、押すとそのタグIDで呼ばれる（付与解除UI用）。
  onRemove?: (id: string) => void;
  size?: "sm" | "md" | "lg";
  // 折り返さず1行に並べる。溢れる分は、外側のスクロールコンテナで横に辿らせる想定。
  // 一覧の行で使うと、タグ数でカードの高さが変わらずに済む。
  nowrap?: boolean;
  // タグが無いときも、チップ1行ぶん(20px)の空きを残す。
  // 一覧のカードで使うと、タグの有無でカードの高さが変わらずに済む
  // （骨格と実体の高さを揃えるためにも、常に同じ場所を空けておく必要がある）。
  reserveSpace?: boolean;
  className?: string;
};

// タグを小さなチップとして並べて表示する。
// 色を持つタグ(＝ACE SPEC・大会順位などのプリセット)は、背景をその色にして名前を太字で描く。
// 文字色はタグが持っていればそれを、無ければ背景の明るさから決める(tagTextColor)。
// 色を持たないユーザータグは既定の見た目のまま。
export default function TagChips({
  tags,
  onRemove,
  size = "sm",
  nowrap = false,
  reserveSpace = false,
  className,
}: Props) {
  if (!tags || tags.length === 0) {
    // 中身が無い＝読み上げるものも無いので、高さだけを持つ枠にする。
    // 高さはチップ本体の h-5 と同じ 20px（size によらずチップは 20px 固定）。
    return reserveSpace ? <div aria-hidden className={`h-5 ${className ?? ""}`} /> : null;
  }

  return (
    <div
      className={`flex items-center gap-1 ${
        nowrap ? "flex-nowrap [&>*]:shrink-0" : "flex-wrap"
      } ${className ?? ""}`}
    >
      {tags.map((tag) => (
        <Chip
          key={tag.id}
          size={size}
          variant="flat"
          className="h-5 text-[0.6875rem]"
          // 文字色はチップ本体に置く。中身(content)も×(closeButton)も
          // 色を継承するので、スロットごとに指定しなくて済む。
          style={
            tag.color
              ? {
                  backgroundColor: tag.color,
                  color: tagTextColor(tag.color, tag.text_color),
                }
              : undefined
          }
          classNames={tag.color ? { content: "font-bold" } : undefined}
          onClose={onRemove ? () => onRemove(tag.id) : undefined}
        >
          {tag.name}
        </Chip>
      ))}
    </div>
  );
}
