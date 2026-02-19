import useSWR from "swr";

import { useEffect, useState } from "react";
import { SetStateAction, Dispatch } from "react";

//import { useRef } from "react";

import WindowedSelect from "react-windowed-select";

import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from "@heroui/react";

import { CgSearch } from "react-icons/cg";

import { Image } from "@heroui/react";
import { Button } from "@heroui/react";

import { PokemonSpriteType } from "@app/types/pokemon_sprite";

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
  pokemonSprite: PokemonSpriteType | null;
  setPokemonSprite: Dispatch<SetStateAction<PokemonSpriteType | null>>;
  isOpen: boolean;
  onOpenChange: () => void;
};

export default function PokemonSpriteModal({
  pokemonSprite,
  setPokemonSprite,
  isOpen,
  onOpenChange,
}: Props) {
  const [selectedPokemonSpriteOption, setSelectedPokemonSpriteOption] =
    useState<PokemonSpriteOption | null>(
      pokemonSprite ? convertToPokemonSpriteOption(pokemonSprite) : null,
    );

  const [isDisabled, setIsDisabled] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      setSelectedPokemonSpriteOption(
        pokemonSprite ? convertToPokemonSpriteOption(pokemonSprite) : null,
      );
    }
  }, [isOpen, pokemonSprite]);

  useEffect(() => {
    if (pokemonSprite?.name === selectedPokemonSpriteOption?.name) {
      setIsDisabled(true);
      return;
    }

    setIsDisabled(false);
  }, [pokemonSprite, selectedPokemonSpriteOption]);

  const pokemonSpritesOptions: PokemonSpriteOption[] = [];
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

    data?.forEach((s: PokemonSpriteType) => {
      pokemonSpritesOptions.push(convertToPokemonSpriteOption(s));
    });
  }

  return (
    <Modal
      size="sm"
      placement="center"
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      onClose={() => {}}
      //className="h-[calc(100dvh-512px)] max-h-[calc(100dvh-512px)]"
      classNames={{
        base: "sm:max-w-full",
        closeButton: "text-2xl",
      }}
    >
      <ModalContent className="overflow-y-visible">
        {(onClose) => (
          <>
            <ModalHeader className="px-3">ポケモンのアイコンを選択</ModalHeader>
            <ModalBody className="px-5">
              <WindowedSelect
                //menuIsOpen={}
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
                //isLoading={isLoading}
                isClearable
                isSearchable
                noOptionsMessage={() => pokemonSpritesOptionsMessage}
                options={pokemonSpritesOptions}
                value={selectedPokemonSpriteOption}
                onChange={(option) => {
                  setSelectedPokemonSpriteOption(option as PokemonSpriteOption);
                }}
                maxMenuHeight={200}
                windowThreshold={500}
                formatOptionLabel={(option, { context }) => {
                  const opt = option as PokemonSpriteOption;
                  if (context === "menu") {
                    return (
                      <div className="flex flex-col items-center justify-center">
                        <Image
                          alt={opt.name}
                          src={`https://xx8nnpgt.user.webaccel.jp/images/pokemon-sprites/${opt.image}.png`}
                          radius="none"
                          className="object-contain"
                        />
                        <div className="text-tiny">{opt.name}</div>
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
            </ModalBody>
            <ModalFooter>
              <Button
                color="default"
                variant="solid"
                isDisabled={isDisabled}
                onPress={() => {
                  if (selectedPokemonSpriteOption) {
                    setPokemonSprite({
                      id: selectedPokemonSpriteOption.id,
                      name: selectedPokemonSpriteOption.name,
                    });
                    onClose();
                  } else {
                    setPokemonSprite(null);
                    onClose();
                  }
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
