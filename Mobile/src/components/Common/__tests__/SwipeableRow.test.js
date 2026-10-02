import React from 'react';
import { Text, View } from 'react-native';
import { render, fireEvent } from '@testing-library/react-native';
import SwipeableRow from '../SwipeableRow';

describe('SwipeableRow Component', () => {
    it('renders children content correctly', () => {
        const { getByText } = render(
            <SwipeableRow onDelete={jest.fn()}>
                <Text>Test Notification Item</Text>
            </SwipeableRow>
        );

        expect(getByText('Test Notification Item')).toBeTruthy();
    });

    it('renders delete action button and triggers onDelete when pressed', () => {
        const onDeleteMock = jest.fn();
        const { getByTestId } = render(
            <SwipeableRow onDelete={onDeleteMock} testID="test-item">
                <Text>Row Content</Text>
            </SwipeableRow>
        );

        const deleteBtn = getByTestId('test-item-delete-btn');
        expect(deleteBtn).toBeTruthy();

        fireEvent.press(deleteBtn);
        expect(onDeleteMock).toHaveBeenCalledTimes(1);
    });

    it('shows loading indicator and disables action when isDeleting is true', () => {
        const onDeleteMock = jest.fn();
        const { getByTestId } = render(
            <SwipeableRow onDelete={onDeleteMock} isDeleting={true} testID="deleting-item">
                <Text>Deleting Content</Text>
            </SwipeableRow>
        );

        expect(getByTestId('swipeable-loading')).toBeTruthy();

        const deleteBtn = getByTestId('deleting-item-delete-btn');
        fireEvent.press(deleteBtn);
        expect(onDeleteMock).not.toHaveBeenCalled();
    });

    it('does not trigger onDelete when disabled is true', () => {
        const onDeleteMock = jest.fn();
        const { getByTestId } = render(
            <SwipeableRow onDelete={onDeleteMock} disabled={true} testID="disabled-item">
                <Text>Disabled Content</Text>
            </SwipeableRow>
        );

        const deleteBtn = getByTestId('disabled-item-delete-btn');
        fireEvent.press(deleteBtn);
        expect(onDeleteMock).not.toHaveBeenCalled();
    });

    it('supports custom renderRightAction renderer', () => {
        const customAction = jest.fn(({ handleDelete }) => (
            <View testID="custom-action-btn">
                <Text onPress={handleDelete}>Custom Action</Text>
            </View>
        ));

        const onDeleteMock = jest.fn();
        const { getByTestId, getByText } = render(
            <SwipeableRow onDelete={onDeleteMock} renderRightAction={customAction}>
                <Text>Custom Row Content</Text>
            </SwipeableRow>
        );

        expect(getByTestId('custom-action-btn')).toBeTruthy();
        expect(getByText('Custom Action')).toBeTruthy();

        fireEvent.press(getByText('Custom Action'));
        expect(onDeleteMock).toHaveBeenCalledTimes(1);
    });
});
