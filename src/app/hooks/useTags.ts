"use client";

import useSWR from "swr";

import {
  TagType,
  TagCreateRequestType,
  TagUpdateRequestType,
} from "@app/types/tag";

async function fetcher(url: string): Promise<TagType[]> {
  const res = await fetch(url, {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
  });

  if (!res.ok) {
    throw new Error("Failed to fetch");
  }

  return res.json();
}

// ログインユーザーが作成したタグの一覧を取得する（オートコンプリート候補・付与UI用）。
// レスポンスは作成日時の降順（新しい順）で返る。
//
// createTag / updateTag / deleteTag はタグマスタを操作し、成功後に一覧を再取得する。
// createTag はバックエンド側が find-or-create のため、同名タグは既存のものが返る。
export function useTags() {
  const { data, error, isLoading, mutate } = useSWR<TagType[], Error>(
    "/api/tags",
    fetcher,
  );

  // 全ユーザー共通のプリセットタグ(ACE SPEC など)。ほぼ不変なので長めにキャッシュする。
  const { data: presetData, isLoading: isPresetsLoading } = useSWR<
    TagType[],
    Error
  >("/api/tags/presets", fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 1000 * 60 * 10,
  });

  async function createTag(param: TagCreateRequestType): Promise<TagType> {
    const res = await fetch("/api/tags", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(param),
    });

    if (!res.ok) {
      throw new Error("Failed to create tag");
    }

    const created: TagType = await res.json();
    await mutate();

    return created;
  }

  async function updateTag(
    id: string,
    param: TagUpdateRequestType,
  ): Promise<TagType> {
    const res = await fetch(`/api/tags/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(param),
    });

    if (!res.ok) {
      throw new Error("Failed to update tag");
    }

    const updated: TagType = await res.json();
    await mutate();

    return updated;
  }

  async function deleteTag(id: string): Promise<void> {
    const res = await fetch(`/api/tags/${id}`, {
      method: "DELETE",
    });

    if (!res.ok) {
      throw new Error("Failed to delete tag");
    }

    await mutate();
  }

  return {
    tags: data,
    presetTags: presetData,
    isLoading,
    isPresetsLoading,
    error,
    mutate,
    createTag,
    updateTag,
    deleteTag,
  };
}
