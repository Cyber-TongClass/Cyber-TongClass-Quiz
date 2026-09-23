import { internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { paginationOptsValidator } from "convex/server";
import { question } from "./schema";
import { identity } from "./lib";
const actor = { actor: v.string() };
export const students = internalQuery({
  args: { search: v.string(), paginationOpts: paginationOptsValidator },
  handler: async (ctx, a) => {
    const r = await ctx.db
      .query("students")
      .order("desc")
      .paginate(a.paginationOpts);
    return {
      ...r,
      page: r.page
        .filter((u) =>
          (u.name + u.studentId).toLowerCase().includes(a.search.toLowerCase()),
        )
        .map(identity),
    };
  },
});
export const detail = internalQuery({
  args: { id: v.id("students") },
  handler: async (ctx, a) => {
    const u = await ctx.db.get(a.id);
    if (!u) throw new Error("账号不存在");
    const enrollments = await ctx.db
      .query("enrollments")
      .withIndex("student", (q) => q.eq("student", u._id))
      .collect();
    return { ...identity(u), enrollments };
  },
});
export const catalog = internalQuery({
  args: {},
  handler: async (ctx) => ({
    courses: await ctx.db.query("courses").take(500),
    lectures: await ctx.db.query("lectures").take(2000),
    banks: await ctx.db.query("banks").take(500),
  }),
});
export const progress = internalQuery({
  args: { paginationOpts: paginationOptsValidator, studentId: v.string() },
  handler: async (ctx, a) => {
    const r = await ctx.db
      .query("progress")
      .order("desc")
      .paginate(a.paginationOpts);
    const rows = [];
    for (const p of r.page) {
      const u = await ctx.db.get(p.student);
      const l = await ctx.db.get(p.lecture);
      const c = await ctx.db.get(p.course);
      if (u && u.studentId.includes(a.studentId))
        rows.push({
          studentId: u.studentId,
          name: u.name,
          course: c?.title || "",
          lecture: l?.title || "",
          completed: p.completed,
          best: p.best,
          latest: p.latest,
          updated: p.updated,
        });
    }
    return { ...r, page: rows };
  },
});
export const provision = internalMutation({
  args: {
    ...actor,
    rows: v.array(v.object({ studentId: v.string(), name: v.string() })),
    course: v.optional(v.id("courses")),
    dryRun: v.boolean(),
  },
  handler: async (ctx, a) => {
    if (a.rows.length > 100) throw new Error("每批最多100人");
    if (a.course && !(await ctx.db.get(a.course)))
      throw new Error("课程不存在");
    let created = 0,
      updated = 0;
    const seen = new Set<string>();
    for (const row of a.rows) {
      const studentId = row.studentId.trim().toUpperCase(),
        name = row.name.trim();
      if (
        !/^[A-Z0-9_-]{1,64}$/.test(studentId) ||
        !name ||
        name.length > 100 ||
        seen.has(studentId)
      )
        throw new Error("学号/姓名格式错误或批内重复");
      seen.add(studentId);
      const old = await ctx.db
        .query("students")
        .withIndex("studentId", (q) => q.eq("studentId", studentId))
        .unique();
      if (old) updated++;
      else created++;
      if (a.dryRun) continue;
      const id = old
        ? old._id
        : await ctx.db.insert("students", {
            studentId,
            name,
            status: "active",
            version: 0,
          });
      if (old) await ctx.db.patch(id, { name });
      if (a.course) {
        const course = a.course;
        const e = await ctx.db
          .query("enrollments")
          .withIndex("pair", (q) => q.eq("student", id).eq("course", course))
          .unique();
        if (e) await ctx.db.patch(e._id, { active: true });
        else
          await ctx.db.insert("enrollments", {
            student: id,
            course,
            active: true,
          });
      }
    }
    if (!a.dryRun)
      await ctx.db.insert("audit", {
        actor: a.actor,
        operation: `provision:${created}:${updated}`,
        at: Date.now(),
      });
    return { created, updated, dryRun: a.dryRun };
  },
});
export const updateStudent = internalMutation({
  args: {
    ...actor,
    id: v.id("students"),
    name: v.string(),
    status: v.union(v.literal("active"), v.literal("disabled")),
  },
  handler: async (ctx, a) => {
    const u = await ctx.db.get(a.id);
    if (!u || !a.name.trim() || a.name.length > 100)
      throw new Error("账号或姓名无效");
    await ctx.db.patch(u._id, {
      name: a.name.trim(),
      status: a.status,
      version: u.version + 1,
    });
    await ctx.db.insert("audit", {
      actor: a.actor,
      operation: `student:${u._id}:${a.status}`,
      at: Date.now(),
    });
  },
});
export const reset = internalMutation({
  args: { ...actor, id: v.id("students"), hash: v.string() },
  handler: async (ctx, a) => {
    const u = await ctx.db.get(a.id);
    if (!u || u.status !== "active") throw new Error("账号未启用");
    await ctx.db.patch(u._id, {
      activationHash: a.hash,
      activationExpires: Date.now() + 86400000,
      password: undefined,
      version: u.version + 1,
    });
    await ctx.db.insert("audit", {
      actor: a.actor,
      operation: `reset:${u._id}`,
      at: Date.now(),
    });
  },
});
export const enroll = internalMutation({
  args: {
    ...actor,
    student: v.id("students"),
    course: v.id("courses"),
    active: v.boolean(),
  },
  handler: async (ctx, a) => {
    if (!(await ctx.db.get(a.student)) || !(await ctx.db.get(a.course)))
      throw new Error("账号或课程不存在");
    const e = await ctx.db
      .query("enrollments")
      .withIndex("pair", (q) =>
        q.eq("student", a.student).eq("course", a.course),
      )
      .unique();
    if (e) await ctx.db.patch(e._id, { active: a.active });
    else
      await ctx.db.insert("enrollments", {
        student: a.student,
        course: a.course,
        active: a.active,
      });
    await ctx.db.insert("audit", {
      actor: a.actor,
      operation: `enroll:${a.student}:${a.course}:${a.active}`,
      at: Date.now(),
    });
  },
});
export const course = internalMutation({
  args: {
    ...actor,
    id: v.optional(v.id("courses")),
    slug: v.string(),
    title: v.string(),
    description: v.string(),
    term: v.string(),
    published: v.boolean(),
  },
  handler: async (ctx, a) => {
    if (
      !/^[a-z0-9-]{1,80}$/.test(a.slug) ||
      !a.title.trim() ||
      a.title.length > 200 ||
      a.description.length > 5000 ||
      a.term.length > 100
    )
      throw new Error("课程格式错误");
    const c = await ctx.db
      .query("courses")
      .withIndex("slug", (q) => q.eq("slug", a.slug))
      .unique();
    if (a.id && c?._id !== a.id) throw new Error("课程已变更，请刷新");
    if (c?.deletedAt) throw new Error("请先恢复已删除课程");
    const { actor, id: requestedId, ...data } = a;
    const id = c ? c._id : await ctx.db.insert("courses", data);
    if (c) await ctx.db.patch(id, data);
    await ctx.db.insert("audit", {
      actor,
      operation: `course:${id}`,
      at: Date.now(),
    });
    return id;
  },
});
export const lecture = internalMutation({
  args: {
    ...actor,
    id: v.optional(v.id("lectures")),
    expectedBank: v.optional(v.id("banks")),
    course: v.id("courses"),
    slug: v.string(),
    title: v.string(),
    order: v.number(),
    bank: v.id("banks"),
    sampling: v.optional(v.literal("stratified-334")),
    drawCount: v.number(),
    published: v.boolean(),
  },
  handler: async (ctx, a) => {
    const b = await ctx.db.get(a.bank);
    if (
      !(await ctx.db.get(a.course)) ||
      !b ||
      b.status !== "ready" ||
      !Number.isInteger(a.drawCount) ||
      a.drawCount < 1 ||
      a.drawCount > b.expected ||
      a.drawCount > 100 ||
      !Number.isFinite(a.order) ||
      !a.title.trim() ||
      a.title.length > 200 ||
      !/^[a-z0-9-]{1,80}$/.test(a.slug)
    )
      throw new Error("讲次/题库设置无效");
    if (a.sampling === "stratified-334") {
      const qs = await ctx.db
        .query("questions")
        .withIndex("bank", (q) => q.eq("bank", a.bank))
        .collect();
      if (
        a.drawCount !== 10 ||
        qs.length !== 50 ||
        qs.some((q) => q.type !== "single_choice") ||
        qs.filter((q) => q.difficulty === "easy").length !== 15 ||
        qs.filter((q) => q.difficulty === "medium").length !== 15 ||
        qs.filter((q) => q.difficulty === "hard").length !== 20
      )
        throw new Error(
          "分层题库须包含15道简单、15道中等、20道困难单选题，每次抽取10题",
        );
    }
    const old = await ctx.db
      .query("lectures")
      .withIndex("slug", (q) => q.eq("course", a.course).eq("slug", a.slug))
      .unique();
    if (a.id && old?._id !== a.id) throw new Error("讲次已变更，请刷新");
    if (old?.deletedAt) throw new Error("请先恢复已删除讲次");
    if (a.expectedBank && old?.bank !== a.expectedBank)
      throw new Error("题目已被其他管理员修改，请重新打开编辑窗口");
    const parent = await ctx.db.get(a.course);
    if (parent?.deletedAt) throw new Error("课程已删除");
    const { actor, id: requestedId, expectedBank, ...data } = a;
    const id = old ? old._id : await ctx.db.insert("lectures", data);
    if (old) await ctx.db.patch(id, data);
    await ctx.db.insert("audit", {
      actor,
      operation: `lecture:${id}`,
      at: Date.now(),
    });
    return id;
  },
});
export const beginBank = internalMutation({
  args: { ...actor, key: v.string(), title: v.string(), expected: v.number() },
  handler: async (ctx, a) => {
    if (
      !a.key ||
      a.key.length > 128 ||
      !a.title.trim() ||
      a.title.length > 200 ||
      !Number.isInteger(a.expected) ||
      a.expected < 1 ||
      a.expected > 1000
    )
      throw new Error("题库信息无效，最多1000题");
    const old = await ctx.db
      .query("banks")
      .withIndex("key", (q) => q.eq("key", a.key))
      .unique();
    if (old) {
      if (old.expected !== a.expected || old.title !== a.title)
        throw new Error("同一导入键的题库信息不一致");
      return old._id;
    }
    const id = await ctx.db.insert("banks", {
      key: a.key,
      title: a.title,
      expected: a.expected,
      status: "draft",
    });
    await ctx.db.insert("audit", {
      actor: a.actor,
      operation: `bank:start:${id}`,
      at: Date.now(),
    });
    return id;
  },
});
export const chunk = internalMutation({
  args: { ...actor, bank: v.id("banks"), questions: v.array(question) },
  handler: async (ctx, a) => {
    const b = await ctx.db.get(a.bank);
    if (!b || a.questions.length > 25) throw new Error("每批最多25题");
    for (const q of a.questions) {
      const opts = q.options || [];
      const keys = Array.isArray(q.answer) ? q.answer : [q.answer];
      if (
        !Number.isInteger(q.timeLimitSeconds ?? 30) ||
        (q.timeLimitSeconds ?? 30) < 1 ||
        (q.timeLimitSeconds ?? 30) > 3600 ||
        (q.explanation?.length ?? 0) > 20000 ||
        !q.id ||
        q.id.length > 128 ||
        !q.stem.trim() ||
        q.stem.length > 20000 ||
        !keys.length ||
        keys.some((s) => !s.trim() || s.length > 5000) ||
        new Set(opts.map((o) => o.id)).size !== opts.length ||
        opts.some((o) => !o.id || !o.text || o.text.length > 5000) ||
        opts.length > 20
      )
        throw new Error("题目格式错误");
      if (
        q.type !== "fill_blank" &&
        (opts.length < 2 ||
          keys.some((k) => !opts.some((o) => o.id === k)) ||
          (q.type === "single_choice" && keys.length !== 1))
      )
        throw new Error("答案与选项不一致");
      const old = await ctx.db
        .query("questions")
        .withIndex("source", (x) => x.eq("bank", a.bank).eq("id", q.id))
        .unique();
      if (old) {
        const { _id, _creationTime, bank, ...value } = old;
        if (JSON.stringify(value) !== JSON.stringify(q)) {
          if (
            value.id !== q.id ||
            value.type !== q.type ||
            value.stem !== q.stem ||
            value.difficulty !== q.difficulty ||
            (value.timeLimitSeconds ?? 30) !== (q.timeLimitSeconds ?? 30) ||
            (value.explanation ?? "") !== (q.explanation ?? "") ||
            JSON.stringify(value.options) !== JSON.stringify(q.options) ||
            JSON.stringify(value.answer) !== JSON.stringify(q.answer)
          )
            throw new Error("导入键冲突，请创建新版本");
        }
      } else {
        if (b.status !== "draft") throw new Error("已发布题库不可更改");
        await ctx.db.insert("questions", { bank: a.bank, ...q });
      }
    }
    const total = (
      await ctx.db
        .query("questions")
        .withIndex("bank", (q) => q.eq("bank", a.bank))
        .take(1001)
    ).length;
    if (total > b.expected) throw new Error("题数超出预期");
    await ctx.db.insert("audit", {
      actor: a.actor,
      operation: `bank:chunk:${a.bank}:${a.questions.length}`,
      at: Date.now(),
    });
  },
});
export const finishBank = internalMutation({
  args: { ...actor, bank: v.id("banks") },
  handler: async (ctx, a) => {
    const b = await ctx.db.get(a.bank);
    const qs = await ctx.db
      .query("questions")
      .withIndex("bank", (q) => q.eq("bank", a.bank))
      .collect();
    if (!b || qs.length !== b.expected) throw new Error("题库导入未完成");
    await ctx.db.patch(b._id, { status: "ready" });
    await ctx.db.insert("audit", {
      actor: a.actor,
      operation: `bank:finish:${a.bank}`,
      at: Date.now(),
    });
  },
});

const visibility = v.union(
  v.literal("published"),
  v.literal("hidden"),
  v.literal("deleted"),
);
export const courseState = internalMutation({
  args: { ...actor, id: v.id("courses"), state: visibility },
  handler: async (ctx, a) => {
    const c = await ctx.db.get(a.id);
    if (!c) throw new Error("课程不存在");
    await ctx.db.patch(a.id, {
      published: a.state === "published",
      deletedAt: a.state === "deleted" ? Date.now() : undefined,
    });
    await ctx.db.insert("audit", {
      actor: a.actor,
      operation: `course:${a.id}:${a.state}`,
      at: Date.now(),
    });
  },
});
export const lectureState = internalMutation({
  args: { ...actor, id: v.id("lectures"), state: visibility },
  handler: async (ctx, a) => {
    const l = await ctx.db.get(a.id);
    if (!l) throw new Error("讲次不存在");
    const c = await ctx.db.get(l.course);
    if (!c || c.deletedAt) throw new Error("请先恢复所属课程");
    await ctx.db.patch(a.id, {
      published: a.state === "published",
      deletedAt: a.state === "deleted" ? Date.now() : undefined,
    });
    await ctx.db.insert("audit", {
      actor: a.actor,
      operation: `lecture:${a.id}:${a.state}`,
      at: Date.now(),
    });
  },
});
export const bankQuestions = internalQuery({
  args: { bank: v.id("banks") },
  handler: async (ctx, a) => {
    const bank = await ctx.db.get(a.bank);
    if (!bank || bank.status !== "ready") throw new Error("题库不可用");
    const qs = await ctx.db
      .query("questions")
      .withIndex("bank", (q) => q.eq("bank", a.bank))
      .collect();
    return qs.map((q) => ({
      id: q.id,
      type: q.type,
      stem: q.stem,
      ...(q.difficulty ? { difficulty: q.difficulty } : {}),
      ...(q.options ? { options: q.options } : {}),
      answer: q.answer,
      timeLimitSeconds: q.timeLimitSeconds ?? 30,
      explanation: q.explanation ?? "",
    }));
  },
});

export const progressMatrix = internalQuery({
  args: { course: v.id("courses") },
  handler: async (ctx, a) => {
    const course = await ctx.db.get(a.course);
    if (!course || course.deletedAt) throw new Error("课程不存在");
    const lectures = (
      await ctx.db
        .query("lectures")
        .withIndex("course", (q) => q.eq("course", a.course))
        .collect()
    )
      .filter((l) => !l.deletedAt)
      .sort((a, b) => a.order - b.order || a.slug.localeCompare(b.slug));
    const enrollments = (
      await ctx.db
        .query("enrollments")
        .withIndex("course", (q) => q.eq("course", a.course))
        .collect()
    ).filter((e) => e.active);
    const progress = await ctx.db
      .query("progress")
      .withIndex("course", (q) => q.eq("course", a.course))
      .collect();
    const byStudent = new Map<string, typeof progress>();
    for (const p of progress)
      byStudent.set(p.student, [...(byStudent.get(p.student) || []), p]);
    const rows = [];
    for (const enrollment of enrollments) {
      const u = await ctx.db.get(enrollment.student);
      if (!u) continue;
      const ps = byStudent.get(u._id) || [];
      rows.push({
        studentId: u.studentId,
        name: u.name,
        cells: Object.fromEntries(
          lectures.map((l) => {
            const p = ps.find((p) => p.lecture === l._id);
            return [l._id, p ? { completed: p.completed, best: p.best } : null];
          }),
        ),
      });
    }
    return {
      lectures,
      rows: rows.sort((a, b) => a.studentId.localeCompare(b.studentId)),
    };
  },
});
