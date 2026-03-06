/**
 * Privacy Policy Page
 * Legal document page with enchanted forest theme
 */

import { pageSEO } from "@/components/SEO";
import { Shield } from "lucide-react";
import LegalPageLayout from "@/components/LegalPageLayout";

export default function PrivacyPolicy() {
  return (
    <LegalPageLayout
      icon={<Shield className="w-8 h-8 text-[#7dd87d]" />}
      title="Privacy Policy"
      lastUpdated="February 2026"
      seo={pageSEO.privacyPolicy}
    >
      <div className="space-y-6">

          <section>
            <h2 className="text-lg font-bold text-[#7dd87d] mb-3" style={{ fontFamily: 'var(--font-display)' }}>1. Introduction</h2>
            <p>ReGen Civics ("we," "us," "our") respects your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our website or engage with our investment opportunities.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-[#7dd87d] mb-3" style={{ fontFamily: 'var(--font-display)' }}>2. Information We Collect</h2>
            <p className="font-semibold text-white/90 mb-2">Information You Provide:</p>
            <p>Name, address, email, phone number; financial information for accredited investor verification; tax identification numbers; employment and income information; investment preferences and experience; and communications with us.</p>
            
            <p className="font-semibold text-white/90 mt-3 mb-2">Automatically Collected Information:</p>
            <p>IP address, browser type, device information; pages visited, time spent, referring URLs; cookies and similar tracking technologies.</p>
            
            <p className="font-semibold text-white/90 mt-3 mb-2">Information from Third Parties:</p>
            <p>Accredited investor verification services, background check providers (if applicable), and public records.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-[#7dd87d] mb-3" style={{ fontFamily: 'var(--font-display)' }}>3. How We Use Information</h2>
            <p>We use information to verify accredited investor status, process investment applications, provide information about investment opportunities, comply with legal and regulatory requirements, communicate with you, improve our website and services, prevent fraud and enhance security, and analyze website usage.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-[#7dd87d] mb-3" style={{ fontFamily: 'var(--font-display)' }}>4. Disclosure of Information</h2>
            <p>We may share information with third-party verification services, legal and compliance advisors, tax advisors and auditors, service providers (hosting, analytics, etc.), law enforcement or regulators (when required), and successors in event of merger or sale.</p>
            <p className="mt-2 font-semibold text-white/90">We do not sell your personal information to third parties.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-[#7dd87d] mb-3" style={{ fontFamily: 'var(--font-display)' }}>5. Your Rights</h2>
            <p className="font-semibold text-white/90 mb-2">For all users:</p>
            <p>Access your personal information, correct inaccurate information, request deletion (subject to legal obligations), and opt out of marketing communications.</p>
            
            <p className="font-semibold text-white/90 mt-3 mb-2">For California residents (CCPA):</p>
            <p>Right to know what information is collected, right to deletion, right to opt-out of sale (we don't sell data), and right to non-discrimination.</p>
            
            <p className="font-semibold text-white/90 mt-3 mb-2">For EU residents (GDPR):</p>
            <p>Right to access, rectification, erasure; right to restrict processing; right to data portability; right to object to processing; and right to withdraw consent.</p>
            
            <p className="mt-3">To exercise rights, contact <a href="mailto:privacy@regencivics.earth" className="text-[#7dd87d] underline hover:text-[#7dd87d]/80">privacy@regencivics.earth</a></p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-[#7dd87d] mb-3" style={{ fontFamily: 'var(--font-display)' }}>6. Cookies</h2>
            <p>We use cookies for essential website functionality, analytics and performance monitoring, and remembering preferences. You can control cookies through browser settings. Disabling cookies may limit website functionality.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-[#7dd87d] mb-3" style={{ fontFamily: 'var(--font-display)' }}>7. Data Security</h2>
            <p>We implement reasonable security measures including encryption of sensitive data, secure server infrastructure, access controls and authentication, and regular security assessments. However, no method is 100% secure. We cannot guarantee absolute security.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-[#7dd87d] mb-3" style={{ fontFamily: 'var(--font-display)' }}>8. Data Retention</h2>
            <p>We retain information as long as necessary for providing services, legal and regulatory compliance (typically 7+ years for investment records), resolving disputes, and enforcing agreements.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-[#7dd87d] mb-3" style={{ fontFamily: 'var(--font-display)' }}>9. Children's Privacy</h2>
            <p>This website is not intended for individuals under 18. We do not knowingly collect information from minors.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-[#7dd87d] mb-3" style={{ fontFamily: 'var(--font-display)' }}>10. International Transfers</h2>
            <p>Your information may be transferred to and processed in countries outside your residence, including the United States. By using our site, you consent to such transfers.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-[#7dd87d] mb-3" style={{ fontFamily: 'var(--font-display)' }}>11. Do Not Track</h2>
            <p>We do not currently respond to Do Not Track signals.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-[#7dd87d] mb-3" style={{ fontFamily: 'var(--font-display)' }}>12. Changes to Privacy Policy</h2>
            <p>We may update this Privacy Policy. Material changes will be posted with updated "Last Updated" date.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-[#7dd87d] mb-3" style={{ fontFamily: 'var(--font-display)' }}>13. Contact Us</h2>
            <p>Questions about privacy? Contact us at:</p>
            <p className="mt-1">Email: <a href="mailto:privacy@regencivics.earth" className="text-[#7dd87d] underline hover:text-[#7dd87d]/80">privacy@regencivics.earth</a></p>
            <p className="mt-1">For EU/GDPR inquiries, contact our Data Protection Officer at <a href="mailto:dpo@regencivics.earth" className="text-[#7dd87d] underline hover:text-[#7dd87d]/80">dpo@regencivics.earth</a></p>
          </section>

      </div>
    </LegalPageLayout>
  );
}
