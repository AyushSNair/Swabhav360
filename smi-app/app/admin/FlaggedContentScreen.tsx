import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
  ActivityIndicator,
  TextInput,
  Modal
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

interface FlaggedContent {
  _id: string;
  userId: string;
  userEmail: string;
  contentType: string;
  originalContent: string;
  flaggedReason: string;
  confidence: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'pending' | 'reviewed' | 'resolved' | 'false_positive';
  adminNotes: string;
  reviewedBy: string;
  reviewedAt: string;
  createdAt: string;
  explanation: string;
}

interface Stats {
  overview: {
    total: number;
    pending: number;
    critical: number;
    high: number;
  };
  severity: Array<{ _id: string; count: number }>;
  reasons: Array<{ _id: string; count: number }>;
}

const API_BASE_URL = 'http://localhost:3000/api/content-assessment';

export default function FlaggedContentScreen() {
  const router = useRouter();
  const [flaggedContent, setFlaggedContent] = useState<FlaggedContent[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedItem, setSelectedItem] = useState<FlaggedContent | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [adminNotes, setAdminNotes] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [filterSeverity, setFilterSeverity] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    fetchFlaggedContent();
    fetchStats();
  }, [currentPage, filterStatus, filterSeverity]);

  const fetchFlaggedContent = async () => {
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '10'
      });
      
      if (filterStatus) params.append('status', filterStatus);
      if (filterSeverity) params.append('severity', filterSeverity);

      const response = await fetch(`${API_BASE_URL}/flagged?${params}`);
      const data = await response.json();

      if (data.success) {
        setFlaggedContent(data.data);
        setTotalPages(data.pagination.pages);
      }
    } catch (error) {
      console.error('Error fetching flagged content:', error);
      Alert.alert('Error', 'Failed to fetch flagged content');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/stats`);
      const data = await response.json();

      if (data.success) {
        setStats(data.data);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchFlaggedContent(), fetchStats()]);
    setRefreshing(false);
  };

  const updateFlaggedContent = async (id: string, status: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/flagged/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status,
          adminNotes,
          reviewedBy: 'admin' // In a real app, get from auth context
        }),
      });

      const data = await response.json();

      if (data.success) {
        Alert.alert('Success', 'Content status updated successfully');
        setModalVisible(false);
        setSelectedItem(null);
        setAdminNotes('');
        fetchFlaggedContent();
        fetchStats();
      } else {
        Alert.alert('Error', data.error || 'Failed to update content');
      }
    } catch (error) {
      console.error('Error updating flagged content:', error);
      Alert.alert('Error', 'Failed to update content status');
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return '#dc2626';
      case 'high': return '#ea580c';
      case 'medium': return '#d97706';
      case 'low': return '#059669';
      default: return '#6b7280';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return '#dc2626';
      case 'reviewed': return '#059669';
      case 'resolved': return '#2563eb';
      case 'false_positive': return '#6b7280';
      default: return '#6b7280';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const truncateText = (text: string, maxLength: number = 100) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading flagged content...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#007AFF" />
        </TouchableOpacity>
        <Text style={styles.title}>Flagged Content</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Stats Section */}
        {stats && (
          <View style={styles.statsContainer}>
            <Text style={styles.sectionTitle}>Overview</Text>
            <View style={styles.statsGrid}>
              <View style={styles.statCard}>
                <Text style={styles.statNumber}>{stats.overview.total}</Text>
                <Text style={styles.statLabel}>Total Flagged</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={[styles.statNumber, { color: '#dc2626' }]}>{stats.overview.pending}</Text>
                <Text style={styles.statLabel}>Pending Review</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={[styles.statNumber, { color: '#dc2626' }]}>{stats.overview.critical}</Text>
                <Text style={styles.statLabel}>Critical</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={[styles.statNumber, { color: '#ea580c' }]}>{stats.overview.high}</Text>
                <Text style={styles.statLabel}>High Priority</Text>
              </View>
            </View>
          </View>
        )}

        {/* Filters */}
        <View style={styles.filtersContainer}>
          <Text style={styles.sectionTitle}>Filters</Text>
          <View style={styles.filterRow}>
            <View style={styles.filterItem}>
              <Text style={styles.filterLabel}>Status:</Text>
              <View style={styles.filterButtons}>
                {['', 'pending', 'reviewed', 'resolved', 'false_positive'].map((status) => (
                  <TouchableOpacity
                    key={status}
                    style={[
                      styles.filterButton,
                      filterStatus === status && styles.filterButtonActive
                    ]}
                    onPress={() => setFilterStatus(status)}
                  >
                    <Text style={[
                      styles.filterButtonText,
                      filterStatus === status && styles.filterButtonTextActive
                    ]}>
                      {status || 'All'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
          <View style={styles.filterRow}>
            <View style={styles.filterItem}>
              <Text style={styles.filterLabel}>Severity:</Text>
              <View style={styles.filterButtons}>
                {['', 'critical', 'high', 'medium', 'low'].map((severity) => (
                  <TouchableOpacity
                    key={severity}
                    style={[
                      styles.filterButton,
                      filterSeverity === severity && styles.filterButtonActive
                    ]}
                    onPress={() => setFilterSeverity(severity)}
                  >
                    <Text style={[
                      styles.filterButtonText,
                      filterSeverity === severity && styles.filterButtonTextActive
                    ]}>
                      {severity || 'All'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        </View>

        {/* Flagged Content List */}
        <View style={styles.contentContainer}>
          <Text style={styles.sectionTitle}>Flagged Content</Text>
          {flaggedContent.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="checkmark-circle" size={48} color="#059669" />
              <Text style={styles.emptyStateText}>No flagged content found</Text>
            </View>
          ) : (
            flaggedContent.map((item) => (
              <TouchableOpacity
                key={item._id}
                style={styles.contentCard}
                onPress={() => {
                  setSelectedItem(item);
                  setModalVisible(true);
                }}
              >
                <View style={styles.cardHeader}>
                  <View style={styles.userInfo}>
                    <Text style={styles.userEmail}>{item.userEmail}</Text>
                    <Text style={styles.contentType}>{item.contentType}</Text>
                  </View>
                  <View style={styles.badges}>
                    <View style={[styles.badge, { backgroundColor: getSeverityColor(item.severity) }]}>
                      <Text style={styles.badgeText}>{item.severity}</Text>
                    </View>
                    <View style={[styles.badge, { backgroundColor: getStatusColor(item.status) }]}>
                      <Text style={styles.badgeText}>{item.status}</Text>
                    </View>
                  </View>
                </View>
                <Text style={styles.contentText}>{truncateText(item.originalContent)}</Text>
                <View style={styles.cardFooter}>
                  <Text style={styles.reason}>Reason: {item.flaggedReason}</Text>
                  <Text style={styles.confidence}>Confidence: {(item.confidence * 100).toFixed(1)}%</Text>
                </View>
                <Text style={styles.dateText}>{formatDate(item.createdAt)}</Text>
              </TouchableOpacity>
            ))
          )}
        </View>

        {/* Pagination */}
        {totalPages > 1 && (
          <View style={styles.pagination}>
            <TouchableOpacity
              style={[styles.pageButton, currentPage === 1 && styles.pageButtonDisabled]}
              onPress={() => setCurrentPage(currentPage - 1)}
              disabled={currentPage === 1}
            >
              <Text style={styles.pageButtonText}>Previous</Text>
            </TouchableOpacity>
            <Text style={styles.pageInfo}>Page {currentPage} of {totalPages}</Text>
            <TouchableOpacity
              style={[styles.pageButton, currentPage === totalPages && styles.pageButtonDisabled]}
              onPress={() => setCurrentPage(currentPage + 1)}
              disabled={currentPage === totalPages}
            >
              <Text style={styles.pageButtonText}>Next</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Detail Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <Ionicons name="close" size={24} color="#007AFF" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Review Content</Text>
            <View style={styles.modalHeaderRight} />
          </View>

          <ScrollView style={styles.modalContent}>
            {selectedItem && (
              <>
                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionTitle}>User Information</Text>
                  <Text style={styles.modalText}>Email: {selectedItem.userEmail}</Text>
                  <Text style={styles.modalText}>Content Type: {selectedItem.contentType}</Text>
                  <Text style={styles.modalText}>Created: {formatDate(selectedItem.createdAt)}</Text>
                </View>

                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionTitle}>Content</Text>
                  <Text style={styles.modalContentText}>{selectedItem.originalContent}</Text>
                </View>

                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionTitle}>Assessment Details</Text>
                  <Text style={styles.modalText}>Reason: {selectedItem.flaggedReason}</Text>
                  <Text style={styles.modalText}>Severity: {selectedItem.severity}</Text>
                  <Text style={styles.modalText}>Confidence: {(selectedItem.confidence * 100).toFixed(1)}%</Text>
                  <Text style={styles.modalText}>Explanation: {selectedItem.explanation}</Text>
                </View>

                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionTitle}>Admin Notes</Text>
                  <TextInput
                    style={styles.notesInput}
                    placeholder="Add notes about this content..."
                    value={adminNotes}
                    onChangeText={setAdminNotes}
                    multiline
                    numberOfLines={4}
                  />
                </View>

                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionTitle}>Actions</Text>
                  <View style={styles.actionButtons}>
                    <TouchableOpacity
                      style={[styles.actionButton, styles.actionButtonResolve]}
                      onPress={() => updateFlaggedContent(selectedItem._id, 'resolved')}
                    >
                      <Text style={styles.actionButtonText}>Mark Resolved</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionButton, styles.actionButtonFalsePositive]}
                      onPress={() => updateFlaggedContent(selectedItem._id, 'false_positive')}
                    >
                      <Text style={styles.actionButtonText}>False Positive</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionButton, styles.actionButtonReviewed]}
                      onPress={() => updateFlaggedContent(selectedItem._id, 'reviewed')}
                    >
                      <Text style={styles.actionButtonText}>Mark Reviewed</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </>
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
  },
  backButton: {
    padding: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
  },
  headerRight: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6b7280',
  },
  statsContainer: {
    padding: 16,
    backgroundColor: '#fff',
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 12,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#f8fafc',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1f2937',
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },
  filtersContainer: {
    padding: 16,
    backgroundColor: '#fff',
    marginBottom: 8,
  },
  filterRow: {
    marginBottom: 16,
  },
  filterItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginRight: 12,
    minWidth: 60,
  },
  filterButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  filterButtonActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  filterButtonText: {
    fontSize: 12,
    color: '#374151',
  },
  filterButtonTextActive: {
    color: '#fff',
  },
  contentContainer: {
    padding: 16,
    backgroundColor: '#fff',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyStateText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6b7280',
  },
  contentCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  userInfo: {
    flex: 1,
  },
  userEmail: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
  },
  contentType: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  badges: {
    flexDirection: 'row',
    gap: 6,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#fff',
    textTransform: 'uppercase',
  },
  contentText: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
    marginBottom: 8,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  reason: {
    fontSize: 12,
    color: '#6b7280',
  },
  confidence: {
    fontSize: 12,
    color: '#6b7280',
  },
  dateText: {
    fontSize: 11,
    color: '#9ca3af',
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
  },
  pageButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#007AFF',
    borderRadius: 8,
  },
  pageButtonDisabled: {
    backgroundColor: '#e5e7eb',
  },
  pageButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  pageInfo: {
    fontSize: 14,
    color: '#6b7280',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
  },
  modalHeaderRight: {
    width: 24,
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  modalSection: {
    marginBottom: 24,
  },
  modalSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 8,
  },
  modalText: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 4,
  },
  modalContentText: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
    backgroundColor: '#f9fafb',
    padding: 12,
    borderRadius: 8,
  },
  notesInput: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#374151',
    textAlignVertical: 'top',
  },
  actionButtons: {
    gap: 12,
  },
  actionButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  actionButtonResolve: {
    backgroundColor: '#059669',
  },
  actionButtonFalsePositive: {
    backgroundColor: '#6b7280',
  },
  actionButtonReviewed: {
    backgroundColor: '#2563eb',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
}); 