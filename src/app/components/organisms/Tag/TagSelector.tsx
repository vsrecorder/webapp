"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import { Button, Chip, Input, addToast } from "@heroui/react";
import { LuPlus, LuTag, LuX } from "react-icons/lu";

import HScrollRow from "@app/components/atoms/HScrollRow";

import { useTags } from "@app/hooks/useTags";
import { TagType, TagPresetCategory } from "@app/types/tag";
import { katakanaToHiragana } from "@app/utils/kana";
import { sortTagsPresetFirst } from "@app/utils/tagOrder";
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

/*
 * 1つの付与先に1つしか成立しないプリセット群。
 * 大会順位は「優勝かつベスト4」がありえず、ACE SPEC もデッキに入るのは1枚なので、
 * 既に付いているところへ別のものを選んだら、弾くのではなく差し替える
 * (付け直しが「選び直す」操作だけで済む)。
 * 版ごとに違う ACE SPEC を記録したい場合は、デッキコードそれぞれに付ければよい
 * (付与先が別なので、この排他には掛からない)。
 */
const EXCLUSIVE_PRESET_CATEGORIES: readonly TagPresetCategory[] = [
  "acespec",
  "placement",
];

// プリセットは必ず色を持つが、色未設定で投入された場合に備えた保険。
// プリセットだと分かる見た目を保つため、無彩色ではなく既定色を当てる。
const PRESET_FALLBACK_COLOR = "#6E7175";

/*
 * 候補の行(自分のタグ・プリセット)は、読み込み中・0件・絞り込みで該当なしの
 * どの状態でも同じ高さを保つ。状態で行が出たり消えたりすると、
 * 取得が返った瞬間にアコーディオンの中身が伸びて跳ねて見えるし、
 * 絞り込みを打つたびに下の内容が上下する。
 * 高さはチップ1つぶん(h-6=24px)で、行の下余白(pb-1)はスクロールバーの逃げ。
 */
const ROW_CLASS = "flex flex-nowrap items-center gap-1 pb-1";

// 候補チップの代わりに出す骨格。実体のチップ(h-6 の角丸)と同じ形・高さにする。
// 幅は実データの名前の長さがまちまちなことに合わせて3つを散らす。
function ChipSkeletons() {
  return (
    <>
      {["w-20", "w-28", "w-16"].map((w) => (
        <div
          key={w}
          aria-hidden
          className={`h-6 ${w} shrink-0 animate-pulse rounded-full bg-default-200`}
        />
      ))}
    </>
  );
}

// 候補が無いときに行へ置く一言。チップと同じ高さの枠に入れて行の高さを保つ。
function RowMessage({ children }: { children: ReactNode }) {
  return (
    <span className="flex h-6 items-center whitespace-nowrap text-[0.6875rem] text-default-400">
      {children}
    </span>
  );
}

type Props = {
  // 現在付与しているタグID。
  selectedTagIds: string[];
  onChange: (tagIds: string[]) => void;
  label?: string;
  // 見出し(ラベル)を出すか。アコーディオン等、外側に見出しがある場合は false。
  showLabel?: boolean;
  /*
   * 呼び出し側が既に持っているタグの実体(デッキ・バージョン・対戦結果のレスポンスに
   * 入っている tags)。付与済みチップは名前と色が要るのに、ここでは selectedTagIds しか
   * 受け取らないため、これが無いと /api/tags が返るまでチップを描けない。
   * 編集モーダルでは付与済みが後から生えて枠が伸びる(実測: 24px→52px、
   * placement="center" のモーダルは全体も上へずれる)ので、分かっているぶんは先に渡す。
   */
  knownTags?: TagType[];
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
  knownTags,
  presetCategory = "acespec",
  onManageModeChange,
}: Props) {
  const {
    tags,
    presetTags,
    isLoading,
    isPresetsLoading,
    error,
    presetsError,
    createTag,
    deleteTag,
  } = useTags(presetCategory);
  const [query, setQuery] = useState("");
  const [creating, setCreating] = useState(false);
  // 管理モード。ONの間だけ自分のタグに削除(×)を出す。プリセットは対象外。
  const [manageMode, setManageMode] = useState(false);

  /*
   * 管理モードに入ると、候補チップ・プリセットの並びが削除用の一覧へ入れ替わる。
   * 中身の量が違うぶんカードの高さが変わり、押した瞬間に枠が縮んで見える
   * (実測: デッキ登録の「タグを付ける」で 223px → 199px)。
   * 入る直前の高さを下限として持たせ、管理中も同じ大きさに見えるようにする。
   * 下限なので、タグが多くて一覧が長いときは従来どおり伸びる。
   */
  const rootRef = useRef<HTMLDivElement>(null);
  const [manageMinHeight, setManageMinHeight] = useState<number | null>(null);

  function toggleManageMode() {
    setManageMinHeight(
      manageMode ? null : (rootRef.current?.offsetHeight ?? null),
    );
    setManageMode((m) => !m);
  }

  // 管理モードの変化を親へ通知する。マウント時に false も通知されるため、
  // モーダルを開き直したときの親側フラグのリセットにもなる。
  useEffect(() => {
    onManageModeChange?.(manageMode);
  }, [manageMode, onManageModeChange]);

  // 選択中チップの表示に使うため、自分のタグとプリセットの両方をIDで引けるようにする。
  // 呼び出し側が持っているぶんを先に入れ、一覧が届いたら上書きする(名前や色の変更に追従する)。
  const tagById = useMemo(() => {
    const map = new Map<string, TagType>();
    (knownTags ?? []).forEach((tag) => map.set(tag.id, tag));
    (tags ?? []).forEach((tag) => map.set(tag.id, tag));
    (presetTags ?? []).forEach((tag) => map.set(tag.id, tag));
    return map;
  }, [knownTags, tags, presetTags]);

  /*
   * 付与済みのタグ。まだ一覧に載っていないIDは表示から落とす。
   *
   * 並びはプリセット(デッキなら ACE SPEC、記録なら大会順位)を先頭にし、その中と
   * 自分のタグは選択順のまま。デッキ一覧カード・デッキ詳細モーダルの表示も同じ規則
   * (sortTagsPresetFirst)なので、選んでいるときと見えかたが揃う。
   * 付与するIDの並び(onChange で親へ渡すもの)は選択順のままにする。
   */
  const selectedTags = sortTagsPresetFirst(
    selectedTagIds
      .map((id) => tagById.get(id))
      .filter((tag): tag is TagType => Boolean(tag)),
  );

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

  // この群のプリセットは同時に1つしか付けられない(ACE SPEC・大会順位)
  const isExclusivePreset = EXCLUSIVE_PRESET_CATEGORIES.includes(presetCategory);
  const presetIds = new Set((presetTags ?? []).map((tag) => tag.id));

  function addTag(id: string) {
    if (selectedTagIds.includes(id)) return;

    // 排他群のプリセットを選んだときは、既に付いている同群のプリセットと入れ替える。
    // 入れ替えでは総数が増えないので、上限の判定も入れ替え後の集合で行う。
    const replacesPreset = isExclusivePreset && presetIds.has(id);
    const kept = replacesPreset
      ? selectedTagIds.filter((tagId) => !presetIds.has(tagId))
      : selectedTagIds;

    if (kept.length >= MAX_TAGS_PER_ENTITY) {
      addToast({
        title: `タグは最大${MAX_TAGS_PER_ENTITY}個までです`,
        color: "warning",
      });
      return;
    }
    onChange([...kept, id]);
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

  // 候補が1つも無いときに行へ置く一言。なぜ空なのかで出し分ける
  // (取得失敗・絞り込みで該当なし・そもそも作っていない・全部付け終えた)。
  const suggestionsEmptyMessage = error
    ? "タグを取得できませんでした"
    : normalizedQuery !== ""
      ? "該当するタグがありません"
      : (tags?.length ?? 0) === 0
        ? "入力すると自分のタグを作成できます"
        : "自分のタグはすべて付いています";

  const presetsEmptyMessage = presetsError
    ? "プリセットを取得できませんでした"
    : normalizedQuery !== ""
      ? "該当するプリセットがありません"
      : "選べるプリセットがありません";

  // 管理モードで削除対象にする、自分のタグ(クエリで絞り込み)。
  const manageTags = (tags ?? []).filter(matchesQuery);
  // 管理トグルは、自分のタグがある場合か、既に管理モード中のときだけ出す。
  const showManageToggle = (tags?.length ?? 0) > 0 || manageMode;

  return (
    <div
      ref={rootRef}
      className="flex flex-col gap-2"
      style={manageMinHeight ? { minHeight: manageMinHeight } : undefined}
    >
      {/* 見出しと管理トグルの行。トグルは自分のタグがあるときだけ出すが、
          出たり消えたりで下が動かないよう行そのものは常に置く(text-tiny の行=1rem)。 */}
      <div className="flex min-h-4 items-center justify-between gap-2">
        {showLabel ? (
          <div className="flex items-center gap-1 text-sm text-default-600">
            <LuTag size={14} />
            <span>{label}</span>
          </div>
        ) : (
          <span />
        )}
        {isLoading ? (
          <div
            aria-hidden
            className="h-2.5 w-14 animate-pulse rounded-full bg-default-200"
          />
        ) : (
          showManageToggle && (
            <button
              type="button"
              onClick={toggleManageMode}
              /*
               * 管理モード中だけ目立たせる。管理中はタグを選べず(候補の代わりに
               * 削除用の一覧が出る)、保存系のボタンも止まるので、
               * 「いま普段と違う状態にいる」「ここを押せば戻れる」が一目で分かる必要がある。
               * 削除ができる状態なので、色は注意を促す warning に合わせる。
               */
              className={
                manageMode
                  ? "rounded-full bg-warning/20 px-2 py-0.5 text-tiny font-bold text-warning-700 active:opacity-70"
                  : "text-tiny text-default-500 active:opacity-70"
              }
            >
              {manageMode ? "管理を終了" : "タグを管理"}
            </button>
          )
        )}
      </div>

      {/* 付与済みのタグ。1つも付いていなくてもチップ1行ぶん(24px)の高さを残し、
          付け外しで入力欄から下がずれないようにする
          (管理モード中はここを出さず、削除用の一覧を下に出す) */}
      {!manageMode && (
        <div className="flex min-h-6 flex-wrap items-center gap-1">
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
              プリセットと同様、折り返さず横1列に並べ、収まらない分は横スクロールで見せる。
              読み込み中・0件・該当なしでも行は残す(ROW_CLASS の狙い)。 */}
          <HScrollRow className={`${ROW_CLASS} [scrollbar-width:thin]`}>
            {isLoading ? (
              <ChipSkeletons />
            ) : suggestions.length === 0 ? (
              <RowMessage>{suggestionsEmptyMessage}</RowMessage>
            ) : (
              suggestions.slice(0, 40).map((tag) => (
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
              ))
            )}
          </HScrollRow>

          {/* プリセット候補（運営が用意した全ユーザー共通タグ）。付与先に関係する群だけを出す。
              折り返さず横1列に並べ、収まらない分は横スクロールで見せる。
              見出しは取得結果に依らない固定の文言なので、読み込み中もそのまま出す。 */}
          <div className="flex flex-col gap-1">
            <span className="text-[0.6875rem] font-semibold text-default-500">
              {PRESET_SECTION_LABEL[presetCategory]}
            </span>
            <HScrollRow className={`${ROW_CLASS} [scrollbar-width:thin]`}>
              {isPresetsLoading ? (
                <ChipSkeletons />
              ) : presetSuggestions.length === 0 ? (
                <RowMessage>{presetsEmptyMessage}</RowMessage>
              ) : (
                presetSuggestions.slice(0, 40).map((tag) => {
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
                })
              )}
            </HScrollRow>
          </div>

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
