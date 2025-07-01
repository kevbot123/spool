'use client';

import React, { useCallback, useEffect } from 'react';
import { useEditor, EditorContent, BubbleMenu, FloatingMenu } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import { lowlight } from 'lowlight';
import { Markdown } from 'tiptap-markdown';
import { SlashCommands } from './SlashCommands';
import { 
  Bold, Italic, Strikethrough, Heading2, Heading3, List, ListOrdered, 
  Image as ImageIcon, Link as LinkIcon, Quote, Minus, Code, 
  TextQuote,
  Heading4,
  Link2
} from 'lucide-react';

interface TipTapEditorProps {
  content: string;
  onChange: (content: string) => void;
  authToken: string; // Added for media uploads
  /**
   * Controls whether the fixed menubar (toolbar at the top of the editor) is shown.
   * Defaults to true. When false, only the bubble menu will be displayed – useful for
   * compact in-table editing contexts.
   */
  showToolbar?: boolean;
  /**
   * When true, the editor will automatically focus (cursor placed) once it mounts.
   * Useful for inline editing scenarios where we want users to start typing immediately.
   */
  autoFocus?: boolean;
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

const TipTapEditor = ({ content, onChange, authToken, showToolbar = true, autoFocus = false }: TipTapEditorProps) => {
  
  
  
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

  // Sync external content prop changes to editor
  useEffect(() => {
    if (!editor) return;
    const current = editor.storage.markdown?.getMarkdown?.() ?? '';
    if (content !== current) {
      editor.commands.setContent(content || '');
    }
  }, [content, editor]);

  // Automatically focus the editor when it is first ready, if requested.
  useEffect(() => {
    if (autoFocus && editor) {
      // Timeout ensures focus after the element is added to the DOM.
      setTimeout(() => {
        if (editor?.isDestroyed) return;
        editor.commands.focus('end');
      }, 0);
    }
  }, [autoFocus, editor]);

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

  const stopPropagation = (e: React.SyntheticEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const buttonGroups = [
    [
      {
        name: 'bold',
        title: 'Bold',
        icon: <Bold className="w-3.5 h-3.5" />,
        onClick: () => editor.chain().focus().toggleBold().run(),
        isActive: editor.isActive('bold'),
      },
      {
        name: 'italic',
        title: 'Italic',
        icon: <Italic className="w-3.5 h-3.5" />,
        onClick: () => editor.chain().focus().toggleItalic().run(),
        isActive: editor.isActive('italic'),
      },
      {
        name: 'strike',
        title: 'Strikethrough',
        icon: <Strikethrough className="w-3.5 h-3.5" />,
        onClick: () => editor.chain().focus().toggleStrike().run(),
        isActive: editor.isActive('strike'),
      },
      {
        name: 'link',
        title: 'Link / Unlink',
        icon: <Link2 className="w-4 h-4" />,
        onClick: toggleLink,
        isActive: editor.isActive('link'),
      },
    ],
    [
      {
        name: 'heading2',
        title: 'Heading 2',
        icon: <Heading2 className="w-4 h-4" />,
        onClick: () => editor.chain().focus().toggleHeading({ level: 2 }).run(),
        isActive: editor.isActive('heading', { level: 2 }),
      },
      {
        name: 'heading3',
        title: 'Heading 3',
        icon: <Heading3 className="w-4 h-4" />,
        onClick: () => editor.chain().focus().toggleHeading({ level: 3 }).run(),
        isActive: editor.isActive('heading', { level: 3 }),
      },
      {
        name: 'heading4',
        title: 'Heading 4',
        icon: <Heading4 className="w-4 h-4" />,
        onClick: () => editor.chain().focus().toggleHeading({ level: 4 }).run(),
        isActive: editor.isActive('heading', { level: 4 }),
      },
    ],
    [
      {
        name: 'bulletList',
        title: 'Bullet List',
        icon: <List className="w-4 h-4" />,
        onClick: () => editor.chain().focus().toggleBulletList().run(),
        isActive: editor.isActive('bulletList'),
      },
      {
        name: 'orderedList',
        title: 'Ordered List',
        icon: <ListOrdered className="w-4 h-4" />,
        onClick: () => editor.chain().focus().toggleOrderedList().run(),
        isActive: editor.isActive('orderedList'),
      },
      {
        name: 'blockquote',
        title: 'Blockquote',
        icon: <TextQuote className="w-4 h-4" />,
        onClick: () => editor.chain().focus().toggleBlockquote().run(),
        isActive: editor.isActive('blockquote'),
      },
      {
        name: 'codeBlock',
        title: 'Code Block',
        icon: <Code className="w-4 h-4" />,
        onClick: () => editor.chain().focus().toggleCodeBlock().run(),
        isActive: editor.isActive('codeBlock'),
      },
    ],
    [
      { 
        name: 'image', 
        title: 'Insert Image', 
        icon: <ImageIcon className="w-3.5 h-3.5" />, 
        onClick: addImage, 
        isActive: false 
      },
      {
        name: 'horizontalRule',
        title: 'Horizontal Rule',
        icon: <Minus className="w-4 h-4" />,
        onClick: () => editor.chain().focus().setHorizontalRule().run(),
        isActive: false,
      },
    ],
  ];

  // Bubble menu should show the same tools as the toolbar.
  const bubbleMenuButtons = buttonGroups.flat();

  return (
    <div className={`${showToolbar ? 'border rounded-lg' : ''} relative flex flex-col overflow-hidden`}>
      {showToolbar && (
        <div className="flex flex-wrap items-center gap-1 p-1 border-b border-gray-200 bg-gray-50">
          {buttonGroups.map((group, groupIndex) => (
            <React.Fragment key={groupIndex}>
              {group.map(button => (
                <ToolbarButton
                  key={button.name}
                  icon={button.icon}
                  onClick={button.onClick}
                  isActive={button.isActive}
                  title={button.title}
                />
              ))}
              {groupIndex < buttonGroups.length - 1 && <div className="w-px h-5 bg-gray-300 mx-1" />}
            </React.Fragment>
          ))}
        </div>
      )}

      <style jsx global>{`
        .ProseMirror:focus {
          outline: none !important;
          border: none !important;
          box-shadow: none !important;
        }
      `}</style>

      <BubbleMenu
        editor={editor}
        tippyOptions={{ duration: 100, appendTo: () => document.body, interactive: true, maxWidth: 'none' }}
        pluginKey="bubbleMenu"
        shouldShow={({ editor, view, state, from, to }) => {
          return editor.isFocused && from !== to
        }}
      >
        <div 
          onClick={stopPropagation}
          onMouseDown={stopPropagation}
          onMouseDownCapture={stopPropagation}
          onPointerDown={stopPropagation}
          onPointerDownCapture={stopPropagation}
          className="bg-white border border-gray-200 shadow-lg rounded px-2 py-1 flex gap-1 flex-wrap"
          style={{ pointerEvents: 'auto' }}
        >
          {bubbleMenuButtons.map(button => (
            <button
              key={button.name}
              onClick={button.onClick}
              className={`p-1 rounded hover:bg-gray-100 ${button.isActive ? 'bg-gray-100 text-primary' : 'text-gray-600'}`}
              title={button.title}
            >
              {button.icon}
            </button>
          ))}
        </div>
      </BubbleMenu>

      <EditorContent editor={editor} className="prose max-w-none p-4 text-sm" />
    </div>
  );
};

export default TipTapEditor; 