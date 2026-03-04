# How to Add DNS Records in Manus Management UI

Since your domain `regencivics.earth` was set up through Manus, you can manage DNS records directly in the **Manus Management UI**.

## Step-by-Step Instructions

### 1. Access the Management UI

1. **Open your project** in Manus (you should see the chat interface on the left)
2. **Click the settings icon** in the top-right corner of the chat header (or click any "View" button on project cards)
3. The **Management UI panel** will open on the right side of your screen

### 2. Navigate to Domain Settings

1. In the Management UI, look for the **Settings** tab/section
2. In the Settings sidebar navigation, click on **Domains**
3. You should see your domain `regencivics.earth` listed

### 3. Add DNS Records

In the Domains panel, look for options to:
- **Manage DNS Records**
- **Add Custom DNS Records**
- **Domain Configuration**

You'll need to add the following records from the Resend verification page:

---

## DNS Records to Add

### Record 1: DKIM (Domain Verification)

```
Type: TXT
Name: resend._domainkey
Content: p=MIGfMA0GCSqGSIb3DQEB... (copy full value from Resend)
TTL: Auto
```

### Record 2: SPF MX Record

```
Type: MX
Name: send
Content: feedback-smtp.us-east-1.amazonses.com
Priority: 10
TTL: Auto
```

### Record 3: SPF TXT Record

```
Type: TXT
Name: send
Content: v=spf1 include:amazonses.com ~all
TTL: Auto
```

### Record 4: DMARC (Optional but Recommended)

```
Type: TXT
Name: _dmarc
Content: v=DMARC1; p=none;
TTL: Auto
```

---

## Alternative: If DNS Management is Not Available in UI

If you don't see DNS management options in the Manus UI, the domain might be managed externally. In that case:

1. **Check your email** for domain purchase confirmation from Manus
2. Look for login credentials or a link to the domain registrar
3. The registrar is likely **Global Domain Group LLC** (based on WHOIS lookup)

---

## After Adding Records

1. **Wait 5-60 minutes** for DNS propagation
2. **Return to Resend dashboard** and click "Verify Domain"
3. **Test sending an email** to confirm verification worked
4. **Update email sender** in the code from `onboarding@resend.dev` to `team@regencivics.earth`

---

## Need Help?

If you can't find the DNS settings in the Management UI:
- Ask me to help locate the domain management interface
- Check the Manus documentation for domain/DNS management
- Contact Manus support if domain access is unclear

The email tracking infrastructure is already implemented in the code and will automatically start working once the domain is verified! 🎉
