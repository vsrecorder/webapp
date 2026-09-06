"use client";

import useSWR from "swr";

import {
  TagType,
  TagCreateRequestType,
  TagUpdateRequestType,
  TagPresetCategory,
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

  const data: unknown = await res.json();

  // 想定外の形（配列でない）で返ってきた場合も「取得失敗」として扱う。
  // そのまま返すと TagSelector の forEach / filter が落ちて、モーダルごと描けなくなる
  if (!Array.isArray(data)) {
    throw new Error("Unexpected tags response");
  }

  return data as TagType[];
}

// ログインユーザーが作成したタグの一覧を取得する（オートコンプリート候補・付与UI用）。
// レスポンスは作成日時の降順（新しい順）で返る。
//
// presetCategory は併せて取得するプリセットタグの群。付与先ごとに見せたいものが
// 違う（デッキ・対戦結果は ACE SPEC、記録は大会順位）ため、呼び出し側で指定する。
// 省略すると全プリセットを取る。
//
// createTag / updateTag / deleteTag はタグマスタを操作し、成功後に一覧を再取得する。
// createTag はバックエンド側が find-or-create のため、同名タグは既存のものが返る。
export function useTags(presetCategory?: TagPresetCategory) {
  const { data, error, isLoading, mutate } = useSWR<TagType[], Error>(
    "/api/tags",
    fetcher,
  );

  // 全ユーザー共通のプリセットタグ(ACE SPEC・大会順位)。ほぼ不変なので長めにキャッシュする。
  // 群ごとにURLが変わるので、SWRのキャッシュも群ごとに分かれる。
  const { data: presetData, isLoading: isPresetsLoading } = useSWR<
    TagType[],
    Error
  >(
    presetCategory
      ? `/api/tags/presets?category=${presetCategory}`
      : "/api/tags/presets",
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 1000 * 60 * 10,
    },
  );

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
