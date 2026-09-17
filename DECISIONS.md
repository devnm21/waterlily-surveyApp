# Decision log

Decisions made while building, in the order I made them, with the reasoning I gave at
the time. Timestamps are relative to the start of the recording (wall clock 13:15).
Entries marked **[commit]** are exact, from git history; `~` entries are approximate.

Where the code came out differently from the plan, I've said so rather than tidied it up.

---

## Stack (~00:05–00:20)

**~00:05 · SQLite, running locally.** Weighed against a local Postgres container. Any
SQL database satisfies the brief and SQLite needs nothing running.

**~00:12 · Next.js.** What I work in most; familiarity is worth real time on a 2–3 hour
budget.

**~00:14 · Separate Express API rather than Next.js route handlers.** Next could have
served the API. Two reasons to split it: it's a demo, so the API is worth having
standalone; and I don't know where this would be hosted, whereas route handlers assume a
Next-compatible host.

**~00:16 · React Hook Form over Formik.** Performant, flexible, and doesn't force a
validation library on me.

**~00:18 · Schema designed.** Boundary set before writing any code: scaffolding,
middleware wiring and repetitive model plumbing were delegated; the data model, API
surface and auth approach were designed directly.

**~00:19 · Drizzle over Prisma.** Prisma felt heavier than this needs, and I wanted to
stay close to SQL.

---

## Scope (~00:22–00:28)

**~00:22 · Respondents don't log in.** Requiring accounts to answer a survey complicates
things for no gain at this scope, so the link is open and I collect an email on
submission. Trade-off accepted: holding the email, not authentication, is what gates
seeing a past response.

**~00:26 · Built survey authoring, not just the respondent interface.** The brief
describes the respondent side and doesn't say whether there's one fixed survey or many.
A survey app implies you create surveys, so I assumed multi-survey. Largest scope call
in the project, hence flagging it.

**~00:28 · Drop-off tracking wanted, not built.** Where people abandon a form tells you
where it creates friction. Cut for time.

---

## Schema (~00:34–01:08 · `SCHEMA.md`)

**~00:34 · No survey ids on `user`.** Bad taste to keep child ids on the parent; the
survey holds a foreign key to its owner instead.

**~00:38 · `password_hash`, not a password.** **[commit 00:46]**

**~00:46 · `node:crypto` scrypt rather than a hashing library.** **[commit]** Checked
whether the standard library was enough before reaching for bcrypt. It is: scrypt with a
random per-password salt, compared with `timingSafeEqual`. One less dependency. Later
declined an auth middleware framework on the same grounds, since the brief asks for
custom authentication.

**~00:42 · Survey status cut to `draft | published`.** Started with
`draft → ready → published`; `ready` did nothing `draft` didn't.

**~00:48 · One answer row per question, with a JSON value.** Considered a table per
question type — tightest typing, most joins and migrations — and EAV, which felt like
overkill here. Settled on normalised answer rows where only `value` is flexible, so one
column holds short text, long text, a selected option, or an array.

**~00:52 · Question order computed in the service layer, not as a DB default.** "Current
max + 1" isn't something the database can default, so it's `MAX(sort_order) + 1` on
insert. Gap-based ordering is the usual answer when you have drag-and-drop; there's no
reordering here, so I stayed pragmatic.

**~00:55 · `created_at` / `updated_at` on every table.** For sorting and filtering.

**~00:57 · Dropped a redundant `survey_id` on answers.** It would save a join for
analytics, but it's derivable through the question and would need its own index.
Removed for simplicity given the use case.

**~01:05 · Unique constraint on `(survey_question_id, submission_id)`.** Nothing
otherwise stops a question having two answers in one submission, and that belongs in the
database.

**~01:08 · Indexing.** My intent was to index every foreign key. What shipped is
narrower: two composite indexes for the two list queries that actually exist — surveys
by owner and submissions by survey — plus the unique constraints above.

---

## API (~01:12–01:18)

**~01:12 · `GET /api/survey/:id` returns questions too.** Planned as two endpoints, then
collapsed: I can't think of a case here where you want the survey without its questions.

**~01:15 · `GET /api/submission/:id` is flat, not nested.** Nesting under the survey
would be more RESTful; the submission id alone resolves it, so I took the simpler path.

**~01:16 · Survey read is public.** The take-survey page has to work for someone holding
only a link.

**~01:18 · Options live on the question row.** Noticed mid-design that the schema had
nowhere to store choices for `select` / `multi-select`.

---

## Where the code diverged from the plan

**Session cookies, not bearer tokens.** **[commit ~01:51]** The API sketch had
`Authorization: Bearer {token}`. The implementation uses signed `httpOnly` session
cookies. That shifted during implementation rather than as a considered decision.

**Styling.** Tailwind is installed from the Next scaffold, but the app surfaces ended up
as hand-written CSS Modules. I didn't catch the divergence until late; with more time I'd
consolidate on one.

**Draft enforcement.** **[commit ~04:21]** `status` existed but nothing checked it, so an
unpublished survey was readable and submittable by anyone with the link. Now enforced on
the API and the take-survey page, with authors still able to preview their own drafts.

**Reading a submission by id used to be public.** `GET /api/submission/:id` had no auth,
so anyone holding an id could read a respondent's answers and email. It now requires a
session and survey ownership. Looking up your own response by email is still public — that
was the intended trade-off; reading arbitrary submissions by id was not.

---

## Known gaps

- `select` / `multi-select` are modelled and validated server-side, but the respondent UI
  renders text questions only.
- Required-field validation is client-side; the API accepts an empty string.
- `createWithAnswers` writes the submission and its answers without a transaction,
  compensating with a delete on failure. A transaction is the right tool.
- Schema is applied with `drizzle-kit push`, so there's no committed migration history.
- Sessions are backed by SQLite in production but use the default in-memory store in
  development, so a local restart logs you out.
- No question reordering: `unique(survey_id, sort_order)` has no swap logic behind it.
- No partial submissions stored, so drop-off reporting isn't possible yet.
- Backend has 44 tests; the frontend is typechecked but has no component tests.

## With more time

Ship the remaining two question types or drop them from the authoring options; move
required validation server-side; wrap multi-row writes in transactions and commit real
migrations; store partial progress; settle on one styling approach. And keep the commit
rhythm of the first ninety minutes throughout — small commits with a review pass between
them, rather than one long unreviewed stretch.
