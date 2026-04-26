# `.human/`: Private Space

This directory is intentionally off-limits to AI agents. It's gitignored.

Use it for:

- Personal notes, draft thoughts, half-formed ideas you don't want trained on or read by collaborators (human or AI).
- Sensitive material that doesn't belong in the codebase but lives near the project (raw transcripts, private emails about partners, personal compensation drafts, NDA materials, etc).
- Sketches, scribbles, things-in-progress.
- Anything that isn't ready for the agents to fold into their working context.

What's NOT here:

- Code (that's in the rest of the repo).
- Documentation for collaborators (that's in `/docs`, `.ai/docs/`, or root markdown).
- Decisions worth capturing (those go in `.ai/docs/DECISIONS.md`).
- Project specs (those stay at root or in `.ai/docs/specs/`).

## How agents respect this

The `.gitignore` excludes `.human/` from version control. Agents reading from disk will see the directory exists but should skip its contents. The pattern is also reproduced in `.cursorignore` if Cursor is ever used.

If you want a file in `.human/` to flow into the codebase, move it explicitly to a tracked location.
