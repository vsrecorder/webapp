import useSWR from "swr";

import { useEffect, useMemo, useState, SetStateAction, Dispatch } from "react";

import WindowedSelect from "react-windowed-select";

import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from "@heroui/react";
import { Button } from "@heroui/react";
import { Input } from "@heroui/react";
import { Image } from "@heroui/react";
//import { Checkbox } from "@heroui/react";
import { addToast, closeToast } from "@heroui/react";

import { CgSearch } from "react-icons/cg";

import { PokemonSpriteType, DeckPokemonSpriteType } from "@app/types/pokemon_sprite";

import {
  DeckUpdateRequestType,
  DeckGetByIdResponseType,
  DeckUpdateResponseType,
} from "@app/types/deck";

type PokemonSpriteOption = {
  label: string;
  value: string;
  id: string;
  name: string;
  image: string;
};

async function fetcherForPokemonSprites(url: string) {
  const res = await fetch(url, {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
  });
  const ret: PokemonSpriteType[] = await res.json();

  return ret;
}

function katakanaToHiragana(str: string): string {
  return str.replace(/[\u30A1-\u30F6]/g, (match) => {
    const charCode = match.charCodeAt(0);

    // 「ヴ」はひらがなの「ゔ」（\u3094）へ、それ以外は一律 -0x60
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
    image: pokemonSprite.id.replace(/^0+(?!$)/, ""),
  };
}

type Props = {
  deck: DeckGetByIdResponseType | null;
  setDeck: Dispatch<SetStateAction<DeckGetByIdResponseType | null>>;
  isOpen: boolean;
  onOpenChange: () => void;
};

export default function UpdateDeckModal({ deck, setDeck, isOpen, onOpenChange }: Props) {
  const [newDeckName, setNewDeckName] = useState<string>("");
  /*
  const [isSelectedPrivate, setIsSelectedPrivate] = useState<boolean>(
    deck ? deck.private_flg : false,
  );
  */
  const [isDisabled, setIsDisabled] = useState<boolean>(false);

  const [selectedPokemonSpriteOption1, setSelectedPokemonSpriteOption1] =
    useState<PokemonSpriteOption | null>(null);

  const [selectedPokemonSpriteOption2, setSelectedPokemonSpriteOption2] =
    useState<PokemonSpriteOption | null>(null);

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

  useEffect(() => {
    if (!deck?.pokemon_sprites?.[0] || pokemonSpritesOptions.length === 0) return;

    {
      const targetId = deck.pokemon_sprites[0].id;

      const matchedOption = pokemonSpritesOptions.find(
        (option) => option.id === targetId,
      );

      if (matchedOption) {
        setSelectedPokemonSpriteOption1(matchedOption);
      }
    }

    if (deck?.pokemon_sprites?.[1]) {
      const targetId = deck.pokemon_sprites[1].id;

      const matchedOption = pokemonSpritesOptions.find(
        (option) => option.id === targetId,
      );

      if (matchedOption) {
        setSelectedPokemonSpriteOption2(matchedOption);
      }
    }
  }, [deck, pokemonSpritesOptions]);

  useEffect(() => {
    if (deck) {
      setNewDeckName(deck.name);
    }
  }, [deck]);

  if (!deck) {
    return;
  }

  const updateDeck = async (onClose: () => void) => {
    let pokemon_sprites: DeckPokemonSpriteType[] = [];

    if (selectedPokemonSpriteOption1) {
      pokemon_sprites.push({
        id: selectedPokemonSpriteOption1.id,
      });
    }

    if (selectedPokemonSpriteOption2) {
      pokemon_sprites.push({
        id: selectedPokemonSpriteOption2.id,
      });
    }

    const data: DeckUpdateRequestType = {
      name: newDeckName,
      private_flg: true,
      //private_flg: isSelectedPrivate,
      pokemon_sprites: pokemon_sprites,
    };

    setIsDisabled(true);

    const toastId = addToast({
      title: "デッキ情報を更新中",
      description: "しばらくお待ちください",
      color: "default",
      promise: new Promise(() => {}),
    });

    try {
      const res = await fetch(`/api/decks/${deck.id}/`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const t = await res.json();
        throw new Error(`HTTP error: ${res.status} Message: ${t.message}`);
      }

      const ret: DeckUpdateResponseType = await res.json();

      if (toastId) {
        closeToast(toastId);
      }

      addToast({
        title: "デッキ情報の更新が完了",
        description: "デッキ情報を更新しました",
        color: "success",
        timeout: 3000,
      });

      setDeck({
        ...ret,
        name: newDeckName,
      });

      onClose();
    } catch (error) {
      console.error(error);

      const errorMessage =
        error instanceof Error ? error.message : "不明なエラーが発生しました";

      if (toastId) {
        closeToast(toastId);
      }

      addToast({
        title: "デッキ情報の更新に失敗",
        description: (
          <>
            デッキ情報の更新に失敗しました
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
    <Modal
      size={"sm"}
      placement="center"
      isOpen={isOpen}
      isDismissable={false}
      onOpenChange={onOpenChange}
      onClose={() => {
        setIsDisabled(false);

        if (deck && deck.pokemon_sprites[0] && selectedPokemonSpriteOption1) {
          /*
          setSelectedPokemonSpriteOption1(
            convertToPokemonSpriteOption({
              id: deck.pokemon_sprites[0].id,
              name: "",
            }),
          );
          */

          const targetId = deck.pokemon_sprites[0].id;

          const matchedOption = pokemonSpritesOptions.find(
            (option) => option.id === targetId,
          );

          if (matchedOption) {
            setSelectedPokemonSpriteOption1(matchedOption);
          }
        }

        if (deck && deck.pokemon_sprites[1] && selectedPokemonSpriteOption2) {
          /*
          setSelectedPokemonSpriteOption2(
            convertToPokemonSpriteOption({
              id: deck.pokemon_sprites[1].id,
              name: "",
            }),
          );
          */

          const targetId = deck.pokemon_sprites[1].id;

          const matchedOption = pokemonSpritesOptions.find(
            (option) => option.id === targetId,
          );

          if (matchedOption) {
            setSelectedPokemonSpriteOption2(matchedOption);
          }
        }
      }}
      classNames={{
        base: "sm:max-w-full",
        closeButton: "text-2xl",
      }}
    >
      <ModalContent>
        {(onClose) => (
          <>
            <ModalHeader className="flex flex-col gap-1 px-3">
              デッキ情報を更新
            </ModalHeader>
            <ModalBody className="px-3 py-1 pb-18">
              <Input
                isRequired
                isDisabled={isDisabled}
                //isInvalid={!isValidedDeckName}
                //errorMessage="有効なデッキコードを入力してください"
                type="text"
                label="デッキ名"
                labelPlacement="outside"
                placeholder={deck.name}
                value={newDeckName}
                onChange={(e) => setNewDeckName(e.target.value)}
              />

              {/*
              <Checkbox
                isDisabled={isDisabled}
                defaultSelected={false}
                size={"sm"}
                isSelected={isSelectedPrivate}
                onValueChange={setIsSelectedPrivate}
              >
                デッキ情報を非公開にする
              </Checkbox>
              */}

              <div className="flex flex-col gap-0.5">
                <label className="text-sm">ポケモンのアイコン1を選択</label>
                <WindowedSelect
                  className="z-110"
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
                  }}
                  isClearable={true}
                  isSearchable={true}
                  noOptionsMessage={() => pokemonSpritesOptionsMessage}
                  options={pokemonSpritesOptions}
                  value={selectedPokemonSpriteOption1}
                  onChange={(option) => {
                    setSelectedPokemonSpriteOption1(option as PokemonSpriteOption);
                  }}
                  maxMenuHeight={120}
                  windowThreshold={100}
                  formatOptionLabel={(option, { context }) => {
                    const opt = option as PokemonSpriteOption;

                    if (context === "menu") {
                      return (
                        <div className="flex flex-col items-center justify-center h-23.5">
                          <Image
                            alt={opt.name}
                            src={`https://xx8nnpgt.user.webaccel.jp/images/pokemon-sprites/${opt.image}.png`}
                            radius="none"
                            className="w-16 h-16 object-contain"
                          />
                          <div className="truncate w-full text-center text-tiny">
                            {opt.name}
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div className="w-full h-full flex items-center gap-3">
                        <Image
                          alt={opt.name}
                          src={`https://xx8nnpgt.user.webaccel.jp/images/pokemon-sprites/${opt.image}.png`}
                          radius="none"
                          className="object-contain pb-3"
                        />
                        <div className="text-sm truncate">{opt.name}</div>
                      </div>
                    );
                  }}
                />
              </div>

              <div className="flex flex-col gap-0.5">
                <label className="text-sm">ポケモンのアイコン2を選択</label>
                <WindowedSelect
                  className="z-100"
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
                  }}
                  isClearable={true}
                  isSearchable={true}
                  noOptionsMessage={() => pokemonSpritesOptionsMessage}
                  options={pokemonSpritesOptions}
                  value={selectedPokemonSpriteOption2}
                  onChange={(option) => {
                    setSelectedPokemonSpriteOption2(option as PokemonSpriteOption);
                  }}
                  maxMenuHeight={120}
                  windowThreshold={100}
                  formatOptionLabel={(option, { context }) => {
                    const opt = option as PokemonSpriteOption;

                    if (context === "menu") {
                      return (
                        <div className="flex flex-col items-center justify-center h-23.5">
                          <Image
                            alt={opt.name}
                            src={`https://xx8nnpgt.user.webaccel.jp/images/pokemon-sprites/${opt.image}.png`}
                            radius="none"
                            className="w-16 h-16 object-contain"
                          />
                          <div className="truncate w-full text-center text-tiny">
                            {opt.name}
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div className="w-full h-full flex items-center gap-3">
                        <Image
                          alt={opt.name}
                          src={`https://xx8nnpgt.user.webaccel.jp/images/pokemon-sprites/${opt.image}.png`}
                          radius="none"
                          className="object-contain pb-3"
                        />
                        <div className="text-sm truncate">{opt.name}</div>
                      </div>
                    );
                  }}
                />
              </div>
            </ModalBody>
            <ModalFooter>
              <Button
                color="default"
                variant="solid"
                isDisabled={isDisabled}
                onPress={() => {
                  setNewDeckName(deck.name);
                  onClose();
                }}
                className="font-bold"
              >
                閉じる
              </Button>
              <Button
                color="primary"
                variant="solid"
                //isDisabled={newDeckName === "" || newDeckName === deck.name || isDisabled}
                isDisabled={isDisabled}
                /*
                isDisabled={
                  newDeckName === "" ||
                  (newDeckName === deck.name && isSelectedPrivate === deck.private_flg) ||
                  isDisabled
                }
                 */
                onPress={() => {
                  updateDeck(onClose);
                }}
                className="font-bold"
              >
                更新
              </Button>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
}
