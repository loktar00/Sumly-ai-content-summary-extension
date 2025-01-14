import { memo } from 'react';
import { markdownToHtml } from '@/utils/chat';

interface StreamingMessageProps {
    content: string;
}

export const StreamingMessage = memo(({ content }: StreamingMessageProps) => (
    <div className="message assistant-message">
        <div className="markdown-body" dangerouslySetInnerHTML={{
            __html: markdownToHtml(content)
        }} />
    </div>
));