/**
 * PDF Generator for Contribution Calculator
 * Creates a Doughnut Economics style visualization with concentric rings
 * Each segment represents one of the 8 Forms of Capital, sized by contribution value
 * Labels positioned outside the ring for better readability
 */

import jsPDF from 'jspdf';

interface CapitalBreakdownItem {
  id: string;
  name: string;
  color: string;
  value: number;
  percentage: number;
  questions: Array<{
    label: string;
    key: string;
    multiplier?: number;
  }>;
}

interface ContributionData {
  contributionName: string;
  totalValue: number;
  capitalBreakdown: CapitalBreakdownItem[];
  values: { [key: string]: { [key: string]: number } };
}

// Format currency for display
const formatCurrency = (value: number): string => {
  if (value >= 1000000) {
    return `$${(value / 1000000).toFixed(2)}M`;
  } else if (value >= 1000) {
    return `$${(value / 1000).toFixed(1)}K`;
  }
  return `$${value.toFixed(0)}`;
};

// Convert hex color to RGB
const hexToRgb = (hex: string): [number, number, number] => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result 
    ? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)]
    : [0, 0, 0];
};

// Lighten a color for fills
const lightenColor = (rgb: [number, number, number], amount: number): [number, number, number] => {
  return [
    Math.min(255, rgb[0] + (255 - rgb[0]) * amount),
    Math.min(255, rgb[1] + (255 - rgb[1]) * amount),
    Math.min(255, rgb[2] + (255 - rgb[2]) * amount)
  ] as [number, number, number];
};

// Draw the doughnut chart visualization with external labels
const drawDoughnutChart = (
  doc: jsPDF, 
  centerX: number, 
  centerY: number, 
  outerRadius: number,
  capitalBreakdown: CapitalBreakdownItem[],
  totalValue: number
) => {
  // Filter capitals with values
  const activeCapitals = capitalBreakdown.filter(c => c.value > 0);
  
  if (activeCapitals.length === 0) {
    // Draw empty ring
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(1);
    doc.circle(centerX, centerY, outerRadius, 'S');
    doc.circle(centerX, centerY, outerRadius * 0.6, 'S');
    return;
  }
  
  const innerRadius = outerRadius * 0.55;
  const ringWidth = outerRadius - innerRadius;
  
  // Calculate angles for each segment
  let currentAngle = -Math.PI / 2; // Start from top
  
  // Store segment info for labels
  const segments: Array<{
    capital: CapitalBreakdownItem;
    startAngle: number;
    endAngle: number;
    midAngle: number;
  }> = [];
  
  // First pass: draw all segments
  activeCapitals.forEach((capital) => {
    const sweepAngle = (capital.percentage / 100) * 2 * Math.PI;
    const endAngle = currentAngle + sweepAngle;
    const midAngle = currentAngle + sweepAngle / 2;
    
    segments.push({
      capital,
      startAngle: currentAngle,
      endAngle,
      midAngle
    });
    
    const baseColor = hexToRgb(capital.color);
    const fillColor = lightenColor(baseColor, 0.25);
    
    const steps = 40;
    
    // Draw filled arc segment
    for (let i = 0; i < steps; i++) {
      const a1 = currentAngle + (sweepAngle * i / steps);
      const a2 = currentAngle + (sweepAngle * (i + 1) / steps);
      
      const x1o = centerX + outerRadius * Math.cos(a1);
      const y1o = centerY + outerRadius * Math.sin(a1);
      const x2o = centerX + outerRadius * Math.cos(a2);
      const y2o = centerY + outerRadius * Math.sin(a2);
      const x1i = centerX + innerRadius * Math.cos(a1);
      const y1i = centerY + innerRadius * Math.sin(a1);
      const x2i = centerX + innerRadius * Math.cos(a2);
      const y2i = centerY + innerRadius * Math.sin(a2);
      
      // Draw filled quadrilateral
      doc.setFillColor(...fillColor);
      doc.triangle(x1o, y1o, x2o, y2o, x1i, y1i, 'F');
      doc.triangle(x2o, y2o, x2i, y2i, x1i, y1i, 'F');
    }
    
    // Draw segment borders
    doc.setDrawColor(...baseColor);
    doc.setLineWidth(1);
    
    // Radial lines at start and end
    const startXo = centerX + outerRadius * Math.cos(currentAngle);
    const startYo = centerY + outerRadius * Math.sin(currentAngle);
    const startXi = centerX + innerRadius * Math.cos(currentAngle);
    const startYi = centerY + innerRadius * Math.sin(currentAngle);
    doc.line(startXi, startYi, startXo, startYo);
    
    // Draw outer arc
    doc.setLineWidth(0.8);
    for (let i = 0; i < steps; i++) {
      const a1 = currentAngle + (sweepAngle * i / steps);
      const a2 = currentAngle + (sweepAngle * (i + 1) / steps);
      const x1 = centerX + outerRadius * Math.cos(a1);
      const y1 = centerY + outerRadius * Math.sin(a1);
      const x2 = centerX + outerRadius * Math.cos(a2);
      const y2 = centerY + outerRadius * Math.sin(a2);
      doc.line(x1, y1, x2, y2);
    }
    
    // Draw inner arc
    for (let i = 0; i < steps; i++) {
      const a1 = currentAngle + (sweepAngle * i / steps);
      const a2 = currentAngle + (sweepAngle * (i + 1) / steps);
      const x1 = centerX + innerRadius * Math.cos(a1);
      const y1 = centerY + innerRadius * Math.sin(a1);
      const x2 = centerX + innerRadius * Math.cos(a2);
      const y2 = centerY + innerRadius * Math.sin(a2);
      doc.line(x1, y1, x2, y2);
    }
    
    currentAngle = endAngle;
  });
  
  // Second pass: draw external labels with leader lines - 300% bigger text
  const labelRadius = outerRadius + 18;
  
  segments.forEach(({ capital, midAngle }) => {
    const baseColor = hexToRgb(capital.color);
    
    // Calculate label position
    const labelX = centerX + labelRadius * Math.cos(midAngle);
    const labelY = centerY + labelRadius * Math.sin(midAngle);
    
    // Determine text alignment based on position
    const isRightSide = midAngle > -Math.PI / 2 && midAngle < Math.PI / 2;
    const align = isRightSide ? 'left' : 'right';
    const textX = isRightSide ? labelX + 4 : labelX - 4;
    
    // Draw leader line from segment to label
    const lineStartX = centerX + (outerRadius + 2) * Math.cos(midAngle);
    const lineStartY = centerY + (outerRadius + 2) * Math.sin(midAngle);
    
    doc.setDrawColor(...baseColor);
    doc.setLineWidth(0.8);
    doc.line(lineStartX, lineStartY, labelX, labelY);
    
    // Draw larger dot at end of leader line
    doc.setFillColor(...baseColor);
    doc.circle(labelX, labelY, 1.5, 'F');
    
    // Draw capital name - 300% bigger (7 -> 21pt, but capped at reasonable size)
    const shortName = capital.name.replace(' Capital', '');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(...baseColor);
    doc.text(shortName, textX, labelY - 2, { align });
    
    // Draw value - 300% bigger (6 -> 18pt, but capped at reasonable size)
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.setTextColor(80, 80, 80);
    doc.text(`${formatCurrency(capital.value)} (${capital.percentage.toFixed(0)}%)`, textX, labelY + 6, { align });
  });
  
  // Draw center circle with Seed of Life - no text inside
  const centerCircleRadius = innerRadius * 0.92;
  
  // Solid dark green background for center
  doc.setFillColor(26, 71, 42);
  doc.circle(centerX, centerY, centerCircleRadius, 'F');
  
  // Draw larger Seed of Life pattern in center (like reference image)
  doc.setDrawColor(255, 255, 255);
  doc.setLineWidth(1.2);
  const seedRadius = centerCircleRadius * 0.45;
  
  // Center circle
  doc.circle(centerX, centerY, seedRadius, 'S');
  
  // 6 surrounding circles forming the Seed of Life
  for (let i = 0; i < 6; i++) {
    const angle = (i * 60) * Math.PI / 180;
    const sx = centerX + seedRadius * Math.cos(angle);
    const sy = centerY + seedRadius * Math.sin(angle);
    doc.circle(sx, sy, seedRadius, 'S');
  }
  
  // No text in center - total will be displayed below the chart
};

export const generateContributionPDF = (data: ContributionData): void => {
  const { contributionName, totalValue, capitalBreakdown, values } = data;
  const date = new Date().toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
  
  // Create PDF document
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });
  
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  let yPos = margin;
  
  // Colors
  const primaryGreen = [46, 125, 50] as [number, number, number];
  const lightGreen = [200, 230, 200] as [number, number, number];
  const darkGreen = [26, 71, 42] as [number, number, number];
  const warmBg = [252, 251, 248] as [number, number, number];
  const gold = [212, 175, 55] as [number, number, number];
  
  // ==================== PAGE 1: Visualization ====================
  
  // Soft background
  doc.setFillColor(...warmBg);
  doc.rect(0, 0, pageWidth, pageHeight, 'F');
  
  // Decorative border
  doc.setDrawColor(...lightGreen);
  doc.setLineWidth(0.5);
  doc.roundedRect(8, 8, pageWidth - 16, pageHeight - 16, 5, 5, 'S');
  
  // Inner decorative border
  doc.setDrawColor(...primaryGreen);
  doc.setLineWidth(0.3);
  doc.roundedRect(12, 12, pageWidth - 24, pageHeight - 24, 3, 3, 'S');
  
  // Header
  yPos = 25;
  
  // Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(28);
  doc.setTextColor(...darkGreen);
  doc.text('ReGen Civics', pageWidth / 2, yPos, { align: 'center' });
  
  // Decorative line under title
  doc.setDrawColor(...gold);
  doc.setLineWidth(1);
  doc.line(pageWidth / 2 - 40, yPos + 4, pageWidth / 2 + 40, yPos + 4);
  
  yPos += 12;
  
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(12);
  doc.setTextColor(100, 100, 100);
  doc.text('Contribution Value Certificate', pageWidth / 2, yPos, { align: 'center' });
  
  yPos += 15;
  
  // Contribution name in elegant box
  if (contributionName) {
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(...primaryGreen);
    doc.setLineWidth(0.5);
    doc.roundedRect(margin + 10, yPos, pageWidth - (margin * 2) - 20, 14, 3, 3, 'FD');
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(...darkGreen);
    doc.text(contributionName, pageWidth / 2, yPos + 9, { align: 'center' });
    
    yPos += 20;
  }
  
  // Date
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(120, 120, 120);
  doc.text(date, pageWidth / 2, yPos, { align: 'center' });
  
  yPos += 10;
  
  // Draw the doughnut chart visualization
  const vizCenterX = pageWidth / 2;
  const vizCenterY = yPos + 50;
  const vizRadius = 42;
  
  drawDoughnutChart(doc, vizCenterX, vizCenterY, vizRadius, capitalBreakdown, totalValue);
  
  yPos = vizCenterY + vizRadius + 25;
  
  // Big bold TOTAL underneath the chart
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(100, 100, 100);
  doc.text('TOTAL', pageWidth / 2, yPos, { align: 'center' });
  
  yPos += 10;
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(32);
  doc.setTextColor(...darkGreen);
  doc.text(formatCurrency(totalValue), pageWidth / 2, yPos, { align: 'center' });
  
  yPos += 15;
  
  // Legend title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...darkGreen);
  doc.text('The 8 Forms of Capital', pageWidth / 2, yPos, { align: 'center' });
  
  yPos += 8;
  
  // Draw legend in two rows
  const legendStartX = margin + 5;
  const legendWidth = (pageWidth - margin * 2 - 10) / 4;
  
  capitalBreakdown.forEach((capital, index) => {
    const row = Math.floor(index / 4);
    const col = index % 4;
    const x = legendStartX + col * legendWidth;
    const y = yPos + row * 12;
    
    const rgb = hexToRgb(capital.color);
    
    // Color dot
    doc.setFillColor(...rgb);
    doc.circle(x + 3, y + 2, 2.5, 'F');
    
    // Capital name
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(80, 80, 80);
    const shortName = capital.name.replace(' Capital', '');
    doc.text(shortName, x + 8, y + 3.5);
  });
  
  yPos += 30;
  
  // Inspirational quote box
  doc.setFillColor(245, 250, 245);
  doc.roundedRect(margin + 10, yPos, pageWidth - (margin * 2) - 20, 20, 3, 3, 'F');
  
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(10);
  doc.setTextColor(80, 100, 80);
  doc.text('"Every contribution, no matter the form, creates ripples of regeneration."', pageWidth / 2, yPos + 8, { align: 'center' });
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text('Share your contribution story and inspire others to join the movement.', pageWidth / 2, yPos + 15, { align: 'center' });
  
  yPos += 28;
  
  // Hypha link
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...primaryGreen);
  doc.textWithLink('Submit your proposal at app.hypha.earth/regen-games', pageWidth / 2, yPos, {
    align: 'center',
    url: 'https://app.hypha.earth/en/dho/regen-games/agreements/create'
  });
  
  // ==================== PAGE 2: Detailed Breakdown ====================
  doc.addPage();
  
  // Background
  doc.setFillColor(...warmBg);
  doc.rect(0, 0, pageWidth, pageHeight, 'F');
  
  // Border
  doc.setDrawColor(...lightGreen);
  doc.setLineWidth(0.5);
  doc.roundedRect(8, 8, pageWidth - 16, pageHeight - 16, 5, 5, 'S');
  
  yPos = 20;
  
  // Page title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(...darkGreen);
  doc.text('Contribution Breakdown', pageWidth / 2, yPos, { align: 'center' });
  
  yPos += 15;
  
  // Summary box
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(...primaryGreen);
  doc.setLineWidth(0.5);
  doc.roundedRect(margin, yPos, pageWidth - margin * 2, 25, 3, 3, 'FD');
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(...darkGreen);
  doc.text(contributionName || 'Contribution', margin + 10, yPos + 10);
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(...primaryGreen);
  doc.text(formatCurrency(totalValue), pageWidth - margin - 10, yPos + 10, { align: 'right' });
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  doc.text('Total Estimated Value', pageWidth - margin - 10, yPos + 18, { align: 'right' });
  
  yPos += 35;
  
  // Capital breakdown sections
  const activeCapitals = capitalBreakdown.filter(c => c.value > 0);
  
  activeCapitals.forEach((capital) => {
    // Check if we need a new page
    if (yPos > pageHeight - 50) {
      doc.addPage();
      doc.setFillColor(...warmBg);
      doc.rect(0, 0, pageWidth, pageHeight, 'F');
      doc.setDrawColor(...lightGreen);
      doc.setLineWidth(0.5);
      doc.roundedRect(8, 8, pageWidth - 16, pageHeight - 16, 5, 5, 'S');
      yPos = 20;
    }
    
    const rgb = hexToRgb(capital.color);
    const lightRgb = lightenColor(rgb, 0.85);
    
    // Capital header
    doc.setFillColor(...lightRgb);
    doc.setDrawColor(...rgb);
    doc.setLineWidth(0.5);
    doc.roundedRect(margin, yPos, pageWidth - margin * 2, 10, 2, 2, 'FD');
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(...rgb);
    doc.text(capital.name, margin + 5, yPos + 7);
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text(formatCurrency(capital.value), pageWidth - margin - 5, yPos + 7, { align: 'right' });
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text(`(${capital.percentage.toFixed(1)}%)`, pageWidth - margin - 30, yPos + 7, { align: 'right' });
    
    yPos += 14;
    
    // Line items for this capital
    const capitalValues = values[capital.id] || {};
    const activeQuestions = capital.questions.filter(q => capitalValues[q.key] > 0);
    
    activeQuestions.forEach((question) => {
      const inputValue = capitalValues[question.key] || 0;
      const multiplier = question.multiplier || 1;
      const calculatedValue = inputValue * multiplier;
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(80, 80, 80);
      
      // Question label
      const labelText = question.label.length > 35 
        ? question.label.substring(0, 35) + '...' 
        : question.label;
      doc.text(labelText, margin + 8, yPos);
      
      // Calculation
      doc.setFontSize(8);
      doc.setTextColor(120, 120, 120);
      const calcText = `${inputValue} x ${multiplier >= 1 ? '$' + multiplier : multiplier + 'x'} = `;
      doc.text(calcText, pageWidth - margin - 35, yPos, { align: 'right' });
      
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(...rgb);
      doc.text(formatCurrency(calculatedValue), pageWidth - margin - 5, yPos, { align: 'right' });
      
      yPos += 6;
    });
    
    yPos += 6;
  });
  
  // ==================== PAGE 3: About & Call to Action ====================
  doc.addPage();
  
  // Background
  doc.setFillColor(...warmBg);
  doc.rect(0, 0, pageWidth, pageHeight, 'F');
  
  // Border
  doc.setDrawColor(...lightGreen);
  doc.setLineWidth(0.5);
  doc.roundedRect(8, 8, pageWidth - 16, pageHeight - 16, 5, 5, 'S');
  
  yPos = 25;
  
  // About section title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(...darkGreen);
  doc.text('About the 8 Forms of Capital', pageWidth / 2, yPos, { align: 'center' });
  
  yPos += 12;
  
  // Description
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(80, 80, 80);
  
  const aboutText = [
    'The 8 Forms of Capital framework recognizes that true wealth extends far beyond',
    'money. By valuing diverse contributions, we create regenerative economies where',
    'all forms of giving are honored and rewarded.'
  ];
  
  aboutText.forEach((line) => {
    doc.text(line, pageWidth / 2, yPos, { align: 'center' });
    yPos += 5;
  });
  
  yPos += 10;
  
  // Capital descriptions in a grid
  const capitalDescriptions: { [key: string]: string } = {
    financial: 'Money, currencies, and financial instruments',
    material: 'Physical assets, tools, and infrastructure',
    living: 'Land, ecosystems, and natural resources',
    intellectual: 'Knowledge, ideas, and intellectual property',
    experiential: 'Skills, expertise, and embodied knowledge',
    social: 'Relationships, networks, and community',
    cultural: 'Traditions, art, and shared practices',
    spiritual: 'Purpose, meaning, and inner development'
  };
  
  const colWidth = (pageWidth - margin * 2) / 2;
  
  capitalBreakdown.forEach((capital, index) => {
    const col = index % 2;
    const row = Math.floor(index / 2);
    const x = margin + col * colWidth;
    const y = yPos + row * 20;
    
    const rgb = hexToRgb(capital.color);
    
    // Color dot
    doc.setFillColor(...rgb);
    doc.circle(x + 5, y + 3, 3, 'F');
    
    // Capital name
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...rgb);
    doc.text(capital.name, x + 12, y + 4);
    
    // Description
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    const desc = capitalDescriptions[capital.id] || '';
    doc.text(desc, x + 12, y + 10);
  });
  
  yPos += 85;
  
  // Call to action box
  doc.setFillColor(46, 125, 50);
  doc.roundedRect(margin + 10, yPos, pageWidth - (margin * 2) - 20, 35, 5, 5, 'F');
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(255, 255, 255);
  doc.text('Ready to Submit Your Contribution?', pageWidth / 2, yPos + 12, { align: 'center' });
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text('Visit app.hypha.earth/regen-games to create your proposal', pageWidth / 2, yPos + 22, { align: 'center' });
  
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(9);
  doc.text('Join the regenerative renaissance!', pageWidth / 2, yPos + 30, { align: 'center' });
  
  yPos += 50;
  
  // Footer
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  doc.text('Generated by ReGen Civics Contribution Calculator', pageWidth / 2, pageHeight - 15, { align: 'center' });
  doc.text('regencivics.earth', pageWidth / 2, pageHeight - 10, { align: 'center' });
  
  // Save the PDF
  const fileName = contributionName 
    ? `regen-civics-${contributionName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${new Date().toISOString().split('T')[0]}.pdf`
    : `regen-civics-contribution-${new Date().toISOString().split('T')[0]}.pdf`;
  
  doc.save(fileName);
};
