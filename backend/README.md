# Quiz backend

An independent Convex backend for student accounts, course materials, quiz attempts, and learning progress. The student frontend lives in the repository root; the administrator interface is hosted by the main Tong Class website.

## Setup

```bash
cd backend
npm ci
cp .env.example .env.local
```

Select your quiz project with the Convex CLI, or fill in the development deployment assigned to you:

```dotenv
CONVEX_DEPLOYMENT=dev:your-quiz-deployment
CONVEX_URL=https://your-quiz-deployment.convex.cloud
```

Authenticate using your own Convex account, then generate local bindings:

```bash
npx convex codegen
```

Generated bindings and local environment files are ignored by Git. Do not use the main website's database or deploy key for this backend.

## Configuration

| Variable | Location | Purpose |
| --- | --- | --- |
| `CONVEX_DEPLOYMENT` | Local CLI environment | Selects the quiz deployment |
| `MAIN_AUTH_CONVEX_URL` | Convex server environment | Main-site administrator session validation endpoint |
| `NEXT_PUBLIC_QUIZ_CONVEX_URL` | Each frontend's build environment | Public quiz API URL |

`MAIN_AUTH_CONVEX_URL` defaults to the Tong Class main authentication service. Configure it for your own trusted service when adapting this project. It must implement the `auth:currentUserBySession` query and compatible role/identity fields. Never accept this endpoint from a client request.

The application uses Convex queries, mutations, and actions; it does not require the `.convex.site` actions URL.

## Development and deployment

After confirming the selected development deployment:

```bash
npx convex dev --once --typecheck enable --env-file .env.local
```

For active development, `npx convex dev` watches for changes. Use one source checkout per deployment to avoid competing watchers. Frontend builds never deploy the backend or import data.

A live release needs an explicitly selected Convex deployment and a separate data-migration plan. Changing the frontend domain does not move accounts or question banks.

## Validation

```bash
npx tsc --noEmit -p convex/tsconfig.json
node tests/sampling-offline.cjs
node tests/matrix-offline.cjs
node tests/question-timing-offline.cjs
node tests/accounts-offline.cjs
node tests/security-offline.cjs
```

Tests use synthetic data and in-memory fixtures, with no cloud writes.

## Access boundaries

- `auth.ts`: public login, activation, and authenticated password changes.
- `learning.ts`: student-scoped course access, attempts, grading, and progress.
- `admin.ts`: main-site administrator authentication before every management action.
- `authStore.ts` and `adminStore.ts`: internal functions; not callable by ordinary browser clients.
- `localRoster.ts`: deployment-specific internal maintenance utilities, including destructive cleanup. These are not part of the public API and must not be invoked as a normal setup step.

Public student responses omit password hashes, activation secrets, session hashes, and ungraded answer keys. Sessions expire and are invalidated when account credentials change. Ready question banks are immutable so existing attempts retain their original question references.

Keep operational credentials, rosters, snapshots, and answer-bearing imports outside the repository. Batch imports must remain idempotent and manually invoked. Deploy credentials allow privileged internal operations and must never be exposed to frontend builds or browsers.
