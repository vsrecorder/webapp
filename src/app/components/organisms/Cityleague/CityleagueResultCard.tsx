"use client";

import { useSession } from "next-auth/react";

import { useEffect, useState } from "react";

import { Card, CardHeader, CardBody } from "@heroui/react";
import { Image } from "@heroui/react";
import { Skeleton } from "@heroui/react";
import { Button } from "@heroui/react";
import { Snippet } from "@heroui/react";
import { Link } from "@heroui/react";

import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  useDisclosure,
} from "@heroui/react";

import { LuLayers } from "react-icons/lu";
import { LuUser } from "react-icons/lu";

import CreateDeckModal from "@app/components/organisms/Deck/Modal/CreateDeckModal";
import CardListAccordion from "@app/components/organisms/Deck/CardListAccordion";
import ZoomableDeckImage from "@app/components/atoms/ZoomableDeckImage";
import BoardPanel from "@app/components/organisms/Record/BoardPanel";

import { Result } from "@app/types/cityleague_result";

type Props = {
  result: Result;
  date: Date;
  // 個別ページのように順位ごとの見出しがある場所では、カード側のラベルが冗長になるため隠す。
  showRankLabel?: boolean;
};

export default function CityleagueResultCard({ result, showRankLabel = true }: Props) {
  const { isOpen, onOpen, onOpenChange } = useDisclosure();
  const [imageLoaded, setImageLoaded] = useState(false);

  const {
    isOpen: isOpenForCreateDeckModal,
    onOpen: onOpenForCreateDeckModal,
    onOpenChange: onOpenChangeForCreateDeckModal,
  } = useDisclosure();

  const { status } = useSession();

  useEffect(() => {
    if (!result.deck_code) {
      return;
    }

    const img = new window.Image();
    img.src = `https://xx8nnpgt.user.webaccel.jp/images/decks/${result.deck_code}.jpg`;
  }, [result.deck_code]);

  {
    /*
  useEffect(() => {
    if (!result.deck_code) {
      setLoadingAcespec(false);
      setLoadingEnvironment(false);
      return;
    }

    setLoadingAcespec(true);
    setLoadingEnvironment(true);

    const fetchAcespecData = async () => {
      try {
        setLoadingAcespec(true);
        const data = await fetchAcespec(result.deck_code);
        setAcespec(data);
      } catch (err) {
        console.log(err);
        setErrorAcespec(
          `Acespecカードのデータ取得に失敗しました(デッキコード: ${result.deck_code})`,
        );
      } finally {
        setLoadingAcespec(false);
      }
    };

    const fetchEnvironmentData = async () => {
      try {
        setLoadingEnvironment(true);
        const data = await fetchEnvironment(date);
        setEnvironment(data);
      } catch (err) {
        console.log(err);
        setErrorEnvironment("環境名のデータ取得に失敗しました");
      } finally {
        setLoadingEnvironment(false);
      }
    };

    fetchAcespecData();
    fetchEnvironmentData();
  }, [result.deck_code]);
    */
  }

  {
    /*
  useEffect(() => {
    if (!result.deck_code || !environment || !environment.id) {
      setLoadingDeckType(false);
      return;
    }

    setLoadingDeckType(true);

    const fetchDeckTypeData = async () => {
      try {
        setLoadingDeckType(true);
        const data = await fetchDeckType(result.deck_code, environment.id);
        setDeckType(data);
      } catch (err) {
        console.log(err);
        setErrorDeckType(
          `デッキタイプのデータ取得に失敗しました(デッキコード: ${result.deck_code}, 環境ID: ${environment.id})`,
        );
      } finally {
        setLoadingDeckType(false);
      }
    };

    fetchDeckTypeData();
  }, [result.deck_code, environment]);
  */
  }

  const getRankLabel = (rank: number, withMedal: boolean) => {
    switch (rank) {
      case 1:
        return withMedal ? "🥇 優勝" : "優勝";
      case 2:
        return withMedal ? "🥈 準優勝" : "準優勝";
      case 3:
        return withMedal ? "🥉 ベスト4" : "ベスト4";
      case 5:
        return "ベスト8";
      case 9:
        return "ベスト16";
      default:
        return "";
    }
  };

  const getBorderColor = (rank: number) => {
    switch (rank) {
      case 1:
        // ダークモードでは淡色背景に白文字が埋もれるため、背景を暗いトーンに切り替える
        return "border-amber-400 bg-amber-50 dark:bg-amber-900/30";
      case 2:
        return "border-default-400 bg-default-100";
      case 3:
        return "border-orange-700 bg-orange-100 dark:bg-orange-900/30";
      case 5:
        return "border-blue-500 bg-blue-50 dark:bg-blue-900/30";
      //return "border-green-500 bg-green-50 dark:bg-green-900/30";
      default:
        return "";
    }
  };

  // 順位バッジの塗り色。絵文字メダルに加え、背景色でも順位を区別できるようにする。
  const getRankBadgeClass = (rank: number) => {
    switch (rank) {
      case 1:
        return "bg-amber-400 text-amber-950";
      case 2:
        return "bg-zinc-300 text-zinc-800";
      case 3:
        return "bg-orange-400 text-orange-950";
      case 5:
        return "bg-blue-500 text-white";
      case 9:
        return "bg-emerald-500 text-white";
      default:
        return "bg-default-200 text-default-700";
    }
  };

  return (
    <>
      <CreateDeckModal
        deck_code={result.deck_code}
        isOpen={isOpenForCreateDeckModal}
        onOpenChange={onOpenChangeForCreateDeckModal}
        onCreated={() => {}}
      />

      <div
        onClick={() => {
          onOpen();
        }}
        className="cursor-pointer transition-transform active:scale-[0.98]"
      >
        <Card
          shadow="sm"
          className={`w-full border-2 border-default-100 transition-shadow hover:shadow-md ${getBorderColor(result.rank)}`}
        >
          {/* ヘッダー：順位タグの右隣にプレイヤー情報を並べる。
              個別ページ(showRankLabel=false)ではタグを出さず、プレイヤー情報のみ左詰めにする。 */}
          <CardHeader className="flex items-center gap-2 px-3 pt-3 pb-0">
            {showRankLabel && getRankLabel(result.rank, true) && (
              <div
                className={`inline-flex shrink-0 items-center gap-1 rounded-full px-3 py-1 text-sm font-bold shadow-sm ${getRankBadgeClass(
                  result.rank,
                )}`}
              >
                {getRankLabel(result.rank, true)}
              </div>
            )}

            {/* プレイヤー情報：モーダルと色言語を揃え、アイコンは primary 系にする */}
            <div className="flex min-w-0 items-center gap-2">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/15">
                <LuUser className="text-sm text-primary" />
              </div>
              <div className="flex min-w-0 flex-col">
                <span className="truncate text-sm font-bold leading-tight">
                  {result.player_name}
                </span>
                <span className="truncate text-tiny text-default-500 leading-tight">
                  ID: {result.player_id}
                </span>
              </div>
            </div>
          </CardHeader>
          <CardBody className="px-3 pb-3 pt-2">
            {/* デッキ画像を主役として大きく見せる */}
            {result.deck_code ? (
              // カード内ではタップで詳細モーダルを開くため、画像タップのZoomは無効化する
              <ZoomableDeckImage code={result.deck_code} disableZoom />
            ) : (
              <div className="relative w-full aspect-2/1">
                {!imageLoaded && (
                  <Skeleton className="absolute inset-0 rounded-lg" />
                )}
                <Image
                  radius="sm"
                  shadow="none"
                  alt="デッキコードなし"
                  src={"https://www.pokemon-card.com/deck/deckView.php/deckID/"}
                  className=""
                  onLoad={() => setImageLoaded(true)}
                />
              </div>
            )}
          </CardBody>
        </Card>
      </div>

      <Modal
        isOpen={isOpen}
        size={"md"}
        placement="center"
        onOpenChange={onOpenChange}
        classNames={{
          base: "sm:max-w-full",
          closeButton: "text-xl",
        }}
      >
        <ModalContent>
          {() => (
            <>
              {/* 右上は他モーダルと揃えて閉じるボタン(HeroUI標準)に統一する。
                  デッキ登録はフッターの明示的なボタンへ移設した。 */}
              <ModalHeader className="p-3 pb-0">
                {/* 順位表示は一覧カードと同じ塗り色バッジで統一する */}
                {getRankLabel(result.rank, true) && (
                  <div
                    className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm font-bold shadow-sm ${getRankBadgeClass(
                      result.rank,
                    )}`}
                  >
                    {getRankLabel(result.rank, true)}
                  </div>
                )}
              </ModalHeader>
              <ModalBody className="p-3 gap-3">
                {/* プレイヤー情報：見出しの下に埋もれないよう、アイコン付きの
                    目立つカードで表示する */}
                <div className="flex items-center gap-3 rounded-xl border border-primary/20 bg-linear-to-r from-primary/10 to-primary/5 px-4 py-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/15">
                    <LuUser className="text-xl text-primary" />
                  </div>
                  <div className="flex min-w-0 flex-col">
                    <span className="truncate text-base font-bold">
                      {result.player_name}
                    </span>
                    <span className="text-tiny text-default-500">
                      ID: {result.player_id}
                    </span>
                  </div>
                </div>

                {/* ボード：記録情報モーダルと同じ「デッキ情報」パネルデザインでまとめる。
                    デッキ画像・デッキコード欄・カードリストのアコーディオンを、
                    記録側(UsedDeckCard)と同じ gap-2.5 で縦に並べる。 */}
                <Card shadow="sm" className="w-full overflow-hidden">
                  <CardBody className="p-0">
                    <BoardPanel icon={<LuLayers />} label="デッキ情報">
                      <div className="flex flex-col gap-2.5">
                        {result.deck_code ? (
                          <>
                            {/* デッキ画像の表示・タップ全画面表示は共通コンポーネントに委譲する */}
                            <ZoomableDeckImage code={result.deck_code} />

                            {/* デッキコード欄：記録側 DeckCodeCard と同じデザイン */}
                            <div className="flex min-w-0 items-center justify-center gap-2 rounded-lg bg-default-100 px-3 py-2">
                              <span className="shrink-0 text-tiny text-default-500">
                                デッキコード
                              </span>
                              <Snippet
                                size="sm"
                                radius="none"
                                timeout={3000}
                                disableTooltip={true}
                                hideSymbol={true}
                                classNames={{
                                  base: "min-w-0 bg-transparent p-0",
                                  pre: "truncate",
                                }}
                              >
                                {result.deck_code}
                              </Snippet>
                            </div>

                            {/* カード内訳：展開でカードリストを見られるアコーディオン */}
                            <CardListAccordion code={result.deck_code} />

                            {/* 公式サイトでこのデッキコードから新しいデッキコードを作成 */}
                            <div>
                              <Link
                                isExternal
                                showAnchorIcon
                                underline="always"
                                href={`https://www.pokemon-card.com/deck/deck.html?deckID=${result.deck_code}`}
                                className="text-tiny"
                              >
                                [{result.deck_code}] から新しいデッキコードを作成
                              </Link>
                            </div>
                          </>
                        ) : (
                          <div className="relative w-full aspect-2/1">
                            {!imageLoaded && (
                              <Skeleton className="absolute inset-0 rounded-lg" />
                            )}
                            <Image
                              radius="sm"
                              shadow="none"
                              alt="デッキコードなし"
                              src={
                                "https://www.pokemon-card.com/deck/deckView.php/deckID/"
                              }
                              className=""
                              onLoad={() => setImageLoaded(true)}
                            />
                          </div>
                        )}
                      </div>
                    </BoardPanel>
                  </CardBody>
                </Card>
              </ModalBody>
              {/* 廃止したヘッダー右上のデッキ登録機能を、
                  会員かつデッキコードがあるときだけ明示的なボタンとして配置する */}
              {status === "authenticated" && result.deck_code && (
                <ModalFooter className="pt-0">
                  <Button
                    fullWidth
                    color="primary"
                    variant="flat"
                    startContent={<LuLayers className="text-lg" />}
                    onPress={onOpenForCreateDeckModal}
                    className="font-bold"
                  >
                    このデッキコードでデッキを登録
                  </Button>
                </ModalFooter>
              )}
            </>
          )}
        </ModalContent>
      </Modal>
    </>
  );
}
