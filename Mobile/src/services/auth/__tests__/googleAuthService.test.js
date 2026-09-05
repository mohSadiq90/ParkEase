import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import googleAuthService from '../googleAuthService';
import environment from '../../../config/environment';

describe('googleAuthService', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('configures GoogleSignin with backend audience webClientId', () => {
        googleAuthService.configure();

        expect(GoogleSignin.configure).toHaveBeenCalledWith(
            expect.objectContaining({
                webClientId: '202763663198-vfa9arg479q2chtvg8l0i7bb459hk1vc.apps.googleusercontent.com',
                offlineAccess: false,
                scopes: ['profile', 'email'],
            })
        );
    });

    it('calls signIn and extracts idToken', async () => {
        GoogleSignin.signIn.mockResolvedValueOnce({
            data: {
                idToken: 'real-google-jwt-idtoken-sample',
                user: { email: 'test@gmail.com', name: 'John Doe' },
            },
        });

        const result = await googleAuthService.signIn();

        expect(result.cancelled).toBe(false);
        expect(result.idToken).toBe('real-google-jwt-idtoken-sample');
        expect(result.user.email).toBe('test@gmail.com');
    });

    it('returns cancelled: true when user dismisses Google prompt', async () => {
        const cancelError = new Error('Sign in cancelled');
        cancelError.code = statusCodes.SIGN_IN_CANCELLED;
        GoogleSignin.signIn.mockRejectedValueOnce(cancelError);

        const result = await googleAuthService.signIn();

        expect(result.cancelled).toBe(true);
    });

    it('throws play_services_missing error when Google Play Services is unavailable', async () => {
        const playError = new Error('Play services missing');
        playError.code = statusCodes.PLAY_SERVICES_NOT_AVAILABLE;
        GoogleSignin.signIn.mockRejectedValueOnce(playError);

        await expect(googleAuthService.signIn()).rejects.toThrow(
            'Google Play Services is not available or outdated on this device.'
        );
    });

    it('handles DEVELOPER_ERROR code with clear error message', async () => {
        const devError = new Error('DEVELOPER_ERROR: Follow troubleshooting instructions');
        devError.code = '10';
        GoogleSignin.signIn.mockRejectedValueOnce(devError);

        await expect(googleAuthService.signIn()).rejects.toThrow(
            'Google Sign-In configuration error (DEVELOPER_ERROR)'
        );
    });

    it('calls signOut and isSignedIn', async () => {
        await googleAuthService.signOut();
        expect(GoogleSignin.signOut).toHaveBeenCalled();

        const signedIn = await googleAuthService.isSignedIn();
        expect(signedIn).toBe(true);
    });
});
