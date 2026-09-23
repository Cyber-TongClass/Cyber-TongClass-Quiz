import type * as store from "./adminStore";
import type { FunctionReturnType, ApiFromModules } from "convex/server";
import { action } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { paginationOptsValidator } from "convex/server";
import { question } from "./schema";
import { hash } from "./lib";
async function authorize(token: string) {
  const raw =
    process.env.MAIN_AUTH_CONVEX_URL || "https://aiagora.pku.edu.cn/convex";
  const url = new URL(raw);
  if (
    url.protocol !== "https:" &&
    !(
      url.protocol === "http:" &&
      ["127.0.0.1", "localhost"].includes(url.hostname)
    )
  )
    throw new Error("Invalid auth endpoint");
  const response = await fetch(raw.replace(/\/$/, "") + "/api/query", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      path: "auth:currentUserBySession",
      args: { sessionToken: token },
      format: "json",
    }),
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) throw new Error("管理员身份服务暂不可用");
  const result = await response.json();
  const u = result.status === "success" ? result.value : null;
  if (
    !token ||
    !u ||
    !["admin", "super_admin"].includes(u.role) ||
    u.identityType !== "undergrad" ||
    u.status === "disabled" ||
    !(u._id || u.id)
  )
    throw new Error("没有管理权限或登录已过期");
  return `${url.origin}:${u._id || u.id}`;
}
const token = { mainToken: v.string() };
export const students = action({
  args: {
    ...token,
    search: v.string(),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (
    ctx,
    { mainToken, ...a },
  ): Promise<
    FunctionReturnType<
      ApiFromModules<{ store: typeof store }>["store"]["students"]
    >
  > => {
    await authorize(mainToken);
    return ctx.runQuery(internal.adminStore.students, a);
  },
});
export const detail = action({
  args: { ...token, id: v.id("students") },
  handler: async (
    ctx,
    { mainToken, ...a },
  ): Promise<
    FunctionReturnType<
      ApiFromModules<{ store: typeof store }>["store"]["detail"]
    >
  > => {
    await authorize(mainToken);
    return ctx.runQuery(internal.adminStore.detail, a);
  },
});
export const catalog = action({
  args: token,
  handler: async (
    ctx,
    a,
  ): Promise<
    FunctionReturnType<
      ApiFromModules<{ store: typeof store }>["store"]["catalog"]
    >
  > => {
    await authorize(a.mainToken);
    return ctx.runQuery(internal.adminStore.catalog, {});
  },
});
export const progress = action({
  args: {
    ...token,
    studentId: v.string(),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (
    ctx,
    { mainToken, ...a },
  ): Promise<
    FunctionReturnType<
      ApiFromModules<{ store: typeof store }>["store"]["progress"]
    >
  > => {
    await authorize(mainToken);
    return ctx.runQuery(internal.adminStore.progress, a);
  },
});
export const provision = action({
  args: {
    ...token,
    rows: v.array(v.object({ studentId: v.string(), name: v.string() })),
    course: v.optional(v.id("courses")),
    dryRun: v.boolean(),
  },
  handler: async (
    ctx,
    { mainToken, ...a },
  ): Promise<
    FunctionReturnType<
      ApiFromModules<{ store: typeof store }>["store"]["provision"]
    >
  > =>
    ctx.runMutation(internal.adminStore.provision, {
      ...a,
      actor: await authorize(mainToken),
    }),
});
export const updateStudent = action({
  args: {
    ...token,
    id: v.id("students"),
    name: v.string(),
    status: v.union(v.literal("active"), v.literal("disabled")),
  },
  handler: async (
    ctx,
    { mainToken, ...a },
  ): Promise<
    FunctionReturnType<
      ApiFromModules<{ store: typeof store }>["store"]["updateStudent"]
    >
  > =>
    ctx.runMutation(internal.adminStore.updateStudent, {
      ...a,
      actor: await authorize(mainToken),
    }),
});
export const reset = action({
  args: { ...token, id: v.id("students") },
  handler: async (ctx, a): Promise<{ code: string }> => {
    const actor = await authorize(a.mainToken);
    const code = Array.from(crypto.getRandomValues(new Uint8Array(24)))
      .map((x) => x.toString(16).padStart(2, "0"))
      .join("");
    await ctx.runMutation(internal.adminStore.reset, {
      actor,
      id: a.id,
      hash: await hash(code),
    });
    return { code };
  },
});
export const enroll = action({
  args: {
    ...token,
    student: v.id("students"),
    course: v.id("courses"),
    active: v.boolean(),
  },
  handler: async (
    ctx,
    { mainToken, ...a },
  ): Promise<
    FunctionReturnType<
      ApiFromModules<{ store: typeof store }>["store"]["enroll"]
    >
  > =>
    ctx.runMutation(internal.adminStore.enroll, {
      ...a,
      actor: await authorize(mainToken),
    }),
});
export const course = action({
  args: {
    ...token,
    id: v.optional(v.id("courses")),
    slug: v.string(),
    title: v.string(),
    description: v.string(),
    term: v.string(),
    published: v.boolean(),
  },
  handler: async (
    ctx,
    { mainToken, ...a },
  ): Promise<
    FunctionReturnType<
      ApiFromModules<{ store: typeof store }>["store"]["course"]
    >
  > =>
    ctx.runMutation(internal.adminStore.course, {
      ...a,
      actor: await authorize(mainToken),
    }),
});
export const lecture = action({
  args: {
    ...token,
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
  handler: async (
    ctx,
    { mainToken, ...a },
  ): Promise<
    FunctionReturnType<
      ApiFromModules<{ store: typeof store }>["store"]["lecture"]
    >
  > =>
    ctx.runMutation(internal.adminStore.lecture, {
      ...a,
      actor: await authorize(mainToken),
    }),
});
export const beginBank = action({
  args: { ...token, key: v.string(), title: v.string(), expected: v.number() },
  handler: async (
    ctx,
    { mainToken, ...a },
  ): Promise<
    FunctionReturnType<
      ApiFromModules<{ store: typeof store }>["store"]["beginBank"]
    >
  > =>
    ctx.runMutation(internal.adminStore.beginBank, {
      ...a,
      actor: await authorize(mainToken),
    }),
});
export const chunk = action({
  args: { ...token, bank: v.id("banks"), questions: v.array(question) },
  handler: async (
    ctx,
    { mainToken, ...a },
  ): Promise<
    FunctionReturnType<
      ApiFromModules<{ store: typeof store }>["store"]["chunk"]
    >
  > =>
    ctx.runMutation(internal.adminStore.chunk, {
      ...a,
      actor: await authorize(mainToken),
    }),
});
export const finishBank = action({
  args: { ...token, bank: v.id("banks") },
  handler: async (
    ctx,
    { mainToken, ...a },
  ): Promise<
    FunctionReturnType<
      ApiFromModules<{ store: typeof store }>["store"]["finishBank"]
    >
  > =>
    ctx.runMutation(internal.adminStore.finishBank, {
      ...a,
      actor: await authorize(mainToken),
    }),
});

export const courseState = action({
  args: {
    ...token,
    id: v.id("courses"),
    state: v.union(
      v.literal("published"),
      v.literal("hidden"),
      v.literal("deleted"),
    ),
  },
  handler: async (
    ctx,
    { mainToken, ...a },
  ): Promise<
    FunctionReturnType<
      ApiFromModules<{ store: typeof store }>["store"]["courseState"]
    >
  > =>
    ctx.runMutation(internal.adminStore.courseState, {
      ...a,
      actor: await authorize(mainToken),
    }),
});

export const lectureState = action({
  args: {
    ...token,
    id: v.id("lectures"),
    state: v.union(
      v.literal("published"),
      v.literal("hidden"),
      v.literal("deleted"),
    ),
  },
  handler: async (
    ctx,
    { mainToken, ...a },
  ): Promise<
    FunctionReturnType<
      ApiFromModules<{ store: typeof store }>["store"]["lectureState"]
    >
  > =>
    ctx.runMutation(internal.adminStore.lectureState, {
      ...a,
      actor: await authorize(mainToken),
    }),
});

export const bankQuestions = action({
  args: { ...token, bank: v.id("banks") },
  handler: async (
    ctx,
    { mainToken, ...a },
  ): Promise<
    FunctionReturnType<
      ApiFromModules<{ store: typeof store }>["store"]["bankQuestions"]
    >
  > => {
    await authorize(mainToken);
    return ctx.runQuery(internal.adminStore.bankQuestions, a);
  },
});

export const progressMatrix = action({
  args: { ...token, course: v.id("courses") },
  handler: async (
    ctx,
    { mainToken, course },
  ): Promise<
    FunctionReturnType<
      ApiFromModules<{ store: typeof store }>["store"]["progressMatrix"]
    >
  > => {
    await authorize(mainToken);
    return ctx.runQuery(internal.adminStore.progressMatrix, { course });
  },
});
