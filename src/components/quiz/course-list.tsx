"use client";
import Link from "next/link";
import { BookOpenCheck, ArrowRight } from "lucide-react";
import { useQuizQuery } from "@/lib/api";
export function QuizCourseList() {
  const { data, error } = useQuizQuery("learning:courses");
  if (error) return <p role="alert">{error}</p>;
  if (!data) return <p>正在加载课程…</p>;
  if (!data.length)
    return (
      <p className="rounded-xl border border-dashed p-8 text-slate-500">
        暂无已分配课程，请联系课程管理员。
      </p>
    );
  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {data.map((c) => (
        <Link
          href={`/courses/${c.slug}`}
          key={c._id}
          className="group overflow-hidden rounded-2xl border bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-md"
        >
          <div className="flex h-32 items-center justify-center bg-primary/5">
            <BookOpenCheck className="h-12 w-12 text-primary" />
          </div>
          <div className="space-y-3 p-6">
            <p className="text-xs text-slate-500">{c.term}</p>
            <h2 className="text-xl font-bold">{c.title}</h2>
            <p className="text-sm text-slate-500">{c.description}</p>
            <p className="text-sm">
              {c.total
                ? `已完成 ${c.completed} / ${c.total} 讲`
                : "暂无已发布练习"}
            </p>
            <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full bg-primary"
                style={{
                  width: `${c.total ? (100 * (c.completed || 0)) / c.total : 0}%`,
                }}
              />
            </div>
            {c.best != null && (
              <p className="text-xs text-slate-500">
                最高单讲成绩 {c.best.toFixed(1)} 分 · 最近练习{" "}
                {c.updated ? new Date(c.updated).toLocaleDateString() : "—"}
              </p>
            )}
            <span className="flex items-center gap-2 text-sm font-semibold text-primary">
              进入课程 <ArrowRight className="h-4 w-4" />
            </span>
          </div>
        </Link>
      ))}
    </div>
  );
}
