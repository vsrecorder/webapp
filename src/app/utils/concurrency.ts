// 配列の各要素に非同期処理を適用し、同時に走る数を limit に抑える。結果は入力と同じ順で返す。
// 上流(deckcard-api や core-apiserver)へ一度に数十件の要求を投げないためのもの。
export async function mapWithConcurrency<T, R>(
  items: readonly T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;

  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const index = next++;
      results[index] = await fn(items[index], index);
    }
  });

  await Promise.all(workers);

  return results;
}
