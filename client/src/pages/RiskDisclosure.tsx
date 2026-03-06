/**
 * Risk Disclosure Statement Page
 * Legal document page with enchanted forest theme
 */

import { pageSEO } from "@/components/SEO";
import { AlertTriangle } from "lucide-react";
import LegalPageLayout from "@/components/LegalPageLayout";

export default function RiskDisclosure() {
  return (
    <LegalPageLayout
      icon={<AlertTriangle className="w-8 h-8 text-[#ffd700]" />}
      title="Risk Disclosure Statement"
      lastUpdated="February 2026"
      seo={pageSEO.riskDisclosure}
    >
      <div className="space-y-8">
          
          <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-4 mb-8">
            <p className="text-red-300 font-bold text-base mb-2">READ THIS CAREFULLY BEFORE INVESTING</p>
            <p className="text-white/70">
              Investment in ReGen Civics funds, regenerative land projects, community developments, and alliance organizations involves significant risks. You could lose all of your invested capital. This Risk Disclosure Statement describes principal risks but is not exhaustive. Additional risks may be described in offering documents.
            </p>
          </div>

          <h2 className="text-xl font-bold text-[#7dd87d] mt-8 mb-4" style={{ fontFamily: 'var(--font-display)' }}>Principal Risks</h2>

          <div className="space-y-6">
            <section>
              <h3 className="text-base font-bold text-white mb-2">1. Risk of Total Loss</h3>
              <p>You may lose your entire investment. There is no guarantee you will receive any return of capital or profit. Only invest amounts you can afford to lose completely.</p>
            </section>

            <section>
              <h3 className="text-base font-bold text-white mb-2">2. Illiquidity Risk</h3>
              <p>There is no public market for these securities and while we intend to lead the market in creating liquidity on secondary markets, principally on Coinbase and it's Blockchain; you may not be able to sell or transfer your investment even in emergencies until these markets mature.</p>
            </section>

            <section>
              <h3 className="text-base font-bold text-white mb-2">3. Speculative Investment</h3>
              <p>These investments are highly speculative and suitable only for sophisticated investors who understand and can bear the risks.</p>
            </section>

            <section>
              <h3 className="text-base font-bold text-white mb-2">4. Land Project Execution Risk</h3>
              <p>While our portfolio will focus on established projects. Projects may still fail to develop as planned due to: construction delays or cost overruns, permitting and regulatory issues, environmental challenges, community opposition, management failures, and funding shortfalls.</p>
            </section>

            <section>
              <h3 className="text-base font-bold text-white mb-2">5. Market Risk</h3>
              <p>Real estate and land values may decline. Regenerative agriculture projects may not achieve projected yields or markets. Housing and community development projects may face demand fluctuations, construction cost overruns, or shifts in buyer and renter preferences.</p>
            </section>

            <section>
              <h3 className="text-base font-bold text-white mb-2">6. Environmental and Climate Risk</h3>
              <p>Projects are subject to climate change impacts, natural disasters (floods, fires, drought), soil degradation, water scarcity, and ecosystem failures.</p>
            </section>

            <section>
              <h3 className="text-base font-bold text-white mb-2">7. Regulatory Risk</h3>
              <p>Changes in laws regarding land use and zoning, environmental regulations, agricultural practices, securities regulations, building codes, housing standards, community governance requirements, and tax treatment could materially impact investments. Startup villages and intentional communities may face evolving regulatory frameworks that differ significantly across jurisdictions.</p>
            </section>

            <section>
              <h3 className="text-base font-bold text-white mb-2">8. Lack of Diversification</h3>
              <p>While the fund invests across both land projects and alliance organizations, concentration in the regenerative sector creates portfolio risk. Correlation between land project performance and alliance organization success may reduce the diversification benefit of the dual-arm structure.</p>
            </section>

            <section>
              <h3 className="text-base font-bold text-white mb-2">9. Management Risk</h3>
              <p>Investment success depends on the skill and integrity of project managers and ReGen Civics management. Poor decisions could result in losses.</p>
            </section>

            <section>
              <h3 className="text-base font-bold text-white mb-2">10. Conflicts of Interest</h3>
              <p>ReGen Civics and affiliates may have interests that conflict with investor interests, including fees and compensation, related-party transactions, co-investments, and service provider relationships.</p>
              <p className="mt-2">Additionally, the multi-stakeholder governance structure creates inherent conflicts between portfolio project representatives (prioritizing project needs), investor representatives (prioritizing returns), and expert council members (potential consulting relationships).</p>
            </section>

            <section>
              <h3 className="text-base font-bold text-white mb-2">11. Governance Structure Risk</h3>
              <p className="font-semibold text-white/90 mb-2">Unique Governance Model:</p>
              <p>ReGen Civics employs an innovative governance structure with direct participation from portfolio projects, investors, and an expert council. While designed for transparency and accountability, this structure presents distinct risks:</p>
              
              <p className="font-semibold text-white/90 mt-3 mb-1">Supermajority Gridlock:</p>
              <p>The 90% unity requirement may prevent necessary or beneficial changes. Minority stakeholders (greater than 10%) can block critical decisions. This may result in inability to adapt to changing circumstances and could prevent dissolution even if the fund underperforms.</p>
              
              <p className="font-semibold text-white/90 mt-3 mb-1">Multi-Stakeholder Conflicts:</p>
              <p>Different groups have fundamentally different objectives. Project representatives may resist profit-maximizing decisions. Investor representatives may resist impact-focused investments. Expert council members may have conflicting professional interests.</p>
              
              <p className="font-semibold text-white/90 mt-3 mb-1">Decision-Making Complexity:</p>
              <p>Slower decision-making compared to traditional fund structures. Coordination challenges across diverse stakeholder groups. Potential for strategic blocking or gaming of governance processes. May miss time-sensitive opportunities.</p>
              
              <p className="font-semibold text-white/90 mt-3 mb-1">Novel Structure Without Track Record:</p>
              <p>This governance approach is non-traditional and experimental. Limited precedent for resolving disputes. Uncertain regulatory treatment. Unknown effectiveness under market stress.</p>
              
              <p className="font-semibold text-white/90 mt-3 mb-1">Dynamic Structure Risk:</p>
              <p>Fund structure may change significantly over time. Changes require 90% approval (high bar) unless modified by stakeholders. Stakeholders may modify voting thresholds during operations. Future governance may differ materially from initial structure. Investors may not approve of governance evolution.</p>
              
              <p className="font-semibold text-white/90 mt-3 mb-1">Fiduciary Complexity:</p>
              <p>Unclear fiduciary duties across multi-stakeholder governance. Potential conflicts between duties to different constituent groups. Legal uncertainty about liability and authority.</p>
              
              <p className="mt-3">Investors seeking traditional fund governance with centralized decision-making should consider whether this participatory model aligns with their expectations.</p>
            </section>

            <section>
              <h3 className="text-base font-bold text-white mb-2">12. Information Asymmetry</h3>
              <p>Private investments provide less transparency than public securities. You may have limited information to evaluate ongoing performance.</p>
            </section>

            <section>
              <h3 className="text-base font-bold text-white mb-2">13. Tax Risk</h3>
              <p>Tax treatment is uncertain and may change. Investments may generate tax liabilities without corresponding cash distributions. Consult tax advisors.</p>
            </section>

            <section>
              <h3 className="text-base font-bold text-white mb-2">14. Valuation Risk</h3>
              <p>Valuation of illiquid land projects is subjective. Stated values may not reflect realizable value.</p>
            </section>

            <section>
              <h3 className="text-base font-bold text-white mb-2">15. Leverage Risk</h3>
              <p>If projects use debt financing, leverage magnifies both gains and losses.</p>
            </section>

            <section>
              <h3 className="text-base font-bold text-white mb-2">16. Operational Risk</h3>
              <p>Projects face operational challenges including labor availability, supply chain disruptions, technology failures, and infrastructure limitations. Community-based projects carry additional operational complexity related to shared governance, communal living arrangements, and the coordination of multiple stakeholders with differing priorities.</p>
            </section>

            <section>
              <h3 className="text-base font-bold text-white mb-2">17. No Guarantee of Impact</h3>
              <p>While projects aim for regenerative environmental and social impact, there is no guarantee such impact will be achieved or sustained.</p>
            </section>

            <section>
              <h3 className="text-base font-bold text-white mb-2">18. Limited Operating History</h3>
              <p>ReGen Civics and/or specific land projects may have limited track records, making performance prediction difficult.</p>
            </section>

            <section>
              <h3 className="text-base font-bold text-white mb-2">19. Competition Risk</h3>
              <p>Increasing interest in regenerative land projects may increase competition for land, resources, and capital.</p>
            </section>

            <section>
              <h3 className="text-base font-bold text-white mb-2">20. Fraud Risk</h3>
              <p>As with any investment, there is risk of fraud, misrepresentation, or misappropriation of funds.</p>
            </section>

            <section>
              <h3 className="text-base font-bold text-white mb-2">21. Force Majeure</h3>
              <p>Wars, pandemics, civil unrest, and other unpredictable events could materially impact investments.</p>
            </section>

            <section>
              <h3 className="text-base font-bold text-white mb-2">22. Community Development Risk</h3>
              <p>Startup villages, regenerative communities, and micro-cities involve complex social dynamics. Community cohesion challenges, interpersonal conflicts, leadership disputes, cultural misalignment among residents, and governance disagreements may impair project operations, reduce occupancy, or lead to community dissolution. The success of community-based projects depends heavily on the quality of social fabric, which is inherently difficult to predict or control.</p>
            </section>

            <section>
              <h3 className="text-base font-bold text-white mb-2">23. Housing and Construction Risk</h3>
              <p>Projects involving housing development face risks including construction cost overruns, material supply chain disruptions, permitting delays, building code compliance challenges, contractor availability, and quality control issues. Innovative or alternative building methods (such as prefabricated, earthen, or biomaterial construction) may face additional regulatory scrutiny, insurance limitations, or resale value uncertainty. Housing markets are cyclical and subject to interest rate sensitivity.</p>
            </section>

            <section>
              <h3 className="text-base font-bold text-white mb-2">24. Infrastructure Risk</h3>
              <p>Regenerative communities require significant infrastructure investment including water systems, energy generation and storage, waste management, roads, telecommunications, and shared facilities. Infrastructure may cost more than projected, take longer to build, require ongoing maintenance beyond budgeted amounts, or become obsolete as technology evolves. Off-grid or alternative infrastructure systems may face reliability challenges, especially in remote locations.</p>
            </section>

            <section>
              <h3 className="text-base font-bold text-white mb-2">25. Alliance Organization Risk</h3>
              <p>The fund's venture capital allocation invests in alliance organizations (companies providing housing, energy, governance, waste management, education, and other services to regenerative communities). These organizations face typical startup and growth-stage risks including cash flow challenges, competitive pressure, technology obsolescence, key person dependency, and market timing risk. Alliance organizations may fail to achieve product-market fit, scale operations, or generate sustainable revenue, resulting in partial or total loss of invested capital.</p>
            </section>

            <section>
              <h3 className="text-base font-bold text-white mb-2">26. Cross-Border and Multi-Jurisdictional Risk</h3>
              <p>The fund operates globally, investing in land projects and alliance organizations across diverse jurisdictions. Each jurisdiction presents unique risks related to property rights, foreign ownership restrictions, currency exchange fluctuations, political instability, tax treaties, repatriation of funds, and differing legal frameworks for community governance, land tenure, and environmental compliance. Global diversification, while reducing concentration risk, increases the complexity of regulatory compliance and operational oversight. Changes in immigration policy may affect community membership and project viability in any given jurisdiction.</p>
            </section>

            <section>
              <h3 className="text-base font-bold text-white mb-2">27. Social Impact Measurement Risk</h3>
              <p>Measuring the social impact of community development, housing provision, and governance innovation is inherently subjective and methodologically challenging. Impact metrics may not capture the full scope of outcomes (positive or negative). There is no universally accepted standard for measuring regenerative community impact, and reported metrics may not be comparable across projects or to other investment vehicles.</p>
            </section>
          </div>

          <h2 className="text-xl font-bold text-[#7dd87d] mt-10 mb-4" style={{ fontFamily: 'var(--font-display)' }}>Additional Risk Factors</h2>

          <div className="space-y-6">
            <section>
              <h3 className="text-base font-bold text-white mb-2">Token Liquidity Risk</h3>
              <p>Secondary market liquidity for $RCivics is a target, not a guarantee. Market conditions, regulatory changes, or insufficient ecosystem maturity could delay or prevent token listing. Even if secondary markets develop, liquidity may be limited, spreads may be wide, and prices may be volatile. Investors should assume capital will be illiquid for extended periods and invest only what they can afford to lock up long-term.</p>
            </section>

            <section>
              <h3 className="text-base font-bold text-white mb-2">Regulatory Risk (Crypto-Specific)</h3>
              <p>The combination of traditional fund structure with tokenized governance and distribution is innovative and untested at scale. Regulatory treatment of $RCivics could change, potentially affecting liquidity, transferability, or tax treatment. The SEC or other regulators could determine $RCivics is a security, requiring registration or restricting trading. International regulatory frameworks for crypto assets vary widely and are evolving rapidly.</p>
            </section>

            <section>
              <h3 className="text-base font-bold text-white mb-2">Technology Risk</h3>
              <p>Dependence on blockchain infrastructure (Base network), smart contract functionality, and cybersecurity measures creates technology-specific risks. Smart contract bugs, network disruptions, loss of private keys, or successful cyberattacks could affect governance, distributions, or token value. While we employ industry-standard security practices including multi-signature wallets and audited smart contracts, no system is completely secure.</p>
            </section>

            <section>
              <h3 className="text-base font-bold text-white mb-2">Perpetual Structure Risk</h3>
              <p>Unlike traditional funds with defined exit timelines, this perpetual structure means the fund may never liquidate. While this allows long-term value creation, it also means no guaranteed exit event. Investors relying on fund liquidation for liquidity will be disappointed. Liquidity depends entirely on secondary market development or limited redemption programs.</p>
            </section>

            <section>
              <h3 className="text-base font-bold text-white mb-2">Ecosystem Dependency Risk</h3>
              <p>The value of $RCivics depends on successful growth of the regenerative ecosystem. If land projects fail, alliance organizations struggle to generate revenue, or network effects fail to materialize, token value and distributions could be significantly impaired. The "index fund for regenerative renaissance" thesis requires critical mass that may not be achieved.</p>
            </section>

            <section>
              <h3 className="text-base font-bold text-white mb-2">Minority Investment Risk</h3>
              <p>For Fund I-II, we invest minority stakes (typically 20-40%) in operating land projects. We do not have operational control. Project performance depends on existing management teams and community governance structures. While alliance support reduces risk, we cannot guarantee project outcomes.</p>
            </section>

            <section>
              <h3 className="text-base font-bold text-white mb-2">Governance Event Risk</h3>
              <p>The final fund structure will be determined collaboratively at a governance event with all stakeholders. Terms may differ from those presented here. Investors submitting Letters of Intent should understand the current model is a starting framework, not final terms.</p>
            </section>
          </div>

          <h2 className="text-xl font-bold text-[#7dd87d] mt-10 mb-4" style={{ fontFamily: 'var(--font-display)' }}>Fee Structure Disclosure</h2>
          <div className="bg-[#1a472a]/50 border border-[#7dd87d]/20 rounded-lg p-4 mb-8">
            <p className="text-white/80 text-sm leading-relaxed">The fund charges a 1.5% annual management fee on committed capital and 20% carried interest on profits above an 8% preferred return to limited partners. Carried interest applies only to: (1) quarterly cash distributions from portfolio operations, and (2) proceeds from asset sales, refinancings, or exits. Carried interest does NOT apply to gains realized by limited partners through secondary market sales of $RCivics tokens. See the Opportunity page for complete details on how carried interest works.</p>
          </div>

          <h2 className="text-xl font-bold text-[#7dd87d] mt-10 mb-4" style={{ fontFamily: 'var(--font-display)' }}>Legal Disclaimer</h2>
          <div className="bg-[#1a472a]/50 border border-[#7dd87d]/20 rounded-lg p-4 mb-8 space-y-3">
            <p className="text-white/70 text-sm leading-relaxed">This page is provided for informational purposes only and does not constitute an offer to sell or a solicitation of an offer to buy any securities. Any such offer would only be made pursuant to a confidential private placement memorandum to accredited investors in compliance with applicable securities laws, including Regulation D under the Securities Act of 1933.</p>
            <p className="text-white/70 text-sm leading-relaxed">Past performance does not guarantee future results. Projected returns are estimates based on industry benchmarks and portfolio analysis and may not be achieved. This investment involves substantial risk, including the possible loss of principal. Forward-looking statements involve risks and uncertainties; actual results may differ materially.</p>
            <p className="text-white/70 text-sm leading-relaxed">Investment in ReGen Civics Alliance is limited to accredited investors as defined by applicable securities laws. This document does not provide tax, legal, or financial advice. Investors should consult their own advisors before making any investment decision.</p>
            <p className="text-white/50 text-xs italic mt-3">Market data sources: Mordor Intelligence (2026), Bain & Company (2025), AgFunder News (2024), Rockefeller Foundation (2024), USDA Economic Research Service, NCREIF Farmland Property Index, BCG (2025), Forbes/Analysts (2025), Global Wellness Institute, Precedence Research, Global Sustainable Investment Review.</p>
          </div>

          <h2 className="text-xl font-bold text-[#7dd87d] mt-10 mb-4" style={{ fontFamily: 'var(--font-display)' }}>Investor Acknowledgment</h2>
          
          <div className="bg-[#1a472a]/50 border border-[#7dd87d]/20 rounded-lg p-4">
            <p className="mb-3">Before investing, you must acknowledge that you:</p>
            <ul className="space-y-2 list-disc list-inside text-white/70">
              <li>Have read and understand this Risk Disclosure</li>
              <li>Understand you may lose your entire investment</li>
              <li>Have sufficient financial resources to bear such loss</li>
              <li>Have consulted with advisors as necessary</li>
              <li>Are not relying on ReGen Civics for investment advice</li>
              <li>Understand the illiquid nature of the investment</li>
              <li>Have reviewed all offering documents</li>
              <li>Meet accredited investor requirements</li>
              <li>Understand and accept the unique multi-stakeholder governance structure</li>
              <li>Understand that material changes require 90% stakeholder approval</li>
              <li>Acknowledge that this governance model is novel and may not perform as intended</li>
              <li>Accept that stakeholders may modify governance procedures during operations</li>
              <li>Understand the risks specific to community development, housing, and infrastructure projects</li>
              <li>Understand the risks associated with alliance organization investments</li>
              <li>Acknowledge the cross-border and multi-jurisdictional nature of the fund's operations</li>
            </ul>
          </div>

          <p className="text-white/50 text-xs mt-8 italic">
            This Risk Disclosure does not constitute legal, tax, or investment advice. Consult qualified professionals before investing.
          </p>
      </div>
    </LegalPageLayout>
  );
}
