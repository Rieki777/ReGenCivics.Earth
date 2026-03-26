import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'
import { useEffect, forwardRef, useImperativeHandle } from 'react'

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

  function nodeToMarkdown(node: any): string {
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

    const children = (node.content || []).map(nodeToMarkdown).join('')

    switch (node.type) {
      case 'doc': return children
      case 'paragraph': return children ? `${children}\n\n` : '\n'
      case 'heading': return `${'#'.repeat(node.attrs?.level || 1)} ${children}\n\n`
      case 'bulletList': return children
      case 'orderedList': return children
      case 'listItem': return `- ${children.trim()}\n`
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

  return (
    <div className={`border border-white/20 rounded-lg bg-white/5 ${className ?? ''}`}>
      {/* Toolbar */}
      <div className="flex gap-1 p-2 border-b border-white/10 flex-wrap">
        <button type="button" onClick={() => editor.chain().focus().toggleBold().run()} className={`px-2 py-1 rounded text-sm font-bold hover:bg-white/10 ${editor.isActive('bold') ? 'bg-white/20' : ''}`} title="Bold (Ctrl+B)"><strong>B</strong></button>
        <button type="button" onClick={() => editor.chain().focus().toggleItalic().run()} className={`px-2 py-1 rounded text-sm italic hover:bg-white/10 ${editor.isActive('italic') ? 'bg-white/20' : ''}`} title="Italic (Ctrl+I)"><em>I</em></button>
        <button type="button" onClick={() => editor.chain().focus().toggleBulletList().run()} className={`px-2 py-1 rounded text-sm hover:bg-white/10 ${editor.isActive('bulletList') ? 'bg-white/20' : ''}`} title="Bullet list">• List</button>
        <button type="button" onClick={() => editor.chain().focus().toggleOrderedList().run()} className={`px-2 py-1 rounded text-sm hover:bg-white/10 ${editor.isActive('orderedList') ? 'bg-white/20' : ''}`} title="Numbered list">1. List</button>
        <button type="button" onClick={() => editor.chain().focus().toggleBlockquote().run()} className={`px-2 py-1 rounded text-sm hover:bg-white/10 ${editor.isActive('blockquote') ? 'bg-white/20' : ''}`} title="Blockquote">" Quote</button>
      </div>
      <EditorContent
        editor={editor}
        className="prose prose-invert max-w-none p-3 min-h-[150px] focus:outline-none"
        placeholder={placeholder}
      />
    </div>
  )
})
