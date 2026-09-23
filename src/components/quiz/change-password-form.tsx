"use client";
import { useState, type FormEvent } from "react";
import { useQuizChangePassword } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
export function ChangePasswordForm() {
  const changePassword = useQuizChangePassword();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget,
      values = new FormData(form);
    const newPassword = String(values.get("newPassword"));
    setError("");
    setSuccess(false);
    if (newPassword.length < 8 || newPassword.length > 256) {
      setError("新密码须为8–256位");
      return;
    }
    if (newPassword !== String(values.get("confirmPassword"))) {
      setError("两次输入的新密码不一致");
      return;
    }
    setBusy(true);
    try {
      await changePassword({
        currentPassword: String(values.get("currentPassword")),
        newPassword,
      });
      form.reset();
      setSuccess(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "密码修改失败");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="rounded-2xl border bg-white p-6">
      <h2 className="text-xl font-bold">修改密码</h2>
      <p className="mt-2 text-sm text-slate-500">
        新密码至少8位。修改后，其他登录会话将失效。
      </p>
      <form className="mt-5 max-w-md space-y-4" onSubmit={submit}>
        <div className="space-y-2">
          <Label htmlFor="current-password">当前密码</Label>
          <Input
            id="current-password"
            name="currentPassword"
            type="password"
            autoComplete="current-password"
            required
            maxLength={256}
            disabled={busy}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="new-password">新密码（至少8位）</Label>
          <Input
            id="new-password"
            name="newPassword"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            maxLength={256}
            disabled={busy}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirm-password">确认新密码</Label>
          <Input
            id="confirm-password"
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            maxLength={256}
            disabled={busy}
          />
        </div>
        {error && (
          <p role="alert" className="text-sm text-red-700">
            {error}
          </p>
        )}
        {success && (
          <p role="status" className="text-sm text-green-700">
            密码已更新，当前会话保持登录。
          </p>
        )}
        <Button disabled={busy}>{busy ? "正在修改…" : "修改密码"}</Button>
      </form>
    </section>
  );
}
