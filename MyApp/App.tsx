import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert as RNAlert,
  Animated,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { isAxiosError } from 'axios';
import client, { setAuthToken } from './src/api/client';
import HomeScreen from './src/screens/HomeScreen';
import ContactsScreen from './src/screens/ContactsScreen';
import AboutScreen from './src/screens/AboutScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import SafetyScreen from './src/screens/SafetyScreen';
import FeaturesScreen from './src/screens/FeaturesScreen';
import { ApiResponse, AuthData, LoginStepData, User } from './src/types';

type Tab = 'home' | 'safety' | 'contacts' | 'features' | 'about' | 'profile';
type AuthMode = 'login' | 'signup';

const TABS: { key: Tab; icon: string; label: string }[] = [
  { key: 'home', icon: '🏠', label: 'Home' },
  { key: 'safety', icon: '🛡️', label: 'Safety' },
  { key: 'contacts', icon: '👥', label: 'Contacts' },
  { key: 'features', icon: '⚙️', label: 'Features' },
  { key: 'profile', icon: '👤', label: 'Profile' },
];

const DRAWER_ITEMS: { key: Tab; icon: string }[] = [
  ...TABS.map((t) => ({ key: t.key, icon: t.icon })),
  { key: 'about', icon: 'ℹ️' },
];

const TAB_TITLES: Record<Tab, string> = {
  home: 'Home',
  safety: 'Safety Center',
  contacts: 'Emergency Contacts',
  features: 'Protection Features',
  about: 'About HIFAZAT',
  profile: 'My Profile',
};

function apiErrorMessage(err: unknown, fallback: string): string {
  return isAxiosError(err)
    ? (err.response?.data as { message?: string })?.message ?? err.message
    : fallback;
}

// ─── Splash Screen ───
function SplashScreen({ onDone }: { onDone: () => void }) {
  const fade = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade, { toValue: 1, duration: 700, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, friction: 5, useNativeDriver: true }),
    ]).start();
    const t = setTimeout(onDone, 2200);
    return () => clearTimeout(t);
  }, [fade, scale, onDone]);

  return (
    <View style={styles.splash}>
      <Animated.View style={{ opacity: fade, transform: [{ scale }], alignItems: 'center' }}>
        <View style={styles.splashLogoWrap}>
          <Text style={styles.splashLogo}>🛡️</Text>
        </View>
        <Text style={styles.splashName}>HIFAZAT</Text>
        <Text style={styles.splashTag}>Emergency Response System</Text>
        <ActivityIndicator color="#DC2626" style={styles.splashLoader} />
      </Animated.View>
    </View>
  );
}

// ─── Auth Screen ───
function AuthScreen({ onAuthenticated }: { onAuthenticated: (user: User) => void }) {
  const [mode, setMode] = useState<AuthMode>('login');
  const [name, setName] = useState('');
  const [city, setCity] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [otpStep, setOtpStep] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (!phone.trim() || !password || (mode === 'signup' && (!name.trim() || !city.trim()))) {
      RNAlert.alert('Missing info', 'Please fill in all required fields.');
      return;
    }

    setSubmitting(true);
    try {
      if (mode === 'signup') {
        await client.post('/auth/signup', {
          name: name.trim(),
          city: city.trim(),
          phone: phone.trim(),
          password,
        });
        RNAlert.alert('✅ Account Created', 'Please log in with your phone and password.');
        setMode('login');
        setPassword('');
      } else {
        const res = await client.post<ApiResponse<LoginStepData>>('/auth/login', {
          phone: phone.trim(),
          password,
        });
        if (res.data.data?.otpRequired) {
          setOtpStep(true);
          RNAlert.alert('📲 OTP Sent', 'A verification code has been sent to your phone number.');
        }
      }
    } catch (err) {
      RNAlert.alert('Error', apiErrorMessage(err, 'Authentication failed'));
    } finally {
      setSubmitting(false);
    }
  };

  const submitOtp = async () => {
    if (otp.trim().length !== 6) {
      RNAlert.alert('Invalid code', 'Please enter the 6-digit OTP code.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await client.post<ApiResponse<AuthData>>('/auth/verify-otp', {
        phone: phone.trim(),
        otp: otp.trim(),
      });
      const data = res.data.data;
      if (data) {
        setAuthToken(data.token);
        onAuthenticated(data.user);
      }
    } catch (err) {
      RNAlert.alert('Error', apiErrorMessage(err, 'OTP verification failed'));
    } finally {
      setSubmitting(false);
    }
  };

  if (otpStep) {
    return (
      <KeyboardAvoidingView
        style={styles.authContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Text style={styles.authLogo}>📲</Text>
        <Text style={styles.brand}>VERIFY OTP</Text>
        <Text style={styles.brandSub}>Enter the 6-digit code sent to {phone}</Text>

        <TextInput
          style={[styles.input, styles.otpInput]}
          placeholder="• • • • • •"
          placeholderTextColor="#64748B"
          keyboardType="number-pad"
          maxLength={6}
          value={otp}
          onChangeText={setOtp}
        />

        <Pressable
          accessibilityRole="button"
          onPress={submitOtp}
          disabled={submitting}
          style={[styles.primaryButton, submitting && styles.buttonDisabled]}
        >
          {submitting ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.primaryButtonText}>Verify & Log In</Text>
          )}
        </Pressable>

        <Pressable
          accessibilityRole="button"
          onPress={() => {
            setOtpStep(false);
            setOtp('');
          }}
        >
          <Text style={styles.switchText}>← Back to login</Text>
        </Pressable>
      </KeyboardAvoidingView>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.authContainer}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Text style={styles.authLogo}>🛡️</Text>
      <Text style={styles.brand}>HIFAZAT</Text>
      <Text style={styles.brandSub}>Emergency Response System</Text>

      {mode === 'signup' && (
        <TextInput
          style={styles.input}
          placeholder="Full name"
          placeholderTextColor="#64748B"
          value={name}
          onChangeText={setName}
        />
      )}
      {mode === 'signup' && (
        <TextInput
          style={styles.input}
          placeholder="City"
          placeholderTextColor="#64748B"
          value={city}
          onChangeText={setCity}
        />
      )}
      <TextInput
        style={styles.input}
        placeholder="Phone (e.g. +92 300 1234567)"
        placeholderTextColor="#64748B"
        keyboardType="phone-pad"
        value={phone}
        onChangeText={setPhone}
      />
      <TextInput
        style={styles.input}
        placeholder="Password (min 8 characters)"
        placeholderTextColor="#64748B"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />

      <Pressable
        accessibilityRole="button"
        onPress={submit}
        disabled={submitting}
        style={[styles.primaryButton, submitting && styles.buttonDisabled]}
      >
        {submitting ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={styles.primaryButtonText}>
            {mode === 'signup' ? 'Create Account' : 'Log In'}
          </Text>
        )}
      </Pressable>

      <Pressable
        accessibilityRole="button"
        onPress={() => setMode(mode === 'signup' ? 'login' : 'signup')}
      >
        <Text style={styles.switchText}>
          {mode === 'signup'
            ? 'Already have an account? Log in'
            : "Don't have an account? Sign up"}
        </Text>
      </Pressable>
    </KeyboardAvoidingView>
  );
}

// ─── Main App ───
function AppContent() {
  const [showSplash, setShowSplash] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [tab, setTab] = useState<Tab>('home');
  const [menuOpen, setMenuOpen] = useState(false);

  if (showSplash) {
    return <SplashScreen onDone={() => setShowSplash(false)} />;
  }

  if (!user) {
    return <AuthScreen onAuthenticated={setUser} />;
  }

  const logout = () => {
    setMenuOpen(false);
    setAuthToken(null);
    setUser(null);
    setTab('home');
  };

  const goTo = (t: Tab) => {
    setTab(t);
    setMenuOpen(false);
  };

  return (
    <View style={styles.appContainer}>
      {/* Header with hamburger */}
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open menu"
          onPress={() => setMenuOpen(true)}
          style={styles.hamburger}
        >
          <Text style={styles.hamburgerIcon}>☰</Text>
        </Pressable>
        <Text style={styles.headerTitle}>{TAB_TITLES[tab]}</Text>
        <View style={styles.headerLogoWrap}>
          <Text style={styles.headerLogo}>🛡️</Text>
        </View>
      </View>

      {/* Drawer menu */}
      <Modal visible={menuOpen} transparent animationType="fade" onRequestClose={() => setMenuOpen(false)}>
        <Pressable style={styles.menuOverlay} onPress={() => setMenuOpen(false)}>
          <View style={styles.drawer}>
            <View style={styles.drawerHeader}>
              <Text style={styles.drawerLogo}>🛡️</Text>
              <Text style={styles.drawerBrand}>HIFAZAT</Text>
              <Text style={styles.drawerUser}>{user.name}</Text>
            </View>
            {DRAWER_ITEMS.map((t) => (
              <Pressable key={t.key} style={styles.drawerItem} onPress={() => goTo(t.key)}>
                <Text style={styles.drawerItemText}>
                  {t.icon}  {TAB_TITLES[t.key]}
                </Text>
              </Pressable>
            ))}
            <View style={styles.drawerDivider} />
            <Pressable style={styles.drawerItem} onPress={logout}>
              <Text style={[styles.drawerItemText, styles.drawerLogout]}>🚪  Log Out</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>

      {/* Screens */}
      <View style={styles.screen}>
        {tab === 'home' && <HomeScreen user={user} />}
        {tab === 'safety' && <SafetyScreen />}
        {tab === 'contacts' && <ContactsScreen />}
        {tab === 'features' && <FeaturesScreen onGoSafety={() => setTab('safety')} />}
        {tab === 'about' && <AboutScreen />}
        {tab === 'profile' && <ProfileScreen user={user} onLogout={logout} />}
      </View>

      {/* Bottom tab bar */}
      <View style={styles.tabBar}>
        {TABS.map((t) => (
          <Pressable
            key={t.key}
            accessibilityRole="button"
            onPress={() => setTab(t.key)}
            style={styles.tabItem}
          >
            <Text style={styles.tabIcon}>{t.icon}</Text>
            <Text style={[styles.tabLabel, tab === t.key && styles.tabLabelActive]}>
              {t.label}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

export default function App() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" />
      <AppContent />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  appContainer: {
    flex: 1,
    backgroundColor: '#0b1326',
  },
  screen: {
    flex: 1,
  },
  // Splash
  splash: {
    flex: 1,
    backgroundColor: '#0F172A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  splashLogoWrap: {
    width: 110,
    height: 110,
    borderRadius: 32,
    backgroundColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  splashLogo: {
    fontSize: 60,
  },
  splashName: {
    color: '#FFFFFF',
    fontSize: 34,
    fontWeight: '900',
    letterSpacing: 6,
    marginTop: 20,
  },
  splashTag: {
    color: '#34D399',
    fontSize: 14,
    marginTop: 6,
  },
  splashLoader: {
    marginTop: 28,
  },
  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  hamburger: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  hamburgerIcon: {
    fontSize: 20,
    color: '#FFFFFF',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 17,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  headerLogoWrap: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerLogo: {
    fontSize: 22,
  },
  // Drawer
  menuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(3,7,18,0.7)',
    flexDirection: 'row',
  },
  drawer: {
    width: 280,
    backgroundColor: '#0F172A',
    height: '100%',
    paddingTop: 40,
  },
  drawerHeader: {
    alignItems: 'center',
    paddingBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
    marginBottom: 12,
  },
  drawerLogo: {
    fontSize: 44,
  },
  drawerBrand: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 4,
    marginTop: 8,
  },
  drawerUser: {
    color: '#94A3B8',
    fontSize: 13,
    marginTop: 4,
  },
  drawerItem: {
    paddingVertical: 15,
    paddingHorizontal: 24,
  },
  drawerItemText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  drawerLogout: {
    color: '#DC2626',
  },
  drawerDivider: {
    height: 1,
    backgroundColor: '#334155',
    marginVertical: 8,
    marginHorizontal: 24,
  },
  // Tab bar
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#0F172A',
    borderTopWidth: 1,
    borderTopColor: '#334155',
    paddingBottom: 6,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
  },
  tabIcon: {
    fontSize: 20,
  },
  tabLabel: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '700',
    marginTop: 2,
  },
  tabLabelActive: {
    color: '#DC2626',
  },
  // Auth
  authContainer: {
    flex: 1,
    backgroundColor: '#0F172A',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  authLogo: {
    fontSize: 52,
    textAlign: 'center',
  },
  brand: {
    color: '#FFFFFF',
    fontSize: 34,
    fontWeight: '900',
    textAlign: 'center',
    letterSpacing: 6,
    marginTop: 8,
  },
  brandSub: {
    color: '#94A3B8',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 32,
    marginTop: 4,
  },
  input: {
    backgroundColor: '#0b1326',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    color: '#FFFFFF',
    fontSize: 15,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  primaryButton: {
    backgroundColor: '#DC2626',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  switchText: {
    color: '#94A3B8',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 20,
  },
  otpInput: {
    textAlign: 'center',
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: 10,
  },
});