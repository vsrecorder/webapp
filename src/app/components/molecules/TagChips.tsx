"use client";

import { Chip } from "@heroui/react";

import { TagType } from "@app/types/tag";

type Props = {
  tags: TagType[] | undefined | null;
  // 指定すると各チップに×が付き、押すとそのタグIDで呼ばれる（付与解除UI用）。
  onRemove?: (id: string) => void;
  size?: "sm" | "md" | "lg";
  className?: string;
};

// タグを小さなチップとして並べて表示する。
// 色を持つタグ(＝ACE SPEC等のプリセット)は、背景をその色にして名前を白の太字で描く。
// 色を持たないユーザータグは既定の見た目のまま。
export default function TagChips({
  tags,
  onRemove,
  size = "sm",
  className,
}: Props) {
  if (!tags || tags.length === 0) return null;

  return (
    <div className={`flex flex-wrap items-center gap-1 ${className ?? ""}`}>
      {tags.map((tag) => (
        <Chip
          key={tag.id}
          size={size}
          variant="flat"
          className="h-5 text-[11px]"
          style={tag.color ? { backgroundColor: tag.color } : undefined}
          classNames={
            tag.color
              ? { content: "font-bold text-white", closeButton: "text-white" }
              : undefined
          }
          onClose={onRemove ? () => onRemove(tag.id) : undefined}
        >
          {tag.name}
        </Chip>
      ))}
    </div>
  );
}
