import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { User } from '../types';

interface ProfileScreenProps {
  user: User;
  onLogout: () => void;
}

export default function ProfileScreen({ user, onLogout }: ProfileScreenProps) {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.avatarWrap}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{user.name.charAt(0).toUpperCase()}</Text>
        </View>
        <Text style={styles.name}>{user.name}</Text>
        <Text style={styles.phone}>{user.phone}</Text>
      </View>

      <View style={styles.card}>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>👤  Full Name</Text>
          <Text style={styles.rowValue}>{user.name}</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.row}>
          <Text style={styles.rowLabel}>📱  Phone</Text>
          <Text style={styles.rowValue}>{user.phone}</Text>
        </View>
        {user.city ? (
          <>
            <View style={styles.divider} />
            <View style={styles.row}>
              <Text style={styles.rowLabel}>🏙️  City</Text>
              <Text style={styles.rowValue}>{user.city}</Text>
            </View>
          </>
        ) : null}
        {user.email ? (
          <>
            <View style={styles.divider} />
            <View style={styles.row}>
              <Text style={styles.rowLabel}>✉️  Email</Text>
              <Text style={styles.rowValue}>{user.email}</Text>
            </View>
          </>
        ) : null}
      </View>

      <Pressable accessibilityRole="button" onPress={onLogout} style={styles.logoutButton}>
        <Text style={styles.logoutText}>Log Out</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0b1326',
  },
  content: {
    padding: 20,
  },
  avatarWrap: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#DC2626',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 36,
    fontWeight: '900',
  },
  name: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    marginTop: 12,
  },
  phone: {
    fontSize: 14,
    color: '#94A3B8',
    marginTop: 2,
  },
  card: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    paddingHorizontal: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
  },
  rowLabel: {
    fontSize: 14,
    color: '#94A3B8',
    fontWeight: '600',
  },
  rowValue: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  divider: {
    height: 1,
    backgroundColor: '#334155',
  },
  logoutButton: {
    backgroundColor: 'rgba(220,38,38,0.15)',
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 24,
    borderWidth: 1,
    borderColor: 'rgba(220,38,38,0.5)',
  },
  logoutText: {
    color: '#FCA5A5',
    fontSize: 16,
    fontWeight: '800',
  },
});
