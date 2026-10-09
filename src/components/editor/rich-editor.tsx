"use client";
import { useRef, useState } from "react";
import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import { altFromFilename, uploadContentImage } from "./upload";
const imageFiles = (list?: FileList | null) => Array.from(list || []).filter(file => file.type.startsWith("image/"));
export default function RichEditor({ content, onChange, articleId, onError }: { content: string; onChange: (html: string) => void; articleId?: string; onError?: (message: string) => void }) {
  const [uploading, setUploading] = useState(0); const editorRef = useRef<Editor | null>(null); const fileInput = useRef<HTMLInputElement>(null);
  // Uploads to Cloudinary, then inserts at `position` (drop point) or the cursor.
  async function insertImages(files: File[], position?: number) {
    const editor = editorRef.current; if (!editor || !files.length) return;
    setUploading(n => n + files.length);
    for (const file of files) {
      try { const image = await uploadContentImage(file, articleId); const node = { type: "image", attrs: { src: image.url, alt: altFromFilename(file.name) || "Article image", width: image.width, height: image.height } }; if (position === undefined) editor.chain().focus().insertContent(node).run(); else editor.chain().focus().insertContentAt(position, node).run(); }
      catch (error) { onError?.(error instanceof Error ? error.message : "Image upload failed"); }
      finally { setUploading(n => n - 1); }
    }
  }
  const editor = useEditor({
    extensions: [StarterKit.configure({ heading: { levels: [2, 3, 4] }, link: { openOnClick: false } }), Image.configure({ allowBase64: false })], content, immediatelyRender: false,
    editorProps: {
      attributes: { class: "prose editor-content", "aria-label": "Article content", role: "textbox", "aria-multiline": "true" },
      handlePaste: (_view, event) => { const files = imageFiles(event.clipboardData?.files); if (!files.length) return false; void insertImages(files); return true; },
      handleDrop: (view, event, _slice, moved) => { const files = imageFiles(event.dataTransfer?.files); if (moved || !files.length) return false; event.preventDefault(); void insertImages(files, view.posAtCoords({ left: event.clientX, top: event.clientY })?.pos); return true; },
    },
    onCreate: ({ editor }) => { editorRef.current = editor; }, onUpdate: ({ editor }) => onChange(editor.getHTML()),
  });
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
    ["Divider", () => editor.chain().focus().setHorizontalRule().run(), false],
  ] as const;
  return <div className="rich-editor"><div className="editor-toolbar" role="toolbar" aria-label="Text formatting">{buttons.map(([label, action, active]) => <button type="button" key={label} onClick={action} aria-pressed={active}>{label}</button>)}<button type="button" onClick={() => { const url = window.prompt("Link URL (https://…)", editor.getAttributes("link").href || ""); if (url === "") editor.chain().focus().unsetLink().run(); else if (url && /^https?:\/\//.test(url)) editor.chain().focus().setLink({ href: url }).run(); }}>Link</button><button type="button" className="toolbar-upload" onClick={() => fileInput.current?.click()} disabled={uploading > 0}>{uploading ? `Uploading ${uploading}…` : "Upload image"}</button><input ref={fileInput} type="file" accept="image/*" multiple hidden onChange={event => { void insertImages(imageFiles(event.target.files)); event.target.value = ""; }} />{editor.isActive("image") ? <button type="button" onClick={() => { const alt = window.prompt("Describe this image for readers and search engines", editor.getAttributes("image").alt || ""); if (alt !== null) editor.chain().focus().updateAttributes("image", { alt: alt.trim().slice(0, 250) }).run(); }}>Edit alt text</button> : null}<button type="button" onClick={() => editor.chain().focus().undo().run()}>Undo</button><button type="button" onClick={() => editor.chain().focus().redo().run()}>Redo</button></div><EditorContent editor={editor} /><p className="editor-hint small muted">Tip: paste or drag images straight into the text. They&apos;re resized automatically.</p></div>;
}
