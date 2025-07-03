import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  Modal,
  TextInput,
  Platform,
  Linking,
  Animated,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { FIREBASE_AUTH, FIRESTORE_DB } from '../../FirebaseConfig';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { useAuth } from '../../contexts/AuthContext';
import { ActivityIndicator } from 'react-native';

// Glassmorphism Card Component
const GlassCard = ({ children, style = {}, gradient = ['rgba(255,255,255,0.1)', 'rgba(255,255,255,0.05)'] }: {
  children: React.ReactNode;
  style?: any;
  gradient?: string[];
}) => {
  return (
    <LinearGradient
      colors={gradient}
      style={[styles.glassCard, style]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      {children}
    </LinearGradient>
  );
};

// Animated Stat Card Component
const StatCard = ({ icon, value, label, color, delay = 0 }: {
  icon: string;
  value: string | number;
  label: string;
  color: string;
  delay?: number;
}) => {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.delay(delay),
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  }, []);

  return (
    <Animated.View
      style={[
        styles.statCardContainer,
        {
          transform: [{ scale: scaleAnim }],
          opacity: fadeAnim,
        },
      ]}
    >
      <GlassCard style={styles.statCard}>
        <View style={[styles.statIcon, { backgroundColor: color + '20' }]}>
          <Ionicons name={icon as any} size={24} color={color} />
        </View>
        <Text style={styles.statValue}>{value}</Text>
        <Text style={styles.statLabel}>{label}</Text>
      </GlassCard>
    </Animated.View>
  );
};

export default function StudentProfileScreen() {
  const { user } = useAuth();
  const [loadingProfile, setLoadingProfile] = useState(true);
  
  type Profile = {
    name: string;
    email?: string;
    dateOfBirth: string | Date;
    gender: 'Male' | 'Female' | '';
    height?: string;
    weight?: string;
    schoolName: string;
    city: string;
    phoneNumber: string;
    photo?: string;
  };

  const blankProfile: Profile = {
    name: '',
    email: '',
    dateOfBirth: '',
    gender: '',
    height: '',
    weight: '',
    schoolName: '',
    city: '',
    phoneNumber: '',
    photo: '',
  };

  const [profile, setProfile] = useState<Profile>(blankProfile);
  const [isEditing, setIsEditing] = useState(false);
  const [editProfile, setEditProfile] = useState(profile);
  const [isEditModalVisible, setEditModalVisible] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  // Animation refs
  const headerAnim = useRef(new Animated.Value(0)).current;
  const profileImageAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Start animations when component mounts
    Animated.parallel([
      Animated.timing(headerAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(profileImageAnim, {
        toValue: 1,
        delay: 300,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  // Helper function to safely convert date to DD/MM/YYYY format
  const formatDate = (dateValue: string | Date | { toDate: () => Date } | null | undefined): string => {
    if (!dateValue) return '';
    
    try {
      let date: Date;
      
      if (typeof dateValue === 'object' && 'toDate' in dateValue) {
        date = dateValue.toDate();
      } else if (dateValue instanceof Date) {
        date = dateValue;
      } else if (typeof dateValue === 'string') {
        if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateValue)) {
          return dateValue;
        }
        date = new Date(dateValue);
      } else {
        date = new Date(dateValue as any);
      }
      
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      
      return `${day}/${month}/${year}`;
    } catch (e) {
      console.error('Error formatting date:', e);
      return String(dateValue);
    }
  };

  // Fetch profile from Firestore
  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) { setLoadingProfile(false); return; }
      try {
        const snap = await getDoc(doc(FIRESTORE_DB, 'users', user.uid));
        if (snap.exists()) {
          setProfile({ ...blankProfile, ...snap.data() });
        }
      } catch (e) {
        console.error('Failed to fetch profile', e);
      } finally {
        setLoadingProfile(false);
      }
    };
    fetchProfile();
  }, [user]);

  const handleLogout = async () => {
    setShowLogoutModal(true);
  };

  const confirmLogout = async () => {
    try {
      await signOut(FIREBASE_AUTH);
      setProfile(blankProfile);
      setShowLogoutModal(false);
    } catch (error) {
      console.error('Error during logout:', error);
    }
  };

  const cancelLogout = () => {
    setShowLogoutModal(false);
  };

  const handleEdit = () => {
    setEditProfile(profile);
    setEditModalVisible(true);
  };

  const handleSave = async () => {
    setProfile(editProfile);
    setEditModalVisible(false);

    if (user) {
      try {
        await setDoc(doc(FIRESTORE_DB, 'users', user.uid), { ...editProfile, updatedAt: new Date() }, { merge: true });
      } catch (e) {
        console.error('Failed to save profile', e);
      }
    }
  };

  const handlePickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });
    if (!result.canceled && result.assets && result.assets.length > 0) {
      setProfile({ ...profile, photo: result.assets[0].uri });
    }
  };

  const show = (val: string) => val && val.trim() ? val : 'Tap to add';
  const openPhone = () => Linking.openURL(`tel:${profile.phoneNumber.replace(/[^0-9+]/g, '')}`);

  if (loadingProfile) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6366f1" />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      
      {/* Animated Header */}
      <Animated.View style={[styles.header, { opacity: headerAnim }]}>
        <LinearGradient
          colors={['#6366f1', '#8b5cf6', '#ec4899']}
          style={styles.headerGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.headerContent}>
            {/* Profile Image */}
            <Animated.View
              style={[
                styles.profileImageContainer,
                {
                  transform: [
                    { scale: profileImageAnim },
                    {
                      rotateY: profileImageAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: ['180deg', '0deg'],
                      }),
                    },
                  ],
                },
              ]}
            >
              {profile.photo ? (
                <Image source={{ uri: profile.photo }} style={styles.profileImage} />
              ) : (
                <View style={styles.profileImagePlaceholder}>
                  <Ionicons name="person" size={48} color="rgba(255,255,255,0.7)" />
                </View>
              )}
              <TouchableOpacity style={styles.editImageButton} onPress={handlePickImage}>
                <LinearGradient
                  colors={['#10b981', '#059669']}
                  style={styles.editImageGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Ionicons name="camera" size={16} color="white" />
                </LinearGradient>
              </TouchableOpacity>
            </Animated.View>

            <Text style={styles.name}>{profile.name || 'Your Name'}</Text>
            <Text style={styles.schoolName}>{profile.schoolName || 'School Name'}</Text>

            {/* Action Buttons */}
            <View style={styles.headerActions}>
              <TouchableOpacity style={styles.actionButton} onPress={handleEdit}>
                <GlassCard style={styles.actionButtonContent}>
                  <Ionicons name="pencil" size={16} color="white" />
                  <Text style={styles.actionButtonText}>Edit</Text>
                </GlassCard>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.actionButton} onPress={handleLogout}>
                <GlassCard style={styles.actionButtonContent}>
                  <Ionicons name="log-out-outline" size={16} color="#ef4444" />
                  <Text style={[styles.actionButtonText, { color: '#ef4444' }]}>Logout</Text>
                </GlassCard>
              </TouchableOpacity>
            </View>
          </View>
        </LinearGradient>
      </Animated.View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Stats Section */}
        <View style={styles.statsSection}>
          <Text style={styles.sectionTitle}>Quick Stats</Text>
          <View style={styles.statsGrid}>
            <StatCard
              icon="calendar"
              value="15"
              label="Days Active"
              color="#6366f1"
              delay={0}
            />
            <StatCard
              icon="trophy"
              value="3"
              label="Badges Earned"
              color="#f59e0b"
              delay={100}
            />
            <StatCard
              icon="flame"
              value="7"
              label="Current Streak"
              color="#ef4444"
              delay={200}
            />
            <StatCard
              icon="star"
              value="1,247"
              label="Total Points"
              color="#10b981"
              delay={300}
            />
          </View>
        </View>

        {/* Personal Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Personal Information</Text>
          <GlassCard style={styles.infoCard}>
            <View style={styles.infoGrid}>
              <View style={styles.infoItem}>
                <Ionicons name="person-outline" size={20} color="#6366f1" />
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Gender</Text>
                  <Text style={styles.infoValue}>{profile.gender || 'Not specified'}</Text>
                </View>
              </View>
              
              <View style={styles.infoItem}>
                <Ionicons name="calendar-outline" size={20} color="#8b5cf6" />
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Date of Birth</Text>
                  <Text style={styles.infoValue}>{formatDate(profile.dateOfBirth) || 'Not specified'}</Text>
                </View>
              </View>
              
              <View style={styles.infoItem}>
                <Ionicons name="resize-outline" size={20} color="#10b981" />
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Height</Text>
                  <Text style={styles.infoValue}>{profile.height ? `${profile.height} cm` : 'Not specified'}</Text>
                </View>
              </View>
              
              <View style={styles.infoItem}>
                <Ionicons name="fitness-outline" size={20} color="#f59e0b" />
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Weight</Text>
                  <Text style={styles.infoValue}>{profile.weight ? `${profile.weight} kg` : 'Not specified'}</Text>
                </View>
              </View>
            </View>
          </GlassCard>
        </View>

        {/* Contact Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Contact Information</Text>
          <GlassCard style={styles.infoCard}>
            <TouchableOpacity style={styles.infoItem} onPress={openPhone}>
              <Ionicons name="call-outline" size={20} color="#6366f1" />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Phone</Text>
                <Text style={styles.infoValue}>{profile.phoneNumber || 'Not specified'}</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="rgba(255,255,255,0.5)" />
            </TouchableOpacity>
            
            <View style={styles.infoItem}>
              <Ionicons name="location-outline" size={20} color="#8b5cf6" />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>City</Text>
                <Text style={styles.infoValue}>{profile.city || 'Not specified'}</Text>
              </View>
            </View>
            
            <View style={styles.infoItem}>
              <Ionicons name="mail-outline" size={20} color="#10b981" />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Email</Text>
                <Text style={styles.infoValue}>{user?.email || 'Not available'}</Text>
              </View>
            </View>
          </GlassCard>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Edit Profile Modal */}
      <Modal
        visible={isEditModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <LinearGradient
            colors={['#6366f1', '#8b5cf6']}
            style={styles.modalHeader}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <TouchableOpacity onPress={() => setEditModalVisible(false)}>
              <Ionicons name="close" size={24} color="white" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Edit Profile</Text>
            <TouchableOpacity onPress={handleSave}>
              <Text style={styles.saveButtonText}>Save</Text>
            </TouchableOpacity>
          </LinearGradient>

          <ScrollView style={styles.modalContent}>
            {/* Modal form content would go here */}
            {/* This is a simplified version - you can expand with full form */}
            <Text style={styles.modalText}>Profile editing form would go here...</Text>
          </ScrollView>
        </View>
      </Modal>

      {/* Logout Confirmation Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={showLogoutModal}
        onRequestClose={cancelLogout}
      >
        <View style={styles.logoutModalOverlay}>
          <GlassCard style={styles.logoutModalContent}>
            <Text style={styles.logoutModalTitle}>Logout</Text>
            <Text style={styles.logoutModalText}>Are you sure you want to logout?</Text>
            <View style={styles.logoutModalButtons}>
              <TouchableOpacity style={styles.logoutModalButton} onPress={cancelLogout}>
                <Text style={styles.logoutModalButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.logoutModalButton, styles.logoutConfirmButton]} 
                onPress={confirmLogout}
              >
                <LinearGradient
                  colors={['#ef4444', '#dc2626']}
                  style={styles.logoutButtonGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Text style={[styles.logoutModalButtonText, { color: 'white' }]}>Logout</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </GlassCard>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f23',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0f0f23',
  },
  loadingText: {
    marginTop: 16,
    color: 'rgba(255,255,255,0.7)',
    fontSize: 16,
  },
  header: {
    paddingTop: 60,
    paddingBottom: 30,
  },
  headerGradient: {
    paddingHorizontal: 20,
  },
  headerContent: {
    alignItems: 'center',
  },
  profileImageContainer: {
    position: 'relative',
    marginBottom: 20,
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 4,
    borderColor: 'white',
  },
  profileImagePlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 4,
    borderColor: 'white',
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  editImageButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
  },
  editImageGradient: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'white',
  },
  name: {
    fontSize: 28,
    fontWeight: '700',
    color: 'white',
    marginBottom: 4,
    textAlign: 'center',
  },
  schoolName: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 20,
    textAlign: 'center',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
  },
  actionButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 16,
    gap: 8,
  },
  actionButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  statsSection: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: 'white',
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statCardContainer: {
    width: '48%',
  },
  statCard: {
    padding: 16,
    alignItems: 'center',
    borderRadius: 16,
  },
  statIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: 'white',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
  },
  section: {
    marginBottom: 24,
  },
  glassCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  infoCard: {
    padding: 20,
  },
  infoGrid: {
    gap: 16,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  infoContent: {
    flex: 1,
    marginLeft: 16,
  },
  infoLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 16,
    color: 'white',
    fontWeight: '500',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#0f0f23',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: 'white',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  modalText: {
    color: 'white',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 50,
  },
  logoutModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  logoutModalContent: {
    width: '100%',
    maxWidth: 320,
    padding: 24,
    borderRadius: 20,
    alignItems: 'center',
  },
  logoutModalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: 'white',
    marginBottom: 12,
  },
  logoutModalText: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
    marginBottom: 24,
  },
  logoutModalButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  logoutModalButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  logoutConfirmButton: {
    backgroundColor: 'transparent',
  },
  logoutButtonGradient: {
    width: '100%',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
  },
  logoutModalButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
});