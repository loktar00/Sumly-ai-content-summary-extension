import { memo } from 'react';
import { markdownToHtml } from '@/utils/chat';
import { Message as MessageType } from './types';

export const Message = memo(({ role, content }: MessageType) => (
    <div className={`message ${role}-message`}>
        <div dangerouslySetInnerHTML={{ __html: markdownToHtml(content) }} />
    </div>
));