import { heroui } from "@heroui/react";

// ダークモードでカード等の境界が背景に溶け込んで見にくかったため、
// サーフェス色と枠線色のコントラストを引き上げる。
// （ライトモードはデフォルトのまま）
export default heroui({
  themes: {
    dark: {
      colors: {
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
