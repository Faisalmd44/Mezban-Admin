import { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { loadToken, useApp } from '../src/store';
import { api } from '../src/api';

export default function Index() {
  const router = useRouter();
  const { setUser } = useApp();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    async function checkAuth() {
      try {
        const token = await loadToken();
        if (token) {
          const user = await api.me();
          if (user) {
            setUser(user);
            router.replace('/(tabs)');
            return;
          }
        }
      } catch (e) {
        console.log("Session restore error:", e);
      } finally {
        setChecking(false);
      }
      router.replace('/(auth)/login');
    }

    checkAuth();
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: '#0A0A0A', justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator size="large" color="#D4AF37" />
    </View>
  );
}

