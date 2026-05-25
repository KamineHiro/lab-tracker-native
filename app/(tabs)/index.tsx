import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import Svg, { Circle, Path } from 'react-native-svg';
import { colors, spacing, radius, font } from '../../src/theme';
import {
  getTodaySessions,
  getActiveSession,
  updateMemo,
  type Session,
} from '../../src/db/database';
import { isTrackingActive } from '../../src/services/locationService';

function formatDuration(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  if (h > 0) return `${h}時間 ${m}分`;
  if (m > 0) return `${m}分`;
  return '0分';
}

function formatTime(ms: number): string {
  const d = new Date(ms);
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
}

function GpsStatusIcon({ active }: { active: boolean }) {
  const c = active ? colors.success : colors.inactive;
  return (
    <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={12} r={3} fill={c} />
      <Circle cx={12} cy={12} r={7} stroke={c} strokeWidth={1.5} />
      <Path
        d="M12 2V5M12 19V22M2 12H5M19 12H22"
        stroke={c}
        strokeWidth={1.5}
        strokeLinecap="round"
      />
    </Svg>
  );
}

export default function HomeScreen() {
  const [active, setActive] = useState<Session | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [tracking, setTracking] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [memo, setMemo] = useState('');

  const refresh = useCallback(async () => {
    const a = getActiveSession();
    const s = getTodaySessions();
    const t = await isTrackingActive();
    setActive(a);
    setSessions(s);
    setTracking(t);
    if (a) setMemo(a.memo ?? '');
  }, []);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(Date.now());
      refresh();
    }, 10000);
    return () => clearInterval(timer);
  }, [refresh]);

  const completedMs = sessions
    .filter((s) => s.check_out !== null && s.id !== active?.id)
    .reduce((sum, s) => sum + (s.check_out! - s.check_in), 0);

  const currentMs = active ? now - active.check_in : 0;
  const totalMs = completedMs + currentMs;
  const inLab = active !== null;

  const handleMemoBlur = () => {
    if (active) updateMemo(active.id, memo);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={false} onRefresh={refresh} />}
      >
        <View style={styles.header}>
          <Text style={styles.title}>LabTracker</Text>
          <View style={styles.gpsRow}>
            <GpsStatusIcon active={tracking} />
            <Text style={[styles.gpsLabel, { color: tracking ? colors.success : colors.inactive }]}>
              {tracking ? 'GPS記録中' : 'GPS停止'}
            </Text>
          </View>
        </View>

        <View style={[styles.statusCard, inLab ? styles.cardInLab : styles.cardOutside]}>
          <View style={[styles.dot, { backgroundColor: inLab ? colors.success : colors.inactive }]} />
          <Text style={[styles.statusText, { color: inLab ? colors.success : colors.textSecondary }]}>
            {inLab ? '研究室にいます' : '研究室の外'}
          </Text>
          {inLab && (
            <Text style={styles.sinceText}>{formatTime(active.check_in)} から滞在中</Text>
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>今日の滞在時間</Text>
          <Text style={styles.totalTime}>{formatDuration(totalMs)}</Text>
          {inLab && (
            <Text style={styles.currentSession}>
              現在のセッション: {formatDuration(currentMs)}
            </Text>
          )}
        </View>

        {inLab && (
          <View style={styles.card}>
            <Text style={styles.label}>メモ</Text>
            <TextInput
              style={styles.memoInput}
              value={memo}
              onChangeText={setMemo}
              onBlur={handleMemoBlur}
              placeholder="今日の作業内容..."
              placeholderTextColor={colors.inactive}
              multiline
            />
          </View>
        )}

        {sessions.filter((s) => s.check_out !== null).length > 0 && (
          <View style={styles.card}>
            <Text style={styles.label}>今日のセッション</Text>
            {sessions
              .filter((s) => s.check_out !== null)
              .map((s) => (
                <View key={s.id} style={styles.sessionRow}>
                  <Text style={styles.sessionTime}>
                    {formatTime(s.check_in)} – {formatTime(s.check_out!)}
                  </Text>
                  <Text style={styles.sessionDuration}>
                    {formatDuration(s.check_out! - s.check_in)}
                  </Text>
                </View>
              ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { flex: 1 },
  content: { padding: spacing.md, gap: spacing.md },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing.sm,
  },
  title: { fontFamily: font.bold, fontSize: 22, color: colors.text },
  gpsRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  gpsLabel: { fontFamily: font.medium, fontSize: 12 },
  statusCard: {
    borderRadius: radius.lg,
    padding: spacing.lg,
    alignItems: 'center',
    gap: spacing.sm,
  },
  cardInLab: { backgroundColor: colors.successLight },
  cardOutside: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  dot: { width: 10, height: 10, borderRadius: radius.full },
  statusText: { fontFamily: font.bold, fontSize: 18 },
  sinceText: { fontFamily: font.regular, fontSize: 13, color: colors.textSecondary },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.sm,
  },
  label: {
    fontFamily: font.medium,
    fontSize: 12,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  totalTime: { fontFamily: font.bold, fontSize: 40, color: colors.text, lineHeight: 48 },
  currentSession: { fontFamily: font.regular, fontSize: 13, color: colors.primary },
  memoInput: {
    fontFamily: font.regular,
    fontSize: 15,
    color: colors.text,
    minHeight: 80,
    textAlignVertical: 'top',
    lineHeight: 22,
  },
  sessionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  sessionTime: { fontFamily: font.regular, fontSize: 14, color: colors.text },
  sessionDuration: { fontFamily: font.medium, fontSize: 14, color: colors.textSecondary },
});
