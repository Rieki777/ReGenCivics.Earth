import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'
import Image from '@tiptap/extension-image'
import React, { useEffect, forwardRef, useImperativeHandle, useState, useRef, useCallback } from 'react'
import { trpc } from '@/lib/trpc'
import { ForumMarkdown } from '@/components/ForumMarkdown'
import {
  Bold, Italic, Heading2, Heading3, Link2, Code, List,
  ListOrdered, Quote, Minus, Eye, Pencil, Loader2, X,
  ImageIcon, AlignLeft,
} from 'lucide-react'

interface RichEditorProps {
  value: string
  onChange: (markdown: string) => void
  placeholder?: string
  className?: string
}

export interface RichEditorHandle {
  focus: () => void
}

function serializeToMarkdown(editor: ReturnType<typeof useEditor>): string {
  if (!editor) return ''
  const json = editor.getJSON()

  function nodeToMarkdown(
    node: any,
    ctx: { listType?: 'bullet' | 'ordered'; orderedIndex?: number } = {}
  ): string {
    if (!node) return ''

    if (node.type === 'text') {
      let text = node.text || ''
      if (node.marks) {
        for (const mark of node.marks) {
          if (mark.type === 'bold') text = `**${text}**`
          else if (mark.type === 'italic') text = `*${text}*`
          else if (mark.type === 'link') text = `[${text}](${mark.attrs?.href || ''})`
          else if (mark.type === 'code') text = `\`${text}\``
        }
      }
      return text
    }

    if (node.type === 'bulletList') {
      return (node.content || [])
        .map((child: any) => nodeToMarkdown(child, { listType: 'bullet' }))
        .join('') + '\n'
    }
    if (node.type === 'orderedList') {
      const start = node.attrs?.start ?? 1
      return (node.content || [])
        .map((child: any, i: number) =>
          nodeToMarkdown(child, { listType: 'ordered', orderedIndex: start + i })
        )
        .join('') + '\n'
    }

    const children = (node.content || []).map((c: any) => nodeToMarkdown(c)).join('')

    switch (node.type) {
      case 'doc': return children
      case 'paragraph': return children ? `${children}\n\n` : '\n'
      case 'heading': return `${'#'.repeat(node.attrs?.level || 1)} ${children}\n\n`
      case 'listItem': {
        const body = children.trim()
        if (ctx.listType === 'ordered' && ctx.orderedIndex) {
          return `${ctx.orderedIndex}. ${body}\n`
        }
        return `- ${body}\n`
      }
      case 'blockquote': return `> ${children.trim()}\n\n`
      case 'codeBlock': return `\`\`\`\n${children}\n\`\`\`\n\n`
      case 'hardBreak': return '\n'
      case 'horizontalRule': return '---\n\n'
      case 'image': return `![${node.attrs?.alt || ''}](${node.attrs?.src || ''})\n\n`
      default: return children
    }
  }

  return nodeToMarkdown(json).trimEnd()
}

// Slash command definitions
type SlashCmd = {
  label: string
  description: string
  icon: React.ReactNode
  action: (editor: NonNullable<ReturnType<typeof useEditor>>) => void
}

const SLASH_COMMANDS: SlashCmd[] = [
  {
    label: 'Heading 2',
    description: 'Large section heading',
    icon: <Heading2 className="w-4 h-4" />,
    action: (e) => e.chain().focus().deleteRange({ from: e.state.selection.from - e.state.doc.resolve(e.state.selection.from).parent.textContent.length - 1, to: e.state.selection.from }).toggleHeading({ level: 2 }).run(),
  },
  {
    label: 'Heading 3',
    description: 'Medium section heading',
    icon: <Heading3 className="w-4 h-4" />,
    action: (e) => e.chain().focus().deleteRange({ from: e.state.selection.from - e.state.doc.resolve(e.state.selection.from).parent.textContent.length - 1, to: e.state.selection.from }).toggleHeading({ level: 3 }).run(),
  },
  {
    label: 'Bullet List',
    description: 'Unordered list',
    icon: <List className="w-4 h-4" />,
    action: (e) => e.chain().focus().deleteRange({ from: e.state.selection.from - e.state.doc.resolve(e.state.selection.from).parent.textContent.length - 1, to: e.state.selection.from }).toggleBulletList().run(),
  },
  {
    label: 'Numbered List',
    description: 'Ordered list',
    icon: <ListOrdered className="w-4 h-4" />,
    action: (e) => e.chain().focus().deleteRange({ from: e.state.selection.from - e.state.doc.resolve(e.state.selection.from).parent.textContent.length - 1, to: e.state.selection.from }).toggleOrderedList().run(),
  },
  {
    label: 'Quote',
    description: 'Blockquote',
    icon: <Quote className="w-4 h-4" />,
    action: (e) => e.chain().focus().deleteRange({ from: e.state.selection.from - e.state.doc.resolve(e.state.selection.from).parent.textContent.length - 1, to: e.state.selection.from }).toggleBlockquote().run(),
  },
  {
    label: 'Code Block',
    description: 'Formatted code',
    icon: <Code className="w-4 h-4" />,
    action: (e) => e.chain().focus().deleteRange({ from: e.state.selection.from - e.state.doc.resolve(e.state.selection.from).parent.textContent.length - 1, to: e.state.selection.from }).toggleCodeBlock().run(),
  },
  {
    label: 'Divider',
    description: 'Horizontal rule',
    icon: <Minus className="w-4 h-4" />,
    action: (e) => e.chain().focus().deleteRange({ from: e.state.selection.from - e.state.doc.resolve(e.state.selection.from).parent.textContent.length - 1, to: e.state.selection.from }).setHorizontalRule().run(),
  },
]

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve((reader.result as string).split(',')[1] ?? '')
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export const RichEditor = forwardRef<RichEditorHandle, RichEditorProps>(function RichEditor(
  { value, onChange, placeholder, className },
  ref
) {
  const [isPreview, setIsPreview] = useState(false)
  const [previewContent, setPreviewContent] = useState(value)
  const [slashOpen, setSlashOpen] = useState(false)
  const [slashFilter, setSlashFilter] = useState('')
  const [slashPos, setSlashPos] = useState<{ top: number; left: number } | null>(null)
  const [slashActiveIdx, setSlashActiveIdx] = useState(0)
  // @mention menu (mirrors the slash-command menu below).
  const [mentionOpen, setMentionOpen] = useState(false)
  const [mentionQuery, setMentionQuery] = useState('')
  const [mentionPos, setMentionPos] = useState<{ top: number; left: number } | null>(null)
  const [mentionActiveIdx, setMentionActiveIdx] = useState(0)
  const [linkPanelOpen, setLinkPanelOpen] = useState(false)
  const [linkUrl, setLinkUrl] = useState('')
  const [isUploading, setIsUploading] = useState(false)

  const uploadMutation = trpc.files.upload.useMutation()
  const uploadRef = useRef(uploadMutation.mutateAsync)
  useEffect(() => { uploadRef.current = uploadMutation.mutateAsync }, [uploadMutation.mutateAsync])

  // @mention suggestions. Only fetches while the mention menu is open; matches
  // members and the AI elders by handle prefix or name.
  const mentionSearch = trpc.playerProfiles.searchMentions.useQuery(
    { query: mentionQuery },
    { enabled: mentionOpen, staleTime: 30_000, placeholderData: (prev) => prev },
  )
  const mentionResults = mentionOpen ? (mentionSearch.data ?? []) : []

  const editorContainerRef = useRef<HTMLDivElement>(null)

  const editor = useEditor({
    extensions: [
      StarterKit,
      Link.configure({ openOnClick: false }),
      Image.configure({ allowBase64: false }),
    ],
    content: value,
    onUpdate: ({ editor }) => {
      const md = serializeToMarkdown(editor)
      onChange(md)
      setPreviewContent(md)

      // Slash menu detection
      const { from } = editor.state.selection
      const resolvedPos = editor.state.doc.resolve(from)
      const nodeText = resolvedPos.parent.textContent
      const containerRect = editorContainerRef.current?.getBoundingClientRect()
      const coords = editor.view.coordsAtPos(from)
      const posAtCursor = () =>
        containerRect ? { top: coords.bottom - containerRect.top + 4, left: coords.left - containerRect.left } : null

      if (nodeText.startsWith('/')) {
        setSlashFilter(nodeText.slice(1))
        setSlashActiveIdx(0)
        setSlashPos(posAtCursor())
        setSlashOpen(true)
        setMentionOpen(false)
        return
      }
      setSlashOpen(false)

      // @mention detection: an @token immediately before the caret, at the
      // start of the line or after whitespace (so email-style text is ignored).
      const textBefore = editor.state.doc.textBetween(resolvedPos.start(), from, '\n', '￼')
      const m = textBefore.match(/(?:^|\s)@([\w-]{0,30})$/)
      if (m) {
        setMentionQuery(m[1])
        setMentionActiveIdx(0)
        setMentionPos(posAtCursor())
        setMentionOpen(true)
      } else {
        setMentionOpen(false)
      }
    },
  })

  // Replace the trailing @token before the caret with @handle and a space.
  const insertMention = useCallback((handle: string) => {
    if (!editor) return
    const { from } = editor.state.selection
    const resolved = editor.state.doc.resolve(from)
    const textBefore = editor.state.doc.textBetween(resolved.start(), from, '\n', '￼')
    const m = textBefore.match(/@([\w-]*)$/)
    const delFrom = m ? from - m[0].length : from
    editor.chain().focus().deleteRange({ from: delFrom, to: from }).insertContent(`@${handle} `).run()
    setMentionOpen(false)
    setMentionQuery('')
  }, [editor])

  useImperativeHandle(ref, () => ({
    focus: () => { editor?.commands.focus() },
  }), [editor])

  useEffect(() => {
    if (editor && value !== serializeToMarkdown(editor)) {
      editor.commands.setContent(value)
    }
  }, [value, editor])

  const stopBlur = useCallback((e: React.MouseEvent) => { e.preventDefault() }, [])

  // Image upload helper (paste / drop)
  const handleImageFile = useCallback(async (file: File, editorInstance: NonNullable<ReturnType<typeof useEditor>>) => {
    if (!file.type.startsWith('image/')) return false
    setIsUploading(true)
    try {
      const b64 = await fileToBase64(file)
      const result = await uploadRef.current({ fileName: file.name, fileData: b64, contentType: file.type })
      editorInstance.chain().focus().setImage({ src: result.url }).run()
    } catch {
      // silent — image upload failure shouldn't block the post
    } finally {
      setIsUploading(false)
    }
    return true
  }, [])

  // Paste handler — intercept image files from clipboard
  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    if (!editor) return
    const files = Array.from(e.clipboardData.files)
    const imageFile = files.find((f) => f.type.startsWith('image/'))
    if (imageFile) {
      e.preventDefault()
      handleImageFile(imageFile, editor)
    }
  }, [editor, handleImageFile])

  // Drop handler — intercept dragged image files
  const handleDrop = useCallback((e: React.DragEvent) => {
    if (!editor) return
    const files = Array.from(e.dataTransfer.files)
    const imageFile = files.find((f) => f.type.startsWith('image/'))
    if (imageFile) {
      e.preventDefault()
      handleImageFile(imageFile, editor)
    }
  }, [editor, handleImageFile])

  // Menu keyboard navigation (mention menu takes priority when open, then slash)
  const handleSlashKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (mentionOpen) {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setMentionActiveIdx((i) => Math.min(i + 1, mentionResults.length - 1))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setMentionActiveIdx((i) => Math.max(i - 1, 0))
      } else if ((e.key === 'Enter' || e.key === 'Tab') && mentionResults[mentionActiveIdx]) {
        e.preventDefault()
        insertMention(mentionResults[mentionActiveIdx].handle)
      } else if (e.key === 'Escape') {
        e.preventDefault()
        setMentionOpen(false)
      }
      return
    }
    if (!slashOpen) return
    const filtered = SLASH_COMMANDS.filter((c) =>
      c.label.toLowerCase().includes(slashFilter.toLowerCase())
    )
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSlashActiveIdx((i) => Math.min(i + 1, filtered.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSlashActiveIdx((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter' && filtered[slashActiveIdx]) {
      e.preventDefault()
      filtered[slashActiveIdx].action(editor!)
      setSlashOpen(false)
    } else if (e.key === 'Escape') {
      setSlashOpen(false)
    }
  }, [mentionOpen, mentionResults, mentionActiveIdx, insertMention, slashOpen, slashFilter, slashActiveIdx, editor])

  // Apply link
  const applyLink = useCallback(() => {
    if (!editor || !linkUrl.trim()) return
    const href = linkUrl.startsWith('http') ? linkUrl : `https://${linkUrl}`
    if (editor.state.selection.empty) {
      editor.chain().focus().insertContent(`[${href}](${href})`).run()
    } else {
      editor.chain().focus().setLink({ href }).run()
    }
    setLinkPanelOpen(false)
    setLinkUrl('')
  }, [editor, linkUrl])

  if (!editor) return null

  const slashFiltered = SLASH_COMMANDS.filter((c) =>
    c.label.toLowerCase().includes(slashFilter.toLowerCase())
  )

  // Shared toolbar buttons — rendered once, used in both desktop (top) and mobile (bottom)
  function ToolbarButton({
    onClick, isActive, title, children,
  }: {
    onClick: () => void
    isActive?: boolean
    title: string
    children: React.ReactNode
  }) {
    return (
      <button
        type="button"
        onMouseDown={stopBlur}
        onClick={onClick}
        title={title}
        aria-label={title}
        aria-pressed={isActive}
        className={`flex items-center justify-center rounded-md min-h-[44px] min-w-[44px] sm:min-h-[30px] sm:min-w-[30px] px-1 transition-colors hover:bg-white/15 ${
          isActive ? 'bg-white/20 text-white' : 'text-white/70'
        }`}
      >
        {children}
      </button>
    )
  }

  function ToolbarContents() {
    return (
      <>
        {/* Write / Preview toggle */}
        <button
          type="button"
          onMouseDown={stopBlur}
          onClick={() => setIsPreview((p) => !p)}
          title={isPreview ? 'Back to editor' : 'Preview'}
          aria-label={isPreview ? 'Back to editor' : 'Preview'}
          className="flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium min-h-[44px] sm:min-h-[30px] transition-colors hover:bg-white/15 text-white/70"
        >
          {isPreview ? <><Pencil className="w-3.5 h-3.5" /> Write</> : <><Eye className="w-3.5 h-3.5" /> Preview</>}
        </button>

        <div className="w-px h-5 bg-white/15 mx-0.5 self-center" />

        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBold().run()}
          isActive={editor.isActive('bold')}
          title="Bold (Ctrl+B)"
        >
          <Bold className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleItalic().run()}
          isActive={editor.isActive('italic')}
          title="Italic (Ctrl+I)"
        >
          <Italic className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleCode().run()}
          isActive={editor.isActive('code')}
          title="Inline code"
        >
          <Code className="w-4 h-4" />
        </ToolbarButton>

        <div className="w-px h-5 bg-white/15 mx-0.5 self-center" />

        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          isActive={editor.isActive('heading', { level: 2 })}
          title="Heading 2"
        >
          <Heading2 className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          isActive={editor.isActive('heading', { level: 3 })}
          title="Heading 3"
        >
          <Heading3 className="w-4 h-4" />
        </ToolbarButton>

        <div className="w-px h-5 bg-white/15 mx-0.5 self-center" />

        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          isActive={editor.isActive('bulletList')}
          title="Bullet list"
        >
          <List className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          isActive={editor.isActive('orderedList')}
          title="Numbered list"
        >
          <ListOrdered className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          isActive={editor.isActive('blockquote')}
          title="Blockquote"
        >
          <Quote className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          isActive={editor.isActive('codeBlock')}
          title="Code block"
        >
          <AlignLeft className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
          isActive={false}
          title="Divider"
        >
          <Minus className="w-4 h-4" />
        </ToolbarButton>

        <div className="w-px h-5 bg-white/15 mx-0.5 self-center" />

        {/* Link */}
        <ToolbarButton
          onClick={() => {
            const existing = editor.getAttributes('link').href || ''
            setLinkUrl(existing)
            setLinkPanelOpen((o) => !o)
          }}
          isActive={editor.isActive('link')}
          title="Insert link"
        >
          <Link2 className="w-4 h-4" />
        </ToolbarButton>

        {/* Image upload */}
        <label
          title="Upload image"
          aria-label="Upload image"
          className={`flex items-center justify-center rounded-md min-h-[44px] min-w-[44px] sm:min-h-[30px] sm:min-w-[30px] px-1 cursor-pointer transition-colors hover:bg-white/15 text-white/70 ${isUploading ? 'opacity-50 pointer-events-none' : ''}`}
          onMouseDown={stopBlur}
        >
          {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImageIcon className="w-4 h-4" />}
          <input
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={async (e) => {
              const file = e.target.files?.[0]
              if (file) await handleImageFile(file, editor)
              e.target.value = ''
            }}
          />
        </label>
      </>
    )
  }

  return (
    <div
      ref={editorContainerRef}
      className={`relative border border-white/20 rounded-lg bg-white/5 flex flex-col cursor-text ${className ?? ''}`}
      onClick={(e) => {
        if (isPreview) return
        const target = e.target as HTMLElement
        if (target.closest('button') || target.closest('label') || target.closest('input')) return
        editor.commands.focus()
      }}
      onPaste={handlePaste}
      onDrop={handleDrop}
      onDragOver={(e) => e.preventDefault()}
      onKeyDown={handleSlashKeyDown}
    >
      {/* Desktop toolbar — top, hidden on mobile */}
      <div className="hidden sm:flex gap-0.5 p-1.5 border-b border-white/10 flex-wrap items-center">
        <ToolbarContents />
      </div>

      {/* Link URL panel */}
      {linkPanelOpen && (
        <div className="flex items-center gap-2 px-3 py-2 border-b border-white/10 bg-white/5">
          <Link2 className="w-4 h-4 text-white/60 flex-shrink-0" />
          <input
            type="url"
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') { e.preventDefault(); applyLink() }
              if (e.key === 'Escape') { setLinkPanelOpen(false) }
            }}
            placeholder="https://..."
            autoFocus
            className="flex-1 bg-transparent text-white text-sm placeholder:text-white/60 focus:outline-none"
          />
          <button
            type="button"
            onClick={applyLink}
            className="text-xs text-[#7dd87d] font-semibold hover:text-[#9de89d] transition-colors"
          >
            Apply
          </button>
          {editor.isActive('link') && (
            <button
              type="button"
              onClick={() => { editor.chain().focus().unsetLink().run(); setLinkPanelOpen(false) }}
              className="text-xs text-red-400 hover:text-red-300 transition-colors"
            >
              Remove
            </button>
          )}
          <button
            type="button"
            onClick={() => setLinkPanelOpen(false)}
            className="text-white/60 hover:text-white/60 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Editor or preview */}
      {isPreview ? (
        <div className="p-3 min-h-[120px] text-[#1a472a] sm:text-[inherit]">
          {previewContent.trim() ? (
            <ForumMarkdown content={previewContent} className="text-sm" />
          ) : (
            <p className="text-white/70 text-sm italic">Nothing to preview yet.</p>
          )}
        </div>
      ) : (
        <EditorContent
          editor={editor}
          className="prose prose-invert max-w-none p-3 min-h-[120px] focus:outline-none flex-1"
          placeholder={placeholder}
        />
      )}

      {/* Mobile sticky toolbar — bottom, only on mobile */}
      <div className="sm:hidden flex gap-0.5 p-1.5 border-t border-white/10 flex-wrap items-center overflow-x-auto sticky bottom-0 bg-[#1a472a]/95 backdrop-blur-sm rounded-b-lg">
        <ToolbarContents />
      </div>

      {/* @mention menu */}
      {mentionOpen && mentionResults.length > 0 && mentionPos && !isPreview && (
        <div
          className="absolute z-50 bg-[#1a472a] border border-white/20 rounded-xl shadow-xl overflow-hidden w-64"
          style={{ top: mentionPos.top, left: mentionPos.left }}
        >
          <div className="px-3 py-1.5 border-b border-white/10">
            <p className="text-white/60 text-[10px] font-semibold uppercase tracking-wider">Mention someone</p>
          </div>
          {mentionResults.map((u, i) => (
            <button
              key={u.handle}
              type="button"
              onMouseDown={(e) => { e.preventDefault(); insertMention(u.handle) }}
              className={`w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors ${
                i === mentionActiveIdx ? 'bg-white/15 text-white' : 'text-white/70 hover:bg-white/10'
              }`}
            >
              {u.avatarUrl ? (
                <img src={u.avatarUrl} alt="" className="w-6 h-6 rounded-full object-cover flex-shrink-0" />
              ) : (
                <span className="w-6 h-6 rounded-full bg-[#7dd87d]/30 text-[#7dd87d] flex items-center justify-center text-xs font-bold flex-shrink-0">
                  {(u.name || u.handle).charAt(0).toUpperCase()}
                </span>
              )}
              <span className="min-w-0">
                <span className="text-sm font-medium block truncate">{u.name}</span>
                <span className="text-[11px] text-white/60 block leading-none">@{u.handle}</span>
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Slash command menu */}
      {slashOpen && slashFiltered.length > 0 && slashPos && !isPreview && (
        <div
          className="absolute z-50 bg-[#1a472a] border border-white/20 rounded-xl shadow-xl overflow-hidden w-56"
          style={{ top: slashPos.top, left: slashPos.left }}
        >
          <div className="px-3 py-1.5 border-b border-white/10">
            <p className="text-white/60 text-[10px] font-semibold uppercase tracking-wider">Insert block</p>
          </div>
          {slashFiltered.map((cmd, i) => (
            <button
              key={cmd.label}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault()
                cmd.action(editor)
                setSlashOpen(false)
              }}
              className={`w-full flex items-center gap-3 px-3 py-2 text-left transition-colors ${
                i === slashActiveIdx ? 'bg-white/15 text-white' : 'text-white/70 hover:bg-white/10'
              }`}
            >
              <span className="flex-shrink-0 text-white/60">{cmd.icon}</span>
              <span>
                <span className="text-sm font-medium">{cmd.label}</span>
                <span className="text-[11px] text-white/60 block leading-none mt-0.5">{cmd.description}</span>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
})
