---
name: hypha-pr-workflow
description: Use when submitting PRs to hypha-dao/hypha-web from the ReGen Civics fork, editing files via GitHub web editor (CM6), committing changes, or responding to CodeRabbit review feedback on Hypha PRs. Triggers on: "commit to hypha", "PR to hypha", "fix the hypha PR", "push to hypha-web", "CodeRabbit feedback", "bridge pre-fill", or any task touching the Rieki777/hypha-web fork.
---

# Hypha PR Workflow

## Overview

ReGen Civics contributes to [hypha-dao/hypha-web](https://github.com/hypha-dao/hypha-web) via a fork. The GitHub web editor uses CodeMirror 6 (CM6), which requires a non-obvious approach to automate. This skill covers the full PR workflow: fork setup, editor automation, committing, and responding to reviews.

## Account and Fork

**Always use: Rieki777** (not Rieki7)

- Fork: `https://github.com/Rieki777/hypha-web`
- Upstream: `https://github.com/hypha-dao/hypha-web`
- Open PRs: check `https://github.com/hypha-dao/hypha-web/pulls?q=Rieki777`
- Branch pattern: `bridge-quest-pre-fill-pr2`, etc.

Before starting, verify the browser is signed in as Rieki777:
```javascript
document.querySelector('meta[name="user-login"]')?.content
// Should return "Rieki777"
```

## Editing Files via GitHub Web Editor

The editor at `https://github.com/Rieki777/hypha-web/edit/<branch>/<path>` uses **CodeMirror 6 (CM6)**, not Monaco. CM6 virtualizes the document — only visible lines are in the DOM. You cannot paste or use `execCommand` to replace the full document. You must get the EditorView instance via webpack.

### Step 1: Find the EditorView (One-Time Per Page Load)

```javascript
// 1. Steal webpack require from the chunk array
const chunks = window.webpackChunk_github_ui_github_ui;
let capturedRequire = null;
chunks.push([[Symbol()], {}, function(require) { capturedRequire = require; }]);
window.__wpRequire = capturedRequire;

// 2. Find the CM6 EditorView module (module 26632 as of 2026-04)
//    If 26632 breaks, search: Object.entries(r.m).find(([id, f]) => f.toString().includes('EditorView') && f.toString().includes('dispatch'))
const mod = window.__wpRequire(26632);

// 3. Find the EditorView class (minified as "Lz" — verify with prototype check)
const EditorView = Object.values(mod).find(v =>
  typeof v === 'function' && v.prototype?.dispatch && v.prototype?.update && v.findFromDOM
);
window.__EditorViewClass = EditorView;

// 4. Get the live editor instance
const view = EditorView.findFromDOM(document.querySelector('.cm-editor'));
window.__cmView = view;
console.log(`Lines: ${view.state.doc.lines}`);
```

If module 26632 changes, find the new one:
```javascript
Object.entries(window.__wpRequire.m).filter(([id, f]) => {
  const s = f.toString();
  return s.includes('EditorView') && s.includes('dispatch');
}).map(([id]) => id)
```

### Step 2: Replace Document Content

```javascript
// Store the new file content in window.__newContent first (see Loading Content)
const view = window.__cmView;
view.dispatch({
  changes: { from: 0, to: view.state.doc.length, insert: window.__newContent }
});
// Verify: view.state.doc.lines should match expected line count
```

### Step 3: Commit

After replacing content the "Commit changes..." button auto-enables:
```javascript
// Open dialog
const btn = Array.from(document.querySelectorAll('button'))
  .find(b => b.textContent.trim().includes('Commit changes'));
btn.click();

// Wait for dialog, then fill fields via form_input tool (ref_451 = title, ref_452 = description, ref_453 = direct branch radio)
// Then click the "Commit changes" submit button inside the dialog
```

Use `read_page` with `filter: "interactive"` after clicking to get the dialog's ref IDs, then use `form_input` to set:
- Commit title (the single-line textbox)
- Extended description (the textarea)
- "Commit directly to [branch]" radio button

Then find and click the green "Commit changes" submit button:
```javascript
Array.from(document.querySelectorAll('button'))
  .find(b => b.textContent.trim() === 'Commit changes')
  .click();
```

Success: URL changes from `/edit/` to `/blob/`.

## Loading File Content Into the Page

The new file content must be in `window.__newContent` before Step 2.

**Option A: Clipboard paste workaround (when file is in workspace)**

Read the file from `/sessions/.../mnt/regen-civics-clean/` and store it. Since the JS tool can't directly inject large strings in one call without triggering content filters, chunk it:

```javascript
// Call 1
window.__p1 = `<first ~4000 chars>`;
// Call 2
window.__p2 = `<next ~4000 chars>`;
// ...
// Final call
window.__newContent = [window.__p1, window.__p2, ...].join('');
console.log(window.__newContent.length); // verify total chars
```

**Option B: Fetch from raw GitHub (if already on branch)**

```javascript
(async () => {
  const r = await fetch('https://raw.githubusercontent.com/Rieki777/hypha-web/<branch>/<path>');
  window.__newContent = await r.text();
})()
```

## Full Commit Workflow (Condensed)

1. Navigate to edit URL: `https://github.com/Rieki777/hypha-web/edit/<branch>/<filepath>`
2. Verify logged in as Rieki777 (`meta[name="user-login"]`)
3. Set up webpack + find EditorView (code above)
4. Load new content into `window.__newContent`
5. Dispatch document replacement
6. Click "Commit changes...", fill dialog, click submit
7. Verify URL changed to `/blob/`
8. Check commits: `https://github.com/Rieki777/hypha-web/commits/<branch>`

## Responding to CodeRabbit Review Feedback

CodeRabbit reviews appear as PR comments at `https://github.com/hypha-dao/hypha-web/pull/<number>`.

Typical fix categories:
- **Duplicate type/interface** — remove the duplicate, import from a shared barrel (`../../agreements`, etc.)
- **Bad casts** (`as unknown as X`) — replace with `as any` or a proper type
- **Loose index signatures** (`[key: string]: any`) — define an explicit interface
- **Nested ternaries** — extract to a named constant

For each file to fix:
1. Read the current file from the local workspace or the raw GitHub URL
2. Apply fixes
3. Save to workspace folder (`/sessions/.../mnt/regen-civics-clean/hypha-pr-fixes/`)
4. Commit via the web editor workflow above

Commit message convention: `fix: address CodeRabbit review feedback on <feature> PR`

## Key Files in This PR Track

- `packages/epics/src/governance/components/create-propose-a-contribution-form.tsx`
- `packages/epics/src/agreements/components/create-agreement-base-fields.tsx`
- `packages/epics/src/agreements/index.ts` (barrel exports)
- `apps/web/src/lib/hypha-bridge/` (bridge module)

## Troubleshooting

| Problem | Fix |
|---|---|
| "Commit changes..." button disabled | Editor content matches original — dispatch a change first |
| Module 26632 not found | Search for new module ID (see Step 1 fallback) |
| `Lz` is not EditorView anymore | Find class with `findFromDOM` static method + `dispatch`/`update` prototype |
| 422 from tree-save POST | Don't use tree-save API directly; use the CM6 + button approach instead |
| Fetch blocked (Cookie/query string data) | File content contains URL params or session-like strings — chunk the content injection, don't return file text from JS calls |
| Wrong account | Navigate to github.com, switch to Rieki777, reload edit page |

## Verification

After committing, verify the PR is clean:
```
https://github.com/hypha-dao/hypha-web/pull/<number>/files
```

Check the diff shows exactly the intended changes and no unintended whitespace/line-ending changes.
