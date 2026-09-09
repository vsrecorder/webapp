"use client";

import { useEffect, useState } from "react";

import useSWR from "swr";

import { ModalContent, ModalHeader, ModalBody, ModalFooter } from "@heroui/react";
import { Image, Button } from "@heroui/react";
import { Input } from "@heroui/react";
//import { Checkbox } from "@heroui/react";
import { Link } from "@heroui/react";
import { addToast, closeToast } from "@heroui/react";
import { Skeleton } from "@heroui/react";
import { useDisclosure } from "@heroui/react";

import { LuLayers } from "react-icons/lu";

import { sendGAEvent } from "@next/third-parties/google";

import { Modal } from "@app/components/atoms/AppModal";
import PokemonSpriteModal from "@app/components/organisms/Match/Modal/PokemonSpriteModal";

import { PokemonSpriteType, DeckPokemonSpriteType } from "@app/types/pokemon_sprite";
import { DeckCreateRequestType } from "@app/types/deck";
import PokemonSprite from "@app/components/atoms/PokemonSprite";
import TagSelectorAccordion from "@app/components/organisms/Tag/TagSelectorAccordion";
import { triggerNotificationsRefresh } from "@app/utils/notificationEvents";
import { scrollIntoViewAfterKeyboard } from "@app/utils/keyboard";
import { MAX_DECK_NAME_LENGTH, countTextLength } from "@app/utils/textLength";
import { normalizeDeckCode } from "@app/utils/deckCode";
import { swrFetcher } from "@app/utils/deckCodePost";
import { spriteImageUrl } from "@app/utils/sprite";
import { getSpriteBySlot } from "@app/utils/spriteSlot";

const DECK_CODE_LENGTH = 20;
const DECK_CODE_CHECK_DEBOUNCE_MS = 500;

// 初期スプライト(枠と id しか持たない)を、指定スロット(1/2)の PokemonSpriteType へ解決する。
// アイコン一覧がまだ無ければ id だけの仮の値にし(画像は id から組める)、
// 一覧が届いた時点で名前を入れ直す(下の resolveSprite)。
function toInitialSprite(
  initialSprites: DeckPokemonSpriteType[] | undefined,
  slot: 1 | 2,
  spriteMaster?: PokemonSpriteType[],
): PokemonSpriteType | null {
  const sprite = getSpriteBySlot(initialSprites, slot);
  if (!sprite) return null;

  return (
    spriteMaster?.find((s) => s.id === sprite.id) ?? {
      id: sprite.id,
      name: sprite.id,
      image_url: spriteImageUrl(sprite.id),
    }
  );
}

type Props = {
  deck_code: string;
  // 開いたときにデッキ名・アイコンへ入れておく初期値。みんなの公開デッキの「取り込む」が、
  // 元の投稿のデッキ名とスプライトを引き継ぐために使う。無ければ空で始まる
  initialName?: string;
  initialSprites?: DeckPokemonSpriteType[];
  isOpen: boolean;
  onOpenChange: () => void;
  onCreated: () => void;
};

export default function CreateDeckModal({
  deck_code,
  initialName = "",
  initialSprites,
  isOpen,
  onOpenChange,
  onCreated,
}: Props) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [deckname, setDeckName] = useState<string>(initialName);
  const [deckcode, setDeckCode] = useState<string>(deck_code);
  //const [isSelectedPrivateCode, setIsSelectedPrivateCode] = useState<boolean>(false);
  // 外部API(deckIDCheck.php)で確認した結果。どのコードの結果かも持ち、入力中のコードと
  // 一致するときだけ使う(確認中は前回同様、有効扱いのまま待つ)
  const [deckCodeCheck, setDeckCodeCheck] = useState<{ code: string; valid: boolean } | null>(
    null,
  );
  const [isDisabled, setIsDisabled] = useState<boolean>(false);

  /*
   * 利用者が選んだスプライト。id と名前が同じものは一覧が届く前の仮の値(下の resolveSprite で本物にする)。
   *
   * 初期値は下の initialSource(開いたときの入れ直し)だけには任せられない。このモーダルは
   * createLazyModal 経由で「開かれてから初めてマウントされる」ため、マウント直後は isOpen に
   * 差分が無く入れ直しが走らない。デッキ名(useState(initialName))と同じく、マウント時ぶんは
   * ここで入れる(みんなの公開デッキの「デッキ登録」で、初回だけアイコンが空だった原因)。
   */
  const [sprite1, setSprite1] = useState<PokemonSpriteType | null>(() =>
    toInitialSprite(initialSprites, 1),
  );
  const [sprite2, setSprite2] = useState<PokemonSpriteType | null>(() =>
    toInitialSprite(initialSprites, 2),
  );
  const [activeSpriteSlot, setActiveSpriteSlot] = useState<1 | 2>(1);

  // 初期スプライトは id と枠しか持たないため、名前と画像はポケモンのアイコン一覧から引く。
  // 一覧はアイコン選択モーダル(SpritePickerPanel)と同じ URL なので SWR のキャッシュを共有する。
  // 初期スプライトが無いモーダル(デッキ一覧の＋ボタンなど)では取りに行かない
  const hasInitialSprites = (initialSprites?.length ?? 0) > 0;
  const { data: spriteMaster } = useSWR<PokemonSpriteType[], Error>(
    hasInitialSprites ? "/api/pokemon-sprites" : null,
    (url: string) => swrFetcher<PokemonSpriteType[]>(url),
    { revalidateOnFocus: false },
  );

  // 初期スプライトを枠(1/2)ごとに解決する。一覧(spriteMaster)が届いていればその場で名前も入る
  const resolveInitialSprite = (slot: 1 | 2): PokemonSpriteType | null =>
    toInitialSprite(initialSprites, slot, spriteMaster);

  // 開くたびに初期値(デッキ名・アイコン)を入れ直す。閉じたときの resetState だけだと、
  // 別の投稿から同じモーダルを開き直したときに前回の初期値が残るため。
  // initialSpriteKey は initialSprites の中身を文字列にしたもの(配列の参照ではなく中身で比較する)。
  // effect で入れ直すと前回の値での描画が一度挟まるので、前回の初期値を控えて描画中に入れ直す
  const initialSpriteKey = (initialSprites ?? []).map((s) => `${s.position ?? ""}:${s.id}`).join(",");
  const [initialSource, setInitialSource] = useState({ isOpen, initialName, initialSpriteKey });
  if (
    initialSource.isOpen !== isOpen ||
    initialSource.initialName !== initialName ||
    initialSource.initialSpriteKey !== initialSpriteKey
  ) {
    setInitialSource({ isOpen, initialName, initialSpriteKey });
    if (isOpen) {
      setDeckName(initialName);
      setSprite1(resolveInitialSprite(1));
      setSprite2(resolveInitialSprite(2));
    }
  }

  // アイコン一覧が後から届いたら、名前が仮(id のまま)のスプライトだけ本物で描く。
  // 利用者が選び直したスプライト(名前が入っている)はそのまま
  const resolveSprite = (current: PokemonSpriteType | null) => {
    if (!current || !spriteMaster || current.name !== current.id) return current;
    return spriteMaster.find((s) => s.id === current.id) ?? current;
  };
  const resolvedSprite1 = resolveSprite(sprite1);
  const resolvedSprite2 = resolveSprite(sprite2);

  const [tagIds, setTagIds] = useState<string[]>([]);
  // タグ管理中は「閉じる」「登録」やモーダルのクローズを無効化する
  const [isTagManaging, setIsTagManaging] = useState<boolean>(false);

  const {
    isOpen: isSpriteOpen,
    onOpen: onSpriteOpen,
    onOpenChange: onSpriteOpenChange,
  } = useDisclosure();

  const decknameLength = countTextLength(deckname.trim());
  const isDecknameTooLong = decknameLength > MAX_DECK_NAME_LENGTH;

  /*
    デッキコードが有効かどうか。
    未入力は有効(エラーを出さない)、デッキコードは必ず20桁なので桁数が違う時点で
    問い合わせるまでもなく無効、20桁なら外部APIの確認結果に従う
  */
  const isValidatedDeckCode = !deckcode
    ? true
    : deckcode.length !== DECK_CODE_LENGTH
      ? false
      : deckCodeCheck?.code === deckcode
        ? deckCodeCheck.valid
        : true;

  /*
    入力項目のチェック
    - デッキ名
      - 空でないか
      - 上限文字数を超えていないか（超えるとAPIが400を返す）
    - デッキコード
      - 有効なデッキコードかどうか
  */
  const isInvalid = !(deckname != "" && !isDecknameTooLong && isValidatedDeckCode);

  /*
    20桁のデッキコードを外部APIで確認する
  */
  useEffect(() => {
    /*
     * 閉じている間は検証しない。このモーダルは CityleagueResultCard のように
     * 実コード付き・閉じたままで大量に(結果スライドごとに)マウントされるため、
     * マウント時に検証すると一覧ページを開くだけで外部API(deckIDCheck.php)へ
     * 数百本のPOSTが飛ぶ(/cityleague_results で実測 約290本/表示)。
     * 開いた時点で isOpen が deps にあるのでここが再実行され、検証が走る。
     */
    if (!isOpen) return;

    if (!deckcode || deckcode.length !== DECK_CODE_LENGTH) return;

    let cancelled = false;

    const checkDeckCode = async () => {
      try {
        const formData = new FormData();
        formData.append("deckID", deckcode);

        const res = await fetch("https://www.pokemon-card.com/deck/deckIDCheck.php", {
          method: "POST",
          headers: {},
          body: formData,
        });

        const data = await res.json();
        if (!cancelled) {
          setDeckCodeCheck({ code: deckcode, valid: data.result === 1 });
        }
      } catch (error) {
        console.error(error);
        if (!cancelled) {
          setDeckCodeCheck({ code: deckcode, valid: false });
        }
      }
    };

    // 入力が落ち着くまで外部APIへの問い合わせを遅らせる
    const timerId = setTimeout(checkDeckCode, DECK_CODE_CHECK_DEBOUNCE_MS);

    return () => {
      cancelled = true;
      clearTimeout(timerId);
    };
  }, [isOpen, deckcode]);

  const resetState = () => {
    setIsDisabled(false);
    setDeckCodeCheck(null);
    setDeckName(initialName);
    setDeckCode(deck_code);
    setSprite1(resolveInitialSprite(1));
    setSprite2(resolveInitialSprite(2));
    setTagIds([]);
    setIsTagManaging(false);
    //setIsSelectedPrivateCode(false);
  };

  const createDeck = async (onClose: () => void) => {
    // position(1/2)を必ず付与してスロットを固定する(空スロットを詰めない)
    const pokemon_sprites: DeckPokemonSpriteType[] = [];
    if (resolvedSprite1) pokemon_sprites.push({ id: resolvedSprite1.id, position: 1 });
    if (resolvedSprite2) pokemon_sprites.push({ id: resolvedSprite2.id, position: 2 });

    const deck: DeckCreateRequestType = {
      name: deckname,
      private_flg: true,
      deck_code: deckcode,
      private_deck_code_flg: true,
      //private_deck_code_flg: isSelectedPrivateCode,
      pokemon_sprites,
      tag_ids: tagIds,
    };

    setIsDisabled(true);

    const toastId = addToast({
      title: "デッキ登録中",
      description: "しばらくお待ちください",
      color: "default",
      promise: new Promise(() => {}),
    });

    try {
      const res = await fetch("/api/decks", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(deck),
      });

      if (!res.ok) {
        const t = await res.json();
        throw new Error(`HTTP error: ${res.status} Message: ${t.message}`);
      }

      if (toastId) {
        closeToast(toastId);
      }

      addToast({
        title: "デッキ登録が完了",
        description: "デッキに登録しました",
        color: "success",
        timeout: 3000,
      });

      // 導線を問わないデッキ登録のベースライン計測
      // (クイックスタート経由は DeckCodeQuickStartModal 側で同じイベントを送っている)。
      sendGAEvent("event", "deck_created", {
        entry_point: "decks",
        with_tags: tagIds.length > 0,
      });

      triggerNotificationsRefresh();

      onCreated();
      onClose();
    } catch (error) {
      console.error(error);

      const errorMessage =
        error instanceof Error ? error.message : "不明なエラーが発生しました";

      if (toastId) {
        closeToast(toastId);
      }

      addToast({
        title: "デッキ登録に失敗",
        description: (
          <>
            デッキへの登録に失敗しました
            <br />
            {errorMessage}
          </>
        ),
        color: "danger",
        timeout: 5000,
      });

      onClose();
    }
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        size="sm"
        placement="center"
        // キーボード表示などで可視領域より背が高くなったとき、モーダル全体が画面から
        // はみ出さないよう base に最大高を与え、はみ出す分は body 内スクロールにする
        scrollBehavior="inside"
        isDismissable={false}
        // 登録処理中(isDisabled)・タグ管理中(isTagManaging)はESC・閉じるボタン・
        // onOpenChange経由でのクローズを無効化する
        isKeyboardDismissDisabled={isDisabled || isTagManaging}
        hideCloseButton={isDisabled || isTagManaging}
        onOpenChange={() => {
          if (isDisabled || isTagManaging) return;
          onOpenChange();
        }}
        onClose={resetState}
        classNames={{
          // scrollBehavior="inside" 既定の max-h(100%-8rem) は特にキーボード表示中に
          // 窮屈なため、余白を 3rem まで縮めてモーダルを大きく使う
          base: "sm:max-w-full max-h-[calc(100%-3rem)]",
          closeButton: "text-xl",
        }}
      >
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="text-lg px-3">デッキ登録</ModalHeader>
              <ModalBody className="px-3 py-1 gap-3">
                {/* スプライト2枚 */}
                <div className="flex flex-col gap-1">
                  <span className="text-xs text-default-500">
                    デッキアイコン（任意・最大2つ）
                  </span>
                  <div className="flex items-center gap-0">
                    {([1, 2] as const).map((slot) => {
                      const sprite = slot === 1 ? resolvedSprite1 : resolvedSprite2;
                      return (
                        <div
                          key={slot}
                          className={`shrink-0 ${isDisabled ? "" : "cursor-pointer"}`}
                          onClick={() => {
                            if (isDisabled) return;
                            setActiveSpriteSlot(slot);
                            onSpriteOpen();
                          }}
                        >
                          <PokemonSprite
                            id={sprite?.id}
                            size={48}
                            className={isDisabled ? "contrast-0" : ""}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>

                <Input
                  isRequired
                  isDisabled={isDisabled}
                  type="text"
                  label="デッキ名"
                  labelPlacement="outside"
                  placeholder="デッキ名を入力"
                  value={deckname}
                  onChange={(e) => setDeckName(e.target.value)}
                  onFocus={(e) => scrollIntoViewAfterKeyboard(e.currentTarget)}
                  isInvalid={isDecknameTooLong}
                  errorMessage={`デッキ名は${MAX_DECK_NAME_LENGTH}文字以内で入力してください（現在${decknameLength}文字）`}
                  description={`${decknameLength}/${MAX_DECK_NAME_LENGTH}文字`}
                />

                <Input
                  isDisabled={isDisabled}
                  isInvalid={!isValidatedDeckCode}
                  errorMessage="有効なデッキコードを貼り付けてください"
                  type="text"
                  label="デッキコード"
                  labelPlacement="outside"
                  placeholder="デッキコードを貼り付け"
                  value={deckcode}
                  // 貼り付け時に紛れ込む空白・改行・全角文字を吸収する(そのままだと桁数チェックで弾かれる)
                  onChange={(e) => setDeckCode(normalizeDeckCode(e.target.value))}
                  onFocus={(e) => scrollIntoViewAfterKeyboard(e.currentTarget)}
                />

                {/*
                <Checkbox
                  name="create-deck-code-private"
                  isDisabled={deckcode == ""}
                  //isDisabled={deckcode == "" || !isValidatedDeckCode}
                  defaultSelected={false}
                  size={"sm"}
                  isSelected={isSelectedPrivateCode}
                  onValueChange={setIsSelectedPrivateCode}
                >
                  デッキコードを非公開にする
                </Checkbox>
                */}

                {deckcode ? (
                  <div className="relative w-full aspect-2/1">
                    {!imageLoaded && <Skeleton className="absolute inset-0 rounded-lg" />}
                    <Image
                      radius="sm"
                      shadow="none"
                      alt={deckcode}
                      src={
                        isValidatedDeckCode
                          ? `https://www.pokemon-card.com/deck/deckView.php/deckID/${deckcode}.png`
                          : "https://www.pokemon-card.com/deck/deckView.php/deckID/"
                      }
                      className=""
                      onLoad={() => setImageLoaded(true)}
                      onError={() => {}}
                    />
                  </div>
                ) : (
                  <div className="w-full flex flex-col items-center gap-2 rounded-xl border-2 border-dashed border-primary/30 bg-primary/5 px-4 py-6">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <LuLayers className="text-xl text-primary" />
                    </div>
                    <div className="font-bold text-tiny text-primary">
                      デッキコードは後からでも登録できます
                    </div>
                    <div className="text-tiny text-default-400 text-center">
                      対象のデッキコードが
                      <br />
                      最初のバージョンとして登録されます。
                    </div>
                  </div>
                )}

                <div className="-translate-y-2">
                  <Link
                    isExternal
                    showAnchorIcon
                    underline="always"
                    href="https://www.pokemon-card.com/deck/"
                    className="text-xs"
                  >
                    <span>トレーナーズウェブサイトでデッキを構築する</span>
                  </Link>
                </div>

                {/* タグ選択はモーダルの一番下に、たたんだアコーディオンで置く */}
                {!isDisabled && (
                  <TagSelectorAccordion
                    selectedTagIds={tagIds}
                    onChange={setTagIds}
                    onManageModeChange={setIsTagManaging}
                  />
                )}
              </ModalBody>
              <ModalFooter>
                <Button
                  color="default"
                  variant="solid"
                  isDisabled={isDisabled || isTagManaging}
                  onPress={() => {
                    onClose();
                  }}
                  className="font-bold"
                >
                  閉じる
                </Button>
                <Button
                  color="primary"
                  variant="solid"
                  isDisabled={
                    !isValidatedDeckCode || isInvalid || isDisabled || isTagManaging
                  }
                  onPress={() => {
                    createDeck(onClose);
                  }}
                  className="font-bold"
                >
                  登録
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>

      <PokemonSpriteModal
        pokemonSprite1={resolvedSprite1}
        setPokemonSprite1={setSprite1}
        pokemonSprite2={resolvedSprite2}
        setPokemonSprite2={setSprite2}
        isOpen={isSpriteOpen}
        onOpenChange={onSpriteOpenChange}
        initialActiveSlot={activeSpriteSlot}
      />
    </>
  );
}
