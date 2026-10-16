import React, { useMemo } from 'react';
import { marked } from 'marked';

interface MarkdownContentProps {
  content: string;
  className?: string;
}

// Configure marked with GitHub Flavored Markdown and line breaks
marked.setOptions({
  gfm: true,
  breaks: true,
});

export const MarkdownContent: React.FC<MarkdownContentProps> = ({ content, className = '' }) => {
  const html = useMemo(() => {
    if (!content) return '';
    try {
      const parsed = marked.parse(content, { async: false });
      return typeof parsed === 'string' ? parsed : String(parsed);
    } catch (e) {
      console.warn('Markdown parsing error:', e);
      return content;
    }
  }, [content]);

  return (
    <div
      className={`markdown-body text-inherit ${className}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
};
