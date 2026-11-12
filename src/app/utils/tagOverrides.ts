/*
 * この端末で行ったタグの名前変更・削除を、表示の時点で反映するための控え。
 *
 * タグの名前は付与先(デッキ・バージョン・記録・対戦結果)の応答に埋め込まれて届き、
 * 一覧・詳細・モーダルがそれぞれ自分の状態として持っている(ページ送り済みの一覧、
 * サーバ描画の結果、先読み済みの他ルート など)。タグを変えるたびにそれらを全部
 * 取り直すと、スクロール位置や読み込み済みのページを失ううえ、取り直し漏れた場所には
 * 古い名前が残る。そこで取り直す代わりに、変更の内容をここへ控えておき、
 * 描く側(TagChips など)が ID で読み替える。
 *
 * 名前の読み替えは「埋め込まれた名前が、こちらで変える前の名前のまま」のときだけ行う。
 * 無条件に上書きすると、別の端末でさらに名前を変えたあとに取り直した新しい応答まで、
 * この端末で付けた古い名前に戻してしまう。
 *
 * 控えはメモリ上だけで、再読み込みすれば消える(そのときは応答そのものが新しい)。
 * タグの ID は使い回されないので、削除の控えが別のタグを隠すことはない。
 */

type Rename = {
  // いまの名前
  name: string;
  // この端末で変える前に付いていた名前(A→B→C と変えたら A と B)
  staleNames: Set<string>;
};

const renames = new Map<string, Rename>();
const deletedIds = new Set<string>();

let version = 0;
const listeners = new Set<() => void>();

function emit() {
  version += 1;
  listeners.forEach((listener) => listener());
}

export function subscribeTagOverrides(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

// 控えが変わるたびに進む番号(useSyncExternalStore のスナップショット)
export function tagOverridesVersion(): number {
  return version;
}

export function noteTagRenamed(id: string, from: string, to: string): void {
  if (from === to) return;

  const staleNames = renames.get(id)?.staleNames ?? new Set<string>();
  staleNames.add(from);
  // 元の名前へ戻したときに、戻した先の名前を「古い名前」として読み替えないようにする
  staleNames.delete(to);

  renames.set(id, { name: to, staleNames });
  emit();
}

export function noteTagDeleted(id: string): void {
  if (deletedIds.has(id)) return;

  deletedIds.add(id);
  emit();
}

// 控えを当てたタグの並びを返す。当てるものが無ければ、渡された配列をそのまま返す。
export function resolveTags<T extends { id: string; name: string }>(tags: T[]): T[];
export function resolveTags<T extends { id: string; name: string }>(
  tags: T[] | null | undefined,
): T[] | null | undefined;
export function resolveTags<T extends { id: string; name: string }>(
  tags: T[] | null | undefined,
): T[] | null | undefined {
  if (!tags || (renames.size === 0 && deletedIds.size === 0)) return tags;

  let changed = false;
  const resolved: T[] = [];

  for (const tag of tags) {
    if (deletedIds.has(tag.id)) {
      changed = true;
      continue;
    }

    const rename = renames.get(tag.id);
    if (rename && rename.staleNames.has(tag.name)) {
      changed = true;
      resolved.push({ ...tag, name: rename.name });
      continue;
    }

    resolved.push(tag);
  }

  return changed ? resolved : tags;
}

// テスト用。控えはモジュールの状態なので、テストの間で持ち越さないよう消す。
export function resetTagOverridesForTest(): void {
  renames.clear();
  deletedIds.clear();
  emit();
}
