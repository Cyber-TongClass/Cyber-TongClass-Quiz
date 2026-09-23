"use client";
import { ConvexClient } from "convex/browser";
let client: ConvexClient | undefined;
export function quizConfigurationError(): string | null {
  const raw = process.env.NEXT_PUBLIC_QUIZ_CONVEX_URL;
  if (!raw) return "课程练习平台暂未连接，请联系课程管理员。";
  try {
    const url = new URL(raw);
    const local = ["localhost", "127.0.0.1"].includes(url.hostname);
    if (url.protocol !== "https:" && !(local && url.protocol === "http:"))
      throw new Error();
    if (
      url.username ||
      url.password ||
      url.search ||
      url.hash ||
      !local && !url.hostname.endsWith(".convex.cloud")
    )
      throw new Error();
  } catch {
    return "课程练习平台连接配置无效，请联系管理员。";
  }
  return null;
}
export function getQuizClient() {
  const error = quizConfigurationError();
  if (error) throw new Error(error);
  if (!client)
    client = new ConvexClient(process.env.NEXT_PUBLIC_QUIZ_CONVEX_URL!);
  return client;
}
