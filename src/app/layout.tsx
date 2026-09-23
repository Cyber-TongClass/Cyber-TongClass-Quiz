import type { Metadata } from "next";
import "@/styles/globals.css";
import { QuizShell } from "@/components/quiz/quiz-shell";
export const metadata: Metadata = {
  metadataBase: new URL("https://quiz.tongclass.ac.cn"),
  title: "课程练习 | Tong Class",
  description: "通班课程练习平台",
  robots: { index: false, follow: false },
};
export default function RootLayout({children}: {children: React.ReactNode}) {
  return <html lang="zh-CN"><body className="font-sans"><QuizShell>{children}</QuizShell></body></html>;
}
