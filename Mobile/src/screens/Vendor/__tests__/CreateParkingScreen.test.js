import React from 'react';
import { Alert } from 'react-native';
import { fireEvent, renderWithProviders, waitFor } from '../../../utils/test-utils';
import CreateParkingScreen from '../CreateParkingScreen';
import apiClient from '../../../services/api/apiClient';

jest.mock('../../../services/api/apiClient');

describe('CreateParkingScreen', () => {
  const mockNavigation = {
    goBack: jest.fn(),
  };

  beforeEach(() => {
    jest.spyOn(Alert, 'alert');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders form inputs correctly', () => {
    const { getByPlaceholderText, getByText } = renderWithProviders(
      <CreateParkingScreen navigation={mockNavigation} route={{}} />
    );

    expect(getByPlaceholderText('e.g. Downtown Parking Garage')).toBeTruthy();
    expect(getByPlaceholderText('Street address')).toBeTruthy();
    expect(getByText('Create Space')).toBeTruthy();
  });

  it('shows error alert if required fields are missing', async () => {
    const { getByText } = renderWithProviders(
      <CreateParkingScreen navigation={mockNavigation} route={{}} />
    );

    const submitBtn = getByText('Create Space');
    fireEvent.press(submitBtn);

    expect(Alert.alert).toHaveBeenCalledWith(
      'Required Fields',
      'Please fill in all required fields'
    );
    expect(apiClient.post).not.toHaveBeenCalled();
  });

  it('submits form successfully when required fields are filled', async () => {
    apiClient.post.mockResolvedValueOnce({
      data: { success: true, data: { id: 'new-space' } },
    });

    const { getByPlaceholderText, getByText, getAllByPlaceholderText } = renderWithProviders(
      <CreateParkingScreen navigation={mockNavigation} route={{}} />
    );

    fireEvent.changeText(getByPlaceholderText('e.g. Downtown Parking Garage'), 'Test Space');
    fireEvent.changeText(getByPlaceholderText('Number of spots'), '10');
    fireEvent.changeText(getByPlaceholderText('Street address'), '123 Main St');
    fireEvent.changeText(getByPlaceholderText('City'), 'New York');
    
    const zeroInputs = getAllByPlaceholderText('0.00');
    fireEvent.changeText(zeroInputs[0], '15');

    const submitBtn = getByText('Create Space');
    fireEvent.press(submitBtn);

    await waitFor(() => {
      expect(apiClient.post).toHaveBeenCalled();
    });

    expect(Alert.alert).toHaveBeenCalledWith(
      'Success',
      'Parking space created!',
      expect.any(Array)
    );
  });

  it('renders in edit mode and allows saving updates', async () => {
    apiClient.put.mockResolvedValueOnce({
      data: { success: true, data: { id: 'space-edit-123' } },
    });

    const editData = {
      id: 'space-edit-123',
      title: 'City Center Plaza',
      description: 'Covered spots with security',
      address: '777 Broadway',
      city: 'Metropolis',
      totalSpots: 50,
      hourlyRate: 25,
      imageUrls: ['https://example.com/p1.jpg'],
    };

    const { getByText } = renderWithProviders(
      <CreateParkingScreen
        navigation={mockNavigation}
        route={{ params: { editData } }}
      />
    );

    expect(getByText('Edit Parking Space')).toBeTruthy();
    expect(getByText('Save Changes')).toBeTruthy();
    expect(getByText('Delete Parking Space')).toBeTruthy();

    const saveBtn = getByText('Save Changes');
    fireEvent.press(saveBtn);

    await waitFor(() => {
      expect(apiClient.put).toHaveBeenCalled();
    });
  });

  it('allows deleting parking space via header delete icon in edit mode', async () => {
    apiClient.delete.mockResolvedValueOnce({
      data: { success: true },
    });

    const editData = {
      id: 'space-delete-456',
      title: 'Listing To Delete',
      address: '123 River Rd',
      city: 'Metropolis',
      totalSpots: 10,
      hourlyRate: 12,
    };

    const { getByTestId } = renderWithProviders(
      <CreateParkingScreen
        navigation={mockNavigation}
        route={{ params: { editData } }}
      />
    );

    const headerDeleteBtn = getByTestId('header-delete-listing-btn');
    expect(headerDeleteBtn).toBeTruthy();

    fireEvent.press(headerDeleteBtn);

    expect(Alert.alert).toHaveBeenCalledWith(
      'Delete Parking Space',
      'Are you sure you want to permanently delete this parking space?',
      expect.any(Array)
    );

    const alertButtons = Alert.alert.mock.calls[0][2];
    const confirmBtn = alertButtons.find((b) => b.text === 'Delete');
    await confirmBtn.onPress();

    await waitFor(() => {
      expect(apiClient.delete).toHaveBeenCalledWith(
        expect.stringContaining('space-delete-456')
      );
    });
  });
});
