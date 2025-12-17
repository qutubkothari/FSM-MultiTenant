import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import { useAuthStore } from '@/store/authStore';
import { useVisitStore } from '@/store/visitStore';
import { useSyncStore } from '@/store/syncStore';
import { format } from 'date-fns';

interface HomeScreenProps {
  navigation: any;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({ navigation }) => {
  const { salesman, logout } = useAuthStore();
  const { visits, fetchVisits } = useVisitStore();
  const {
    pendingCount,
    lastSyncTime,
    syncNow,
    isSyncing,
    updatePendingCount,
    updateLastSyncTime,
    startAutoSync,
    stopAutoSync,
  } = useSyncStore();

  React.useEffect(() => {
    fetchVisits();
    updatePendingCount();
    updateLastSyncTime();
    startAutoSync();
    return () => {
      stopAutoSync();
    };
  }, []);

  const handleNewVisit = () => {
    navigation.navigate('NewVisit');
  };

  const handleSync = async () => {
    await syncNow();
    await fetchVisits();
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.welcome}>Welcome back,</Text>
          <Text style={styles.name}>{salesman?.name}</Text>
        </View>
        <TouchableOpacity onPress={logout} style={styles.logoutButton}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.newVisitButton} onPress={handleNewVisit}>
        <Text style={styles.newVisitButtonText}>+ New Visit</Text>
      </TouchableOpacity>

      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{visits.length}</Text>
          <Text style={styles.statLabel}>Total Visits</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{pendingCount}</Text>
          <Text style={styles.statLabel}>Pending Sync</Text>
        </View>
      </View>

      {pendingCount > 0 && (
        <TouchableOpacity
          style={styles.syncButton}
          onPress={handleSync}
          disabled={isSyncing}
        >
          <Text style={styles.syncButtonText}>
            {isSyncing ? 'Syncing...' : `Sync ${pendingCount} Visits`}
          </Text>
        </TouchableOpacity>
      )}

      {lastSyncTime && (
        <Text style={styles.lastSync}>
          Last synced: {format(new Date(lastSyncTime), 'MMM dd, HH:mm')}
        </Text>
      )}

      <Text style={styles.sectionTitle}>Recent Visits</Text>
      
      <ScrollView style={styles.visitsList}>
        {visits.slice(0, 10).map((visit) => (
          <TouchableOpacity
            key={visit.id}
            style={styles.visitCard}
            onPress={() => navigation.navigate('VisitDetails', { visitId: visit.id })}
          >
            <View style={styles.visitHeader}>
              <Text style={styles.customerName}>{visit.customer_name}</Text>
              <View style={[styles.potentialBadge, styles[`potential${visit.potential}`]]}>
                <Text style={styles.potentialText}>{visit.potential}</Text>
              </View>
            </View>
            <Text style={styles.visitDate}>
              {format(new Date(visit.created_at), 'MMM dd, yyyy • HH:mm')}
            </Text>
            <View style={styles.visitMeta}>
              <Text style={styles.visitMetaText}>
                {visit.meeting_type.join(', ')}
              </Text>
            </View>
          </TouchableOpacity>
        ))}
        
        {visits.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>No visits yet</Text>
            <Text style={styles.emptyStateSubtext}>
              Tap "New Visit" to record your first customer visit
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
  },
  welcome: {
    fontSize: 14,
    color: '#666',
  },
  name: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 4,
  },
  logoutButton: {
    padding: 8,
  },
  logoutText: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '600',
  },
  newVisitButton: {
    backgroundColor: '#007AFF',
    margin: 20,
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  newVisitButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 20,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  syncButton: {
    backgroundColor: '#34C759',
    marginHorizontal: 20,
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 8,
  },
  syncButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  lastSync: {
    textAlign: 'center',
    fontSize: 12,
    color: '#666',
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  visitsList: {
    flex: 1,
  },
  visitCard: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginBottom: 12,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  visitHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  customerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  potentialBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  potentialHigh: {
    backgroundColor: '#34C759',
  },
  potentialMedium: {
    backgroundColor: '#FF9500',
  },
  potentialLow: {
    backgroundColor: '#FF3B30',
  },
  potentialText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  visitDate: {
    fontSize: 12,
    color: '#666',
    marginBottom: 8,
  },
  visitMeta: {
    flexDirection: 'row',
  },
  visitMetaText: {
    fontSize: 12,
    color: '#007AFF',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#999',
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#ccc',
    textAlign: 'center',
    paddingHorizontal: 40,
  },
});
