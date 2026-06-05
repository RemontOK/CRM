import React, { useEffect, useMemo, useRef } from 'react';
import { Editor } from '@tinymce/tinymce-react';
import { Box } from '@mui/material';

interface TinyMceEditorProps {
  value: string;
  onChange: (value: string) => void;
  onReady?: (editor: any | null) => void;
  height?: number;
  outputFormat?: 'html' | 'text';
}

const TinyMceEditor: React.FC<TinyMceEditorProps> = ({
  value,
  onChange,
  onReady,
  height = 700,
  outputFormat = 'html',
}) => {
  const editorRef = useRef<any>(null);
  const lastSentRef = useRef(value);

  const editorValue = useMemo(() => {
    if (outputFormat === 'text') {
      return (value || '').replace(/\n/g, '<br />');
    }
    return value || '';
  }, [outputFormat, value]);

  const normalizeToText = (html: string) => {
    const container = document.createElement('div');
    container.innerHTML = html || '';
    return (container.textContent || container.innerText || '').trim();
  };

  useEffect(() => {
    return () => {
      onReady?.(null);
      editorRef.current = null;
    };
  }, [onReady]);

  return (
    <Box
      sx={{
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 2,
        overflow: 'hidden',
        bgcolor: '#fff',
        '& .tox-tinymce': { border: 'none !important' },
      }}
    >
      <Editor
        tinymceScriptSrc="/tinymce/tinymce.min.js"
        licenseKey="gpl"
        value={editorValue}
        onInit={(_, editor) => {
          editorRef.current = editor;
          onReady?.(editor);
        }}
        onEditorChange={(nextHtml) => {
          const nextValue = outputFormat === 'text' ? normalizeToText(nextHtml) : nextHtml;
          if (nextValue !== lastSentRef.current) {
            lastSentRef.current = nextValue;
            onChange(nextValue);
          }
        }}
        init={{
          base_url: '/tinymce',
          suffix: '.min',
          height,
          menubar: 'file edit view insert format tools table help',
          plugins: [
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
          ],
          toolbar:
            'undo redo | blocks fontfamily fontsize | bold italic underline strikethrough | link image media table | align lineheight | numlist bullist indent outdent | emoticons charmap | removeformat | code visualblocks',
          branding: false,
          promotion: false,
          statusbar: true,
          content_style:
            'body { font-family: Arial, sans-serif; font-size: 14px; line-height: 1.6; } table { border-collapse: collapse; width: 100%; }',
        }}
      />
    </Box>
  );
};

export default TinyMceEditor;
