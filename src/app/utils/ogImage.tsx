import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { ImageResponse } from "next/og";

import { OfficialEventType } from "@app/types/official_event";
import { DeckCodePostType } from "@app/types/deck_code_post";
import { designationForTier } from "@app/utils/designationTier";
import { rankForTier } from "@app/utils/designationRank";
import { getSpriteBySlot } from "@app/utils/spriteSlot";
import { spriteImageUrl } from "@app/utils/sprite";
import { spriteFitBox } from "@app/utils/spriteFit";
import { deckImageUrl } from "@app/utils/deckImage";
import { isTrustedImageUrl } from "@app/utils/trustedImageUrl";
import { ChampionsleagueScheduleType } from "@app/types/championsleague_schedule";
import { deckNameFontSize } from "@app/utils/ogText";
import { CityleagueTerm, formatEventDate, formatTermRange } from "@app/utils/cityleague";

// OGP画像の規定サイズ。X(Twitter)の summary_large_image と Facebook の推奨に合わせる。
export const OG_SIZE = { width: 1200, height: 630 };

// 配色。背景は単色にしている。グラデーションにすると PNG の圧縮が効かず、
// 同じ絵柄でも 50KB → 344KB まで肥大するため。
const COLORS = {
  background: "#0f172a",
  text: "#ffffff",
  muted: "#cbd5e1",
  subtle: "#94a3b8",
  separator: "#475569",
  accent: "#fbbf24",
  chipText: "#93c5fd",
  chipBorder: "rgba(96,165,250,0.45)",
  chipBackground: "rgba(37,99,235,0.16)",
  rule: "rgba(148,163,184,0.25)",
};

type OgAssets = {
  fonts: {
    name: string;
    data: Buffer;
    weight: 400 | 700;
    style: "normal";
  }[];
  iconSrc: string;
  // スプライトが1体だけの投稿で、空いた枠に置くモンスターボール(白)。
  // 配信元(CDN)の unknown.png は黒のシルエットで、OGPの濃紺の背景では沈んで見えないため、
  // 色だけ反転した白版を同梱して使う(public/ogp-sprite-unknown.png)。
  unknownSpriteSrc: string;
};

// satori は TTF/OTF しか読めないため、可変フォントではなく静的インスタンスを置いている。
// 店舗名には任意の漢字が現れるため、グリフのサブセット化はできない。
let ogAssetsPromise: Promise<OgAssets> | null = null;

// フォント(約 11MB)と アイコンはプロセス内で1回だけ読む。みんなの公開デッキの投稿ごとに描画が走るため、
// 毎回ディスクから読み直すと個別ページの初回表示が遅くなる。
function loadOgAssets(): Promise<OgAssets> {
  if (!ogAssetsPromise) {
    ogAssetsPromise = readOgAssets().catch((error) => {
      ogAssetsPromise = null;
      throw error;
    });
  }

  return ogAssetsPromise;
}

async function readOgAssets(): Promise<OgAssets> {
  const [fontRegular, fontBold, icon, unknownSprite] = await Promise.all([
    readFile(join(process.cwd(), "assets", "fonts", "NotoSansJP-Regular.ttf")),
    readFile(join(process.cwd(), "assets", "fonts", "NotoSansJP-Bold.ttf")),
    readFile(join(process.cwd(), "public", "icon-512x512.png")),
    readFile(join(process.cwd(), "public", "ogp-sprite-unknown.png")),
  ]);

  return {
    fonts: [
      { name: "Noto Sans JP", data: fontRegular, weight: 400, style: "normal" },
      { name: "Noto Sans JP", data: fontBold, weight: 700, style: "normal" },
    ],
    iconSrc: `data:image/png;base64,${icon.toString("base64")}`,
    unknownSpriteSrc: `data:image/png;base64,${unknownSprite.toString("base64")}`,
  };
}

async function toPngBuffer(
  element: React.ReactElement,
  assets: OgAssets,
): Promise<Buffer> {
  const response = new ImageResponse(element, {
    ...OG_SIZE,
    fonts: assets.fonts,
  });

  return Buffer.from(await response.arrayBuffer());
}

function Chip({ children }: { children: string }) {
  return (
    <div
      style={{
        display: "flex",
        alignSelf: "flex-start",
        padding: "10px 22px",
        borderRadius: 999,
        border: `1px solid ${COLORS.chipBorder}`,
        backgroundColor: COLORS.chipBackground,
        fontSize: 24,
        fontWeight: 700,
        color: COLORS.chipText,
      }}
    >
      {children}
    </div>
  );
}

function Footer({ iconSrc }: { iconSrc: string }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 20,
        paddingTop: 24,
        borderTop: `1px solid ${COLORS.rule}`,
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={iconSrc} alt="" width={60} height={60} style={{ borderRadius: 14 }} />
      <div style={{ display: "flex", flexDirection: "column" }}>
        <div style={{ fontSize: 26, fontWeight: 700 }}>
          ポケカプレイヤーのための対戦記録サービス
        </div>
        <div style={{ fontSize: 22, color: COLORS.subtle }}>vsrecorder.mobi</div>
      </div>
    </div>
  );
}

// X(Twitter)はカード画像の下端にタイトルの黒帯を重ねて表示する。
// 実測では帯が画像高さの約14%(630px換算で約87px)を覆うため、下側だけ余白を厚くして
// フッター(ロゴ・サービス名・ドメイン)が帯に隠れないようにしている。
const X_CARD_OVERLAY_SAFE_AREA = 130;

// みんなの公開デッキのOGPで、スプライト1体に与える正方形の枠(px)。
// 枠自体は描かず、この大きさを基準にキャラを正規化して置く。
//
// タイムラインで最初に目に入るのはデッキのスプライトなので、OGPでも主役として大きく置く。
// 2体を少し重ねて並べ、占める横幅を抑えたまま1体ずつを大きくしている
// (正規化後のキャラは枠の中で上下に余白を持つため、重ねてもキャラ同士は重ならない)。
const OG_SPRITE_FRAME = 280;
// 2体目を左に食い込ませる量(px)。2体で 280×2−36 = 524px を占める。
const OG_SPRITE_OVERLAP = 36;
// スプライトが1体だけのときに2枠目へ出すプレースホルダ(白いモンスターボール)の枠の割合。
// キャラと同じ大きさで置くと「無い方」が主役に見えてしまうため、一回り小さくする。
const OG_UNKNOWN_FRAME_RATIO = 0.65;

// デッキ名を描く枠の幅。左の余白72から、右のスプライト(x=616 から)に掛からない 572 までに収める。
const OG_TITLE_WIDTH = 500;
// スプライトが無い投稿は右側を空けないため、左右の余白を除いた全幅を使う。
const OG_TITLE_WIDTH_FULL = 1056;
const OG_TITLE_FONT_MAX = 52;
const OG_TITLE_FONT_MAX_FULL = 64;

const canvasStyle = {
  width: "100%",
  height: "100%",
  display: "flex",
  flexDirection: "column" as const,
  justifyContent: "space-between" as const,
  padding: `60px 72px ${X_CARD_OVERLAY_SAFE_AREA}px`,
  backgroundColor: COLORS.background,
  color: COLORS.text,
};

/*
 * きずなページのOGP画像は satori 生成でもストレージ自動アップロードでもなく、
 * デザイン済みPNGをCDNに置いた現物を直接指している（kizuna/page.tsx）。
 * 原本は public/ogp-kizuna.png。
 */

// サイト共通のOGP画像。個別の画像を持たない全ページで使う。
export async function renderSiteOgImage(): Promise<Buffer> {
  const assets = await loadOgAssets();

  return toPngBuffer(
    <div style={{ ...canvasStyle, justifyContent: "center", gap: 28 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={assets.iconSrc}
          alt=""
          width={112}
          height={112}
          style={{ borderRadius: 26 }}
        />
        <div style={{ display: "flex", fontSize: 84, fontWeight: 700 }}>バトレコ</div>
      </div>

      <div
        style={{ display: "flex", fontSize: 40, fontWeight: 700, color: COLORS.muted }}
      >
        ポケカプレイヤーのための対戦記録サービス
      </div>

      <div style={{ display: "flex", gap: 12 }}>
        {[
          "デッキコードからデッキ登録",
          "公式イベントに紐づく記録",
          "完全無料・広告なし",
        ].map((label) => (
          <Chip key={label}>{label}</Chip>
        ))}
      </div>

      <div
        style={{ display: "flex", fontSize: 26, color: COLORS.subtle, paddingTop: 12 }}
      >
        vsrecorder.mobi
      </div>
    </div>,
    assets,
  );
}

type HubOgImageProps = {
  chip: string;
  heading: string;
  lead: string;
};

// 一覧・ハブページの共通レイアウト。見出しは短い固定文言なので、サイズは固定にしている。
async function renderHubOgImage({ chip, heading, lead }: HubOgImageProps): Promise<Buffer> {
  const assets = await loadOgAssets();

  return toPngBuffer(
    <div style={canvasStyle}>
      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        <Chip>{chip}</Chip>

        <div style={{ display: "flex", fontSize: 68, fontWeight: 700, lineHeight: 1.3 }}>
          {heading}
        </div>

        <div style={{ display: "flex", fontSize: 30, color: COLORS.muted }}>{lead}</div>

        <div
          style={{ display: "flex", fontSize: 34, fontWeight: 700, color: COLORS.accent }}
        >
          優勝からベスト16までのデッキコードを掲載
        </div>
      </div>

      <Footer iconSrc={assets.iconSrc} />
    </div>,
    assets,
  );
}

// シティリーグ結果のハブページ用。
export function renderCityleagueListOgImage(): Promise<Buffer> {
  return renderHubOgImage({
    chip: "シティリーグ",
    heading: "結果・優勝デッキ一覧",
    lead: "全国のシティリーグの結果を日付順に掲載",
  });
}

// 大型大会(チャンピオンズリーグ・PJCS)の結果一覧ページ用。
export function renderChampionsleagueListOgImage(): Promise<Buffer> {
  return renderHubOgImage({
    chip: "大型大会",
    heading: "結果・優勝デッキ一覧",
    lead: "チャンピオンズリーグ・PJCSの結果を大会ごとに掲載",
  });
}

// シーズン・環境・開催月の一覧ページ用。
export function renderCityleagueSeasonListOgImage(): Promise<Buffer> {
  return renderHubOgImage({
    chip: "シティリーグ結果",
    heading: "シーズンから探す",
    lead: "シティリーグの結果をシーズンごとに一覧",
  });
}

export function renderCityleagueEnvironmentListOgImage(): Promise<Buffer> {
  return renderHubOgImage({
    chip: "シティリーグ結果",
    heading: "環境から探す",
    lead: "シティリーグの結果を対戦環境ごとに一覧",
  });
}

export function renderCityleagueMonthListOgImage(): Promise<Buffer> {
  return renderHubOgImage({
    chip: "シティリーグ結果",
    heading: "開催月から探す",
    lead: "シティリーグの結果を開催月ごとに一覧",
  });
}

export function renderCityleagueDateListOgImage(): Promise<Buffer> {
  return renderHubOgImage({
    chip: "シティリーグ結果",
    heading: "開催日から探す",
    lead: "シティリーグの結果を開催日ごとに一覧",
  });
}

// 店舗名は「鹿角ラボ」から「TSUTAYA Trading Card 宇都宮インターパークビレッジ店」まで
// 長さの幅が大きい。固定サイズだと長い名前が折り返して下段を押し出すため、文字数に応じて縮小する。
function shopNameFontSize(shopName: string): number {
  const length = [...shopName].length;

  if (length <= 12) return 68;
  if (length <= 20) return 54;
  if (length <= 30) return 44;
  return 38;
}

// シティリーグの個別イベント用。
export async function renderCityleagueEventOgImage(
  event: OfficialEventType,
): Promise<Buffer> {
  const assets = await loadOgAssets();

  return toPngBuffer(
    <div style={canvasStyle}>
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <Chip>{event.title}</Chip>

        <div
          style={{
            display: "flex",
            fontSize: shopNameFontSize(event.shop_name),
            fontWeight: 700,
            lineHeight: 1.3,
            lineClamp: 2,
          }}
        >
          {event.shop_name}
        </div>

        <div style={{ display: "flex", gap: 14, fontSize: 30, color: COLORS.muted }}>
          <span>{formatEventDate(event.date)}</span>
          <span style={{ color: COLORS.separator }}>/</span>
          <span>{event.prefecture_name}</span>
          <span style={{ color: COLORS.separator }}>/</span>
          <span>{event.league_title}リーグ</span>
        </div>

        <div
          style={{ display: "flex", fontSize: 34, fontWeight: 700, color: COLORS.accent }}
        >
          優勝からベスト16までのデッキコードを掲載
        </div>
      </div>

      <Footer iconSrc={assets.iconSrc} />
    </div>,
    assets,
  );
}

// 大会名・シーズン名などを描く枠の幅(左右の余白を除いた全幅)と、フォントサイズの上限・下限。
// 名前は「2026年4月」から「ポケモンジャパンチャンピオンシップス2026」「『スタートデッキ100 バトルコレクション』環境」まで
// 長さに幅があるため、1行に収まるサイズまで縮める(折り返すと下段が押し出される)。
const OG_RESULT_TITLE_WIDTH = 1056;
const OG_RESULT_TITLE_FONT_MAX = 72;
const OG_RESULT_TITLE_FONT_MIN = 40;

type TitledResultOgImageProps = {
  chip: string;
  title: string;
  // 名前の下に「/」区切りで並べる補足(会期・リーグ区分など)。空なら行ごと出さない。
  meta: string[];
};

// 大型大会・シーズン・環境・開催月の個別ページの共通レイアウト。
async function renderTitledResultOgImage({
  chip,
  title,
  meta,
}: TitledResultOgImageProps): Promise<Buffer> {
  const assets = await loadOgAssets();

  return toPngBuffer(
    <div style={canvasStyle}>
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <Chip>{chip}</Chip>

        <div
          style={{
            display: "flex",
            fontSize: deckNameFontSize(
              title,
              OG_RESULT_TITLE_WIDTH,
              OG_RESULT_TITLE_FONT_MAX,
              OG_RESULT_TITLE_FONT_MIN,
            ),
            fontWeight: 700,
            lineHeight: 1.3,
            lineClamp: 1,
          }}
        >
          {title}
        </div>

        {meta.length > 0 ? (
          <div style={{ display: "flex", gap: 14, fontSize: 30, color: COLORS.muted }}>
            {meta.flatMap((item, index) => [
              index > 0 ? (
                <span key={`sep-${index}`} style={{ color: COLORS.separator }}>
                  /
                </span>
              ) : null,
              <span key={index}>{item}</span>,
            ])}
          </div>
        ) : null}

        <div
          style={{ display: "flex", fontSize: 34, fontWeight: 700, color: COLORS.accent }}
        >
          優勝からベスト16までのデッキコードを掲載
        </div>
      </div>

      <Footer iconSrc={assets.iconSrc} />
    </div>,
    assets,
  );
}

/*
 * 大型大会の大会ページ・リーグ区分ページ用。leagueTitle を渡すと区分ページとして、
 * 会期の横に区分名を添える。
 *
 * OGP画像は一度アップロードすると作り直さない(ogStorage)。まだ開催前の大会でも描かれうるため、
 * 優勝デッキや区分の一覧のように後から変わる内容は載せず、大会名・会期・区分名だけにしている。
 */
export function renderChampionsleagueOgImage(
  schedule: ChampionsleagueScheduleType,
  leagueTitle?: string,
): Promise<Buffer> {
  return renderTitledResultOgImage({
    chip: "大型大会の結果",
    title: schedule.title.trim(),
    meta: [formatTermRange(schedule), ...(leagueTitle ? [leagueTitle] : [])],
  });
}

/*
 * シーズン・環境の個別ページ用。
 *
 * 開催中のシーズン・環境は結果が増え続けるため、件数や優勝デッキは載せない(画像は作り直さない)。
 * 会期は後から延びることがあるので、呼び出し側は会期をキーに含めること。
 */
export function renderCityleagueTermOgImage(
  title: string,
  term: CityleagueTerm,
): Promise<Buffer> {
  return renderTitledResultOgImage({
    chip: "シティリーグ結果",
    title,
    meta: [formatTermRange(term)],
  });
}

// 開催月の個別ページ用。
export function renderCityleagueMonthOgImage(monthTitle: string): Promise<Buffer> {
  return renderTitledResultOgImage({
    chip: "シティリーグ結果",
    title: monthTitle,
    meta: ["全国のシティリーグの結果を店舗ごとに掲載"],
  });
}

// 開催日の個別ページ用。dateTitle は「2026年9月26日(土)」
export function renderCityleagueDateOgImage(dateTitle: string): Promise<Buffer> {
  return renderTitledResultOgImage({
    chip: "シティリーグ結果",
    title: dateTitle,
    meta: ["この日に開催された全国のシティリーグの入賞デッキを掲載"],
  });
}

// data URI に埋め込む画像の上限。CDN のデッキ画像(JPEG)とアイコン(PNG、アップロード上限 5MB)が
// 収まればよく、それを超える応答は取得先の異常とみなして埋め込まない(メモリを食わせないため)。
const MAX_EMBED_IMAGE_BYTES = 8 * 1024 * 1024;

// 応答ボディを上限つきで読む。超えたらその場で打ち切って null を返す。
async function readBodyWithLimit(res: Response, limit: number): Promise<Buffer | null> {
  if (!res.body) return null;

  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;

    total += value.byteLength;
    if (total > limit) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }

  return Buffer.concat(chunks);
}

// 外部の画像(投稿者のアイコンなど)を短いタイムアウトで取り、data URI にして返す。
// satori は描画中に <img> の取得に失敗すると画像全体の生成が失敗するため、
// 信頼できない URL は先に取っておき、取れなければ null(その要素を出さない)にする。
//
// 取得先は isTrustedImageUrl の許可ホストに限る。投稿者のアイコン URL は本人が自由に
// 設定できる値なので、ここで絞らないと内部ネットワークへ向けた GET を webapp サーバに
// 撃たせられる(SSRF)。リダイレクトも追わない(許可ホストから外へ転送される経路を塞ぐ)。
async function fetchImageAsDataUri(url: string, timeoutMs: number): Promise<string | null> {
  if (!isTrustedImageUrl(url)) return null;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      cache: "no-store",
      redirect: "error",
    });
    const contentType = res.headers.get("content-type") ?? "";
    if (!res.ok || !contentType.startsWith("image/")) return null;

    const declaredLength = Number(res.headers.get("content-length") ?? 0);
    if (declaredLength > MAX_EMBED_IMAGE_BYTES) return null;

    const body = await readBodyWithLimit(res, MAX_EMBED_IMAGE_BYTES);
    if (!body) return null;

    return `data:${contentType.split(";")[0]};base64,${body.toString("base64")}`;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

// 背景に敷くデッキ画像に重ねる幕。上はカードを見せ、下(投稿者・ACE SPEC・フッター)へ向けて
// 紺の単色に落とす。文字が乗る帯をほぼ不透明にすることで、現行と同じ読みやすさを保つ。
//
// 幕は1要素にまとめている。satori は絶対配置の div を3枚重ねると3枚目を描かないため、
// 幕を複数使う場合も backgroundImage にカンマ区切りで並べること。
const DECK_IMAGE_VEIL =
  "linear-gradient(180deg, rgba(15,23,42,0.65) 0%, rgba(15,23,42,0.92) 45%, #0f172a 80%)";

// デッキ画像(2:1)は 1200×630 に対して縦が足りないので、高さを合わせて 1260×630 に伸ばし、
// はみ出す左右 30px ずつを切る。
const DECK_IMAGE_WIDTH = 1260;

function DeckImageBackground({ src }: { src: string }) {
  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        top: 0,
        width: OG_SIZE.width,
        height: OG_SIZE.height,
        display: "flex",
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt=""
        width={DECK_IMAGE_WIDTH}
        height={OG_SIZE.height}
        style={{ position: "absolute", left: (OG_SIZE.width - DECK_IMAGE_WIDTH) / 2, top: 0 }}
      />
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: OG_SIZE.width,
          height: OG_SIZE.height,
          display: "flex",
          backgroundImage: DECK_IMAGE_VEIL,
        }}
      />
    </div>
  );
}

/*
 * みんなの公開デッキの個別ページ(公開したデッキコード)のOGP画像。
 *
 * 左にデッキ名・投稿者(アイコン・名前・ランクと称号)・ACE SPEC、右にデッキのスプライト2体を
 * 横に揃えて置く。背景にはそのデッキのデッキ画像を敷き、上から紺の幕(DECK_IMAGE_VEIL)で
 * 落として文字を読ませる。デッキ画像が取れない投稿は他のOGPと同じ紺の単色になる。
 * スプライトが未登録の投稿は右側を空けず、デッキ名を1段大きくする。
 * 称号の絵文字は satori が絵文字フォントを持たないため画像には載せず、名前だけを出す。
 */
export async function renderDeckCodePostOgImage(post: DeckCodePostType): Promise<Buffer> {
  const assets = await loadOgAssets();
  // 投稿者のアイコン(外部の Google / X)と背景のデッキ画像(CDN)は、取得に失敗しても
  // 画像全体が落ちないよう先に取る。デッキ画像は生成前・削除済みで404があり得るので、
  // 取れなければ背景なし(紺の単色)で描く。
  const [avatarSrc, deckImageSrc] = await Promise.all([
    fetchImageAsDataUri(post.user.image_url, 2000),
    fetchImageAsDataUri(deckImageUrl(post.code), 2500),
  ]);

  const designation = designationForTier(post.user.designation_tier);
  const rank = rankForTier(post.user.designation_tier);

  const first = getSpriteBySlot(post.pokemon_sprites, 1);
  const second = getSpriteBySlot(post.pokemon_sprites, 2);
  // 1体だけなら2体目は unknown(id が無い枠。画像は同梱の白いモンスターボールを使う)
  const spriteIds: (string | undefined)[] = first ? [first.id, second?.id] : [];

  // デッキ名は長さに上限が無い。枠に収まるサイズまで小さくし、それでも収まらない長さは
  // lineClamp:1 で末尾を省略する(折り返すと下の投稿者・ACE SPEC が押し出されるため)。
  const titleWidth = spriteIds.length === 0 ? OG_TITLE_WIDTH_FULL : OG_TITLE_WIDTH;
  const titleFontSize = deckNameFontSize(
    post.deck_name,
    titleWidth,
    spriteIds.length === 0 ? OG_TITLE_FONT_MAX_FULL : OG_TITLE_FONT_MAX,
  );

  return toPngBuffer(
    <div style={{ ...canvasStyle, justifyContent: "flex-start", position: "relative" }}>
      {deckImageSrc ? <DeckImageBackground src={deckImageSrc} /> : null}

      <div style={{ display: "flex", flexDirection: "column", gap: 18, width: titleWidth }}>
        <Chip>みんなの公開デッキ</Chip>

        <div
          style={{
            display: "flex",
            fontSize: titleFontSize,
            fontWeight: 700,
            lineHeight: 1.2,
            lineClamp: 1,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {post.deck_name}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          {avatarSrc ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatarSrc} alt="" width={56} height={56} style={{ borderRadius: 28 }} />
          ) : null}
          <div style={{ display: "flex", fontSize: 30, fontWeight: 700 }}>{post.user.name}</div>
          {designation ? (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                fontSize: 22,
                fontWeight: 700,
                padding: "4px 14px",
                borderRadius: 999,
                backgroundColor: "rgba(255,255,255,0.12)",
              }}
            >
              {rank ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={rank.image} alt="" width={26} height={26} />
              ) : null}
              <span>{designation.name}</span>
            </div>
          ) : null}
        </div>

        {post.ace_spec_card_name ? (
          <div
            style={{
              display: "flex",
              alignSelf: "flex-start",
              padding: "8px 22px",
              borderRadius: 999,
              border: "1px solid rgba(244,114,182,0.5)",
              backgroundColor: "rgba(236,72,153,0.16)",
              fontSize: 24,
              fontWeight: 700,
              color: "#f9a8d4",
            }}
          >
            ACE SPEC · {post.ace_spec_card_name}
          </div>
        ) : null}
      </div>

      {/* スプライトは枠(背景・角丸)を出さず、キャラだけを大きく置く。
          元画像はキャラの周りに余白があり大きさもまちまちなので、アプリ内と同じ正規化
          (spriteFitBox: 身長に応じた枠占有率・水平中央・下端接地)で枠いっぱいに揃える。
          左の本文(x=72 から 500 幅 → 572 まで)に被らないよう、2体で 524 に収めて右端 60 に寄せる
          (左端は 1200−60−524 = 616)。 */}
      {spriteIds.length > 0 ? (
        <div style={{ position: "absolute", right: 60, top: 110, display: "flex" }}>
          {spriteIds.map((id, index) => {
            // プレースホルダは小さい枠で正規化し、その枠を大枠の中央に置く
            const inner = id ? OG_SPRITE_FRAME : Math.round(OG_SPRITE_FRAME * OG_UNKNOWN_FRAME_RATIO);
            const inset = (OG_SPRITE_FRAME - inner) / 2;
            const fit = spriteFitBox(id, inner);
            return (
              <div
                key={index}
                style={{
                  position: "relative",
                  overflow: "hidden",
                  display: "flex",
                  width: OG_SPRITE_FRAME,
                  height: OG_SPRITE_FRAME,
                  marginLeft: index === 0 ? 0 : -OG_SPRITE_OVERLAP,
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={id ? spriteImageUrl(id) : assets.unknownSpriteSrc}
                  alt=""
                  width={fit.width}
                  height={fit.height}
                  style={{ position: "absolute", left: fit.left + inset, top: fit.top + inset }}
                />
              </div>
            );
          })}
        </div>
      ) : null}

      <div style={{ position: "absolute", left: 72, right: 72, bottom: X_CARD_OVERLAY_SAFE_AREA, display: "flex" }}>
        <div style={{ display: "flex", flex: 1 }}>
          <Footer iconSrc={assets.iconSrc} />
        </div>
      </div>
    </div>,
    assets,
  );
}

/*
 * 対戦環境分析(週次デッキ使用率)のOGP画像。
 *
 * どちらも数字が週ごと(直近の週は日ごと)に変わるため、呼び出し側(deckMetaOg)は
 * 対象の週と日付をキーに含めて別の画像にする。ここは渡された数字をそのまま描くだけ。
 */

// スプライトを枠いっぱいに正規化して置く(アプリ内と同じ spriteFitBox)。
// id が無い枠は同梱の白いモンスターボールを小さめに置く
function OgSprite({
  id,
  size,
  unknownSrc,
  style,
}: {
  id?: string;
  size: number;
  unknownSrc: string;
  style?: React.CSSProperties;
}) {
  const inner = id ? size : Math.round(size * OG_UNKNOWN_FRAME_RATIO);
  const inset = (size - inner) / 2;
  const fit = spriteFitBox(id, inner);
  return (
    <div
      style={{
        position: "relative",
        overflow: "hidden",
        display: "flex",
        width: size,
        height: size,
        ...style,
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={id ? spriteImageUrl(id) : unknownSrc}
        alt=""
        width={fit.width}
        height={fit.height}
        style={{ position: "absolute", left: fit.left + inset, top: fit.top + inset }}
      />
    </div>
  );
}

// 1〜3位はランキング画面のメダル配色に合わせる
function medalColor(rank: number): string {
  if (rank === 1) return "#fbbf24";
  if (rank === 2) return "#e2e8f0";
  if (rank === 3) return "#fb923c";
  return COLORS.subtle;
}

export type DeckMetaRankingOgDeck = {
  // 1体目でまとめた集計なら1体、組み合わせ別なら2体(position の順)
  spriteIds: (string | undefined)[];
  usageRate: number;
};

// 使用率ランキングの上位を並べる。見出しの下に週と集計単位、その下に上位5件のカード
export async function renderDeckMetaRankingOgImage({
  weekLabel,
  groupingLabel,
  decks,
}: {
  weekLabel: string;
  groupingLabel: string;
  decks: DeckMetaRankingOgDeck[];
}): Promise<Buffer> {
  const assets = await loadOgAssets();

  return toPngBuffer(
    <div style={canvasStyle}>
      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <Chip>対戦環境分析</Chip>
          <div style={{ display: "flex", fontSize: 26, color: COLORS.muted }}>
            {weekLabel} の週・{groupingLabel}
          </div>
        </div>

        <div style={{ display: "flex", fontSize: 56, fontWeight: 700, lineHeight: 1.2 }}>
          デッキ使用率ランキング
        </div>

        {decks.length > 0 ? (
          <div style={{ display: "flex", gap: 16 }}>
            {decks.map((deck, index) => (
              <div
                key={index}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  width: 198,
                  padding: "12px 0",
                  borderRadius: 20,
                  backgroundColor: "rgba(255,255,255,0.06)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    fontSize: 26,
                    fontWeight: 700,
                    color: medalColor(index + 1),
                  }}
                >
                  {index + 1}位
                </div>
                <div style={{ display: "flex", height: 96, alignItems: "center" }}>
                  {deck.spriteIds.length > 1 ? (
                    deck.spriteIds.map((id, i) => (
                      <OgSprite
                        key={i}
                        id={id}
                        size={84}
                        unknownSrc={assets.unknownSpriteSrc}
                        style={{ marginLeft: i === 0 ? 0 : -12 }}
                      />
                    ))
                  ) : (
                    <OgSprite
                      id={deck.spriteIds[0]}
                      size={96}
                      unknownSrc={assets.unknownSpriteSrc}
                    />
                  )}
                </div>
                <div style={{ display: "flex", alignItems: "baseline", fontWeight: 700 }}>
                  <span style={{ fontSize: 36 }}>
                    {(deck.usageRate * 100).toFixed(1)}
                  </span>
                  <span style={{ fontSize: 22, color: COLORS.muted }}>%</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ display: "flex", fontSize: 30, color: COLORS.muted }}>
            バトレコの対戦記録から集計した週ごとのデッキ使用率
          </div>
        )}
      </div>

      <Footer iconSrc={assets.iconSrc} />
    </div>,
    assets,
  );
}

export type DeckMetaTrendOgSeries = {
  spriteId?: string;
  color: string;
  // 週ごとの順位(古い週が先頭)。圏外・集計なしは null
  ranks: (number | null)[];
};

// 推移グラフの寸法。行の高さ × 表示する順位の数が線を描く領域の高さになる
// (上位8位で 304px。フッターと X の帯の余白を除いた高さに、週の目盛りと合わせて収める)
const OG_TREND_ROW = 38;
const OG_TREND_PLOT_WIDTH = 520;
const OG_TREND_SPRITE = 40;

// 使用率順位の推移。左に見出し、右に最新週の上位の順位推移(画面の推移グラフと同じS字の線)
export async function renderDeckMetaTrendOgImage({
  rangeLabel,
  weekLabels,
  limit,
  series,
}: {
  rangeLabel: string;
  weekLabels: string[];
  limit: number;
  series: DeckMetaTrendOgSeries[];
}): Promise<Buffer> {
  const assets = await loadOgAssets();

  const height = OG_TREND_ROW * limit;
  const pad = 10;
  const step =
    weekLabels.length > 1 ? (OG_TREND_PLOT_WIDTH - pad * 2) / (weekLabels.length - 1) : 0;
  const xs = weekLabels.map((_, i) => pad + i * step);
  // 範囲外は描画域の下の外へ置き、線が下端から抜けていく見え方にする(画面と同じ)
  const y = (rank: number | null) =>
    rank != null && rank <= limit
      ? (rank - 0.5) * OG_TREND_ROW
      : (limit + 1.5) * OG_TREND_ROW;
  const path = (ranks: (number | null)[]) =>
    ranks
      .map((r, i) => {
        if (i === 0) return `M${xs[0]},${y(r)}`;
        const mid = (xs[i - 1] + xs[i]) / 2;
        return `C${mid},${y(ranks[i - 1])} ${mid},${y(r)} ${xs[i]},${y(r)}`;
      })
      .join(" ");
  // 目盛りは多すぎると重なるので、最新の週から数えて間引く(60px 以上あける)
  const labelEvery = step > 0 ? Math.max(1, Math.ceil(60 / step)) : 1;

  return toPngBuffer(
    <div style={canvasStyle}>
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 18, width: 400 }}>
          <Chip>対戦環境分析</Chip>
          {/* 幅に任せると「推 / 移」の間で折り返すので、語の切れ目で改行する */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              fontSize: 56,
              fontWeight: 700,
              lineHeight: 1.2,
            }}
          >
            <span>使用率順位の</span>
            <span>推移</span>
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 6,
              fontSize: 26,
              color: COLORS.muted,
            }}
          >
            <span>{rangeLabel}</span>
            <span>1体目でまとめた集計・上位{limit}</span>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex" }}>
            {/* 順位の目盛り */}
            <div style={{ display: "flex", flexDirection: "column", width: 34 }}>
              {Array.from({ length: limit }, (_, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    height: OG_TREND_ROW,
                    alignItems: "center",
                    fontSize: 18,
                    color: COLORS.subtle,
                  }}
                >
                  {i + 1}
                </div>
              ))}
            </div>
            <svg
              width={OG_TREND_PLOT_WIDTH}
              height={height}
              viewBox={`0 0 ${OG_TREND_PLOT_WIDTH} ${height}`}
              style={{ overflow: "hidden" }}
            >
              {xs.map((x, i) => (
                <line
                  key={`g${i}`}
                  x1={x}
                  x2={x}
                  y1={0}
                  y2={height}
                  stroke={COLORS.rule}
                  strokeWidth={1}
                />
              ))}
              {series.map((s, i) => (
                <path
                  key={`p${i}`}
                  d={path(s.ranks)}
                  fill="none"
                  stroke={s.color}
                  strokeWidth={4}
                  strokeLinecap="round"
                />
              ))}
              {series.flatMap((s, i) =>
                s.ranks.map((r, w) =>
                  r != null && r <= limit ? (
                    <circle
                      key={`c${i}-${w}`}
                      cx={xs[w]}
                      cy={y(r)}
                      r={5}
                      fill={s.color}
                    />
                  ) : null,
                ),
              )}
            </svg>
            {/* 最新週の順位の位置にスプライトを置く */}
            <div
              style={{
                display: "flex",
                position: "relative",
                width: OG_TREND_SPRITE + 8,
                height,
              }}
            >
              {series.map((s, i) => {
                const r = s.ranks[s.ranks.length - 1];
                if (r == null || r > limit) return null;
                return (
                  <OgSprite
                    key={i}
                    id={s.spriteId}
                    size={OG_TREND_SPRITE}
                    unknownSrc={assets.unknownSpriteSrc}
                    style={{
                      position: "absolute",
                      left: 8,
                      top: (r - 0.5) * OG_TREND_ROW - OG_TREND_SPRITE / 2,
                    }}
                  />
                );
              })}
            </div>
          </div>
          {/* 週の目盛り(各週の月曜日) */}
          <div
            style={{ display: "flex", position: "relative", height: 28, marginLeft: 34 }}
          >
            {weekLabels.map((label, i) =>
              (weekLabels.length - 1 - i) % labelEvery === 0 ? (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    position: "absolute",
                    left: xs[i] - 30,
                    width: 60,
                    justifyContent: "center",
                    top: 4,
                    fontSize: 18,
                    color: COLORS.subtle,
                  }}
                >
                  {label}
                </div>
              ) : null,
            )}
          </div>
        </div>
      </div>

      <Footer iconSrc={assets.iconSrc} />
    </div>,
    assets,
  );
}
