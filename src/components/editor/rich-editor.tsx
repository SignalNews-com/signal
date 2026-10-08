"use client";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
export default function RichEditor({ content, onChange }: { content: string; onChange: (html: string) => void }) {
  const editor = useEditor({ extensions: [StarterKit.configure({ heading: { levels: [2, 3, 4] }, link: { openOnClick: false } }), Image.configure({ allowBase64: false })], content, immediatelyRender: false, editorProps: { attributes: { class: "prose editor-content", "aria-label": "Article content", role: "textbox", "aria-multiline": "true" } }, onUpdate: ({ editor }) => onChange(editor.getHTML()) });
  if (!editor) return <div className="skeleton editor-loading" aria-label="Loading editor" />;
  const buttons = [
    ["Paragraph", () => editor.chain().focus().setParagraph().run(), editor.isActive("paragraph")],
    ["H2", () => editor.chain().focus().toggleHeading({ level: 2 }).run(), editor.isActive("heading", { level: 2 })],
    ["H3", () => editor.chain().focus().toggleHeading({ level: 3 }).run(), editor.isActive("heading", { level: 3 })],
    ["Bold", () => editor.chain().focus().toggleBold().run(), editor.isActive("bold")],
    ["Italic", () => editor.chain().focus().toggleItalic().run(), editor.isActive("italic")],
    ["Bullet list", () => editor.chain().focus().toggleBulletList().run(), editor.isActive("bulletList")],
    ["Ordered list", () => editor.chain().focus().toggleOrderedList().run(), editor.isActive("orderedList")],
    ["Quote", () => editor.chain().focus().toggleBlockquote().run(), editor.isActive("blockquote")],
    ["Code", () => editor.chain().focus().toggleCode().run(), editor.isActive("code")],
    ["Code block", () => editor.chain().focus().toggleCodeBlock().run(), editor.isActive("codeBlock")],
  ] as const;
  return <div className="rich-editor"><div className="editor-toolbar" role="toolbar" aria-label="Text formatting">{buttons.map(([label, action, active]) => <button type="button" key={label} onClick={action} aria-pressed={active}>{label}</button>)}<button type="button" onClick={() => { const url = window.prompt("Link URL (https://…)", editor.getAttributes("link").href || ""); if (url === "") editor.chain().focus().unsetLink().run(); else if (url && /^https?:\/\//.test(url)) editor.chain().focus().setLink({ href: url }).run(); }}>Link</button><button type="button" onClick={() => { const src = window.prompt("Cloudinary image URL (use a previously uploaded image)"); if (src && /^https:\/\/res\.cloudinary\.com\//.test(src)) { const alt = window.prompt("Describe the image for readers") || ""; editor.chain().focus().setImage({ src, alt }).run(); } }}>Image</button><button type="button" onClick={() => editor.chain().focus().undo().run()}>Undo</button><button type="button" onClick={() => editor.chain().focus().redo().run()}>Redo</button></div><EditorContent editor={editor} /></div>;
}
