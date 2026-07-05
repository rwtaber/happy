import { describe, expect, it } from 'vitest';

import { collectSessionThinking } from './sessionThinking';
import { Message } from '@/sync/typesMessage';

function agentText(id: string, createdAt: number, text: string, isThinking?: boolean): Message {
    return { kind: 'agent-text', id, localId: null, createdAt, text, ...(isThinking ? { isThinking: true } : {}) };
}

describe('collectSessionThinking', () => {
    it('returns empty when there is no thinking', () => {
        const result = collectSessionThinking([
            agentText('a', 1, 'the answer'),
            { kind: 'user-text', id: 'u', localId: null, createdAt: 0, text: 'hi' },
        ]);
        expect(result).toEqual({ text: '', hasThinking: false });
    });

    it('collects thinking chronologically and strips the italic asterisks', () => {
        const result = collectSessionThinking([
            agentText('t2', 3, '*second thought*', true),
            agentText('answer', 4, 'final answer'),
            agentText('t1', 2, '*first thought*', true),
        ]);
        expect(result.hasThinking).toBe(true);
        expect(result.text).toBe('first thought\n\nsecond thought');
    });

    it('ignores non-thinking agent text and empty thinking', () => {
        const result = collectSessionThinking([
            agentText('t1', 1, '*real reasoning*', true),
            agentText('t2', 2, '**', true),
            agentText('a', 3, 'answer'),
        ]);
        expect(result.text).toBe('real reasoning');
    });
});
