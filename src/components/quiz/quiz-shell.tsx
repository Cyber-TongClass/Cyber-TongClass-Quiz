"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpenCheck, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  useQuizQuery,
  useQuizToken,
  useQuizLogout,
  quizConfigurationError,
} from "@/lib/api";
export function QuizShell({ children }: { children: React.ReactNode }) {
  const token = useQuizToken(),
    path = usePathname(),
    logout = useQuizLogout();
  const { data: user, error } = useQuizQuery("learning:me");
  const open = path === "/login" || path === "/activate";
  const config = quizConfigurationError();
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <header className="border-b bg-white/90">
        <div className="container-custom flex min-h-20 flex-wrap items-center justify-between gap-3 py-3">
          <Link href="/" className="flex items-center gap-3 font-semibold">
            <span className="rounded-xl bg-primary p-2 text-white">
              <BookOpenCheck />
            </span>
            课程练习{" "}
            <span className="hidden text-xs text-slate-500 sm:inline">
              TongClass Practice
            </span>
          </Link>
          <div className="flex items-center gap-2">
            {user ? (
              <>
                <Button asChild variant="ghost">
                  <Link href="/account">
                    <UserRound className="mr-2 h-4 w-4" />
                    {user.name}
                  </Link>
                </Button>
                <Button
                  variant="outline"
                  onClick={() => void logout().catch(() => {})}
                >
                  退出
                </Button>
              </>
            ) : (
              <Button asChild variant="outline">
                <Link href="/login">登录</Link>
              </Button>
            )}
          </div>
        </div>
      </header>
      {config ? (
        <div role="alert" className="container-custom py-16">
          {config}
        </div>
      ) : open ? (
        children
      ) : !token || user === null ? (
        <div className="container-custom py-20 text-center">
          <h1 className="text-2xl font-bold">请登录课程练习平台</h1>
          <p className="my-4 text-slate-500">
            使用课程管理员分配的账号查看课程和学习进度。
          </p>
          <Button asChild>
            <Link href={`/login?next=${encodeURIComponent(path)}`}>
              前往登录
            </Link>
          </Button>
        </div>
      ) : error ? (
        <p role="alert" className="container-custom py-12">
          {error}
        </p>
      ) : user === undefined ? (
        <p className="container-custom py-12">正在加载账号…</p>
      ) : (
        children
      )}
    </div>
  );
}
