"use client";

import { useSession } from "next-auth/react";

import { useEffect, useState } from "react";

import { Card, CardHeader, CardBody } from "@heroui/react";
import { Image } from "@heroui/react";
import { Skeleton } from "@heroui/react";
import { Button } from "@heroui/react";
import { Link } from "@heroui/react";

import {
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  useDisclosure,
} from "@heroui/react";

import { LuLayers } from "react-icons/lu";
import { LuUser } from "react-icons/lu";

import { Modal } from "@app/components/atoms/AppModal";
import CreateDeckModal from "@app/components/organisms/Deck/Modal/CreateDeckModal";
import CardListAccordion from "@app/components/organisms/Deck/CardListAccordion";
import CopyableDeckCode from "@app/components/atoms/CopyableDeckCode";
import ZoomableDeckImage from "@app/components/atoms/ZoomableDeckImage";
import BoardPanel from "@app/components/organisms/Record/BoardPanel";

import { Result } from "@app/types/cityleague_result";
import { DeckSummaryType } from "@app/types/deckcard";
import {
  cityleagueRankBadgeClass,
  cityleagueRankBorderClass,
  cityleagueRankLabel,
} from "@app/utils/cityleagueRank";
import { formatMainPokemon } from "@app/utils/deckSummary";

type Props = {
  result: Result;
  date: Date;
  // 個別ページのように順位ごとの見出しがある場所では、カード側のラベルが冗長になるため隠す。
  showRankLabel?: boolean;
  // デッキのカード内訳の要約(サーバ側で取得済み)。渡されたときだけ主なポケモンとカードリストを出す。
  deckSummary?: DeckSummaryType;
};

export default function CityleagueResultCard({
  result,
  showRankLabel = true,
  deckSummary,
}: Props) {
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

  // 順位の見え方(ラベル・枠色・バッジ色)はトレーナー情報ページの「入賞したシティリーグ」
  // (PlayerCityleagueResults)と共通のため utils/cityleagueRank に集約している。
  const getRankLabel = cityleagueRankLabel;
  const getBorderColor = cityleagueRankBorderClass;
  const getRankBadgeClass = cityleagueRankBadgeClass;

  const mainPokemon = formatMainPokemon(deckSummary?.mainPokemon ?? []);

  // 画像の alt。デッキコードだけでは何の画像か伝わらないため、順位・選手・主なポケモンを入れる。
  const rankText = cityleagueRankLabel(result.rank, false) || `${result.rank}位`;
  const deckImageAlt =
    `${rankText} ${result.player_name}選手のデッキ` +
    (mainPokemon ? `（${mainPokemon}）` : "") +
    ` デッキコード ${result.deck_code}`;

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
              <>
                {/* カード内ではタップで詳細モーダルを開くため、画像タップのZoomは無効化する */}
                <ZoomableDeckImage
                  code={result.deck_code}
                  alt={deckImageAlt}
                  disableZoom
                />
                {/* デッキの中身は CDN の画像で文字では追えないため、主なポケモン・デッキコード・
                    カードリストをテキストでも出す。カードリストは閉じたままでも HTML に載るので、
                    検索エンジンはモーダルを開かずに「何のデッキか」を読める。 */}
                {mainPokemon && (
                  <span className="pt-1.5 text-center font-bold text-tiny text-default-600">
                    主なポケモン：{mainPokemon}
                  </span>
                )}
                <span
                  className={`${mainPokemon ? "pt-0.5" : "pt-1.5"} text-center text-tiny text-default-400`}
                >
                  デッキコード {result.deck_code}
                </span>
                {deckSummary && (
                  // 開閉のタップで親のモーダルが開かないよう伝播を止める
                  <details
                    className="mt-1.5 rounded-lg bg-default-100 px-3 py-1.5 text-tiny"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <summary className="cursor-pointer font-bold text-default-600">
                      カードリスト（{deckSummary.total}枚）
                    </summary>
                    <dl className="flex flex-col gap-1 pt-1.5 text-default-500">
                      {deckSummary.groups.map((group) => (
                        <div key={group.label}>
                          <dt className="inline font-bold text-default-600">
                            {group.label}（{group.count}）：
                          </dt>
                          <dd className="inline">
                            {group.cards
                              .map((card) => `${card.name} ×${card.count}`)
                              .join("、")}
                          </dd>
                        </div>
                      ))}
                      {deckSummary.aceSpec && (
                        <div>
                          <dt className="inline font-bold text-default-600">
                            ACE SPEC：
                          </dt>
                          <dd className="inline">{deckSummary.aceSpec}</dd>
                        </div>
                      )}
                    </dl>
                  </details>
                )}
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

                            {/* デッキコード欄：記録側 DeckCodeCard と同じ共通部品 */}
                            <CopyableDeckCode code={result.deck_code} />

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
