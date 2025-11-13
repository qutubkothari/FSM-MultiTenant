import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { StatusBar } from 'react-native';
import { LoginScreen } from './src/screens/LoginScreen';
import { HomeScreen } from './src/screens/HomeScreen';
import { NewVisitScreen } from './src/screens/NewVisitScreen';
import { useAuthStore } from './src/store/authStore';
import { useSyncStore } from './src/store/syncStore';
import { useDataStore } from './src/store/dataStore';
import { RootStackParamList } from './src/types';
import { initializeEnv } from './src/config/env';

const Stack = createStackNavigator<RootStackParamList>();

export default function App() {
  const { isAuthenticated, checkAuth, isLoading } = useAuthStore();
  const { startAutoSync, stopAutoSync, updatePendingCount } = useSyncStore();
  const { fetchProducts, fetchCustomers } = useDataStore();

  useEffect(() => {
    // Initialize environment variables (you can load from expo-constants here)
    initializeEnv({
      SUPABASE_URL: 'https://ktvrffbccgxtaststlhw.supabase.co',
      SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt0dnJmZmJjY2d4dGFzdHN0bGh3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzE0OTEyMzgsImV4cCI6MjA0NzA2NzIzOH0.sNhpQ5W6i_KuIPcT6bjjnw_BcJwPljV',
      OPENAI_API_KEY: 'your-openai-key',
    });

    // Check authentication
    checkAuth();
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      // Start auto-sync when authenticated
      startAutoSync();
      updatePendingCount();
      
      // Preload data
      fetchProducts();
      fetchCustomers();

      return () => {
        stopAutoSync();
      };
    }
  }, [isAuthenticated]);

  if (isLoading) {
    return null; // Or a loading screen
  }

  return (
    <>
      <StatusBar barStyle="dark-content" />
      <NavigationContainer>
        <Stack.Navigator
          screenOptions={{
            headerShown: false,
          }}
        >
          {!isAuthenticated ? (
            <Stack.Screen name="Login" component={LoginScreen} />
          ) : (
            <>
              <Stack.Screen name="Home" component={HomeScreen} />
              <Stack.Screen name="NewVisit" component={NewVisitScreen} />
            </>
          )}
        </Stack.Navigator>
      </NavigationContainer>
    </>
  );
}
