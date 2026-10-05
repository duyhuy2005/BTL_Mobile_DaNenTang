import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";

const TOKEN_KEY = "token";

/** Native JWTs are kept in Keychain/Keystore; web uses its existing local store. */
export const tokenStore = {
  async get(): Promise<string | null> {
    if (Platform.OS === "web") return AsyncStorage.getItem(TOKEN_KEY);
    return SecureStore.getItemAsync(TOKEN_KEY);
  },
  async set(value: string): Promise<void> {
    if (Platform.OS === "web") return AsyncStorage.setItem(TOKEN_KEY, value);
    await SecureStore.setItemAsync(TOKEN_KEY, value, { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY });
  },
  async remove(): Promise<void> {
    if (Platform.OS === "web") await AsyncStorage.removeItem(TOKEN_KEY);
    else await SecureStore.deleteItemAsync(TOKEN_KEY);
    await AsyncStorage.removeItem(TOKEN_KEY); // Remove any legacy AsyncStorage copy.
  },
};
