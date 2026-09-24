import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert as RNAlert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  Vibration,
  View,
} from 'react-native';
import { isAxiosError } from 'axios';
import client from '../api/client';
import { ApiResponse, Settings } from '../types';

interface FeaturesScreenProps {
  onGoSafety: () => void;
}

type BoolKey = Exclude<keyof Settings, 'countryCode'>;

const SETTING_META: { key: BoolKey; icon: string; title: string; sub: string }[] = [
  { key: 'shakeToAlert', icon: '📳', title: 'Shake to Alert', sub: 'Shake phone 3 times to trigger SOS' },
  { key: 'keepScreenOn', icon: '📱', title: 'Keep Screen On', sub: 'Prevent screen lock during alerts' },
  { key: 'secretRecording', icon: '🎙️', title: 'Secret Recording', sub: 'Record audio evidence when SOS fires' },
  { key: 'lowBatteryAlert', icon: '🔋', title: 'Low Battery Alert', sub: 'Notify contacts when battery < 10%' },
  { key: 'simChangeAlert', icon: '📶', title: 'SIM Change Alert', sub: 'Alert contacts if SIM is swapped' },
  { key: 'offlineDetection', icon: '📴', title: 'Offline Detection', sub: 'Warn contacts if phone goes offline' },
];

const pad = (n: number) => String(n).padStart(2, '0');

export default function FeaturesScreen({ onGoSafety }: FeaturesScreenProps) {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [fakeCall, setFakeCall] = useState<'idle' | 'ringing' | 'active'>('idle');
  const [callSecs, setCallSecs] = useState(0);
  const [siren, setSiren] = useState(false);

  const load = useCallback(async () => {
    try {
      const r = await client.get<ApiResponse<{ settings: Settings }>>('/settings');
      setSettings(r.data.data?.settings ?? null);
    } catch (err) {
      const msg = isAxiosError(err)
        ? (err.response?.data as { message?: string })?.message ?? err.message
        : 'Failed to load settings';
      RNAlert.alert('Error', msg);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (fakeCall === 'ringing') {
      Vibration.vibrate([500, 300, 500, 300], true);
      return () => Vibration.cancel();
    }
    if (fakeCall === 'active') {
      Vibration.cancel();
      const t = setInterval(() => setCallSecs((s) => s + 1), 1000);
      return () => clearInterval(t);
    }
    setCallSecs(0);
    return undefined;
  }, [fakeCall]);

  useEffect(() => {
    if (siren) {
      Vibration.vibrate([300, 200], true);
      return () => Vibration.cancel();
    }
    return undefined;
  }, [siren]);

  const toggle = async (key: BoolKey, value: boolean) => {
    if (!settings) return;
    setSettings({ ...settings, [key]: value });
    try {
      await client.put('/settings', { [key]: value });
    } catch {
      await load();
    }
  };

  const quickCheckin = async () => {
    try {
      await client.post('/checkins', { type: 'manual', label: 'Quick', status: 'safe' });
      RNAlert.alert('✅ Checked in', 'You are marked safe for now.');
    } catch {
      RNAlert.alert('Error', 'Check-in failed');
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.sectionTitle}>⚡ Quick Tools</Text>
      <View style={styles.grid}>
        <Pressable style={styles.tile} onPress={() => setFakeCall('ringing')}>
          <Text style={styles.tileIcon}>📞</Text>
          <Text style={styles.tileTitle}>Fake Call</Text>
          <Text style={styles.tileSub}>Escape awkward situations</Text>
        </Pressable>
        <Pressable style={[styles.tile, siren && styles.tileActive]} onPress={() => setSiren(!siren)}>
          <Text style={styles.tileIcon}>📢</Text>
          <Text style={styles.tileTitle}>{siren ? 'Stop Siren' : 'Siren'}</Text>
          <Text style={styles.tileSub}>Loud alarm + vibration</Text>
        </Pressable>
        <Pressable style={styles.tile} onPress={quickCheckin}>
          <Text style={styles.tileIcon}>✅</Text>
          <Text style={styles.tileTitle}>Quick Check-in</Text>
          <Text style={styles.tileSub}>Mark yourself safe</Text>
        </Pressable>
        <Pressable style={styles.tile} onPress={onGoSafety}>
          <Text style={styles.tileIcon}>🧭</Text>
          <Text style={styles.tileTitle}>Trip Mode</Text>
          <Text style={styles.tileSub}>Timed journey guard</Text>
        </Pressable>
      </View>

      <Text style={styles.sectionTitle}>🛡️ Protection Settings</Text>
      <View style={styles.card}>
        {SETTING_META.map((m) => (
          <View key={m.key} style={styles.row}>
            <Text style={styles.rowIcon}>{m.icon}</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowTitle}>{m.title}</Text>
              <Text style={styles.rowSub}>{m.sub}</Text>
            </View>
            <Switch
              value={settings?.[m.key] ?? false}
              onValueChange={(v) => toggle(m.key, v)}
              trackColor={{ true: '#059669', false: '#334155' }}
              thumbColor="#fff"
            />
          </View>
        ))}
      </View>
      <View style={styles.info}>
        <Text style={styles.infoText}>
          ℹ️ Shake-to-alert, SIM change and low-battery detection require native device permissions.
          These preferences are synced to your account.
        </Text>
      </View>

      <Modal visible={siren} transparent animationType="fade" onRequestClose={() => setSiren(false)}>
        <Pressable style={styles.sirenOverlay} onPress={() => setSiren(false)}>
          <Text style={styles.sirenText}>🚨 SIREN ACTIVE 🚨</Text>
          <Text style={styles.sirenSub}>Tap anywhere to stop</Text>
        </Pressable>
      </Modal>

      <Modal visible={fakeCall !== 'idle'} animationType="slide" onRequestClose={() => setFakeCall('idle')}>
        <View style={styles.callScreen}>
          <View style={{ alignItems: 'center' }}>
            <View style={styles.callAvatar}>
              <Text style={{ fontSize: 44 }}>👤</Text>
            </View>
            <Text style={styles.callName}>Ammi</Text>
            <Text style={styles.callStatus}>
              {fakeCall === 'ringing' ? 'Incoming call…' : `${pad(Math.floor(callSecs / 60))}:${pad(callSecs % 60)}`}
            </Text>
          </View>
          <View style={styles.callActions}>
            <Pressable style={[styles.callBtn, { backgroundColor: '#DC2626' }]} onPress={() => setFakeCall('idle')}>
              <Text style={{ fontSize: 30 }}>📵</Text>
            </Pressable>
            {fakeCall === 'ringing' && (
              <Pressable style={[styles.callBtn, { backgroundColor: '#059669' }]} onPress={() => setFakeCall('active')}>
                <Text style={{ fontSize: 30 }}>📞</Text>
              </Pressable>
            )}
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0b1326' },
  content: { padding: 16, paddingBottom: 32 },
  sectionTitle: { color: '#FFFFFF', fontSize: 15, fontWeight: '800', marginTop: 6, marginBottom: 10 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 14 },
  tile: {
    width: '48%',
    backgroundColor: '#1E293B',
    borderRadius: 18,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(51,65,85,.5)',
  },
  tileActive: { borderColor: '#DC2626' },
  tileIcon: { fontSize: 28 },
  tileTitle: { color: '#FFFFFF', fontWeight: '800', fontSize: 13.5, marginTop: 8 },
  tileSub: { color: '#94A3B8', fontSize: 11, marginTop: 3, textAlign: 'center' },
  card: {
    backgroundColor: '#1E293B',
    borderRadius: 18,
    padding: 6,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: 'rgba(51,65,85,.5)',
  },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, gap: 10 },
  rowIcon: { fontSize: 20 },
  rowTitle: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },
  rowSub: { color: '#94A3B8', fontSize: 11.5, marginTop: 2 },
  info: { marginTop: 12, backgroundColor: 'rgba(30,41,59,.85)', borderRadius: 14, padding: 12 },
  infoText: { color: '#94A3B8', fontSize: 12, lineHeight: 17 },
  sirenOverlay: { flex: 1, backgroundColor: '#DC2626', alignItems: 'center', justifyContent: 'center' },
  sirenText: { color: '#fff', fontSize: 28, fontWeight: '900' },
  sirenSub: { color: '#fff', marginTop: 10, opacity: 0.85 },
  callScreen: { flex: 1, backgroundColor: '#0b1326', justifyContent: 'space-between', paddingVertical: 90, alignItems: 'center' },
  callAvatar: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#1E293B', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  callName: { color: '#fff', fontSize: 28, fontWeight: '800' },
  callStatus: { color: '#94A3B8', marginTop: 6, fontSize: 15 },
  callActions: { flexDirection: 'row', gap: 60 },
  callBtn: { width: 70, height: 70, borderRadius: 35, alignItems: 'center', justifyContent: 'center' },
});
