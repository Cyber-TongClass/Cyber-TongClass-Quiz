import type { QueryCtx, MutationCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
export async function hash(value: string) {
  return Array.from(
    new Uint8Array(
      await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)),
    ),
  )
    .map((x) => x.toString(16).padStart(2, "0"))
    .join("");
}
export async function student(ctx: QueryCtx | MutationCtx, token: string) {
  const digest = await hash(token);
  const session = await ctx.db
    .query("sessions")
    .withIndex("hash", (q) => q.eq("hash", digest))
    .unique();
  const user = session ? await ctx.db.get(session.student) : null;
  if (
    !session ||
    session.expires < Date.now() ||
    !user ||
    user.status !== "active" ||
    session.version !== user.version
  )
    throw new Error("登录已过期，请重新登录");
  return user;
}
export async function access(
  ctx: QueryCtx | MutationCtx,
  user: Id<"students">,
  course: Id<"courses">,
) {
  const c = await ctx.db.get(course);
  const e = await ctx.db
    .query("enrollments")
    .withIndex("pair", (q) => q.eq("student", user).eq("course", course))
    .unique();
  if (!c?.published || c.deletedAt || !e?.active)
    throw new Error("无权访问此课程");
  return c;
}
export function identity(u: {
  _id: Id<"students">;
  studentId: string;
  name: string;
  status: string;
}) {
  return { id: u._id, studentId: u.studentId, name: u.name, status: u.status };
}
export function grade(
  type: string,
  expected: string | string[],
  actual: string | string[] | null,
) {
  if (type === "multiple_choice")
    return (
      Array.isArray(actual) &&
      JSON.stringify([...new Set(actual)].sort()) ===
        JSON.stringify(
          [...new Set(Array.isArray(expected) ? expected : [expected])].sort(),
        )
    );
  const norm = (s: string) => s.normalize("NFC").trim().toLowerCase();
  return (
    typeof actual === "string" &&
    (Array.isArray(expected) ? expected : [expected]).some((x) =>
      type === "fill_blank" ? norm(x) === norm(actual) : x === actual,
    )
  );
}
