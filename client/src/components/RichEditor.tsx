import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'
import React, { useEffect, forwardRef, useImperativeHandle } from 'react'

interface RichEditorProps {
  value: string
  onChange: (markdown: string) => void
  placeholder?: string
  className?: string
}

export interface RichEditorHandle {
  focus: () => void
}

/**
 * Converts a Tiptap HTML-based text output into a basic markdown representation.
 * Since @tiptap/extension-markdown is not available, we use the text content
 * and serialize manually from the editor JSON.
 */
function serializeToMarkdown(editor: ReturnType<typeof useEditor>): string {
  if (!editor) return ''
  const json = editor.getJSON()

  // Walk the tree carrying list context (bullet vs ordered) and ordered-list
  // index so listItem nodes can render as `-` or `1.`, `2.` ... correctly.
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

    // For list nodes, walk children with a known list context so each listItem
    // knows its prefix. Ordered lists also advance an index across siblings.
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

    // Generic children rendering (no list context propagates into deeper blocks
    // by default, which matches how markdown flattens nested inline content).
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
      default: return children
    }
  }

  return nodeToMarkdown(json).trimEnd()
}

export const RichEditor = forwardRef<RichEditorHandle, RichEditorProps>(function RichEditor(
  { value, onChange, placeholder, className },
  ref
) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Link.configure({ openOnClick: false }),
    ],
    content: value,
    onUpdate: ({ editor }) => {
      onChange(serializeToMarkdown(editor))
    },
  })

  useImperativeHandle(ref, () => ({
    focus: () => {
      editor?.commands.focus()
    },
  }), [editor])

  useEffect(() => {
    if (editor && value !== serializeToMarkdown(editor)) {
      editor.commands.setContent(value)
    }
  }, [value, editor])

  if (!editor) return null

  // Click anywhere in the editor chrome (toolbar margin, padding, empty area
  // below the visible prose) to focus the editor. onMouseDown preventDefault
  // on toolbar buttons stops TipTap from losing selection when a button is
  // pressed, which was breaking Bold/Italic/List/Quote when the user hadn't
  // already placed the cursor in the content area.
  const stopBlur = (e: React.MouseEvent) => {
    e.preventDefault()
  }

  return (
    <div
      className={`border border-white/20 rounded-lg bg-white/5 cursor-text ${className ?? ''}`}
      onClick={(e) => {
        // Don't hijack clicks on buttons inside the toolbar.
        const target = e.target as HTMLElement
        if (target.closest('button')) return
        editor.commands.focus()
      }}
    >
      {/* Toolbar */}
      <div className="flex gap-1 p-2 border-b border-white/10 flex-wrap">
        <button type="button" onMouseDown={stopBlur} onClick={() => editor.chain().focus().toggleBold().run()} className={`px-2 py-1 rounded text-sm font-bold hover:bg-white/10 ${editor.isActive('bold') ? 'bg-white/20' : ''}`} title="Bold (Ctrl+B)"><strong>B</strong></button>
        <button type="button" onMouseDown={stopBlur} onClick={() => editor.chain().focus().toggleItalic().run()} className={`px-2 py-1 rounded text-sm italic hover:bg-white/10 ${editor.isActive('italic') ? 'bg-white/20' : ''}`} title="Italic (Ctrl+I)"><em>I</em></button>
        <button type="button" onMouseDown={stopBlur} onClick={() => editor.chain().focus().toggleBulletList().run()} className={`px-2 py-1 rounded text-sm hover:bg-white/10 ${editor.isActive('bulletList') ? 'bg-white/20' : ''}`} title="Bullet list">• List</button>
        <button type="button" onMouseDown={stopBlur} onClick={() => editor.chain().focus().toggleOrderedList().run()} className={`px-2 py-1 rounded text-sm hover:bg-white/10 ${editor.isActive('orderedList') ? 'bg-white/20' : ''}`} title="Numbered list">1. List</button>
        <button type="button" onMouseDown={stopBlur} onClick={() => editor.chain().focus().toggleBlockquote().run()} className={`px-2 py-1 rounded text-sm hover:bg-white/10 ${editor.isActive('blockquote') ? 'bg-white/20' : ''}`} title="Blockquote">" Quote</button>
      </div>
      <EditorContent
        editor={editor}
        className="prose prose-invert max-w-none p-3 min-h-[220px] focus:outline-none"
        placeholder={placeholder}
      />
    </div>
  )
})
