/**
 * ScreenLayout Component
 * SafeAreaView wrapper for screens
 */

import React from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, Platform, StatusBar, KeyboardAvoidingView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../../styles/globalStyles';

const ScreenLayout = ({
    children,
    scrollable = false,
    refreshing = false,
    onRefresh,
    style,
    contentStyle,
    edges = ['top', 'bottom'],
    keyboardAvoiding = true,
    keyboardVerticalOffset,
    keyboardShouldPersistTaps = 'handled',
    keyboardDismissMode = 'on-drag',
}) => {
    const insets = useSafeAreaInsets();
    const topInset = edges?.includes('top')
        ? Math.max(insets?.top || 0, Platform.OS === 'android' ? (StatusBar.currentHeight || 24) : 0)
        : 0;
    const bottomInset = edges?.includes('bottom') ? (insets?.bottom || 0) : 0;

    const safeStyle = {
        paddingTop: topInset,
        paddingBottom: bottomInset,
    };

    const offset = keyboardVerticalOffset !== undefined
        ? keyboardVerticalOffset
        : (Platform.OS === 'ios' ? topInset : 0);

    if (scrollable) {
        const scrollContent = (
            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={[styles.scrollContent, contentStyle]}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps={keyboardShouldPersistTaps}
                keyboardDismissMode={keyboardDismissMode}
                refreshControl={
                    onRefresh ? (
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
                    ) : null
                }
            >
                {children}
            </ScrollView>
        );

        return (
            <View style={[styles.safeArea, safeStyle, style]}>
                {keyboardAvoiding ? (
                    <KeyboardAvoidingView
                        style={styles.keyboardView}
                        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                        keyboardVerticalOffset={offset}
                    >
                        {scrollContent}
                    </KeyboardAvoidingView>
                ) : (
                    scrollContent
                )}
            </View>
        );
    }

    const staticContent = <View style={[styles.container, contentStyle]}>{children}</View>;

    return (
        <View style={[styles.safeArea, safeStyle, style]}>
            {keyboardAvoiding ? (
                <KeyboardAvoidingView
                    style={styles.keyboardView}
                    behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                    keyboardVerticalOffset={offset}
                >
                    {staticContent}
                </KeyboardAvoidingView>
            ) : (
                staticContent
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: colors.background,
    },
    keyboardView: {
        flex: 1,
    },
    container: {
        flex: 1,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        flexGrow: 1,
        paddingBottom: 24,
    },
});

export default ScreenLayout;
