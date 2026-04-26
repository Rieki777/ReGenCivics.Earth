# Security Policy

## Reporting a Vulnerability

If you find a security vulnerability in ReGen Civics, **please do not open a public issue**. Instead, report it directly:

**Email**: rieki@pm.me
**Subject line prefix**: `[SECURITY]`

Include in your report:

- A clear description of the vulnerability
- Steps to reproduce, or a proof-of-concept
- Affected component (page, endpoint, file path)
- Impact assessment from your perspective
- Any suggested mitigation

We commit to:

- Acknowledging your report within **48 hours**.
- Providing an initial assessment within **5 business days**.
- Keeping you informed of progress through resolution.
- Crediting you in the release notes if the vulnerability is confirmed and you'd like the recognition (we won't publicize without your consent).

## Scope

In scope:

- The main site at https://regencivics.earth and its API surfaces (`/api/*`).
- The governance subdomain at https://gov.regencivics.earth.
- The codebase in this repository.
- The Hypha bridge integration to Base chain.
- Webhook handlers for Resend, Riverside, Alchemy.

Out of scope:

- Third-party services we depend on (Anthropic API, Hypha, Cloudflare R2, Railway). Report those to the respective providers.
- Vulnerabilities in dependencies. We're happy to hear about them, but the fix path is upstream.
- Issues that require a compromised local machine, an unlocked admin browser, or social engineering of the project team.
- Self-XSS (you submitting a payload to your own account that affects no one else).
- Denial of service attacks against rate-limited endpoints (the rate limit IS the defense).

## Severity Classification

We use the OWASP severity model. Roughly:

- **Critical**: full account takeover, data exfiltration of other users, server compromise, on-chain unauthorized transactions. Patched in <48 hours.
- **High**: privilege escalation, cross-user data access (IDOR), webhook signature bypass. Patched in <7 days.
- **Medium**: stored XSS, CSRF, missing rate limit on a sensitive endpoint, information disclosure. Patched in <30 days.
- **Low**: missing security header, version disclosure, descriptive error messages. Patched in next release window.

## Hall of Fame

Reporters who responsibly disclose validated vulnerabilities and consent to recognition will be listed here.

(Empty for now. Be the first.)

## Safe Harbor

We will not pursue legal action against researchers who:

- Make a good-faith effort to avoid privacy violations, destruction of data, and interruption of service.
- Use only the in-scope assets above.
- Do not exploit a vulnerability beyond what's necessary to demonstrate it.
- Report the issue privately and give us reasonable time to fix it before public disclosure.
- Do not attempt to access, modify, or destroy other users' data.

## Internal posture

For our internal security baseline, see `.ai/docs/security/` in this repo. Key files:

- `.ai/docs/security/PRINCIPLES.md`: security posture
- `.ai/docs/security/OWASP-TOP10.md`: project-specific posture per OWASP
- `.ai/docs/security/OPS-PLAYBOOK.md`: incident response procedures
- `.ai/docs/security/AI-AUTOMATION-RISKS.md`: LLM-specific risk surface
