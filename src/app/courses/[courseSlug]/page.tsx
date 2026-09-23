"use client";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { useQuizQuery, useQuizCommands } from "@/lib/api";
import { Button } from "@/components/ui/button";
export default function Page() {
  const { courseSlug } = useParams<{ courseSlug: string }>(),
    router = useRouter(),
    command = useQuizCommands();
  const { data, error } = useQuizQuery("learning:course", { slug: courseSlug });
  const [failure, setFailure] = useState("");
  const [busy, setBusy] = useState(false);
  async function start(lecture: string) {
    setBusy(true);
    setFailure("");
    try {
      const id = await command<string>("learning:start", { lecture });
      router.push(`/attempts/${id}`);
    } catch (e) {
      setFailure(e instanceof Error ? e.message : "无法开始练习");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="container-custom max-w-4xl py-12">
      <h1 className="text-3xl font-bold">{data?.title || "课程练习"}</h1>
      <p className="mb-8 mt-3 text-slate-500">{data?.description}</p>
      {(error || failure) && (
        <p role="alert" className="mb-4 text-red-700">
          {error || failure}
        </p>
      )}
      <div className="space-y-4">
        {data?.lectures.map((l) => (
          <div
            key={l._id}
            className="flex flex-wrap items-center justify-between gap-5 rounded-xl border bg-white p-5 shadow-sm"
          >
            <div>
              <p className="text-xs text-slate-500">
                第 {l.order} 讲 · {l.drawCount} 题
              </p>
              <h2 className="my-2 text-lg font-bold">{l.title}</h2>
              <p className="text-sm text-slate-500">
                {l.progress
                  ? `已完成 ${l.progress.completed} 次 · 最高 ${l.progress.best.toFixed(1)} 分 · 最近 ${l.progress.latest.toFixed(1)} 分`
                  : "尚未完成"}
              </p>
            </div>
            <Button disabled={busy} onClick={() => void start(l._id)}>
              {l.progress ? "继续练习" : "开始练习"}
            </Button>
          </div>
        ))}
        {data && !data.lectures.length && <p>暂无已发布练习。</p>}
      </div>
    </div>
  );
}
