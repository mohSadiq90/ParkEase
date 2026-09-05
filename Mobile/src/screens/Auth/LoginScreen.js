/**
 * LoginScreen
 * Email + password login with premium gradient background
 * Supports standard login, corporate enterprise login, and Google social login
 */

import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, Keyboard, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../hooks/useAuth';
import { validateForm, loginRules } from '../../utils/validators';
import Button from '../../components/Common/Button';
import Input from '../../components/Common/Input';
import { colors, spacing, typography } from '../../styles/globalStyles';
import authService from '../../services/auth/authService';
import googleAuthService from '../../services/auth/googleAuthService';
import NotificationService from '../../services/notifications/NotificationService';
import { getExternalAuthErrorMessage } from '../../utils/externalAuthErrors';

const LoginScreen = ({ navigation }) => {
    const { login, loginCorporate, loginExternal, loading, error, dismissError } = useAuth();
    const [loginMode, setLoginMode] = useState('personal'); // 'personal' | 'corporate'
    const [formData, setFormData] = useState({ email: '', password: '', companyId: '' });
    const [errors, setErrors] = useState({});
    const passwordRef = React.useRef(null);

    const handleLogin = useCallback(async () => {
        Keyboard.dismiss();
        dismissError();
        const validation = validateForm(formData, loginRules);
        if (!validation.isValid) {
            setErrors(validation.errors);
            return;
        }
        setErrors({});

        if (loginMode === 'corporate') {
            await loginCorporate({
                email: formData.email,
                password: formData.password,
                companyId: formData.companyId?.trim() || undefined,
            });
        } else {
            await login({
                email: formData.email,
                password: formData.password,
            });
        }
    }, [formData, loginMode, login, loginCorporate, dismissError]);

    const handleGoogleLogin = useCallback(async () => {
        dismissError();
        try {
            // 1. Authenticate with Google native SDK to obtain real Google ID token
            const authResult = await googleAuthService.signIn();

            // Silently ignore user cancel or in-progress status
            if (authResult?.cancelled || authResult?.inProgress) {
                return;
            }

            if (!authResult?.idToken) {
                throw new Error('No identity token received from Google');
            }

            // 2. Exchange real Google ID token with ParkEase API POST /api/auth/external
            const res = await loginExternal({
                provider: 'google',
                idToken: authResult.idToken,
                userConsentGiven: true,
                deviceClientType: Platform.OS === 'ios' ? 'ios' : 'android',
            });

            // 3. If login was successful, register FCM device token for push notifications
            if (res && !res.error) {
                NotificationService.registerCurrentDevice().catch(() => {});
            }
        } catch (err) {
            const friendly = getExternalAuthErrorMessage(err);
            Alert.alert('Google Sign-In Failed', friendly);
        }
    }, [loginExternal, dismissError]);


    const handleSsoDiscovery = useCallback(async () => {
        if (!formData.email || !formData.email.includes('@')) {
            Alert.alert('Email Required', 'Please enter your corporate email address first to discover SSO settings.');
            return;
        }
        try {
            const res = await authService.discoverSSO(formData.email);
            if (res.data?.ssoEnabled) {
                Alert.alert(
                    'SSO Available',
                    `Corporate SSO is enabled for ${res.data.companyName || 'your organization'}. Redirecting to IDP...`,
                    [
                        {
                            text: 'Proceed to SSO',
                            onPress: async () => {
                                const startRes = await authService.startSSO({
                                    email: formData.email,
                                    returnUrl: 'parkease://sso-callback',
                                });
                                if (startRes.data?.authorizationUrl) {
                                    Alert.alert('SSO Redirect', `Opening ${startRes.data.authorizationUrl}`);
                                }
                            }
                        },
                        { text: 'Cancel', style: 'cancel' }
                    ]
                );
            } else {
                Alert.alert('SSO Not Configured', 'No enterprise SSO found for this domain. Please use password login.');
            }
        } catch (err) {
            Alert.alert('SSO Discovery Error', 'Unable to check SSO configuration.');
        }
    }, [formData.email]);

    const updateField = (field) => (value) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
        if (errors[field]) {
            setErrors((prev) => ({ ...prev, [field]: null }));
        }
    };

    return (
        <LinearGradient colors={colors.gradients.hero} style={styles.gradient}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.container}
            >
                {/* Logo Area */}
                <View style={styles.logoSection}>
                    <View style={styles.logoCircle}>
                        <Ionicons name="car-sport" size={48} color={colors.primary} />
                    </View>
                    <Text style={styles.appName}>ParkEase</Text>
                    <Text style={styles.tagline}>Find & book parking in seconds</Text>
                </View>

                {/* Form Card */}
                <View style={styles.formCard}>
                    <Text style={styles.welcomeText}>Welcome Back</Text>

                    {/* Mode Toggle */}
                    <View style={styles.modeTabs}>
                        <TouchableOpacity
                            style={[styles.modeTab, loginMode === 'personal' && styles.modeTabActive]}
                            onPress={() => { setLoginMode('personal'); dismissError(); }}
                        >
                            <Ionicons
                                name="person-outline"
                                size={16}
                                color={loginMode === 'personal' ? colors.primary : colors.textTertiary}
                            />
                            <Text style={[styles.modeTabText, loginMode === 'personal' && styles.modeTabTextActive]}>
                                Personal
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.modeTab, loginMode === 'corporate' && styles.modeTabActive]}
                            onPress={() => { setLoginMode('corporate'); dismissError(); }}
                        >
                            <Ionicons
                                name="business-outline"
                                size={16}
                                color={loginMode === 'corporate' ? colors.primary : colors.textTertiary}
                            />
                            <Text style={[styles.modeTabText, loginMode === 'corporate' && styles.modeTabTextActive]}>
                                Corporate
                            </Text>
                        </TouchableOpacity>
                    </View>

                    {error && (
                        <View style={styles.errorBanner}>
                            <Ionicons name="alert-circle" size={18} color={colors.danger} />
                            <Text style={styles.errorBannerText}>{error}</Text>
                        </View>
                    )}

                    <Input
                        label={loginMode === 'corporate' ? 'Work Email' : 'Email'}
                        value={formData.email}
                        onChangeText={updateField('email')}
                        placeholder="Enter your email"
                        keyboardType="email-address"
                        autoCapitalize="none"
                        leftIcon="mail-outline"
                        error={errors.email}
                        textContentType="username"
                        autoComplete="email"
                        importantForAutofill="yes"
                        returnKeyType="next"
                        onSubmitEditing={() => passwordRef.current?.focus()}
                        blurOnSubmit={false}
                    />

                    <Input
                        label="Password"
                        value={formData.password}
                        onChangeText={updateField('password')}
                        placeholder="Enter your password"
                        secureTextEntry
                        leftIcon="lock-closed-outline"
                        error={errors.password}
                        textContentType="password"
                        autoComplete="password"
                        importantForAutofill="yes"
                        returnKeyType="go"
                        ref={passwordRef}
                        onSubmitEditing={handleLogin}
                    />

                    {loginMode === 'corporate' && (
                        <TouchableOpacity
                            style={styles.ssoLink}
                            onPress={handleSsoDiscovery}
                        >
                            <Ionicons name="key-outline" size={14} color={colors.primary} />
                            <Text style={styles.ssoLinkText}>Sign in with Company SSO (OIDC/SAML)</Text>
                        </TouchableOpacity>
                    )}

                    <Button
                        title={loginMode === 'corporate' ? 'Corporate Sign In' : 'Sign In'}
                        onPress={handleLogin}
                        loading={loading}
                        style={styles.loginButton}
                    />

                    {loginMode === 'personal' && (
                        <>
                            <View style={styles.dividerRow}>
                                <View style={styles.dividerLine} />
                                <Text style={styles.dividerText}>or</Text>
                                <View style={styles.dividerLine} />
                            </View>

                            <TouchableOpacity
                                style={styles.googleBtn}
                                onPress={handleGoogleLogin}
                            >
                                <Ionicons name="logo-google" size={18} color={colors.textPrimary} />
                                <Text style={styles.googleBtnText}>Continue with Google</Text>
                            </TouchableOpacity>
                        </>
                    )}

                    <View style={styles.signupRow}>
                        <Text style={styles.signupText}>Don't have an account? </Text>
                        <TouchableOpacity onPress={() => navigation.navigate('Signup')}>
                            <Text style={styles.signupLink}>Sign Up</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </KeyboardAvoidingView>
        </LinearGradient>
    );
};

const styles = StyleSheet.create({
    gradient: {
        flex: 1,
    },
    container: {
        flex: 1,
        justifyContent: 'center',
        paddingHorizontal: spacing.screenHorizontal,
    },
    logoSection: {
        alignItems: 'center',
        marginBottom: spacing.xl,
    },
    logoCircle: {
        width: 76,
        height: 76,
        borderRadius: 38,
        backgroundColor: colors.white,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: spacing.sm,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 12,
        elevation: 8,
    },
    appName: {
        fontSize: 32,
        fontWeight: '800',
        color: colors.white,
        letterSpacing: 1,
    },
    tagline: {
        ...typography.bodySmall,
        color: 'rgba(255,255,255,0.8)',
        marginTop: 2,
    },
    formCard: {
        backgroundColor: colors.white,
        borderRadius: spacing.radius.xl,
        padding: spacing.xl,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.15,
        shadowRadius: 24,
        elevation: 12,
    },
    welcomeText: {
        ...typography.h2,
        color: colors.textPrimary,
        marginBottom: spacing.md,
        textAlign: 'center',
    },
    modeTabs: {
        flexDirection: 'row',
        backgroundColor: colors.surfaceVariant,
        borderRadius: spacing.radius.md,
        padding: 3,
        marginBottom: spacing.base,
    },
    modeTab: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingVertical: 8,
        borderRadius: spacing.radius.sm,
    },
    modeTabActive: {
        backgroundColor: colors.white,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
        elevation: 2,
    },
    modeTabText: {
        ...typography.caption,
        color: colors.textTertiary,
        fontWeight: '600',
    },
    modeTabTextActive: {
        color: colors.primary,
        fontWeight: '700',
    },
    errorBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.dangerSoft,
        padding: spacing.md,
        borderRadius: spacing.radius.md,
        marginBottom: spacing.base,
        gap: spacing.sm,
    },
    errorBannerText: {
        ...typography.bodySmall,
        color: colors.dangerDark,
        flex: 1,
    },
    ssoLink: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginTop: 2,
        marginBottom: spacing.md,
        alignSelf: 'flex-start',
    },
    ssoLinkText: {
        ...typography.caption,
        color: colors.primary,
        fontWeight: '600',
    },
    loginButton: {
        marginTop: spacing.sm,
    },
    dividerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: spacing.md,
    },
    dividerLine: {
        flex: 1,
        height: 1,
        backgroundColor: colors.border,
    },
    dividerText: {
        ...typography.caption,
        color: colors.textTertiary,
        marginHorizontal: spacing.sm,
    },
    googleBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.sm,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: spacing.radius.md,
        paddingVertical: 12,
        backgroundColor: colors.surface,
    },
    googleBtnText: {
        ...typography.bodySmall,
        fontWeight: '600',
        color: colors.textPrimary,
    },
    signupRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginTop: spacing.lg,
    },
    signupText: {
        ...typography.bodySmall,
        color: colors.textSecondary,
    },
    signupLink: {
        ...typography.bodySmall,
        color: colors.primary,
        fontWeight: typography.weight.semibold,
    },
});

export default LoginScreen;
