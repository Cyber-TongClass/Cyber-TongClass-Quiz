import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
export const answer = v.union(v.string(), v.array(v.string()), v.null());
export const question = v.object({
  id: v.string(),
  type: v.union(
    v.literal("single_choice"),
    v.literal("multiple_choice"),
    v.literal("fill_blank"),
  ),
  difficulty: v.optional(
    v.union(v.literal("easy"), v.literal("medium"), v.literal("hard")),
  ),
  stem: v.string(),
  timeLimitSeconds: v.optional(v.number()),
  explanation: v.optional(v.string()),
  options: v.optional(v.array(v.object({ id: v.string(), text: v.string() }))),
  answer: v.union(v.string(), v.array(v.string())),
});
export default defineSchema({
  students: defineTable({
    provisioningBatch: v.optional(v.string()),
    studentId: v.string(),
    name: v.string(),
    status: v.union(v.literal("active"), v.literal("disabled")),
    password: v.optional(v.string()),
    activationHash: v.optional(v.string()),
    activationExpires: v.optional(v.number()),
    version: v.number(),
  }).index("studentId", ["studentId"]),
  sessions: defineTable({
    student: v.id("students"),
    hash: v.string(),
    expires: v.number(),
    version: v.number(),
  }).index("hash", ["hash"]),
  limits: defineTable({
    key: v.string(),
    count: v.number(),
    reset: v.number(),
  }).index("key", ["key"]),
  courses: defineTable({
    deletedAt: v.optional(v.number()),
    slug: v.string(),
    title: v.string(),
    term: v.string(),
    description: v.string(),
    published: v.boolean(),
  }).index("slug", ["slug"]),
  enrollments: defineTable({
    student: v.id("students"),
    course: v.id("courses"),
    active: v.boolean(),
  })
    .index("student", ["student"])
    .index("course", ["course"])
    .index("pair", ["student", "course"]),
  banks: defineTable({
    key: v.string(),
    title: v.string(),
    expected: v.number(),
    status: v.union(v.literal("draft"), v.literal("ready")),
  }).index("key", ["key"]),
  questions: defineTable({ bank: v.id("banks"), ...question.fields })
    .index("bank", ["bank"])
    .index("source", ["bank", "id"]),
  lectures: defineTable({
    deletedAt: v.optional(v.number()),
    course: v.id("courses"),
    slug: v.string(),
    title: v.string(),
    order: v.number(),
    bank: v.id("banks"),
    sampling: v.optional(v.literal("stratified-334")),
    drawCount: v.number(),
    published: v.boolean(),
  })
    .index("course", ["course"])
    .index("slug", ["course", "slug"]),
  attempts: defineTable({
    student: v.id("students"),
    course: v.id("courses"),
    lecture: v.id("lectures"),
    lectureTitle: v.string(),
    questions: v.array(v.id("questions")),
    answers: v.array(answer),
    deadlines: v.optional(v.array(v.union(v.number(), v.null()))),
    lockedAt: v.optional(v.array(v.union(v.number(), v.null()))),
    timedOut: v.optional(v.array(v.boolean())),
    revision: v.number(),
    status: v.union(v.literal("active"), v.literal("submitted")),
    started: v.number(),
    submitted: v.optional(v.number()),
    score: v.optional(v.number()),
    policy: v.literal("practice-v1"),
  })
    .index("student", ["student"])
    .index("lecture", ["student", "lecture"]),
  progress: defineTable({
    student: v.id("students"),
    lecture: v.id("lectures"),
    course: v.id("courses"),
    completed: v.number(),
    best: v.number(),
    latest: v.number(),
    updated: v.number(),
  })
    .index("student", ["student"])
    .index("pair", ["student", "lecture"])
    .index("course", ["course"]),
  audit: defineTable({
    actor: v.string(),
    operation: v.string(),
    at: v.number(),
  }),
});
