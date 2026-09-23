// Operator-only helpers for the manually triggered local roster script.
import { internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";
const KEEP_STUDENT = "T1790178749366";
const KEEP_COURSE = "test-1790178749366";
const testStudent = (id: string) =>
  /^(T\d{13}B?|EDIT\d{13}|TIMING\d{13})$/.test(id);
const testCourse = (slug: string) =>
  /^(test|edit-test|timing)-\d{13}$/.test(slug);
export const inventory = internalQuery({
  args: {},
  handler: async (ctx) => ({
    students: (await ctx.db.query("students").collect()).map((u) => ({
      id: u._id,
      studentId: u.studentId,
      name: u.name,
      batch: u.provisioningBatch,
    })),
    courses: await ctx.db.query("courses").collect(),
    lectures: await ctx.db.query("lectures").collect(),
    banks: await ctx.db.query("banks").collect(),
  }),
});
export const provision = internalMutation({
  args: {
    batch: v.string(),
    course: v.id("courses"),
    rows: v.array(
      v.object({
        studentId: v.string(),
        name: v.string(),
        password: v.string(),
      }),
    ),
  },
  handler: async (ctx, a) => {
    const course = await ctx.db.get(a.course);
    if (
      !course ||
      course.slug !== "tong-2026" ||
      a.batch !== "roster-20260924" ||
      a.rows.length > 50
    )
      throw new Error("Invalid local roster batch");
    const seen = new Set<string>();
    let created = 0,
      existing = 0;
    for (const row of a.rows) {
      if (
        !/^[A-Z0-9_-]{1,64}$/.test(row.studentId) ||
        !row.name.trim() ||
        seen.has(row.studentId) ||
        !/^scrypt\$32768\$8\$3\$[a-f0-9]{32}\$[a-f0-9]{128}$/.test(row.password)
      )
        throw new Error("Invalid roster entry");
      seen.add(row.studentId);
      const old = await ctx.db
        .query("students")
        .withIndex("studentId", (q) => q.eq("studentId", row.studentId))
        .unique();
      if (old && old.provisioningBatch !== a.batch)
        throw new Error("Existing account conflict: " + row.studentId);
      const id = old
        ? old._id
        : await ctx.db.insert("students", {
            ...row,
            status: "active",
            version: 0,
            provisioningBatch: a.batch,
          });
      if (old) existing++;
      else created++;
      const enrollment = await ctx.db
        .query("enrollments")
        .withIndex("pair", (q) => q.eq("student", id).eq("course", a.course))
        .unique();
      if (!enrollment)
        await ctx.db.insert("enrollments", {
          student: id,
          course: a.course,
          active: true,
        });
    }
    return { created, existing };
  },
});
export const cleanup = internalMutation({
  args: { execute: v.boolean() },
  handler: async (ctx, a) => {
    const students = await ctx.db.query("students").collect(),
      courses = await ctx.db.query("courses").collect();
    const keep = students.find((u) => u.studentId === KEEP_STUDENT),
      keepCourse = courses.find((c) => c.slug === KEEP_COURSE);
    if (!keep || !keepCourse)
      throw new Error(
        "Known internal test fixture not found; inspect before cleanup",
      );
    const tests = students.filter((u) => testStudent(u.studentId)),
      removedStudents = tests.filter((u) => u._id !== keep._id);
    const removedCourses = courses.filter(
      (c) => testCourse(c.slug) && c._id !== keepCourse._id,
    );
    const studentIds = new Set(removedStudents.map((u) => u._id)),
      testIds = new Set(tests.map((u) => u._id)),
      courseIds = new Set(removedCourses.map((c) => c._id));
    const lectures = await ctx.db.query("lectures").collect();
    const removedLectures = lectures.filter((l) => courseIds.has(l.course));
    const allAttempts = await ctx.db.query("attempts").collect();
    const attempts = allAttempts.filter(
      (t) => testIds.has(t.student) || courseIds.has(t.course),
    );
    // Never cascade away an unrecognized student's work.
    if (attempts.some((t) => !testIds.has(t.student)))
      throw new Error("Non-test student attempt in a synthetic course");
    const progress = (await ctx.db.query("progress").collect()).filter(
      (p) => testIds.has(p.student) || courseIds.has(p.course),
    );
    if (progress.some((p) => !testIds.has(p.student)))
      throw new Error("Non-test progress in a synthetic course");
    const enrollments = (await ctx.db.query("enrollments").collect()).filter(
      (e) => studentIds.has(e.student) || courseIds.has(e.course),
    );
    if (enrollments.some((e) => !testIds.has(e.student)))
      throw new Error("Non-test enrollment in a synthetic course");
    const sessions = (await ctx.db.query("sessions").collect()).filter((s) =>
      studentIds.has(s.student),
    );
    const banks = await ctx.db.query("banks").collect(),
      questions = await ctx.db.query("questions").collect();
    const remainingLectures = lectures.filter((l) => !courseIds.has(l.course));
    const remainingAttempts = allAttempts.filter(
      (t) => !attempts.some((x) => x._id === t._id),
    );
    const referencedQuestions = new Set(
      remainingAttempts.flatMap((t) => t.questions),
    );
    const syntheticBanks = new Set(
      lectures
        .filter((l) =>
          testCourse(courses.find((c) => c._id === l.course)?.slug ?? ""),
        )
        .map((l) => l.bank),
    );
    const syntheticParents = new Set<string>([
      ...courses.filter((c) => testCourse(c.slug)).map((c) => c._id),
      ...lectures
        .filter((l) =>
          testCourse(courses.find((c) => c._id === l.course)?.slug ?? ""),
        )
        .map((l) => l._id),
    ]);
    const removedBanks = banks.filter(
      (b) =>
        (syntheticBanks.has(b._id) ||
          (b.key.startsWith("edit:") &&
            syntheticParents.has(b.key.split(":")[1])) ||
          /^(test-|timing-)\d{13}/.test(b.key) ||
          /^\d{13}(old|new)$/.test(b.key)) &&
        !remainingLectures.some((l) => l.bank === b._id) &&
        !questions.some(
          (q) => q.bank === b._id && referencedQuestions.has(q._id),
        ),
    );
    const bankIds = new Set(removedBanks.map((b) => b._id));
    const removedQuestions = questions.filter((q) => bankIds.has(q.bank));
    const docs = [
      ...sessions,
      ...enrollments,
      ...progress,
      ...attempts,
      ...removedQuestions,
      ...removedLectures,
      ...removedBanks,
      ...removedCourses,
      ...removedStudents,
    ];
    if (a.execute) for (const doc of docs) await ctx.db.delete(doc._id);
    return {
      executed: a.execute,
      keepStudent: KEEP_STUDENT,
      keepCourse: KEEP_COURSE,
      students: removedStudents.length,
      courses: removedCourses.length,
      lectures: removedLectures.length,
      banks: removedBanks.length,
      questions: removedQuestions.length,
      attempts: attempts.length,
      progress: progress.length,
      enrollments: enrollments.length,
      sessions: sessions.length,
    };
  },
});
