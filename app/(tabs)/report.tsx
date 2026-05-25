import { useState, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import Svg, { Rect, Text as SvgText, G } from 'react-native-svg';
import { colors, spacing, radius, font } from '../../src/theme';
import { getSessionsByDateRange, type Session } from '../../src/db/database';

const DAY_LABELS = ['月', '火', '水', '木', '金', '土', '日'];

function getWeekDates(): string[] {
  const today = new Date();
  const dow = today.getDay();
  const mon = new Date(today);
  mon.setDate(today.getDate() - ((dow + 6) % 7));
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(mon);
    d.setDate(mon.getDate() + i);
    return d.toISOString().split('T')[0];
  });
}

function sessionMs(s: Session): number {
  return s.check_out ? s.check_out - s.check_in : 0;
}

function formatHours(ms: number): string {
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m`;
  return '0m';
}

function BarChart({ data }: { data: { label: string; ms: number }[] }) {
  const maxMs = Math.max(...data.map((d) => d.ms), 1);
  const chartH = 140;
  const barW = 32;
  const gap = 12;
  const totalW = data.length * (barW + gap) - gap;

  return (
    <Svg width={totalW} height={chartH + 36}>
      {data.map((item, i) => {
        const barH = item.ms > 0 ? Math.max((item.ms / maxMs) * chartH, 4) : 0;
        const x = i * (barW + gap);
        const y = chartH - barH;
        const h = Math.floor(item.ms / 3600000);

        return (
          <G key={i} transform={`translate(${x}, 0)`}>
            <Rect
              x={0}
              y={item.ms > 0 ? y : chartH}
              width={barW}
              height={item.ms > 0 ? barH : 2}
              rx={6}
              fill={item.ms > 0 ? colors.primary : colors.border}
            />
            <SvgText
              x={barW / 2}
              y={chartH + 20}
              textAnchor="middle"
              fontSize={12}
              fill={colors.textSecondary}
            >
              {item.label}
            </SvgText>
            {h > 0 && (
              <SvgText
                x={barW / 2}
                y={y - 6}
                textAnchor="middle"
                fontSize={10}
                fill={colors.primary}
              >
                {h}h
              </SvgText>
            )}
          </G>
        );
      })}
    </Svg>
  );
}

export default function ReportScreen() {
  const [weekData, setWeekData] = useState<{ label: string; ms: number }[]>(
    DAY_LABELS.map((label) => ({ label, ms: 0 }))
  );
  const [totalWeekMs, setTotalWeekMs] = useState(0);
  const [avgMs, setAvgMs] = useState(0);

  useFocusEffect(
    useCallback(() => {
      const dates = getWeekDates();
      const sessions = getSessionsByDateRange(dates[0], dates[6]);

      const byDate: Record<string, number> = {};
      for (const s of sessions) {
        byDate[s.date] = (byDate[s.date] ?? 0) + sessionMs(s);
      }

      const data = dates.map((date, i) => ({
        label: DAY_LABELS[i],
        ms: byDate[date] ?? 0,
      }));

      const total = data.reduce((sum, d) => sum + d.ms, 0);
      const activeDays = data.filter((d) => d.ms > 0).length;

      setWeekData(data);
      setTotalWeekMs(total);
      setAvgMs(activeDays > 0 ? Math.floor(total / activeDays) : 0);
    }, [])
  );

  const today = new Date().toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  });

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <Text style={styles.title}>レポート</Text>
        <Text style={styles.dateText}>{today}</Text>

        <View style={styles.card}>
          <Text style={styles.label}>今週の滞在時間</Text>
          <View style={styles.chartWrap}>
            <BarChart data={weekData} />
          </View>
        </View>

        <View style={styles.summaryRow}>
          <View style={[styles.card, styles.summaryCard]}>
            <Text style={styles.label}>今週の合計</Text>
            <Text style={styles.summaryValue}>{formatHours(totalWeekMs)}</Text>
          </View>
          <View style={[styles.card, styles.summaryCard]}>
            <Text style={styles.label}>1日の平均</Text>
            <Text style={styles.summaryValue}>{formatHours(avgMs)}</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { flex: 1 },
  content: { padding: spacing.md, gap: spacing.md },
  title: { fontFamily: font.bold, fontSize: 22, color: colors.text, paddingTop: spacing.sm },
  dateText: { fontFamily: font.regular, fontSize: 14, color: colors.textSecondary },
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
  chartWrap: { alignItems: 'center', paddingVertical: spacing.sm },
  summaryRow: { flexDirection: 'row', gap: spacing.md },
  summaryCard: { flex: 1 },
  summaryValue: { fontFamily: font.bold, fontSize: 24, color: colors.text },
});
