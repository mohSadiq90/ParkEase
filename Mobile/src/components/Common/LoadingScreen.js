/**
 * LoadingScreen Component
 * Displays reusable animated shimmer skeleton placeholder across screens.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, typography } from '../../styles/globalStyles';
import { ScreenShimmer } from './ShimmerPlaceholder';

const LoadingScreen = ({
    message,
    type = 'list',
    count = 3,
    style,
    testID = 'loading-screen',
}) => (
    <View style={[styles.container, style]} testID={testID}>
        {message ? (
            <View style={styles.header}>
                <Text style={styles.messageText}>{message}</Text>
            </View>
        ) : null}
        <ScreenShimmer loading={true} type={type} count={count} testID="loading-shimmer" />
    </View>
);

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background || '#F8FAFC',
        paddingHorizontal: 16,
        paddingTop: 12,
    },
    header: {
        paddingVertical: 8,
        paddingHorizontal: 4,
        marginBottom: 8,
    },
    messageText: {
        ...typography.bodySmall,
        color: colors.textSecondary || '#64748B',
        fontWeight: '500',
    },
});

export default LoadingScreen;
