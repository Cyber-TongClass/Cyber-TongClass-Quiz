export function selectQuestions<T extends { difficulty?: string }>(
  questions: T[],
  count: number,
  policy?: string,
  random = Math.random,
): T[] {
  const shuffle = (items: T[]) => {
    const result = [...items];
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  };
  if (policy === "stratified-334") {
    if (count !== 10) throw new Error("分层练习必须抽取10题");
    const selected = (
      [
        ["easy", 3],
        ["medium", 3],
        ["hard", 4],
      ] as const
    ).flatMap(([difficulty, n]) => {
      const pool = questions.filter((q) => q.difficulty === difficulty);
      if (pool.length < n) throw new Error("分层题库题数不足，请联系管理员");
      return shuffle(pool).slice(0, n);
    });
    return shuffle(selected);
  }
  if (questions.length < count) throw new Error("题库题数不足");
  return shuffle(questions).slice(0, count);
}
