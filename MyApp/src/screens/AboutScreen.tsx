import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

const STEPS = [
  {
    icon: '📝',
    title: 'Create Your Account',
    desc: 'Sign up with your name and phone number. Your password is securely encrypted.',
  },
  {
    icon: '👥',
    title: 'Add Emergency Contacts',
    desc: 'Save up to 2 trusted people — family or friends — who will be alerted in an emergency.',
  },
  {
    icon: '🆘',
    title: 'Press SOS When in Danger',
    desc: 'One tap sends an instant emergency alert with your live location to your contacts.',
  },
  {
    icon: '📲',
    title: 'Contacts Get Notified',
    desc: 'Your contacts receive the alert via SMS and WhatsApp with a Google Maps link to find you.',
  },
];

const FEATURES = [
  { icon: '⚡', label: 'Instant Alerts' },
  { icon: '📍', label: 'Live Location' },
  { icon: '💬', label: 'SMS + WhatsApp' },
  { icon: '🔒', label: 'Secure & Private' },
];

export default function AboutScreen() {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.hero}>
        <Text style={styles.heroLogo}>🛡️</Text>
        <Text style={styles.heroTitle}>HIFAZAT</Text>
        <Text style={styles.heroSub}>Your Personal Emergency Response System</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>What does this app do?</Text>
        <Text style={styles.paragraph}>
          HIFAZAT keeps you safe in emergencies. With a single tap of the SOS button, your
          trusted emergency contacts are instantly alerted with your exact location — so help
          can reach you fast, when every second counts.
        </Text>
      </View>

      <Text style={styles.sectionHeading}>How it works</Text>
      {STEPS.map((step, i) => (
        <View key={step.title} style={styles.stepCard}>
          <View style={styles.stepIconWrap}>
            <Text style={styles.stepIcon}>{step.icon}</Text>
          </View>
          <View style={styles.stepBody}>
            <Text style={styles.stepTitle}>
              {i + 1}. {step.title}
            </Text>
            <Text style={styles.stepDesc}>{step.desc}</Text>
          </View>
        </View>
      ))}

      <Text style={styles.sectionHeading}>Features</Text>
      <View style={styles.featureGrid}>
        {FEATURES.map((f) => (
          <View key={f.label} style={styles.featureCard}>
            <Text style={styles.featureIcon}>{f.icon}</Text>
            <Text style={styles.featureLabel}>{f.label}</Text>
          </View>
        ))}
      </View>

      <Text style={styles.version}>HIFAZAT v1.0.0</Text>
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
    paddingBottom: 40,
  },
  hero: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  heroLogo: {
    fontSize: 56,
  },
  heroTitle: {
    fontSize: 26,
    fontWeight: '900',
    color: '#EF4444',
    letterSpacing: 4,
    marginTop: 8,
  },
  heroSub: {
    fontSize: 14,
    color: '#94A3B8',
    marginTop: 4,
    textAlign: 'center',
  },
  card: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 18,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  paragraph: {
    fontSize: 14,
    color: '#94A3B8',
    lineHeight: 22,
  },
  sectionHeading: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    marginTop: 20,
    marginBottom: 12,
  },
  stepCard: {
    flexDirection: 'row',
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  stepIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: 'rgba(220,38,38,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  stepIcon: {
    fontSize: 24,
  },
  stepBody: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  stepDesc: {
    fontSize: 13,
    color: '#94A3B8',
    marginTop: 4,
    lineHeight: 19,
  },
  featureGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  featureCard: {
    width: '47%',
    backgroundColor: '#1E293B',
    borderRadius: 16,
    paddingVertical: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  featureIcon: {
    fontSize: 28,
  },
  featureLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 8,
  },
  version: {
    textAlign: 'center',
    color: '#64748B',
    fontSize: 12,
    marginTop: 24,
  },
});
