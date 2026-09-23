"use client"

import React from "react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import remarkMath from "remark-math"
import rehypeKatex from "rehype-katex"
import rehypeHighlight from "rehype-highlight"
import "katex/dist/katex.min.css"
import "highlight.js/styles/github-dark.css"
import { cn } from "@/lib/utils"

interface MarkdownRendererProps {
  content: string
  className?: string
  emptyFallback?: string
}

const markdownBaseClassName = [
  "text-sm leading-7 text-slate-900 break-words",
  "[&_h1]:mt-8 [&_h1]:mb-4 [&_h1]:text-2xl [&_h1]:font-semibold [&_h1]:leading-tight",
  "[&_h2]:mt-6 [&_h2]:mb-3 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:leading-tight",
  "[&_h3]:mt-5 [&_h3]:mb-2 [&_h3]:text-lg [&_h3]:font-semibold",
  "[&_h4]:mt-4 [&_h4]:mb-2 [&_h4]:text-base [&_h4]:font-semibold",
  "[&_p]:my-3 [&_p]:text-slate-600",
  "[&_strong]:font-semibold [&_strong]:text-slate-900",
  "[&_em]:italic",
  "[&_a]:text-primary [&_a]:underline [&_a]:underline-offset-4",
  "[&_blockquote]:my-4 [&_blockquote]:border-l-4 [&_blockquote]:border-slate-200 [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-slate-600",
  "[&_ul]:my-3 [&_ul]:list-disc [&_ul]:pl-6",
  "[&_ol]:my-3 [&_ol]:list-decimal [&_ol]:pl-6",
  "[&_li]:my-1 [&_li]:text-slate-600",
  "[&_hr]:my-6 [&_hr]:border-slate-200",
  "[&_pre]:my-4 [&_pre]:overflow-x-auto [&_pre]:rounded-md [&_pre]:border [&_pre]:bg-slate-100 [&_pre]:p-3",
  "[&_code]:rounded [&_code]:bg-slate-100 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-xs [&_code]:break-words",
  "[&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_pre_code]:text-sm",
  "[&_pre_.hljs]:bg-transparent [&_pre_.hljs]:p-0",
  "[&_.hljs]:rounded-md [&_.hljs]:border [&_.hljs]:border-slate-200/50 [&_.hljs]:bg-slate-900 [&_.hljs]:p-3",
  "[&_table]:my-4 [&_table]:w-full [&_table]:border-collapse [&_table]:text-left",
  "[&_thead]:border-b [&_thead]:border-slate-200",
  "[&_tr]:border-b [&_tr]:border-slate-200/70",
  "[&_th]:px-2 [&_th]:py-1.5 [&_th]:font-semibold",
  "[&_td]:px-2 [&_td]:py-1.5",
  "[&_img]:my-4 [&_img]:max-w-full [&_img]:rounded-md [&_img]:border [&_img]:border-slate-200 [&_img]:object-contain",
  "[&_.katex]:text-base",
  "[&_.katex-display]:my-4 [&_.katex-display]:overflow-x-auto [&_.katex-display]:overflow-y-hidden",
].join(" ")

export function MarkdownRenderer({ content, className, emptyFallback = "暂无内容" }: MarkdownRendererProps) {
  if (!content.trim()) {
    return <p className={cn("text-sm text-slate-600", className)}>{emptyFallback}</p>
  }

  return (
    <div className={cn(markdownBaseClassName, className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex, rehypeHighlight]}
        components={{
          a: ({ ...props }) => {
            const href = props.href || ""
            const safeHref = /^(https?:|mailto:|\/|#)/i.test(href) ? href : "#"
            return <a {...props} href={safeHref} target="_blank" rel="noopener noreferrer" />
          },
          img: ({ ...props }) => {
            const src = props.src || ""
            const safeSrc = /^(https?:|\/)/i.test(src) ? src : ""
            const alt = typeof props.alt === "string" ? props.alt : ""
            return safeSrc ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img {...props} src={safeSrc} alt={alt} loading="lazy" />
            ) : null
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}
