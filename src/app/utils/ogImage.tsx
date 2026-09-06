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
import { formatEventDate } from "@app/utils/cityleague";

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

// シティリーグ結果のハブページ用。
export async function renderCityleagueListOgImage(): Promise<Buffer> {
  const assets = await loadOgAssets();

  return toPngBuffer(
    <div style={canvasStyle}>
      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        <Chip>シティリーグ</Chip>

        <div style={{ display: "flex", fontSize: 68, fontWeight: 700, lineHeight: 1.3 }}>
          結果・優勝デッキ一覧
        </div>

        <div style={{ display: "flex", fontSize: 30, color: COLORS.muted }}>
          全国のシティリーグの結果を日付順に掲載
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

// 外部の画像(投稿者のアイコンなど)を短いタイムアウトで取り、data URI にして返す。
// satori は描画中に <img> の取得に失敗すると画像全体の生成が失敗するため、
// 信頼できない URL は先に取っておき、取れなければ null(その要素を出さない)にする。
async function fetchImageAsDataUri(url: string, timeoutMs: number): Promise<string | null> {
  if (!url) return null;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal, cache: "no-store" });
    const contentType = res.headers.get("content-type") ?? "";
    if (!res.ok || !contentType.startsWith("image/")) return null;

    const body = Buffer.from(await res.arrayBuffer());
    return `data:${contentType.split(";")[0]};base64,${body.toString("base64")}`;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/*
 * みんなの公開デッキの個別ページ(公開したデッキコード)のOGP画像。
 *
 * 左にデッキ名・投稿者(アイコン・名前・ランクと称号)・ACE SPEC、右にデッキのスプライト2体を
 * 横に揃えて置く。背景は他のOGPと同じ紺の単色(PNGの圧縮を効かせる)。
 * スプライトが未登録の投稿は右側を空けず、デッキ名を1段大きくする。
 * 称号の絵文字は satori が絵文字フォントを持たないため画像には載せず、名前だけを出す。
 */

export async function renderDeckCodePostOgImage(post: DeckCodePostType): Promise<Buffer> {
  const assets = await loadOgAssets();
  // 投稿者のアイコンは外部(Google / X)の URL なので、切れていても画像全体が失敗しないよう先に取る
  const avatarSrc = await fetchImageAsDataUri(post.user.image_url, 2000);

  const designation = designationForTier(post.user.designation_tier);
  const rank = rankForTier(post.user.designation_tier);

  const first = getSpriteBySlot(post.pokemon_sprites, 1);
  const second = getSpriteBySlot(post.pokemon_sprites, 2);
  // 1体だけなら2体目は unknown(id が無い枠。画像は同梱の白いモンスターボールを使う)
  const spriteIds: (string | undefined)[] = first ? [first.id, second?.id] : [];

  const titleFontSize = spriteIds.length === 0 ? 64 : post.deck_name.length > 12 ? 44 : 52;

  return toPngBuffer(
    <div style={{ ...canvasStyle, justifyContent: "flex-start", position: "relative" }}>
      {/* 左列の幅: 右のスプライトは x=616 から始まるので、左の余白72から 572 までに収めて
          文字がスプライトの下に潜らないようにする */}
      <div style={{ display: "flex", flexDirection: "column", gap: 18, width: spriteIds.length === 0 ? 1056 : 500 }}>
        <Chip>みんなの公開デッキ</Chip>

        <div
          style={{
            display: "flex",
            fontSize: titleFontSize,
            fontWeight: 700,
            lineHeight: 1.2,
            lineClamp: 2,
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
