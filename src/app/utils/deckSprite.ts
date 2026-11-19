// デッキのスプライトのスロット解決。汎用実装(spriteSlot)に委譲し、デッキ向けの
// 名前で re-export する。後方互換の考え方は spriteSlot.ts を参照。
export {
  getSpriteBySlot as getDeckSpriteBySlot,
  sortedSprites as sortedDeckSprites,
} from "@app/utils/spriteSlot";

type VersionSprite = { id: string; position?: number };

/*
 * デッキのバージョン(デッキコード)の表示に使うスプライトを決める。
 *
 * スプライトはデッキ単位に加えてバージョン単位でも設定できる(同じデッキ名のまま
 * 相棒を入れ替えたバージョンを見分けるため)。バージョンに1体でも設定があればそれを使い、
 * 未設定(空・項目なし)ならデッキのスプライトへフォールバックする。
 *
 * 枠ごとに混ぜることはしない。バージョンで1枠目だけを設定したときに、2枠目へデッキの
 * スプライトが出てくると「設定していないポケモン」が表示されてしまうため、
 * バージョンに設定があるときは空き枠も含めてバージョンの内容をそのまま出す。
 *
 * 記録・カレンダー・バージョン履歴など、「どのバージョンか」が決まっている場所で使う。
 * デッキそのものを指す場所(デッキ一覧のカード等)はデッキのスプライトを使う
 * (デッキのスプライトは最新バージョンのスプライトと常に揃っている)。
 */
export function resolveVersionSprites<T extends VersionSprite, U extends VersionSprite>(
  deckSprites: T[] | null | undefined,
  versionSprites: U[] | null | undefined,
): (T | U)[] {
  if (versionSprites && versionSprites.length > 0) return versionSprites;

  return deckSprites ?? [];
}

// バージョンにスプライトが設定されているか(未設定ならデッキのスプライトを表示している)
export function hasVersionSprites(
  versionSprites: VersionSprite[] | null | undefined,
): boolean {
  return !!versionSprites && versionSprites.length > 0;
}

// 2つのスプライト設定が同じ(同じ枠に同じスプライト)か。枠が無い古い形は配列順として比べる
export function sameSprites(
  a: VersionSprite[] | null | undefined,
  b: VersionSprite[] | null | undefined,
): boolean {
  const normalize = (sprites: VersionSprite[] | null | undefined) =>
    (sprites ?? [])
      .map((sprite, index) => `${sprite.position || index + 1}:${sprite.id}`)
      .sort()
      .join(",");

  return normalize(a) === normalize(b);
}

type VersionWithSprites = { id: string; pokemon_sprites?: VersionSprite[] };

/*
 * 最新バージョンのスプライトが latestSprites に決まったときの、デッキとほかのバージョンの姿を返す。
 *
 * デッキのスプライトと最新バージョンのスプライトは常に揃える(サーバが書き込みのたびに揃える。
 * core-apiserver の usecase/deck_sprite_sync.go)。ここはその結果を、取り直さずに手元の表示へ
 * 当てるためのもので、サーバと同じ規則で組み立てる:
 *   - 最新バージョンが未設定(空)なら何も変わらない(未設定はデッキのスプライトで表示される)
 *   - デッキのスプライトを最新バージョンのものへ置き換える
 *   - その前に、未設定のほかのバージョンへ「置き換える前のデッキのスプライト」を書き残す。
 *     未設定のバージョンはデッキのスプライトで表示されるので、書き残さないと、最新バージョンで
 *     相棒を入れ替えただけで過去のバージョンの表示まで変わってしまう
 *
 * 何も変わらないときは null を返す。versions に最新バージョン自身が入っていてもそのまま返す。
 */
export function applyLatestVersionSprites<
  S extends VersionSprite,
  V extends VersionWithSprites,
>(
  deckSprites: S[] | null | undefined,
  versions: V[],
  latestId: string,
  latestSprites: S[] | null | undefined,
): { deckSprites: S[]; versions: V[] } | null {
  if (!latestSprites || latestSprites.length === 0) return null;
  if (sameSprites(deckSprites, latestSprites)) return null;

  const previous = deckSprites ?? [];

  return {
    deckSprites: latestSprites,
    versions:
      previous.length === 0
        ? versions
        : versions.map((version) =>
            version.id === latestId || hasVersionSprites(version.pokemon_sprites)
              ? version
              : { ...version, pokemon_sprites: previous },
          ),
  };
}

/*
 * デッキとバージョンを選ぶ欄(記録の作成・使用デッキの変更)に出すスプライト。
 *
 * バージョンを選んでいれば、そのバージョンのスプライト(未設定ならデッキのもの)を返す。
 * 記録にはこの組み合わせで表示されるので、選んだ時点で同じ絵が見えるようにする。
 * バージョンを選んでいない・選んだバージョンが別のデッキのもの(デッキを切り替えた直後で、
 * 前のデッキのバージョンがまだ残っている)ときは、デッキのスプライトを返す。
 */
export function deckSelectionSprites<S extends VersionSprite, U extends VersionSprite>(
  deck: { id: string; pokemon_sprites?: S[] | null } | null | undefined,
  version: { deck_id: string; pokemon_sprites?: U[] | null } | null | undefined,
): (S | U)[] {
  const deckSprites = deck?.pokemon_sprites ?? [];
  if (!deck || !version || version.deck_id !== deck.id) return deckSprites;

  return resolveVersionSprites(deckSprites, version.pokemon_sprites);
}
