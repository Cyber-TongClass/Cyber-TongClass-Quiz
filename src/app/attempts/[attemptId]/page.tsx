"use client";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useQuizQuery, useQuizCommands } from "@/lib/api";
import type { QuizAnswer, QuizAttempt } from "@/lib/quiz-contracts";
import { QuestionRenderer } from "@/components/quiz/question-renderer";
import { Button } from "@/components/ui/button";

function Runner({ attempt }: { attempt: QuizAttempt }) {
  const command = useQuizCommands();
  const [index, setIndex] = useState(() =>
    Math.max(
      0,
      attempt.verdicts.findIndex((v) => !v),
    ),
  );
  const [draft, setDraft] = useState<{
    index: number;
    value: QuizAnswer;
  } | null>(null);
  const [pending, setPending] = useState(0);
  const [error, setError] = useState("");
  const [now, setNow] = useState(Date.now());
  const queue = useRef<Promise<unknown>>(Promise.resolve());
  const clock = useRef({ server: attempt.serverNow, local: Date.now() });
  useEffect(() => {
    clock.current = { server: attempt.serverNow, local: Date.now() };
  }, [attempt.serverNow]);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 200);
    return () => clearInterval(timer);
  }, []);
  const verdict = attempt.verdicts[index];
  const deadline = attempt.deadlines[index];
  const submitted = attempt.status === "submitted";
  const remaining =
    deadline == null
      ? null
      : Math.max(
          0,
          Math.ceil(
            (deadline - clock.current.server - (now - clock.current.local)) /
              1000,
          ),
        );
  const value = verdict
    ? attempt.answers[index]
    : draft?.index === index
      ? draft.value
      : attempt.answers[index];

  function send(name: string, args: Record<string, unknown>) {
    setPending((n) => n + 1);
    setError("");
    const next = queue.current
      .catch(() => undefined)
      .then(() => command(name, { id: attempt.id, ...args }));
    queue.current = next;
    void next
      .catch((e) =>
        setError(e instanceof Error ? e.message : "保存失败，请检查连接后重试"),
      )
      .finally(() => setPending((n) => n - 1));
  }
  useEffect(() => {
    if (!submitted && !verdict && deadline == null)
      send("learning:openQuestion", { index });
  }, [index, submitted, !!verdict, deadline]); // eslint-disable-line react-hooks/exhaustive-deps

  // The server also expires questions when this tab is closed or disconnected.
  useEffect(() => {
    if (remaining === 0 && !verdict && !submitted)
      send("learning:submitQuestion", { index, value });
  }, [remaining, !!verdict, submitted, index]); // eslint-disable-line react-hooks/exhaustive-deps

  const hasAnswer = Array.isArray(value)
    ? value.length > 0
    : typeof value === "string" && value.trim().length > 0;
  return (
    <div className="container-custom max-w-3xl space-y-6 py-10">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">{attempt.title}</h1>
        <span className="font-mono text-slate-500">
          {index + 1} / {attempt.questions.length}
        </span>
      </div>
      {submitted && (
        <div className="rounded-xl bg-primary/5 p-5">
          <p className="text-2xl font-bold">
            本次成绩 {attempt.score?.toFixed(1)} 分
          </p>
          <p className="mt-2 text-sm">
            结果已记入学习进度，可以查看每题答案与解析。
          </p>
          <Link className="mt-3 inline-block text-primary" href="/account">
            查看我的学习 →
          </Link>
        </div>
      )}
      {error && (
        <div role="alert" className="space-y-2 text-red-700">
          <p>{error}</p>
          <Button
            variant="outline"
            disabled={pending > 0}
            onClick={() => {
              if (verdict) return;
              send(
                deadline == null
                  ? "learning:openQuestion"
                  : remaining === 0
                    ? "learning:submitQuestion"
                    : "learning:saveQuestion",
                deadline == null ? { index } : { index, value },
              );
            }}
          >
            重试
          </Button>
        </div>
      )}
      <div className="space-y-5 rounded-2xl border bg-white p-6 sm:p-8">
        {!verdict && !submitted && (
          <div className="flex items-center justify-between gap-4 text-sm">
            <p>提交后立即判分，答案不可修改。</p>
            <span
              role="timer"
              className={
                remaining !== null && remaining <= 5
                  ? "font-mono font-bold text-red-700"
                  : "font-mono font-bold"
              }
            >
              {remaining === null ? "正在开始计时…" : `剩余 ${remaining} 秒`}
            </span>
          </div>
        )}
        <QuestionRenderer
          question={attempt.questions[index]}
          value={value}
          verdict={verdict}
          disabled={
            !!verdict || submitted || remaining === null || remaining === 0
          }
          onChange={(answer: QuizAnswer) => {
            setDraft({ index, value: answer });
            send("learning:saveQuestion", { index, value: answer });
          }}
        />
        {!verdict && !submitted && (
          <Button
            disabled={
              !hasAnswer || remaining === null || remaining === 0 || pending > 0
            }
            onClick={() => send("learning:submitQuestion", { index, value })}
          >
            {remaining === 0
              ? "正在自动提交…"
              : pending > 0
                ? "正在保存…"
                : "提交本题"}
          </Button>
        )}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button
          variant="outline"
          disabled={!index}
          onClick={() => {
            setDraft(null);
            setIndex(index - 1);
          }}
        >
          上一题
        </Button>
        <span className="text-xs text-slate-500" aria-live="polite">
          {verdict
            ? "答案已锁定"
            : pending
              ? "正在保存…"
              : "选择会自动保存，超时自动提交"}
        </span>
        {index < attempt.questions.length - 1 ? (
          <Button
            disabled={!verdict}
            onClick={() => {
              setDraft(null);
              setIndex(index + 1);
            }}
          >
            下一题
          </Button>
        ) : submitted ? (
          <Button asChild>
            <Link href="/">返回课程</Link>
          </Button>
        ) : null}
      </div>
    </div>
  );
}
export default function Page() {
  const { attemptId } = useParams<{ attemptId: string }>();
  const { data, error } = useQuizQuery("learning:attempt", { id: attemptId });
  if (error)
    return (
      <p role="alert" className="container-custom py-12">
        {error}
      </p>
    );
  if (!data) return <p className="container-custom py-12">正在加载练习…</p>;
  return <Runner key={data.id} attempt={data} />;
}
