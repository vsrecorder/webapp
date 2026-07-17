"use client";

import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import type { Dispatch, SetStateAction, RefObject } from "react";

import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  Button,
  Switch,
  Textarea,
  Spinner,
  addToast,
} from "@heroui/react";

import { LuImageOff, LuRefreshCw, LuShare2, LuTriangleAlert } from "react-icons/lu";

import RecordHero from "@app/components/organisms/Record/Hero/RecordHero";
import Matches from "@app/components/organisms/Match/Matches";

import {
  captureThemedPng,
  hasUnloadedImages,
  SIDE_PADDING,
} from "@app/utils/captureImage";
import {
  shareRecord,
  saveImages,
  dataUrlToFile,
  type ShareImage,
} from "@app/utils/saveImage";

import { buildRecordPostText, formatEventDateLabel } from "@app/utils/recordPostText";
import { getEventVenueLabel } from "@app/components/organisms/Record/officialEventHelpers";

import { RecordGetByIdResponseType } from "@app/types/record";
import { MatchGetResponseType } from "@app/types/match";
import { OfficialEventGetByIdResponseType } from "@app/types/official_event";
import { TonamelEventGetByIdResponseType } from "@app/types/tonamel_event";
import { UnofficialEventGetByIdResponseType } from "@app/types/unofficial_event";
import { DeckGetByIdResponseType } from "@app/types/deck";
import { MatchStats } from "@app/utils/matchStats";

type Props = {
  record: RecordGetByIdResponseType;
  setRecord: Dispatch<SetStateAction<RecordGetByIdResponseType | null>>;
  stats: MatchStats;
  // 戦績パネルで貢献度(裏面)を表示中か。画面と同じ面をシェア画像にも写すために受け取る
  showSynergy?: boolean;
  matches: MatchGetResponseType[] | null;
  officialEvent: OfficialEventGetByIdResponseType | null;
  tonamelEvent: TonamelEventGetByIdResponseType | null;
  unofficialEvent: UnofficialEventGetByIdResponseType | null;
  deck: DeckGetByIdResponseType | null;
  // ボードの「デッキコード」パネルの実DOM。デッキ画像(2枚目)のキャプチャに使う。
  deckCardRef: RefObject<HTMLDivElement | null>;
  isOpen: boolean;
  onOpenChange: () => void;
  onClose: () => void;
};

// 画面外の対戦一覧では並び替え等の更新は起きないため、setMatches は何もしない。
const noopSetMatches: Dispatch<SetStateAction<MatchGetResponseType[] | null>> = () => {};

// トグルを押してから画像の生成を始めるまでの待ち時間(ms)。
// 画像の生成は端末のメインスレッドを長く占有するため、押した直後に走らせると
// スイッチのアニメーションやスクロールがそのぶん止まる。まず操作の描画を通し、
// 続けて複数のトグルを操作したときは最後の1回だけ生成するために待つ。
const CAPTURE_DEBOUNCE_MS = 250;

// モーダルを開いてからキャプチャ用DOMを描画するまでの待ち時間(ms)。
// 開くアニメーションの最中に画面外の戦績カード(＋対戦一覧)を描画すると、
// その重さがそのまま開く動きのカクつきになるため、動き終わってから描画する。
const CAPTURE_MOUNT_DELAY_MS = 400;

// 撮り終えた戦績画像を、条件の組み合わせごとに取っておく上限枚数。
// トグルを戻したときに撮り直さずに済むが、書き出し画像は1枚でも数MBあるため
// 端末のメモリを圧迫しないよう上限を設け、古いものから捨てる。
// 組み合わせは「使用デッキ × 会場 × 戦績パネルの表裏」で最大8通りだが、
// 実際に行き来するのは直近の数通りなので、この枚数で撮り直しはほぼ無くなる。
const RESULT_CACHE_LIMIT = 4;

// 戦績画像の中身を決めるオプションの組み合わせ。これが同じなら同じ画像になる
type ResultCacheEntry = { image: ShareImage; incomplete: boolean };

/*
 * 記録のシェア用モーダル。
 * 画面外に「戦績サマリー＋対戦結果」をレンダリングして1枚目の画像を生成し、
 * 「使用デッキを表示する」「会場を表示する」OFFのときはその要素の描画を省く
 * (会場はポスト文からも省く)。
 * 「使用デッキの画像も一緒にシェア」ONのときはデッキコードパネルを2枚目として追加する。
 * 生成した画像をポスト文とともに Web Share API で共有する。
 */
export default function ShareRecordModal({
  record,
  setRecord,
  stats,
  showSynergy = false,
  matches,
  officialEvent,
  tonamelEvent,
  unofficialEvent,
  deck,
  deckCardRef,
  isOpen,
  onOpenChange,
  onClose,
}: Props) {
  const shareContentRef = useRef<HTMLDivElement>(null);
  // 撮り終えた戦績画像の置き場。同じ条件の組み合わせを撮り直さないために使う
  const resultCacheRef = useRef<Map<string, ResultCacheEntry>>(new Map());
  // 生成済みのデッキ画像がどの条件(幅:世代)で撮られたか。使い回せるかの判定に使う
  const deckKeyRef = useRef<string | null>(null);
  // 生成中に条件が変わった/モーダルを閉じた場合に、後から終わった古い生成結果で
  // 上書きしてしまわないための世代番号。自分が最新かを確認してから反映する。
  const resultSeq = useRef(0);
  const deckSeq = useRef(0);
  // キャプチャ対象(戦績カード)の幅。書き出し画像の横幅が端末の画面幅いっぱいに
  // なるよう、端末の画面幅から左右余白(SIDE_PADDING * 2)を引いた値を使う。
  //   最終画像の横幅 = captureWidth + SIDE_PADDING * 2 = 端末の画面幅
  // SSR時はwindowを参照できないため従来の360で初期化し、モーダルを開いたときに
  // クライアント側で実際の画面幅から算出する。極端な幅を避けるためクランプする。
  const [captureWidth, setCaptureWidth] = useState(360);
  const [includeDeck, setIncludeDeck] = useState(false);
  // 1枚目の戦績画像に使用デッキを描画するか(既定は表示)
  const [showDeck, setShowDeck] = useState(true);
  // 公式イベントの会場(店舗名)を戦績画像・ポスト文に載せるか。
  // 会場を知られたくない場合に伏せられるようにする(既定は従来どおり表示)。
  const [showVenue, setShowVenue] = useState(true);
  // ポスト文に含める要素(対戦結果・使用デッキ)
  const [includePostMatches, setIncludePostMatches] = useState(true);
  const [includePostDeck, setIncludePostDeck] = useState(true);
  // 実行中の処理種別。処理中はローディング表示とモーダルのクローズ抑止に使う
  const [busy, setBusy] = useState<null | "share">(null);
  const [text, setText] = useState("");

  // キャプチャ用の RecordHero がイベント・使用デッキを描画し終えたか。
  // 描画完了(＋対戦一覧の取得完了)までシェア/保存を無効化し、
  // スケルトン状態のまま画像が生成されるのを防ぐ。
  const [heroReady, setHeroReady] = useState(false);
  // シェア用に生成済みの画像。タップ前に用意しておく(理由は生成用の useEffect を参照)。
  //
  // 1枚目(戦績)と2枚目(デッキ)は作り直しの要る条件が別々のため、別々に持ち、別々に生成する。
  // 1つの配列にまとめて一度に生成すると、片方のトグルを触っただけで両方を撮り直すことになる。
  // 画像の生成は端末では非常に重く(iOSは1枚につき描画を3周する)、その撮り直しが
  // そのまま操作のカクつきになるため、変わった方だけを撮る。
  const [resultImage, setResultImage] = useState<ShareImage | null>(null);
  const [deckImage, setDeckImage] = useState<ShareImage | null>(null);
  // 生成した画像にスプライト等の欠けがあるか(読み込めなかった画像が残っていたか)。
  // 欠けは画像を見なくても判定できるため、黙ってシェアさせずに知らせる。
  const [resultIncomplete, setResultIncomplete] = useState(false);
  const [deckIncomplete, setDeckIncomplete] = useState(false);
  // それぞれの画像を生成中か。生成中も古いプレビューは残す(消すと枠の高さが変わり、
  // トグルを押すたびにモーダルの中身が飛び跳ねてしまうため)。
  const [capturingResult, setCapturingResult] = useState(false);
  const [capturingDeck, setCapturingDeck] = useState(false);
  // 画像の生成そのものに失敗したか。1枚目・2枚目それぞれで持つ。
  // まとめて1つで持つと、片方の失敗を他方の生成が「成功」で消してしまい、
  // 失敗した画像が無いまま失敗の表示も消えて、シェアできない状態から抜け出せなくなる。
  // 失敗を伝えるだけだと手詰まりになるため、作り直すか、ポスト文だけでシェアするかを選べるようにする。
  const [resultFailed, setResultFailed] = useState(false);
  const [deckFailed, setDeckFailed] = useState(false);
  const captureFailed = resultFailed || deckFailed;
  // 「再生成」を押したときに生成用の useEffect を走らせ直すための世代番号
  const [regenSeq, setRegenSeq] = useState(0);
  // キャプチャ用DOMを描画してよいか(開くアニメーションが終わるまで待つ)
  const [captureMounted, setCaptureMounted] = useState(false);

  const capturing = capturingResult || capturingDeck;

  // 初回の戦績画像ができるまでは、画像に関わるオプションを変更させない。
  // 待っている間に条件を変えられると、その都度キャプチャを撮り直すことになり、
  // 最初の1枚がいつまでも出てこない(＝いつまでもシェアできない)ため。
  // 生成に失敗した場合も解除する(そのままだと「作り直す」以外に何もできなくなる)。
  const optionsDisabled = resultImage === null && !captureFailed;

  // スイッチの見た目(showDeck/showVenue)と、それを反映した重い描画を切り離す。
  //
  // トグルを押すと画面外の戦績カード(＋対戦一覧)を丸ごと描き直すことになる。
  // これをスイッチの状態更新と同じ描画で行うと、その重さがアニメーションの
  // フレームを奪い、スイッチがカクッと飛ぶ。
  // 画像に関わる値だけを遅らせ、スイッチを先に動かしてから画面外を描き直させる。
  const deferredShowDeck = useDeferredValue(showDeck);
  const deferredShowVenue = useDeferredValue(showVenue);
  // 遅らせた描画がまだ追いついていない(＝画面外の戦績カードが操作前のままの)状態。
  // この間の画像は操作前の内容なので、シェアさせない。
  const optionsPending = showDeck !== deferredShowDeck || showVenue !== deferredShowVenue;

  // 戦績画像の中身を決めるオプションの組み合わせ。これが同じなら撮り直す必要はない。
  // 実際に画面外へ描かれている(＝これから撮る)内容と一致させるため、遅らせた値で作る。
  const resultVariantKey = `${deferredShowDeck ? 1 : 0}:${deferredShowVenue ? 1 : 0}:${
    showSynergy ? 1 : 0
  }`;

  // 実際に共有する画像。デッキ画像は「一緒にシェア」ONのときだけ2枚目として付ける。
  // ONにした直後はまだ生成できていないことがあるため、その間は canShare 側で止める。
  const images = useMemo(() => {
    if (!resultImage) return null;
    return includeDeck && deckImage ? [resultImage, deckImage] : [resultImage];
  }, [resultImage, deckImage, includeDeck]);
  const imagesIncomplete =
    resultIncomplete || (includeDeck && deckImage !== null && deckIncomplete);

  // 画像が用意できたときに加えて、生成に失敗したとき(=ポスト文だけでシェアする)も許可する。
  // 生成中は、途中の(古い)画像を共有してしまわないよう止める。
  // デッキ画像は、生成に失敗したときも「待ち」から抜けさせる(待ち続けても永久に揃わない)。
  const deckImageReady = !includeDeck || deckImage !== null || deckFailed;
  const canShare =
    heroReady &&
    matches !== null &&
    !capturing &&
    !optionsPending &&
    ((images !== null && deckImageReady) || captureFailed);
  // 会場の表示トグルは、伏せる会場がある(＝公式イベントで会場名を持つ)記録でだけ意味を持つ
  const venueLabel = officialEvent ? getEventVenueLabel(officialEvent) : "";

  // モーダルを閉じるとキャプチャ用 DOM は破棄されるため、次に開いたときは
  // 再度描画完了を待つよう準備状態をリセットする。
  // あわせて生成済み画像も捨てる(次に開いたとき古い画像を共有してしまわないよう)。
  // オプション(トグル)も既定値に戻し、次に開いたときは前回の操作を引きずらず
  // 既定の生成内容から始まるようにする。ポスト文は下の組み立て用 useEffect が
  // isOpen の変化で再生成するため、ここでは触らない(手編集も破棄される)。
  useEffect(() => {
    if (!isOpen) {
      setHeroReady(false);
      setResultImage(null);
      setDeckImage(null);
      setResultIncomplete(false);
      setDeckIncomplete(false);
      setCapturingResult(false);
      setCapturingDeck(false);
      // 取っておいた画像は次に開いたときには使わない(記録の内容が変わっている
      // 可能性があり、古い画像を共有してしまう)。メモリも抱えたままにしない。
      resultCacheRef.current.clear();
      deckKeyRef.current = null;
      // 生成中に閉じた場合、後から終わった生成結果が状態を書き戻し、次に開いたとき
      // 古い画像が残ってしまう。世代を進めて、その結果を捨てさせる。
      resultSeq.current++;
      deckSeq.current++;
      setResultFailed(false);
      setDeckFailed(false);
      setIncludeDeck(false);
      setShowDeck(true);
      setShowVenue(true);
      setIncludePostMatches(true);
      setIncludePostDeck(true);
    }
  }, [isOpen]);

  // キャプチャ用DOMは、開くアニメーションが終わってから描画する。
  // アニメーション中に描画すると、その重さで開く動きがカクつく。
  useEffect(() => {
    if (!isOpen) {
      setCaptureMounted(false);
      return;
    }
    const timer = setTimeout(() => setCaptureMounted(true), CAPTURE_MOUNT_DELAY_MS);
    return () => clearTimeout(timer);
  }, [isOpen]);

  // モーダルを開いたら、書き出し画像の横幅が端末の画面幅いっぱいになるよう
  // キャプチャ対象の幅を算出する。画面が狭すぎ/PCなどで広すぎる場合に備えクランプする。
  useEffect(() => {
    if (!isOpen) return;
    const target = Math.round(window.innerWidth) - SIDE_PADDING * 2;
    setCaptureWidth(Math.max(320, Math.min(target, 480)));
  }, [isOpen]);

  // 取得済みデータ・オプションが変わったらポスト文を組み立て直す
  // (この時点でユーザーの手編集は上書きされる)
  // モーダルを開いたときも必ず組み立て直すため isOpen も依存に含める。これにより
  // 前回開いたときの手編集を引きずらず、常に既定のポスト文から始められる。
  useEffect(() => {
    if (!isOpen) return;

    // 開催日は戦績カードと同じ順で解決する(自由形式は unofficial_events.date へ落ちる)
    const dateLabel = formatEventDateLabel(
      record.event_date,
      record.created_at,
      unofficialEvent?.date,
    );
    setText(
      buildRecordPostText(
        dateLabel,
        officialEvent,
        tonamelEvent,
        unofficialEvent,
        deck,
        matches,
        {
          includeMatches: includePostMatches,
          includeDeck: includePostDeck,
          includeVenue: showVenue,
        },
      ) + "\n#バトレコ",
    );
  }, [
    isOpen,
    record.event_date,
    record.created_at,
    officialEvent,
    tonamelEvent,
    unofficialEvent,
    deck,
    matches,
    includePostMatches,
    includePostDeck,
    showVenue,
  ]);

  // 上部バーのフリックでモーダルを閉じる(記録情報モーダルと同じ挙動)。
  // ただしシェア/保存の処理中(busy)は閉じさせない。
  const startY = useRef<number | null>(null);
  const handleTouchStart = (e: React.TouchEvent) => {
    if (busy !== null) return;
    startY.current = e.touches[0].clientY;
  };
  const handleTouchMove = (e: React.TouchEvent) => {
    if (busy !== null || startY.current === null) return;
    if (e.touches[0].clientY - startY.current > 30) {
      startY.current = null;
      onClose();
    }
  };

  // シェア画像は「シェアする」をタップする前に生成しておく。
  //
  // iOS(WebKit)の navigator.share() は、タップから数秒(transient activation)の間に
  // 呼ばないと NotAllowedError で失敗する。タップハンドラ内で画像を生成すると、
  // とくに2枚目(デッキ画像)を追加したときに生成が猶予を超え、共有が必ず失敗していた。
  // そこでモーダルを開いた時点・オプション変更時に生成しておき、タップ時は
  // 生成済みの File を渡して即座に navigator.share() を呼ぶ。
  //
  // 生成中に条件が変わった場合、後から終わった古い生成結果で上書きしないよう
  // 世代番号(seq)で自分が最新かを確認してから反映する。
  // 撮る幅・世代(作り直す)、あるいは記録そのもの(対戦一覧を含む)が変わると、
  // オプションの組み合わせが同じでも中身は変わる。取っておいた画像は使えなくなるため
  // 捨てる。捨て損ねると、古い内容の画像をそのまま共有してしまう。
  // (撮り直しの useEffect より前に置き、同じ変更で先に捨ててから撮らせる)
  useEffect(() => {
    resultCacheRef.current.clear();
  }, [captureWidth, regenSeq, record, matches]);

  // 1枚目(戦績画像)。中身を変えるオプションが変わったときだけ撮り直す。
  useEffect(() => {
    if (!isOpen || !captureMounted || !heroReady || matches === null) return;

    // 同じ組み合わせで撮った画像があればそのまま使う。撮り直しは端末では非常に重く、
    // トグルを戻すたびに数秒待たされることになるため。
    const cached = resultCacheRef.current.get(resultVariantKey);
    if (cached) {
      // 生成中のものがあれば、その結果で使い回した画像を上書きさせない
      resultSeq.current++;
      setResultImage(cached.image);
      setResultIncomplete(cached.incomplete);
      setResultFailed(false);
      setCapturingResult(false);
      return;
    }

    const seq = ++resultSeq.current;
    setResultFailed(false);
    // 待っている間も「生成中」にしておく。ここで立てないと、待ちの間だけ
    // 撮り直す前の画像でシェアできてしまう。
    setCapturingResult(true);

    // すぐには撮らず、操作の描画を先に通す(CAPTURE_DEBOUNCE_MS の理由を参照)
    let started = false;
    const timer = setTimeout(async () => {
      started = true;
      const el = shareContentRef.current;
      if (!el) {
        // 撮る対象が無ければ画像は作れない。待ちのまま止まらないよう失敗として扱う。
        setResultFailed(true);
        setCapturingResult(false);
        return;
      }

      try {
        const dataUrl = await captureThemedPng(el, { targetWidth: captureWidth });
        // 書き出し後に読み込めていない画像が残っていれば、その画像には欠けがある。
        // captureThemedPng が待ちと再試行を終えた後に判定する。
        const incomplete = hasUnloadedImages(el);
        const filename = `${record.id}_result_${Date.now()}.png`;
        const file = await dataUrlToFile(dataUrl, filename);

        if (seq !== resultSeq.current) return;

        // 次に同じ組み合わせへ戻したときに撮り直さずに済むよう取っておく。
        // 上限を超えたぶんは、最も古いもの(Mapは挿入順)から捨てる。
        const image = { dataUrl, filename, file };
        const cache = resultCacheRef.current;
        cache.set(resultVariantKey, { image, incomplete });
        while (cache.size > RESULT_CACHE_LIMIT) {
          const oldest = cache.keys().next().value;
          if (oldest === undefined) break;
          cache.delete(oldest);
        }

        setResultImage(image);
        setResultIncomplete(incomplete);
      } catch (e) {
        console.error(e);
        if (seq !== resultSeq.current) return;
        // 失敗はプレビュー欄に出し続ける(トーストは消えてしまい、
        // 何が起きたのか分からないまま準備中の表示だけが残ってしまうため)。
        setResultFailed(true);
      } finally {
        if (seq === resultSeq.current) setCapturingResult(false);
      }
    }, CAPTURE_DEBOUNCE_MS);

    return () => {
      clearTimeout(timer);
      // 待っている間に条件が変わり、この予約が取り消された場合は生成中を解く。
      // (解かないと、条件が「生成しない」側へ変わったときに生成中のまま残る)
      // 走り出していた場合は、世代番号で最新の生成が状態を持つため触らない。
      if (!started) setCapturingResult(false);
    };
  }, [
    isOpen,
    captureMounted,
    heroReady,
    matches,
    resultVariantKey,
    captureWidth,
    record.id,
    regenSeq,
  ]);

  // 2枚目(デッキ画像)。中身は撮る幅と「作り直す」以外では変わらないため、
  // 一度撮ったものを使い回す。これで「一緒にシェア」の入切に生成が要らなくなる。
  useEffect(() => {
    if (!isOpen || !includeDeck) return;

    // 生成済みのデッキ画像がそのまま使えるか(幅・世代が同じなら使える)
    const key = `${captureWidth}:${regenSeq}`;
    if (deckKeyRef.current === key) return;

    const seq = ++deckSeq.current;
    setDeckFailed(false);
    // 待っている間も「生成中」にする(理由は1枚目と同じ)
    setCapturingDeck(true);

    let started = false;
    const timer = setTimeout(async () => {
      started = true;
      const el = deckCardRef.current;
      if (!el) {
        // デッキパネルの実DOMが無ければ2枚目は作れない。黙って1枚だけ共有すると
        // 「一緒にシェア」がONなのにデッキ画像が付かないため、失敗として扱う。
        setDeckFailed(true);
        setCapturingDeck(false);
        return;
      }

      try {
        // 2枚目(デッキ画像)も端末幅に合わせて、1枚目と同じ横幅で書き出す
        const dataUrl = await captureThemedPng(el, { targetWidth: captureWidth });
        const incomplete = hasUnloadedImages(el);
        const filename = `${record.id}_deck_${Date.now()}.png`;
        const file = await dataUrlToFile(dataUrl, filename);

        if (seq !== deckSeq.current) return;
        deckKeyRef.current = key;
        setDeckImage({ dataUrl, filename, file });
        setDeckIncomplete(incomplete);
      } catch (e) {
        console.error(e);
        if (seq !== deckSeq.current) return;
        setDeckFailed(true);
      } finally {
        if (seq === deckSeq.current) setCapturingDeck(false);
      }
    }, CAPTURE_DEBOUNCE_MS);

    return () => {
      clearTimeout(timer);
      // 「一緒にシェア」を待ちの間にOFFへ戻した場合など(理由は1枚目と同じ)
      if (!started) setCapturingDeck(false);
    };
  }, [isOpen, includeDeck, captureWidth, record.id, deckCardRef, regenSeq]);

  /*
   * キャプチャ用の画面外DOM。戦績サマリー＋使用デッキ＋対戦結果を1枚のカードに統合して画像にする。
   *
   * 画像の中身に関わる値が変わったときだけ作り直す。ここを毎回作り直すと、
   * ポスト文の入力1文字ごと・プレビューの差し替えごとに、画面外の戦績カードと
   * 対戦一覧まで描き直すことになり、そのぶん操作の描画が遅れる。
   */
  const captureNode = useMemo(
    () => (
      <div className="pointer-events-none fixed left-[-10000px] top-0" aria-hidden="true">
        <div ref={shareContentRef} style={{ width: captureWidth }}>
          <RecordHero
            record={record}
            setRecord={setRecord}
            stats={stats}
            // 画面の戦績パネルと同じ面(勝率 / 貢献度)を撮る。
            // onToggleSynergy は渡さない(キャプチャ用のパネルはタップさせない)
            showSynergy={showSynergy}
            hideDeck={!deferredShowDeck}
            hideVenue={!deferredShowVenue}
            onReadyChange={setHeroReady}
            matchesSlot={
              <Matches
                record={record}
                matches={matches}
                setMatches={noopSetMatches}
                loading={false}
                enableCreateMatchModalButton={false}
                enableUpdateMatchModalButton={false}
                flat
              />
            }
          />
        </div>
      </div>
    ),
    [
      record,
      setRecord,
      stats,
      showSynergy,
      deferredShowDeck,
      deferredShowVenue,
      matches,
      captureWidth,
    ],
  );

  // 注意: navigator.share() の呼び出し前に await を挟むとユーザーアクティベーションが
  // 切れるため、この関数内では shareRecord() の前で await しないこと。
  const handleShare = async () => {
    if (!canShare) return;
    setBusy("share");
    try {
      // 画像の生成に失敗した場合は画像を渡さない。shareRecord はその場合
      // ポスト文だけの共有にフォールバックする(ボタンの表記もそうなっている)。
      const shareImages = captureFailed ? [] : (images ?? []);
      const result = await shareRecord(shareImages, text);
      if (result === "unsupported") {
        if (shareImages.length === 0) {
          // 共有非対応かつ保存する画像も無いため、ポスト文を手で使ってもらうほかない
          addToast({
            title: "共有に非対応の環境です",
            description: "ポスト文はコピーしてご利用ください",
            color: "warning",
            timeout: 5000,
          });
        } else {
          // 共有非対応の環境では画像を保存にフォールバック。
          // デッキ画像(2枚目)も取り逃さないよう、生成した画像をすべて渡す。
          await saveImages(shareImages);
          addToast({
            title: "共有に非対応のため画像を保存しました",
            description: "ポスト文はコピーしてご利用ください",
            color: "warning",
            timeout: 5000,
          });
        }
      } else if (result === "text-only" && shareImages.length > 0) {
        // テキストと画像を一緒に共有できない環境。ポスト文だけが共有シートへ渡り、
        // 画像は黙って落ちてしまうため、保存にフォールバックしたうえで知らせる。
        // (画像が無い場合は、生成に失敗した記録をポスト文だけで共有した場合であり、
        //  ボタンの表記どおりの結果なので何も知らせない)
        await saveImages(shareImages);
        addToast({
          title: "画像を一緒に共有できない環境です",
          description: "ポスト文のみ共有し、画像は保存しました",
          color: "warning",
          timeout: 5000,
        });
      } else if (result === "failed") {
        addToast({ title: "共有に失敗しました", color: "danger", timeout: 5000 });
      }
    } catch (e) {
      console.error(e);
      addToast({ title: "共有に失敗しました", color: "danger", timeout: 5000 });
    } finally {
      setBusy(null);
    }
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        // シェア/保存の処理中(busy)は閉じさせない
        onOpenChange={() => {
          if (busy !== null) return;
          onOpenChange();
        }}
        placement="bottom"
        hideCloseButton
        isDismissable={false}
        scrollBehavior="inside"
        className="h-[calc(100dvh-104px)] max-h-[calc(100dvh-104px)] mt-26 my-0 rounded-b-none sm:max-w-full lg:max-w-lg"
      >
        <ModalContent>
          {() => (
            <>
              <ModalHeader
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                className="flex cursor-grab touch-none flex-col gap-1 px-4 pb-3 pt-3"
              >
                <div className="mx-auto mb-1 h-1 w-32 rounded-full bg-default-300" />
                <div className="flex items-center gap-2">
                  <LuShare2 className="text-primary" />
                  シェア
                </div>
              </ModalHeader>
              <ModalBody className="gap-5 px-4 pb-6">
                <p className="text-tiny text-default-500">
                  記録の戦績を画像にして、ポスト文と一緒にシェアできます。
                </p>

                {/* シェアに載せる内容のトグル。伏せられるもの(会場・使用デッキ)が
                    ある場合のみ出す。文言は「ONで載せる」に揃える(否定形が混ざると
                    スイッチの向きと意味の対応が行ごとに反転し、読み違えるため)。 */}
                {(venueLabel || record.deck_id) && (
                  <div className="flex flex-col gap-2.5">
                    {/* 初回の画像ができるまで変更できないことを、グループの先頭で1回だけ知らせる。
                        各行に同じ理由を並べると読みづらいだけなので、まとめて示す。 */}
                    {optionsDisabled && (
                      <div className="flex items-center gap-2.5 rounded-xl border border-divider bg-content2 px-3 py-2.5">
                        <Spinner size="sm" className="shrink-0" />
                        <div
                          role="status"
                          className="min-w-0 flex-1 text-[11px] leading-relaxed text-default-500"
                        >
                          画像を生成しています。
                          <br />
                          完了するまでオプションは変更できません。
                        </div>
                      </div>
                    )}

                    {/* 会場(店舗名)。戦績画像・ポスト文の両方に効く */}
                    {venueLabel && (
                      <div
                        className={`flex items-center gap-3 rounded-xl border border-divider bg-content2 px-3 py-2.5 ${
                          optionsDisabled ? "opacity-50" : ""
                        }`}
                      >
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-default-200 text-lg">
                          📍
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-bold">会場を表示する</div>
                          <div className="text-[11px] text-default-400">
                            戦績画像とポスト文に会場を表示します
                          </div>
                        </div>
                        <Switch
                          size="sm"
                          isSelected={showVenue}
                          isDisabled={optionsDisabled}
                          onValueChange={setShowVenue}
                          aria-label="会場を表示する"
                        />
                      </div>
                    )}

                    {record.deck_id && (
                      <>
                        {/* 1枚目の戦績画像に使用デッキを描画する */}
                        <div
                          className={`flex items-center gap-3 rounded-xl border border-divider bg-content2 px-3 py-2.5 ${
                            optionsDisabled ? "opacity-50" : ""
                          }`}
                        >
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-default-200 text-lg">
                            🎴
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="text-sm font-bold">使用デッキを表示する</div>
                            <div className="text-[11px] text-default-400">
                              戦績画像に使用デッキを表示します
                            </div>
                          </div>
                          <Switch
                            size="sm"
                            isSelected={showDeck}
                            isDisabled={optionsDisabled}
                            // 使用デッキを伏せるなら、2枚目のデッキ画像も一緒に取り下げる
                            // (デッキ画像を出しては伏せた意味が無くなるため)
                            onValueChange={(v) => {
                              setShowDeck(v);
                              if (!v) setIncludeDeck(false);
                            }}
                            aria-label="使用デッキを表示する"
                          />
                        </div>

                        {/* 2枚目としてデッキ画像を追加する。
                            使用デッキを伏せている間は選べない(伏せたデッキの画像を
                            2枚目で出せてしまうと矛盾するため)。 */}
                        <div
                          className={`flex items-center gap-3 rounded-xl border border-divider bg-content2 px-3 py-2.5 ${
                            showDeck && !optionsDisabled ? "" : "opacity-50"
                          }`}
                        >
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-lg">
                            🖼️
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="text-sm font-bold">
                              使用デッキの画像も一緒にシェア
                            </div>
                            <div className="text-[11px] text-default-400">
                              {showDeck
                                ? "デッキ画像を2枚目として追加します"
                                : "使用デッキを表示するとONにできます"}
                            </div>
                          </div>
                          <Switch
                            size="sm"
                            isSelected={includeDeck}
                            isDisabled={!showDeck || optionsDisabled}
                            onValueChange={setIncludeDeck}
                            aria-label="使用デッキの画像も一緒にシェア"
                          />
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* ポスト文に含める要素の切り替え */}
                <div className="flex flex-col rounded-xl border border-divider bg-content2 px-3">
                  <div className="flex items-center gap-2 py-2.5">
                    <span className="flex-1 text-sm">対戦結果をポストに含める</span>
                    <Switch
                      size="sm"
                      isSelected={includePostMatches}
                      onValueChange={setIncludePostMatches}
                      aria-label="対戦結果をポストに含める"
                    />
                  </div>
                  {record.deck_id && (
                    <>
                      <div className="h-px bg-divider" />
                      <div className="flex items-center gap-2 py-2.5">
                        <span className="flex-1 text-sm">使用デッキをポストに含める</span>
                        <Switch
                          size="sm"
                          isSelected={includePostDeck}
                          onValueChange={setIncludePostDeck}
                          aria-label="使用デッキをポストに含める"
                        />
                      </div>
                    </>
                  )}
                </div>

                {/* iOSでは<textarea>の既定のoverflowがautoのため、モーダルのスクロール抑止
                    (react-ariaのpreventScrollMobileSafari)が「テキストエリア自身がスクロール
                    可能」と誤判定し、内容が収まっていてもtouchmoveをpreventDefaultしてしまう。
                    結果、テキストエリアの上で指を動かしてもモーダルがスクロールしなくなる。
                    overflowを持たせず内容の高さまで伸ばし、スクロールはモーダル本体に任せる。 */}
                <Textarea
                  label="ポスト文"
                  value={text}
                  onValueChange={setText}
                  minRows={5}
                  // 内容を隠さない(＝テキストエリア内スクロールを発生させない)ための上限
                  maxRows={999}
                  classNames={{ input: "text-sm overflow-hidden" }}
                />

                {/* シェアされる画像のプレビュー。
                    実際に共有される生成済み画像(images)をそのまま表示する。
                    オプション(使用デッキの表示/追加)を変えると再生成され、ここも追従する。
                    生成が終わるまで(images===null)はスピナーを出す。 */}
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold">プレビュー</span>
                    {images && images.length > 1 && (
                      <span className="rounded-full bg-default-200 px-2 py-0.5 text-[11px] text-default-500">
                        {images.length}枚
                      </span>
                    )}
                  </div>

                  {/* 画像に欠けがある場合の注意書き。
                      シェア自体は止めない(欠けても記録の内容は正しく、止めると
                      共有する手段が無くなるため)。気づけるようにしたうえで、
                      作り直すか、このままシェアするかは利用者に委ねる。 */}
                  {images !== null && imagesIncomplete && (
                    <div className="flex items-center gap-2.5 rounded-xl border border-warning-200 bg-warning-50 px-3 py-2.5">
                      <LuTriangleAlert className="h-4 w-4 shrink-0 text-warning-600" />
                      <div
                        role="alert"
                        className="min-w-0 flex-1 text-[11px] leading-relaxed text-warning-700"
                      >
                        画像を読み込めなかったため、ポケモンのアイコンが欠けています
                      </div>
                      <Button
                        size="sm"
                        variant="flat"
                        color="warning"
                        className="shrink-0"
                        startContent={<LuRefreshCw className="h-3 w-3" />}
                        onPress={() => setRegenSeq((n) => n + 1)}
                      >
                        再生成
                      </Button>
                    </div>
                  )}

                  {captureFailed ? (
                    // 生成に失敗したまま準備中の表示を続けると、待てば直るのか分からず
                    // 手詰まりになる。何が起きたかを示し、作り直す手段を置く。
                    // (ポスト文だけのシェアは下のボタンから行える)
                    <div className="flex h-56 flex-col items-center justify-center gap-3 rounded-xl border border-divider bg-content2 px-4">
                      <LuImageOff className="h-6 w-6 text-default-400" />
                      <p
                        role="alert"
                        className="text-center text-[11px] text-default-500"
                      >
                        画像を生成できませんでした
                        <br />
                        作り直すか、ポスト文だけでシェアできます
                      </p>
                      <Button
                        size="sm"
                        variant="flat"
                        startContent={<LuRefreshCw className="h-3 w-3" />}
                        onPress={() => setRegenSeq((n) => n + 1)}
                      >
                        作り直す
                      </Button>
                    </div>
                  ) : images === null || images.length === 0 ? (
                    // 生成中は枠内にスピナーを表示(画像の縦横比は不定なので固定高さの枠にする)
                    <div className="flex h-56 flex-col items-center justify-center gap-2 rounded-xl border border-divider bg-content2">
                      <Spinner size="sm" />
                      <span className="text-[11px] text-default-400">
                        画像を生成しています
                      </span>
                    </div>
                  ) : (
                    // 複数枚(戦績＋デッキ)のときは縦に並べて表示する。
                    // 撮り直している間も直前の画像を残したまま、上に重ねて知らせる。
                    // 消してしまうと枠の高さが変わり、トグルを押すたびに中身が飛び跳ねる。
                    <div className="relative flex flex-col gap-3">
                      {images.map((img) => (
                        // 実際の書き出し画像。プレビューなので枠幅に収めて縮小表示する。
                        // h-auto で本来の縦横比を保ち、引き伸ばしを防ぐ。
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          key={img.filename}
                          src={img.dataUrl}
                          alt="シェア画像のプレビュー"
                          // 大きな画像のデコードでスクロールが止まらないようにする
                          decoding="async"
                          className="h-auto w-full rounded-xl border border-divider bg-content2"
                        />
                      ))}
                      {capturing && (
                        <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-content1/60">
                          <Spinner size="sm" />
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-2">
                  {/* 画像の準備が終わるまでは「シェアする」ボタン上に準備中を表示し、
                      スピナー付きで無効化する(準備完了までシェアさせない)。 */}
                  <Button
                    color="primary"
                    size="lg"
                    startContent={busy !== "share" && canShare && <LuShare2 />}
                    isLoading={busy === "share" || !canShare}
                    isDisabled={busy !== null || !canShare}
                    onPress={handleShare}
                  >
                    {captureFailed
                      ? "テキストだけでシェア"
                      : canShare
                        ? "シェアする"
                        : "画像を準備しています"}
                  </Button>
                </div>
              </ModalBody>
            </>
          )}
        </ModalContent>
      </Modal>

      {/* キャプチャ用の画面外DOM。戦績サマリー＋使用デッキ＋対戦結果を1枚のカードに統合して画像にする。
          開くアニメーションが終わってから描画する(CAPTURE_MOUNT_DELAY_MS の理由を参照) */}
      {isOpen && captureMounted && captureNode}
    </>
  );
}
