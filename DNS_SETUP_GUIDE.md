# DNS Setup Guide for regencivics.earth

This guide provides the exact DNS records needed to verify your domain with Resend and enable email sending from regencivics.earth.

## Overview

You need to add these DNS records to your domain provider (e.g., Namecheap, GoDaddy, Cloudflare, etc.) to:
- **Verify domain ownership** (DKIM)
- **Enable email sending** (SPF)
- **Improve email deliverability** (DMARC - optional but recommended)

---

## Required DNS Records

### 1. Domain Verification (DKIM)

This record verifies that you own the domain.

| Field | Value |
|-------|-------|
| **Type** | TXT |
| **Name** | `resend._domainkey` |
| **Content** | `p=MIGfMA0GCSqGSIb3DQEB...` (full value from screenshot) |
| **TTL** | Auto (or 3600) |
| **Priority** | N/A |

**Important:** Copy the full DKIM key from your Resend dashboard. The value starts with `p=MIGfMA0GCSqGSIb3DQEB...`

---

### 2. Enable Email Sending (SPF)

These records allow Resend's servers to send emails on behalf of your domain.

#### SPF Record 1: MX Record

| Field | Value |
|-------|-------|
| **Type** | MX |
| **Name** | `send` |
| **Content** | `feedback-smtp.us-east-1.amazonses.com` |
| **TTL** | Auto (or 3600) |
| **Priority** | 10 |

#### SPF Record 2: TXT Record

| Field | Value |
|-------|-------|
| **Type** | TXT |
| **Name** | `send` |
| **Content** | `v=spf1 include:amazonses.com ~all` |
| **TTL** | Auto (or 3600) |
| **Priority** | N/A |

---

### 3. DMARC Policy (Optional but Recommended)

This record tells email providers how to handle emails that fail authentication.

| Field | Value |
|-------|-------|
| **Type** | TXT |
| **Name** | `_dmarc` |
| **Content** | `v=DMARC1; p=none;` |
| **TTL** | Auto (or 3600) |
| **Priority** | N/A |

**Note:** The `p=none` policy means failed emails will be delivered but reported. You can change to `p=quarantine` or `p=reject` later for stricter policies.

---

## Step-by-Step Instructions

### For Most DNS Providers (Namecheap, GoDaddy, etc.)

1. **Log in to your domain registrar** where you purchased regencivics.earth
2. **Navigate to DNS Management** (may be called "DNS Settings", "Advanced DNS", or "Manage DNS")
3. **Add each record** using the tables above:
   - Click "Add New Record" or similar button
   - Select the record **Type** (TXT, MX)
   - Enter the **Name/Host** field
   - Enter the **Content/Value** field
   - Set **Priority** (for MX records only)
   - Save the record
4. **Wait for propagation** (can take 5 minutes to 48 hours, usually within 1 hour)
5. **Verify in Resend** by clicking the "Verify" button in your Resend dashboard

### For Cloudflare Users

1. Log in to Cloudflare and select regencivics.earth
2. Go to **DNS** tab
3. Click **Add record** for each entry
4. **Important:** Set "Proxy status" to **DNS only** (gray cloud) for all email-related records
5. Save and wait for verification

---

## Common Issues & Troubleshooting

### Issue: "DKIM record not found"
- **Solution:** Make sure the Name field is exactly `resend._domainkey` (no extra spaces or characters)
- Some providers require `resend._domainkey.regencivics.earth` as the full name

### Issue: "SPF record syntax error"
- **Solution:** Ensure the TXT record content is exactly `v=spf1 include:amazonses.com ~all` (no quotes unless your provider adds them automatically)

### Issue: "Records not propagating"
- **Solution:** Use [DNS Checker](https://dnschecker.org/) to verify records are visible globally
- Wait up to 48 hours for full propagation

### Issue: "Multiple SPF records"
- **Solution:** You should only have ONE SPF record per subdomain. If you already have an SPF record on the `send` subdomain, merge them:
  - Example: `v=spf1 include:amazonses.com include:otherprovider.com ~all`

---

## After DNS Setup

Once all records are added and verified:

1. **Return to Resend dashboard** and click "Verify Domain"
2. **Wait for verification** (usually instant if records are correct)
3. **Update email sender** in your code from `onboarding@resend.dev` to `noreply@regencivics.earth` or `team@regencivics.earth`
4. **Test sending** an email to confirm everything works

---

## Email Sender Addresses

After verification, you can send from any address at your domain:
- `team@regencivics.earth` (general communications)
- `noreply@regencivics.earth` (automated notifications)
- `hello@regencivics.earth` (friendly greeting)
- `admin@regencivics.earth` (admin notifications)

**Recommended:** Use `team@regencivics.earth` for most communications as it feels personal and allows replies.

---

## Need Help?

- **Resend Documentation:** https://resend.com/docs/dashboard/domains/introduction
- **DNS Propagation Checker:** https://dnschecker.org/
- **SPF Record Checker:** https://mxtoolbox.com/spf.aspx
- **DMARC Checker:** https://mxtoolbox.com/dmarc.aspx

---

## Quick Reference Table

| Record Type | Name | Content (Summary) | Purpose |
|-------------|------|-------------------|---------|
| TXT | `resend._domainkey` | `p=MIGfMA0GCS...` | Domain verification (DKIM) |
| MX | `send` | `feedback-smtp.us-east-1.amazonses.com` | Email sending (SPF) |
| TXT | `send` | `v=spf1 include:amazonses.com ~all` | Email authentication (SPF) |
| TXT | `_dmarc` | `v=DMARC1; p=none;` | Email policy (DMARC) |

---

**Status:** Once verified, your emails will show as coming from `@regencivics.earth` instead of `@resend.dev`, significantly improving trust and deliverability! 🎉
