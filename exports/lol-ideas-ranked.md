# LOL — Lovable-on-Lovable ideas: the build order

*Updated 2026-07-26. 19 ideas captured. 10 scheduled across the week of Mon 27 – Fri 31 July.*

---

## Read this first

**Who wrote the ideas.** Michael Haase, Head of GTM for Lovable in Denmark. He sells Lovable to
Danish enterprises and runs his own heavily-automated agent stack (Claude Code, MCP servers,
scheduled cron jobs, Discord-driven sessions) alongside it.

**What Lovable is.** An AI app builder. You describe an app in natural language, an agent writes the
TypeScript/React code in a cloud sandbox, and you get a live deployed preview. It ships with auth, a
Postgres database, file storage, and edge functions.

**What "LOL" means.** *Lovable on Lovable.* These are ideas for the Lovable **platform itself** —
capabilities Michael wants Lovable to have. Most are things his own agent stack already does and
Lovable does not.

**Where this stands.** All 19 were scored on three axes. Michael has now set a **build order** for
ten of them and scheduled each across next week. The order is the important artifact on this page —
more so than the scores, because it encodes dependencies the scores cannot see.

**Why this document exists.** To get a second opinion on the order and the ten before any of it goes
to Lovable's product leadership.

> **A note on the ID numbers.** The IDs were originally rank positions. They are now **frozen
> labels** — Michael refers to ideas by number, so renumbering would break those references. IDs do
> not track score, and they do not track build order either. Both are separate columns.

> **These are distinct items — do not propose merging them.** Several ideas depend on or sequence
> behind each other, and those relationships are noted where they exist. A dependency is not a
> merge. Recommending that one idea be "folded into" another collapses a list Michael is using as
> separate work items, and has already produced one wrong answer (see #5, where "fold into connector
> onboarding" narrowed a four-surface problem to one surface).

---

# The build order

**5 → 2 → 1 → 15 → 6+7 → 3 → 10 → 19**, with **14 running in parallel as a prototype**.

Michael's rationale, in his words:

| | Why here |
|---|---|
| **5 now** | Small, user-visible improvement with few dependencies. |
| **2 before 1** | Establish one trigger/scheduling substrate, then add external events. |
| **15 before 6+7** | Define eval, compatibility and trust gates before importing/distributing skills. |
| **3 after 1+2** | Outcome loops need triggers, budgets, retries and stop conditions. |
| **10 before 19** | Connector creation is nearer to existing work. |
| **19 last** | Waits for scoped API keys / service accounts — not because the idea is weak. |

## The schedule

| Seq | ID | Idea | Day | Priority |
|:---:|---:|---|---|:---:|
| **1** | 5 | Secret & credential capture guidance | Mon 27 Jul | P0 |
| *par.* | 14 | HTML artifact out of planning | Mon 27 Jul | P1 |
| **2** | 2 | Scheduled actions | Tue 28 Jul | P0 |
| **3** | 1 | Event Triggers | Tue 28 Jul | P1 |
| **4** | 15 | An improved skills setup (via evals) | Wed 29 Jul | P0 |
| **5** | 6 | Import skills from Claude Code | Thu 30 Jul | P0 |
| **5** | 7 | Embed skill.md with our Lovable MCP | Thu 30 Jul | P1 |
| **6** | 3 | The 'outcome based loop' | Fri 31 Jul | P0 |
| **7** | 10 | A new MCP / integrations creation flow | Fri 31 Jul | P1 |
| **8** | 19 | Security Automation CLI | Fri 31 Jul | P2 |

Where two land on the same day, the priority number puts the earlier-in-sequence item higher in the
list. Slot 5 is a single slot: **6 and 7 are done together.**

## The order is dependency-driven, not score-driven — and that is the point

The two rankings disagree, sharply in places:

| ID | Idea | Score | Score rank | Build order |
|---:|---|---:|:---:|:---:|
| 2 | Scheduled actions | 7.90 | 1st | **2** |
| 1 | Event Triggers | 7.70 | 2nd | **3** |
| 3 | The 'outcome based loop' | 7.15 | 3rd | **6** |
| 5 | Secret & credential capture guidance | 7.10 | 4th | **1** |
| 6 | Import skills from Claude Code | 6.70 | 5th | **5** |
| 7 | Embed skill.md with our Lovable MCP | 6.65 | 6th | **5** |
| 19 | Security Automation CLI | 6.50 | 7th | **8** |
| 10 | A new MCP / integrations creation flow | 6.35 | 8th | **7** |
| 14 | HTML artifact out of planning | 6.05 | 9th | *parallel* |
| 15 | An improved skills setup (via evals) | 5.95 | 10th | **4** |

The biggest gaps are the informative ones. **#15 scores last of the ten and is built fourth**,
because it gates #6 and #7 — an unmeasured skill library is worth less than no skill library.
**#3 scores third and is built sixth**, because an outcome loop needs the triggers and stop
conditions that #1 and #2 create.

That is the correct relationship between the two lists. The score says what is worth doing. The
order says what makes each one cheaper. Building in score order would mean paying for #3's
infrastructure twice.

---

# The ten, in build order

## Seq 1 — #5. Secret & credential capture guidance
**Mon 27 Jul · P0 · Reach · ease 9 · enterprise 8 · wow 3 · score 7.10**

> *"5 now: small, user-visible improvement with few dependencies."*

Show the user exactly what to provide, at the moment they provide it:

- the **exact secret name** expected
- the **expected format**
- **where it will be stored**
- **validation** that the credential actually works

Guidance sits beside the flow — a side page or panel — so the chat stays usable.

**Four surfaces, not one:** connector setup, Edge Functions, APIs, and BYOK flows. This is not a
connector-onboarding feature.

**Build it LLM-driven, not procedural.** The model generates the walkthrough through the provider's
own UI — which menu, which tab, which button reveals the secret. Claude Code already does this. So
there is no lookup table of where each vendor hides its keys, and no per-provider scripts to keep
current. Provider variance costs nothing, which is why four surfaces do not multiply the work.

**Why it matters.** A mis-pasted key fails silently, and a silent failure costs more than a rejected
one. Storage location is a data-residency question the moment an enterprise is involved.

**First move:** count the support threads that open with a mis-pasted key. That number sells the fix
in one slide.

> **Scored three times.** 9/7/3 = 6.70 on the original narrow scope → 7/8/3 = 6.40 when I wrongly
> assumed four surfaces meant per-provider work → **9/8/3 = 7.10** once that assumption was
> corrected. The residual risk is accuracy, not difficulty: model-generated navigation steps go
> stale when a vendor redesigns. Mitigation is the same as Claude Code's — the user is looking at
> the screen and can say "I don't see that tab." Let them correct the walkthrough mid-flow.

## Parallel — #14. Make an HTML artifact out of planning
**Mon 27 Jul · P1 · Craft · ease 8 · enterprise 5 · wow 5 · score 6.05**

Runs alongside the sequence. No dependencies, so nothing waits on it and it waits on nothing.

When the agent plans, it emits a wall of markdown. Nobody reads it. Render the plan as a browsable
artifact instead, with checkboxes the agent ticks as it ships. Plan mode stops being a conversation
and becomes a contract you can redline.

**First move:** mock one. Show plan-as-artifact beside plan-as-markdown and let the contrast argue.

## Seq 2 — #2. Scheduled actions
**Tue 28 Jul · P0 · Runtime · ease 7 · enterprise 8 · wow 9 · score 7.90**

> *"2 before 1: establish one trigger/scheduling substrate, then add external events."*

Apps that work while nobody is watching. Michael's own stack runs a briefing at 06:00, a digest at
06:30, a backlog drain at 05:00. No Lovable app can do that — it sits there until someone visits.

This slot builds **the substrate**, not just a cron UI. Three things a demo usually skips:

- an **identity** to run as — a scheduled job cannot borrow a human's session
- a **run history**
- a **stop condition**

Those three are what #1 reuses and what #3 depends on. Getting them right once is the reason this
comes second rather than first.

**First move:** name the three crons your own stack already runs daily. Those are the V1 use cases,
pre-validated.

## Seq 3 — #1. Event Triggers
**Tue 28 Jul · P1 · Runtime · ease 6 · enterprise 9 · wow 8 · score 7.70**
*(renamed 2026-07-26 from "a webhook per project")*

> *"...then add external events."*

**What already works.** Edge Functions can receive events today — write data, update the UI, send
notifications. The pipe exists. This is not about building the pipe.

**What the LOL layer adds** — the guided setup:

- endpoint creation
- authentication / signature verification
- event mapping
- retries
- idempotency
- monitoring

That list is the difference between "technically possible" and "an enterprise will put production
traffic through it." Every item is something an integration review asks about.

**Best demo.** `sensor event → Lovable endpoint → database record → realtime dashboard update →
notification → optional agent action.` One sentence, six systems, and the last hop is agentic.

**Why it matters.** Event Triggers are the difference between *Lovable made me an app* and *Lovable
runs my app.* One is a project. The other is a dependency.

**First move:** build the demo path end to end with one real sensor. Design the guided-setup surface
from whatever turns out to be annoying while building it.

> **Score changed with the rename.** As "a webhook per project": 9/8/8 = 8.35. Reframed as a guided
> setup layer it is more work (retries and idempotency are infrastructure, not UI) and worth more to
> an enterprise (signatures and monitoring are what a security review demands). Now 6/9/8 = 7.70.

## Seq 4 — #15. An improved skills setup (via evals etc.)
**Wed 29 Jul · P0 · Craft · ease 4 · enterprise 7 · wow 7 · score 5.95**

> *"15 before 6+7: define eval, compatibility, and trust gates before importing/distributing
> skills."*

**The gate.** Skills you can measure, not just write: an eval per skill, a compatibility check, a
trust level.

This is the lowest-scoring idea of the ten and the fourth thing built, and the gap is the whole
argument. Skip it and #6 imports someone else's untested prompts while #7 distributes them. Order
matters more here than anywhere else in the sequence.

**First move:** take the three skills you would actually ship to a customer. Write one eval each.
Score them. That score is the spec for "improved."

## Seq 5 — #6. Import skills from Claude Code
**Thu 30 Jul · P0 · Craft · ease 8 · enterprise 6 · wow 6 · score 6.70**

Paired with #7 — one slot, done together. Gated by #15.

`SKILL.md` is a settled, documented format, and a large body of them already exists. Importing them
is an ecosystem land-grab at low cost.

**#6 imports, #7 distributes.** Same format, opposite directions.

**First move:** write the parser spec. The frontmatter is the whole contract — an afternoon's work.

## Seq 5 — #7. Embed skill.md with our Lovable MCP
**Thu 30 Jul · P1 · Reach · ease 9 · enterprise 5 · wow 6 · score 6.65**

Paired with #6 — one slot, done together. Gated by #15 for the same reason: do not distribute a
skill you cannot measure.

Ship the MCP server with a skill file that teaches the calling agent how to drive Lovable well.
Every MCP client gets better, with no platform change.

**First move:** paste your best Lovable-building skill into workspace knowledge and measure whether
the agent improves. Ship the winner with the MCP.

## Seq 6 — #3. The 'outcome based loop'
**Fri 31 Jul · P0 · Runtime · ease 3 · enterprise 9 · wow 10 · score 7.15**

> *"3 after 1+2: outcome loops need triggers, budgets, retries, and stop conditions."*

The user defines **outcomes**, not a product. The system keeps improving against those outcomes on a
bi-weekly backlog loop, and keeps getting better on its own as the models improve. Closer to how
enterprises want to buy: commit to a result, not a feature list.

Original note: *"A flow where user defines Outcomes rather than product… enabling continuous
improvement, also as models get better… bi-weekly backlog loops."*

Highest enterprise value and highest wow on the whole list. Also the hardest. It is sixth rather
than third because the triggers, retries and stop conditions it runs on are exactly what slots 2 and
3 build — attempting it earlier means building that infrastructure twice.

**First move:** write it as a one-page strategy note, not a feature ticket. This is a positioning
bet. It needs an executive sponsor before an engineer.

## Seq 7 — #10. A new MCP / integrations creation flow
**Fri 31 Jul · P1 · Reach · ease 4 · enterprise 8 · wow 7 · score 6.35**

> *"10 before 19: connector creation is nearer to existing work."*

Enterprise adoption means connecting to the stack the enterprise already runs. Today that wiring is
manual, and it is the step where a deal stalls.

**First move:** wire one integration by hand today and time yourself. Every minute in that recording
is the design brief.

## Seq 8 — #19. Security Automation CLI
**Fri 31 Jul · P2 · Reach · ease 4 · enterprise 9 · wow 6 · score 6.50**

> *"19 waits for scoped API keys/service accounts, not because the idea is weak."*

**The pitch: "Security Center as code."** A thin, stable client over the **existing** Security Center
API. Explicitly not a separate scanning system.

**Capabilities:** trigger and await scans · query findings and scan freshness · apply severity
thresholds · export JSON · return deterministic exit codes for CI or cron.

**The blocker.** Scoped service-account authentication. No enterprise puts a personal access token
in a CI pipeline, and unattended is the entire point. The CLI is a fortnight; the auth model is not.

**Follow-on:** native SIEM / webhook delivery.

### Is it a better wedge than a general-purpose CLI?

Probably yes, and for a precise reason: **they serve different people.** A general-purpose CLI serves
the person who has already bought. A security CLI serves the person who decides whether anyone is
*allowed* to buy. Wedges work by getting past the gatekeeper, not by pleasing the user.

- **Bounded surface.** A general-purpose CLI never finishes; every new capability grows it. A thin
  client over one API can be finished, and therefore stable. For something wired into CI, stability
  is the feature — a CLI that changes breaks pipelines, and a broken pipeline is how a tool gets
  removed.
- **It answers a question already being asked.** Every enterprise deal passes a security review. A
  general-purpose CLI answers a question nobody asked in procurement.

**Where it loses.** It gets you through the door and creates no daily habit. A general-purpose CLI
creates habit. Wedge versus retention — sequential, not competing.

### The prerequisite is worth more than the CLI

Scoped service-account authentication is not this idea's tax. It is shared infrastructure:

- **#2** needs an identity for a scheduled run to execute *as*
- **#1** is adjacent — verifying an inbound sender is not the same problem as authorising an
  outbound caller, but both want a non-human identity with limited permissions

Which is a second argument for the order Michael chose: running #2 and #1 first means the auth model
exists by the time #19 needs it. Build it once, three ideas get cheaper.

**First move:** write the `--help` output before any code. If the command surface does not fit on
one screen, the scope has drifted from "thin client" to "scanning system." Then find out whether
scoped service accounts are on anyone's roadmap — if they are not, this idea's timeline is that
team's timeline.

---

# The other ten — scored, not scheduled

Still on the board as thinking. Their **to-dos have been dropped** so next week's list is only the
ten above — the ideas are not rejected, they are just not this week.

| ID | Idea | Theme | Ease | Ent | Wow | Score | Note |
|---:|---|---|---:|---:|---:|---:|---|
| 4 | Lovable MCP accessible IN Lovable | Reach | 7 | 6 | 8 | **6.85** | **Highest-scoring idea not in the sequence — see below** |
| 8 | Slack & Discord bridge to projects | Runtime | 5 | 7 | 8 | 6.55 | Becomes cheap once #1 lands — it is Event Triggers plus a bot |
| 9 | Project-level skills | Craft | 6 | 7 | 6 | 6.40 | Dropped earlier by hand; overlaps #15 |
| 11 | Sparring mode — understand a problem, visualise output | Craft | 6 | 6 | 7 | 6.25 | Prototype as a workspace skill; no platform change needed |
| 12 | Mini brain export / import (à la Karpathy wiki) | Craft | 5 | 6 | 8 | 6.15 | Export one project's knowledge by hand to prove the format |
| 13 | Agent window flow | Runtime | 4 | 6 | 9 | 6.05 | Changing the most-used screen in the product |
| 16 | Skill discovery (from past behaviour) | Craft | 3 | 6 | 9 | 5.70 | Natural follow-on to #15 once evals exist |
| 17 | Talk to my own file system MCP | Reach | 5 | 3 | 6 | 4.45 | Local file access is what security blocks first |
| 18 | Bridge to local computer MCP ('computer use') | Reach | 2 | 3 | 8 | 3.90 | Most of what you'd want, #1 and #2 already give you |
| 20 | **Lovable builds desktop apps** | Reach | 3 | 7 | 9 | **6.10** | **New candidate, 2026-07-26 — not in the sequence. See below.** |

### #4 is the one to double-check

**Lovable MCP accessible IN Lovable was in the previous prioritised ten and is not in the sequence.**
It scores 6.85 — higher than five of the ten that are scheduled, including #10, #14 and #15. Its
to-do has been dropped along with the rest.

That may be deliberate: it is self-referential polish rather than an enterprise unlock, and the week
is already full. But it is the only idea whose status changed from *in* to *out* without being
discussed, so it is worth one sentence of confirmation. Reinstating it is a status change, not a
rebuild.

---

### #20 — Lovable builds desktop apps
**Reach · ease 3 · enterprise 7 · wow 9 · score 6.10 · NOT in the sequence**
*Added 2026-07-26. Checked against the Company Brain before scoring.*

**The question:** today Lovable only emits web apps and websites. In a world of local models,
people sometimes want a local desktop app. What would it take, and is it LOL-week-sized?

#### Half of this already exists — but it is the other half

The Brain is unambiguous, and it splits the question in two:

| | Status |
|---|---|
| **Lovable *as* a desktop app** | **Shipped.** Electron wrapper, macOS + Windows, all plans including Free. Local MCP servers, multi-project tabs, keyboard shortcuts, auto-update. Launched 14 April 2026 alongside the Lovable MCP Server; the Linear release project completed 5 July. |
| **Lovable *emitting* desktop apps** | **Nothing.** Not on a roadmap. Not rejected. Simply absent. |

The stated reason the Lovable desktop app exists is exactly Michael's argument, already won
internally: *"the real unlock is local MCP: the desktop app can connect to tools running on your
machine, which the browser can't do… The browser sandbox blocks localhost connections. The desktop
app doesn't."*

So the capability argument does not need making. It needs **extending** — from Lovable's own app to
the apps users build.

#### The shell debate is settled, and still live

A 24 April decision doc chose **Electron**, starting from an existing prototype. Tauri was
considered and rejected: *"lighter-weight but adds Rust build complexity and slows team velocity."*
Native per-platform was rejected as duplicating all UI work.

But the debate did not stay closed:

- **PR #18411, "Tauri desktop connector"** — closed, stale. Claimed ~10× smaller bundle and ~6×
  lower memory. Introduced `local_bash`, `local_read_file`, `local_write_file`,
  `local_list_directory`, `mount_local_folder`.
- **PR #31207, "feat(desktop): Tauri-based native desktop app"** — closed.
- **#random, 9 July 2026** — an engineer built a gpui (Warp/Zed) version in free time: *"The binary
  size is 3mb, now our desktop app is 122mb"*, 80 MB RAM against 1 GB.

Three separate people have now tried to replace Electron. That is a signal about the shell, and it
is seventeen days old.

#### What it would actually take

**The easy 20% — the wrapper.** Lovable emits a standard Vite static frontend (`npm run build` →
`dist/`). Wrapping that in Tauri or Electron is close to a config file plus a build step. A merged
PR (#30030) already adds an *Electron desktop app packaging guide* to the agent's knowledge, so
some of this is arguably reachable by prompting today.

**The hard 80% — none of it the wrapper:**

1. **Code signing and notarisation.** macOS needs an Apple Developer account, a Developer ID
   certificate and notarisation. Windows needs an EV certificate. **Whose certificate?** If Lovable
   signs, Lovable becomes the publisher of every app its users ship — a support and liability
   surface. If the user signs, a non-technical builder must buy an Apple Developer membership and
   manage a private key. This is the real product decision and it has no clean answer.
2. **Per-OS build runners.** Signed macOS builds need macOS runners. There is no cross-compile.
3. **Auto-update channels.** A desktop app without updates is abandonware on day one.
4. **Distribution.** A downloadable `.dmg` and an App Store listing are different review processes.
5. **The backend problem — the sneaky one.** Lovable apps are not just frontends; they lean on
   Cloud/Supabase. A desktop app still calling a hosted backend is a browser in a costume. The
   local-model wedge needs the *data* local too, and that is a different product, not a packaging
   change.

#### The sharpening — what I would actually pursue

The interesting version is **not** "Lovable builds desktop apps." It is **"Lovable builds apps that
can talk to localhost."**

That is a much smaller ask carrying most of the value. A Lovable app that can reach
`http://localhost:11434` is the local-model unlock. Whether it is wrapped in Tauri is a distribution
detail.

And per-app packaging **multiplies** the hard part — signing, updates, distribution — by the number
of apps. A single signed **"Lovable Bridge"** helper, installed once, **divides** it by the number
of apps. One signing problem solved once, every Lovable app gains localhost, the filesystem and the
GPU. Note that PR #18411's `local_bash` / `mount_local_folder` tools are most of that bridge
already, sitting in a closed branch.

#### Is it LOL-week-sized?

**Split it, and the answer is yes and no:**

- ✅ **Proof of concept — comfortably.** *"A Lovable app running in a Tauri shell, talking to Ollama
  on localhost."* Two closed PRs to crib from. One or two days. A very strong demo.
- ❌ **A production desktop target — no.** Signing, notarisation, per-OS runners, updates and
  distribution is a quarter with a named owner.

**Aim at the demo, and pair it with a one-page note on the signing question.** That question decides
whether this is ever a product, and it is a decision rather than an engineering task. Nobody can
build past it in a week. Someone can *frame* it in a week — and framing it is worth more than
another wrapper prototype, because three of those already exist.

#### Scoring

- **Ease 3** — the wrapper is trivial, the product is not. Signing, notarisation, per-OS runners,
  updates and distribution is a subsystem plus a legal argument.
- **Enterprise value 7** — real, and narrower than it looks. Air-gapped and regulated environments,
  local inference for data that cannot leave the building. But most enterprise Lovable use is
  internal web tooling, and the signing story is itself an enterprise blocker. Below the 9s.
- **Wow 9** — a genuine category expansion, and the local-model framing is exactly what management
  responds to. Not 10; #3 keeps that, because it changes the unit of sale rather than the output
  format.

#### Related ideas already on this list

**#17** (talk to my own file system MCP, 4.45) and **#18** (bridge to local computer MCP, 3.90) were
both scored low, partly on the grounds that local-machine access is what security blocks first. The
Brain shows that work was actually attempted and shelved — PR #18411's local tool set is precisely
that bridge. If #20 is pursued, those two scores deserve a re-look; they may have been marked down
for a risk the company has already decided to take.

## What feedback would be most useful

1. **Is the order right where it disagrees with the scores?** The two big inversions are #15
   (scores last of the ten, built fourth) and #3 (scores third, built sixth). Both are justified by
   dependencies. Are those dependencies real, or is this over-sequencing?
2. **Is one week the right container?** Ten items across five days, with the hardest idea on the
   list (#3, ease 3) landing on Friday alongside two others. Is Friday overloaded?
3. **Should #4 be back in?** See above.
4. **Is #5 really ease 9?** It was briefly scored 7 on the assumption that four surfaces meant
   per-provider work. That was wrong — the walkthrough is model-generated. Is there a build cost the
   LLM-driven framing hides?
5. **Should scoped service-account auth be its own line item?** It blocks #19, is required by #2 and
   is adjacent to #1. Right now it is a footnote under one idea rather than the shared dependency it
   appears to be — and the sequence quietly depends on it arriving.
6. **Is #19 really a stronger wedge than a general-purpose CLI?** The argument above says yes,
   because it targets the gatekeeper rather than the user. Does that overrate how much a security
   review influences an enterprise purchase?
7. **Where are the ease scores wrong?** They are the least-informed numbers here — guessed without
   knowledge of Lovable's codebase or team. #1 at ease 6 and #3 at ease 3 are the most load-bearing.
8. **What is missing?** These are 19 ideas one person captured in a week. What obvious adjacent
   capability is absent entirely?

**One request on form.** Please do not recommend that any idea be folded into another. These are
nineteen distinct work items. Dependencies and sequencing between them are useful; merges are not.

---

## The scoring axes

| Axis | Question it answers | 10 means | 1 means |
|---|---|---|---|
| **Ease of execution** | How much platform work stands between the idea and a shippable version? | A week and a design review | A new subsystem plus a security argument |
| **Value for enterprises** | Does this unlock or expand an enterprise deal? | Governance, integration into an existing stack, unattended operation | Nice for a solo builder, irrelevant to a buyer |
| **Wow effect for Lovable management** | How agentic and future-facing does this read to the people who set roadmap? | Changes what Lovable *is* | Makes Lovable slightly faster at what it already does |

**Overall score = (0.35 × ease) + (0.40 × enterprise value) + (0.25 × wow).** The weighting leans
toward enterprise value because Michael's job is enterprise revenue, and discounts wow because wow
does not close deals on its own. A product-strategy reader might reasonably invert that.

**Important caveat.** The scores are one person's judgement calls. They are not measured, not
researched, and not validated with anyone at Lovable. Treat every number as a claim to be checked.

---

## Provenance and change log

All 19 ideas live in Michael's task store under the `LOL:` prefix — the first 18 pulled with
`title ilike 'LOL%'`, nothing hand-picked, and #19 added on 2026-07-26. Titles are reproduced as
written. Everything else — scores, themes, first moves, cross-idea observations — is analysis added
on top. The **build order and its rationale are Michael's**, quoted directly.

**2026-07-26, in order:**

- **#1 renamed** "A webhook per project" → **"Event Triggers"**, and reframed: the Edge Function
  primitive exists; the value is the guided setup layer. Re-scored 9/8/8 (8.35) → 6/9/8 (7.70).
- **#19 Security Automation CLI added**, scored 4/9/6 = 6.50.
- **#5 scope corrected** → **"Secret & credential capture guidance"**, four surfaces not one.
  Re-scored 9/7/3 (6.70) → 7/8/3 (6.40) → **9/8/3 (7.10)** after the LLM-driven-not-procedural
  correction.
- **A no-merge note added**, after "fold into connector onboarding" narrowed #5 wrongly.
- **Build order set** — 5 → 2 → 1 → 15 → 6+7 → 3 → 10 → 19, with 14 in parallel. Ten to-dos
  rescheduled across Mon 27 – Fri 31 July, priorities set so same-day items sort in sequence order.
- **#10 added to the plan** (it was previously parked) and **#4 removed from it**.
- **Nine to-dos dropped** — IDs 4, 8, 9, 11, 12, 13, 16, 17, 18. Status set to `dropped`, which is
  recoverable; nothing was deleted. All nine remain in this document.
