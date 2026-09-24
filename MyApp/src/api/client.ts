import axios from 'axios';
import { Platform } from 'react-native';

/**
 * API base URL:
 * - Android emulator maps host machine's localhost to 10.0.2.2
 * - iOS simulator can reach localhost directly
 * - On a physical device, replace with your machine's LAN IP (e.g. http://192.168.1.x:4000)
 */
const BASE_URL =
  Platform.OS === 'android' ? 'http://10.0.2.2:4000' : 'http://localhost:4000';

const client = axios.create({
  baseURL: `${BASE_URL}/api`,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

export function setAuthToken(token: string | null): void {
  if (token) {
    client.defaults.headers.common.Authorization = `Bearer ${token}`;
  } else {
    delete client.defaults.headers.common.Authorization;
  }
}

export default client;
