/**
 * Disclaimers page (/disclaimers)
 *
 * Rewritten 2026-09-27 (FUNDING_ENGINE_PLAN v1.2). The fund is now a
 * cooperative in design that accepts no money, so the accredited-investor,
 * offering, returns and liquidity language is gone. /risk-disclosure redirects
 * here, so this page carries the site's only notice: keep it complete and
 * plain. Every sentence about the cooperative and tokens comes from COOP in
 * shared/fund.ts.
 */

import { Link } from "wouter";
import { pageSEO } from "@/components/SEO";
import { AlertTriangle, Shield, FileText } from "lucide-react";
import LegalPageLayout from "@/components/LegalPageLayout";
import { COOP } from "@shared/fund";

/** The crowdpool lane's binding wording (Phase 0 SPEC), verbatim. */
const CROWDPOOLING_LINE =
  "Crowdpooling coordinates and accounts for what people bring to land projects: time, things, skills, land and money. Money goes through outside partners each project holds, never through ReGen Civics. The campaigns shown today are examples; real campaigns open when Season 2 starts crowdpooling.";

const H2 = "text-lg font-bold text-[#ffd700] mb-3";
const DISPLAY = { fontFamily: "var(--font-display)" } as const;
const LINK = "text-[#7dd87d] underline hover:text-[#7dd87d]/80";

export default function Disclaimers() {
  return (
    <LegalPageLayout
      icon={<Shield className="w-8 h-8 text-[#ffd700]" />}
      title="Disclaimers"
      lastUpdated="September 2026"
      seo={pageSEO.disclaimers}
    >
      <div className="space-y-6">

        {/* NOT AN OFFER */}
        <section className="bg-red-900/20 border border-red-500/30 rounded-lg p-5">
          <h2 className="text-lg font-bold text-red-300 mb-3 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            Not an offer
          </h2>
          <p>{COOP.notAnOffer}</p>
        </section>

        <section>
          <h2 className={H2} style={DISPLAY}>The cooperative is in design</h2>
          <p>{COOP.statement}</p>
          <p className="mt-2">{COOP.interestPromise}</p>
          <p className="mt-2">
            <Link href="/fund" className={LINK}>Read how the cooperative is being designed</Link>
          </p>
        </section>

        <section>
          <h2 className={H2} style={DISPLAY}>Who is who</h2>
          <p>{COOP.entities}</p>
        </section>

        <section>
          <h2 className={H2} style={DISPLAY}>Tokens</h2>
          <p>{COOP.tokensNote}</p>
          <p className="mt-2">{COOP.coopTokens.rcivics}</p>
          <p className="mt-2">{COOP.coopTokens.rcvoice}</p>
          <p className="mt-2">
            Tokens you claim to your own wallet live on the Base blockchain. Blockchains, wallets and
            smart contracts can fail, and a lost private key cannot be recovered.
          </p>
        </section>

        <section>
          <h2 className={H2} style={DISPLAY}>Crowdpooling and outside partners</h2>
          <p>{CROWDPOOLING_LINE}</p>
          <p className="mt-2">
            Gifts and loans made through a partner follow that partner's terms, and each loan follows
            its lender's own terms. Loans are at the lender's risk unless the lender and the project
            agree otherwise.
          </p>
          <p className="mt-2">
            Each land project is responsible for its own plans, its results, and how it uses what it
            receives. ReGen Civics does not guarantee any project's outcome.
          </p>
        </section>

        <section>
          <h2 className={H2} style={DISPLAY}>Not financial, legal, or tax advice</h2>
          <p>
            Nothing on this website is financial, legal, or tax advice. The information here is
            general and for informational purposes only. Talk to your own advisers before you make
            decisions about money, land, taxes, or legal structure.
          </p>
          <p className="mt-2">
            ReGen Civics does not act as an adviser or fiduciary to anyone using this website unless a
            formal advisory relationship has been set up in writing.
          </p>
        </section>

        <section>
          <h2 className={H2} style={DISPLAY}>Learning materials and templates</h2>
          <p>
            Learn articles, templates, and season materials describe general approaches that land
            projects have used. Laws differ by country and by state. Confirm anything about legal
            structure, land, tax, or securities with a lawyer licensed where your land sits.
          </p>
        </section>

        <section>
          <h2 className={H2} style={DISPLAY}>Plans and forward-looking statements</h2>
          <p>
            This website describes plans, including the cooperative, future seasons, and features that
            are not built yet. Plans change. Nothing here promises that a plan will happen as
            described.
          </p>
        </section>

        <section>
          <h2 className={H2} style={DISPLAY}>No guarantee of impact</h2>
          <p>
            Land projects work toward regenerative environmental and social impact. There is no
            guarantee that any project will achieve that impact or keep it up.
          </p>
        </section>

        <section>
          <h2 className={H2} style={DISPLAY}>Conflicts of interest</h2>
          <p>
            ReGen Civics and the people who run it may work with, be paid by, or swap tokens with land
            projects and partners described on this website.
          </p>
        </section>

        <section>
          <h2 className={H2} style={DISPLAY}>Third-party sites and partners</h2>
          <p>
            This website links to organizations we do not control, including crowdpooling partners,
            Hypha, and alliance partners. Their own terms and privacy policies apply on their sites.
          </p>
        </section>

        <section>
          <h2 className={H2} style={DISPLAY}>Privacy and Data Collection</h2>
          <p>For details on how we collect, use, and protect your data, please see our <Link href="/privacy-policy" className={LINK}>Privacy Policy</Link>.</p>
        </section>

        {/* Related Documents */}
        <section className="bg-[#1a472a]/50 border border-[#7dd87d]/20 rounded-lg p-5 mt-2">
          <h2 className="text-lg font-bold text-[#7dd87d] mb-3" style={DISPLAY}>Related Legal Documents</h2>
          <div className="space-y-2">
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
