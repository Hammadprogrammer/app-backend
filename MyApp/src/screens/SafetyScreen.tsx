import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert as RNAlert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { isAxiosError } from 'axios';
import client from '../api/client';
import {
  AlarmSchedule,
  ApiResponse,
  Checkin,
  SafetyScore,
  StreakData,
  Trip,
} from '../types';

function errMsg(err: unknown, fallback: string): string {
  return isAxiosError(err)
    ? (err.response?.data as { message?: string })?.message ?? err.message
    : fallback;
}

const pad = (n: number) => String(n).padStart(2, '0');

export default function SafetyScreen() {
  const [score, setScore] = useState<SafetyScore | null>(null);
  const [alarms, setAlarms] = useState<AlarmSchedule[]>([]);
  const [checkins, setCheckins] = useState<Checkin[]>([]);
  const [streak, setStreak] = useState<StreakData | null>(null);
  const [activeTrip, setActiveTrip] = useState<Trip | null>(null);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [dest, setDest] = useState('');
  const [mins, setMins] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [now, setNow] = useState(Date.now());

  const load = useCallback(async () => {
    try {
      const [s, a, c, st, at, tr] = await Promise.all([
        client.get<ApiResponse<SafetyScore>>('/checkins/score'),
        client.get<ApiResponse<{ alarms: AlarmSchedule[] }>>('/checkins/alarms'),
        client.get<ApiResponse<{ checkins: Checkin[] }>>('/checkins'),
        client.get<ApiResponse<StreakData>>('/streak'),
        client.get<ApiResponse<{ trip: Trip | null }>>('/trips/active'),
        client.get<ApiResponse<{ trips: Trip[] }>>('/trips'),
      ]);
      setScore(s.data.data ?? null);
      setAlarms(a.data.data?.alarms ?? []);
      setCheckins(c.data.data?.checkins ?? []);
      setStreak(st.data.data ?? null);
      setActiveTrip(at.data.data?.trip ?? null);
      setTrips(tr.data.data?.trips ?? []);
    } catch (err) {
      RNAlert.alert('Error', errMsg(err, 'Failed to load safety data'));
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!activeTrip) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [activeTrip]);

  useEffect(() => {
    if (!activeTrip || activeTrip.overdueNotified) return;
    const due = new Date(activeTrip.startedAt).getTime() + activeTrip.estimatedMinutes * 60000;
    if (now < due) return;
    setActiveTrip({ ...activeTrip, overdueNotified: true });
    client
      .post<ApiResponse<{ notified: number }>>(`/trips/${activeTrip.id}/overdue`, {})
      .then((r) =>
        RNAlert.alert('⏰ Trip Overdue', `${r.data.data?.notified ?? 0} contact(s) have been notified.`),
      )
      .catch(() => undefined);
  }, [now, activeTrip]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const doCheckin = (type: string, label: string, status: 'safe' | 'not_safe') => {
    const run = async () => {
      try {
        const r = await client.post<ApiResponse<{ alertedContacts: number }>>('/checkins', {
          type,
          label,
          status,
        });
        if (status === 'not_safe') {
          RNAlert.alert('⚠️ Contacts Alerted', `${r.data.data?.alertedContacts ?? 0} contact(s) notified.`);
        }
        await load();
      } catch (err) {
        RNAlert.alert('Error', errMsg(err, 'Check-in failed'));
      }
    };
    if (status === 'not_safe') {
      RNAlert.alert('Not Safe?', 'This will notify your emergency contacts. Continue?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Notify', style: 'destructive', onPress: run },
      ]);
    } else {
      run();
    }
  };

  const toggleAlarm = async (a: AlarmSchedule) => {
    try {
      await client.put(`/checkins/alarms/${a.id}`, { enabled: !a.enabled });
      await load();
    } catch (err) {
      RNAlert.alert('Error', errMsg(err, 'Failed to update alarm'));
    }
  };

  const startTrip = async () => {
    const m = Number(mins);
    if (!dest.trim() || !m) {
      RNAlert.alert('Missing info', 'Destination and time (minutes) are required.');
      return;
    }
    try {
      await client.post('/trips', { destination: dest.trim(), estimatedMinutes: m });
      setDest('');
      setMins('');
      await load();
    } catch (err) {
      RNAlert.alert('Error', errMsg(err, 'Failed to start trip'));
    }
  };

  const endTrip = async () => {
    if (!activeTrip) return;
    try {
      await client.post(`/trips/${activeTrip.id}/end`);
      RNAlert.alert('✅ Arrived', 'Arrival confirmed. Stay safe!');
      await load();
    } catch (err) {
      RNAlert.alert('Error', errMsg(err, 'Failed to end trip'));
    }
  };

  const doneTypes = new Map(checkins.map((c) => [c.type, c.status]));
  const scoreColor =
    (score?.score ?? 0) >= 80 ? '#34D399' : (score?.score ?? 0) >= 60 ? '#FBBF24' : '#EF4444';

  let tripCountdown = '';
  if (activeTrip) {
    const due = new Date(activeTrip.startedAt).getTime() + activeTrip.estimatedMinutes * 60000;
    const left = Math.round((due - now) / 1000);
    tripCountdown =
      left > 0
        ? `⏱ ${Math.floor(left / 60)}:${pad(left % 60)} remaining`
        : '⏰ OVERDUE — contacts notified';
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* Score */}
      <Text style={styles.sectionTitle}>🛡️ Safety Score</Text>
      <View style={styles.card}>
        <View style={styles.scoreRow}>
          <Text style={[styles.scoreNum, { color: scoreColor }]}>{score?.score ?? '–'}</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.scoreLabel}>{score?.label ?? ''}</Text>
            <Text style={styles.muted}>out of 100</Text>
          </View>
        </View>
        {score?.factors.map((f) => (
          <View key={f.label} style={styles.factor}>
            <Text style={styles.factorIcon}>{f.completed ? '✅' : '○'}</Text>
            <Text style={styles.factorLabel}>{f.label}</Text>
            <View style={styles.bar}>
              <View style={[styles.barFill, { width: `${Math.round((f.points / f.maxPoints) * 100)}%` }]} />
            </View>
            <Text style={styles.pts}>
              {f.points}/{f.maxPoints}
            </Text>
          </View>
        ))}
      </View>

      {/* Check-ins */}
      <Text style={styles.sectionTitle}>✅ Daily Check-ins</Text>
      <View style={styles.card}>
        {alarms.map((a) => {
          const type = a.label.toLowerCase();
          const status = doneTypes.get(type);
          return (
            <View key={a.id} style={styles.alarmRow}>
              <Switch
                value={a.enabled}
                onValueChange={() => toggleAlarm(a)}
                trackColor={{ true: '#059669', false: '#334155' }}
                thumbColor="#fff"
              />
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={[styles.alarmLabel, !a.enabled && { opacity: 0.5 }]}>{a.label}</Text>
                <Text style={styles.muted}>
                  {pad(a.hour)}:{pad(a.minute)}
                </Text>
              </View>
              {status ? (
                <Text style={[styles.done, status === 'not_safe' && { color: '#FCA5A5' }]}>
                  {status === 'safe' ? '✓ SAFE' : '⚠ NOT SAFE'}
                </Text>
              ) : (
                <Pressable style={styles.smallBtn} onPress={() => doCheckin(type, a.label, 'safe')}>
                  <Text style={styles.smallBtnText}>CHECK IN</Text>
                </Pressable>
              )}
            </View>
          );
        })}
      </View>
      <View style={styles.btnRow}>
        <Pressable style={[styles.btn, styles.btnGreen]} onPress={() => doCheckin('manual', 'Manual', 'safe')}>
          <Text style={styles.btnText}>✅ I'M SAFE</Text>
        </Pressable>
        <Pressable style={[styles.btn, styles.btnRed]} onPress={() => doCheckin('manual', 'Manual', 'not_safe')}>
          <Text style={styles.btnText}>⚠️ NOT SAFE</Text>
        </Pressable>
      </View>

      {/* Streak */}
      <Text style={styles.sectionTitle}>🔥 Streak</Text>
      <View style={styles.card}>
        <View style={styles.scoreRow}>
          <Text style={styles.streakNum}>{streak?.currentStreak ?? 0}</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.scoreLabel}>day streak</Text>
            <Text style={styles.muted}>Best: {streak?.bestStreak ?? 0}</Text>
            {streak?.nextMilestone ? (
              <Text style={styles.muted}>
                {streak.nextMilestone - streak.currentStreak} days to {streak.nextMilestone}-day badge
              </Text>
            ) : null}
          </View>
        </View>
        <View style={styles.cal}>
          {streak?.calendarHistory.map((d) => (
            <View
              key={d.date}
              style={[
                styles.calCell,
                d.status === 'full' && styles.calFull,
                d.status === 'today' && styles.calToday,
              ]}
            />
          ))}
        </View>
        <View style={styles.msRow}>
          {streak?.milestones.map((m) => (
            <View key={m.milestone} style={[styles.ms, m.unlocked && styles.msOn]}>
              <Text style={[styles.msText, m.unlocked && { color: '#FBBF24' }]}>
                {m.unlocked ? '🏅' : '🔒'} {m.milestone}d
              </Text>
            </View>
          ))}
        </View>
      </View>

      {/* Trip */}
      <Text style={styles.sectionTitle}>🧭 Trip Mode</Text>
      <View style={styles.card}>
        {activeTrip ? (
          <>
            <Text style={styles.alarmLabel}>→ {activeTrip.destination}</Text>
            <Text style={[styles.muted, { marginTop: 4 }]}>{tripCountdown}</Text>
            <Pressable style={[styles.btn, styles.btnGreen, { marginTop: 12 }]} onPress={endTrip}>
              <Text style={styles.btnText}>✅ I'VE ARRIVED</Text>
            </Pressable>
          </>
        ) : (
          <>
            <Text style={styles.muted}>
              Set a destination and ETA. If you don't confirm arrival in time, your contacts are alerted.
            </Text>
            <TextInput
              style={styles.input}
              placeholder="Destination (e.g. Home)"
              placeholderTextColor="#64748B"
              value={dest}
              onChangeText={setDest}
            />
            <TextInput
              style={styles.input}
              placeholder="Expected minutes (e.g. 30)"
              placeholderTextColor="#64748B"
              keyboardType="number-pad"
              value={mins}
              onChangeText={setMins}
            />
            <Pressable style={[styles.btn, styles.btnAmber]} onPress={startTrip}>
              <Text style={styles.btnText}>START TRIP</Text>
            </Pressable>
          </>
        )}
      </View>
      {trips
        .filter((t) => t.status !== 'active')
        .slice(0, 5)
        .map((t) => (
          <View key={t.id} style={[styles.card, styles.tripRow]}>
            <Text style={{ fontSize: 18 }}>{t.status === 'arrived' ? '✅' : '⏰'}</Text>
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={styles.alarmLabel}>{t.destination}</Text>
              <Text style={styles.muted}>
                {new Date(t.startedAt).toLocaleString()} · {t.estimatedMinutes} min
              </Text>
            </View>
            <Text style={[styles.done, t.status !== 'arrived' && { color: '#FCA5A5' }]}>
              {t.status.toUpperCase()}
            </Text>
          </View>
        ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0b1326' },
  content: { padding: 16, paddingBottom: 32 },
  sectionTitle: { color: '#FFFFFF', fontSize: 15, fontWeight: '800', marginTop: 14, marginBottom: 8 },
  card: {
    backgroundColor: '#1E293B',
    borderRadius: 18,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(51,65,85,.5)',
  },
  scoreRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  scoreNum: { fontSize: 44, fontWeight: '900' },
  streakNum: { fontSize: 44, fontWeight: '900', color: '#FBBF24' },
  scoreLabel: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  muted: { color: '#94A3B8', fontSize: 12, lineHeight: 17 },
  factor: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8, borderTopWidth: 1, borderTopColor: 'rgba(51,65,85,.5)' },
  factorIcon: { width: 18, color: '#34D399' },
  factorLabel: { color: '#E2E8F0', fontSize: 12, flex: 1.4 },
  bar: { flex: 1, height: 6, backgroundColor: '#0F172A', borderRadius: 99, overflow: 'hidden' },
  barFill: { height: '100%', backgroundColor: '#34D399', borderRadius: 99 },
  pts: { color: '#94A3B8', fontSize: 11, fontWeight: '700', minWidth: 40, textAlign: 'right' },
  alarmRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
  alarmLabel: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  done: { color: '#34D399', fontSize: 11, fontWeight: '800' },
  smallBtn: { backgroundColor: '#059669', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 7 },
  smallBtnText: { color: '#fff', fontSize: 11, fontWeight: '800' },
  btnRow: { flexDirection: 'row', gap: 8, marginBottom: 4 },
  btn: { flex: 1, borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  btnGreen: { backgroundColor: '#059669' },
  btnRed: { backgroundColor: '#DC2626' },
  btnAmber: { backgroundColor: '#D97706' },
  btnText: { color: '#fff', fontWeight: '800', fontSize: 13 },
  cal: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 12 },
  calCell: { width: '8.6%', aspectRatio: 1, borderRadius: 5, backgroundColor: '#0F172A', borderWidth: 1, borderColor: 'rgba(51,65,85,.5)' },
  calFull: { backgroundColor: '#059669', borderColor: '#059669' },
  calToday: { borderColor: '#EF4444' },
  msRow: { flexDirection: 'row', gap: 6, marginTop: 12 },
  ms: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: 10, backgroundColor: '#0F172A', borderWidth: 1, borderColor: 'rgba(51,65,85,.5)' },
  msOn: { backgroundColor: 'rgba(217,119,6,.15)', borderColor: 'rgba(217,119,6,.5)' },
  msText: { color: '#64748B', fontSize: 11, fontWeight: '700' },
  input: {
    backgroundColor: '#0F172A',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#FFFFFF',
    fontSize: 14,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#334155',
  },
  tripRow: { flexDirection: 'row', alignItems: 'center', padding: 12 },
});
