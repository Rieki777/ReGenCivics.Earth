import { memo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const REMARK_PLUGINS = [remarkGfm];

// Memoized: react-markdown parses its whole input on every render, so a
// parent re-render (a chat list while someone types) would otherwise re-parse
// every message whose text has not changed.
export const MarkdownRenderer = memo(function MarkdownRenderer({ children }: { children: string }) {
  return (
    <ReactMarkdown remarkPlugins={REMARK_PLUGINS}>
      {children}
    </ReactMarkdown>
  );
});

export default MarkdownRenderer;
