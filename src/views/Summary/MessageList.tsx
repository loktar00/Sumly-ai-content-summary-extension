import { memo } from 'react';
import { Message } from './Message';
import { Message as MessageType } from './types';

interface MessageListProps {
    messages: MessageType[];
}

export const MessageList = memo(({ messages }: MessageListProps) => (
    <>
        {messages.map((msg, index) => (
            <Message key={index} {...msg} />
        ))}
    </>
));