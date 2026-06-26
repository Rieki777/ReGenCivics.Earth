import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const REMARK_PLUGINS = [remarkGfm];

export function MarkdownRenderer({ children }: { children: string }) {
  return (
    <ReactMarkdown remarkPlugins={REMARK_PLUGINS}>
      {children}
    </ReactMarkdown>
  );
}

export default MarkdownRenderer;
