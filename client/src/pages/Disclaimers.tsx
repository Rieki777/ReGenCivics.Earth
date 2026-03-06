/**
 * Full Investment Disclaimers Page
 * Comprehensive legal disclaimers with enchanted forest theme
 */

import { Link } from "wouter";
import { pageSEO } from "@/components/SEO";
import { AlertTriangle, Shield, FileText } from "lucide-react";
import LegalPageLayout from "@/components/LegalPageLayout";

export default function Disclaimers() {
  return (
    <LegalPageLayout
      icon={<Shield className="w-8 h-8 text-[#ffd700]" />}
      title="Investment Disclaimers"
      lastUpdated="February 2026"
      seo={pageSEO.disclaimers}
    >
      <div className="space-y-6">

        {/* NOT AN OFFER */}
        <section className="bg-red-900/20 border border-red-500/30 rounded-lg p-5">
          <h2 className="text-lg font-bold text-red-300 mb-3 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            NOT AN OFFER TO SELL SECURITIES
          </h2>
          <p>The information on this website does not constitute an offer to sell or a solicitation of an offer to buy any securities. No offer or sale of securities will be made except by means of a formal Private Placement Memorandum (PPM) or other offering documents provided to qualified investors. Any such offer or sale will be made only to accredited investors or qualified purchasers in compliance with applicable federal and state securities laws.</p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-[#ffd700] mb-3" style={{ fontFamily: 'var(--font-display)' }}>Accredited Investors Only</h2>
          <p>Investment opportunities presented by ReGen Civics are available only to investors who qualify as "accredited investors" as defined in Rule 501(a) of Regulation D under the Securities Act of 1933, as amended. You will be required to verify your accredited investor status before being provided with any offering materials.</p>
          <p className="mt-3">An accredited investor includes (among other categories):</p>
          <ul className="list-disc list-inside mt-2 space-y-1 text-white/70">
            <li>Individuals with net worth exceeding $1,000,000 (excluding primary residence)</li>
            <li>Individuals with income exceeding $200,000 in each of the two most recent years (or $300,000 combined with spouse)</li>
            <li>Certain institutions with assets exceeding $5,000,000</li>
            <li>Certain licensed financial professionals</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-bold text-[#ffd700] mb-3" style={{ fontFamily: 'var(--font-display)' }}>Unique Governance Structure</h2>
          <p>ReGen Civics employs a distinctive governance model designed to provide enhanced transparency, accountability, and direct investor involvement.</p>
          <p className="font-semibold text-white/90 mt-3 mb-2">Governance Composition:</p>
          <ul className="list-disc list-inside space-y-1 text-white/70">
            <li><strong className="text-white/90">Portfolio Project Representatives:</strong> Direct representatives from funded land projects</li>
            <li><strong className="text-white/90">Investor Representatives:</strong> Direct investor participation in governance decisions</li>
            <li><strong className="text-white/90">Expert Council:</strong> Independent council of subject matter experts</li>
          </ul>
          <p className="font-semibold text-white/90 mt-3 mb-2">Dynamic Structure and Supermajority Requirements:</p>
          <p>The ReGen Civics investment vehicle is designed to be dynamic and adaptive. All material changes to fund structure, investment strategy, or governance require 90% approval (supermajority) across all stakeholder groups. Stakeholders may modify governance procedures, including the 90% requirement, during the course of operations.</p>
          <p className="font-semibold text-white/90 mt-3 mb-2">Governance Risks and Considerations:</p>
          <p>While this participatory governance model offers benefits, it also presents unique risks including decision-making complexity, supermajority gridlock, stakeholder conflicts, novel structure without extensive track record, regulatory uncertainty, and complex fiduciary relationships.</p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-[#ffd700] mb-3" style={{ fontFamily: 'var(--font-display)' }}>Not Investment Advice</h2>
          <p>Nothing on this website constitutes investment, tax, legal, or financial advice. The information provided is for informational purposes only and should not be relied upon for making investment decisions. You are strongly encouraged to consult with your own independent financial advisor, tax advisor, and legal counsel before making any investment decision.</p>
          <p className="mt-2">ReGen Civics does not act as an investment adviser, fiduciary, or in any advisory capacity with respect to the information presented on this website unless a formal advisory relationship has been established in writing.</p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-[#ffd700] mb-3" style={{ fontFamily: 'var(--font-display)' }}>High Risk of Loss</h2>
          <p>Investments in regenerative land projects, private funds, and similar alternative investments involve a high degree of risk and are speculative in nature. You should be prepared for the possibility of losing your entire investment.</p>
          <p className="font-semibold text-white/90 mt-3 mb-2">Specific risks include:</p>
          <p className="text-white/70">Illiquidity, lack of diversification, lack of transparency, management risk, project execution risk, environmental and climate risks, regulatory and legal risks, market risk, governance complexity, multi-stakeholder conflicts, novel governance structure, dynamic fund structure, and no guarantee of returns.</p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-[#ffd700] mb-3" style={{ fontFamily: 'var(--font-display)' }}>No Guarantee of Returns</h2>
          <p>Past performance is not indicative of future results. Any projections, forecasts, or estimated returns presented are hypothetical in nature and are not guarantees or promises of actual returns. Actual results may vary significantly and may result in partial or total loss of invested capital.</p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-[#ffd700] mb-3" style={{ fontFamily: 'var(--font-display)' }}>Illiquid Investment</h2>
          <p>Investments in private land projects and regenerative funds are highly illiquid. There is no public market for the sale or transfer of interests, and none is expected to develop. You may not be able to liquidate your investment even in the case of emergency.</p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-[#ffd700] mb-3" style={{ fontFamily: 'var(--font-display)' }}>Not FDIC Insured</h2>
          <p>Investments are not deposits or obligations of, or guaranteed by, any bank. Investments are not insured by the FDIC, any other governmental agency, or any private insurance fund. Investments may lose value.</p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-[#ffd700] mb-3" style={{ fontFamily: 'var(--font-display)' }}>No Regulatory Approval</h2>
          <p>The Securities and Exchange Commission (SEC), any state securities commission, or any other federal or state regulatory authority has not approved or disapproved of these securities, passed upon the accuracy or adequacy of this website or any offering materials, or reviewed or endorsed the merits of this offering. Any representation to the contrary is a criminal offense.</p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-[#ffd700] mb-3" style={{ fontFamily: 'var(--font-display)' }}>Forward-Looking Statements</h2>
          <p>This website may contain forward-looking statements regarding anticipated results, growth, values, and projections. Such statements are subject to risks, uncertainties, and assumptions. Actual results may differ materially. You are cautioned not to place undue reliance on forward-looking statements.</p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-[#ffd700] mb-3" style={{ fontFamily: 'var(--font-display)' }}>Conflicts of Interest</h2>
          <p>ReGen Civics and its affiliates may have financial or other interests in the projects and investments described on this website. These interests may create conflicts between ReGen Civics' interests and the interests of investors. All potential conflicts of interest will be disclosed in formal offering documents.</p>
          <p className="mt-2">The multi-stakeholder governance structure creates unique potential conflicts inherent to the participatory governance model that cannot be entirely eliminated.</p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-[#ffd700] mb-3" style={{ fontFamily: 'var(--font-display)' }}>Conduct Your Own Due Diligence</h2>
          <p>Before making any investment decision, you must conduct thorough due diligence, review all offering materials carefully, verify all information independently, consult with qualified professionals, and understand all terms, conditions, and risks.</p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-[#ffd700] mb-3" style={{ fontFamily: 'var(--font-display)' }}>Restricted Marketing Materials</h2>
          <p>Information on this website is provided solely for informational purposes to sophisticated investors who are considering whether to request additional information. This website does not constitute, and should not be construed as, offering materials or a prospectus.</p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-[#ffd700] mb-3" style={{ fontFamily: 'var(--font-display)' }}>Privacy and Data Collection</h2>
          <p>For details on how we collect, use, and protect your data, please see our <Link href="/privacy-policy" className="text-[#7dd87d] underline hover:text-[#7dd87d]/80">Privacy Policy</Link>.</p>
        </section>

        {/* Related Documents */}
        <section className="bg-[#1a472a]/50 border border-[#7dd87d]/20 rounded-lg p-5 mt-2">
          <h2 className="text-lg font-bold text-[#7dd87d] mb-3" style={{ fontFamily: 'var(--font-display)' }}>Related Legal Documents</h2>
          <div className="space-y-2">
            <Link href="/risk-disclosure" className="flex items-center gap-2 text-[#7dd87d] hover:text-[#7dd87d]/80 underline">
              <AlertTriangle className="w-4 h-4" /> Risk Disclosure Statement
            </Link>
            <Link href="/terms-of-use" className="flex items-center gap-2 text-[#7dd87d] hover:text-[#7dd87d]/80 underline">
              <FileText className="w-4 h-4" /> Terms of Use
            </Link>
            <Link href="/privacy-policy" className="flex items-center gap-2 text-[#7dd87d] hover:text-[#7dd87d]/80 underline">
              <Shield className="w-4 h-4" /> Privacy Policy
            </Link>
          </div>
        </section>

      </div>
    </LegalPageLayout>
  );
}
