/**
 * BlogInlineMarkdown - Renders inline markdown (bold, italic, links) within blog post content.
 * This handles the combination of bold, italic, and links within a single line of text.
 * Used by BlogPost.tsx for rendering content within list items, paragraphs, etc.
 */
import { Link } from 'wouter';
import React from 'react';

/**
 * Renders inline markdown elements: **bold**, *italic*, and [text](url) links.
 * Handles all three in combination within a single string.
 */
export function renderInlineMarkdown(text: string): React.ReactNode {
  // Combined regex for bold, italic, and links
  const inlineRegex = /(\*\*[^*]+\*\*|\*[^*]+\*|\[([^\]]+)\]\(([^)]+)\))/g;
  
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let keyCounter = 0;
  
  while ((match = inlineRegex.exec(text)) !== null) {
    // Add text before this match
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    
    const fullMatch = match[0];
    
    if (fullMatch.startsWith('**') && fullMatch.endsWith('**')) {
      // Bold
      parts.push(
        <strong key={`b-${keyCounter++}`} className="text-[#7dd87d]">
          {fullMatch.slice(2, -2)}
        </strong>
      );
    } else if (fullMatch.startsWith('*') && fullMatch.endsWith('*') && !fullMatch.startsWith('**')) {
      // Italic
      parts.push(
        <em key={`i-${keyCounter++}`}>{fullMatch.slice(1, -1)}</em>
      );
    } else if (match[2] && match[3]) {
      // Link [text](url)
      const linkText = match[2];
      const url = match[3];
      const isExternal = url.startsWith('http');
      
      if (isExternal) {
        parts.push(
          <a
            key={`a-${keyCounter++}`}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#7dd87d] underline hover:text-[#9de89d] transition-colors"
          >
            {linkText}
          </a>
        );
      } else {
        parts.push(
          <Link
            key={`l-${keyCounter++}`}
            href={url}
            className="text-[#7dd87d] underline hover:text-[#9de89d] transition-colors"
          >
            {linkText}
          </Link>
        );
      }
    }
    
    lastIndex = match.index + fullMatch.length;
  }
  
  // Add remaining text
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }
  
  return parts.length > 0 ? parts : text;
}
