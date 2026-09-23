"use client";
import { ChangePasswordForm } from "@/components/quiz/change-password-form";
import Link from "next/link";
import { useState } from "react";
import { useQuizQuery } from "@/lib/api";
import { QuizCourseList } from "@/components/quiz/course-list";
import { Button } from "@/components/ui/button";
export default function Page() {
  const { data: user } = useQuizQuery("learning:me");
  const [cursor, setCursor] = useState<string | null>(null);
  const { data: history, error } = useQuizQuery("learning:history", {
    paginationOpts: { cursor, numItems: 20 },
  });
  return (
    <div className="container-custom space-y-8 py-12">
      <div className="rounded-2xl border bg-white p-6">
        <p className="text-sm text-slate-500">我的学习</p>
        <h1 className="mt-2 text-3xl font-bold">{user?.name}</h1>
        <p className="mt-2 text-slate-500">学号 {user?.studentId}</p>
      </div>
      <ChangePasswordForm />
      <h2 className="text-xl font-bold">课程进度</h2>
      <QuizCourseList />
      <h2 className="text-xl font-bold">练习记录</h2>
      {error && <p role="alert">{error}</p>}
      <div className="space-y-3">
        {history?.page.map((t) => (
          <Link
            key={t.id}
            href={`/attempts/${t.id}`}
            className="flex flex-wrap justify-between gap-3 rounded-xl border bg-white p-4"
          >
            <span>
              {t.title}
              <small className="ml-3 text-slate-500">
                {new Date(t.started).toLocaleString()}
              </small>
            </span>
            <span>
              {t.status === "active"
                ? "继续练习 →"
                : `${t.score?.toFixed(1)} 分`}
            </span>
          </Link>
        ))}
        {history && !history.page.length && (
          <p className="text-slate-500">暂无练习记录。</p>
        )}
      </div>
      <div className="flex gap-3">
        {cursor && (
          <Button variant="outline" onClick={() => setCursor(null)}>
            返回最新
          </Button>
        )}
        {history && !history.isDone && (
          <Button onClick={() => setCursor(history.continueCursor)}>
            更早记录
          </Button>
        )}
      </div>
    </div>
  );
}
