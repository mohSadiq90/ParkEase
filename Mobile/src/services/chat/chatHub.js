/**
 * SignalR Chat Hub Client
 * Handles real-time connections, sending/receiving messages, and badge updates.
 */

import * as signalR from '@microsoft/signalr';
import * as SecureStore from 'expo-secure-store';
import environment from '../../config/environment';
import { receiveMessage } from '../../store/slices/chatSlice';
import store from '../../store'; // assuming standard Redux setup

const TAG = 'ChatHub';

class ChatHub {
    constructor() {
        this.connection = null;
        this.isConnected = false;
        this.activeConversationId = null;
    }

    async connect() {
        if (this.connection) return;

        try {
            const token = await SecureStore.getItemAsync('userToken');
            if (!token) {
                console.warn(TAG, 'No token found, skipping chat hub connection.');
                return;
            }

            this.connection = new signalR.HubConnectionBuilder()
                .withUrl(`${environment.hubsUrl}/chat`, {
                    accessTokenFactory: () => token,
                    transport: signalR.HttpTransportType.WebSockets,
                })
                .withAutomaticReconnect([0, 2000, 10000, 30000]) // Custom reconnect intervals
                .build();

            // Setup event listeners
            this.connection.on('ReceiveMessage', (message) => {
                store.dispatch(receiveMessage(message));
            });

            this.connection.onreconnecting((error) => {
                console.warn(TAG, 'Reconnecting to chat hub...', error);
                this.isConnected = false;
            });

            this.connection.onreconnected((connectionId) => {
                console.log(TAG, 'Reconnected to chat hub. Connection ID:', connectionId);
                this.isConnected = true;
                // Re-join conversation if one was active
                if (this.activeConversationId) {
                    this.joinConversation(this.activeConversationId);
                }
            });

            this.connection.onclose((error) => {
                console.warn(TAG, 'Chat hub connection closed.', error);
                this.isConnected = false;
            });

            await this.connection.start();
            this.isConnected = true;
            console.log(TAG, 'Connected to chat hub.');

        } catch (error) {
            console.error(TAG, 'Failed to connect to chat hub', error);
        }
    }

    async disconnect() {
        if (this.connection) {
            try {
                await this.connection.stop();
            } catch (error) {
                console.error(TAG, 'Failed to disconnect from chat hub', error);
            }
            this.connection = null;
            this.isConnected = false;
            this.activeConversationId = null;
        }
    }

    async joinConversation(conversationId) {
        this.activeConversationId = conversationId;
        if (this.isConnected && this.connection) {
            try {
                await this.connection.invoke('JoinConversation', conversationId);
            } catch (error) {
                console.error(TAG, 'Failed to join conversation', error);
            }
        }
    }

    async leaveConversation(conversationId) {
        if (this.activeConversationId === conversationId) {
            this.activeConversationId = null;
        }
        if (this.isConnected && this.connection) {
            try {
                await this.connection.invoke('LeaveConversation', conversationId);
            } catch (error) {
                console.error(TAG, 'Failed to leave conversation', error);
            }
        }
    }
}

export default new ChatHub();
