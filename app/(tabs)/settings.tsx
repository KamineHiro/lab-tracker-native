import { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Switch,
  Alert,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import MapView, { Region } from 'react-native-maps';
import Svg, { Path, Circle } from 'react-native-svg';
import { colors, spacing, radius, font } from '../../src/theme';
import { getSetting, setSetting } from '../../src/db/database';
import {
  getCurrentLocation,
  startBackgroundTracking,
  stopBackgroundTracking,
  isTrackingActive,
} from '../../src/services/locationService';

const RADIUS_OPTIONS = [50, 100, 200, 300, 500];
const GOAL_OPTIONS = [4, 6, 8, 10, 12];

const DEFAULT_REGION: Region = {
  latitude: 35.6895,
  longitude: 139.6917,
  latitudeDelta: 0.005,
  longitudeDelta: 0.005,
};

function PinIcon() {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 2C8.13 2 5 5.13 5 9C5 14.25 12 22 12 22C12 22 19 14.25 19 9C19 5.13 15.87 2 12 2Z"
        stroke={colors.primary}
        strokeWidth={1.75}
      />
      <Circle cx={12} cy={9} r={2.5} stroke={colors.primary} strokeWidth={1.75} />
    </Svg>
  );
}

export default function SettingsScreen() {
  const [labLat, setLabLat] = useState<string | null>(null);
  const [labLon, setLabLon] = useState<string | null>(null);
  const [labRadius, setLabRadius] = useState(100);
  const [goalHours, setGoalHours] = useState(8);
  const [tracking, setTracking] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [mapVisible, setMapVisible] = useState(false);
  const [mapRegion, setMapRegion] = useState<Region>(DEFAULT_REGION);
  const mapRef = useRef<MapView>(null);

  useFocusEffect(
    useCallback(() => {
      setLabLat(getSetting('lab_latitude'));
      setLabLon(getSetting('lab_longitude'));
      setLabRadius(parseInt(getSetting('lab_radius') ?? '100', 10));
      setGoalHours(parseInt(getSetting('goal_hours') ?? '8', 10));
      isTrackingActive().then(setTracking);
    }, [])
  );

  const handleRegisterCurrentLocation = async () => {
    setRegistering(true);
    try {
      const loc = await getCurrentLocation();
      if (!loc) {
        Alert.alert('エラー', 'GPS取得に失敗しました。位置情報の権限を確認してください。');
        return;
      }
      const lat = loc.coords.latitude.toString();
      const lon = loc.coords.longitude.toString();
      setSetting('lab_latitude', lat);
      setSetting('lab_longitude', lon);
      setLabLat(lat);
      setLabLon(lon);
      Alert.alert('登録完了', '研究室の位置を登録しました。');
    } finally {
      setRegistering(false);
    }
  };

  const handleOpenMap = async () => {
    const startRegion =
      labLat && labLon
        ? {
            latitude: parseFloat(labLat),
            longitude: parseFloat(labLon),
            latitudeDelta: 0.005,
            longitudeDelta: 0.005,
          }
        : DEFAULT_REGION;

    const loc = await getCurrentLocation();
    setMapRegion(
      loc
        ? {
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
            latitudeDelta: 0.005,
            longitudeDelta: 0.005,
          }
        : startRegion
    );
    setMapVisible(true);
  };

  const handleMapJumpToCurrent = async () => {
    const loc = await getCurrentLocation();
    if (!loc) return;
    const next: Region = {
      latitude: loc.coords.latitude,
      longitude: loc.coords.longitude,
      latitudeDelta: mapRegion.latitudeDelta,
      longitudeDelta: mapRegion.longitudeDelta,
    };
    mapRef.current?.animateToRegion(next, 500);
    setMapRegion(next);
  };

  const handleMapConfirm = () => {
    const lat = mapRegion.latitude.toString();
    const lon = mapRegion.longitude.toString();
    setSetting('lab_latitude', lat);
    setSetting('lab_longitude', lon);
    setLabLat(lat);
    setLabLon(lon);
    setMapVisible(false);
    Alert.alert('登録完了', '研究室の位置を登録しました。');
  };

  const handleRadiusChange = (r: number) => {
    setLabRadius(r);
    setSetting('lab_radius', r.toString());
  };

  const handleGoalChange = (h: number) => {
    setGoalHours(h);
    setSetting('goal_hours', h.toString());
  };

  const handleTrackingToggle = async (value: boolean) => {
    if (value) {
      const ok = await startBackgroundTracking();
      if (!ok) {
        Alert.alert(
          '権限エラー',
          'バックグラウンド位置情報の権限が必要です。\n設定アプリから「常に許可」を選択してください。'
        );
        return;
      }
    } else {
      await stopBackgroundTracking();
    }
    setTracking(value);
  };

  return (
    <>
      <SafeAreaView style={styles.safe}>
        <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
          <Text style={styles.title}>設定</Text>

          <View style={styles.card}>
            <View style={styles.row}>
              <View>
                <Text style={styles.rowTitle}>GPS追跡</Text>
                <Text style={styles.rowSub}>バックグラウンドで自動記録</Text>
              </View>
              <Switch
                value={tracking}
                onValueChange={handleTrackingToggle}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor={colors.surface}
              />
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.label}>研究室の位置</Text>
            {labLat && labLon ? (
              <View style={styles.locationRow}>
                <PinIcon />
                <View>
                  <Text style={styles.coordText}>
                    {parseFloat(labLat).toFixed(5)}, {parseFloat(labLon).toFixed(5)}
                  </Text>
                  <Text style={styles.coordSub}>登録済み</Text>
                </View>
              </View>
            ) : (
              <Text style={styles.noLocation}>未登録</Text>
            )}
            <TouchableOpacity style={styles.button} onPress={handleOpenMap}>
              <Text style={styles.buttonText}>
                {labLat ? '地図で変更' : '地図で登録'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.buttonOutline, registering && styles.buttonDisabled]}
              onPress={handleRegisterCurrentLocation}
              disabled={registering}
            >
              <Text style={styles.buttonOutlineText}>
                {registering ? '取得中...' : '現在地で登録'}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.card}>
            <Text style={styles.label}>検知半径</Text>
            <View style={styles.chipRow}>
              {RADIUS_OPTIONS.map((r) => (
                <TouchableOpacity
                  key={r}
                  style={[styles.chip, labRadius === r && styles.chipActive]}
                  onPress={() => handleRadiusChange(r)}
                >
                  <Text style={[styles.chipText, labRadius === r && styles.chipTextActive]}>
                    {r}m
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.label}>1日の目標時間</Text>
            <View style={styles.chipRow}>
              {GOAL_OPTIONS.map((h) => (
                <TouchableOpacity
                  key={h}
                  style={[styles.chip, goalHours === h && styles.chipActive]}
                  onPress={() => handleGoalChange(h)}
                >
                  <Text style={[styles.chipText, goalHours === h && styles.chipTextActive]}>
                    {h}h
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>

      {/* Map Picker Modal */}
      <Modal visible={mapVisible} animationType="slide" statusBarTranslucent>
        <SafeAreaView style={styles.mapSafe} edges={['top', 'bottom']}>
          <View style={styles.mapHeader}>
            <TouchableOpacity onPress={() => setMapVisible(false)} style={styles.mapHeaderBtn}>
              <Text style={styles.cancelText}>キャンセル</Text>
            </TouchableOpacity>
            <Text style={styles.mapTitle}>研究室の位置を選択</Text>
            <View style={styles.mapHeaderBtn} />
          </View>

          <View style={styles.mapContainer}>
            <MapView
              ref={mapRef}
              style={StyleSheet.absoluteFillObject}
              region={mapRegion}
              onRegionChangeComplete={setMapRegion}
              showsUserLocation
            />
            {/* 中央ピン */}
            <View style={styles.pinContainer} pointerEvents="none">
              <Svg width={32} height={40} viewBox="0 0 24 30" fill="none">
                <Path
                  d="M12 2C8.13 2 5 5.13 5 9C5 14.25 12 22 12 22C12 22 19 14.25 19 9C19 5.13 15.87 2 12 2Z"
                  fill={colors.primary}
                />
                <Circle cx={12} cy={9} r={3} fill="white" />
              </Svg>
            </View>
          </View>

          <View style={styles.mapFooter}>
            <Text style={styles.coordDisplay}>
              {mapRegion.latitude.toFixed(5)},  {mapRegion.longitude.toFixed(5)}
            </Text>
            <View style={styles.mapActions}>
              <TouchableOpacity style={styles.currentLocBtn} onPress={handleMapJumpToCurrent}>
                <Text style={styles.currentLocText}>現在地</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.confirmBtn} onPress={handleMapConfirm}>
                <Text style={styles.confirmText}>この場所を登録</Text>
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { flex: 1 },
  content: { padding: spacing.md, gap: spacing.md },
  title: { fontFamily: font.bold, fontSize: 22, color: colors.text, paddingTop: spacing.sm },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.md,
  },
  label: {
    fontFamily: font.medium,
    fontSize: 12,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rowTitle: { fontFamily: font.medium, fontSize: 16, color: colors.text },
  rowSub: { fontFamily: font.regular, fontSize: 13, color: colors.textSecondary, marginTop: 2 },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  coordText: { fontFamily: font.medium, fontSize: 14, color: colors.text },
  coordSub: { fontFamily: font.regular, fontSize: 12, color: colors.success, marginTop: 2 },
  noLocation: { fontFamily: font.regular, fontSize: 14, color: colors.inactive },
  button: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.sm + 4,
    alignItems: 'center',
  },
  buttonOutline: {
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.sm + 4,
    alignItems: 'center',
  },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { fontFamily: font.medium, fontSize: 15, color: '#FFFFFF' },
  buttonOutlineText: { fontFamily: font.medium, fontSize: 15, color: colors.primary },
  chipRow: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontFamily: font.medium, fontSize: 14, color: colors.textSecondary },
  chipTextActive: { color: '#FFFFFF' },

  // Map modal
  mapSafe: { flex: 1, backgroundColor: colors.surface },
  mapHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 4,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  mapHeaderBtn: { width: 72 },
  mapTitle: { fontFamily: font.bold, fontSize: 16, color: colors.text },
  cancelText: { fontFamily: font.medium, fontSize: 15, color: colors.primary },
  mapContainer: { flex: 1, position: 'relative' },
  pinContainer: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginLeft: -16,
    marginTop: -40,
  },
  mapFooter: {
    padding: spacing.md,
    gap: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
  coordDisplay: {
    fontFamily: font.regular,
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  mapActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  currentLocBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.sm + 4,
    alignItems: 'center',
  },
  currentLocText: { fontFamily: font.medium, fontSize: 15, color: colors.primary },
  confirmBtn: {
    flex: 2,
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.sm + 4,
    alignItems: 'center',
  },
  confirmText: { fontFamily: font.medium, fontSize: 15, color: '#FFFFFF' },
});
