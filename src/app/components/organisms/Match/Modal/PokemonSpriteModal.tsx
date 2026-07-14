import useSWR from "swr";

import { Children, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { SetStateAction, Dispatch, ReactElement } from "react";

import Select, { MenuListProps, SelectInstance } from "react-select";
import { FixedSizeList, ListChildComponentProps } from "react-window";
import { useReactSelectTheme } from "@app/components/molecules/Select/useReactSelectTheme";

import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from "@heroui/react";

import { Image } from "@heroui/react";
import { Button } from "@heroui/react";

import { CgSearch } from "react-icons/cg";

import { PokemonSpriteType } from "@app/types/pokemon_sprite";

type PokemonSpriteOption = {
  label: string;
  value: string;
  id: string;
  name: string;
  image_url: string;
};

// 候補1件あたりの横幅(px)。formatOptionLabelのmenu用レイアウトと合わせる
const SPRITE_OPTION_WIDTH = 96;

// react-select は「該当候補なし」の場合も MenuList にその案内文を1件のchildとして渡してくる。
// 実際の候補(Option要素)は data プロップにスプライト情報を持つので、それを目印に区別する
function isSpriteOptionElement(
  item: ReactElement,
): item is ReactElement<{ data: PokemonSpriteOption }> {
  const data = (item.props as { data?: unknown }).data;
  return !!data && typeof data === "object" && "value" in (data as object);
}

// 候補一覧を縦スクロールではなく横スクロールで表示するためのMenuList
// (react-window で仮想化しているため、1000件超の候補でも描画負荷を抑えられる)
function HorizontalMenuList(props: MenuListProps<PokemonSpriteOption, false>) {
  const { children, maxHeight, focusedOption } = props;
  const listRef = useRef<FixedSizeList>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);

  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new ResizeObserver(([entry]) => {
      setContainerWidth(entry.contentRect.width);
    });
    observer.observe(el);

    return () => observer.disconnect();
  }, []);

  const items = useMemo(() => Children.toArray(children) as ReactElement[], [children]);
  const isOptionList = items.length > 0 && items.every(isSpriteOptionElement);

  const focusedIndex = useMemo(() => {
    if (!isOptionList || !focusedOption) return -1;
    return items.findIndex(
      (item) =>
        isSpriteOptionElement(item) && item.props.data.value === focusedOption.value,
    );
  }, [isOptionList, items, focusedOption]);

  useEffect(() => {
    if (focusedIndex >= 0) {
      listRef.current?.scrollToItem(focusedIndex, "smart");
    }
  }, [focusedIndex]);

  // 該当候補がない場合は、小さな1ブロックに収めず一覧領域いっぱいに案内文を表示する
  if (!isOptionList) {
    return (
      <div
        className="flex items-center justify-center w-full text-default-500 text-sm"
        style={{ height: maxHeight }}
      >
        {children}
      </div>
    );
  }

  return (
    <div ref={containerRef} className="w-full">
      {containerWidth > 0 && (
        <FixedSizeList
          ref={listRef}
          layout="horizontal"
          height={maxHeight}
          width={containerWidth}
          itemCount={items.length}
          itemSize={SPRITE_OPTION_WIDTH}
          style={{ overflowY: "hidden" }}
        >
          {({ index, style }: ListChildComponentProps) => (
            <div
              style={style}
              className={index < items.length - 1 ? "border-r border-divider" : undefined}
            >
              {items[index]}
            </div>
          )}
        </FixedSizeList>
      )}
    </div>
  );
}

async function fetcherForPokemonSprites(url: string) {
  const res = await fetch(url, {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
  });

  if (!res.ok) {
    throw new Error("Failed to fetch");
  }

  const ret: PokemonSpriteType[] = await res.json();

  return ret;
}

function katakanaToHiragana(str: string): string {
  return str.replace(/[ァ-ヶ]/g, (match) => {
    const charCode = match.charCodeAt(0);

    // 「ヴ」はひらがなの「ゔ」（ゔ）へ、それ以外は一律 -0x60
    return String.fromCharCode(charCode === 0x30f4 ? 0x3094 : charCode - 0x60);
  });
}

function convertToPokemonSpriteOption(
  pokemonSprite: PokemonSpriteType,
): PokemonSpriteOption {
  return {
    label: pokemonSprite.name + " - " + katakanaToHiragana(pokemonSprite.name),
    value: pokemonSprite.id,
    id: pokemonSprite.id,
    name: pokemonSprite.name,
    image_url: pokemonSprite.image_url,
  };
}

type SpriteSlot = 1 | 2;

type Props = {
  pokemonSprite1: PokemonSpriteType | null;
  setPokemonSprite1: Dispatch<SetStateAction<PokemonSpriteType | null>>;
  pokemonSprite2: PokemonSpriteType | null;
  setPokemonSprite2: Dispatch<SetStateAction<PokemonSpriteType | null>>;
  isOpen: boolean;
  onOpenChange: () => void;
  // モーダルを開いた直後にどちらの枠を選択対象にするか(クリックしたアイコン側)
  initialActiveSlot?: SpriteSlot;
};

export default function PokemonSpriteModal({
  pokemonSprite1,
  setPokemonSprite1,
  pokemonSprite2,
  setPokemonSprite2,
  isOpen,
  onOpenChange,
  initialActiveSlot = 1,
}: Props) {
  // react-select をダークモードに追従させるテーマ
  const reactSelectTheme = useReactSelectTheme();

  const focusSinkRef = useRef<HTMLDivElement>(null);
  const selectRef = useRef<SelectInstance<PokemonSpriteOption, false>>(null);

  const [selectedOption1, setSelectedOption1] = useState<PokemonSpriteOption | null>(null);
  const [selectedOption2, setSelectedOption2] = useState<PokemonSpriteOption | null>(null);
  const [activeSlot, setActiveSlot] = useState<SpriteSlot>(1);
  const [menuIsOpen, setMenuIsOpen] = useState(false);

  let pokemonSpritesOptions: PokemonSpriteOption[] = [];
  let pokemonSpritesOptionsMessage = "対象のポケモンはいません";
  {
    const url = "/api/pokemon-sprites";
    const { data, error, isLoading } = useSWR<PokemonSpriteType[], Error>(
      url,
      fetcherForPokemonSprites,
    );

    if (error) {
      pokemonSpritesOptionsMessage = "エラーが発生しました";
    }
    if (isLoading) {
      pokemonSpritesOptionsMessage = "検索中...";
    }

    if (data?.length == 0) {
      pokemonSpritesOptionsMessage = "ポケモンがいません";
    }

    pokemonSpritesOptions = useMemo(() => {
      if (!data) return [];
      return data.map(convertToPokemonSpriteOption);
    }, [data]);
  }

  // モーダルを開いた瞬間に、外部の選択状態(1枚目/2枚目)とアクティブな枠を同期する
  useEffect(() => {
    if (!isOpen) return;

    const matchOption = (sprite: PokemonSpriteType | null) => {
      if (!sprite) return null;
      return pokemonSpritesOptions.find((option) => option.id === sprite.id) ?? null;
    };

    if (pokemonSprite1) {
      const matched = matchOption(pokemonSprite1);
      if (matched) setSelectedOption1(matched);
    } else {
      setSelectedOption1(null);
    }

    if (pokemonSprite2) {
      const matched = matchOption(pokemonSprite2);
      if (matched) setSelectedOption2(matched);
    } else {
      setSelectedOption2(null);
    }

    setActiveSlot(initialActiveSlot);
    setMenuIsOpen(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, pokemonSprite1, pokemonSprite2, initialActiveSlot]);

  const activeOption = activeSlot === 1 ? selectedOption1 : selectedOption2;

  // どちらの枠も変更がなければ決定ボタンを押させない(誤って無操作のまま確定させない)
  const isUnchanged =
    (selectedOption1?.id ?? null) === (pokemonSprite1?.id ?? null) &&
    (selectedOption2?.id ?? null) === (pokemonSprite2?.id ?? null);

  return (
    <Modal
      size="sm"
      placement="center"
      isOpen={isOpen}
      isDismissable={false}
      onOpenChange={onOpenChange}
      onClose={() => {
        setSelectedOption1(null);
        setSelectedOption2(null);
        setMenuIsOpen(false);
      }}
      classNames={{
        base: "sm:max-w-full",
        closeButton: "text-xl",
      }}
    >
      <ModalContent className="overflow-y-visible">
        {(onClose) => (
          <>
            <ModalHeader className="px-3 flex-col items-start gap-0.5">
              <span>ポケモンのアイコンを選択</span>
              <span className="text-tiny font-normal text-default-400">
                下の2枠をタップで切り替えて、それぞれのアイコンを選べます
              </span>
            </ModalHeader>
            <ModalBody className="px-5">
              <div className="flex items-center justify-center gap-4">
                {([1, 2] as const).map((slot) => {
                  const option = slot === 1 ? selectedOption1 : selectedOption2;
                  const isActive = activeSlot === slot;

                  return (
                    <button
                      key={slot}
                      type="button"
                      onClick={() => {
                        setActiveSlot(slot);
                        setMenuIsOpen(true);
                        selectRef.current?.focus();
                      }}
                      aria-pressed={isActive}
                      className={`relative w-16 h-16 shrink-0 rounded-xl border-2 flex items-center justify-center transition-colors ${
                        isActive
                          ? "border-primary bg-primary/10"
                          : "border-divider bg-default-100"
                      }`}
                    >
                      <span className="absolute -top-2 -left-2 flex items-center justify-center w-5 h-5 rounded-full bg-default-200 text-tiny font-bold">
                        {slot}
                      </span>
                      {option ? (
                        <Image
                          alt={option.name}
                          src={option.image_url}
                          radius="none"
                          disableAnimation
                          className="w-12 h-12 object-contain"
                        />
                      ) : (
                        <span className="text-tiny text-default-400">未選択</span>
                      )}
                    </button>
                  );
                })}
              </div>

              <Select
                ref={selectRef}
                theme={reactSelectTheme}
                components={{ MenuList: HorizontalMenuList }}
                placeholder={
                  <div className="flex items-center gap-2">
                    <div className="text-xl">
                      <CgSearch />
                    </div>
                    <span className="text-sm">ポケモンの名前を入力</span>
                  </div>
                }
                styles={{
                  control: (base) => ({
                    ...base,
                    height: 81,
                    minHeight: 81,
                  }),
                  clearIndicator: (base) => ({
                    ...base,
                    marginRight: 12,
                    padding: 5,
                    transform: "scale(1.2)",
                    "& svg": {
                      width: 15,
                      height: 15,
                      strokeWidth: 0.75,
                    },
                  }),
                  menuPortal: (base) => ({ ...base, zIndex: 9999 }),
                  option: (base) => ({
                    ...base,
                    padding: 0,
                  }),
                }}
                menuPosition="fixed"
                menuPortalTarget={typeof document !== "undefined" ? document.body : null}
                menuIsOpen={menuIsOpen}
                onMenuOpen={() => setMenuIsOpen(true)}
                onMenuClose={() => {
                  setMenuIsOpen(false);
                  focusSinkRef.current?.focus();
                }}
                isClearable={true}
                isSearchable={true}
                noOptionsMessage={() => pokemonSpritesOptionsMessage}
                options={pokemonSpritesOptions}
                value={activeOption}
                onChange={(option) => {
                  const nextOption = option as PokemonSpriteOption | null;

                  if (activeSlot === 1) {
                    setSelectedOption1(nextOption);
                    // 1枚目を選んだら、2枚目が未選択ならそのまま続けて選べるようにする
                    if (nextOption && !selectedOption2) setActiveSlot(2);
                  } else {
                    setSelectedOption2(nextOption);
                    if (nextOption && !selectedOption1) setActiveSlot(1);
                  }
                }}
                maxMenuHeight={100}
                formatOptionLabel={(option, { context }) => {
                  const opt = option as PokemonSpriteOption;

                  if (context === "menu") {
                    return (
                      <div className="flex flex-col items-center justify-start gap-3 h-23.5">
                        <Image
                          alt={opt.name}
                          src={opt.image_url}
                          radius="none"
                          disableAnimation
                          className="w-16 h-16 object-contain"
                        />
                        <div className="truncate w-full text-center text-tiny pb-0.5 px-1.5">
                          {opt.name}
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div className="w-full h-full flex items-center gap-3">
                      <Image
                        alt={opt.name}
                        src={opt.image_url}
                        radius="none"
                        className="object-contain pb-3"
                      />
                      <div className="text-sm truncate">{opt.name}</div>
                    </div>
                  );
                }}
              />
              <div
                ref={focusSinkRef}
                tabIndex={-1}
                className="sr-only"
                aria-hidden="true"
              />
            </ModalBody>
            <ModalFooter>
              <Button
                color="default"
                variant="solid"
                onPress={() => {
                  onClose();
                }}
                className="font-bold"
              >
                戻る
              </Button>
              <Button
                color="primary"
                variant="solid"
                isDisabled={isUnchanged}
                onPress={() => {
                  setPokemonSprite1(
                    selectedOption1
                      ? {
                          id: selectedOption1.id,
                          name: selectedOption1.name,
                          image_url: selectedOption1.image_url,
                        }
                      : null,
                  );
                  setPokemonSprite2(
                    selectedOption2
                      ? {
                          id: selectedOption2.id,
                          name: selectedOption2.name,
                          image_url: selectedOption2.image_url,
                        }
                      : null,
                  );
                  onClose();
                }}
                className="font-bold"
              >
                決定
              </Button>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
}
