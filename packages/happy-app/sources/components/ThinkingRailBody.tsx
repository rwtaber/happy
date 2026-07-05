import * as React from 'react';
import { ScrollView, Text, View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { t } from '@/text';
import { useSessionThinking } from '@/hooks/useSessionThinking';
import { useSession } from '@/sync/storage';

/**
 * Body of the Thinking rail: streams a Copilot session's chain-of-thought,
 * auto-scrolling to the latest reasoning while the agent is actively thinking.
 * Rendered inside the right sidebar when its mode is 'thinking'.
 */
export const ThinkingRailBody = React.memo(function ThinkingRailBody(props: {
    sessionId: string;
}) {
    const { text, hasThinking } = useSessionThinking(props.sessionId);
    const session = useSession(props.sessionId);
    const isThinking = session?.thinking === true;
    const scrollRef = React.useRef<ScrollView>(null);

    React.useEffect(() => {
        // Keep the newest reasoning in view as it streams in.
        if (isThinking && hasThinking) {
            scrollRef.current?.scrollToEnd({ animated: false });
        }
    }, [text, isThinking, hasThinking]);

    if (!hasThinking) {
        return (
            <View style={styles.empty}>
                <Text style={styles.emptyText}>
                    {isThinking ? `${t('message.thinking')}…` : t('message.thinking')}
                </Text>
            </View>
        );
    }

    return (
        <ScrollView
            ref={scrollRef}
            style={styles.scroll}
            contentContainerStyle={styles.content}
        >
            <Text style={styles.thinkingText} selectable>
                {text}
            </Text>
            {isThinking ? (
                <Text style={styles.cursor}>{`${t('message.thinking')}…`}</Text>
            ) : null}
        </ScrollView>
    );
});

const styles = StyleSheet.create((theme) => ({
    scroll: {
        flex: 1,
    },
    content: {
        paddingHorizontal: 14,
        paddingVertical: 12,
    },
    thinkingText: {
        color: theme.colors.textSecondary,
        fontSize: 13,
        lineHeight: 19,
        fontStyle: 'italic',
    },
    cursor: {
        color: theme.colors.textSecondary,
        fontSize: 12,
        marginTop: 8,
        opacity: 0.6,
    },
    empty: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
    },
    emptyText: {
        color: theme.colors.textSecondary,
        fontSize: 13,
        fontStyle: 'italic',
        opacity: 0.7,
    },
}));
