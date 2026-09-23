import { QuizCourseList } from "@/components/quiz/course-list";
export default function Page() {
  return (
    <div className="container-custom py-12">
      <h1 className="text-3xl font-bold">我的课程</h1>
      <p className="mb-8 mt-3 text-slate-500">循序练习，记录每一次进步。</p>
      <QuizCourseList />
    </div>
  );
}
