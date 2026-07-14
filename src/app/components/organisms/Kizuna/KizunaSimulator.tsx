"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { KeyboardEvent } from "react";

import { Button, Input, addToast } from "@heroui/react";

import { LuRotateCcw, LuShare2, LuDownload } from "react-icons/lu";

import KizunaSpritePicker from "@app/components/organisms/Kizuna/KizunaSpritePicker";
import type { SpriteSlot } from "@app/components/organisms/Kizuna/KizunaSpritePicker";
import KizunaShareCard from "@app/components/organisms/Kizuna/KizunaShareCard";

import { captureThemedPng, SIDE_PADDING } from "@app/utils/captureImage";
import {
  shareRecord,
  saveGeneratedImage,
  dataUrlToFile,
  type ShareImage,
} from "@app/utils/saveImage";

import { kizunaTierOf } from "@app/utils/kizuna";
import { smoothScrollTo } from "@app/utils/scroll";

import { useSetKizunaPreviewDeck } from "@app/components/organisms/Kizuna/KizunaPreviewContext";

import { PokemonSpriteType } from "@app/types/pokemon_sprite";

// 設問の重みは指標設計の重み付けをそのまま縮約したもの。
// 「負けても使い続けたか」を最大重みに置くことで、強いデッキを持つ人ほど
// 高得点になる（＝勝率の言い換えになる）のを防いでいる。
type Question = {
  id: string;
  metric: string;
  question: string;
  weight: number;
  options: string[];
};

const questions: Question[] = [
  {
    id: "loyalty",
    metric: "逆境ロイヤルティ",
    question: "負けが続いたとき、そのデッキをどうしましたか？",
    weight: 20,
    options: [
      "すぐに別のデッキへ持ち替えた",
      "しばらく休ませて、たまに戻した",
      "調整しながら、基本は使い続けた",
      "何があっても手放さなかった",
    ],
  },
  {
    id: "devotion",
    metric: "一途度",
    question: "同じ時期に、ほかに何個のデッキを持っていましたか？",
    weight: 15,
    options: [
      "環境に合わせて毎回変えていた",
      "4個以上を使い分けていた",
      "2〜3個を行き来していた",
      "ほぼこのデッキ一本だった",
    ],
  },
  {
    id: "care",
    metric: "手入れ度",
    question: "そのデッキを組み直した回数は？",
    weight: 15,
    options: [
      "登録してから、ほとんど触っていない",
      "数回、気になった枚数を入れ替えた",
      "何度も見直して調整してきた",
      "大会前夜に、数えきれないほど",
    ],
  },
  {
    id: "days",
    metric: "同行日数",
    question: "そのデッキと、どれくらい一緒にいますか？",
    weight: 12,
    options: ["1か月未満", "半年ほど", "1年ほど", "2年以上、レギュレーションを越えて"],
  },
  {
    id: "trust",
    metric: "託し度",
    question: "いちばん大事な大会に、そのデッキを持って行きましたか？",
    weight: 10,
    options: [
      "ジムバトルでだけ使っている",
      "トレーナーズリーグまで",
      "シティリーグに持ち込んだ",
      "決勝トーナメントまで一緒に戦った",
    ],
  },
];

const totalWeight = questions.reduce((sum, q) => sum + q.weight, 0);

// 結果カードの画像生成にかける上限時間。これを超えたら失敗として扱う。
const CAPTURE_TIMEOUT_MS = 15000;

// デッキ名の最大文字数。カード内で折り返さずに収まる範囲に留める。
const DECK_NAME_MAX_LENGTH = 24;

// 段階（0〜255の区切り）は実データ算出側と共通のものを使う（utils/kizuna.ts）

export default function KizunaSimulator() {
  // 1体目は必須、2体目は任意（1体だけが主役のデッキもあるため）
  const [sprite1, setSprite1] = useState<PokemonSpriteType | null>(null);
  const [sprite2, setSprite2] = useState<PokemonSpriteType | null>(null);
  const [deckName, setDeckName] = useState("");
  const [answers, setAnswers] = useState<Record<string, number>>({});

  // 回答するたびに次の設問（最後まで答えたら結果）へ送るための参照
  const questionRefs = useRef<(HTMLFieldSetElement | null)[]>([]);
  const resultRef = useRef<HTMLDivElement>(null);

  /*
   * スプライト選択をやり直させるための世代番号。key に渡してピッカーごと作り直す。
   *
   * KizunaSpritePicker は「いまどちらのスロットを選んでいるか」を内部に持ち、
   * 1体目を選んだ時点で2体目へ送っている。sprite1/sprite2 を null に戻すだけでは
   * その内部状態は 2体目のまま残り、リセット直後なのに2体目にフォーカスが当たる。
   */
  const [pickerGeneration, setPickerGeneration] = useState(0);

  // 2体目を選んだあとに送る先
  const deckNameRef = useRef<HTMLInputElement>(null);

  const sprites = useMemo(
    () => [sprite1, sprite2].filter((s): s is PokemonSpriteType => s !== null),
    [sprite1, sprite2],
  );

  const answeredCount = Object.keys(answers).length;
  const isComplete = sprite1 !== null && answeredCount === questions.length;
  const remaining = questions.length - answeredCount + (sprite1 ? 0 : 1);

  const handleSelectSprite = (slot: SpriteSlot, sprite: PokemonSpriteType | null) => {
    if (slot === 1) setSprite1(sprite);
    else setSprite2(sprite);

    // 2体目まで決まったら、次はデッキ名。入力欄まで送って、そのまま打ち始められるようにする。
    // （2体目を消したときは送らない。消してすぐキーボードが出るのは操作の邪魔になる）
    if (slot === 2 && sprite !== null) {
      requestAnimationFrame(() => {
        // 先にスクロールを済ませるため、focus 自体には移動させない
        deckNameRef.current?.focus({ preventScroll: true });
        smoothScrollTo(deckNameRef.current?.closest("[data-deck-name]") ?? null);
      });
    }
  };

  // デッキ名でEnterを押したら、Q1へ送る（デッキ名は任意なので、空のままでも進ませる）
  const handleDeckNameKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== "Enter") return;

    e.preventDefault();
    // モバイルではキーボードを引っ込めてから移動する
    deckNameRef.current?.blur();

    const firstQuestion = questionRefs.current[0];
    firstQuestion?.querySelector("button")?.focus({ preventScroll: true });
    smoothScrollTo(firstQuestion);
  };

  // カードに載せる呼び名。デッキ名があればそれを、なければポケモン名を並べる。
  const partnerLabel =
    deckName.trim() || sprites.map((sprite) => sprite.name).join("・") || "相棒デッキ";

  const score = useMemo(() => {
    if (answeredCount !== questions.length) return 0;

    const weighted = questions.reduce(
      (sum, q) => sum + q.weight * (answers[q.id] / (q.options.length - 1)),
      0,
    );

    return Math.round((weighted / totalWeight) * 255);
  }, [answers, answeredCount]);

  const tier = kizunaTierOf(score);

  /*
   * 下の「デッキ一覧では、こう見えます」プレビューに、選んだポケモンと試算結果を映す。
   * 質問式なので戦績（勝率・先攻率）は持てない。stats は null にして、
   * プレビュー側にサンプルの数字を借りさせる。
   * 全問答え終わるまでは null のまま（途中のスコアは試算結果ではない）。
   */
  const setPreviewDeck = useSetKizunaPreviewDeck();
  const sprite1Id = sprite1?.id;
  const sprite2Id = sprite2?.id;
  useEffect(() => {
    if (!isComplete) {
      setPreviewDeck(null);
      return;
    }

    setPreviewDeck({
      deckName: partnerLabel,
      spriteIds: [sprite1Id, sprite2Id].filter((id): id is string => !!id),
      kizunaLevel: score,
      registeredAt: null,
      stats: null,
    });
  }, [isComplete, partnerLabel, sprite1Id, sprite2Id, score, setPreviewDeck]);

  const shareText = [
    `${partnerLabel}とのきずなレベルは【${score} / 255】でした。`,
    "",
    `「${tier.name}」`,
    tier.message,
    "",
    "勝率では測れない、デッキとのきずなを数値化する",
    "バトレコの新機能「きずな」を試算しました👇",
    "https://vsrecorder.mobi/kizuna",
    "",
    "#バトレコ #ポケカ #きずなレベル",
  ].join("\n");

  // ── シェア画像の生成 ────────────────────────────────────────────
  // 画面外に結果カードを実寸で描画し、PNGに書き出しておく。
  //
  // iOS(WebKit)の navigator.share() は「タップ直後の数秒」に呼ばないと失敗するため、
  // タップハンドラ内で生成してはいけない。回答が揃った時点で先に作っておく。
  // （詳細は utils/saveImage.ts の shareRecord のコメントを参照）
  const shareCardRef = useRef<HTMLDivElement>(null);
  const [images, setImages] = useState<ShareImage[] | null>(null);
  const [busy, setBusy] = useState<null | "share" | "save">(null);
  // 画像の生成に失敗したか。スプライト画像の配信が一時的に落ちている場合などに起きる。
  // 失敗を検知できないと「画像を準備しています」のまま永久に押せないボタンが残るため、
  // 明示的に持ち、テキストのみのシェアへ退避できるようにする。
  const [captureFailed, setCaptureFailed] = useState(false);

  // 書き出し画像の横幅が端末の画面幅いっぱいになるようキャプチャ対象の幅を決める。
  // SSR時は window を参照できないため 360 で初期化する。
  const [captureWidth, setCaptureWidth] = useState(360);
  useEffect(() => {
    const target = Math.round(window.innerWidth) - SIDE_PADDING * 2;
    setCaptureWidth(Math.max(320, Math.min(target, 480)));
  }, []);

  // 生成中に条件が変わった場合、古い生成結果で上書きしないよう世代番号で確認する。
  const captureSeq = useRef(0);
  useEffect(() => {
    if (!isComplete) {
      setImages(null);
      setCaptureFailed(false);
      return;
    }

    const seq = ++captureSeq.current;
    setImages(null);
    setCaptureFailed(false);

    (async () => {
      try {
        if (!shareCardRef.current) return;

        // スプライト画像の取得が詰まると描画ライブラリが返ってこないことがあるため、
        // 上限時間を設けて失敗として扱う（ボタンが準備中のまま固まるのを防ぐ）。
        const dataUrl = await Promise.race([
          // このページは配色をダークに固定しているため、書き出しもダークで揃える
          captureThemedPng(shareCardRef.current, {
            targetWidth: captureWidth,
            theme: "dark",
          }),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error("capture timeout")), CAPTURE_TIMEOUT_MS),
          ),
        ]);

        const filename = `kizuna_${score}_${Date.now()}.png`;
        const image: ShareImage = {
          dataUrl,
          filename,
          file: await dataUrlToFile(dataUrl, filename),
        };

        if (seq !== captureSeq.current) return;
        setImages([image]);
      } catch (e) {
        console.error(e);
        if (seq !== captureSeq.current) return;
        setCaptureFailed(true);
      }
    })();
  }, [isComplete, score, sprites, deckName, captureWidth]);

  const canShare = isComplete && images !== null;

  // 画像なしでシェアするときの退避先。X のポスト画面をテキストだけで開く。
  const xIntentHref = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`;

  // 注意: navigator.share() の呼び出し前に await を挟むとユーザーアクティベーションが
  // 切れるため、この関数内では shareRecord() の前で await しないこと。
  const handleShare = async () => {
    if (!canShare || images === null || images.length === 0) return;

    setBusy("share");
    try {
      const result = await shareRecord(images, shareText);

      if (result === "unsupported") {
        // 共有非対応の環境（PCブラウザなど）では画像の保存にフォールバックする
        await saveGeneratedImage(images[0].dataUrl, images[0].filename);
        addToast({
          title: "共有に非対応のため画像を保存しました",
          description: "保存した画像を添えてポストしてください",
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

  const handleSave = async () => {
    if (!canShare || images === null || images.length === 0) return;

    setBusy("save");
    try {
      await saveGeneratedImage(images[0].dataUrl, images[0].filename);
    } catch (e) {
      console.error(e);
      addToast({ title: "画像の保存に失敗しました", color: "danger", timeout: 5000 });
    } finally {
      setBusy(null);
    }
  };

  const handleReset = () => {
    setSprite1(null);
    setSprite2(null);
    setDeckName("");
    setAnswers({});
    // ピッカーを作り直し、1体目を選ぶ状態から始めさせる
    setPickerGeneration((g) => g + 1);

    // 入力を消しただけだと、画面は結果のあった位置（ページ下部）に留まる。
    // 最初の設問まで連れ戻す。
    smoothScrollTo(document.getElementById("simulator"));
  };

  /*
   * 回答したら次の設問まで送る。設問はスクロールしないと見えない位置に続くため、
   * 押した場所に留まると「答えたのに何も起きない」ように見える。
   *
   * 送るのは「まだ答えていない次の設問」だけにする。既に答えた設問を選び直したときに
   * 画面が飛ぶと、答えを見比べて直すことができなくなるため。
   */
  const handleAnswer = (questionId: string, value: number, index: number) => {
    const next = { ...answers, [questionId]: value };
    setAnswers(next);

    const nextUnanswered = questions.findIndex(
      (q, i) => i > index && next[q.id] === undefined,
    );

    // 移動先は再描画のあとに決める。最後の1問に答えた直後は結果カードがまだDOMに無く、
    // このハンドラの時点では resultRef が null のため。
    requestAnimationFrame(() => {
      // 残りが無いなら、その先にあるのは結果
      const target =
        nextUnanswered === -1 ? resultRef.current : questionRefs.current[nextUnanswered];

      smoothScrollTo(target);
    });
  };

  return (
    <div className="flex flex-col gap-6 lg:gap-8">
      <div className="flex flex-col gap-5 lg:gap-7">
        {/* Q0：相棒にするポケモン（最大2体）とデッキ名 */}
        {/* min-w-0: <fieldset> はブラウザ既定で min-inline-size:min-content を持ち、
            中身より狭くなれない。長いポケモン名（例:「ウーラオス れんげきのかた・
            キョダイマックスのすがた」）を選ぶと truncate が効かず、ページ全体が
            横に広がってしまうため、明示的に解除する。 */}
        <fieldset className="flex min-w-0 flex-col gap-4">
          <legend className="flex flex-col gap-1 pb-1">
            <span className="text-[11px] font-bold tracking-widest text-amber-600 lg:text-xs dark:text-amber-400">
              Q0／相棒デッキ
            </span>
            <span className="text-base font-bold text-foreground lg:text-lg">
              いちばん長く使っているデッキの、主役はどのポケモンですか？
            </span>
            <span className="text-xs text-default-500">
              ポケモンは2体まで選べます。デッキ名を入れると、結果カードに表示されます。
            </span>
          </legend>

          <KizunaSpritePicker
            key={pickerGeneration}
            sprite1={sprite1}
            sprite2={sprite2}
            onSelect={handleSelectSprite}
          />

          {/* data-deck-name: 2体目を選んだあと、この位置まで送るための目印。
              scroll-mt-20 は固定ヘッダーの下に潜らせないため。 */}
          <div data-deck-name className="scroll-mt-20">
            {/* classNames.input の text-base(16px) は必須。
                iOS Safari はフォントサイズが16px未満の入力欄にフォーカスすると
                自動でページを拡大してしまうため、16px以上にして拡大を防ぐ。 */}
            <Input
              ref={deckNameRef}
              value={deckName}
              onValueChange={setDeckName}
              onKeyDown={handleDeckNameKeyDown}
              label="デッキ名（任意）"
              placeholder="リザードンex"
              maxLength={DECK_NAME_MAX_LENGTH}
              description={`${deckName.length} / ${DECK_NAME_MAX_LENGTH}文字（Enterで次へ）`}
              isClearable
              onClear={() => setDeckName("")}
              classNames={{ input: "text-base" }}
            />
          </div>
        </fieldset>

        {questions.map((q, index) => (
          <fieldset
            key={q.id}
            ref={(el) => {
              questionRefs.current[index] = el;
            }}
            className="flex min-w-0 scroll-mt-20 flex-col gap-3"
          >
            <legend className="flex flex-col gap-1 pb-1">
              <span className="text-[11px] font-bold tracking-widest text-amber-600 lg:text-xs dark:text-amber-400">
                Q{index + 1}／{q.metric}
              </span>
              <span className="text-base font-bold text-foreground lg:text-lg">
                {q.question}
              </span>
            </legend>

            <div className="grid gap-2 sm:grid-cols-2">
              {q.options.map((option, value) => {
                const isSelected = answers[q.id] === value;

                return (
                  <button
                    key={option}
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() => handleAnswer(q.id, value, index)}
                    className={`rounded-xl border px-4 py-3 text-left text-sm leading-relaxed transition-colors ${
                      isSelected
                        ? "border-amber-500 bg-amber-500/10 font-bold text-amber-700 dark:text-amber-300"
                        : "border-default-200 text-default-600 hover:border-amber-400 hover:bg-amber-500/5"
                    }`}
                  >
                    {option}
                  </button>
                );
              })}
            </div>
          </fieldset>
        ))}
      </div>

      {/* 結果：ポケモン（1体目）の選択と全設問の回答が揃ってから表示する。
          最後の設問に答えたら、この位置まで送る（残り問数の案内も同じ位置に出る）。 */}
      <div ref={resultRef} className="scroll-mt-20">
        {isComplete ? (
          <div className="flex flex-col gap-4">
            <KizunaShareCard
              sprites={sprites}
              deckName={deckName}
              score={score}
              tierName={tier.name}
              tierMessage={tier.message}
            />

            <p className="px-1 text-xs leading-relaxed text-default-500 lg:text-sm">
              これはあくまで試算です。本物のきずなレベルは、あなたが積み重ねた対戦記録から自動で算出されます。
              <br />
              算出方法は開発中のため、指標や重み付けは今後変更される可能性があります。
            </p>

            {captureFailed && (
              <p role="alert" className="px-1 text-xs text-danger lg:text-sm">
                画像の生成に失敗しました。テキストだけでシェアできます。
              </p>
            )}

            <div className="flex flex-col gap-3 sm:flex-row">
              {captureFailed ? (
                // 画像なしでも導線を絶やさない。X のポスト画面をテキストだけで開く。
                <Button
                  as="a"
                  href={xIntentHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  size="lg"
                  className="bg-amber-400 font-bold text-neutral-900"
                  startContent={<LuShare2 className="text-lg" />}
                >
                  テキストだけでシェア
                </Button>
              ) : (
                <Button
                  size="lg"
                  className="bg-amber-400 font-bold text-neutral-900"
                  startContent={
                    busy !== "share" && canShare && <LuShare2 className="text-lg" />
                  }
                  isLoading={busy === "share" || !canShare}
                  isDisabled={busy !== null || !canShare}
                  onPress={handleShare}
                >
                  {canShare ? "結果カードをシェア" : "画像を準備しています"}
                </Button>
              )}

              {!captureFailed && (
                <Button
                  size="lg"
                  variant="bordered"
                  className="font-bold"
                  startContent={<LuDownload className="text-lg" />}
                  isDisabled={busy !== null || !canShare}
                  isLoading={busy === "save"}
                  onPress={handleSave}
                >
                  画像を保存
                </Button>
              )}

              <Button
                size="lg"
                variant="light"
                className="font-bold text-default-500"
                startContent={<LuRotateCcw className="text-lg" />}
                isDisabled={busy !== null}
                onPress={handleReset}
              >
                もう一度試す
              </Button>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-default-200 px-6 py-8 text-center">
            <p className="text-sm text-default-500">
              あと{remaining}問に答えると、きずなレベルが表示されます。
            </p>
          </div>
        )}
      </div>

      {/* キャプチャ用の画面外DOM。画面のカードと同じコンポーネントを実寸で描画する */}
      {isComplete && (
        <div
          className="pointer-events-none fixed left-[-10000px] top-0"
          aria-hidden="true"
        >
          <div ref={shareCardRef} style={{ width: captureWidth }}>
            <KizunaShareCard
              sprites={sprites}
              deckName={deckName}
              score={score}
              tierName={tier.name}
              tierMessage={tier.message}
            />
          </div>
        </div>
      )}
    </div>
  );
}
