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

  it('toggles between all and steps view modes using segmented toggle', () => {
    const { getByTestId, getByText, queryByTestId } = renderWithProviders(
      <CreateParkingScreen navigation={mockNavigation} route={{}} />
    );

    // Initial mode is 'all'
    expect(getByText(/All Sections • Step 1 of 4/)).toBeTruthy();
    expect(queryByTestId('sticky-stepper-footer')).toBeNull();

    // Switch to 'steps' mode
    const stepsBtn = getByTestId('view-mode-steps-btn');
    fireEvent.press(stepsBtn);

    // Now in 'steps' mode
    expect(getByText(/Step 1 of 4 • Basics/)).toBeTruthy();
    expect(getByTestId('sticky-stepper-footer')).toBeTruthy();
    expect(getByTestId('stepper-next-btn')).toBeTruthy();

    // Switch back to 'all' mode
    const allBtn = getByTestId('view-mode-all-btn');
    fireEvent.press(allBtn);

    expect(getByText(/All Sections • Step 1 of 4/)).toBeTruthy();
    expect(queryByTestId('sticky-stepper-footer')).toBeNull();
  });

  it('renders only one submit button on step 4 in steps mode (no duplicates)', () => {
    const { getByTestId, getAllByText } = renderWithProviders(
      <CreateParkingScreen
        navigation={mockNavigation}
        route={{ params: { initialViewMode: 'steps', initialStep: 4 } }}
      />
    );

    // Verify sticky footer is present on step 4
    expect(getByTestId('sticky-stepper-footer')).toBeTruthy();
    expect(getByTestId('stepper-back-btn')).toBeTruthy();

    // Verify there is exactly ONE "Create Space" button on the screen
    const createButtons = getAllByText('Create Space');
    expect(createButtons).toHaveLength(1);
    expect(getByTestId('submit-parking-button')).toBeTruthy();
  });

  it('navigates through steps using stepper tabs and next/back buttons in steps mode', () => {
    const { getByTestId, getByText } = renderWithProviders(
      <CreateParkingScreen
        navigation={mockNavigation}
        route={{ params: { initialViewMode: 'steps', initialStep: 1 } }}
      />
    );

    expect(getByText(/Step 1 of 4 • Basics/)).toBeTruthy();

    // Press Next to go to Step 2
    fireEvent.press(getByTestId('stepper-next-btn'));
    expect(getByText(/Step 2 of 4 • Access/)).toBeTruthy();
    expect(getByTestId('stepper-back-btn')).toBeTruthy();

    // Press Next to go to Step 3
    fireEvent.press(getByTestId('stepper-next-btn'));
    expect(getByText(/Step 3 of 4 • Pricing/)).toBeTruthy();

    // Press Back to return to Step 2
    fireEvent.press(getByTestId('stepper-back-btn'));
    expect(getByText(/Step 2 of 4 • Access/)).toBeTruthy();

    // Tap directly on Step 4 tab
    fireEvent.press(getByTestId('step-tab-4'));
    expect(getByText(/Step 4 of 4 • Review/)).toBeTruthy();
    expect(getByTestId('submit-parking-button')).toBeTruthy();
  });

  it('scrolls to the corresponding step section when tapping step tabs in all mode', () => {
    const { getByTestId, getByText } = renderWithProviders(
      <CreateParkingScreen navigation={mockNavigation} route={{}} />
    );

    // In all mode, simulate layouts for each step
    fireEvent(getByTestId('step-1-section'), 'layout', { nativeEvent: { layout: { y: 0 } } });
    fireEvent(getByTestId('step-2-section'), 'layout', { nativeEvent: { layout: { y: 450 } } });
    fireEvent(getByTestId('step-3-section'), 'layout', { nativeEvent: { layout: { y: 900 } } });
    fireEvent(getByTestId('step-4-section'), 'layout', { nativeEvent: { layout: { y: 1350 } } });

    // Tap step 2 tab
    fireEvent.press(getByTestId('step-tab-2'));
    expect(getByText(/All Sections • Step 2 of 4/)).toBeTruthy();

    // Tap step 3 tab
    fireEvent.press(getByTestId('step-tab-3'));
    expect(getByText(/All Sections • Step 3 of 4/)).toBeTruthy();

    // Tap step 4 tab
    fireEvent.press(getByTestId('step-tab-4'));
    expect(getByText(/All Sections • Step 4 of 4/)).toBeTruthy();
  });
});
