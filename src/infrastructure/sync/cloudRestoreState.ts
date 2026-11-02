import AsyncStorage from "@react-native-async-storage/async-storage";

// Describes the owner of the current local database, not just a past login.
const LOCAL_CLOUD_OWNER_KEY = "financy_local_cloud_owner_v1";

export async function hasRestoredCloudData(userId: string): Promise<boolean> {
  return await AsyncStorage.getItem(LOCAL_CLOUD_OWNER_KEY) === userId;
}

export async function markCloudDataRestored(userId: string): Promise<void> {
  await AsyncStorage.setItem(LOCAL_CLOUD_OWNER_KEY, userId);
}

export async function invalidateCloudRestore(): Promise<void> {
  await AsyncStorage.removeItem(LOCAL_CLOUD_OWNER_KEY);
}
