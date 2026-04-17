# Mere

**A workbook format for apps. The file is the app.**

A `.mp.html` file contains screens, state, behavior, theme, and data.
Open it — it runs. Send it — it travels. No server, no account, no build step.

→ **[mere.semanticintent.dev](https://mere.semanticintent.dev)**

---

## What it looks like

```html
<workbook theme="proton-mail">

  <state>
    <value name="tasks" type="list" value="[]" />
    <value name="new-task" type="text" value="" />
  </state>

  <computed>
    <value name="task-count" from="tasks" op="count" />
  </computed>

  <actions>
    <action name="add-task">
      add-to tasks title @new-task
      clear new-task
    </action>
  </actions>

  <screen name="home">
    <header>
      <heading>Tasks</heading>
      <badge @task-count></badge>
    </header>
    <field ~new-task placeholder="New task…"></field>
    <button !add-task>Add</button>
    <card-list @tasks>
      <card><heading @item.title></heading></card>
    </card-list>
  </screen>

</workbook>
```

Save as `tasks.mp.html`. Double-click. It runs.

---

## Four sigils. That's the grammar.

| Sigil | Name | Example | Meaning |
|-------|------|---------|---------|
| `@` | read | `<heading @title>` | One-way binding from state. On list containers, iterates the array. |
| `~` | two-way | `<field ~email>` | Bidirectional sync between input and state. |
| `!` | action | `<button !submit>` | Invokes a named action on click. |
| `?` | intent | `<screen ?"Show inbox">` | AI compositor annotation. Ignored at runtime. |

---

## 26 elements. No HTML passthrough.

`screen` `header` `footer` `form` `heading` `subtitle` `paragraph` `timestamp` `badge` `avatar` `icon` `tab-bar` `tab` `navigation-bar` `nav-item` `message-list` `card-list` `list` `message-card` `card` `field` `button` `toggle` `modal` `toast` `banner`

Every element has a specific role. The vocabulary is closed by design — bounded enough for AI to generate reliably, expressive enough for real apps.

---

## Installation

```sh
npm install -g mere
```

## CLI

```sh
mere check tasks.mp.html     # validate — exit 0/1/2
mere check *.mp.html          # validate multiple, summary line
mere schema                   # print element registry
mere schema --json            # machine-readable JSON
```

---

## Three themes

| Theme | Character |
|-------|-----------|
| `classic-light` | Neutral baseline. Clean cards, comfortable spacing. Default. |
| `proton-mail` | Purple accent, underline tabs, 14px base type. |
| `brutalist` | Zero radius, 3px black borders, inverted header, red accent. |

---

## Persistence

Add `persist` to any state value — saved to OPFS (localStorage fallback):

```html
<value name="notes" type="list" value="[]" persist />
```

---

## Why not just HTML?

HTML gives you the substrate. Mere gives you the contract.

Raw HTML has no opinions about state, data flow, or actions. Infinite choices produce inconsistent output — especially for AI generation. Mere's bounded vocabulary, explicit sigils, and text-based action syntax mean a model can produce a valid workbook reliably, because there are no escape hatches and no ambiguity.

The file runs anywhere HTML runs. Forever. No framework lock-in.

---

## Examples

See [`examples/`](examples/) for ready-to-open workbooks. Full live examples at [mere.semanticintent.dev/examples](https://mere.semanticintent.dev/examples.html).

---

## Docs

- [`docs/concept.md`](docs/concept.md) — what Mere is and why
- [`docs/spec.md`](docs/spec.md) — full language specification
- [`docs/roadmap.md`](docs/roadmap.md) — milestones and open questions

---

## License

MIT — see [LICENSE](LICENSE).
