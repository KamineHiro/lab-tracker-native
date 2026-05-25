import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import {
  initDatabase,
  getActiveSession,
  startSession,
  endSession,
  getSetting,
} from '../db/database';

export const BACKGROUND_TASK = 'background-location-task';

function getLabCoords() {
  const lat = getSetting('lab_latitude');
  const lon = getSetting('lab_longitude');
  const radius = getSetting('lab_radius');
  if (!lat || !lon) return null;
  return {
    latitude: parseFloat(lat),
    longitude: parseFloat(lon),
    radius: radius ? parseInt(radius, 10) : 100,
  };
}

function calcDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Must be defined at module top level — required by expo-task-manager
TaskManager.defineTask(BACKGROUND_TASK, async ({ data, error }: TaskManager.TaskManagerTaskBody) => {
  if (error) return;
  const { locations } = data as { locations: Location.LocationObject[] };
  if (!locations?.length) return;

  // Ensure tables exist when background task fires before foreground app
  initDatabase();

  const lab = getLabCoords();
  if (!lab) return;

  const { latitude, longitude } = locations[0].coords;
  const distance = calcDistance(latitude, longitude, lab.latitude, lab.longitude);
  const nowInLab = distance <= lab.radius;
  const active = getActiveSession();

  if (nowInLab && !active) {
    startSession();
  } else if (!nowInLab && active) {
    endSession(active.id);
  }
});

export async function requestPermissions(): Promise<boolean> {
  try {
    const fg = await Location.requestForegroundPermissionsAsync();
    if (fg.status !== 'granted') return false;
    const bg = await Location.requestBackgroundPermissionsAsync();
    return bg.status === 'granted';
  } catch (e) {
    // Expo Go では background location が使用不可。ネイティブビルドで動作する。
    console.warn('Location permission error (Expo Go limitation):', e);
    return false;
  }
}

export async function startBackgroundTracking(): Promise<boolean> {
  try {
    const hasPerms = await requestPermissions();
    if (!hasPerms) return false;

    const running = await TaskManager.isTaskRegisteredAsync(BACKGROUND_TASK);
    if (running) return true;

    await Location.startLocationUpdatesAsync(BACKGROUND_TASK, {
      accuracy: Location.Accuracy.Balanced,
      timeInterval: 30000,
      distanceInterval: 20,
      showsBackgroundLocationIndicator: true,
      foregroundService: {
        notificationTitle: 'LabTracker',
        notificationBody: '研究室の滞在時間を記録中',
      },
    });

    return true;
  } catch (e) {
    console.warn('Background tracking unavailable (Expo Go limitation):', e);
    return false;
  }
}

export async function stopBackgroundTracking() {
  const running = await TaskManager.isTaskRegisteredAsync(BACKGROUND_TASK);
  if (running) {
    await Location.stopLocationUpdatesAsync(BACKGROUND_TASK);
  }
}

export async function isTrackingActive(): Promise<boolean> {
  return TaskManager.isTaskRegisteredAsync(BACKGROUND_TASK);
}

export async function getCurrentLocation(): Promise<Location.LocationObject | null> {
  try {
    return await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
  } catch {
    return null;
  }
}
