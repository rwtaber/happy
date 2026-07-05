import { Message } from '@/sync/typesMessage';

export interface SessionThinking {
    /** Concatenated thinking text, chronological (oldest → newest). */
    text: string;
    /** Whether the session has produced any thinking content. */
    hasThinking: boolean;
}

/**
 * The reducer wraps thinking text in asterisks for legacy inline italic
 * rendering; strip a single outer pair so the rail shows clean prose.
 */
export function stripThinkingMarkup(text: string): string {
    return text.replace(/^\*+/, '').replace(/\*+$/, '').trim();
}

/**
 * Collects a session's chain-of-thought into a single live-updating stream for
 * the Thinking rail. Thinking messages are hidden from the chat transcript (see
 * useGroupedMessages) and surfaced only here. Pure + storage-free for testing.
 */
export function collectSessionThinking(messages: Message[]): SessionThinking {
    const parts = messages
        .filter(
            (m): m is Extract<Message, { kind: 'agent-text' }> =>
                m.kind === 'agent-text' && m.isThinking === true,
        )
        .slice()
        .sort((a, b) => a.createdAt - b.createdAt)
        .map((m) => stripThinkingMarkup(m.text))
        .filter((part) => part.length > 0);
    return {
        text: parts.join('\n\n'),
        hasThinking: parts.length > 0,
    };
}
