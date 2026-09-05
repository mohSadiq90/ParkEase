/**
 * File Upload Service
 * Handles parking media multipart & presigned uploads matching API_ENDPOINTS_MOBILE.md Section 18
 */

import apiClient from './apiClient';
import ENDPOINTS from './endpoints';
import logger from '../../utils/logger';

const TAG = 'FileUploadService';

class FileUploadService {
    /**
     * Upload files via standard multipart form data
     * Form field name must be 'files'
     * @param {string} parkingSpaceId
     * @param {Array<{ uri: string, name: string, type: string }>} files
     */
    uploadMultipart = async (parkingSpaceId, files) => {
        try {
            const formData = new FormData();
            files.forEach((file) => {
                formData.append('files', {
                    uri: file.uri,
                    name: file.name || 'image.jpg',
                    type: file.type || 'image/jpeg',
                });
            });

            const response = await apiClient.post(
                ENDPOINTS.FILES.UPLOAD(parkingSpaceId),
                formData,
                {
                    headers: {
                        'Content-Type': 'multipart/form-data',
                    },
                }
            );
            return response.data;
        } catch (error) {
            logger.error(TAG, 'Multipart upload failed', error);
            throw error;
        }
    };

    /**
     * Presigned upload flow - Step 1: Sign upload URL
     */
    signUpload = async (parkingSpaceId, { fileName, contentType }) => {
        try {
            const response = await apiClient.post(
                ENDPOINTS.FILES.SIGN_UPLOAD(parkingSpaceId),
                { fileName, contentType }
            );
            return response.data?.data || response.data;
        } catch (error) {
            logger.error(TAG, 'Sign upload failed', error);
            throw error;
        }
    };

    /**
     * Presigned upload flow - Step 2: Upload binary blob directly to presigned URL
     */
    uploadToPresignedUrl = async (uploadUrl, blob, contentType) => {
        const response = await fetch(uploadUrl, {
            method: 'PUT',
            headers: {
                'Content-Type': contentType,
            },
            body: blob,
        });
        if (!response.ok) {
            throw new Error(`Direct upload failed with status ${response.status}`);
        }
        return response;
    };

    /**
     * Presigned upload flow - Step 3: Confirm uploaded file URLs
     */
    confirmUpload = async (parkingSpaceId, fileUrls) => {
        try {
            const response = await apiClient.post(
                ENDPOINTS.FILES.CONFIRM_UPLOAD(parkingSpaceId),
                { fileUrls }
            );
            return response.data;
        } catch (error) {
            logger.error(TAG, 'Confirm upload failed', error);
            throw error;
        }
    };

    /**
     * List media files for a parking space
     */
    getParkingFiles = async (parkingSpaceId) => {
        try {
            const response = await apiClient.get(ENDPOINTS.FILES.GET(parkingSpaceId));
            return response.data?.data || response.data;
        } catch (error) {
            logger.error(TAG, 'Fetch parking files failed', error);
            throw error;
        }
    };

    /**
     * Delete a parking media file
     */
    deleteParkingFile = async (parkingSpaceId, fileName) => {
        try {
            const response = await apiClient.delete(ENDPOINTS.FILES.DELETE(parkingSpaceId, fileName));
            return response.data;
        } catch (error) {
            logger.error(TAG, `Delete parking file ${fileName} failed`, error);
            throw error;
        }
    };
}

export const fileUploadService = new FileUploadService();
export default fileUploadService;
