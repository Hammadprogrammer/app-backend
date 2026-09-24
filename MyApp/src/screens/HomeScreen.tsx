import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert as RNAlert,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { isAxiosError } from 'axios';
import client from '../api/client';
import SosButton from '../components/SosButton';
import { Alert, AlertHistoryData, ApiResponse, User } from '../types';

interface HomeScreenProps {
  user: User;
}

const STATUS_COLORS: Record<Alert['status'], string> = {
  PENDING: '#F59E0B',
  SENT: '#22C55E',
  PARTIAL: '#F97316',
  FAILED: '#EF4444',
  CANCELLED: '#94A3B8',
  RESOLVED: '#22C55E',
};

const SOURCE_LABEL: Record<string, string> = {
  sos: 'Manual SOS',
  shake: 'Shake-to-Alert',
  checkin: 'Check-in: Not Safe',
  trip: 'Trip Overdue',
  battery: 'Low Battery',
};

const ACTIVE = new Set<Alert['status']>(['PENDING', 'SENT', 'PARTIAL']);

function errMsg(err: unknown, fallback: string): string {
  return isAxiosError(err)
    ? (err.response?.data as { message?: string })?.message ?? err.message
    : fallback;
}

export default function HomeScreen({ user }: HomeScreenProps) {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [activeAlert, setActiveAlert] = useState<Alert | null>(null);
  const [sending, setSending] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const fetchHistory = useCallback(async () => {
    try {
      const [h, a] = await Promise.all([
        client.get<ApiResponse<AlertHistoryData>>('/alerts/history'),
        client.get<ApiResponse<{ alert: Alert | null }>>('/alerts/active'),
      ]);
      setAlerts(h.data.data?.alerts ?? []);
      const act = a.data.data?.alert ?? null;
      setActiveAlert(act && ACTIVE.has(act.status) ? act : null);
    } catch {
      // silent — history is non-critical
    }
  }, []);

  const resolveAlert = (kind: 'safe' | 'cancel') => {
    if (!activeAlert) return;
    const run = async () => {
      try {
        await client.post(`/alerts/${activeAlert.id}/${kind}`);
        RNAlert.alert(
          kind === 'safe' ? '✅ Marked Safe' : 'Alert Cancelled',
          'Your contacts have been informed.',
        );
        setActiveAlert(null);
        await fetchHistory();
      } catch (err) {
        RNAlert.alert('Error', errMsg(err, 'Failed to update alert'));
      }
    };
    if (kind === 'cancel') {
      RNAlert.alert('False alarm?', 'Cancel this alert and notify contacts it was a false alarm?', [
        { text: 'Keep active', style: 'cancel' },
        { text: 'Cancel alert', style: 'destructive', onPress: run },
      ]);
    } else {
      run();
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchHistory();
    setRefreshing(false);
  }, [fetchHistory]);

  const triggerSos = () => {
    RNAlert.alert(
      '🚨 Confirm SOS',
      'This will immediately alert your emergency contacts via SMS and WhatsApp. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'SEND SOS', style: 'destructive', onPress: sendSos },
      ],
    );
  };

  const sendSos = async () => {
    setSending(true);
    try {
      const res = await client.post<ApiResponse<{ alert: Alert }>>('/alerts/trigger', { source: 'sos' });
      RNAlert.alert('✅ Alert Sent', 'Your emergency contacts have been notified.');
      const created = res.data.data?.alert;
      if (created) setActiveAlert(created);
      await fetchHistory();
    } catch (err) {
      RNAlert.alert('❌ SOS Failed', errMsg(err, 'Failed to send SOS. Please try again.'));
    } finally {
      setSending(false);
    }
  };

  const renderAlert = ({ item }: { item: Alert }) => (
    <View style={styles.alertCard}>
      <View style={[styles.statusDot, { backgroundColor: STATUS_COLORS[item.status] }]} />
      <View style={styles.alertInfo}>
        <Text style={styles.alertStatus}>
          {SOURCE_LABEL[item.source ?? 'sos'] ?? 'SOS'} · {item.status}
        </Text>
        <Text style={styles.alertDate}>{new Date(item.createdAt).toLocaleString()}</Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.greeting}>Hi, {user.name}</Text>
      <Text style={styles.subtitle}>
        {activeAlert ? '🚨 SOS is active — contacts are tracking you' : 'Press the button below in an emergency'}
      </Text>

      {activeAlert && (
        <View style={styles.activeBanner}>
          <Text style={styles.activeTitle}>🚨 SOS ACTIVE · {activeAlert.status}</Text>
          <Text style={styles.activeSub}>
            Triggered {new Date(activeAlert.createdAt).toLocaleTimeString()}
          </Text>
          <View style={styles.bannerBtns}>
            <Pressable style={[styles.bannerBtn, styles.bannerGreen]} onPress={() => resolveAlert('safe')}>
              <Text style={styles.bannerBtnText}>✅ I'M SAFE</Text>
            </Pressable>
            <Pressable style={[styles.bannerBtn, styles.bannerGhost]} onPress={() => resolveAlert('cancel')}>
              <Text style={styles.bannerBtnText}>✖ FALSE ALARM</Text>
            </Pressable>
          </View>
        </View>
      )}

      <View style={styles.sosArea}>
        <SosButton onPress={triggerSos} loading={sending} />
      </View>

      <Text style={styles.historyTitle}>Recent Alerts</Text>
      <FlatList
        data={alerts}
        keyExtractor={(item) => item.id}
        renderItem={renderAlert}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={<Text style={styles.emptyText}>No alerts triggered yet.</Text>}
        style={styles.historyList}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0b1326',
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  greeting: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '800',
  },
  subtitle: {
    color: '#94A3B8',
    fontSize: 14,
    marginTop: 4,
  },
  sosArea: {
    alignItems: 'center',
    marginVertical: 8,
  },
  historyTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 8,
  },
  historyList: {
    flex: 1,
  },
  alertCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  alertInfo: {
    flex: 1,
  },
  alertStatus: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  alertDate: {
    color: '#94A3B8',
    fontSize: 12,
    marginTop: 2,
  },
  emptyText: {
    color: '#64748B',
    fontSize: 13,
    textAlign: 'center',
    marginTop: 16,
  },
  activeBanner: {
    backgroundColor: 'rgba(220,38,38,.18)',
    borderWidth: 1.5,
    borderColor: 'rgba(220,38,38,.6)',
    borderRadius: 16,
    padding: 14,
    marginTop: 12,
  },
  activeTitle: { color: '#FCA5A5', fontWeight: '800', fontSize: 14 },
  activeSub: { color: '#94A3B8', fontSize: 12, marginTop: 3 },
  bannerBtns: { flexDirection: 'row', gap: 8, marginTop: 10 },
  bannerBtn: { flex: 1, borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  bannerGreen: { backgroundColor: '#059669' },
  bannerGhost: { backgroundColor: '#0F172A', borderWidth: 1, borderColor: '#334155' },
  bannerBtnText: { color: '#fff', fontWeight: '800', fontSize: 12 },
});
