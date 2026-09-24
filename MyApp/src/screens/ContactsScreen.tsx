import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert as RNAlert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { isAxiosError } from 'axios';
import client from '../api/client';
import { ApiResponse, Contact, ContactsData } from '../types';

const MAX_CONTACTS = 2;

function apiErrorMessage(err: unknown, fallback: string): string {
  return isAxiosError(err)
    ? (err.response?.data as { message?: string })?.message ?? err.message
    : fallback;
}

export default function ContactsScreen() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [relation, setRelation] = useState('');

  const fetchContacts = useCallback(async () => {
    try {
      const res = await client.get<ApiResponse<ContactsData>>('/contacts');
      setContacts(res.data.data?.contacts ?? []);
    } catch (err) {
      RNAlert.alert('Error', apiErrorMessage(err, 'Failed to load contacts'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);

  const addContact = async () => {
    if (!name.trim() || !phone.trim()) {
      RNAlert.alert('Missing info', 'Name and phone number are required.');
      return;
    }

    setSaving(true);
    try {
      await client.post('/contacts', {
        name: name.trim(),
        phone: phone.trim(),
        relation: relation.trim() || undefined,
      });
      setName('');
      setPhone('');
      setRelation('');
      await fetchContacts();
    } catch (err) {
      RNAlert.alert('Error', apiErrorMessage(err, 'Failed to add contact'));
    } finally {
      setSaving(false);
    }
  };

  const removeContact = (contact: Contact) => {
    RNAlert.alert('Remove Contact', `Remove ${contact.name} from your emergency contacts?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          try {
            await client.delete(`/contacts/${contact.id}`);
            await fetchContacts();
          } catch (err) {
            RNAlert.alert('Error', apiErrorMessage(err, 'Failed to remove contact'));
          }
        },
      },
    ]);
  };

  const atLimit = contacts.length >= MAX_CONTACTS;

  const renderContact = ({ item }: { item: Contact }) => (
    <View style={styles.contactCard}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{item.name.charAt(0).toUpperCase()}</Text>
      </View>
      <View style={styles.contactInfo}>
        <Text style={styles.contactName}>{item.name}</Text>
        <Text style={styles.contactPhone}>{item.phone}</Text>
        {item.relation ? <Text style={styles.contactRelation}>{item.relation}</Text> : null}
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Remove ${item.name}`}
        onPress={() => removeContact(item)}
        style={styles.removeButton}
      >
        <Text style={styles.removeButtonText}>✕</Text>
      </Pressable>
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Text style={styles.title}>Emergency Contacts</Text>
      <Text style={styles.subtitle}>
        {contacts.length}/{MAX_CONTACTS} contacts — alerted via SMS & WhatsApp on SOS
      </Text>

      {loading ? (
        <ActivityIndicator color="#DC143C" style={styles.loader} />
      ) : (
        <FlatList
          data={contacts}
          keyExtractor={(item) => item.id}
          renderItem={renderContact}
          ListEmptyComponent={
            <Text style={styles.emptyText}>
              No emergency contacts yet. Add up to {MAX_CONTACTS} below.
            </Text>
          }
          style={styles.list}
        />
      )}

      {!atLimit && (
        <View style={styles.form}>
          <TextInput
            style={styles.input}
            placeholder="Full name"
            placeholderTextColor="#64748B"
            value={name}
            onChangeText={setName}
          />
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
            placeholder="Relation (optional)"
            placeholderTextColor="#64748B"
            value={relation}
            onChangeText={setRelation}
          />
          <Pressable
            accessibilityRole="button"
            onPress={addContact}
            disabled={saving}
            style={[styles.addButton, saving && styles.addButtonDisabled]}
          >
            {saving ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.addButtonText}>Add Contact</Text>
            )}
          </Pressable>
        </View>
      )}

      {atLimit && (
        <Text style={styles.limitNote}>
          Contact limit reached. Remove a contact to add a new one.
        </Text>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0b1326',
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '800',
  },
  subtitle: {
    color: '#94A3B8',
    fontSize: 13,
    marginTop: 4,
    marginBottom: 16,
  },
  loader: {
    marginTop: 24,
  },
  list: {
    flexGrow: 0,
  },
  contactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#DC2626',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
  },
  contactInfo: {
    flex: 1,
  },
  contactName: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  contactPhone: {
    color: '#94A3B8',
    fontSize: 13,
    marginTop: 2,
  },
  contactRelation: {
    color: '#64748B',
    fontSize: 12,
    marginTop: 2,
  },
  removeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(220,38,38,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeButtonText: {
    color: '#EF4444',
    fontSize: 14,
    fontWeight: '700',
  },
  emptyText: {
    color: '#64748B',
    fontSize: 13,
    textAlign: 'center',
    marginVertical: 16,
  },
  form: {
    marginTop: 12,
  },
  input: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#FFFFFF',
    fontSize: 15,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#334155',
  },
  addButton: {
    backgroundColor: '#DC2626',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  addButtonDisabled: {
    opacity: 0.6,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  limitNote: {
    color: '#94A3B8',
    fontSize: 13,
    textAlign: 'center',
    marginTop: 8,
  },
});
