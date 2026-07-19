// デッキのスプライトのスロット解決。汎用実装(spriteSlot)に委譲し、デッキ向けの
// 名前で re-export する。後方互換の考え方は spriteSlot.ts を参照。
export {
  getSpriteBySlot as getDeckSpriteBySlot,
  sortedSprites as sortedDeckSprites,
} from "@app/utils/spriteSlot";
