import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { ImageResponse } from "next/og";

import { OfficialEventType } from "@app/types/official_event";
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
};

// satori は TTF/OTF しか読めないため、可変フォントではなく静的インスタンスを置いている。
// 店舗名には任意の漢字が現れるため、グリフのサブセット化はできない。
async function loadOgAssets(): Promise<OgAssets> {
  const [fontRegular, fontBold, icon] = await Promise.all([
    readFile(join(process.cwd(), "assets", "fonts", "NotoSansJP-Regular.ttf")),
    readFile(join(process.cwd(), "assets", "fonts", "NotoSansJP-Bold.ttf")),
    readFile(join(process.cwd(), "public", "icon-512x512.png")),
  ]);

  return {
    fonts: [
      { name: "Noto Sans JP", data: fontRegular, weight: 400, style: "normal" },
      { name: "Noto Sans JP", data: fontBold, weight: 700, style: "normal" },
    ],
    iconSrc: `data:image/png;base64,${icon.toString("base64")}`,
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

const canvasStyle = {
  width: "100%",
  height: "100%",
  display: "flex",
  flexDirection: "column" as const,
  justifyContent: "space-between" as const,
  padding: "60px 72px",
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
        {["デッキコードで登録", "公式イベントに紐づく記録", "完全無料・広告なし"].map(
          (label) => (
            <Chip key={label}>{label}</Chip>
          ),
        )}
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
