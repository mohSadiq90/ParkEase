/**
 * Root Navigator
 * Auth-conditional: shows Auth stack or App (role-based tabs)
 */

import React, { useEffect, useRef } from 'react';
import { Linking } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useDispatch } from 'react-redux';
import { useAuth } from '../hooks/useAuth';
import { restoreSessionThunk, completeCorporateSsoThunk } from '../store/slices/authSlice';
import { extractSsoCode } from '../services/auth/corporateSsoService';
import LoadingScreen from '../components/Common/LoadingScreen';
import AuthNavigator from './AuthNavigator';
import AppTabNavigator from './AppTabNavigator';
import posthogService from '../services/analytics/posthogService';
import logger from '../utils/logger';

const Stack = createNativeStackNavigator();

const RootNavigator = () => {
    const dispatch = useDispatch();
    const { isAuthenticated, isSessionChecked } = useAuth();
    const navigationRef = useRef(null);
    const routeNameRef = useRef(null);
    const screenStartTimeRef = useRef(Date.now());

    useEffect(() => {
        dispatch(restoreSessionThunk());
    }, [dispatch]);

    // Listen for SSO callback deep links (parkease://sso-callback?sso_code=...)
    useEffect(() => {
        const handleDeepLink = async (event) => {
            const url = event?.url || event;
            if (url && typeof url === 'string' && url.includes('sso-callback')) {
                try {
                    const code = extractSsoCode(url);
                    if (code) {
                        await dispatch(completeCorporateSsoThunk(code));
                    }
                } catch (err) {
                    logger.warn('RootNavigator', 'Failed to handle SSO deep link callback', err);
                }
            }
        };

        const subscription = Linking.addEventListener('url', handleDeepLink);
        Linking.getInitialURL().then((initialUrl) => {
            if (initialUrl) handleDeepLink(initialUrl);
        }).catch((err) => {
            logger.warn('RootNavigator', 'Failed to get initial URL', err);
        });

        return () => {
            subscription.remove();
        };
    }, [dispatch]);

    if (!isSessionChecked) {
        return <LoadingScreen message="Starting ParkEase..." />;
    }

    return (
        <NavigationContainer
            ref={navigationRef}
            onReady={() => {
                const initialRoute = navigationRef.current?.getCurrentRoute();
                if (initialRoute?.name) {
                    routeNameRef.current = initialRoute.name;
                    screenStartTimeRef.current = Date.now();
                    posthogService.trackScreen(initialRoute.name, initialRoute.params, null, 0);
                }
            }}
            onStateChange={() => {
                const previousRouteName = routeNameRef.current;
                const currentRoute = navigationRef.current?.getCurrentRoute();
                const currentRouteName = currentRoute?.name;

                if (currentRouteName && previousRouteName !== currentRouteName) {
                    const now = Date.now();
                    const dwellTimeMs = now - (screenStartTimeRef.current || now);
                    screenStartTimeRef.current = now;
                    routeNameRef.current = currentRouteName;

                    posthogService.trackScreen(
                        currentRouteName,
                        currentRoute.params,
                        previousRouteName,
                        dwellTimeMs
                    );
                }
            }}
        >
            <Stack.Navigator screenOptions={{ headerShown: false }}>
                {isAuthenticated ? (
                    <Stack.Screen name="App" component={AppTabNavigator} />
                ) : (
                    <Stack.Screen name="Auth" component={AuthNavigator} />
                )}
            </Stack.Navigator>
        </NavigationContainer>
    );
};

export default RootNavigator;
