"use client";
import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useQuizLogin } from "@/lib/api";
export function QuizLoginForm({ activate = false }: { activate?: boolean }) {
  const login = useQuizLogin(),
    router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setBusy(true);
    setError("");
    try {
      await login({
        studentId: String(form.get("studentId")),
        password: String(form.get("password")),
        ...(activate ? { code: String(form.get("code")) } : {}),
      });
      const next = new URLSearchParams(window.location.search).get("next");
      router.replace(
        next && /^\/(?:courses\/|attempts\/|account(?:[?#]|$)|$)/.test(next) && !next.includes("\\")
          ? next
          : "/",
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "登录失败");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="container-custom flex min-h-[75vh] items-center justify-center py-12">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>
            {activate ? "激活或重置课程账号" : "课程练习平台登录"}
          </CardTitle>
          <CardDescription>
            {activate
              ? "使用课程管理员提供的一次性激活码设置密码。"
              : "请使用课程分配的学号和密码登录。"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-5" onSubmit={submit}>
            <div className="space-y-2">
              <Label htmlFor="studentId">学号</Label>
              <Input
                id="studentId"
                name="studentId"
                autoComplete="username"
                required
                maxLength={64}
              />
            </div>
            {activate && (
              <div className="space-y-2">
                <Label htmlFor="code">一次性激活码</Label>
                <Input id="code" name="code" required autoComplete="off" />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="password">
                {activate ? "新密码（至少8位）" : "密码"}
              </Label>
              <Input
                id="password"
                name="password"
                type="password"
                required
                minLength={activate ? 8 : 1}
                maxLength={256}
                autoComplete={activate ? "new-password" : "current-password"}
              />
            </div>
            {error && (
              <p role="alert" className="text-sm text-red-700">
                {error}
              </p>
            )}
            <Button className="w-full" disabled={busy}>
              {busy ? "正在处理…" : activate ? "设置密码并登录" : "登录"}
            </Button>
          </form>
          <p className="mt-5 text-sm leading-6 text-slate-500">
            账号由课程管理员开通；如需重置密码，请联系课程管理员。
          </p>
          <Link
            className="mt-3 block text-sm text-primary"
            href={activate ? "/login" : "/activate"}
          >
            {activate ? "返回登录" : "首次使用 / 使用重置码"}
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
