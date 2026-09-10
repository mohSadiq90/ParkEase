/**
 * Input Component
 * Text input with label, error state, icon support
 */

import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, shadows } from '../../styles/globalStyles';

const Input = React.forwardRef(({
    label,
    value,
    onChangeText,
    placeholder,
    error,
    secureTextEntry = false,
    keyboardType = 'default',
    autoCapitalize = 'sentences',
    multiline = false,
    numberOfLines = 1,
    leftIcon,
    rightIcon,
    prefix,
    suffix,
    editable = true,
    style,
    containerStyle,
    inputStyle,
    onFocus,
    onBlur,
    ...props
}, ref) => {
    const [focused, setFocused] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const internalRef = React.useRef(null);
    const inputRef = ref || internalRef;

    const handleFocus = (e) => {
        setFocused(true);
        if (onFocus) {
            onFocus(e);
        }
    };

    const handleBlur = (e) => {
        setFocused(false);
        if (onBlur) {
            onBlur(e);
        }
    };

    const handleContainerPress = () => {
        if (editable && inputRef.current) {
            inputRef.current.focus();
        }
    };

    return (
        <View style={[styles.container, containerStyle, style]}>
            {label && <Text style={styles.label}>{label}</Text>}
            <TouchableOpacity
                activeOpacity={1}
                onPress={handleContainerPress}
                style={[
                    styles.inputContainer,
                    focused && styles.inputFocused,
                    error && styles.inputError,
                    !editable && styles.inputDisabled,
                    multiline && { height: Math.max(numberOfLines * 40, 80) },
                ]}
            >
                {leftIcon && (
                    <Ionicons
                        name={leftIcon}
                        size={20}
                        color={focused ? colors.primary : colors.textTertiary}
                        style={styles.leftIcon}
                    />
                )}
                {prefix && (
                    <Text style={styles.prefixText}>{prefix}</Text>
                )}
                <TextInput
                    ref={inputRef}
                    value={value}
                    onChangeText={onChangeText}
                    placeholder={placeholder}
                    placeholderTextColor={colors.textTertiary}
                    secureTextEntry={secureTextEntry && !showPassword}
                    keyboardType={keyboardType}
                    autoCapitalize={autoCapitalize}
                    multiline={multiline}
                    numberOfLines={numberOfLines}
                    editable={editable}
                    {...props}
                    onFocus={handleFocus}
                    onBlur={handleBlur}
                    style={[
                        styles.input,
                        multiline && styles.multilineInput,
                        inputStyle,
                    ]}
                />
                {suffix && (
                    <Text style={styles.suffixText}>{suffix}</Text>
                )}
                {rightIcon && !secureTextEntry && (
                    <Ionicons
                        name={rightIcon}
                        size={20}
                        color={colors.textTertiary}
                        style={styles.rightIcon}
                    />
                )}
                {secureTextEntry && (
                    <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
                        <Ionicons
                            name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                            size={20}
                            color={colors.textTertiary}
                        />
                    </TouchableOpacity>
                )}
            </TouchableOpacity>
            {error && <Text style={styles.errorText}>{error}</Text>}
        </View>
    );
});

const styles = StyleSheet.create({
    container: {
        marginBottom: spacing.base,
    },
    label: {
        ...typography.label,
        color: colors.textPrimary,
        marginBottom: spacing.sm,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.surface,
        borderRadius: spacing.inputRadius,
        borderWidth: 1.5,
        borderColor: colors.border,
        paddingHorizontal: spacing.inputPaddingH,
        minHeight: 48,
        ...shadows.sm,
    },
    inputFocused: {
        borderColor: colors.primary,
        backgroundColor: colors.white,
    },
    inputError: {
        borderColor: colors.danger,
    },
    inputDisabled: {
        backgroundColor: colors.borderLight,
        opacity: 0.7,
    },
    leftIcon: {
        marginRight: spacing.sm,
    },
    rightIcon: {
        marginLeft: spacing.sm,
    },
    prefixText: {
        ...typography.body,
        fontWeight: '600',
        color: colors.textSecondary,
        marginRight: spacing.xs,
    },
    suffixText: {
        ...typography.caption,
        color: colors.textTertiary,
        marginLeft: spacing.xs,
    },
    input: {
        flex: 1,
        ...typography.body,
        color: colors.textPrimary,
        paddingVertical: spacing.inputPaddingV,
        minHeight: 44,
    },
    multilineInput: {
        textAlignVertical: 'top',
        minHeight: 80,
    },
    eyeIcon: {
        padding: spacing.xs,
    },
    errorText: {
        ...typography.caption,
        color: colors.danger,
        marginTop: spacing.xs,
    },
});

export default Input;
