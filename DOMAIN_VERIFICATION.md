# Resend Domain Verification Guide

This guide will help you verify your domain (regencivics.earth) in Resend to send emails from your branded email address instead of the temporary "onboarding@resend.dev" address.

## Step 1: Log into Resend

1. Go to [https://resend.com/login](https://resend.com/login)
2. Log in with your Resend account credentials

## Step 2: Add Your Domain

1. Navigate to **Domains** in the left sidebar
2. Click **Add Domain**
3. Enter `regencivics.earth` as your domain name
4. Click **Add**

## Step 3: Add DNS Records

Resend will provide you with DNS records that need to be added to your domain's DNS settings. You'll need to add these records through your domain registrar (e.g., GoDaddy, Namecheap, Cloudflare, etc.).

### Required DNS Records

You'll typically need to add 3 types of records:

#### 1. SPF Record (TXT)
- **Type**: TXT
- **Name**: `@` or `regencivics.earth`
- **Value**: `v=spf1 include:amazonses.com ~all` (Resend will provide the exact value)

#### 2. DKIM Records (CNAME)
- **Type**: CNAME
- **Name**: `resend._domainkey` (Resend will provide the exact subdomain)
- **Value**: (Resend will provide the target)

#### 3. DMARC Record (TXT)
- **Type**: TXT
- **Name**: `_dmarc`
- **Value**: `v=DMARC1; p=none;` (Resend will provide the exact value)

## Step 4: Wait for Verification

After adding the DNS records:

1. DNS propagation can take anywhere from a few minutes to 48 hours
2. Resend will automatically check for the records and verify your domain
3. You'll receive an email confirmation once verification is complete

## Step 5: Update Email Service

Once your domain is verified:

1. The email service in the ReGen Civics website will automatically start using `noreply@regencivics.earth` instead of `onboarding@resend.dev`
2. All emails sent from the admin panel will now appear to come from your domain

## Troubleshooting

### DNS Records Not Found
- Wait longer (DNS can take up to 48 hours to propagate)
- Double-check that you added the records exactly as provided by Resend
- Make sure you're adding records to the correct domain (regencivics.earth, not a subdomain)

### Verification Failed
- Contact your domain registrar's support if you're having trouble adding DNS records
- Contact Resend support at support@resend.com if verification continues to fail

## Testing Email Delivery

Once verified, test email delivery by:

1. Going to the admin panel at `/admin`
2. Clicking on any inquiry
3. Using the "Send Email" button with a template
4. Check that the email arrives and shows `noreply@regencivics.earth` as the sender

## Additional Resources

- [Resend Documentation](https://resend.com/docs)
- [Resend Domain Verification Guide](https://resend.com/docs/dashboard/domains/introduction)
- [DNS Record Types Explained](https://www.cloudflare.com/learning/dns/dns-records/)
