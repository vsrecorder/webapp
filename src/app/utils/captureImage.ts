import { toPng } from "html-to-image";

// 書き出し画像に表示するサービス情報
const APP_NAME = "バトレコ";
const APP_ICON_SRC = "https://xx8nnpgt.user.webaccel.jp/images/icons/icon.png";

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
  footer.style.padding = "18px 0 6px";
  footer.style.marginTop = "16px";
  footer.style.borderTop = `1px solid ${dividerColor}`;

  const icon = document.createElement("img");
  icon.src = APP_ICON_SRC;
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

  // キャプチャ前にアイコンの読み込み完了を待てるよう Promise を返す
  const iconLoaded = icon.decode().catch(() => {});

  return { footer, iconLoaded };
}

// キャプチャ時に現在のテーマ（ライト/ダーク）へ追従して書き出す。
// 画面外への退避は「外側のラッパー」だけが担い、キャプチャ対象(container)自身には
// 位置スタイルを一切付けない。こうすることで通常フロー(0,0)のまま描画され、
// 書き出し画像の最上部に帯が出る／コンテンツがずれる、といった座標起因の不具合を防ぐ。
// あわせて画像下部にサービスのアイコンとサービス名のフッターを差し込む。
export async function captureThemedPng(el: HTMLElement): Promise<string> {
  const isDark = document.documentElement.classList.contains("dark");
  // ライトは白、ダークはメイン領域と同じ地色（app-dot-bg のダーク背景）
  const bgColor = isDark ? "#0a0a0a" : "#ffffff";

  // 内容が端に張り付かないよう、全体に均等な余白を持たせる
  const contentWidth = el.offsetWidth;
  const sidePadding = 20;
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
  container.style.boxSizing = "border-box";
  container.style.width = `${outerWidth}px`;
  container.style.padding = `${sidePadding}px ${sidePadding}px 12px`;
  container.style.backgroundColor = bgColor;

  const clone = el.cloneNode(true) as HTMLElement;
  clone.style.width = `${contentWidth}px`;
  if (!isDark) clone.classList.add("light");

  // 並び替えボタンなど、操作用UIで書き出し画像には含めたくない要素を除去する
  clone
    .querySelectorAll<HTMLElement>('[data-capture-hide="true"]')
    .forEach((node) => node.remove());

  const { footer, iconLoaded } = buildServiceFooter(isDark);

  container.appendChild(clone);
  container.appendChild(footer);
  wrapper.appendChild(container);
  document.body.appendChild(wrapper);

  try {
    // アイコン未読み込みのまま書き出すと欠けるため、読み込み完了を待つ
    await iconLoaded;
    return await toPng(container, {
      cacheBust: true,
      pixelRatio: 3,
      backgroundColor: bgColor,
    });
  } finally {
    document.body.removeChild(wrapper);
  }
}
