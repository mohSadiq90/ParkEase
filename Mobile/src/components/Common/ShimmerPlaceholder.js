/**
 * ShimmerPlaceholder Component & Skeleton Loaders
 * Reusable animated shimmer effect for loading states across all screens.
 */

import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet, Easing, Dimensions } from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

/**
 * Base animated shimmer placeholder primitive.
 * Smoothly pulses opacity to give a polished loading shimmer effect.
 */
export const ShimmerPlaceholder = ({
    width = '100%',
    height = 16,
    borderRadius = 6,
    style,
    duration = 900,
    baseColor = '#E2E8F0',
    highlightColor = '#F8FAFC',
    children,
    testID = 'shimmer-placeholder',
    ...props
}) => {
    const animatedValue = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        const animation = Animated.loop(
            Animated.sequence([
                Animated.timing(animatedValue, {
                    toValue: 1,
                    duration,
                    easing: Easing.inOut(Easing.ease),
                    useNativeDriver: true,
                }),
                Animated.timing(animatedValue, {
                    toValue: 0,
                    duration,
                    easing: Easing.inOut(Easing.ease),
                    useNativeDriver: true,
                }),
            ])
        );
        animation.start();
        return () => animation.stop();
    }, [animatedValue, duration]);

    const opacity = animatedValue.interpolate({
        inputRange: [0, 1],
        outputRange: [0.35, 0.85],
    });

    return (
        <View
            style={[
                styles.placeholder,
                {
                    width,
                    height,
                    borderRadius,
                    backgroundColor: baseColor,
                },
                style,
            ]}
            testID={testID}
            {...props}
        >
            <Animated.View
                style={[
                    StyleSheet.absoluteFillObject,
                    {
                        backgroundColor: highlightColor,
                        borderRadius,
                        opacity,
                    },
                ]}
            />
            {children}
        </View>
    );
};

/**
 * Shimmer skeleton for listing, booking, and search cards.
 */
export const CardSkeleton = ({ style, testID = 'card-skeleton' }) => (
    <View style={[styles.cardContainer, style]} testID={testID}>
        <View style={styles.cardHeader}>
            <ShimmerPlaceholder
                width={52}
                height={52}
                borderRadius={8}
                style={styles.thumbnail}
                testID={`${testID}-thumb`}
            />
            <View style={styles.headerText}>
                <ShimmerPlaceholder
                    width="65%"
                    height={16}
                    borderRadius={4}
                    style={{ marginBottom: 8 }}
                    testID={`${testID}-title`}
                />
                <ShimmerPlaceholder
                    width="40%"
                    height={12}
                    borderRadius={4}
                    testID={`${testID}-subtitle`}
                />
            </View>
        </View>
        <View style={styles.cardBody}>
            <ShimmerPlaceholder
                width="100%"
                height={12}
                borderRadius={4}
                style={{ marginBottom: 8 }}
            />
            <ShimmerPlaceholder width="80%" height={12} borderRadius={4} />
        </View>
        <View style={styles.cardFooter}>
            <ShimmerPlaceholder width={75} height={28} borderRadius={6} />
            <ShimmerPlaceholder width={75} height={28} borderRadius={6} />
            <ShimmerPlaceholder width={75} height={28} borderRadius={6} />
        </View>
    </View>
);

/**
 * Shimmer list skeleton rendering multiple card placeholders.
 */
export const ListSkeleton = ({ count = 3, style, testID = 'list-skeleton' }) => (
    <View style={[styles.listContainer, style]} testID={testID}>
        {Array.from({ length: count }).map((_, index) => (
            <CardSkeleton key={`skeleton-item-${index}`} style={styles.listItem} testID={`skeleton-card-${index}`} />
        ))}
    </View>
);

/**
 * Detail screen skeleton (parking detail, booking detail).
 */
export const DetailSkeleton = ({ style, testID = 'detail-skeleton' }) => (
    <View style={[styles.detailContainer, style]} testID={testID}>
        <ShimmerPlaceholder
            width="100%"
            height={220}
            borderRadius={0}
            style={styles.detailHero}
            testID={`${testID}-hero`}
        />
        <View style={styles.detailContent}>
            <View style={styles.detailHeaderRow}>
                <ShimmerPlaceholder width="60%" height={22} borderRadius={6} />
                <ShimmerPlaceholder width="25%" height={22} borderRadius={6} />
            </View>
            <ShimmerPlaceholder width="45%" height={14} borderRadius={4} style={{ marginTop: 8, marginBottom: 16 }} />
            <View style={styles.chipRow}>
                <ShimmerPlaceholder width={65} height={26} borderRadius={13} style={{ marginRight: 8 }} />
                <ShimmerPlaceholder width={75} height={26} borderRadius={13} style={{ marginRight: 8 }} />
                <ShimmerPlaceholder width={60} height={26} borderRadius={13} />
            </View>
            <View style={{ marginTop: 24 }}>
                <ShimmerPlaceholder width="100%" height={14} borderRadius={4} style={{ marginBottom: 8 }} />
                <ShimmerPlaceholder width="95%" height={14} borderRadius={4} style={{ marginBottom: 8 }} />
                <ShimmerPlaceholder width="70%" height={14} borderRadius={4} />
            </View>
            <ShimmerPlaceholder width="100%" height={140} borderRadius={12} style={{ marginTop: 24 }} />
        </View>
    </View>
);

/**
 * Dashboard screen skeleton with KPI grid and list cards.
 */
export const DashboardSkeleton = ({ style, testID = 'dashboard-skeleton' }) => (
    <View style={[styles.dashboardContainer, style]} testID={testID}>
        <View style={styles.dashboardHeader}>
            <ShimmerPlaceholder width="50%" height={22} borderRadius={6} style={{ marginBottom: 8 }} />
            <ShimmerPlaceholder width="35%" height={14} borderRadius={4} />
        </View>
        <View style={styles.kpiGrid}>
            <View style={styles.kpiRow}>
                <ShimmerPlaceholder width="48%" height={85} borderRadius={12} style={styles.kpiCard} />
                <ShimmerPlaceholder width="48%" height={85} borderRadius={12} style={styles.kpiCard} />
            </View>
            <View style={[styles.kpiRow, { marginTop: 12 }]}>
                <ShimmerPlaceholder width="48%" height={85} borderRadius={12} style={styles.kpiCard} />
                <ShimmerPlaceholder width="48%" height={85} borderRadius={12} style={styles.kpiCard} />
            </View>
        </View>
        <ShimmerPlaceholder width="100%" height={52} borderRadius={12} style={{ marginTop: 20 }} />
        <View style={{ marginTop: 24 }}>
            <ShimmerPlaceholder width="40%" height={18} borderRadius={4} style={{ marginBottom: 12 }} />
            <CardSkeleton />
            <CardSkeleton style={{ marginTop: 12 }} />
        </View>
    </View>
);

/**
 * ScreenShimmer: High-level wrapper that conditionally displays the skeleton loader.
 */
export const ScreenShimmer = ({
    loading = true,
    type = 'list',
    count = 3,
    children,
    style,
    testID = 'screen-shimmer',
}) => {
    if (loading) {
        if (type === 'detail') {
            return <DetailSkeleton style={style} testID={testID} />;
        }
        if (type === 'dashboard') {
            return <DashboardSkeleton style={style} testID={testID} />;
        }
        return <ListSkeleton count={count} style={style} testID={testID} />;
    }
    return children || null;
};

const styles = StyleSheet.create({
    placeholder: {
        overflow: 'hidden',
        position: 'relative',
    },
    cardContainer: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#F1F5F9',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    thumbnail: {
        marginRight: 12,
    },
    headerText: {
        flex: 1,
    },
    cardBody: {
        marginTop: 14,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: '#F8FAFC',
    },
    cardFooter: {
        flexDirection: 'row',
        justifyContent: 'flex-start',
        gap: 8,
        marginTop: 14,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: '#F8FAFC',
    },
    listContainer: {
        flex: 1,
        paddingHorizontal: 16,
        paddingTop: 8,
    },
    listItem: {
        marginBottom: 12,
    },
    detailContainer: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    detailHero: {
        marginBottom: 16,
    },
    detailContent: {
        paddingHorizontal: 16,
    },
    detailHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    chipRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    dashboardContainer: {
        flex: 1,
        paddingHorizontal: 16,
        paddingTop: 16,
    },
    dashboardHeader: {
        marginBottom: 16,
    },
    kpiGrid: {
        width: '100%',
    },
    kpiRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    kpiCard: {
        overflow: 'hidden',
    },
});

export default ShimmerPlaceholder;
