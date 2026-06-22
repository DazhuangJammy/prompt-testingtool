export async function mapWithConcurrency<Input, Output>(
  items: Input[],
  concurrency: number,
  task: (item: Input, index: number) => Promise<Output>,
): Promise<Output[]> {
  if (!items.length) return []

  const limit = Math.max(1, Math.floor(concurrency))
  const results = new Array<Output>(items.length)
  let cursor = 0

  const workers = Array.from(
    { length: Math.min(limit, items.length) },
    async () => {
      while (cursor < items.length) {
        const index = cursor
        cursor += 1
        results[index] = await task(items[index], index)
      }
    },
  )

  await Promise.all(workers)
  return results
}
