import React, { useState, useEffect } from 'react';
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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { FIREBASE_AUTH, FIRESTORE_DB } from '../../FirebaseConfig';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { useAuth } from '../../contexts/AuthContext';
import { ActivityIndicator } from 'react-native';
import i18n from '../../i18n';

export default function StudentProfileScreen() {
  const { user } = useAuth();
  const navigation = useNavigation();
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
  
  // Helper function to safely convert date to DD/MM/YYYY format
  const formatDate = (dateValue: string | Date | { toDate: () => Date } | null | undefined): string => {
    if (!dateValue) return '';
    
    try {
      let date: Date;
      
      // Convert to Date object
      if (typeof dateValue === 'object' && 'toDate' in dateValue) {
        date = dateValue.toDate(); // Firestore Timestamp
      } else if (dateValue instanceof Date) {
        date = dateValue; // JavaScript Date
      } else if (typeof dateValue === 'string') {
        // If it's already in DD/MM/YYYY format, return as is
        if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateValue)) {
          return dateValue;
        }
        // Try to parse the string as a date
        date = new Date(dateValue);
      } else {
        date = new Date(dateValue as any);
      }
      
      // Format as DD/MM/YYYY
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      
      return `${day}/${month}/${year}`;
    } catch (e) {
      console.error('Error formatting date:', e);
      return String(dateValue);
    }
  };

  const [isEditing, setIsEditing] = useState(false);
  const [editProfile, setEditProfile] = useState(profile);
  const [isEditModalVisible, setEditModalVisible] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

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
    console.log('Logout button clicked');
    setShowLogoutModal(true);
  };

  const confirmLogout = async () => {
    try {
      console.log('User confirmed logout');
      await signOut(FIREBASE_AUTH);
      setProfile(blankProfile);
      setShowLogoutModal(false);
      navigation.reset({
        index: 0,
        routes: [{ name: 'Login' }],
      });
    } catch (error) {
      console.error('Error during logout:', error);
      // Even if we can't show the alert, at least log the error
      console.error('Failed to sign out:', error);
    }
  };

  const cancelLogout = () => {
    console.log('User cancelled logout');
    setShowLogoutModal(false);
  };

  const handleEdit = () => {
    setEditProfile(profile);
    setEditModalVisible(true);
  };

  const handleSave = async () => {
    setProfile(editProfile);
    setEditModalVisible(false);

    // Persist changes
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
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
      {/* Profile Header */}
      <View style={styles.header}>
        <View style={styles.profileImageContainer}>
          {profile.photo ? (
            <Image source={{ uri: profile.photo }} style={styles.profileImage} />
          ) : (
            <View style={[styles.profileImage, { borderWidth: 2, borderColor: '#3b82f6', backgroundColor: '#fff' }]} />
          )}
          <TouchableOpacity style={styles.editImageButton} onPress={handlePickImage}>
            <Ionicons name="camera" size={20} color="#3b82f6" />
          </TouchableOpacity>
        </View>
        <Text style={styles.name}>{profile.name}</Text>
        <Text style={styles.studentId}>{i18n.t('school')}: {profile.schoolName}</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.editButton} onPress={handleEdit}>
            <Ionicons name="pencil" size={16} color="#3b82f6" />
            <Text style={styles.editButtonText}>{i18n.t('edit_profile')}</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.logoutButton} 
            onPress={() => {
              console.log('Logout button pressed');
              handleLogout();
            }}
            activeOpacity={0.7}
          >
            <Ionicons name="log-out-outline" size={16} color="#ef4444" />
            <Text style={styles.logoutButtonText}>{i18n.t('logout')}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Academic Info */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{i18n.t('personal_information')}</Text>
        <View style={styles.infoRowCard}>
          <View style={styles.infoRowCol}>
            <Text style={styles.infoLabel}>{i18n.t('gender')}</Text>
            <Text style={styles.infoValue}>{profile.gender ? i18n.t(profile.gender.toLowerCase()) : ''}</Text>
            <Text style={styles.infoLabel}>{i18n.t('date_of_birth')}</Text>
            <Text style={styles.infoValue}>
              {show(formatDate(profile.dateOfBirth))}
            </Text>
          </View>
          <View style={styles.infoRowCol}>
            <Text style={styles.infoLabel}>{i18n.t('height')}</Text>
            <Text style={styles.infoValue}>{show(profile.height || '')}</Text>
            <Text style={styles.infoLabel}>{i18n.t('weight')}</Text>
            <Text style={styles.infoValue}>{show(profile.weight || '')}</Text>
          </View>
        </View>
      </View>

      {/* Contact Info */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{i18n.t('contact_information')}</Text>
        <View style={styles.infoRowCard}>
          <TouchableOpacity style={styles.infoRow} onPress={openPhone}>
            <Ionicons name="call-outline" size={18} color="#64748b" style={styles.infoIcon} />
            <Text style={styles.infoLabel}>{i18n.t('phone')}</Text>
            <Text style={[styles.infoValueRight, !profile.phoneNumber && styles.placeholderText]}>{show(profile.phoneNumber)}</Text>
          </TouchableOpacity>
          <View style={styles.infoRow}>
            <Ionicons name="location-outline" size={18} color="#64748b" style={styles.infoIcon} />
            <Text style={styles.infoLabel}>{i18n.t('city')}</Text>
            <Text style={[styles.infoValueRight, !profile.city && styles.placeholderText]}>{show(profile.city)}</Text>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{i18n.t('school_information')}</Text>
        <View style={styles.infoRowCard}>
          <Text style={styles.infoLabel}>{i18n.t('school_name')}</Text>
          <Text style={styles.infoValue}>{profile.schoolName}</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{i18n.t('account_information')}</Text>
        <View style={styles.infoRowCard}>
          <Text style={styles.infoLabel}>{i18n.t('email')}</Text>
          <Text style={styles.infoValue}>{user?.email || 'Not available'}</Text>
        </View>
      </View>

      {/* Edit Profile Modal */}
      <Modal
        visible={isEditModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setEditModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{i18n.t('edit_profile')}</Text>
            <ScrollView style={styles.modalScrollView}>
              <Text style={styles.inputLabel}>{i18n.t('name')} *</Text>
              <TextInput
                style={styles.input}
                value={editProfile.name}
                onChangeText={text => setEditProfile({ ...editProfile, name: text })}
                placeholder={i18n.t('enter_full_name')}
              />

              <Text style={styles.inputLabel}>{i18n.t('date_of_birth')} (DD/MM/YYYY) *</Text>
              <TextInput
                style={styles.input}
                value={typeof editProfile.dateOfBirth === 'string' 
                  ? editProfile.dateOfBirth 
                  : formatDate(editProfile.dateOfBirth)}
                onChangeText={text => setEditProfile({ ...editProfile, dateOfBirth: text })}
                placeholder={i18n.t('dob_placeholder')}
                keyboardType="numbers-and-punctuation"
              />

              <Text style={styles.inputLabel}>{i18n.t('gender')} *</Text>
              <View style={styles.genderContainer}>
                {['Male', 'Female'].map((gender) => (
                  <TouchableOpacity
                    key={gender}
                    style={[
                      styles.genderOption,
                      editProfile.gender === gender && styles.genderOptionSelected,
                    ]}
                    onPress={() => setEditProfile({ ...editProfile, gender: gender as 'Male' | 'Female' })}
                  >
                    <Text
                      style={[
                        styles.genderText,
                        editProfile.gender === gender && styles.genderTextSelected,
                      ]}
                    >
                      {gender}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.row}>
                <View style={styles.column}>
                  <Text style={styles.inputLabel}>{i18n.t('height')} (cm)</Text>
                  <TextInput
                    style={styles.input}
                    value={editProfile.height}
                    onChangeText={text => setEditProfile({ ...editProfile, height: text })}
                    keyboardType="numeric"
                    placeholder={i18n.t('height_placeholder')}
                  />
                </View>
                <View style={styles.column}>
                  <Text style={styles.inputLabel}>{i18n.t('weight')} (kg)</Text>
                  <TextInput
                    style={styles.input}
                    value={editProfile.weight}
                    onChangeText={text => setEditProfile({ ...editProfile, weight: text })}
                    keyboardType="numeric"
                    placeholder={i18n.t('weight_placeholder')}
                  />
                </View>
              </View>

              <Text style={styles.inputLabel}>{i18n.t('school_name')} *</Text>
              <TextInput
                style={styles.input}
                value={editProfile.schoolName}
                onChangeText={text => setEditProfile({ ...editProfile, schoolName: text })}
                placeholder={i18n.t('enter_school_name')}
              />

              <Text style={styles.inputLabel}>{i18n.t('city')} *</Text>
              <TextInput
                style={styles.input}
                value={editProfile.city}
                onChangeText={text => setEditProfile({ ...editProfile, city: text })}
                placeholder={i18n.t('enter_city')}
              />

              <Text style={styles.inputLabel}>{i18n.t('phone_number')} *</Text>
              <TextInput
                style={styles.input}
                value={editProfile.phoneNumber}
                onChangeText={text => setEditProfile({ ...editProfile, phoneNumber: text })}
                keyboardType="phone-pad"
                placeholder={i18n.t('enter_phone_number')}
              />
            </ScrollView>
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
                <Text style={styles.saveButtonText}>{i18n.t('save')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.cancelButton} onPress={() => setEditModalVisible(false)}>
                <Text style={styles.cancelButtonText}>{i18n.t('cancel')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Logout Confirmation Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={showLogoutModal}
        onRequestClose={cancelLogout}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{i18n.t('logout')}</Text>
            <Text style={styles.modalText}>{i18n.t('logout_confirm')}</Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.cancelButton]} 
                onPress={cancelLogout}
              >
                <Text style={styles.cancelButtonText}>{i18n.t('cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalButton, styles.logoutConfirmButton]} 
                onPress={confirmLogout}
              >
                <Text style={styles.logoutButtonText}>{i18n.t('logout')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 24,
    width: '90%',
    maxWidth: 320,
    maxHeight: '80%',
    elevation: 5,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#1e293b',
  },
  modalText: {
    fontSize: 16,
    color: '#4b5563',
    marginBottom: 24,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  modalButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    minWidth: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutConfirmButton: {
    backgroundColor: '#fee2e2',
  },
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    alignItems: 'center',
    paddingTop: 40,
    paddingBottom: 24,
    backgroundColor: '#fff',
  },
  profileImageContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    borderColor: '#3b82f6',
    backgroundColor: '#f3f4f6',
  },
  editImageButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#fff',
    borderRadius: 20,
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#3b82f6',
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 4,
  },
  studentId: {
    fontSize: 16,
    color: '#64748b',
    marginBottom: 16,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eff6ff',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  editButtonText: {
    color: '#3b82f6',
    fontSize: 14,
    fontWeight: '500',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef2f2',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  placeholderText: {
    color: '#9ca3af',
    fontStyle: 'italic',
  },
  logoutButtonText: {
    color: '#ef4444',
    fontSize: 14,
    fontWeight: '500',
  },
  section: {
    paddingHorizontal: 0,
    paddingVertical: 16,
    backgroundColor: '#f8fafc',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 12,
    marginLeft: 16,
  },
  infoRowCard: {
    backgroundColor: '#f6f8fa',
    borderRadius: 12,
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 16,
    flexDirection: 'column',
    gap: 8,
  },
  infoRowCol: {
    flex: 1,
    flexDirection: 'column',
    marginBottom: 8,
  },
  infoLabel: {
    fontSize: 13,
    color: '#64748b',
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 8,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  infoIcon: {
    marginRight: 8,
  },
  infoValueRight: {
    marginLeft: 'auto',
    fontSize: 15,
    color: '#1e293b',
    fontWeight: '500',
    maxWidth: 180,
    textAlign: 'right',
  },
  modalScrollView: {
    maxHeight: '70%',
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 12,
    marginBottom: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    padding: 10,
    fontSize: 16,
    backgroundColor: '#f8fafc',
    marginBottom: 4,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 16,
  },
  saveButton: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  cancelButton: {
    backgroundColor: '#e5e7eb',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  cancelButtonText: {
    color: '#1e293b',
    fontWeight: 'bold',
    fontSize: 16,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  column: {
    width: '48%',
  },
  genderContainer: {
    flexDirection: 'row',
    marginBottom: 16,
    gap: 12,
  },
  genderOption: {
    flex: 1,
    padding: 12,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    alignItems: 'center',
  },
  genderOptionSelected: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  genderText: {
    color: '#4b5563',
    fontWeight: '500',
  },
  genderTextSelected: {
    color: 'white',
    fontWeight: '600',
  },
}); 