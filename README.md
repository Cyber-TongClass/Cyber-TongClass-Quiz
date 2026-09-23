# Tong Class Quiz

A standalone course-practice platform for Tong Class, designed for **quiz.tongclass.ac.cn**. Students can access assigned courses, complete timed quizzes, review explanations, and track their progress.

## Features

- Independent student accounts with password changes and administrator-issued reset codes.
- Per-question time limits, automatic submission, immediate feedback, and locked answers.
- Explanations available after a question is graded, including when revisiting completed questions.
- Stratified quizzes: 3 easy, 3 medium, and 4 hard questions from a 50-question lesson bank.
- Course and lesson progress stored in a dedicated Convex database.
- Separate administration through the main Tong Class website.

The student app contains no main-website pages or administrator interface. Quiz accounts and sessions are independent of main-site accounts.

## Project structure

```text
src/app/             Student pages: courses, practice, login, and account
src/components/      Quiz interface and shared UI components
src/lib/             Typed client hooks and session handling
backend/convex/      Quiz schema, authentication, learning, and admin APIs
backend/tests/       Offline backend regression tests
```

Built with Next.js, React, TypeScript, Tailwind CSS, and Convex. Markdown and mathematics are rendered with React Markdown and KaTeX.

## Getting started

Requires Node.js **24.14 or later** and npm **11.9 or later**.

```bash
npm ci
cp .env.example .env.local
```

Set the public URL of your quiz deployment in `.env.local`:

```dotenv
NEXT_PUBLIC_QUIZ_CONVEX_URL=https://your-quiz-deployment.convex.cloud
```

Then start the frontend:

```bash
npm run dev
```

Open `http://localhost:3000`. Student accounts must be provisioned by a course administrator; there is no public registration. See [backend setup](backend/README.md) to configure the quiz database and administrator authentication.

## Development checks

```bash
npm run lint
npm run typecheck
npm run build
```

To serve a built frontend locally:

```bash
npm run start
```

Frontend builds do not deploy Convex or run database migrations. Backend checks and deployment commands are documented separately in [backend/README.md](backend/README.md).

## Deploying to Vercel

1. Import this repository into Vercel. Select **Next.js**, the repository root, and Node.js **24.x**.
2. Set `NEXT_PUBLIC_QUIZ_CONVEX_URL` to the quiz backend URL for each intended deployment environment. `vercel.json` configures `npm ci` and `npm run build`.
3. Deploy and verify login, course access, practice, and account management.
4. Add `quiz.tongclass.ac.cn` under **Settings → Domains**. Create the `quiz` DNS record using the exact target provided by Vercel, plus any requested verification record.
5. After HTTPS is ready, verify the app on the custom domain.

Public environment variables are embedded at build time; changing them requires a rebuild. The Vercel frontend does not need a Convex deploy key. Selecting Vercel's Production environment does not change which Convex deployment it uses.

The main website's administrator frontend must use the same quiz backend URL. Its existing authentication configuration remains separate.

## Routes

| Path | Purpose |
| --- | --- |
| `/` | Assigned courses |
| `/login` | Student login |
| `/activate` | Account activation or administrator-issued password reset |
| `/account` | Profile, progress, history, and password changes |
| `/courses/[courseSlug]` | Course lessons |
| `/attempts/[attemptId]` | Timed practice and answer review |

Legacy `/quiz/...` links redirect to the corresponding route. Main-site paths such as `/admin`, `/members`, and `/publications` are not served by this app.

## Data and security

The repository contains application code, not course rosters or question banks. Keep credentials, backups, account-distribution files, and answer-bearing imports outside Git. A Convex deployment URL is public configuration; deploy keys and administrator sessions are secrets.

The backend checks student sessions and course enrollment, restricts administrator operations through the main authentication service, and releases answer keys only after grading. Passwords use individually salted scrypt hashes. These controls do not replace deployment security review or monitoring.
