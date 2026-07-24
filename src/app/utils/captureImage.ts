import { toPng } from "html-to-image";
import type { Context } from "modern-screenshot";

import { isIOS } from "@app/utils/platform";

// 描画ライブラリは端末で出し分ける:
//   - iOS(Safari/WebKit): modern-screenshot の方が描画がきれいなため使用。
//     ただしブラウザ専用(内部にWebWorker用コードを含む)で、静的importすると
//     Next.jsのサーバーバンドルでチャンク分割が壊れビルドが失敗するため、
//     キャプチャ実行時(クライアント)に動的importする。
//   - iOS以外(Android/PC): 従来どおり html-to-image(toPng) を使用。

// 書き出し画像に表示するサービス情報
const APP_NAME = "バトレコ";

// 書き出し画像の左右に付ける余白(CSSピクセル)。
// 最終画像の横幅は「キャプチャ対象の幅 + SIDE_PADDING * 2」になる。
// 呼び出し側(ShareRecordModal)が端末幅に合わせて対象幅を決める際、この値を
// 差し引いて計算するため export している(定数の二重管理を避ける)。
export const SIDE_PADDING = 12;

// iOS Safari の canvas 制限に合わせた安全値。
// 1辺・総面積のいずれかを超えると描画結果が空(真っ白)になることがあるため、
// これを超えないように pixelRatio を動的に下げる。
//
// 1辺の上限は、ごく古い端末の 4096 に合わせると縦長の記録で pixelRatio が
// 早々に下がって画質が落ちるため、近年の端末で実用的な 8192 を採用する
// (幅の狭い書き出し画像では、実質的に効いてくる制限は総面積の方)。
const MAX_CANVAS_DIMENSION = 8192;
const MAX_CANVAS_AREA = 16_777_216;

// 対象サイズ(CSSピクセル)に対し、canvas 制限を超えない範囲で最大の pixelRatio を返す。
// 通常サイズでは desired(=4) をそのまま使い、極端に縦長のときだけ下げる。
function computeSafePixelRatio(width: number, height: number, desired = 4): number {
  if (width <= 0 || height <= 0) return desired;
  const byWidth = MAX_CANVAS_DIMENSION / width;
  const byHeight = MAX_CANVAS_DIMENSION / height;
  const byArea = Math.sqrt(MAX_CANVAS_AREA / (width * height));
  return Math.max(1, Math.min(desired, byWidth, byHeight, byArea));
}

// 指定要素配下の全<img>の読み込み・デコード完了を待つ。
// オフスクリーン退避や遅延読み込みで load が発火しないケースに備えてタイムアウトを設ける
// (個別の画像が失敗・遅延しても、欠けたまま全体の描画は進める)。
async function waitForImagesDecoded(root: HTMLElement, timeoutMs = 5000): Promise<void> {
  const imgs = Array.from(root.querySelectorAll("img"));
  await Promise.all(
    imgs.map((img) => {
      // オフスクリーン(-10000px)だと遅延読み込み画像が読み込まれないため即時読み込みにする
      img.loading = "eager";
      const loaded = (async () => {
        // complete は「読み込みが決着済み(成功・失敗どちらも)」を意味する。
        // 失敗済みの画像で load/error を待つと、イベントは既に発火し終えているため
        // タイムアウトまで待ちっぱなしになる。決着済みなら待たずに次へ進む。
        if (!img.complete) {
          await new Promise<void>((resolve) => {
            img.addEventListener("load", () => resolve(), { once: true });
            img.addEventListener("error", () => resolve(), { once: true });
          });
        }
        await img.decode().catch(() => {});
      })();
      const timeout = new Promise<void>((resolve) => setTimeout(resolve, timeoutMs));
      return Promise.race([loaded, timeout]);
    }),
  );
}

// 書き出しに写らない画像(読み込めていない画像)が残っているかを返す。
// スプライトが欠けたまま書き出されたかどうかは、画像を見なくてもこれで判定できる。
// captureThemedPng が待ち・再試行を終えたあとの元要素に対して使う。
export function hasUnloadedImages(root: HTMLElement): boolean {
  return Array.from(root.querySelectorAll("img")).some(
    (img) => !(img.complete && img.naturalWidth > 0),
  );
}

// 読み込みに失敗した画像だけを一度読み込み直す。
// 通信の瞬断やCDNの一時エラーで失敗した画像は、読み込み直すと写るようになる。
// (読み込みが遅いだけの画像は失敗していないので対象外。待つしかない)
async function retryFailedImages(root: HTMLElement, timeoutMs = 5000): Promise<void> {
  // complete かつ naturalWidth が 0 = 読み込みを試みて失敗した画像
  const failed = Array.from(root.querySelectorAll("img")).filter(
    (img) => img.complete && img.naturalWidth === 0 && img.src,
  );
  if (failed.length === 0) return;

  await Promise.all(
    failed.map((img) => {
      const retry = new Promise<void>((resolve) => {
        img.addEventListener("load", () => resolve(), { once: true });
        img.addEventListener("error", () => resolve(), { once: true });
        // 同じURLのままだと失敗結果がキャッシュから返ることがあるためクエリを変える
        const src = img.src;
        img.src = `${src}${src.includes("?") ? "&" : "?"}retry=${Date.now()}`;
      });
      const timeout = new Promise<void>((resolve) => setTimeout(resolve, timeoutMs));
      return Promise.race([retry, timeout]);
    }),
  );
}

// 描画ライブラリが画像の取得に失敗したときの代替画像(透明1px)。
//
// 描画ライブラリは<img>のsrcを取得し直してdata URL化してから描画するが、
// 既定ではその取得に1枚でも失敗すると書き出し全体が例外になる。
// スプライトが1枚CDNに無いだけで画像を1枚も作れなくなるのは割に合わないため、
// 失敗した画像は透明として扱い、書き出しそのものは成功させる。
// (欠けたことは hasUnloadedImages で検知して呼び出し側が知らせる)
const TRANSPARENT_PIXEL =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";

// 次の描画(フレーム)まで待つ。
// バックグラウンドのタブでは requestAnimationFrame が止まるため、
// 待ち続けてしまわないようタイマーでも先に進めるようにする。
async function nextFrame(): Promise<void> {
  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => resolve());
    setTimeout(resolve, 100);
  });
}

// 読み込み済みの画像が実際に表示されるまで待つ。
//
// HeroUIの<Image>は読み込み完了後、Reactの状態更新を経て data-loaded="true" が
// 付いて初めて表示される(それまでは opacity-0)。<img>のload完了と表示への反映は
// 別のタイミングなので、waitForImagesDecoded だけでは「読み込めたがまだ透明」の
// 状態が残る。その状態で複製すると、複製後はReactの更新が届かないため
// 永久に透明のままとなり、書き出し画像に写らない。
//
// ここでは「読み込めているのに完全に透明な画像」が無くなるまで待つ。
// 表示が始まらない画像(読み込み失敗・意図的に透明)で待ち続けないようタイムアウトを設ける。
async function waitForImagesShown(root: HTMLElement, timeoutMs = 2000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  const isLoadedButInvisible = (img: HTMLImageElement) =>
    img.complete && img.naturalWidth > 0 && getComputedStyle(img).opacity === "0";

  while (Date.now() < deadline) {
    const imgs = Array.from(root.querySelectorAll<HTMLImageElement>("img"));
    if (!imgs.some(isLoadedButInvisible)) return;
    await nextFrame();
  }
}

// 複製後のDOMに残った「読み込めているのに完全に透明な画像」を表示状態へ固定する保険。
//
// 通常は複製前に waitForImagesShown で表示を待つためここでの対象は無い。
// ただし待ちがタイムアウトした場合、複製後はReactの更新が届かず永久に透明のままに
// なってしまうため、最後に補正しておく。
// data-loaded を付けるだけではフェードイン開始直後(=ほぼ透明)で撮られうるので、
// opacity はインラインスタイルで直接固定し、トランジションも切る。
//
// 読み込めなかった画像は透明のままにして、壊れた画像アイコンが写るのを避ける。
function forceLoadedImagesVisible(root: HTMLElement): void {
  root.querySelectorAll<HTMLImageElement>("img").forEach((img) => {
    if (!(img.complete && img.naturalWidth > 0)) return;
    if (getComputedStyle(img).opacity !== "0") return;
    img.style.transition = "none";
    img.style.opacity = "1";
  });
}

// box-shadow の値をレイヤー単位に分割する。
// 色関数(rgba(0, 0, 0, 0.3) など)の中にもカンマが含まれるため、括弧の外側のカンマだけで区切る。
function splitBoxShadowLayers(value: string): string[] {
  const layers: string[] = [];
  let depth = 0;
  let current = "";
  for (const char of value) {
    if (char === "(") depth++;
    if (char === ")") depth--;
    if (char === "," && depth === 0) {
      layers.push(current.trim());
      current = "";
      continue;
    }
    current += char;
  }
  if (current.trim()) layers.push(current.trim());
  return layers;
}

// 影が輪郭線も兼ねているサーフェス(HeroUI の Card など)。
// 計算値の文字列に頼らずクラスで特定するため、端末による計算値の書式差の影響を受けない。
const SURFACE_SHADOW_SELECTOR = ".shadow-small, .shadow-medium, .shadow-large";

// 影のレイヤーが「ぼかしのある外側の影」か。
// 計算値の並びは「色 offsetX offsetY blur spread」なので、色関数を除いた3つ目が blur。
// ぼかしのある外側の影 = カードを浮き上がらせる装飾。ぼかしの無い外側の影 = ring-* 相当。
//
// 計算値の書式は端末で違いうるため、これは SURFACE_SHADOW_SELECTOR を補う保険として使う。
// どちらか一方でも効けば輪郭線が引かれるようにしている(片方の判定が外れても輪郭が消えない)。
function isBlurredOuterShadow(layer: string): boolean {
  if (layer.includes("inset")) return false;
  const lengths = layer
    .replace(/[\w-]*\([^)]*\)/g, " ")
    .trim()
    .split(/\s+/);
  const blur = Number.parseFloat(lengths[2] ?? "0");
  return Number.isFinite(blur) && blur > 0;
}

// 書き出しでカードの輪郭に使う線の色。どちらもアプリのデザインに合わせている。
//   ライト: アプリ内の区切り線(border-divider = rgba(17,17,17,0.15))と同じ濃さ
//   ダーク: HeroUI のダークの影が持つ内側のハイライト(rgb(255 255 255 / 0.15))と同じ濃さ
const CARD_OUTLINE_COLOR = {
  light: "rgba(17, 17, 17, 0.15)",
  dark: "rgba(255, 255, 255, 0.15)",
};

/*
 * 枠線を、対象に重ねた要素の border として描く。
 *
 * box-shadow ではなく実要素の border を使う理由:
 * iOS実機(Safari 18.7)では box-shadow が書き出し画像に描かれない。inset も同様で、
 * 計算値としては正しく適用されている(実機の書き出し画像に焼き込んで確認済み)のに写らない。
 * ローカルの WebKit(Playwright)では描かれてしまうため、この差は実機でしか出ない。
 *
 * 一方、絶対配置した要素の border は実機でも確実に描かれる。
 * 戦績カード上部の緑のアクセント線(RecordHero の absolute inset-0 + border-t)が
 * 同じ作りで、実機の書き出し画像に写っていることが根拠。
 *
 * inset には負値も渡せる(対象の外側に描く ring 用)。
 * border-radius は継承させるので、対象の角丸にそのまま追従する。
 * z-index は付けない。緑のアクセント線(z-10)より下に置くことで、上辺は緑のまま保たれる。
 */
function addBorderOverlay(
  host: HTMLElement,
  inset: number,
  width: number,
  color: string,
): void {
  // 絶対配置の基準にするため、位置指定が無いときだけ relative にする
  if (getComputedStyle(host).position === "static") host.style.position = "relative";

  const overlay = document.createElement("span");
  overlay.style.position = "absolute";
  overlay.style.inset = `${inset}px`;
  overlay.style.borderRadius = "inherit";
  overlay.style.border = `${width}px solid ${color}`;
  overlay.style.pointerEvents = "none";
  host.appendChild(overlay);
}

/*
 * 影のレイヤーが ring(オフセットもぼかしも無く、太さ(spread)だけの影)なら、その色・太さ・内外を返す。
 * ring は輪郭そのものなので border で正確に描き直せる(ぼかしのある影は border では表現できない)。
 *
 * 計算値の色は端末によって書式が違う(実機iOSでは ring-black/5 が oklab(0 0 0 / 0.05) で返る)ため、
 * 色は解釈せず、色関数をそのまま border-color へ渡す。
 */
function parseRingLayer(
  layer: string,
): { color: string; width: number; inset: boolean } | null {
  const color = layer.match(/[\w-]*\([^)]*\)/)?.[0];
  if (!color) return null;
  const inset = layer.includes("inset");
  const lengths = layer
    .replace(color, " ")
    .replace("inset", " ")
    .trim()
    .split(/\s+/)
    .map((value) => Number.parseFloat(value));
  if (lengths.length !== 4) return null;
  const [offsetX, offsetY, blur, spread] = lengths;
  if (offsetX !== 0 || offsetY !== 0 || blur !== 0) return null;
  if (!Number.isFinite(spread) || spread <= 0) return null;
  return { color, width: spread, inset };
}

/*
 * 外側(非inset)の box-shadow を、書き出しに適した表現へ置き換える。
 *
 * iOS(WebKit)は SVG(foreignObject)へ描くとき box-shadow を正しく描けず、影がぼけずに
 * 右側へずれた濃いグレーの帯になる(html-to-image でも同じで、ライブラリ側の問題ではない)。
 * 壊れるのは「複数層の影」と「ぼかし無しで spread のみの影(=非insetの ring-*)」で、
 * inset の影は正しく描ける。HeroUI の shadow-small は3層構成のため直撃する。
 *
 * そこで外側の影は落とす。ただし落とすだけだとカードの輪郭線まで消えて白背景に溶けてしまうため、
 * ぼかしのある外側の影(=カードの浮き上がり表現)を持っていた要素には、代わりに内側の輪郭線を引く。
 *
 * iOS以外は影を正しく描けるが、そこだけ元の影を残すと同じ記録でも端末で見た目が変わってしまう。
 * 書き出し画像は端末をまたいで共有されるものなので、全端末で同じ置き換えを行って見た目を揃える。
 *
 * ダークはカード地色と背景の明度差で輪郭が出るうえ、globals.css がダーク時のみ枠線を補うため何もしない。
 * 非inset の ring は WebKit では元々右側にしか描かれていないため、落としても失うものはない。
 */
function replaceOuterBoxShadows(root: HTMLElement, isDark: boolean): void {
  const nodes = [root, ...Array.from(root.querySelectorAll<HTMLElement>("*"))];
  for (const node of nodes) {
    const shadow = getComputedStyle(node).boxShadow;
    if (!shadow || shadow === "none") continue;
    const layers = splitBoxShadowLayers(shadow);

    // 影は端末によって描かれたり描かれなかったりするため、書き出しでは一切使わない。
    // 見た目に必要なものは、この下で border として描き直す。
    node.style.boxShadow = "none";

    // 影が輪郭線も兼ねているサーフェス(カード)は、影を落とすと背景に溶けてしまうため輪郭線を引く
    const isSurface =
      node.matches(SURFACE_SHADOW_SELECTOR) || layers.some(isBlurredOuterShadow);
    if (isSurface) {
      addBorderOverlay(
        node,
        0,
        1,
        isDark ? CARD_OUTLINE_COLOR.dark : CARD_OUTLINE_COLOR.light,
      );
    }

    // ring(輪郭そのものの影)は、同じ位置・色・太さの border として描き直す。
    //   外側の ring: 貢献度メーターのマーカーの白フチ(ring-2 ring-content1)
    //   内側の ring: イベントアイコン枠の細い線(ring-1 ring-inset ring-black/5)
    for (const layer of layers) {
      const ring = parseRingLayer(layer);
      if (!ring) continue;
      addBorderOverlay(node, ring.inset ? 0 : -ring.width, ring.width, ring.color);
    }
  }
}

// 実行環境(ENV)はサーバー側でしか参照できないため、layout.tsxが<html>に埋め込んだ
// data-env属性から取得する（クライアント側でNEXT_PUBLIC_*を使わない理由はappIcon.ts参照）
function getAppIconSrc(): string {
  return document.documentElement.dataset.env === "dev"
    ? "/icon_dev-512x512.png"
    : "https://xx8nnpgt.user.webaccel.jp/images/icons/icon.png";
}

// 描画ライブラリは<img>のsrcがネットワークURLのままだと、キャプチャの度に
// 外部CDNへ取得しにいく。この取得結果によっては空データがキャッシュされ、
// ロゴが表示されたりされなかったりする不具合につながる。
// そのため事前にdata URL化しておき、ライブラリ側の再取得を発生させない。
// 失敗時はキャッシュせず、次回呼び出し時に再取得を試みる。
let iconDataUrlPromise: Promise<string> | null = null;

async function getIconDataUrl(): Promise<string> {
  if (!iconDataUrlPromise) {
    iconDataUrlPromise = fetch(getAppIconSrc())
      .then((res) => res.blob())
      .then(
        (blob) =>
          new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = () => reject(reader.error);
            reader.readAsDataURL(blob);
          }),
      )
      .catch((e) => {
        // 失敗を持ち越さないよう、次回呼び出しで再取得できるようにする
        iconDataUrlPromise = null;
        throw e;
      });
  }
  return iconDataUrlPromise;
}

// サービスのアイコンとサービス名を並べたフッター要素を生成する。
// 画像の下部に差し込み、どのサービスで作成した画像かが分かるようにする。
function buildServiceFooter(isDark: boolean): {
  footer: HTMLElement;
  iconLoaded: Promise<void>;
} {
  // テーマ別のトーン（区切り線は薄く、文字はやや控えめなグレー）
  const dividerColor = isDark ? "#1f1f23" : "#ececee";
  const labelColor = isDark ? "#a1a1aa" : "#71717a";

  const footer = document.createElement("div");
  footer.style.display = "flex";
  footer.style.alignItems = "center";
  footer.style.justifyContent = "center";
  footer.style.gap = "7px";
  footer.style.padding = "8px 0 2px";
  footer.style.marginTop = "8px";
  footer.style.borderTop = `1px solid ${dividerColor}`;

  const icon = document.createElement("img");
  icon.width = 30;
  icon.height = 30;
  icon.style.width = "30px";
  icon.style.height = "30px";
  // ヘッダー左上のロゴと同じ角丸の四角（object-contain rounded-lg 相当）で表示する
  icon.style.borderRadius = "8px";
  icon.style.objectFit = "contain";
  icon.alt = APP_NAME;

  const name = document.createElement("span");
  name.textContent = APP_NAME;
  name.style.fontSize = "14px";
  name.style.fontWeight = "700";
  name.style.lineHeight = "1";
  name.style.letterSpacing = "0.04em";
  name.style.color = labelColor;

  footer.appendChild(icon);
  footer.appendChild(name);

  // data URL化してから src にセットすることで、描画ライブラリ側の
  // ネットワーク再取得（と、失敗時のキャッシュ汚染）を避ける。
  // 取得に失敗した場合はアイコンなしで書き出す（アプリ名のテキストは表示される）。
  const iconLoaded = getIconDataUrl()
    .then((dataUrl) => {
      icon.src = dataUrl;
      return icon.decode().catch(() => {});
    })
    .catch(() => {
      icon.remove();
    });

  return { footer, iconLoaded };
}

// キャプチャ時に現在のテーマ（ライト/ダーク）へ追従して書き出す。
// 画面外への退避は「外側のラッパー」だけが担い、キャプチャ対象(container)自身には
// 位置スタイルを一切付けない。こうすることで通常フロー(0,0)のまま描画され、
// 書き出し画像の最上部に帯が出る／コンテンツがずれる、といった座標起因の不具合を防ぐ。
// あわせて画像下部にサービスのアイコンとサービス名のフッターを差し込む。
export async function captureThemedPng(
  el: HTMLElement,
  // targetWidth を指定すると、対象要素の実寸(offsetWidth)ではなくこの幅で
  // クローンを描画する。端末の画面幅に合わせて書き出したいとき(シェア画像)に使う。
  // theme を指定すると、端末のテーマ設定を無視してその配色で書き出す。
  // 配色をダークに固定しているページ（/kizuna）から使う。
  options?: {
    targetWidth?: number;
    theme?: "light" | "dark";
    // 余白とサービスフッターを付けず、対象要素の見た目をそのまま画像にする(既定 false)。
    // カード自身が縁まで描き、サービス表記も内包する「Xヘッダー画像」など、
    // アスペクト比を厳密に保ちたい書き出しに使う。
    bare?: boolean;
    // 書き出しの pixelRatio の希望値(既定 4)。canvas 上限を超える場合は自動で下がる。
    // 1500×500 のヘッダーを @2x の 3000×1000 で出したいときは 2 を渡す。
    desiredPixelRatio?: number;
  },
): Promise<string> {
  // 書き出しは対象DOMを複製して描画するため、「複製した時点の見た目」がそのまま
  // 画像になる。複製後にDOMがReactから更新されることはないため、読み込み途中の
  // 画像を抱えたまま複製すると、その画像は写らないまま確定してしまう。
  // そこで複製する前に、元要素の描画完了(画像の読み込み → 表示への反映)を待つ。
  //
  // 表示まで待ってから複製すれば、複製されたDOMは最初から表示状態(data-loaded="true")
  // で作られるため、HeroUIのフェードイン(300ms)の途中で撮れて薄くなることもない。
  await waitForImagesDecoded(el);
  // 失敗した画像は一度読み込み直す。ここで写るようになれば利用者は何も気づかずに済む。
  await retryFailedImages(el);
  await waitForImagesShown(el);

  const isDark = options?.theme
    ? options.theme === "dark"
    : document.documentElement.classList.contains("dark");
  // ライトは白、ダークはメイン領域と同じ地色（app-dot-bg のダーク背景）
  const bgColor = isDark ? "#0a0a0a" : "#ffffff";

  // 内容が端に張り付かないよう、周囲に余白を持たせる。
  // 左右はやや詰めて、書き出し画像内で戦績カードを大きく見せる。
  // targetWidth 指定時は端末幅に合わせるためその幅を採用する。
  // bare 指定時は余白・フッターを付けず、対象要素の見た目をそのまま画像にする。
  const bare = options?.bare ?? false;

  const contentWidth = options?.targetWidth ?? el.offsetWidth;
  const sidePadding = bare ? 0 : SIDE_PADDING; // 左右の余白
  const topPadding = bare ? 0 : 20; // 上の余白(従来どおり)
  const bottomPadding = bare ? 0 : 12; // 下の余白
  const outerWidth = contentWidth + sidePadding * 2;

  // 画面外に逃がすためのラッパー（位置指定はここだけが持つ）
  const wrapper = document.createElement("div");
  wrapper.style.position = "fixed";
  wrapper.style.top = "-10000px";
  wrapper.style.left = "0";
  wrapper.style.width = `${outerWidth}px`;
  wrapper.style.backgroundColor = bgColor;

  // クローンとフッターをまとめる内側コンテナ。これを丸ごとキャプチャ対象にする。
  const container = document.createElement("div");
  /*
   * 書き出すのは静止画である。クローンの中でCSSアニメーションが動いていると、
   * 描画した瞬間の位置（＝揺れの途中）がそのまま焼き付き、要素が浮いた位置で
   * 写ってしまう。この印を目印にCSS側で動きを止め、必ず基準位置で描かせる
   * （globals.css の [data-capture-static="true"]）。
   */
  container.dataset.captureStatic = "true";
  container.style.boxSizing = "border-box";
  container.style.width = `${outerWidth}px`;
  container.style.padding = `${topPadding}px ${sidePadding}px ${bottomPadding}px`;
  container.style.backgroundColor = bgColor;

  const clone = el.cloneNode(true) as HTMLElement;
  clone.style.width = `${contentWidth}px`;
  if (!isDark) clone.classList.add("light");
  // 遅延読み込みのままオフスクリーンに置くと画像が読み込まれないため即時読み込みにする
  clone
    .querySelectorAll<HTMLImageElement>("img")
    .forEach((img) => (img.loading = "eager"));

  // 並び替えボタンなど、操作用UIで書き出し画像には含めたくない要素を除去する
  clone
    .querySelectorAll<HTMLElement>('[data-capture-hide="true"]')
    .forEach((node) => node.remove());

  // bare 指定時はサービスフッターを付けない(カードが自前でサービス表記を内包する)
  const service = bare ? null : buildServiceFooter(isDark);

  container.appendChild(clone);
  if (service) container.appendChild(service.footer);
  wrapper.appendChild(container);
  document.body.appendChild(wrapper);

  try {
    // アイコン未読み込みのまま書き出すと欠けるため、読み込み完了を待つ
    if (service) await service.iconLoaded;
    // フォント・画像の読み込み(デコード)完了を待ってから描画する。
    // 未完了のまま描画すると、文字化けや画像欠けの原因になる。
    if (document.fonts?.ready) {
      await document.fonts.ready.catch(() => {});
    }
    await waitForImagesDecoded(container);
    forceLoadedImagesVisible(container);
    // 外側の影は iOS で帯として描かれてしまう。端末で見た目が割れないよう全端末で置き換える。
    replaceOuterBoxShadows(container, isDark);

    // 実レイアウト後のサイズから、canvas 制限を超えない pixelRatio を決める。
    // 縦長の記録(対戦数が多い)で高い pixelRatio のまま描画すると、iOS では
    // canvas 上限を超えて真っ白になることがあるため。
    const width = container.offsetWidth;
    const height = container.offsetHeight;
    const pixelRatio = computeSafePixelRatio(
      width,
      height,
      options?.desiredPixelRatio ?? 4,
    );

    if (isIOS()) {
      // iOS は modern-screenshot(動的importでサーバーバンドル回避)。
      // scale が pixelRatio 相当、fetch.bypassingCache が cacheBust 相当。
      const { createContext, destroyContext, domToPng } =
        await import("modern-screenshot");

      // Safari は foreignObject 内の画像のデコードが1回目の canvas 描画に間に合わず
      // 画像が欠けることがある。modern-screenshot はその対策として canvas を描き直すが、
      // その回数は「埋め込んだ画像の枚数」ぶんになる(1回あたり drawImageInterval=100ms
      // 待って再ラスタライズする)。スプライトが数十枚並ぶ戦績では、これだけで
      // 十数秒かかってしまう。描き直しは数回で十分に効くため上限を設ける。
      const MAX_REDRAW = 3;

      // onCreateForeignObjectSvg は描き直し回数(drawImageCount)が確定したあと、
      // canvas へ描く前に呼ばれる。ここで上限を掛ける。
      // (コールバックが呼ばれるのは domToPng の実行中＝代入後なので context を参照できる)
      const context: Context = await createContext(container, {
        scale: pixelRatio,
        backgroundColor: bgColor,
        fetch: { bypassingCache: true, placeholderImage: TRANSPARENT_PIXEL },
        onCreateForeignObjectSvg: () => {
          context.drawImageCount = Math.min(context.drawImageCount, MAX_REDRAW);
        },
      });
      try {
        return await domToPng(context);
      } finally {
        // context を自前で作った場合は自動破棄されないため、明示的に後始末する
        destroyContext(context);
      }
    }

    // iOS以外は html-to-image。
    return await toPng(container, {
      cacheBust: true,
      pixelRatio,
      backgroundColor: bgColor,
      imagePlaceholder: TRANSPARENT_PIXEL,
    });
  } finally {
    document.body.removeChild(wrapper);
  }
}
