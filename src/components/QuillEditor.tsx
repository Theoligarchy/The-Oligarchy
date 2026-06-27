import { useEffect, useRef } from 'react';

interface QuillEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

declare global {
  interface Window {
    Quill: any;
  }
}

export default function QuillEditor({ value, onChange, placeholder = 'Write your article in scholarly detail...' }: QuillEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const quillInstance = useRef<any>(null);
  const isUpdatingRef = useRef<boolean>(false);

  useEffect(() => {
    if (!containerRef.current || quillInstance.current) return;

    // Wait until window.Quill is available (usually instant due to head load)
    const initQuill = () => {
      if (typeof window.Quill === 'undefined') {
        setTimeout(initQuill, 100);
        return;
      }

      // Configure a robust toolbar representing professional literary formatting
      const toolbarOptions = [
        [{ header: [1, 2, 3, false] }],
        ['bold', 'italic', 'underline', 'blockquote'],
        [{ list: 'ordered' }, { list: 'bullet' }],
        ['link', 'image', 'video'],
        ['clean']
      ];

      quillInstance.current = new window.Quill(containerRef.current!, {
        theme: 'snow',
        placeholder,
        modules: {
          toolbar: toolbarOptions,
        }
      });

      // Set initial value
      if (value) {
        quillInstance.current.root.innerHTML = value;
      }

      // Track text changes
      quillInstance.current.on('text-change', () => {
        if (isUpdatingRef.current) return;
        const html = quillInstance.current.root.innerHTML;
        onChange(html);
      });
    };

    initQuill();

    return () => {
      // Cleanups if any
    };
  }, []);

  // Update value from external sources without losing cursor focus
  useEffect(() => {
    if (quillInstance.current && value !== quillInstance.current.root.innerHTML) {
      isUpdatingRef.current = true;
      quillInstance.current.root.innerHTML = value || '';
      isUpdatingRef.current = false;
    }
  }, [value]);

  return (
    <div className="border border-paper/15 rounded-md overflow-hidden bg-navy">
      <div ref={containerRef} style={{ minHeight: '380px' }} />
    </div>
  );
}
