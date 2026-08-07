import React, { useEffect, useMemo, useRef } from 'react';
import { Editor } from '@tinymce/tinymce-react';
import { Box, useTheme } from '@mui/material';

interface TinyMceEditorProps {
  /** Controlled HTML (updates editor when prop changes). */
  value?: string;
  /** Uncontrolled HTML — only applied on mount; use with `key` when switching documents. */
  initialValue?: string;
  onChange: (value: string) => void;
  onReady?: (editor: any | null) => void;
  height?: number;
  minHeight?: number;
  autoResize?: boolean;
  /** When omitted with autoResize, editor grows with content without an upper cap. */
  autoResizeMaxHeight?: number;
  outputFormat?: 'html' | 'text';
}

const DOCUMENT_SHEET_CONTENT_STYLE =
  'body { font-family: Arial, sans-serif; font-size: 14px; line-height: 1.6; margin: 12px; background: #ffffff; color: #111111; } ' +
  'table { border-collapse: collapse; width: 100%; } ' +
  'td, th { border: 1px solid #d7dee7; padding: 8px 10px; } ' +
  '[contenteditable="false"] { cursor: default; }';

const TinyMceEditor: React.FC<TinyMceEditorProps> = ({
  value,
  initialValue,
  onChange,
  onReady,
  height = 700,
  minHeight = 360,
  autoResize = false,
  autoResizeMaxHeight,
  outputFormat = 'html',
}) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const editorRef = useRef<any>(null);
  const onReadyRef = useRef(onReady);
  const onChangeRef = useRef(onChange);
  const autoResizeRef = useRef(autoResize);
  const lastSentRef = useRef('');

  onReadyRef.current = onReady;
  onChangeRef.current = onChange;
  autoResizeRef.current = autoResize;

  const isUncontrolled = initialValue !== undefined;
  const sourceHtml = isUncontrolled ? initialValue : value;

  const editorContent = useMemo(() => {
    if (outputFormat === 'text') {
      return (sourceHtml || '').replace(/\n/g, '<br />');
    }
    return sourceHtml || '';
  }, [outputFormat, sourceHtml]);

  useEffect(() => {
    if (!isUncontrolled) {
      lastSentRef.current = editorContent;
    }
  }, [editorContent, isUncontrolled]);

  useEffect(() => {
    return () => {
      onReadyRef.current?.(null);
      editorRef.current = null;
    };
  }, []);

  const normalizeToText = (html: string) => {
    const container = document.createElement('div');
    container.innerHTML = html || '';
    return (container.textContent || container.innerText || '').trim();
  };

  const basePlugins = [
    'anchor',
    'autolink',
    'charmap',
    'code',
    'codesample',
    'emoticons',
    'help',
    'image',
    'link',
    'lists',
    'media',
    'searchreplace',
    'table',
    'visualblocks',
    'wordcount',
  ];

  return (
    <Box
      sx={{
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 2,
        overflow: autoResize ? 'visible' : 'hidden',
        bgcolor: isDark ? 'grey.900' : 'grey.100',
        '& .tox-tinymce': { border: 'none !important' },
        '& .tox-statusbar': { borderTop: '1px solid', borderColor: 'divider' },
        '& .tox-edit-area': { bgcolor: '#ffffff' },
        '& .tox-edit-area__iframe': { bgcolor: '#ffffff !important' },
        ...(autoResize
          ? {
              '& .tox-edit-area__iframe': { display: 'block' },
            }
          : {}),
      }}
    >
      <Editor
        tinymceScriptSrc="/tinymce/tinymce.min.js"
        licenseKey="gpl"
        {...(isUncontrolled ? { initialValue: editorContent } : { value: editorContent })}
        onInit={(_, editor) => {
          editorRef.current = editor;
          lastSentRef.current = outputFormat === 'text' ? normalizeToText(editor.getContent()) : editor.getContent();
          onReadyRef.current?.(editor);
          if (autoResizeRef.current) {
            const resizeEditor = () => {
              try {
                editor.execCommand('mceAutoResize');
              } catch {
                // TinyMCE may not have autoresize ready yet.
              }
            };
            editor.on('LoadContent SetContent change input NodeChange', resizeEditor);
            setTimeout(resizeEditor, 0);
            setTimeout(resizeEditor, 300);
          }
        }}
        onEditorChange={(nextHtml) => {
          const nextValue = outputFormat === 'text' ? normalizeToText(nextHtml) : nextHtml;
          if (nextValue !== lastSentRef.current) {
            lastSentRef.current = nextValue;
            onChangeRef.current(nextValue);
          }
        }}
        init={{
          base_url: '/tinymce',
          suffix: '.min',
          ...(autoResize
            ? {
                min_height: minHeight,
                ...(autoResizeMaxHeight !== undefined ? { autoresize_max_height: autoResizeMaxHeight } : {}),
                autoresize_bottom_margin: 24,
                autoresize_overflow_padding: 12,
                resize: false,
              }
            : { height }),
          menubar: 'file edit view insert format tools table help',
          plugins: autoResize ? [...basePlugins, 'autoresize'] : basePlugins,
          toolbar:
            'undo redo | blocks fontfamily fontsize | bold italic underline strikethrough | link image media table | align lineheight | numlist bullist indent outdent | emoticons charmap | removeformat | code visualblocks',
          branding: false,
          promotion: false,
          statusbar: true,
          toolbar_sticky: false,
          skin: isDark ? 'oxide-dark' : 'oxide',
          content_css: 'default',
          content_style: DOCUMENT_SHEET_CONTENT_STYLE,
        }}
      />
    </Box>
  );
};

export default TinyMceEditor;
