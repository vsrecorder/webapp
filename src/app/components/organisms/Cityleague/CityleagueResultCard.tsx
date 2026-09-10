"use client";

import { useSession } from "next-auth/react";

import { useCallback, useState } from "react";

import { Card, CardHeader, CardBody } from "@heroui/react";
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
import CardListAccordion from "@app/components/organisms/Deck/CardListAccordion";
import CopyableDeckCode from "@app/components/atoms/CopyableDeckCode";
import ZoomableDeckImage from "@app/components/atoms/ZoomableDeckImage";

/*
 * デッキ画像は loading="lazy"。
 *
 * 一覧(/cityleague_results)は結果カードを 20 枚超まとめて描き、各カードが外部 CDN の
 * デッキ画像を持つ。素の <img> は HTML の解析と同時に全部要求されるため、本番ビルド・
 * CPU 4x・4Mbps の実測(2026-09-08)では 24 枚が 4 秒以内に流れて帯域を占め、ページ固有の
 * JS 13 本の取得開始が 3.9 秒まで押し出されていた(ハイドレーション完了 5.3 秒。
 * 他ページは 1.7〜2.0 秒)。画面に近いカードだけ先に読み、残りはスクロールに合わせる。
 *
 * カードのマウント時に new Image() でデッキ画像を先読みする useEffect も置いていたが、
 * それだと並んだカードぶんが即座に飛んで lazy が打ち消される(実測 2026-09-08: 一覧の
 * 初回リクエストが 42 本。外すと画面内の 10 本で収まる)。先読みは足さないこと。
 */
import BoardPanel from "@app/components/organisms/Record/BoardPanel";

import { createLazyModal } from "@app/utils/lazyModal";

import { ResultCardEntry } from "@app/types/cityleague_result";
import { DeckSummaryType } from "@app/types/deckcard";
import {
  cityleagueRankBadgeClass,
  cityleagueRankBorderClass,
  cityleagueRankLabel,
} from "@app/utils/cityleagueRank";
import { formatMainPokemon } from "@app/utils/deckSummary";

type Props = {
  // point を含まない最小の形で受ける。大型大会(championsleague_results)の入賞も
  // 同じカードで描画するため。
  result: ResultCardEntry;
  date: Date;
  // 個別ページのように順位ごとの見出しがある場所では、カード側のラベルが冗長になるため隠す。
  showRankLabel?: boolean;
  // デッキのカード内訳の要約(サーバ側で取得済み)。渡されたときだけ主なポケモンとカードリストを出す。
  deckSummary?: DeckSummaryType;
};


/*
 * デッキ登録モーダルは開くまで読まない(仕組みと理由は createLazyModal を参照)。
 *
 * 静的に import していると、結果カードを出す大会結果のページだけでなく、規約ページのような
 * デッキ機能と無関係なページの初期JSにまで載っていた(本番の実測で 6KB gzip。共有チャンクへ
 * 入っていたため全ページで読まれていた)。あわせて、開いてもいないモーダルのツリーが
 * 結果カードの枚数ぶんマウントされるのも避けられる。
 */
const CreateDeckModal = createLazyModal(
  () => import("@app/components/organisms/Deck/Modal/CreateDeckModal"),
);

// デッキコードを持たない結果で出す「空のデッキ台紙」。公式のデッキ画像URLは deckID が
// 空でもデッキ画像と同じ寸法(1024×512)の台紙を返すので、それをそのまま置く。
const NO_DECK_CODE_IMAGE_URL = "https://www.pokemon-card.com/deck/deckView.php/deckID/";

/*
 * デッキコードなしのときのデッキ画像。枠と読み込み中の見せ方は、デッキコードがあるときに
 * 使う ZoomableDeckImage に揃えてある。
 *
 * HeroUI の <Image> は使わない。あちらは表示用の <img> とは別に detached な new Image() を
 * 作って読み込みを監視し、完了するまで表示用の <img> を opacity-0 で伏せる作りになっている。
 * detached な要素の loading="lazy" は交差判定が永久に来ず読み込みが始まらないため、
 * 表示用の <img> が読み終わっても伏せられたままスケルトンが残り続ける。
 */
function NoDeckCodeImage() {
  const [loaded, setLoaded] = useState(false);

  /*
   * 画像がブラウザのキャッシュにあると、React が onLoad を張る前に読み込みが終わってしまい、
   * その後 load が飛ばないことがある。要素が挿さった時点で読み込み済みかどうかも見る。
   */
  const imageRef = useCallback((img: HTMLImageElement | null) => {
    if (img?.complete && img.naturalWidth > 0) setLoaded(true);
  }, []);

  return (
    /* 角丸は枠側で持つ。骨格と画像がそれぞれ角丸を持つと、半径の差ぶんだけ
      骨格が画像を覆いきれず、四隅から下の画像の白い角が弧になって覗く
      (ZoomableDeckImage と同じ理由) */
    <div className="relative w-full aspect-2/1 overflow-hidden rounded-md">
      {!loaded && <Skeleton className="absolute inset-0" />}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        ref={imageRef}
        alt="デッキコードなし"
        src={NO_DECK_CODE_IMAGE_URL}
        loading="lazy"
        onLoad={() => setLoaded(true)}
        // 読み終わるまで伏せる(ZoomableDeckImage と同じ理由。骨格の下で画像だけが
        // 先に描かれると、角丸の縁から白い角が滲む)
        className={`h-full w-full object-cover ${loaded ? "" : "opacity-0"}`}
      />
    </div>
  );
}

export default function CityleagueResultCard({
  result,
  showRankLabel = true,
  deckSummary,
}: Props) {
  const { isOpen, onOpen, onOpenChange } = useDisclosure();

  const {
    isOpen: isOpenForCreateDeckModal,
    onOpen: onOpenForCreateDeckModal,
    onOpenChange: onOpenChangeForCreateDeckModal,
  } = useDisclosure();

  const { status } = useSession();

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
                  loading="lazy"
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
              <NoDeckCodeImage />
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
                            <ZoomableDeckImage code={result.deck_code} loading="lazy" />

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
                          <NoDeckCodeImage />
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
