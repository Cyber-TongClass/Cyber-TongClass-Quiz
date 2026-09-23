import { student } from "./lib";
import { internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";
export const lookup = internalQuery({
  args: { studentId: v.string() },
  handler: async (ctx, a) =>
    ctx.db
      .query("students")
      .withIndex("studentId", (q) => q.eq("studentId", a.studentId))
      .unique(),
});
export const limit = internalMutation({
  args: { key: v.string() },
  handler: async (ctx, a) => {
    const old = await ctx.db
      .query("limits")
      .withIndex("key", (q) => q.eq("key", a.key))
      .unique();
    const now = Date.now();
    if (old && old.reset > now) {
      if (old.count >= 10) return false;
      await ctx.db.patch(old._id, { count: old.count + 1 });
    } else if (old)
      await ctx.db.patch(old._id, { count: 1, reset: now + 900000 });
    else
      await ctx.db.insert("limits", {
        key: a.key,
        count: 1,
        reset: now + 900000,
      });
    return true;
  },
});
export const issue = internalMutation({
  args: {
    student: v.id("students"),
    version: v.number(),
    hash: v.string(),
    password: v.optional(v.string()),
    activationHash: v.optional(v.string()),
  },
  handler: async (ctx, a) => {
    const u = await ctx.db.get(a.student);
    if (!u || u.status !== "active" || u.version !== a.version)
      throw new Error("凭据无效");
    let version = u.version;
    if (a.password) {
      if (
        !a.activationHash ||
        u.activationHash !== a.activationHash ||
        (u.activationExpires || 0) < Date.now()
      )
        throw new Error("激活码无效或已过期");
      version++;
      await ctx.db.patch(u._id, {
        password: a.password,
        activationHash: undefined,
        activationExpires: undefined,
        version,
      });
    }
    await ctx.db.insert("sessions", {
      student: u._id,
      hash: a.hash,
      version,
      expires: Date.now() + 7 * 86400000,
    });
    return null;
  },
});

export const credentials = internalQuery({
  args: { token: v.string() },
  handler: (ctx, a) => student(ctx, a.token),
});
export const changePassword = internalMutation({
  args: {
    token: v.string(),
    version: v.number(),
    expectedPassword: v.string(),
    password: v.string(),
    hash: v.string(),
  },
  handler: async (ctx, a) => {
    const u = await student(ctx, a.token);
    if (u.version !== a.version || u.password !== a.expectedPassword)
      throw new Error("密码已更新，请重新登录");
    const version = u.version + 1;
    await ctx.db.patch(u._id, {
      password: a.password,
      version,
      activationHash: undefined,
      activationExpires: undefined,
    });
    await ctx.db.insert("sessions", {
      student: u._id,
      hash: a.hash,
      version,
      expires: Date.now() + 7 * 86400000,
    });
    await ctx.db.insert("audit", {
      actor: u.studentId,
      operation: "student:changePassword",
      at: Date.now(),
    });
    return null;
  },
});
