import { query, mutation, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { paginationOptsValidator } from "convex/server";
import { student, access, identity, grade, hash } from "./lib";
import { answer } from "./schema";
import { selectQuestions } from "./sampling";
import { internal } from "./_generated/api";
import type { MutationCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
export const me = query({
  args: { token: v.string() },
  handler: async (ctx, a) => {
    try {
      return identity(await student(ctx, a.token));
    } catch {
      return null;
    }
  },
});
export const logout = mutation({
  args: { token: v.string() },
  handler: async (ctx, a) => {
    const h = await hash(a.token);
    const s = await ctx.db
      .query("sessions")
      .withIndex("hash", (q) => q.eq("hash", h))
      .unique();
    if (s) await ctx.db.delete(s._id);
  },
});
export const courses = query({
  args: { token: v.string() },
  handler: async (ctx, a) => {
    const u = await student(ctx, a.token);
    const es = await ctx.db
      .query("enrollments")
      .withIndex("student", (q) => q.eq("student", u._id))
      .collect();
    const ps = await ctx.db
      .query("progress")
      .withIndex("student", (q) => q.eq("student", u._id))
      .collect();
    const result = [];
    for (const e of es) {
      const c = await ctx.db.get(e.course);
      if (!e.active || !c?.published || c.deletedAt) continue;
      const ls = (
        await ctx.db
          .query("lectures")
          .withIndex("course", (q) => q.eq("course", c._id))
          .collect()
      ).filter((l) => l.published && !l.deletedAt);
      const progress = ps.filter((p) => ls.some((l) => l._id === p.lecture));
      result.push({
        ...c,
        total: ls.length,
        completed: progress.length,
        best: progress.length ? Math.max(...progress.map((p) => p.best)) : null,
        updated: progress.length
          ? Math.max(...progress.map((p) => p.updated))
          : null,
      });
    }
    return result;
  },
});
export const course = query({
  args: { token: v.string(), slug: v.string() },
  handler: async (ctx, a) => {
    const u = await student(ctx, a.token);
    const c = await ctx.db
      .query("courses")
      .withIndex("slug", (q) => q.eq("slug", a.slug))
      .unique();
    if (!c) throw new Error("课程不存在");
    await access(ctx, u._id, c._id);
    const ls = (
      await ctx.db
        .query("lectures")
        .withIndex("course", (q) => q.eq("course", c._id))
        .collect()
    )
      .filter((l) => l.published && !l.deletedAt)
      .sort((a, b) => a.order - b.order);
    return {
      ...c,
      lectures: await Promise.all(
        ls.map(async (l) => ({
          ...l,
          progress: await ctx.db
            .query("progress")
            .withIndex("pair", (q) =>
              q.eq("student", u._id).eq("lecture", l._id),
            )
            .unique(),
        })),
      ),
    };
  },
});
export const start = mutation({
  args: { token: v.string(), lecture: v.id("lectures") },
  handler: async (ctx, a) => {
    const u = await student(ctx, a.token);
    const l = await ctx.db.get(a.lecture);
    if (!l?.published || l.deletedAt) throw new Error("练习未发布");
    await access(ctx, u._id, l.course);
    const active = await ctx.db
      .query("attempts")
      .withIndex("lecture", (q) => q.eq("student", u._id).eq("lecture", l._id))
      .filter((q) => q.eq(q.field("status"), "active"))
      .first();
    if (active) return active._id;
    const qs = await ctx.db
      .query("questions")
      .withIndex("bank", (q) => q.eq("bank", l.bank))
      .collect();
    const selected = selectQuestions(qs, l.drawCount, l.sampling);
    return ctx.db.insert("attempts", {
      student: u._id,
      course: l.course,
      lecture: l._id,
      lectureTitle: l.title,
      questions: selected.map((q) => q._id),
      answers: selected.map(() => null),
      deadlines: selected.map(() => null),
      lockedAt: selected.map(() => null),
      timedOut: selected.map(() => false),
      revision: 0,
      status: "active",
      started: Date.now(),
      policy: "practice-v1",
    });
  },
});
export const attempt = query({
  args: { token: v.string(), id: v.id("attempts") },
  handler: async (ctx, a) => {
    const u = await student(ctx, a.token);
    const t = await ctx.db.get(a.id);
    if (!t || t.student !== u._id) throw new Error("无权访问");
    await access(ctx, u._id, t.course);
    const qs = await Promise.all(t.questions.map((id) => ctx.db.get(id)));
    return {
      id: t._id,
      title: t.lectureTitle,
      answers: t.answers,
      revision: t.revision,
      status: t.status,
      score: t.score,
      serverNow: Date.now(),
      deadlines: t.deadlines ?? t.questions.map(() => null),
      verdicts: qs.map((q, i) => {
        if (!q || (!t.lockedAt?.[i] && t.status !== "submitted")) return null;
        return {
          correct: grade(q.type, q.answer, t.answers[i]),
          answer: q.answer,
          explanation: q.explanation ?? "",
          timedOut: t.timedOut?.[i] ?? false,
        };
      }),
      questions: qs.map((q) => {
        if (!q) throw new Error("题目不存在");
        return {
          id: q._id,
          type: q.type,
          stem: q.stem,
          options: q.options,
          timeLimitSeconds: q.timeLimitSeconds ?? 30,
        };
      }),
    };
  },
});
// Legacy bulk writes cannot bypass per-question locks or deadlines.
export const save = mutation({
  args: {
    token: v.string(),
    id: v.id("attempts"),
    answers: v.array(answer),
    revision: v.number(),
  },
  handler: async () => {
    throw new Error("请刷新页面，逐题提交答案");
  },
});
export const submit = mutation({
  args: { token: v.string(), id: v.id("attempts") },
  handler: async (ctx, a) => {
    const t = await owned(ctx, a.token, a.id);
    if (t.status !== "submitted") throw new Error("请逐题提交答案");
    return t.score;
  },
});
async function owned(ctx: MutationCtx, token: string, id: Id<"attempts">) {
  const u = await student(ctx, token);
  const t = await ctx.db.get(id);
  if (!t || t.student !== u._id) throw new Error("无权访问");
  await access(ctx, u._id, t.course);
  return t;
}
function checkIndex(t: Doc<"attempts">, index: number) {
  if (!Number.isInteger(index) || index < 0 || index >= t.questions.length)
    throw new Error("题号无效");
}
async function finishQuestion(
  ctx: MutationCtx,
  t: Doc<"attempts">,
  index: number,
  value: string | string[] | null,
  timedOut: boolean,
) {
  if (t.status === "submitted" || t.lockedAt?.[index]) return;
  const now = Date.now();
  const answers = [...t.answers];
  answers[index] = value;
  const lockedAt = [...(t.lockedAt ?? t.questions.map(() => null))];
  lockedAt[index] = now;
  const expired = [...(t.timedOut ?? t.questions.map(() => false))];
  expired[index] = timedOut;
  const complete = lockedAt.every((x) => x !== null);
  await ctx.db.patch(t._id, {
    answers,
    lockedAt,
    timedOut: expired,
    revision: t.revision + 1,
  });
  if (!complete) return;
  const qs = await Promise.all(t.questions.map((id) => ctx.db.get(id)));
  const score =
    (100 *
      qs.filter((q, i) => q && grade(q.type, q.answer, answers[i])).length) /
    qs.length;
  await ctx.db.patch(t._id, { status: "submitted", score, submitted: now });
  const p = await ctx.db
    .query("progress")
    .withIndex("pair", (q) =>
      q.eq("student", t.student).eq("lecture", t.lecture),
    )
    .unique();
  if (p)
    await ctx.db.patch(p._id, {
      completed: p.completed + 1,
      best: Math.max(p.best, score),
      latest: score,
      updated: now,
    });
  else
    await ctx.db.insert("progress", {
      student: t.student,
      lecture: t.lecture,
      course: t.course,
      completed: 1,
      best: score,
      latest: score,
      updated: now,
    });
}
export const openQuestion = mutation({
  args: { token: v.string(), id: v.id("attempts"), index: v.number() },
  handler: async (ctx, a) => {
    const t = await owned(ctx, a.token, a.id);
    checkIndex(t, a.index);
    if (t.status === "submitted" || t.lockedAt?.[a.index]) return;
    if (a.index > 0 && !t.lockedAt?.[a.index - 1])
      throw new Error("请先提交上一题");
    const deadlines = [...(t.deadlines ?? t.questions.map(() => null))];
    if (deadlines[a.index] !== null) {
      if (Date.now() >= deadlines[a.index]!)
        await finishQuestion(ctx, t, a.index, t.answers[a.index], true);
      return;
    }
    const q = await ctx.db.get(t.questions[a.index]);
    if (!q) throw new Error("题目不存在");
    const deadline = Date.now() + (q.timeLimitSeconds ?? 30) * 1000;
    deadlines[a.index] = deadline;
    await ctx.db.patch(t._id, { deadlines });
    await ctx.scheduler.runAt(deadline, internal.learning.expireQuestion, {
      id: t._id,
      index: a.index,
    });
  },
});
export const expireQuestion = internalMutation({
  args: { id: v.id("attempts"), index: v.number() },
  handler: async (ctx, a) => {
    const t = await ctx.db.get(a.id);
    if (!t || !t.deadlines?.[a.index] || Date.now() < t.deadlines[a.index]!)
      return;
    await finishQuestion(ctx, t, a.index, t.answers[a.index], true);
  },
});
async function answerQuestion(
  ctx: MutationCtx,
  a: {
    token: string;
    id: Id<"attempts">;
    index: number;
    value: string | string[] | null;
  },
  submit: boolean,
) {
  const t = await owned(ctx, a.token, a.id);
  checkIndex(t, a.index);
  if (t.status === "submitted" || t.lockedAt?.[a.index]) return;
  const deadline = t.deadlines?.[a.index];
  if (deadline == null) throw new Error("请先打开本题");
  if (Date.now() >= deadline) {
    await finishQuestion(ctx, t, a.index, t.answers[a.index], true);
    return;
  }
  if (JSON.stringify(a.value).length > 10000) throw new Error("答案过长");
  const q = await ctx.db.get(t.questions[a.index]);
  if (!q) throw new Error("题目不存在");
  if (a.value !== null) {
    const choices = Array.isArray(a.value) ? a.value : [a.value];
    if (
      (q.type === "multiple_choice"
        ? !Array.isArray(a.value)
        : typeof a.value !== "string") ||
      (q.type !== "fill_blank" &&
        choices.some((x) => !q.options?.some((o) => o.id === x)))
    )
      throw new Error("答案格式错误");
  }
  if (submit) await finishQuestion(ctx, t, a.index, a.value, false);
  else {
    const answers = [...t.answers];
    answers[a.index] = a.value;
    await ctx.db.patch(t._id, { answers, revision: t.revision + 1 });
  }
}
const questionArgs = {
  token: v.string(),
  id: v.id("attempts"),
  index: v.number(),
  value: answer,
};
export const saveQuestion = mutation({
  args: questionArgs,
  handler: (ctx, a) => answerQuestion(ctx, a, false),
});
export const submitQuestion = mutation({
  args: questionArgs,
  handler: (ctx, a) => answerQuestion(ctx, a, true),
});
export const history = query({
  args: { token: v.string(), paginationOpts: paginationOptsValidator },
  handler: async (ctx, a) => {
    const u = await student(ctx, a.token);
    const r = await ctx.db
      .query("attempts")
      .withIndex("student", (q) => q.eq("student", u._id))
      .order("desc")
      .paginate(a.paginationOpts);
    return {
      ...r,
      page: r.page.map((t) => ({
        id: t._id,
        title: t.lectureTitle,
        status: t.status,
        score: t.score,
        started: t.started,
      })),
    };
  },
});
