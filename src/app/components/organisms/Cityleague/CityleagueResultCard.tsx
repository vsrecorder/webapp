"use client";

import { useSession } from "next-auth/react";

import { useCallback, useEffect, useRef, useState } from "react";

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
import DeckArchetypeLabel from "@app/components/molecules/DeckArchetypeLabel";
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
import { DeckArchetypeType } from "@app/types/deck_archetype";
import { DeckSummaryType } from "@app/types/deckcard";
import {
  cityleagueRankBadgeClass,
  cityleagueRankBorderClass,
  cityleagueRankLabel,
} from "@app/utils/cityleagueRank";
import { CITYLEAGUE_CARD_IMAGE_WIDTH_CLASS } from "@app/utils/cityleagueCardImage";
import { deckArchetypeToDeckDraft } from "@app/utils/deckArchetype";
import { formatMainPokemon } from "@app/utils/deckSummary";

type Props = {
  // point を含まない最小の形で受ける。大型大会(championsleague_results)の入賞も
  // 同じカードで描画するため。
  result: ResultCardEntry;
  date: Date;
  // 個別ページのように順位ごとの見出しがある場所では、カード側のラベルが冗長になるため隠す。
  showRankLabel?: boolean;
  // デッキのカード内訳の要約(サーバ側で取得済み)。渡されたときだけ主なポケモンを出す。
  deckSummary?: DeckSummaryType;
  /*
   * デッキの種類(バトラボのデッキ分類)。渡されたときだけ種類の行を出す。
   *
   * 未分類(索引にあるがどの主デッキにも当たらない)は label が null で渡ってきて「デッキ名：不明」と出る。
   * 索引に無い(未取り込み・2027 シーズンより前)デッキは渡されず、行ごと出ない。
   */
  deckArchetype?: DeckArchetypeType;
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
    <div className="relative w-full aspect-2/1 overflow-hidden rounded-lg">
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
  deckArchetype,
}: Props) {
  const { isOpen, onOpen, onOpenChange } = useDisclosure();

  const {
    isOpen: isOpenForCreateDeckModal,
    onOpen: onOpenForCreateDeckModal,
    onOpenChange: onOpenChangeForCreateDeckModal,
  } = useDisclosure();

  const { status } = useSession();

  /*
   * 詳細モーダルのデッキ画像を、カードの画像と同じ幅で出すための実測値。
   *
   * モーダルは開いた場所によらず自分の余白(ModalBody p-3 + パネル px-4)で幅が決まるため、
   * カードの画像とは一致しない(390px 幅の実測: 一覧のカード 330px・個別ページのカード 346px に対して
   * モーダルは 326px。PC の個別ページではカード 385px に対してモーダルは全幅の 1176px)。
   * 余白を固定で合わせても一覧と個別ページの両方には合わないので、開く瞬間にカードの画像幅を
   * 測ってモーダルへ渡し、その幅で中央に置く。開いている間に画面の幅が変わったら測り直す。
   *
   * カードの画像はモーダルの内側を超えないよう抑えてある(CITYLEAGUE_CARD_IMAGE_WIDTH_CLASS)ので、
   * 測った幅はパネルの余白(px-4)を削らずにそのまま入る。
   */
  const cardImageRef = useRef<HTMLDivElement>(null);
  const [modalImageWidth, setModalImageWidth] = useState<number | null>(null);

  /*
   * 幅は offsetWidth(レイアウト上の幅)で測る。getBoundingClientRect は変形後の見た目の幅を返すため、
   * カードの押下中の縮小(active:scale-[0.98])を拾ってしまい、マウスで押すとモーダルの画像が
   * 2% 狭くなっていた(PC の実測で 385px → 379px)。offsetWidth は整数だが、差は 1px 未満。
   */
  const measureCardImage = () => {
    const width = cardImageRef.current?.offsetWidth ?? 0;
    setModalImageWidth(width > 0 ? width : null);
  };

  useEffect(() => {
    if (!isOpen) return;

    window.addEventListener("resize", measureCardImage);

    return () => window.removeEventListener("resize", measureCardImage);
  }, [isOpen]);

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
        console.error(err);
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
        console.error(err);
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
        console.error(err);
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

  // 画像の alt。デッキコードだけでは何の画像か伝わらないため、順位・選手・デッキの種類を入れる。
  // 種類はルールで決めた名前(「ドラパルトex バシャーモ型」)を優先し、無ければ主なポケモン。
  const rankText = cityleagueRankLabel(result.rank, false) || `${result.rank}位`;
  const deckName = deckArchetype?.label ?? mainPokemon;
  const deckImageAlt =
    `${rankText} ${result.player_name}選手のデッキ` +
    (deckName ? `（${deckName}）` : "") +
    ` デッキコード ${result.deck_code}`;

  // 「このデッキコードでデッキを登録」の初期値。分類が付いていれば、主デッキ名(型名は含めない)と
  // アイコンを入れた状態で登録モーダルを開く(みんなの公開デッキの「取り込む」と同じ。登録前に変えられる)
  const deckDraft = deckArchetypeToDeckDraft(deckArchetype);

  return (
    <>
      <CreateDeckModal
        deck_code={result.deck_code}
        initialName={deckDraft.name}
        initialSprites={deckDraft.sprites}
        isOpen={isOpenForCreateDeckModal}
        onOpenChange={onOpenChangeForCreateDeckModal}
        onCreated={() => {}}
      />

      <div
        onClick={() => {
          measureCardImage();
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
                {/* デッキの種類(バトラボのデッキ分類)。デッキ一覧のギャラリー表示と同じく、
                    スプライトを上・名前を下に置いて画像の上に載せる。画像との間は pb-1(4px)で、
                    モーダルとも同じ間隔にしてある。骨格(CityleagueResultCardSkeleton)と揃えているので、
                    変えるときは両方直すこと */}
                {deckArchetype && (
                  <div className="pb-1">
                    <DeckArchetypeLabel archetype={deckArchetype} />
                  </div>
                )}
                {/* カード内ではタップで詳細モーダルを開くため、画像タップのZoomは無効化する。
                    包む div は、モーダルの画像をこの画像と同じ幅にするための計測点 */}
                <div ref={cardImageRef} className={CITYLEAGUE_CARD_IMAGE_WIDTH_CLASS}>
                  <ZoomableDeckImage
                    loading="lazy"
                    code={result.deck_code}
                    alt={deckImageAlt}
                    disableZoom
                  />
                </div>
                {/* デッキの中身は CDN の画像で文字では追えないため、主なポケモンとデッキコードを
                    テキストでも出す。カードリストはカードには置かず、タップで開く詳細モーダルで見せる */}
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
              </>
            ) : (
              <>
                {/* 画像の幅はデッキコードがあるカードと同じ上限にする(同じ大会の中で高さが揃うように) */}
                <div className={CITYLEAGUE_CARD_IMAGE_WIDTH_CLASS}>
                  <NoDeckCodeImage />
                </div>
                {/* カードの高さはデッキコードがあるカードに揃える(一覧で1枚だけ短いと目立つ)。
                    「主なポケモン」「デッキコード」の2行は同じ指定の行を見えない状態で置いて
                    高さを決め、その中央に「デッキコードなし」を重ねる。台紙の画像だけだと
                    読み込み失敗と見分けがつかないため、文字でも明示している */}
                <div className="grid">
                  <div
                    aria-hidden="true"
                    className="invisible col-start-1 row-start-1 flex flex-col text-center text-tiny"
                  >
                    <span className="pt-1.5 font-bold">主なポケモン</span>
                    <span className="pt-0.5">デッキコード</span>
                  </div>
                  <span className="col-start-1 row-start-1 self-center pt-1.5 text-center text-tiny text-default-400">
                    デッキコードなし
                  </span>
                </div>
              </>
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
                {/* プレイヤー情報：アイコン・名前・ID を 1 行に詰める。主役はデッキ情報なので、
                    ここは縦を取らない(以前は名前と ID の 2 行で 66px あった) */}
                <div className="flex items-center gap-2 rounded-xl border border-primary/20 bg-linear-to-r from-primary/10 to-primary/5 px-3 py-1.5">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/15">
                    <LuUser className="text-sm text-primary" />
                  </div>
                  <span className="min-w-0 truncate text-sm font-bold">{result.player_name}</span>
                  <span className="ml-auto shrink-0 text-tiny text-default-500">
                    ID: {result.player_id}
                  </span>
                </div>

                {/* ボード：記録情報モーダルと同じ「デッキ情報」パネルデザインでまとめる。
                    デッキ画像・デッキコード欄・カードリストのアコーディオンを、
                    記録側(UsedDeckCard)と同じ gap-2.5 で縦に並べる。 */}
                <Card shadow="sm" className="w-full overflow-hidden">
                  <CardBody className="p-0">
                    <BoardPanel icon={<LuLayers />} label="デッキ情報">
                      {/* 中身(種類・画像・デッキコード欄・カードリスト・リンク)は 1 本の列にまとめて
                          同じ幅にする(modalImageWidth)。画像だけ幅を変えると、下のデッキコード欄や
                          カードリストと端が揃わず見た目がばらつく。カードの画像はモーダルの内側に収まる幅に
                          抑えてあるので、max-w-full は測り違えたときの保険。測れていなければ内側いっぱい */}
                      <div
                        className="mx-auto flex w-full max-w-full flex-col gap-2.5"
                        style={modalImageWidth ? { width: modalImageWidth } : undefined}
                      >
                        {result.deck_code ? (
                          <>
                            {/* デッキの種類。カードと同じ形(スプライトの下に名前)で画像の上に置く。
                                列の gap-2.5(10px)を -mb-1.5 で打ち消し、画像との間をカードと同じ 4px にする */}
                            {deckArchetype && (
                              <div className="-mb-1.5">
                                <DeckArchetypeLabel archetype={deckArchetype} />
                              </div>
                            )}

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
                          <>
                            <NoDeckCodeImage />
                            <span className="text-center text-tiny text-default-400">
                              デッキコードなし
                            </span>
                          </>
                        )}
                      </div>
                    </BoardPanel>
                  </CardBody>
                </Card>
              </ModalBody>
              {/* 廃止したヘッダー右上のデッキ登録機能を、
                  会員かつデッキコードがあるときだけ明示的なボタンとして配置する */}
              {status === "authenticated" && result.deck_code && (
                /* 左右の余白は ModalBody(p-3)と同じにして、ボタンの幅を上のトレーナー情報・
                   デッキ情報のカードと揃える(フッター既定の px-6 だと左右 12px ずつ狭くなる) */
                <ModalFooter className="px-3 pt-0">
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
