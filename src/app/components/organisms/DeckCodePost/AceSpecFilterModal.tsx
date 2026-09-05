"use client";

import useSWR from "swr";

import FilterSheet, {
  FilterSheetRow,
} from "@app/components/organisms/DeckCodePost/FilterSheet";

import {
  DeckCodePostAceSpecCountType,
  DeckCodePostGetAceSpecsResponseType,
} from "@app/types/deck_code_post";
import { swrFetcher } from "@app/utils/deckCodePost";

type Props = {
  isOpen: boolean;
  onOpenChange: () => void;
  // 一覧と同じ環境(空は現在の環境)
  environmentId: string;
  // 選択中の ACE SPEC のカード名(空は絞り込みなし)
  selectedName: string;
  onSelect: (aceSpec: DeckCodePostAceSpecCountType | null) => void;
};

const fetcher = (url: string) => swrFetcher<DeckCodePostGetAceSpecsResponseType>(url);

/*
 * ACE SPEC でみんなの公開デッキを絞り込むシート。見た目は環境のシートと共通(FilterSheet)。
 * 候補は全カードではなく「その環境の公開中の投稿で使われている ACE SPEC」だけを、
 * 投稿数の多い順に並べる(選んでも0件になる候補を出さないため)。
 */
export default function AceSpecFilterModal({
  isOpen,
  onOpenChange,
  environmentId,
  selectedName,
  onSelect,
}: Props) {
  const params = new URLSearchParams();
  if (environmentId) params.set("environment_id", environmentId);
  const { data, isLoading, error } = useSWR<DeckCodePostGetAceSpecsResponseType, Error>(
    isOpen ? `/api/deck_code_posts/acespecs?${params.toString()}` : null,
    fetcher,
    { revalidateOnFocus: false },
  );

  const aceSpecs = data?.acespecs ?? [];

  return (
    <FilterSheet
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      title="ACE SPEC で絞り込む"
      onClear={selectedName ? () => onSelect(null) : undefined}
      isLoading={isLoading}
      hasError={!!error}
      isEmpty={aceSpecs.length === 0}
      emptyMessage="ACE SPEC が判定できた公開デッキはまだありません"
    >
      {(onClose) =>
        aceSpecs.map((aceSpec) => {
          const selected = aceSpec.card_name === selectedName;
          return (
            <FilterSheetRow
              key={aceSpec.card_name}
              imageUrl={aceSpec.image_url || undefined}
              title={aceSpec.card_name}
              meta={<span className="shrink-0 text-tiny text-default-500">{aceSpec.count}件</span>}
              selected={selected}
              onClick={() => {
                onSelect(selected ? null : aceSpec);
                onClose();
              }}
            />
          );
        })
      }
    </FilterSheet>
  );
}
