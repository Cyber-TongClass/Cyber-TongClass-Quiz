"use client";

import type { QuizQuestion, QuizVerdict } from "@/lib/quiz-contracts";
import { Input } from "@/components/ui/input";
import { MarkdownRenderer } from "@/components/markdown/markdown-renderer";
import { cn } from "@/lib/utils";

const typeLabels = {
  single_choice: "单项选择",
  multiple_choice: "多项选择",
  fill_blank: "填空题",
} as const;

export function QuestionRenderer({
  question,
  value,
  onChange,
  disabled,
  verdict,
}: {
  question: QuizQuestion;
  value: string | string[] | null;
  onChange: (value: string | string[] | null) => void;
  disabled?: boolean;
  verdict?: QuizVerdict | null;
}) {
  const correctKeys = verdict
    ? Array.isArray(verdict.answer)
      ? verdict.answer
      : [verdict.answer]
    : [];
  const selected = Array.isArray(value) ? value : [];
  return (
    <div className="space-y-7">
      <div>
        <p className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-primary">
          {typeLabels[question.type as keyof typeof typeLabels]}
        </p>
        <MarkdownRenderer
          content={question.stem}
          className="text-base [&_p]:text-base [&_p]:leading-8 [&_p]:text-slate-900"
        />
      </div>

      {question.type === "fill_blank" ? (
        <div className="space-y-2">
          <label
            htmlFor={`answer-${question.id}`}
            className="text-sm font-semibold text-slate-900"
          >
            你的答案
          </label>
          <Input
            id={`answer-${question.id}`}
            value={typeof value === "string" ? value : ""}
            onChange={(event) => onChange(event.target.value)}
            disabled={disabled}
            className="h-12"
            autoComplete="off"
          />
        </div>
      ) : (
        <fieldset disabled={disabled} className="space-y-3">
          <legend className="sr-only">
            {typeLabels[question.type as keyof typeof typeLabels]}
          </legend>
          {(question.options || []).map((option) => {
            const checked =
              question.type === "multiple_choice"
                ? selected.includes(option.id)
                : value === option.id;
            return (
              <label
                key={option.id}
                className={cn(
                  "flex min-h-14 cursor-pointer items-start gap-3 rounded-xl border p-4 transition-colors",
                  verdict && correctKeys.includes(option.id)
                    ? "border-green-600 bg-green-50 ring-1 ring-green-600"
                    : verdict && checked
                      ? "border-red-600 bg-red-50 ring-1 ring-red-600"
                      : checked
                        ? "border-primary bg-primary/5 ring-1 ring-primary"
                        : "hover:border-slate-300 hover:bg-slate-50",
                  disabled && "cursor-not-allowed",
                )}
              >
                <input
                  type={
                    question.type === "multiple_choice" ? "checkbox" : "radio"
                  }
                  name={`question-${question.id}`}
                  value={option.id}
                  checked={checked}
                  onChange={() => {
                    if (question.type === "multiple_choice") {
                      onChange(
                        checked
                              ? selected.filter((id) => id !== option.id)
                              : [...selected, option.id],
                      );
                    } else {
                      onChange(option.id);
                    }
                  }}
                  className={cn(
                    "mt-1 h-4 w-4 border-slate-300 text-primary focus:ring-primary",
                    question.type === "multiple_choice"
                      ? "rounded"
                      : "rounded-full",
                  )}
                />
                {verdict && (correctKeys.includes(option.id) || checked) && (
                  <span className="sr-only">
                    {correctKeys.includes(option.id)
                      ? "正确答案"
                      : "你的错误答案"}
                  </span>
                )}
                <span className="font-semibold text-slate-700">
                  {option.id}.
                </span>
                <MarkdownRenderer
                  content={option.text}
                  className="min-w-0 flex-1 [&_p]:my-0 [&_p]:text-slate-800"
                />
              </label>
            );
          })}
        </fieldset>
      )}
      {verdict && (
        <section
          className="space-y-3 rounded-xl border bg-slate-50 p-5"
          aria-label="答案解析"
        >
          <p
            role="status"
            className={cn(
              "font-bold",
              verdict.correct ? "text-green-700" : "text-red-700",
            )}
          >
            {verdict.correct ? "回答正确" : "回答错误"}
            {verdict.timedOut ? " · 时间已到，已自动提交" : " · 已提交"}
          </p>
          <h2 className="font-semibold">Answer key（解析）</h2>
          <p>正确答案：{correctKeys.join("、")}</p>
          <MarkdownRenderer
            content={verdict.explanation || "本题暂无详细解析。"}
          />
          <p className="text-xs text-slate-500">本题答案已锁定，无法修改。</p>
        </section>
      )}
    </div>
  );
}
