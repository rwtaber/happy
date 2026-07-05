import * as React from 'react';

import { useSessionMessages } from '@/sync/storage';

import { collectSessionThinking, type SessionThinking } from './sessionThinking';

export { collectSessionThinking, type SessionThinking } from './sessionThinking';

export function useSessionThinking(sessionId: string): SessionThinking {
    const { messages } = useSessionMessages(sessionId);
    return React.useMemo(() => collectSessionThinking(messages), [messages]);
}
