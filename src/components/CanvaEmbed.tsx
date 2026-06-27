import React, { useMemo } from 'react';

interface CanvaEmbedProps {
  embedSource: string;
}

export default function CanvaEmbed({ embedSource }: CanvaEmbedProps) {
  const embedUrl = useMemo(() => {
    if (!embedSource) return '';

    // If it's a full iframe string, extract the src URL
    if (embedSource.includes('<iframe') && embedSource.includes('src=')) {
      const match = embedSource.match(/src=["']([^"']+)["']/);
      if (match && match[1]) {
        return match[1];
      }
    }

    // Otherwise, clean up the URL to make sure it's embed-friendly
    let url = embedSource.trim();
    if (url.includes('canva.com') && !url.includes('/view?embed') && url.includes('/view')) {
      url = url.replace('/view', '/view?embed');
    }
    return url;
  }, [embedSource]);

  if (!embedUrl) {
    return (
      <div className="p-8 border border-dashed border-red-500/30 text-red-400 bg-red-950/10 rounded-md text-center">
        Invalid Canva embed code or URL.
      </div>
    );
  }

  return (
    <div 
      style={{
        width: '100%',
        height: 0,
        paddingTop: '56.25%',
        position: 'relative',
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        borderRadius: '8px',
        overflow: 'hidden'
      }}
      className="bg-navy border border-paper/10"
    >
      <iframe
        src={embedUrl}
        allowFullScreen
        allow="fullscreen"
        className="absolute top-0 left-0 w-full h-full border-0"
        title="Canva Digital Presentation Viewer"
        referrerPolicy="no-referrer"
      />
    </div>
  );
}
