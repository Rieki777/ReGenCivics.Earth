import jsPDF from 'jspdf';

export function generateInvestorDeckPDF() {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const contentWidth = pageWidth - (margin * 2);
  let yPosition = margin;

  // Helper function to add new page if needed
  const checkPageBreak = (requiredSpace: number) => {
    if (yPosition + requiredSpace > pageHeight - margin) {
      doc.addPage();
      yPosition = margin;
      return true;
    }
    return false;
  };

  // Helper function to add text with wrapping
  const addText = (text: string, fontSize: number, isBold: boolean = false, color: [number, number, number] = [0, 0, 0]) => {
    doc.setFontSize(fontSize);
    doc.setFont('helvetica', isBold ? 'bold' : 'normal');
    doc.setTextColor(...color);
    const lines = doc.splitTextToSize(text, contentWidth);
    const lineHeight = fontSize * 0.5;
    
    checkPageBreak(lines.length * lineHeight);
    
    lines.forEach((line: string) => {
      doc.text(line, margin, yPosition);
      yPosition += lineHeight;
    });
    
    yPosition += 5; // Add spacing after text block
  };

  // Cover Page
  doc.setFillColor(26, 71, 42); // #1a472a
  doc.rect(0, 0, pageWidth, pageHeight, 'F');
  
  doc.setTextColor(125, 216, 125); // #7dd87d
  doc.setFontSize(32);
  doc.setFont('helvetica', 'bold');
  doc.text('ReGen Civics Alliance', pageWidth / 2, 80, { align: 'center' });
  
  doc.setFontSize(18);
  doc.setFont('helvetica', 'normal');
  doc.text('Investment Memorandum', pageWidth / 2, 100, { align: 'center' });
  
  doc.setFontSize(12);
  doc.setTextColor(255, 255, 255);
  doc.text('A Regenerative Investment Vehicle for Systemic Change', pageWidth / 2, 120, { align: 'center' });
  
  doc.setFontSize(10);
  doc.text(new Date().toLocaleDateString(), pageWidth / 2, pageHeight - 30, { align: 'center' });

  // Page 2: Executive Summary
  doc.addPage();
  yPosition = margin;
  
  addText('Executive Summary', 20, true, [125, 216, 125]);
  addText('ReGen Civics Alliance is a regenerative investment vehicle designed to fund and support land-based projects that demonstrate true systemic change. Unlike traditional impact funds, we operate as an infinite game, prioritizing long-term regeneration over short-term extraction.', 11, false);
  
  addText('Market Opportunity', 16, true, [125, 216, 125]);
  addText('The regenerative economy represents a $3-5 trillion emerging market. As climate change, social inequality, and ecosystem collapse accelerate, there is unprecedented demand for proven models of regenerative living and land stewardship.', 11, false);
  
  addText('Investment Thesis', 16, true, [125, 216, 125]);
  addText('We invest in land projects that meet our Four Pillars criteria: secure land ownership, demonstrated regeneration, game structure for coordination, and quality participants. By supporting these projects, we create a portfolio of regenerative communities that generate both financial returns and measurable positive impact.', 11, false);

  // Page 3: Fund Status & Requirements
  doc.addPage();
  yPosition = margin;
  
  addText('Fund Status', 20, true, [212, 165, 116]); // #d4a574
  addText('IMPORTANT: The fund is not yet active. We are currently only accepting Letters of Intent (LOIs) from capital partners.', 11, true);
  
  addText('Fund Activation Requirements:', 14, true);
  addText('1. $20M+ in LOIs from committed capital partners', 11, false);
  addText('2. Core fund governance and council established', 11, false);
  addText('3. 13+ ideal land projects and 20+ alliance partners in our network', 11, false);
  
  addText('Why This Approach?', 14, true, [125, 216, 125]);
  addText('By securing commitments before activating the fund, we ensure we have sufficient capital to make meaningful impact and the governance structure to deploy it wisely. This patient approach aligns with our regenerative principles.', 11, false);

  // Page 4: Four Pillars
  doc.addPage();
  yPosition = margin;
  
  addText('The Four Pillars Framework', 20, true, [125, 216, 125]);
  addText('Every land project we consider must demonstrate strength across four essential pillars:', 11, false);
  
  addText('1. Land Ownership', 14, true);
  addText('Projects must have secure, long-term control of their land through ownership, long-term leases, or community land trusts. This ensures stability and prevents displacement.', 11, false);
  
  addText('2. Regeneration', 14, true);
  addText('Projects must demonstrate measurable regenerative practices: soil health improvement, biodiversity increase, water cycle restoration, and carbon sequestration. We look for evidence, not just intentions.', 11, false);
  
  addText('3. Game Structure', 14, true);
  addText('Projects need clear coordination mechanisms, decision-making processes, and conflict resolution systems. This "game structure" ensures the community can navigate challenges and evolve together.', 11, false);
  
  addText('4. Quality Participants', 14, true);
  addText('The people matter most. We look for communities with diverse skills, shared values, demonstrated commitment, and the capacity to execute their vision over decades.', 11, false);

  // Page 5: Governance Evolution
  doc.addPage();
  yPosition = margin;
  
  addText('Governance Evolution', 20, true, [125, 216, 125]);
  addText('ReGen Civics governance evolves through three phases, progressively distributing power from expert stewardship to community ownership.', 11, false);
  
  addText('Birth Phase: Expert Stewardship', 14, true);
  addText('• 70% Council (Expert stewards & MPs)', 11, false);
  addText('• 20% Land Alliance (Land project representatives)', 11, false);
  addText('• 10% Investors (Capital partners)', 11, false);
  addText('The fund begins with experienced stewards acting as Members of Parliament, knowledgeable in fund distributions and experts in each capital class.', 11, false);
  
  addText('Adolescence Phase: Project-Led Growth', 14, true);
  addText('• 88% Land + Alliance (Projects & organizations)', 11, false);
  addText('• 11% Investors (Capital partners)', 11, false);
  addText('• 1% The People (Community members)', 11, false);
  addText('As the network matures, power shifts to land projects and alliance organizations actively building regenerative systems.', 11, false);
  
  addText('Maturity Phase: True Regenerative Democracy', 14, true);
  addText('• 50% The People (Community members)', 11, false);
  addText('• 39% Land Projects (Project representatives)', 11, false);
  addText('• 11% Investors (Capital partners)', 11, false);
  addText('The ultimate vision: governance power rests primarily with the people living in and participating with regenerative communities.', 11, false);

  // Page 6: Investment Structure
  doc.addPage();
  yPosition = margin;
  
  addText('Investment Structure', 20, true, [125, 216, 125]);
  
  addText('Minimum Investment', 14, true);
  addText('$250,000 minimum commitment for capital partners', 11, false);
  
  addText('Investment Horizon', 14, true);
  addText('10+ years. Regenerative systems require patience. We are building for decades, not quarters.', 11, false);
  
  addText('Expected Returns', 14, true);
  addText('We target 8-12% annual returns through a combination of land appreciation, revenue from regenerative businesses, and ecosystem service payments. However, our primary metric is regenerative impact, not financial extraction.', 11, false);
  
  addText('Portfolio Diversification', 14, true);
  addText('Investments spread across multiple geographies, climates, and project types to reduce risk while maximizing learning and cross-pollination.', 11, false);
  
  addText('Exit Strategy', 14, true);
  addText('Projects may exit through community buyout, transfer to land trust, or sale to aligned buyers. We never force exits that would harm the regenerative mission.', 11, false);

  // Page 7: Risk Factors
  doc.addPage();
  yPosition = margin;
  
  addText('Risk Factors', 20, true, [125, 216, 125]);
  addText('All investments carry risk. Regenerative land projects face unique challenges:', 11, false);
  
  addText('Regulatory Risk', 14, true);
  addText('Land use regulations, zoning changes, and policy shifts can impact project viability. We mitigate this through careful site selection and strong community relationships.', 11, false);
  
  addText('Climate Risk', 14, true);
  addText('Extreme weather, droughts, and climate disruption affect land-based projects. Our regenerative practices build resilience, but risk remains.', 11, false);
  
  addText('Community Risk', 14, true);
  addText('Human dynamics are complex. Conflicts, leadership changes, and participant turnover can challenge projects. Our Four Pillars framework helps identify stable communities.', 11, false);
  
  addText('Market Risk', 14, true);
  addText('The regenerative economy is emerging. Market demand for ecosystem services and regenerative products may develop slower than anticipated.', 11, false);
  
  addText('Liquidity Risk', 14, true);
  addText('Land investments are illiquid. Capital partners should expect long holding periods and limited exit options.', 11, false);

  // Page 8: FAQ
  doc.addPage();
  yPosition = margin;
  
  addText('Frequently Asked Questions', 20, true, [125, 216, 125]);
  
  addText('Q: How is this different from traditional impact investing?', 12, true);
  addText('A: We operate as an infinite game, not extractive finance. Our governance evolves to community ownership, and we measure success by regenerative outcomes, not just financial returns.', 11, false);
  
  addText('Q: What happens to my investment if a project fails?', 12, true);
  addText('A: Portfolio diversification reduces single-project risk. If a project exits our portfolio, the land and assets are transferred to aligned stewards or community ownership when possible.', 11, false);
  
  addText('Q: Can I visit the projects I invest in?', 12, true);
  addText('A: Yes! We encourage capital partners to visit projects, participate in seasonal gatherings, and build relationships with the communities you support.', 11, false);
  
  addText('Q: How do you measure regenerative impact?', 12, true);
  addText('A: We track soil health metrics, biodiversity indicators, water quality, carbon sequestration, community wellbeing, and economic resilience. Each project reports quarterly.', 11, false);
  
  addText('Q: What is the timeline for fund activation?', 12, true);
  addText('A: We will activate once we reach $20M+ in LOIs, establish core governance, and have 13+ qualified projects and 20+ alliance partners. We estimate 6-12 months.', 11, false);

  // Page 9: Next Steps
  doc.addPage();
  yPosition = margin;
  
  addText('Next Steps', 20, true, [125, 216, 125]);
  
  addText('1. Submit a Letter of Intent', 14, true);
  addText('Visit regencivics.org/loi to express your interest and pledge amount. This is non-binding and helps us plan fund activation.', 11, false);
  
  addText('2. Schedule a Call', 14, true);
  addText('Meet with our team to discuss your investment goals, ask questions, and learn more about specific projects in our pipeline.', 11, false);
  
  addText('3. Join a Site Visit', 14, true);
  addText('Experience regenerative land projects firsthand. We organize quarterly site visits for prospective capital partners.', 11, false);
  
  addText('4. Receive Updates', 14, true);
  addText('Subscribe to our newsletter for updates on fund activation progress, new projects, and regenerative economy insights.', 11, false);
  
  yPosition += 20;
  addText('Contact Information', 16, true, [125, 216, 125]);
  addText('Email: invest@regencivics.org', 11, false);
  addText('Website: regencivics.org', 11, false);
  addText('Schedule a call: calendly.com/rieki-cordon/30min', 11, false);

  // Save the PDF
  doc.save('ReGen-Civics-Investment-Memorandum.pdf');
}
