import React, { useState, useEffect, useCallback, useRef, useImperativeHandle } from 'react';
import { Editor, Range, Extension } from '@tiptap/core';
import { PluginKey } from '@tiptap/pm/state';
import { ReactRenderer } from '@tiptap/react';
import Suggestion, { SuggestionOptions, SuggestionProps } from '@tiptap/suggestion';
import tippy, { Instance as TippyInstance, Props as TippyProps } from 'tippy.js';
import {
  IconH1, IconH2, IconH3, IconList, IconListNumbers, IconPhoto, IconQuote, IconCode, IconSeparator
} from './EditorIcons'; // Assuming EditorIcons.tsx exports these

interface CommandItem {
  title: string;
  description: string;
  icon: JSX.Element;
  command: ({ editor, range }: { editor: Editor; range: Range }) => void;
}

interface CommandListProps extends SuggestionProps<CommandItem> {
  // items, command, editor, range, query are inherited from SuggestionProps
}

interface CommandListRef {
  onKeyDown: (event: KeyboardEvent) => boolean;
}

const CommandList = React.forwardRef<CommandListRef, CommandListProps>(({ items, command }, ref) => {
  const [selectedIndex, setSelectedIndex] = useState(0);

  const selectItem = useCallback((index: number) => {
    const item = items[index];
    if (item) {
      command(item);
    }
  }, [command, items]);

  useEffect(() => {
    const navigationKeys = ['ArrowUp', 'ArrowDown', 'Enter'];
    const onKeyDown = (e: KeyboardEvent) => {
      if (navigationKeys.includes(e.key)) {
        e.preventDefault();
        if (e.key === 'ArrowUp') {
          setSelectedIndex((selectedIndex + items.length - 1) % items.length);
          return true;
        }
        if (e.key === 'ArrowDown') {
          setSelectedIndex((selectedIndex + 1) % items.length);
          return true;
        }
        if (e.key === 'Enter') {
          selectItem(selectedIndex);
          return true;
        }
        return false;
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [items, selectedIndex, selectItem]);

  useImperativeHandle(ref, () => ({
    onKeyDown: (event: KeyboardEvent): boolean => {
      if (event.key === 'ArrowUp') {
        setSelectedIndex((selectedIndex + items.length - 1) % items.length);
        return true;
      }
      if (event.key === 'ArrowDown') {
        setSelectedIndex((selectedIndex + 1) % items.length);
        return true;
      }
      if (event.key === 'Enter') {
        selectItem(selectedIndex);
        return true;
      }
      return false;
    }
  }));

  return (
    <div className="bg-white rounded-md shadow-lg border border-gray-200 overflow-hidden text-black" style={{ minWidth: '250px' }}>
      <div className="py-1">
        {items.length > 0 ? items.map((item, index) => (
          <button
            key={item.title}
            className={`flex items-center gap-2 w-full px-3 py-1.5 text-sm text-left hover:bg-gray-100 ${
              index === selectedIndex ? 'bg-gray-100' : ''
            }`}
            onClick={() => selectItem(index)}
          >
            <span className="w-5 h-5 flex items-center justify-center text-gray-500">
              {item.icon}
            </span>
            <div>
              <div className="font-medium">{item.title}</div>
              <div className="text-xs text-gray-500">{item.description}</div>
            </div>
          </button>
        )) : (
          <div className="px-3 py-1.5 text-sm text-gray-500">No results</div>
        )}
      </div>
    </div>
  );
});

const commandItems = (editor: Editor): CommandItem[] => [
  {
    title: 'Heading 1',
    description: 'Large section heading',
    icon: <IconH1 />,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setNode('heading', { level: 1 }).run();
    },
  },
  {
    title: 'Heading 2',
    description: 'Medium section heading',
    icon: <IconH2 />,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setNode('heading', { level: 2 }).run();
    },
  },
  {
    title: 'Heading 3',
    description: 'Small section heading',
    icon: <IconH3 />,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setNode('heading', { level: 3 }).run();
    },
  },
  {
    title: 'Bullet List',
    description: 'Create a simple bullet list',
    icon: <IconList />,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleBulletList().run();
    },
  },
  {
    title: 'Numbered List',
    description: 'Create a numbered list',
    icon: <IconListNumbers />,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleOrderedList().run();
    },
  },
  {
    title: 'Image',
    description: 'Add an image from URL',
    icon: <IconPhoto />,
    command: ({ editor, range }) => {
      const url = window.prompt('Enter image URL');
      if (url) {
        editor.chain().focus().deleteRange(range).setImage({ src: url }).run();
      }
    },
  },
  {
    title: 'Blockquote',
    description: 'Capture a quote',
    icon: <IconQuote />,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleBlockquote().run();
    },
  },
  {
    title: 'Code Block',
    description: 'Capture a code snippet',
    icon: <IconCode />,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleCodeBlock().run();
    },
  },
  {
    title: 'Horizontal Rule',
    description: 'Insert a horizontal line',
    icon: <IconSeparator />,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setHorizontalRule().run();
    },
  },
];

const suggestionPluginKey = new PluginKey('slash-commands-suggestion');

// Define options for this specific SlashCommands extension
interface SlashCommandsExtensionOptions {
  suggestion: Omit<SuggestionOptions<CommandItem>, 'editor'>;
}

export const SlashCommands = Extension.create<SlashCommandsExtensionOptions>({
  name: 'slashCommands',

  addOptions() {
    return {
      suggestion: {
        pluginKey: suggestionPluginKey,
        char: '/',
        command: ({ editor, range, props }: { editor: Editor; range: Range; props: CommandItem }) => {
          props.command({ editor, range });
        },
        items: ({ query, editor }: { query: string; editor: Editor }) => {
          return commandItems(editor)
            .filter(item => item.title.toLowerCase().startsWith(query.toLowerCase()))
            .slice(0, 10);
        },
        render: (): { onStart: (props: SuggestionProps<CommandItem>) => void; onUpdate: (props: SuggestionProps<CommandItem>) => void; onKeyDown: (props: { event: KeyboardEvent; }) => boolean; onExit: () => void; } => {
          let component: ReactRenderer<CommandListRef, CommandListProps> | null = null;
          let popup: TippyInstance<TippyProps>[] | null = null;

          return {
            onStart: (props: SuggestionProps<CommandItem>) => {
              component = new ReactRenderer<CommandListRef, CommandListProps>(CommandList, {
                props: props, // Pass all suggestion props directly
                editor: props.editor,
              });

              if (!props.clientRect) {
                return;
              }

              popup = tippy('body', {
                // content will be set after ensuring component.element exists
              });

              if (!component?.element) {
                console.error('SlashCommands: ReactRenderer component element not available for tippy content');
                if (popup && popup[0]) {
                  popup[0].destroy();
                }
                popup = null;
                return;
              }
              if (popup && popup[0]) {
                popup[0].setContent(component.element);
                popup[0].setProps({
                  getReferenceClientRect: props.clientRect as () => DOMRect,
                  appendTo: () => document.body,
                  content: component.element, // tippy.js requires content to be set in setProps or initially
                  showOnCreate: true,
                  interactive: true,
                  trigger: 'manual',
                  placement: 'bottom-start',
                  theme: 'light-border', // Ensure you have this theme or use a default one
                  arrow: false,
                  offset: [0, 8],
                });
              }
            },
            onUpdate(props: SuggestionProps<CommandItem>) {
              component?.updateProps({ ...props, editor: props.editor });

              if (!props.clientRect) {
                return;
              }

              if (popup && popup[0]) {
                popup[0].setProps({
                  getReferenceClientRect: props.clientRect as () => DOMRect,
                });
              }
            },
            onKeyDown: (props: { event: KeyboardEvent }): boolean => {
              if (props.event.key === 'Escape') {
                if (popup && popup[0]) popup[0].hide();
                return true;
              }
              // The type for component.ref is tricky with ReactRenderer. 
              // We cast to access onKeyDown, assuming CommandListRef structure.
              const commandListRef = component?.ref as CommandListRef | undefined;
              return commandListRef?.onKeyDown(props.event) ?? false;
            },
            onExit() {
              if (component) {
                component.destroy();
              }
              if (popup && popup[0]) {
                popup[0].destroy();
              }
              popup = null;
              component = null;
            },
          };
        },
      },
    };
  },

  addProseMirrorPlugins() {
    const { suggestion } = this.options;
    if (!suggestion) {
      return [];
    }
    return [
      Suggestion({ editor: this.editor, ...suggestion }),
    ];
  },
});

export default SlashCommands;
