# Mere — Concept

**Version:** 0.1
**Status:** Pre-implementation

---

## The one-line pitch

Mere is Excel's portability, for apps that are not spreadsheets.

---

## What Mere is

Mere is a workbook format for apps. A workbook is a single file that contains everything an app needs to run: its screens, its state, its behavior, its theme, and its data. You open the file and it runs. You send the file and the recipient receives the same app. There is no server, no account, no build step, no framework.

The name is the philosophy. A mere is a lake — still, self-contained, bounded, ancient. And "mere" means *only*, *just* — it's merely a file. Both meanings are true. The app is merely a file. That is enough.

---

## The six commitments

**1. The file is the app.**
A workbook is a single portable artifact. If a feature requires a server to run, it is not a Mere feature.

**2. The user owns their data.**
Data lives inside the workbook. No row of user data exists on a Mere-operated server by default. Ever.

**3. Restraint over capability.**
The vocabulary is small. The primitives are few. The themes are opinionated. This is not a limitation — it is the product. A workbook a newcomer can read in ten minutes is worth more than a workbook that can do anything.

**4. Readable by a human, readable by an AI.**
The authoring surface is designed so non-programmers can learn it in an afternoon and language models can generate it reliably. These are the same property: clarity and predictability.

**5. Beautiful by default.**
Mere ships with opinionated, production-quality themes. A workbook built in five minutes looks like a workbook built in five days. The visual baseline is not a premium feature.

**6. Sovereign, not networked.**
Workbooks work offline, forever, without permission. They do not phone home. They do not require sign-in. They outlive the vendor.

---

## What Mere is not

- **Not a React alternative.** Mere targets non-programmers building the kind of app that today gets built in Excel, Airtable, or not at all.
- **Not a low-code platform.** Low-code platforms own the user's app. Mere does not.
- **Not a cloud service.** There is no Mere account, no Mere server.
- **Not a programming language.** It is a document format with a declarative authoring syntax.
- **Not an Excel replacement.** Excel is extraordinary at formula-driven tabular work. Mere is for the apps Excel cannot build.

---

## Who builds workbooks

Initially: technically curious individuals — people who would use Notion or Airtable today but want something they own. Over time, as visual authoring matures: small business owners, teachers, project managers, accountants — anyone who today builds things in spreadsheets because nothing else fits.

Authors are not developers. The language is designed for this.

---

## What people build

Workbooks that are useful, not sophisticated:

- A mobile inbox for a specific kind of message (support tickets, reservations, leads)
- A multi-step intake form that remembers partial progress
- An inventory tracker with photos, quantities, and reorder alerts
- A project board with tasks, statuses, and assignees
- A contractor quote builder with line items, tax, and a printable summary
- A classroom attendance tool a teacher built for their own class
- A customer-facing booking form a small business owner sends to clients
- A family recipe collection with search and scaling

The pattern: workflows done today in a mix of Excel, paper, email, and cloud services — stitched together imperfectly because no single tool fits.

---

## The intellectual lineage

Mere resumes Semantic UI's unfinished project — the insight that UI vocabulary should describe *meaning* rather than *style*, and that themes should be visual languages with personality rather than palette swaps. Semantic UI (2013) was undone by substrate: a CSS framework in an era that moved to utility-first CSS, jQuery-based in an era that moved to React. The core idea was right; the timing was wrong.

Mere rebuilds on 2026 foundations: web components, OPFS persistence, CSS custom properties, and AI-native authorship. The idea works better now than it did then.

---

## AI's role

Mere is designed to be authored by language models as fluently as by people. The expected pattern: a person describes what they want and a language model produces a workbook. The person refines and ships it. The entire round trip happens in one session.

Workbooks do not require AI to run. Once a workbook exists it is a sovereign artifact. It does not call back to an AI service.

---

## The name

`mere` is one syllable. It works as a CLI verb:

```
mere check inbox.mp
mere schema
mere run inbox.mp
```

It is not a tech-sounding name. That is intentional. The target user is not a programmer.

The `.mp` extension stands for **Mere Package** — a self-contained workbook artifact.

---

## Where this goes

**v0.1 — Runtime, language, themes, CLI.**
A working runtime. A specified language. Six themes. A `mere check` and `mere schema` CLI. Proof that the format works.

**v0.2 — AI compositor.**
Intent annotations (`?`) become actionable. Describe an element in plain language; the compositor expands it. Authoring becomes conversational.

**v0.3 — Visual authoring.**
Non-programmers build workbooks without writing markup. The visual tool compiles to the same `.mp` format. Text-authored and visually-authored workbooks are indistinguishable.

**v0.4+ — Ecosystem.**
Third-party themes, custom components, shared workbook library. The format, being open and specified, invites this without requiring a platform.

No phase requires a cloud. No phase requires a subscription. The user owns the artifact at every stage.
