/**
 * ForumMarkdown - Full markdown rendering for forum posts and replies
 * Supports: headers, bold, italic, links, lists, code blocks, blockquotes, tables
 */
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { Components } from 'react-markdown';

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
    const isExternal = href?.startsWith('http');
    return (
      <a
        href={href}
        target={isExternal ? '_blank' : undefined}
        rel={isExternal ? 'noopener noreferrer' : undefined}
        className="text-[#7dd87d] underline hover:opacity-80 transition-opacity"
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
    <img src={src} alt={alt || ''} className="max-w-full h-auto rounded-lg my-3" loading="lazy" />
  ),
};

interface ForumMarkdownProps {
  content: string;
  className?: string;
}

/**
 * Convert bare URLs to markdown links so they render as clickable links.
 * Skips URLs already inside a markdown link [text](url) or angle-bracket <url>.
 */
function linkifyBareUrls(text: string): string {
  // Match bare URLs: http(s):// or www. not already inside []() or <>
  return text.replace(
    /(?<!\]\(|<)(https?:\/\/[^\s\)\]>]+)/g,
    (url) => `[${url}](${url})`
  );
}

export function ForumMarkdown({ content, className = '' }: ForumMarkdownProps) {
  const processed = linkifyBareUrls(content);
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
    <span className="text-[10px] text-[#1a472a]/30 leading-tight" style={{ fontFamily: 'var(--font-body)' }}>
      Markdown supported: # Header, **bold**, *italic*, [link](url), - list, {'>'} quote, `code`
    </span>
  );
}
