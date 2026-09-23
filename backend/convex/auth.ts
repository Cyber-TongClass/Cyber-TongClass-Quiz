"use node";
import { action } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { randomBytes, createHash } from "node:crypto";
import { hashPassword, verifyPassword, validatePassword } from "./passwords";
const digest = (s: string) => createHash("sha256").update(s).digest("hex");
export const login = action({
  args: { studentId: v.string(), password: v.string() },
  handler: async (ctx, a): Promise<{ token: string }> => {
    const id = a.studentId.trim().toUpperCase();
    if (id.length > 64 || a.password.length > 256)
      throw new Error("学号或密码错误");
    if (
      !(await ctx.runMutation(internal.authStore.limit, {
        key: digest("login:" + id),
      }))
    )
      throw new Error("尝试次数过多，请15分钟后重试");
    const u = await ctx.runQuery(internal.authStore.lookup, { studentId: id });
    if (
      !(await verifyPassword(a.password, u?.password)) ||
      !u ||
      u.status !== "active"
    )
      throw new Error("学号或密码错误");
    const token = randomBytes(32).toString("hex");
    await ctx.runMutation(internal.authStore.issue, {
      student: u._id,
      version: u.version,
      hash: digest(token),
    });
    return { token };
  },
});
export const activate = action({
  args: { studentId: v.string(), code: v.string(), password: v.string() },
  handler: async (ctx, a): Promise<{ token: string }> => {
    const id = a.studentId.trim().toUpperCase();
    validatePassword(a.password);
    if (id.length > 64 || a.code.length > 128)
      throw new Error("激活码无效或已过期");
    if (
      !(await ctx.runMutation(internal.authStore.limit, {
        key: digest("activate:" + id),
      }))
    )
      throw new Error("尝试次数过多，请稍后再试");
    const u = await ctx.runQuery(internal.authStore.lookup, { studentId: id });
    if (
      !u ||
      u.status !== "active" ||
      u.activationHash !== digest(a.code) ||
      (u.activationExpires || 0) < Date.now()
    )
      throw new Error("激活码无效或已过期");
    const password = await hashPassword(a.password),
      token = randomBytes(32).toString("hex");
    await ctx.runMutation(internal.authStore.issue, {
      student: u._id,
      version: u.version,
      hash: digest(token),
      password,
      activationHash: digest(a.code),
    });
    return { token };
  },
});
export const changePassword = action({
  args: {
    token: v.string(),
    currentPassword: v.string(),
    newPassword: v.string(),
  },
  handler: async (ctx, a): Promise<{ token: string }> => {
    validatePassword(a.newPassword);
    if (a.currentPassword.length > 256) throw new Error("当前密码错误");
    const u = await ctx.runQuery(internal.authStore.credentials, {
      token: a.token,
    });
    if (
      !(await ctx.runMutation(internal.authStore.limit, {
        key: digest("password-change:" + u._id),
      }))
    )
      throw new Error("尝试次数过多，请15分钟后重试");
    if (!(await verifyPassword(a.currentPassword, u.password)))
      throw new Error("当前密码错误");
    const password = await hashPassword(a.newPassword),
      token = randomBytes(32).toString("hex");
    await ctx.runMutation(internal.authStore.changePassword, {
      token: a.token,
      version: u.version,
      expectedPassword: u.password!,
      password,
      hash: digest(token),
    });
    return { token };
  },
});
