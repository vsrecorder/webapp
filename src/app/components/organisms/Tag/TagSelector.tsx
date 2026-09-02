"use client";

import { useEffect, useMemo, useState } from "react";

import { Button, Chip, Input, addToast } from "@heroui/react";
import { LuPlus, LuTag, LuX } from "react-icons/lu";

import { useTags } from "@app/hooks/useTags";
import { TagType, TagPresetCategory } from "@app/types/tag";
import { katakanaToHiragana } from "@app/utils/kana";
import { tagTextColor } from "@app/utils/tagColor";

// 検索照合用の正規化。カタカナをひらがなに畳み込み、英字は小文字化し、絵文字を落とす。
// カタカナ名のタグをひらがな入力で検索できるようにするのと、大会順位のプリセット
// (「🥇 優勝」のようにメダルを名前へ含めている)を「優勝」と打つだけで
// 同名扱いにするため。同名扱いにしないと、プリセットがあるのに
// 「『優勝』を作成して追加」が出てしまい、色の付かない重複タグを作れてしまう。
function normalizeForSearch(s: string): string {
  return katakanaToHiragana(s)
    .replace(/\p{Extended_Pictographic}/gu, "")
    .trim()
    .toLowerCase();
}

const MAX_TAG_NAME_LENGTH = 32;
// 1つの付与先に付けられるタグ数の上限（バックエンドの MaxTagsPerEntity と揃える）。
const MAX_TAGS_PER_ENTITY = 20;

// プリセット候補の見出し。群ごとに何のプリセットかが分かる文言にする。
const PRESET_SECTION_LABEL: Record<TagPresetCategory, string> = {
  acespec: "ACE SPEC・プリセット",
  placement: "大会順位・プリセット",
};

// プリセットは必ず色を持つが、色未設定で投入された場合に備えた保険。
// プリセットだと分かる見た目を保つため、無彩色ではなく既定色を当てる。
const PRESET_FALLBACK_COLOR = "#6E7175";

type Props = {
  // 現在付与しているタグID。
  selectedTagIds: string[];
  onChange: (tagIds: string[]) => void;
  label?: string;
  // 見出し(ラベル)を出すか。アコーディオン等、外側に見出しがある場合は false。
  showLabel?: boolean;
  // 別枠で見せるプリセットタグの群。付与先ごとに関係のあるものだけを出す
  // (デッキ・対戦結果は ACE SPEC、記録は大会順位)。
  presetCategory?: TagPresetCategory;
  // 管理モードの ON/OFF が変わったときに呼ぶ。親モーダルが「閉じる/保存/作成」ボタンを
  // 管理中は無効化するために使う。
  onManageModeChange?: (managing: boolean) => void;
};

// デッキ/デッキコード/記録/対戦結果に付与するタグを選ぶコントロール。
// 既存タグからの選択と、入力した名前での新規作成(find-or-create)に対応する。
// タグの実体(マスタ)は /api/tags 経由で管理し、ここでは付与するIDの集合だけを扱う。
export default function TagSelector({
  selectedTagIds,
  onChange,
  label = "タグ",
  showLabel = true,
  presetCategory = "acespec",
  onManageModeChange,
}: Props) {
  const { tags, presetTags, isLoading, createTag, deleteTag } =
    useTags(presetCategory);
  const [query, setQuery] = useState("");
  const [creating, setCreating] = useState(false);
  // 管理モード。ONの間だけ自分のタグに削除(×)を出す。プリセットは対象外。
  const [manageMode, setManageMode] = useState(false);

  // 管理モードの変化を親へ通知する。マウント時に false も通知されるため、
  // モーダルを開き直したときの親側フラグのリセットにもなる。
  useEffect(() => {
    onManageModeChange?.(manageMode);
  }, [manageMode, onManageModeChange]);

  // 選択中チップの表示に使うため、自分のタグとプリセットの両方をIDで引けるようにする。
  const tagById = useMemo(() => {
    const map = new Map<string, TagType>();
    (tags ?? []).forEach((tag) => map.set(tag.id, tag));
    (presetTags ?? []).forEach((tag) => map.set(tag.id, tag));
    return map;
  }, [tags, presetTags]);

  // 付与済みのタグ（順序は選択順を維持）。まだ一覧に載っていないIDは表示から落とす。
  const selectedTags = selectedTagIds
    .map((id) => tagById.get(id))
    .filter((tag): tag is TagType => Boolean(tag));

  const normalizedQuery = query.trim();
  // 照合用にかなを畳み込んだクエリ。ひらがな入力でカタカナ名にヒットさせる。
  const queryForMatch = normalizeForSearch(normalizedQuery);

  const matchesQuery = (tag: TagType) =>
    queryForMatch === "" ||
    normalizeForSearch(tag.name).includes(queryForMatch);

  // 未選択かつクエリに部分一致する、自分のタグ候補。
  const suggestions = (tags ?? []).filter(
    (tag) => !selectedTagIds.includes(tag.id) && matchesQuery(tag),
  );

  // プリセット(ACE SPEC / 大会順位)の候補。自分のタグとは別枠で見せる。
  const presetSuggestions = (presetTags ?? []).filter(
    (tag) => !selectedTagIds.includes(tag.id) && matchesQuery(tag),
  );

  // 入力名と一致する既存タグ（自分のタグ or プリセット）。新規作成の要否判定に使う。
  // かなを畳み込んで比較するため、"ますたーぼーる" と入力すると "マスターボール" の
  // プリセットに一致し、新規作成させずにそれを選ばせる（Enterで付与）。
  const exactMatch = [...(tags ?? []), ...(presetTags ?? [])].find(
    (tag) => normalizeForSearch(tag.name) === queryForMatch,
  );

  const atLimit = selectedTagIds.length >= MAX_TAGS_PER_ENTITY;

  function addTag(id: string) {
    if (selectedTagIds.includes(id)) return;
    if (atLimit) {
      addToast({
        title: `タグは最大${MAX_TAGS_PER_ENTITY}個までです`,
        color: "warning",
      });
      return;
    }
    onChange([...selectedTagIds, id]);
    setQuery("");
  }

  function removeTag(id: string) {
    onChange(selectedTagIds.filter((tagId) => tagId !== id));
  }

  async function handleCreate() {
    if (normalizedQuery === "" || creating) return;

    // 既存タグと同名なら作らずにそれを付与する。
    if (exactMatch) {
      addTag(exactMatch.id);
      return;
    }

    if (atLimit) {
      addToast({
        title: `タグは最大${MAX_TAGS_PER_ENTITY}個までです`,
        color: "warning",
      });
      return;
    }

    setCreating(true);
    try {
      const created = await createTag({ name: normalizedQuery, color: "" });
      onChange([...selectedTagIds, created.id]);
      setQuery("");
    } catch {
      addToast({ title: "タグの作成に失敗しました", color: "danger" });
    } finally {
      setCreating(false);
    }
  }

  // タグ(自分のもの)をマスタから削除する。付与されている全ての対象からも外れる。
  async function handleDelete(tag: TagType) {
    const ok = window.confirm(
      `タグ「${tag.name}」を削除しますか？\n付与されている全てのデッキ・バージョン・記録・対戦結果からも外れます。`,
    );
    if (!ok) return;

    try {
      await deleteTag(tag.id);
      // 選択中だった場合は選択からも外す(実体が無くなるため)。
      if (selectedTagIds.includes(tag.id)) {
        onChange(selectedTagIds.filter((id) => id !== tag.id));
      }
      addToast({
        title: `タグ「${tag.name}」を削除しました`,
        color: "success",
        timeout: 2000,
      });
    } catch {
      addToast({ title: "タグの削除に失敗しました", color: "danger" });
    }
  }

  // 管理モードで削除対象にする、自分のタグ(クエリで絞り込み)。
  const manageTags = (tags ?? []).filter(matchesQuery);
  // 管理トグルは、自分のタグがある場合か、既に管理モード中のときだけ出す。
  const showManageToggle = (tags?.length ?? 0) > 0 || manageMode;

  return (
    <div className="flex flex-col gap-2">
      {(showLabel || showManageToggle) && (
        <div className="flex items-center justify-between gap-2">
          {showLabel ? (
            <div className="flex items-center gap-1 text-sm text-default-600">
              <LuTag size={14} />
              <span>{label}</span>
            </div>
          ) : (
            <span />
          )}
          {showManageToggle && (
            <button
              type="button"
              onClick={() => setManageMode((m) => !m)}
              className="text-tiny text-default-500 active:opacity-70"
            >
              {manageMode ? "管理を終了" : "タグを管理"}
            </button>
          )}
        </div>
      )}

      {!manageMode && selectedTags.length > 0 && (
        <div className="flex flex-wrap items-center gap-1">
          {selectedTags.map((tag) => (
            /*
             * 解除はチップ全体のタップだけで受ける。×は「押せば外れる」と分かるための
             * 目印で、それ自体はハンドラを持たない。
             *
             * Chip の onClose を使わない理由: onClose は HeroUI 内部で react-aria の
             * usePress として実装されており、押下中に pointercancel が届くと(タッチの
             * ぶれでシートのドラッグ判定が入る、ブラウザがスクロールを始める など)
             * onPress を発火しないまま click を stopPropagation する。すると×のハンドラも
             * チップ本体の onClick も呼ばれず、タップしたのに何も起きない。
             * ハンドラを本体の1つに寄せておけば、この経路で解除が消えることがない。
             */
            <Chip
              key={tag.id}
              size="sm"
              variant="flat"
              className="h-6 cursor-pointer text-[0.6875rem]"
              // 文字色はチップ本体に置けば中身も×も継承する。
              style={
                tag.color
                  ? {
                      backgroundColor: tag.color,
                      color: tagTextColor(tag.color, tag.text_color),
                    }
                  : undefined
              }
              classNames={tag.color ? { content: "font-bold" } : undefined}
              endContent={<LuX className="mr-0.5 shrink-0 opacity-70" size={12} />}
              onClick={() => removeTag(tag.id)}
            >
              {tag.name}
            </Chip>
          ))}
        </div>
      )}

      <Input
        size="sm"
        variant="bordered"
        placeholder={
          manageMode ? "タグ名で絞り込み" : "タグ名を入力して選択・作成"
        }
        value={query}
        onValueChange={setQuery}
        maxLength={MAX_TAG_NAME_LENGTH}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            if (!manageMode) handleCreate();
          }
        }}
      />

      {manageMode ? (
        /* 管理モード: 自分のタグ一覧に削除(×)を出す。プリセットは対象外。 */
        <div className="flex flex-col gap-1">
          <p className="text-[0.6875rem] text-default-400">
            × で削除できます。削除すると、そのタグが付いた全ての対象からも外れます。
          </p>
          {manageTags.length > 0 ? (
            <div className="flex flex-wrap items-center gap-1">
              {manageTags.map((tag) => (
                <Chip
                  key={tag.id}
                  size="sm"
                  variant="flat"
                  className="h-6 text-[0.6875rem]"
                  style={
                    tag.color
                      ? {
                          backgroundColor: tag.color,
                          color: tagTextColor(tag.color, tag.text_color),
                        }
                      : undefined
                  }
                  classNames={tag.color ? { content: "font-bold" } : undefined}
                  onClose={() => handleDelete(tag)}
                >
                  {tag.name}
                </Chip>
              ))}
            </div>
          ) : (
            <div className="text-tiny text-default-400">
              {normalizedQuery
                ? "該当するタグがありません"
                : "削除できるタグがありません"}
            </div>
          )}
        </div>
      ) : (
        <>
          {/* 候補（未選択の自分のタグ）。クリックで付与する。
              プリセットと同様、折り返さず横1列に並べ、収まらない分は横スクロールで見せる。 */}
          {!isLoading && suggestions.length > 0 && (
            <div className="flex flex-nowrap items-center gap-1 overflow-x-auto pb-1 [scrollbar-width:thin]">
              {suggestions.slice(0, 40).map((tag) => (
                <Chip
                  key={tag.id}
                  as="button"
                  size="sm"
                  variant={tag.color ? "flat" : "bordered"}
                  className="h-6 shrink-0 cursor-pointer whitespace-nowrap text-[0.6875rem]"
                  style={
                    tag.color
                      ? {
                          backgroundColor: tag.color,
                          color: tagTextColor(tag.color, tag.text_color),
                        }
                      : undefined
                  }
                  classNames={tag.color ? { content: "font-bold" } : undefined}
                  onClick={() => addTag(tag.id)}
                >
                  {tag.name}
                </Chip>
              ))}
            </div>
          )}

          {/* プリセット候補（運営が用意した全ユーザー共通タグ）。付与先に関係する群だけを出す。
              折り返さず横1列に並べ、収まらない分は横スクロールで見せる。 */}
          {presetSuggestions.length > 0 && (
            <div className="flex flex-col gap-1">
              <span className="text-[0.6875rem] font-semibold text-default-500">
                {PRESET_SECTION_LABEL[presetCategory]}
              </span>
              <div className="flex flex-nowrap items-center gap-1 overflow-x-auto pb-1 [scrollbar-width:thin]">
                {presetSuggestions.slice(0, 40).map((tag) => {
                  const color = tag.color || PRESET_FALLBACK_COLOR;

                  return (
                    <Chip
                      key={tag.id}
                      as="button"
                      size="sm"
                      variant="flat"
                      className="h-6 shrink-0 cursor-pointer whitespace-nowrap text-[0.6875rem]"
                      style={{
                        backgroundColor: color,
                        color: tagTextColor(color, tag.text_color),
                      }}
                      classNames={{ content: "font-bold" }}
                      onClick={() => addTag(tag.id)}
                    >
                      {tag.name}
                    </Chip>
                  );
                })}
              </div>
            </div>
          )}

          {/* 入力名の新規作成（同名の自分のタグ・プリセットが無いときだけ出す）。 */}
          {normalizedQuery !== "" && !exactMatch && (
            <Button
              size="sm"
              variant="flat"
              color="primary"
              startContent={<LuPlus size={14} />}
              isLoading={creating}
              onPress={handleCreate}
              className="self-start"
            >
              「{normalizedQuery}」を作成して追加
            </Button>
          )}
        </>
      )}
    </div>
  );
}
