"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { Button, useDisclosure } from "@heroui/react";

import { LuChevronDown, LuX } from "react-icons/lu";

import PokemonSprite from "@app/components/atoms/PokemonSprite";
import DeckSegmentedControl from "@app/components/molecules/DeckSegmentedControl";
import DeckViewToggleBar from "@app/components/organisms/Deck/DeckViewToggleBar";
import DeckCodePostCard from "@app/components/organisms/DeckCodePost/DeckCodePostCard";
import DeckCodePostCardSkeleton from "@app/components/organisms/DeckCodePost/DeckCodePostCardSkeleton";
import EnvironmentPickerModal from "@app/components/organisms/DeckCodePost/EnvironmentPickerModal";
import AceSpecFilterModal from "@app/components/organisms/DeckCodePost/AceSpecFilterModal";
import LoginPromptModal from "@app/components/organisms/DeckCodePost/LoginPromptModal";
import PokemonSpriteModal from "@app/components/organisms/Match/Modal/PokemonSpriteModal";

import { useDeckCodePosts } from "@app/hooks/useDeckCodePosts";

import {
  DeckCodePostAceSpecCountType,
  DeckCodePostGetResponseType,
  DeckCodePostSort,
} from "@app/types/deck_code_post";
import { EnvironmentType } from "@app/types/environment";
import { PokemonSpriteType } from "@app/types/pokemon_sprite";

type Props = {
  // 閲覧者のユーザID。未ログインなら null
  viewerId: string | null;
  // サーバで取った1ページ目(新着・現在の環境)。無ければクライアントで取る
  initial?: DeckCodePostGetResponseType;
};

/*
 * みんなの公開デッキ(公開されたデッキコードのタイムライン)。ログイン不要で見られる。
 *
 * 入口はデッキ一覧のセグメント「マイデッキ｜みんなの公開デッキ」だけにしている。
 * ここでも同じセグメントを最上部に固定し、「マイデッキ」を選ぶとデッキ一覧へ戻る
 * (未ログインならログイン案内)。
 */
export default function TemplateSharedDecks({ viewerId, initial }: Props) {
  const [sort, setSort] = useState<DeckCodePostSort>("new");
  // 選んだ環境。null は「現在の環境」(バックエンドが今日から決める)
  const [selectedEnvironment, setSelectedEnvironment] = useState<EnvironmentType | null>(
    null,
  );
  const environmentId = selectedEnvironment?.id ?? "";
  // スプライトでの絞り込み。デッキのスプライト選択と同じ2枠(1体目・2体目)で、
  // 指定したスプライトをすべて持つデッキに絞る。どちらも null なら絞り込みなし
  const [sprite1, setSprite1] = useState<PokemonSpriteType | null>(null);
  const [sprite2, setSprite2] = useState<PokemonSpriteType | null>(null);
  const spriteFilters = [sprite1, sprite2].filter(
    (s): s is PokemonSpriteType => s !== null,
  );
  const clearSprites = () => {
    setSprite1(null);
    setSprite2(null);
  };
  // ACE SPEC での絞り込み(null は絞り込みなし)
  const [aceSpecFilter, setAceSpecFilter] = useState<DeckCodePostAceSpecCountType | null>(null);

  /*
   * 絞り込みのチップは横に並べて溢れたぶんはスクロールして見る作りで、選ぶとチップが
   * 名前ぶん長くなる。右側にあるスプライト・ACE SPEC は選んだ直後に画面の外へはみ出して
   * 見切れるため、選んだチップが見える位置まで送る(縦位置は動かさない)。
   */
  const spriteChipRef = useRef<HTMLButtonElement>(null);
  const aceSpecChipRef = useRef<HTMLButtonElement>(null);
  const revealChip = (chip: HTMLButtonElement | null) => {
    chip?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "end" });
  };

  const spriteKey = spriteFilters.map((s) => s.id).join(",");
  useEffect(() => {
    if (!spriteKey) return;
    revealChip(spriteChipRef.current);
  }, [spriteKey]);

  useEffect(() => {
    if (!aceSpecFilter) return;
    revealChip(aceSpecChipRef.current);
  }, [aceSpecFilter]);

  const {
    posts,
    environment,
    isLoading,
    isLoadingMore,
    hasMore,
    error,
    loadMore,
    updatePost,
  } = useDeckCodePosts({
    sort,
    environmentId,
    pokemonSpriteIds: spriteFilters.map((s) => s.id),
    acespecCardName: aceSpecFilter?.card_name ?? "",
    initial,
  });

  const loginModal = useDisclosure();
  const [loginTitle, setLoginTitle] = useState("ログインが必要です");
  const environmentModal = useDisclosure();
  const spriteModal = useDisclosure();
  const aceSpecModal = useDisclosure();

  // 投稿カードは memo しているので、渡す関数の参照を固定して無駄な再描画を防ぐ
  const onOpenLogin = loginModal.onOpen;
  const requireLogin = useCallback(
    (title: string) => {
      setLoginTitle(title);
      onOpenLogin();
    },
    [onOpenLogin],
  );

  // 表示中の環境名。選び直した直後は一覧の応答を待たずに選んだ名前を出す
  const shownEnvironmentTitle = selectedEnvironment?.title ?? environment?.title ?? null;

  return (
    <>
      <LoginPromptModal
        isOpen={loginModal.isOpen}
        onOpenChange={loginModal.onOpenChange}
        title={loginTitle}
      />
      <EnvironmentPickerModal
        isOpen={environmentModal.isOpen}
        onOpenChange={environmentModal.onOpenChange}
        selectedId={environmentId}
        onSelect={(env) => {
          setSelectedEnvironment(env);
        }}
      />
      <AceSpecFilterModal
        isOpen={aceSpecModal.isOpen}
        onOpenChange={aceSpecModal.onOpenChange}
        environmentId={environmentId}
        selectedName={aceSpecFilter?.card_name ?? ""}
        onSelect={setAceSpecFilter}
      />
      {/* スプライトの指定はデッキ登録と同じ選択モーダル(検索して2枠に入れ、決定で反映) */}
      <PokemonSpriteModal
        pokemonSprite1={sprite1}
        setPokemonSprite1={setSprite1}
        pokemonSprite2={sprite2}
        setPokemonSprite2={setSprite2}
        isOpen={spriteModal.isOpen}
        onOpenChange={spriteModal.onOpenChange}
      />

      <div className="w-full pt-12">
        {/* 「マイデッキ｜みんなの公開デッキ」はデッキ一覧と同じ固定セグメント */}
        <DeckSegmentedControl
          selected="shared"
          viewerId={viewerId}
          onRequireLogin={() => requireLogin("マイデッキを見るにはログインが必要です")}
        />

        {/* カードの間隔はマイデッキの一覧(space-y-3 / gap-3 = 12px)と同じにする。
            下余白: 最後のカードや「もっと見る」が画面の下端(会員は下部ナビの直上)に貼り付いて
            見切れて見えないよう、一覧の下に少し余白を置く */}
        <div className="flex flex-col gap-3 pt-2 pb-6 lg:max-w-4xl lg:mx-auto">
          {/* 並び順と環境。上部のセグメント(マイデッキ｜みんなの公開デッキ)の直下に固定する。
              デッキ一覧のリスト/ギャラリー切替と同じ入れ物(DeckViewToggleBar)を使い、
              固定位置・横幅の合わせ方・スクロール時の挙動を揃える(詳細はそのコメント)。
              上の余白(pt-12 / pt-2)もデッキ一覧と同じにしてあるので、空き枠の計算がそのまま合う。 */}
          <DeckViewToggleBar>
            <div className="flex items-center gap-1.5 overflow-x-auto px-0.5 [scrollbar-width:none]">
              {(
                [
                  ["new", "新着"],
                  ["popular", "人気"],
                ] as const
              ).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setSort(key)}
                  aria-pressed={sort === key}
                  className={`shrink-0 rounded-full border px-3 py-1 text-xs font-bold ${
                    sort === key
                      ? "border-foreground bg-foreground text-background"
                      : "border-default-200 bg-content1 text-default-500"
                  }`}
                >
                  {label}
                </button>
              ))}
              <button
                type="button"
                onClick={environmentModal.onOpen}
                className="flex shrink-0 items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary"
              >
                {shownEnvironmentTitle ?? "環境"}
                <LuChevronDown className="text-xs" />
              </button>
              {/* スプライトで絞り込む。選択中は選んだスプライト(最大2体)を出し、×で解除できる。
                  名前は1体のときだけ添える(2体だとチップが長くなりすぎるため、アイコンだけで示す) */}
              <button
                ref={spriteChipRef}
                type="button"
                onClick={spriteModal.onOpen}
                aria-pressed={spriteFilters.length > 0}
                className={`flex shrink-0 items-center gap-1 rounded-full py-0.5 pl-1 text-xs font-bold ${
                  spriteFilters.length === 0
                    ? "border border-default-200 bg-content1 py-1 pl-3 pr-3 text-default-500"
                    : spriteFilters.length === 1
                      ? "bg-foreground pr-3 text-background"
                      : "bg-foreground pr-1.5 text-background"
                }`}
              >
                {spriteFilters.length > 0 ? (
                  <>
                    <span className="flex items-center">
                      {spriteFilters.map((s) => (
                        <PokemonSprite key={s.id} id={s.id} size={22} />
                      ))}
                    </span>
                    {spriteFilters.length === 1 && (
                      <span className="max-w-36 truncate">{spriteFilters[0].name}</span>
                    )}
                  </>
                ) : (
                  <>
                    スプライト
                    <LuChevronDown className="text-xs" />
                  </>
                )}
              </button>
              {spriteFilters.length > 0 && (
                <button
                  type="button"
                  onClick={clearSprites}
                  aria-label="スプライトの絞り込みを解除"
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-default-100 text-default-500 active:opacity-70"
                >
                  <LuX className="text-xs" />
                </button>
              )}
              {/* ACE SPEC で絞り込む。選択中はカード画像と名前を出し、×で解除できる */}
              <button
                ref={aceSpecChipRef}
                type="button"
                onClick={aceSpecModal.onOpen}
                aria-pressed={!!aceSpecFilter}
                /* カード画像(24px の長方形)は角丸の縁からはみ出しやすい。チップの高さ28pxに対して
                   左端から 6.8px 以上内側に置けば角が縁の内側に収まる。右の余白と揃えて pl-3(12px)にする */
                className={`flex shrink-0 items-center gap-1.5 rounded-full text-xs font-bold ${
                  aceSpecFilter
                    ? "bg-foreground py-0.5 pl-3 pr-3 text-background"
                    : "border border-default-200 bg-content1 px-3 py-1 text-default-500"
                }`}
              >
                {aceSpecFilter ? (
                  <>
                    {aceSpecFilter.image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={aceSpecFilter.image_url}
                        alt=""
                        className="h-6 w-auto rounded-[2px]"
                        loading="lazy"
                      />
                    ) : null}
                    <span className="max-w-36 truncate">{aceSpecFilter.card_name}</span>
                  </>
                ) : (
                  <>
                    ACE SPEC
                    <LuChevronDown className="text-xs" />
                  </>
                )}
              </button>
              {aceSpecFilter && (
                <button
                  type="button"
                  onClick={() => setAceSpecFilter(null)}
                  aria-label="ACE SPEC の絞り込みを解除"
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-default-100 text-default-500 active:opacity-70"
                >
                  <LuX className="text-xs" />
                </button>
              )}
            </div>
          </DeckViewToggleBar>

          {isLoading && (
            <div className="flex flex-col gap-3">
              {[0, 1, 2].map((i) => (
                <DeckCodePostCardSkeleton key={i} />
              ))}
            </div>
          )}

          {!isLoading && error && (
            <div className="rounded-large bg-content1 p-6 text-center text-sm text-default-500">
              読み込めませんでした。時間をおいて開き直してください。
            </div>
          )}

          {!isLoading && !error && posts.length === 0 && (
            <div className="rounded-large bg-content1 p-6 text-center text-sm text-default-500">
              {aceSpecFilter ? (
                <>
                  「{aceSpecFilter.card_name}」を採用した
                  <br />
                  公開デッキはありません。
                </>
              ) : spriteFilters.length > 0 ? (
                <>
                  「{spriteFilters.map((s) => s.name).join("・")}」のスプライトを持つ
                  <br />
                  公開デッキはありません。
                </>
              ) : shownEnvironmentTitle ? (
                <>
                  『{shownEnvironmentTitle}』環境に
                  <br />
                  公開されたデッキはまだありません。
                </>
              ) : (
                "公開されたデッキはまだありません。"
              )}
              <br />
              <br />
              デッキ詳細の「みんなの公開デッキに載せる」から
              <br />
              あなたのデッキを公開できます。
            </div>
          )}

          {posts.map((post, index) => (
            <DeckCodePostCard
              key={post.id}
              post={post}
              viewerId={viewerId}
              onChange={updatePost}
              onRequireLogin={requireLogin}
              // 画面に入る最初の2枚だけ即時に読み、残りは表示されるまで取りに行かない
              imageLoading={index < 2 ? "eager" : "lazy"}
            />
          ))}

          {hasMore && (
            <Button
              variant="flat"
              isLoading={isLoadingMore}
              onPress={loadMore}
              className="mt-1"
            >
              もっと見る
            </Button>
          )}
        </div>
      </div>
    </>
  );
}
