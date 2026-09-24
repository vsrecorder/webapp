import { heroui } from "@heroui/react";

/*
 * primary(青)を、ヘッダーやボタンのグラデーション(blue-600 → indigo-600 → violet-700)の
 * 中心の藍(Tailwind の indigo)に置き換える。青い文字・枠線・フォーカスの輪・薄い青の背景・
 * チェックボックスやスイッチの地色など、primary を使う箇所がまとめてグラデーションの色味に揃う
 * (既定の #006FEE のままだと、グラデーションの隣で一段青く浮いて見えていた)。
 * 塗りの面そのもののグラデーションは globals.css で重ねる。
 *
 * ライトは基準(DEFAULT)をグラデーションの中心の indigo-600 にする。
 * ダークは HeroUI の既定と同じく段階を反転し、基準は indigo-500 にする。黒地に置いた文字
 * (約4.1)も白抜きの塗り(4.5)も、既定の #006FEE(3.9 / 4.6)と同等以上に読める。
 */
const indigo = {
  50: "#eef2ff",
  100: "#e0e7ff",
  200: "#c7d2fe",
  300: "#a5b4fc",
  400: "#818cf8",
  500: "#6366f1",
  600: "#4f46e5",
  700: "#4338ca",
  800: "#3730a3",
  900: "#312e81",
};

const indigoDark = {
  50: indigo[900],
  100: indigo[800],
  200: indigo[700],
  300: indigo[600],
  400: indigo[500],
  500: indigo[400],
  600: indigo[300],
  700: indigo[200],
  800: indigo[100],
  900: indigo[50],
};

// ダークモードでカード等の境界が背景に溶け込んで見にくかったため、
// サーフェス色と枠線色のコントラストを引き上げる。
export default heroui({
  themes: {
    light: {
      colors: {
        primary: { ...indigo, DEFAULT: indigo[600], foreground: "#ffffff" },
        // フォーカスの輪(focus-visible)も既定は #006FEE の青で、primary とは別に持っている
        focus: { DEFAULT: indigo[500] },
      },
    },
    dark: {
      colors: {
        primary: { ...indigoDark, DEFAULT: indigo[500], foreground: "#ffffff" },
        focus: { DEFAULT: indigo[400] },
        // カード背景。メイン背景(#0a0a0a)から浮き上がるよう一段明るくする
        content1: {
          DEFAULT: "#1d1d21",
        },
        content2: {
          DEFAULT: "#28282d",
        },
        // 仕切り線・枠線。薄すぎて見えなかったため明るくする
        divider: {
          DEFAULT: "rgba(255, 255, 255, 0.22)",
        },
        // モーダル等のバックドロップ色。デフォルトは黒で背景がさらに暗くなるが、
        // ダークモードでは逆に背景を明るく見せたい。純白だと明るすぎるため
        // グレーに抑えて、ほどよく明るくなる程度にする
        // （バックドロップは bg-overlay/50 として描画される）
        overlay: {
          DEFAULT: "#6b7280",
        },
        // border-default-* / bg-default-* の境界コントラストを底上げする
        default: {
          100: "#27272b",
          200: "#3a3a41",
          300: "#52525b",
          400: "#8a8a93",
        },
      },
    },
  },
});
