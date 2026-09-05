"use client";

import useSWR from "swr";

import FilterSheet, {
  FilterSheetRow,
} from "@app/components/organisms/DeckCodePost/FilterSheet";

import { EnvironmentType } from "@app/types/environment";
import { toJSTDateString, todayJSTDateString } from "@app/utils/date";
import { swrFetcher } from "@app/utils/deckCodePost";

type Props = {
  isOpen: boolean;
  onOpenChange: () => void;
  // 選択中の環境ID(空なら現在の環境)
  selectedId: string;
  onSelect: (environment: EnvironmentType) => void;
};

const fetcher = (url: string) => swrFetcher<EnvironmentType[]>(url);

/*
 * みんなの公開デッキの環境を選ぶシート。見た目は ACE SPEC のシートと共通(FilterSheet)。
 * 既定は現在の環境で、過去の環境へ切り替えられる。
 * まだ始まっていない環境は投稿が無いので出さない。
 */
export default function EnvironmentPickerModal({
  isOpen,
  onOpenChange,
  selectedId,
  onSelect,
}: Props) {
  const { data, isLoading, error } = useSWR<EnvironmentType[], Error>(
    isOpen ? "/api/environments" : null,
    fetcher,
    { revalidateOnFocus: false },
  );

  const today = todayJSTDateString();
  const environments = (data ?? [])
    .filter((env) => toJSTDateString(env.from_date) <= today)
    .sort((a, b) => (toJSTDateString(a.from_date) < toJSTDateString(b.from_date) ? 1 : -1));
  // 「現在」は開始日が今日以前で最新の環境(バックエンドの Environment.FindByDate と同じ決め方)
  const currentId = environments[0]?.id ?? null;
  const effectiveSelectedId = selectedId || currentId;

  return (
    <FilterSheet
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      title="環境を選ぶ"
      isLoading={isLoading}
      hasError={!!error}
      isEmpty={environments.length === 0}
      emptyMessage="表示できる環境がありません"
    >
      {(onClose) =>
        environments.map((env) => (
          <FilterSheetRow
            key={env.id}
            title={env.title}
            subtitle={`${toJSTDateString(env.from_date)} 〜 ${toJSTDateString(env.to_date)}`}
            meta={
              env.id === currentId ? (
                <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-tiny font-bold text-primary">
                  現在
                </span>
              ) : undefined
            }
            selected={env.id === effectiveSelectedId}
            onClick={() => {
              onSelect(env);
              onClose();
            }}
          />
        ))
      }
    </FilterSheet>
  );
}
