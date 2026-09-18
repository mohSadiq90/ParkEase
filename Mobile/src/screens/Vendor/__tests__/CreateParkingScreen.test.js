import React from 'react';
import { Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
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
    const { getByText, getByTestId } = renderWithProviders(
      <CreateParkingScreen navigation={mockNavigation} route={{}} />
    );

    const submitBtn = getByText('Create Space');
    fireEvent.press(submitBtn);

    expect(Alert.alert).toHaveBeenCalledWith(
      'Required Fields',
      expect.stringContaining('Please fill in all required fields')
    );
    expect(getByTestId('validation-error-banner')).toBeTruthy();
    expect(getByText(/Validation Issues Found/)).toBeTruthy();
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
    fireEvent.changeText(getByPlaceholderText('Describe your parking space, clearance height, gate access rules, etc.'), 'Secure gated facility');
    fireEvent.changeText(getByPlaceholderText('Number of spots'), '10');
    fireEvent.changeText(getByPlaceholderText('Street address'), '123 Main St');
    fireEvent.changeText(getByPlaceholderText('City'), 'New York');
    fireEvent.changeText(getByPlaceholderText('State'), 'NY');
    fireEvent.changeText(getByPlaceholderText('Zip code'), '10001');
    
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
      state: 'NY',
      postalCode: '10001',
      zipCode: '10001',
      country: 'USA',
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

  it('renders photo upload buttons and interactive empty upload box', () => {
    const { getByTestId, getByText } = renderWithProviders(
      <CreateParkingScreen navigation={mockNavigation} route={{}} />
    );

    expect(getByTestId('upload-photos-btn')).toBeTruthy();
    expect(getByTestId('choose-from-library-btn')).toBeTruthy();
    expect(getByTestId('take-photo-btn')).toBeTruthy();
    expect(getByTestId('empty-photo-upload-box')).toBeTruthy();
    expect(getByText('Upload photos of your parking space')).toBeTruthy();
    expect(getByText(/Listings with photos receive 3x more bookings!/)).toBeTruthy();
  });

  it('prompts user with photo source options when pressing Upload Photos button', () => {
    const { getByTestId } = renderWithProviders(
      <CreateParkingScreen navigation={mockNavigation} route={{}} />
    );

    fireEvent.press(getByTestId('upload-photos-btn'));

    expect(Alert.alert).toHaveBeenCalledWith(
      'Upload Listing Photos',
      expect.stringContaining('Choose how you would like to upload photos'),
      expect.arrayContaining([
        expect.objectContaining({ text: 'Take Photo' }),
        expect.objectContaining({ text: 'Choose from Library' }),
        expect.objectContaining({ text: 'Cancel' }),
      ])
    );
  });

  it('allows uploading photos from gallery/library and displays photo preview with cover badge', async () => {
    ImagePicker.launchImageLibraryAsync.mockResolvedValueOnce({
      canceled: false,
      assets: [
        { uri: 'file:///data/parkingspace1.jpg', fileName: 'parkingspace1.jpg' },
      ],
    });

    const { getByTestId, getByText } = renderWithProviders(
      <CreateParkingScreen navigation={mockNavigation} route={{}} />
    );

    fireEvent.press(getByTestId('choose-from-library-btn'));

    await waitFor(() => {
      expect(ImagePicker.launchImageLibraryAsync).toHaveBeenCalled();
      expect(getByTestId('photo-preview-0')).toBeTruthy();
    });

    expect(getByText('Cover')).toBeTruthy();
    expect(getByText('1 photo')).toBeTruthy();
  });

  it('allows taking photos using camera and displays preview', async () => {
    ImagePicker.launchCameraAsync.mockResolvedValueOnce({
      canceled: false,
      assets: [
        { uri: 'file:///data/camera-shot.jpg', fileName: 'camera-shot.jpg' },
      ],
    });

    const { getByTestId } = renderWithProviders(
      <CreateParkingScreen navigation={mockNavigation} route={{}} />
    );

    fireEvent.press(getByTestId('take-photo-btn'));

    await waitFor(() => {
      expect(ImagePicker.launchCameraAsync).toHaveBeenCalled();
      expect(getByTestId('photo-preview-0')).toBeTruthy();
    });
  });

  it('allows removing an uploaded photo', async () => {
    const editData = {
      id: 'space-with-photo',
      title: 'Space with photo',
      address: '123 Main',
      city: 'NY',
      totalSpots: 5,
      hourlyRate: 10,
      imageUrls: ['https://example.com/existing-photo.jpg'],
    };

    const { getByTestId, queryByTestId } = renderWithProviders(
      <CreateParkingScreen
        navigation={mockNavigation}
        route={{ params: { editData } }}
      />
    );

    expect(getByTestId('photo-preview-0')).toBeTruthy();
    expect(getByTestId('remove-photo-btn-0')).toBeTruthy();

    fireEvent.press(getByTestId('remove-photo-btn-0'));

    expect(queryByTestId('photo-preview-0')).toBeNull();
    expect(getByTestId('empty-photo-upload-box')).toBeTruthy();
  });

  it('shows alert when media library permission is denied', async () => {
    ImagePicker.requestMediaLibraryPermissionsAsync.mockResolvedValueOnce({
      status: 'denied',
      granted: false,
    });

    const { getByTestId } = renderWithProviders(
      <CreateParkingScreen navigation={mockNavigation} route={{}} />
    );

    fireEvent.press(getByTestId('choose-from-library-btn'));

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith(
        'Permission Required',
        expect.stringContaining('Permission to access your photo library is required')
      );
    });
  });

  it('allows toggling secondary photo URL input and adding photo via URL', () => {
    const { getByTestId, queryByTestId } = renderWithProviders(
      <CreateParkingScreen navigation={mockNavigation} route={{}} />
    );

    expect(queryByTestId('photo-url-input')).toBeNull();

    fireEvent.press(getByTestId('toggle-url-input-btn'));
    expect(getByTestId('photo-url-input')).toBeTruthy();

    fireEvent.changeText(getByTestId('photo-url-input'), 'https://example.com/url-photo.jpg');
    fireEvent.press(getByTestId('add-photo-url-btn'));

    expect(getByTestId('photo-preview-0')).toBeTruthy();
  });

  it('allows tapping a validation issue in banner to jump to that step and dismisses banner', () => {
    const { getByText, getByTestId, queryByTestId } = renderWithProviders(
      <CreateParkingScreen
        navigation={mockNavigation}
        route={{ params: { initialViewMode: 'steps', initialStep: 4 } }}
      />
    );

    // Press submit on Step 4 to trigger validations
    fireEvent.press(getByTestId('submit-parking-button'));

    // Validation banner should appear
    expect(getByTestId('validation-error-banner')).toBeTruthy();
    expect(getByTestId('validation-error-item-0')).toBeTruthy();

    // Tapping the first validation issue jumps back to Step 1
    fireEvent.press(getByTestId('validation-error-item-0'));
    expect(getByText(/Step 1 of 4 • Basics/)).toBeTruthy();

    // Dismissing the banner removes it from view
    fireEvent.press(getByTestId('dismiss-validation-banner-btn'));
    expect(queryByTestId('validation-error-banner')).toBeNull();
  });

  it('enforces residential driveway listing spot limits (max 10 spots)', () => {
    const { getByText, getByPlaceholderText, getByTestId } = renderWithProviders(
      <CreateParkingScreen navigation={mockNavigation} route={{}} />
    );

    // Select Residential Driveway
    fireEvent.press(getByText('Residential Driveway'));
    fireEvent.changeText(getByPlaceholderText('Number of spots'), '15');

    // Attempt submit
    fireEvent.press(getByText('Create Space'));

    expect(Alert.alert).toHaveBeenCalledWith(
      'Required Fields',
      expect.stringContaining('Residential driveway listings support a maximum of 10 spots')
    );
    expect(getByTestId('validation-error-banner')).toBeTruthy();
  });

  it('parses server validation errors and displays them in the banner and step indicators', async () => {
    apiClient.post.mockRejectedValueOnce({
      response: {
        status: 400,
        data: {
          message: 'Validation failed',
          errors: {
            Title: ['Title must not exceed 100 characters.'],
            Address: ['Address is invalid.'],
          },
        },
      },
    });

    const { getByPlaceholderText, getByText, getAllByText, getByTestId, getAllByPlaceholderText } = renderWithProviders(
      <CreateParkingScreen navigation={mockNavigation} route={{}} />
    );

    // Fill all client-mandatory fields
    fireEvent.changeText(getByPlaceholderText('e.g. Downtown Parking Garage'), 'Valid Title');
    fireEvent.changeText(getByPlaceholderText('Describe your parking space, clearance height, gate access rules, etc.'), 'Some description');
    fireEvent.changeText(getByPlaceholderText('Number of spots'), '5');
    fireEvent.changeText(getByPlaceholderText('Street address'), '123 Main St');
    fireEvent.changeText(getByPlaceholderText('City'), 'Mumbai');
    fireEvent.changeText(getByPlaceholderText('State'), 'MH');
    fireEvent.changeText(getByPlaceholderText('Zip code'), '400001');

    const zeroInputs = getAllByPlaceholderText('0.00');
    fireEvent.changeText(zeroInputs[0], '20');

    fireEvent.press(getByText('Create Space'));

    await waitFor(() => {
      expect(apiClient.post).toHaveBeenCalled();
      expect(Alert.alert).toHaveBeenCalledWith(
        'Error',
        expect.stringContaining('Validation failed')
      );
    });

    // Server errors should be mapped to both the validation banner and the inline field input
    expect(getByTestId('validation-error-banner')).toBeTruthy();
    const titleErrors = getAllByText(/Title: Title must not exceed 100 characters./);
    expect(titleErrors.length).toBeGreaterThanOrEqual(1);
  });
});

