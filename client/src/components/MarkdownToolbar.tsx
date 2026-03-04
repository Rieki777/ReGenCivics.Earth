/**
 * MarkdownToolbar - Formatting toolbar for forum post/reply textareas
 * Inserts markdown syntax at the cursor position in the linked textarea.
 * Styled to match the forest/game theme.
 */
import { useCallback, type RefObject } from 'react';
import {
  Bold,
  Italic,
  Heading1,
  Heading2,
  Link as LinkIcon,
  List,
  ListOrdered,
  Quote,
  Code,
  Minus,
} from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface MarkdownToolbarProps {
  /** Ref to the textarea element */
  textareaRef: RefObject<HTMLTextAreaElement | null>;
  /** Current value of the textarea */
  value: string;
  /** Setter for the textarea value */
  onChange: (value: string) => void;
  /** Compact mode for smaller textareas (reply boxes) */
  compact?: boolean;
}

interface ToolbarAction {
  icon: React.ElementType;
  label: string;
  shortcut?: string;
  /** Insert behavior */
  action: 'wrap' | 'prefix' | 'insert';
  /** For 'wrap': text placed before/after selection. For 'prefix': text prepended to line. For 'insert': full text inserted. */
  before?: string;
  after?: string;
  text?: string;
  /** Placeholder text when no selection */
  placeholder?: string;
}

const TOOLBAR_ACTIONS: ToolbarAction[] = [
  {
    icon: Bold,
    label: 'Bold',
    shortcut: 'Ctrl+B',
    action: 'wrap',
    before: '**',
    after: '**',
    placeholder: 'bold text',
  },
  {
    icon: Italic,
    label: 'Italic',
    shortcut: 'Ctrl+I',
    action: 'wrap',
    before: '*',
    after: '*',
    placeholder: 'italic text',
  },
  {
    icon: Heading1,
    label: 'Heading 1',
    action: 'prefix',
    before: '# ',
    placeholder: 'Heading',
  },
  {
    icon: Heading2,
    label: 'Heading 2',
    action: 'prefix',
    before: '## ',
    placeholder: 'Subheading',
  },
  {
    icon: LinkIcon,
    label: 'Link',
    shortcut: 'Ctrl+K',
    action: 'insert',
    text: '[link text](https://)',
    placeholder: 'link text',
  },
  {
    icon: List,
    label: 'Bullet List',
    action: 'prefix',
    before: '- ',
    placeholder: 'list item',
  },
  {
    icon: ListOrdered,
    label: 'Numbered List',
    action: 'prefix',
    before: '1. ',
    placeholder: 'list item',
  },
  {
    icon: Quote,
    label: 'Blockquote',
    action: 'prefix',
    before: '> ',
    placeholder: 'quote',
  },
  {
    icon: Code,
    label: 'Inline Code',
    action: 'wrap',
    before: '`',
    after: '`',
    placeholder: 'code',
  },
  {
    icon: Minus,
    label: 'Divider',
    action: 'insert',
    text: '\n---\n',
  },
];

// Compact set for reply boxes (fewer buttons)
const COMPACT_ACTIONS = ['Bold', 'Italic', 'Link', 'Bullet List', 'Inline Code', 'Blockquote'];

export function MarkdownToolbar({ textareaRef, value, onChange, compact = false }: MarkdownToolbarProps) {
  const actions = compact
    ? TOOLBAR_ACTIONS.filter(a => COMPACT_ACTIONS.includes(a.label))
    : TOOLBAR_ACTIONS;

  const handleAction = useCallback(
    (action: ToolbarAction) => {
      const textarea = textareaRef.current;
      if (!textarea) return;

      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const selectedText = value.slice(start, end);

      let newValue: string;
      let cursorPos: number;

      switch (action.action) {
        case 'wrap': {
          const before = action.before || '';
          const after = action.after || '';
          const insertText = selectedText || action.placeholder || '';
          newValue =
            value.slice(0, start) + before + insertText + after + value.slice(end);
          if (selectedText) {
            // Keep selection around wrapped text
            cursorPos = start + before.length + insertText.length + after.length;
          } else {
            // Place cursor inside the wrap, selecting the placeholder
            cursorPos = start + before.length + insertText.length;
          }
          break;
        }
        case 'prefix': {
          const prefix = action.before || '';
          // If there's selected text, prefix each line
          if (selectedText) {
            const prefixed = selectedText
              .split('\n')
              .map(line => prefix + line)
              .join('\n');
            newValue = value.slice(0, start) + prefixed + value.slice(end);
            cursorPos = start + prefixed.length;
          } else {
            // Check if we're at the start of a line
            const lineStart = value.lastIndexOf('\n', start - 1) + 1;
            const currentLinePrefix = value.slice(lineStart, start);
            if (currentLinePrefix.trim() === '') {
              // Empty line, just add prefix + placeholder
              const insertText = prefix + (action.placeholder || '');
              newValue = value.slice(0, start) + insertText + value.slice(end);
              cursorPos = start + insertText.length;
            } else {
              // Add on new line
              const insertText = '\n' + prefix + (action.placeholder || '');
              newValue = value.slice(0, end) + insertText + value.slice(end);
              cursorPos = end + insertText.length;
            }
          }
          break;
        }
        case 'insert': {
          const insertText = action.text || '';
          newValue = value.slice(0, start) + insertText + value.slice(end);
          cursorPos = start + insertText.length;
          break;
        }
        default:
          return;
      }

      onChange(newValue);

      // Restore focus and cursor position after React re-renders
      requestAnimationFrame(() => {
        textarea.focus();
        textarea.setSelectionRange(cursorPos, cursorPos);
      });
    },
    [textareaRef, value, onChange]
  );

  // Handle keyboard shortcuts
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (!(e.ctrlKey || e.metaKey)) return;

      const key = e.key.toLowerCase();
      let matched: ToolbarAction | undefined;

      if (key === 'b') matched = TOOLBAR_ACTIONS.find(a => a.label === 'Bold');
      else if (key === 'i') matched = TOOLBAR_ACTIONS.find(a => a.label === 'Italic');
      else if (key === 'k') matched = TOOLBAR_ACTIONS.find(a => a.label === 'Link');

      if (matched) {
        e.preventDefault();
        handleAction(matched);
      }
    },
    [handleAction]
  );

  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex items-center gap-0.5 flex-wrap">
        <div
          className={`inline-flex items-center gap-0.5 rounded-lg border border-[#e8e4de] bg-[#f8f5f0] px-1 py-0.5 ${
            compact ? '' : 'mb-1.5'
          }`}
        >
          {actions.map((action, i) => {
            const Icon = action.icon;
            return (
              <Tooltip key={action.label}>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={() => handleAction(action)}
                    className="p-1.5 rounded-md text-[#1a472a]/50 hover:text-[#1a472a] hover:bg-[#7dd87d]/20 transition-colors focus:outline-none focus:ring-1 focus:ring-[#7dd87d]/50"
                    aria-label={action.label}
                  >
                    <Icon className={compact ? 'w-3.5 h-3.5' : 'w-4 h-4'} />
                  </button>
                </TooltipTrigger>
                <TooltipContent
                  side="top"
                  className="bg-[#1a472a] text-white text-xs border-none"
                >
                  <p>
                    {action.label}
                    {action.shortcut && (
                      <span className="ml-1.5 text-[#7dd87d]/80 text-[10px]">
                        {action.shortcut}
                      </span>
                    )}
                  </p>
                </TooltipContent>
              </Tooltip>
            );
          })}
        </div>
      </div>
      {/* Export the keyboard handler for the parent textarea */}
      <input type="hidden" data-keyboard-handler="true" />
    </TooltipProvider>
  );
}

/**
 * Hook to get the keyboard shortcut handler for a textarea.
 * Usage: <Textarea onKeyDown={handleMarkdownShortcuts} />
 */
export function useMarkdownShortcuts(
  textareaRef: RefObject<HTMLTextAreaElement | null>,
  value: string,
  onChange: (value: string) => void
) {
  return useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (!(e.ctrlKey || e.metaKey)) return;

      const textarea = textareaRef.current;
      if (!textarea) return;

      const key = e.key.toLowerCase();
      let action: ToolbarAction | undefined;

      if (key === 'b') action = TOOLBAR_ACTIONS.find(a => a.label === 'Bold');
      else if (key === 'i') action = TOOLBAR_ACTIONS.find(a => a.label === 'Italic');
      else if (key === 'k') action = TOOLBAR_ACTIONS.find(a => a.label === 'Link');

      if (!action) return;
      e.preventDefault();

      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const selectedText = value.slice(start, end);

      let newValue: string;
      let cursorPos: number;

      const before = action.before || '';
      const after = action.after || '';

      if (action.action === 'wrap') {
        const insertText = selectedText || action.placeholder || '';
        newValue = value.slice(0, start) + before + insertText + after + value.slice(end);
        cursorPos = start + before.length + insertText.length + (selectedText ? after.length : 0);
      } else if (action.action === 'insert') {
        const insertText = action.text || '';
        newValue = value.slice(0, start) + insertText + value.slice(end);
        cursorPos = start + insertText.length;
      } else {
        return;
      }

      onChange(newValue);
      requestAnimationFrame(() => {
        textarea.focus();
        textarea.setSelectionRange(cursorPos, cursorPos);
      });
    },
    [textareaRef, value, onChange]
  );
}
