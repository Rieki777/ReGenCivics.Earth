/**
 * ForumMarkdown - Full markdown rendering for forum posts and replies
 * Supports: headers, bold, italic, links, lists, code blocks, blockquotes, tables
 *
 * Video URLs (YouTube, Vimeo, Loom, Wistia, Dailymotion, direct MP4) are
 * detected via VideoEmbed's parser and rendered as inline embeds with a
 * thumbnail and click-to-play. The original link text is preserved as a
 * caption above the embed when the user chose a non-URL label.
 */
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { Components } from 'react-markdown';
import { sanitizeForClient } from '@/utils/sanitize';
import VideoEmbed, { parseVideoUrl } from '@/components/VideoEmbed';

function flattenChildText(children: any): string {
  if (typeof children === 'string') return children;
  if (typeof children === 'number') return String(children);
  if (Array.isArray(children)) return children.map(flattenChildText).join('');
  return '';
}

const markdownComponents: Components = {
  h1: ({ children }) => (
    <h1 className="text-2xl font-bold text-[#1a472a] mt-6 mb-3" style={{ fontFamily: 'var(--font-display)' }}>
      {children}
    </h1>
  ),
  h2: ({ children }) => (
    <h2 className="text-xl font-bold text-[#1a472a] mt-5 mb-2" style={{ fontFamily: 'var(--font-display)' }}>
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3 className="text-lg font-bold text-[#1a472a] mt-4 mb-2" style={{ fontFamily: 'var(--font-display)' }}>
      {children}
    </h3>
  ),
  h4: ({ children }) => (
    <h4 className="text-base font-bold text-[#1a472a] mt-3 mb-1" style={{ fontFamily: 'var(--font-display)' }}>
      {children}
    </h4>
  ),
  p: ({ children }) => (
    <p className="mb-3 last:mb-0 leading-relaxed">{children}</p>
  ),
  a: ({ href, children }) => {
    // URL protocol validation: only allow http/https/mailto, block javascript: and data: etc.
    let safeHref: string | undefined = href;
    if (href) {
      try {
        const parsed = new URL(href, typeof window !== 'undefined' ? window.location.href : 'https://regencivics.earth');
        if (!['http:', 'https:', 'mailto:'].includes(parsed.protocol)) {
          safeHref = '#';
        }
      } catch {
        safeHref = '#';
      }
    }

    // Video embed: if the URL is a recognised video source, render the
    // VideoEmbed component inline instead of a plain link. If the link text
    // is something other than the URL itself (the user wrote
    // [watch this](youtube.com/...)), preserve their label as a caption.
    if (safeHref && safeHref.startsWith('http')) {
      const parsed = parseVideoUrl(safeHref);
      if (parsed.type !== 'unknown' && parsed.embedUrl) {
        const linkText = flattenChildText(children).trim();
        const showCaption = linkText && linkText !== safeHref;
        return (
          <span className="block my-3">
            {showCaption && (
              <span className="block text-sm text-[#1a472a]/75 mb-1.5">{linkText}</span>
            )}
            <VideoEmbed url={safeHref} title={showCaption ? linkText : undefined} />
          </span>
        );
      }
    }

    const isExternal = safeHref?.startsWith('http');
    return (
      <a
        href={safeHref}
        target={isExternal ? '_blank' : undefined}
        rel={isExternal ? 'noopener noreferrer' : undefined}
        className="text-[#7dd87d] underline hover:text-white transition-colors"
      >
        {children}
      </a>
    );
  },
  strong: ({ children }) => (
    <strong className="font-bold text-[#1a472a]">{children}</strong>
  ),
  em: ({ children }) => (
    <em className="italic">{children}</em>
  ),
  ul: ({ children }) => (
    <ul className="list-disc list-inside space-y-1 ml-2 mb-3">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="list-decimal list-inside space-y-1 ml-2 mb-3">{children}</ol>
  ),
  li: ({ children }) => (
    <li className="leading-relaxed">{children}</li>
  ),
  blockquote: ({ children }) => (
    <blockquote className="border-l-4 border-[#7dd87d]/50 pl-4 py-1 my-3 bg-[#7dd87d]/5 rounded-r-lg text-[#1a472a]/80 italic">
      {children}
    </blockquote>
  ),
  code: ({ className, children }) => {
    const isBlock = className?.includes('language-');
    if (isBlock) {
      return (
        <code className="block bg-[#1a472a]/10 rounded-lg p-4 my-3 text-sm font-mono overflow-x-auto whitespace-pre text-[#1a472a]/90">
          {children}
        </code>
      );
    }
    return (
      <code className="bg-[#1a472a]/10 rounded px-1.5 py-0.5 text-sm font-mono text-[#1a472a]/90">
        {children}
      </code>
    );
  },
  pre: ({ children }) => (
    <pre className="my-3 overflow-x-auto">{children}</pre>
  ),
  hr: () => (
    <hr className="my-4 border-[#1a472a]/10" />
  ),
  table: ({ children }) => (
    <div className="overflow-x-auto my-3">
      <table className="min-w-full border-collapse border border-[#1a472a]/20 text-sm">
        {children}
      </table>
    </div>
  ),
  thead: ({ children }) => (
    <thead className="bg-[#1a472a]/5">{children}</thead>
  ),
  th: ({ children }) => (
    <th className="border border-[#1a472a]/20 px-3 py-2 text-left font-bold text-[#1a472a]">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="border border-[#1a472a]/20 px-3 py-2">{children}</td>
  ),
  img: ({ src, alt }) => (
    <img src={src} alt={alt || ''} className="max-w-full h-auto rounded-lg my-3" loading="lazy" width={800} height={450} style={{ aspectRatio: '16/9', objectFit: 'cover' }} />
  ),
};

interface ForumMarkdownProps {
  content: string;
  className?: string;
}

/**
 * Convert bare URLs to markdown links so they render as clickable links.
 * Skips URLs already inside a markdown link [text](url) or angle-bracket <url>.
 *
 * Uses a capture-group approach instead of a negative lookbehind because
 * lookbehind (?<! ... ) was not supported in Safari until 16.4 (March 2023)
 * and throws a SyntaxError at module-evaluation time on earlier iOS versions,
 * which white-screens the forum for those users.
 */
function linkifyBareUrls(text: string): string {
  // Capture the character before each URL. If it is "](" or "<" the URL
  // is already inside a link construct, so re-emit it unchanged.
  return text.replace(
    /(]\(|<)?(https?:\/\/[^\s\)\]>]+)/g,
    (_, prefix, url) => {
      if (prefix) return prefix + url;
      return `[${url}](${url})`;
    }
  );
}

export function ForumMarkdown({ content, className = '' }: ForumMarkdownProps) {
  const sanitized = sanitizeForClient(content);
  const processed = linkifyBareUrls(sanitized);
  return (
    <div className={`forum-markdown ${className}`}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
        {processed}
      </ReactMarkdown>
    </div>
  );
}

// Markdown formatting hints for the input area
export function MarkdownHints() {
  return (
    <span className="text-[10px] text-[#1a472a]/75 leading-tight" style={{ fontFamily: 'var(--font-body)' }}>
      Markdown supported: # Header, **bold**, *italic*, [link](url), - list, {'>'} quote, `code`
    </span>
  );
}
