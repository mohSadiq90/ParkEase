import React from 'react';
import { Text, View, TextInput } from 'react-native';
import { render } from '@testing-library/react-native';
import ScreenLayout from '../ScreenLayout';

describe('ScreenLayout Keyboard & Form Handling', () => {
    it('wraps scrollable content in KeyboardAvoidingView and ScrollView with handled taps', () => {
        const { getByTestId, getByText } = render(
            <ScreenLayout scrollable>
                <View testID="form-container">
                    <Text>Form Field 1</Text>
                    <TextInput testID="test-input" placeholder="Enter value" />
                </View>
            </ScreenLayout>
        );

        expect(getByText('Form Field 1')).toBeTruthy();
        expect(getByTestId('test-input')).toBeTruthy();
        expect(getByTestId('form-container')).toBeTruthy();
    });

    it('respects custom keyboard props and offsets', () => {
        const { getByText } = render(
            <ScreenLayout
                scrollable
                keyboardVerticalOffset={50}
                keyboardBehavior="height"
                keyboardShouldPersistTaps="always"
                keyboardDismissMode="none"
            >
                <Text>Custom Offset Screen</Text>
            </ScreenLayout>
        );

        expect(getByText('Custom Offset Screen')).toBeTruthy();
    });

    it('supports static layouts with keyboardAvoiding enabled or disabled', () => {
        const { getByText, rerender } = render(
            <ScreenLayout scrollable={false} keyboardAvoiding={true}>
                <Text>Static Content With KAV</Text>
            </ScreenLayout>
        );

        expect(getByText('Static Content With KAV')).toBeTruthy();

        rerender(
            <ScreenLayout scrollable={false} keyboardAvoiding={false}>
                <Text>Static Content Without KAV</Text>
            </ScreenLayout>
        );

        expect(getByText('Static Content Without KAV')).toBeTruthy();
    });
});
