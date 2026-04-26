# Security Baseline

OWASP-grounded security baseline for ReGen Civics. Mirror of the structure from `agentic-node-starter` (MIT). All files are living documents.

Last reviewed: 2026-04-25.

## Files

| File | When to read |
|---|---|
| `PRINCIPLES.md` | Onboarding. The non-negotiable security posture. |
| `OWASP-TOP10.md` | Working on auth, input handling, deserialization, dependencies, logging. The standard ten with concrete project specifics. |
| `BUILD-PLAYBOOK.md` | Adding a new feature. The pre-merge security checklist. |
| `OPS-PLAYBOOK.md` | Investigating a security incident, rotating a secret, debugging a leaked credential. |
| `AI-AUTOMATION-RISKS.md` | Adding any LLM-driven feature, agent integration, or place where user content reaches a model. |
| `CHECKLIST.md` | Quarterly self-audit. The list of things to verify haven't drifted. |

## Source of facts

Findings are pulled from:
- `FIXES_TO_MAKE_2026-04-25_full-audit.md` (recent comprehensive audit)
- `SHIPPED_LOG.md` (security-related shipped items)
- Live commit history in `git log --oneline | grep -i security`

When the audit lives in a doc that gets archived, the security-relevant findings get pulled into these docs first. The audit doc is the source of one moment; these are the running ledger.

## Update cadence

- After every security-related commit: review whether a checklist item moved or a new principle emerged.
- Quarterly: read all 6 files end to end, update or strike-through stale items.
- After every prod incident: append to OPS-PLAYBOOK with the response timeline.

## What this baseline is NOT

- Not a substitute for an actual third-party audit before launch.
- Not a runtime WAF or SIEM (those would be operational additions).
- Not a compliance framework (no SOC 2, no HIPAA scope today).

It IS the running internal contract for "what we don't ship without doing first."
