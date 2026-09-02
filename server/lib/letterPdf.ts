/**
 * PDF from the same letter blocks used for HTML.
 * jsPDF only. No Chromium. Merge tokens stay visible so a downloaded
 * sample is not mistaken for a merged send.
 */

import { jsPDF } from "jspdf";
import {
  markdownInlineToPlain,
  parseLetterBlocks,
  type LetterBlock,
  type LetterListNode,
} from "../../shared/emailMarkdown";
import { letterFilename, type LetterLayout } from "../../shared/letterLayout";

const FOREST: [number, number, number] = [26, 71, 42];
const MOSS: [number, number, number] = [74, 124, 89];
const CREAM: [number, number, number] = [240, 247, 240];
const INK: [number, number, number] = [51, 51, 51];
const LIGHT_GREEN: [number, number, number] = [125, 216, 125];

function drawHeader(doc: jsPDF, pageWidth: number, subtitle: string): number {
  doc.setFillColor(...FOREST);
  doc.rect(0, 0, pageWidth, 38, "F");
  doc.setTextColor(...LIGHT_GREEN);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("ReGen Civics", pageWidth / 2, 16, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(168, 230, 168);
  const line = subtitle.slice(0, 90) || "An Infinite Game for the ReGenerative Renaissance";
  doc.text(line, pageWidth / 2, 26, { align: "center" });
  return 48;
}

export function renderLetterPdf(opts: {
  subject: string;
  body: string;
  layout?: LetterLayout;
}): { bytes: Uint8Array; filename: string } {
  const layout: LetterLayout = opts.layout ?? "plain";
  const blocks = parseLetterBlocks(opts.body || "");
  const doc = new jsPDF({ unit: "mm", format: "letter" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = layout === "one_pager" ? 16 : 18;
  const contentWidth = pageWidth - margin * 2;
  let y = drawHeader(doc, pageWidth, opts.subject || "");

  const ensure = (needed: number) => {
    if (y + needed <= pageHeight - 16) return;
    doc.addPage();
    y = 18;
  };

  const writeLines = (
    text: string,
    fontSize: number,
    style: "normal" | "bold",
    color: [number, number, number],
    gapAfter: number,
  ) => {
    doc.setFont("helvetica", style);
    doc.setFontSize(fontSize);
    doc.setTextColor(...color);
    const lines = doc.splitTextToSize(text, contentWidth) as string[];
    const lineH = fontSize * 0.42;
    for (const line of lines) {
      ensure(lineH + 2);
      doc.text(line, margin, y);
      y += lineH;
    }
    y += gapAfter;
  };

  if (opts.subject.trim()) {
    writeLines(opts.subject.trim(), 16, "bold", FOREST, 6);
  }

  const writeList = (node: LetterListNode, indentMm: number) => {
    node.items.forEach((item, i) => {
      const bullet = node.ordered ? `${i + 1}. ` : "• ";
      const text = markdownInlineToPlain(item.text);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(11);
      doc.setTextColor(...INK);
      const lines = doc.splitTextToSize(bullet + text, contentWidth - indentMm) as string[];
      const lineH = 5;
      for (const line of lines) {
        ensure(lineH + 2);
        doc.text(line, margin + indentMm, y);
        y += lineH;
      }
      if (item.children) writeList(item.children, indentMm + 8);
    });
    y += 2;
  };

  const writeBlock = (block: LetterBlock) => {
    switch (block.type) {
      case "p":
        writeLines(markdownInlineToPlain(block.text), 11, "normal", INK, 4);
        break;
      case "h":
        y += 2;
        writeLines(markdownInlineToPlain(block.text), block.level === 1 ? 16 : 13, "bold", FOREST, 3);
        break;
      case "list":
        writeList(block.node, 2);
        break;
      case "quote":
      case "callout": {
        const text = markdownInlineToPlain(block.text);
        const lines = doc.splitTextToSize(text, contentWidth - 10) as string[];
        const boxH = lines.length * 5 + 10;
        ensure(boxH + 4);
        doc.setFillColor(...CREAM);
        doc.rect(margin, y - 4, contentWidth, boxH, "F");
        doc.setFillColor(...MOSS);
        doc.rect(margin, y - 4, 2.2, boxH, "F");
        doc.setFont("helvetica", "normal");
        doc.setFontSize(11);
        doc.setTextColor(...FOREST);
        let ty = y + 2;
        for (const line of lines) {
          doc.text(line, margin + 6, ty);
          ty += 5;
        }
        y += boxH + 3;
        break;
      }
      case "hr":
        ensure(8);
        doc.setDrawColor(224, 224, 224);
        doc.line(margin, y, pageWidth - margin, y);
        y += 6;
        break;
      case "cta": {
        const label = block.label.slice(0, 60);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(11);
        const labelW = Math.min(contentWidth, doc.getTextWidth(label) + 16);
        const boxH = 11;
        ensure(boxH + 10);
        const x = (pageWidth - labelW) / 2;
        doc.setFillColor(...MOSS);
        doc.roundedRect(x, y, labelW, boxH, 2, 2, "F");
        doc.setTextColor(255, 255, 255);
        doc.text(label, pageWidth / 2, y + 7.2, { align: "center" });
        y += boxH + 3;
        writeLines(block.href, 8, "normal", MOSS, 4);
        break;
      }
      default:
        break;
    }
  };

  if (blocks.length === 0) {
    writeLines("Nothing to print yet.", 11, "normal", INK, 4);
  } else {
    for (const block of blocks) writeBlock(block);
  }

  doc.setFont("helvetica", "italic");
  doc.setFontSize(9);
  doc.setTextColor(...MOSS);
  ensure(10);
  doc.text("The ReGen Civics Team", margin, y + 4);

  const bytes = new Uint8Array(doc.output("arraybuffer"));
  return { bytes, filename: letterFilename(opts.subject) };
}

export function renderLetterPdfBase64(opts: {
  subject: string;
  body: string;
  layout?: LetterLayout;
}): { pdfBase64: string; filename: string } {
  const { bytes, filename } = renderLetterPdf(opts);
  const pdfBase64 = Buffer.from(bytes).toString("base64");
  return { pdfBase64, filename };
}
