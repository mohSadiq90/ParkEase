/**
 * ScreenLayout Component
 * SafeAreaView wrapper for screens
 */

import React from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, Platform, StatusBar } from 'react-native';
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

    if (scrollable) {
        return (
            <View style={[styles.safeArea, safeStyle, style]}>
                <ScrollView
                    style={styles.scrollView}
                    contentContainerStyle={[styles.scrollContent, contentStyle]}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        onRefresh ? (
                            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
                        ) : null
                    }
                >
                    {children}
                </ScrollView>
            </View>
        );
    }

    return (
        <View style={[styles.safeArea, safeStyle, style]}>
            <View style={[styles.container, contentStyle]}>{children}</View>
        </View>
    );
};

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: colors.background,
    },
    container: {
        flex: 1,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        flexGrow: 1,
    },
});

export default ScreenLayout;
