/**
 * Terms of Use Page
 * Legal document page with enchanted forest theme
 */

import { Link } from "wouter";
import { pageSEO } from "@/components/SEO";
import { FileText } from "lucide-react";
import LegalPageLayout from "@/components/LegalPageLayout";

export default function TermsOfUse() {
  return (
    <LegalPageLayout
      icon={<FileText className="w-8 h-8 text-[#7dd87d]" />}
      title="Terms of Use"
      lastUpdated="February 2026"
      seo={pageSEO.termsOfUse}
    >
      <div className="space-y-6">

          <section>
            <h2 className="text-lg font-bold text-[#7dd87d] mb-3" style={{ fontFamily: 'var(--font-display)' }}>1. Acceptance of Terms</h2>
            <p>By accessing or using the ReGen Civics website ("Site"), you agree to be bound by these Terms of Use and all applicable laws and regulations. If you do not agree, do not use this Site.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-[#7dd87d] mb-3" style={{ fontFamily: 'var(--font-display)' }}>2. Not an Offer</h2>
            <p>Nothing on this Site constitutes an offer to sell or solicitation to buy securities. Offers are made only through formal Private Placement Memoranda to qualified investors in accordance with applicable securities laws.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-[#7dd87d] mb-3" style={{ fontFamily: 'var(--font-display)' }}>3. Accredited Investors Only</h2>
            <p>Investment information is intended only for accredited investors. By accessing investment-related content, you represent that you are an accredited investor or are evaluating whether to become one.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-[#7dd87d] mb-3" style={{ fontFamily: 'var(--font-display)' }}>4. No Investment Advice</h2>
            <p>ReGen Civics does not provide investment, legal, or tax advice through this Site. All information is for general informational purposes only. Consult qualified professionals before making investment decisions.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-[#7dd87d] mb-3" style={{ fontFamily: 'var(--font-display)' }}>5. Accuracy of Information</h2>
            <p>While we strive for accuracy, ReGen Civics makes no representations or warranties regarding accuracy or completeness of information, timeliness of updates, suitability for any particular purpose, or non-infringement of third-party rights. Information may become outdated. ReGen Civics has no obligation to update information.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-[#7dd87d] mb-3" style={{ fontFamily: 'var(--font-display)' }}>6. Forward-Looking Statements</h2>
            <p>This Site may contain forward-looking statements. Such statements involve risks and uncertainties. Actual results may differ materially. Do not rely on forward-looking statements.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-[#7dd87d] mb-3" style={{ fontFamily: 'var(--font-display)' }}>7. Third-Party Links</h2>
            <p>This Site may contain links to third-party websites. ReGen Civics does not endorse or control third-party sites and is not responsible for their content.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-[#7dd87d] mb-3" style={{ fontFamily: 'var(--font-display)' }}>8. Intellectual Property</h2>
            <p>The ReGen Civics codebase is released under an open source license. You are free to use, modify, and distribute the source code in accordance with the license terms displayed in the project repository. The ReGen Civics name, logos, and brand marks remain the property of ReGen Civics and require written permission for commercial use outside the scope of the open source license. User-generated content (forum posts, quest submissions, proposals) remains owned by its author, with a license granted to ReGen Civics for display and distribution within the platform.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-[#7dd87d] mb-3" style={{ fontFamily: 'var(--font-display)' }}>9. Prohibited Uses</h2>
            <p>You may not: use the Site for illegal purposes, attempt to gain unauthorized access, transmit viruses or malicious code, collect user information without consent, misrepresent affiliation with ReGen Civics, or frame or mirror Site content without permission.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-[#7dd87d] mb-3" style={{ fontFamily: 'var(--font-display)' }}>10. Privacy</h2>
            <p>Your use of the Site is governed by our <Link href="/privacy-policy" className="text-[#7dd87d] underline hover:text-[#7dd87d]/80">Privacy Policy</Link>. By using the Site, you consent to data practices described in the Privacy Policy.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-[#7dd87d] mb-3" style={{ fontFamily: 'var(--font-display)' }}>11. Disclaimers</h2>
            <p className="uppercase text-white/60 text-xs">THE SITE IS PROVIDED "AS IS" WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED. REGEN CIVICS DISCLAIMS ALL WARRANTIES INCLUDING MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-[#7dd87d] mb-3" style={{ fontFamily: 'var(--font-display)' }}>12. Limitation of Liability</h2>
            <p className="uppercase text-white/60 text-xs">REGEN CIVICS SHALL NOT BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES ARISING FROM USE OF THIS SITE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGES.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-[#7dd87d] mb-3" style={{ fontFamily: 'var(--font-display)' }}>13. Indemnification</h2>
            <p>You agree to indemnify and hold harmless ReGen Civics from any claims, damages, or expenses arising from your use of the Site or violation of these Terms.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-[#7dd87d] mb-3" style={{ fontFamily: 'var(--font-display)' }}>14. Governing Law</h2>
            <p>These Terms are governed by applicable law, without regard to conflict of law principles.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-[#7dd87d] mb-3" style={{ fontFamily: 'var(--font-display)' }}>15. Changes to Terms</h2>
            <p>ReGen Civics may modify these Terms at any time. Continued use after modifications constitutes acceptance of modified Terms.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-[#7dd87d] mb-3" style={{ fontFamily: 'var(--font-display)' }}>16. Severability</h2>
            <p>If any provision is found unenforceable, remaining provisions remain in full effect.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-[#7dd87d] mb-3" style={{ fontFamily: 'var(--font-display)' }}>17. Contact</h2>
            <p>Questions about these Terms? Reach us through our <Link href="/connect" className="text-[#7dd87d] underline hover:text-[#7dd87d]/80">Connect page</Link> or email <a href="mailto:legal@regencivics.earth" className="text-[#7dd87d] underline hover:text-[#7dd87d]/80">legal@regencivics.earth</a></p>
          </section>

      </div>
    </LegalPageLayout>
  );
}
