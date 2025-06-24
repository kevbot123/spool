'use client';

import { useCallback } from 'react';
import { useEditor, EditorContent, BubbleMenu, FloatingMenu } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import { lowlight } from 'lowlight';
import { Markdown } from 'tiptap-markdown';
import { SlashCommands } from './SlashCommands';
import { IconBold, IconItalic, IconStrikethrough, IconH2, IconH3, IconList, IconListNumbers, IconPhoto, IconLink, IconQuote, IconSeparator, IconCode } from './EditorIcons';

interface TipTapEditorProps {
  content: string;
  onChange: (content: string) => void;
  authToken: string; // Added for media uploads
}

interface ToolbarButtonProps {
  icon: React.ReactNode;
  onClick: () => void;
  isActive?: boolean;
  title: string;
}

const ToolbarButton = ({ icon, onClick, isActive, title }: ToolbarButtonProps) => (
  <button
    type="button"
    onClick={onClick}
    className={`p-1 rounded hover:bg-gray-100 ${isActive ? 'bg-gray-100 text-primary' : 'text-gray-600'}`}
    title={title}
  >
    {icon}
  </button>
);

const TipTapEditor = ({ content, onChange, authToken }: TipTapEditorProps) => {
  
  
  
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [2, 3],
        },
        codeBlock: false,
      }),
      Image.configure({
        allowBase64: true,
        inline: false,
      }),
      Link.configure({
        openOnClick: false,
        linkOnPaste: true,
      }),
      CodeBlockLowlight.configure({
        lowlight,
        defaultLanguage: 'plaintext',
      }),
      Placeholder.configure({
        placeholder: 'Write something or press "/" for commands...',
      }),
      SlashCommands,
      Markdown.configure({
        html: true,
        tightLists: true,
        tightListClass: 'tight',
        bulletListMarker: '*',
        linkify: true,
        breaks: false,
        transformPastedText: false,
        transformCopiedText: false,
      }),
    ],
    content: content,
    immediatelyRender: false, // Add this line
    onUpdate: ({ editor }) => {
      onChange(editor.storage.markdown.getMarkdown());
    },
    editorProps: {
      attributes: {
        class: 'markdown-content',
      },
    },
  });

  // Define callbacks and other state logic before any early returns
  

  const addImage = useCallback(async () => {
    if (!editor || !authToken) {
      console.error('Editor or auth token not available for image upload.');
      alert('Authentication token is missing. Cannot upload image.');
      return;
    }

    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async (e) => {
      const target = e.target as HTMLInputElement;
      const file = target.files?.[0];
      if (!file) return;

      const formData = new FormData();
      formData.append('file', file);

      // TODO: Implement a more user-friendly loading state (e.g., disable button, show spinner)
      console.log('Uploading image...');

      try {
        const response = await fetch('/api/admin/media/upload', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${authToken}`,
            // 'Content-Type' is automatically set by the browser for FormData
          },
          body: formData,
        });

        if (!response.ok) {
          let errorMsg = `Failed to upload image: ${response.statusText}`;
          try {
            const errorData = await response.json();
            errorMsg = errorData.error || errorMsg;
          } catch (jsonError) {
            // Ignore if response is not JSON
          }
          throw new Error(errorMsg);
        }

        const result = await response.json();
        if (result.url) {
          editor.chain().focus().setImage({ src: result.url }).run();
        } else {
          throw new Error('Image URL not found in upload response.');
        }
      } catch (error) {
        console.error('Image upload failed:', error);
        alert(`Image upload failed: ${error instanceof Error ? error.message : String(error)}`);
      } finally {
        // TODO: Clear loading state
        console.log('Image upload process finished.');
      }
    };
    input.click();
  }, [editor, authToken]);

  const toggleLink = useCallback(() => {
    if (!editor) return;
    // If link is active, remove it
    if (editor.isActive('link')) {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }
    const previousUrl = editor.getAttributes('link').href || '';
    const url = window.prompt('Enter URL', previousUrl);
    if (url && url.trim() !== '') {
      editor.chain().focus().extendMarkRange('link').setLink({ href: url.trim() }).run();
    }
  }, [editor]);

  if (!editor) {
    return null;
  }

  const stopPropagation = (e: React.MouseEvent) => e.stopPropagation();

  return (
    <div className="border border-gray-300 rounded-md relative flex flex-col overflow-hidden">
      <div className="flex flex-wrap items-center gap-1 p-1 border-b border-gray-200 bg-gray-50">
        <ToolbarButton
          icon={<IconBold />}
          onClick={() => editor?.chain().focus().toggleBold().run()}
          isActive={editor?.isActive('bold')}
          title="Bold"
        />
        <ToolbarButton
          icon={<IconItalic />}
          onClick={() => editor?.chain().focus().toggleItalic().run()}
          isActive={editor?.isActive('italic')}
          title="Italic"
        />
        <ToolbarButton
          icon={<IconStrikethrough />}
          onClick={() => editor?.chain().focus().toggleStrike().run()}
          isActive={editor?.isActive('strike')}
          title="Strikethrough"
        />
        <div className="w-px h-5 bg-gray-300 mx-1" />
        <ToolbarButton
          icon={<IconH2 />}
          onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
          isActive={editor?.isActive('heading', { level: 2 })}
          title="Heading 2"
        />
        <ToolbarButton
          icon={<IconH3 />}
          onClick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()}
          isActive={editor?.isActive('heading', { level: 3 })}
          title="Heading 3"
        />
        <div className="w-px h-5 bg-gray-300 mx-1" /> {/* Separator after H2/H3 */}
        <ToolbarButton
          icon={<IconList />}
          onClick={() => editor?.chain().focus().toggleBulletList().run()}
          isActive={editor?.isActive('bulletList')}
          title="Bullet List"
        />
        <ToolbarButton
          icon={<IconListNumbers />}
          onClick={() => editor?.chain().focus().toggleOrderedList().run()}
          isActive={editor?.isActive('orderedList')}
          title="Ordered List"
        />
        <div className="w-px h-5 bg-gray-300 mx-1" /> {/* Separator after Lists */}
        <ToolbarButton
          icon={<IconQuote />}
          onClick={() => editor?.chain().focus().toggleBlockquote().run()}
          isActive={editor?.isActive('blockquote')}
          title="Blockquote"
        />
        <ToolbarButton
          icon={<IconCode />}
          onClick={() => editor?.chain().focus().toggleCodeBlock().run()}
          isActive={editor?.isActive('codeBlock')}
          title="Code Block"
        />
        <div className="w-px h-5 bg-gray-300 mx-1" /> {/* Separator before original IconPhoto */}
        <ToolbarButton icon={<IconPhoto />} onClick={addImage} title="Insert Image" />
        <ToolbarButton
          icon={<IconLink />}
          onClick={toggleLink}
          isActive={editor?.isActive('link')}
          title="Link / Unlink"
        />
        <div className="w-px h-5 bg-gray-300 mx-1" />
        <ToolbarButton
          icon={<IconSeparator />}
          onClick={() => editor?.chain().focus().setHorizontalRule().run()}
          title="Horizontal Rule"
        />
      </div>

      <style jsx global>{`
        .ProseMirror:focus {
          outline: none !important;
          border: none !important;
          box-shadow: none !important;
        }
      `}</style>

      <BubbleMenu
        editor={editor}
        tippyOptions={{ duration: 100, appendTo: () => document.body, interactive: true }}
        pluginKey="bubbleMenu"
        shouldShow={({ editor, view, state, from, to }) => {
          return editor.isFocused && from !== to
        }}
      >
        <div onClick={stopPropagation} className="bg-white border border-gray-200 shadow-lg rounded px-2 py-1 flex gap-1">
          <button
            onClick={() => editor.chain().focus().toggleBold().run()}
            className={`p-1 rounded hover:bg-gray-100 ${editor.isActive('bold') ? 'bg-gray-100 text-primary' : 'text-gray-600'}`}
            title="Bold"
          >
            <IconBold />
          </button>
          <button
            onClick={() => editor.chain().focus().toggleItalic().run()}
            className={`p-1 rounded hover:bg-gray-100 ${editor.isActive('italic') ? 'bg-gray-100 text-primary' : 'text-gray-600'}`}
            title="Italic"
          >
            <IconItalic />
          </button>
          <button
            onClick={() => editor.chain().focus().toggleStrike().run()}
            className={`p-1 rounded hover:bg-gray-100 ${editor.isActive('strike') ? 'bg-gray-100 text-primary' : 'text-gray-600'}`}
            title="Strikethrough"
          >
            <IconStrikethrough />
          </button>
          <button
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            className={`p-1 rounded hover:bg-gray-100 ${editor.isActive('heading', { level: 2 }) ? 'bg-gray-100 text-primary' : 'text-gray-600'}`}
            
          >
            <IconH2 />
          </button>
          <button
            onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
            className={`p-1 rounded hover:bg-gray-100 ${editor.isActive('heading', { level: 3 }) ? 'bg-gray-100 text-primary' : 'text-gray-600'}`}
            title="Heading 3"
          >
            <IconH3 />
          </button>
          <button
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            className={`p-1 rounded hover:bg-gray-100 ${editor.isActive('bulletList') ? 'bg-gray-100 text-primary' : 'text-gray-600'}`}
            
          >
            <IconList />
          </button>
          <button
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            className={`p-1 rounded hover:bg-gray-100 ${editor.isActive('orderedList') ? 'bg-gray-100 text-primary' : 'text-gray-600'}`}
            
          >
            <IconListNumbers />
          </button>
          <button
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            className={`p-1 rounded hover:bg-gray-100 ${editor.isActive('blockquote') ? 'bg-gray-100 text-primary' : 'text-gray-600'}`}
            
          >
            <IconQuote />
          </button>
          <button
            onClick={() => editor.chain().focus().toggleCodeBlock().run()}
            className={`p-1 rounded hover:bg-gray-100 ${editor.isActive('codeBlock') ? 'bg-gray-100 text-primary' : 'text-gray-600'}`}
            
          >
            <IconCode />
          </button>
          <button
            onClick={toggleLink}
            className={`p-1 rounded hover:bg-gray-100 ${editor.isActive('link') ? 'bg-gray-100 text-primary' : 'text-gray-600'}`}
            title="Link"
          >
            <IconLink />
          </button>
        </div>
      </BubbleMenu>

      <EditorContent editor={editor} className="prose max-w-none p-4" />
    </div>
  );
};

export default TipTapEditor; 