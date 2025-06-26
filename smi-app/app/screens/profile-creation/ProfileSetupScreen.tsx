import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, Platform, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { FIREBASE_AUTH, FIRESTORE_DB } from '../../../FirebaseConfig';
import { useAuth } from '../../../contexts/AuthContext';

type Gender = 'Male' | 'Female';

type ProfileData = {
  name: string;
  dateOfBirth: Date;
  gender: Gender;
  height?: string;
  weight?: string;
  schoolName: string;
  city: string;
  phoneNumber: string;
  profileComplete: boolean;
  createdAt: Date;
  updatedAt: Date;
};

const ProfileSetupScreen = () => {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const { refreshUser } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    dateOfBirth: '',
    gender: 'Male' as Gender,
    height: '',
    weight: '',
    schoolName: '',
    city: '',
    phoneNumber: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});


  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.name.trim()) newErrors.name = 'Name is required';
    if (!formData.schoolName.trim()) newErrors.schoolName = 'School name is required';
    if (!formData.city.trim()) newErrors.city = 'City is required';
    if (!formData.phoneNumber.trim()) {
      newErrors.phoneNumber = 'Phone number is required';
    } else if (!/^[0-9]{10}$/.test(formData.phoneNumber)) {
      newErrors.phoneNumber = 'Please enter a valid 10-digit phone number';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setIsSubmitting(true);
    const user = FIREBASE_AUTH.currentUser;
    
    if (!user) {
      Alert.alert('Error', 'User not authenticated');
      setIsSubmitting(false);
      return;
    }

    try {
      const [day, month, year] = formData.dateOfBirth.split('/').map(Number);
      const birthDate = new Date(year, month - 1, day);
      
      const profileData: ProfileData = {
        ...formData,
        dateOfBirth: birthDate,
        profileComplete: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Save profile data to Firestore
      await setDoc(doc(FIRESTORE_DB, 'users', user.uid), profileData, { merge: true });
      
      // Force refresh the user context
      await refreshUser();
      
      // Direct navigation to the main app
      navigation.reset({
        index: 0,
        routes: [{ name: 'Inside' }],
      });
      
    } catch (error: any) {
      console.error('Error saving profile:', error);
      Alert.alert('Error', 'Failed to save profile. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDateInput = (text: string) => {
    setFormData(prev => ({
      ...prev,
      dateOfBirth: text,
    }));
  };

  const calculateAge = (birthDate: string) => {
    if (!birthDate) return '';
    const [day, month, year] = birthDate.split('/').map(Number);
    if (!day || !month || !year) return '';
    
    const today = new Date();
    const birthDateObj = new Date(year, month - 1, day);
    if (isNaN(birthDateObj.getTime())) return '';
    
    let age = today.getFullYear() - birthDateObj.getFullYear();
    const m = today.getMonth() - birthDateObj.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDateObj.getDate())) {
      age--;
    }
    return age > 0 ? `${age} years old` : '';
  };



  return (
    <ScrollView 
      style={styles.container} 
      contentContainerStyle={styles.contentContainer}
      keyboardShouldPersistTaps="handled"
    >
      
      {/* Name */}
      <View style={styles.inputContainer}>
        <Text style={styles.label}>Full Name *</Text>
        <TextInput
          style={[styles.input, errors.name && styles.inputError]}
          placeholder="Enter your full name"
          placeholderTextColor="#9CA3AF"
          value={formData.name}
          onChangeText={(text) => setFormData({ ...formData, name: text })}
        />
        {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}
      </View>

      {/* Date of Birth */}
      <View style={styles.inputContainer}>
        <Text style={styles.label}>Date of Birth (DD/MM/YYYY) *</Text>
          <TextInput
            style={[styles.input, errors.dateOfBirth && styles.inputError]}
            placeholder="DD/MM/YYYY"
            placeholderTextColor="#9CA3AF"
            value={formData.dateOfBirth}
            onChangeText={handleDateInput}
            keyboardType="numbers-and-punctuation"
            maxLength={10}
          />
          {formData.dateOfBirth && (
            <Text style={styles.ageText}>
              {calculateAge(formData.dateOfBirth)}
            </Text>
          )}
      </View>

      {/* Gender */}
      <View style={styles.inputContainer}>
        <Text style={styles.label}>Gender *</Text>
        <View style={[styles.genderContainer, errors.gender && styles.inputError]}>
          {['Male', 'Female'].map((gender) => (
            <TouchableOpacity
              key={gender}
              style={[
                styles.genderOption,
                formData.gender === gender && styles.genderOptionSelected,
              ]}
              onPress={() => setFormData({ ...formData, gender: gender as Gender })}
            >
              <Text 
                style={[
                  styles.genderText,
                  formData.gender === gender && styles.genderTextSelected,
                ]}
              >
                {gender}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Height and Weight */}
      <View style={styles.row}>
        <View style={[styles.inputContainer, { flex: 1, marginRight: 8 }]}>
          <Text style={styles.label}>Height (cm)</Text>
          <TextInput
            style={styles.input}
            placeholder="Height"
            placeholderTextColor="#9CA3AF"
            keyboardType="numeric"
            value={formData.height}
            onChangeText={(text) => setFormData({ ...formData, height: text })}
          />
        </View>
        <View style={[styles.inputContainer, { flex: 1, marginLeft: 8 }]}>
          <Text style={styles.label}>Weight (kg)</Text>
          <TextInput
            style={styles.input}
            placeholder="Weight"
            placeholderTextColor="#9CA3AF"
            keyboardType="numeric"
            value={formData.weight}
            onChangeText={(text) => setFormData({ ...formData, weight: text })}
          />
        </View>
      </View>

      {/* School Name */}
      <View style={styles.inputContainer}>
        <Text style={styles.label}>School Name *</Text>
        <TextInput
          style={[styles.input, errors.schoolName && styles.inputError]}
          placeholder="Enter your school name"
          placeholderTextColor="#9CA3AF"
          value={formData.schoolName}
          onChangeText={(text) => setFormData({ ...formData, schoolName: text })}
        />
        {errors.schoolName && <Text style={styles.errorText}>{errors.schoolName}</Text>}
      </View>

      {/* City */}
      <View style={styles.inputContainer}>
        <Text style={styles.label}>City/Town *</Text>
        <TextInput
          style={[styles.input, errors.city && styles.inputError]}
          placeholder="Enter your city"
          placeholderTextColor="#9CA3AF"
          value={formData.city}
          onChangeText={(text) => setFormData({ ...formData, city: text })}
        />
        {errors.city && <Text style={styles.errorText}>{errors.city}</Text>}
      </View>

      {/* Phone Number */}
      <View style={styles.inputContainer}>
        <View style={styles.phoneHeader}>
          <Text style={styles.label}>Contact Number *</Text>
        </View>
        <View style={styles.phoneInputContainer}>
          <View style={styles.countryCode}>
            <Text style={styles.countryCodeText}>+91</Text>
          </View>
          <TextInput
            style={[
              styles.input, 
              styles.phoneInput, 
              errors.phoneNumber && styles.inputError
            ]}
            placeholder="Phone number"
            placeholderTextColor="#9CA3AF"
            keyboardType="phone-pad"
            maxLength={10}
            value={formData.phoneNumber}
            onChangeText={(text) => {
              // Only allow numbers
              const numericValue = text.replace(/[^0-9]/g, '');
              setFormData({ ...formData, phoneNumber: numericValue });
            }}
          />
        </View>
        {errors.phoneNumber && <Text style={styles.errorText}>{errors.phoneNumber}</Text>}
      </View>

      {/* Submit Button */}
      <TouchableOpacity 
        style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]} 
        onPress={handleSubmit}
        disabled={isSubmitting}
      >
        {isSubmitting ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.submitButtonText}>Save Profile</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6', // Light gray background like prototype
  },
  contentContainer: {
    padding: 24,
    paddingBottom: 40,
  },
  header: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  headerContent: {
    alignItems: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
    fontFamily: 'System',
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 16,
    fontFamily: 'System',
  },
  progressBar: {
    height: 4,
    width: '100%',
    backgroundColor: '#E5E7EB',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    width: '60%',
    backgroundColor: '#3B82F6',
    borderRadius: 2,
  },
  inputContainer: {
    marginBottom: 20,
  },
  phoneHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  hintText: {
    fontSize: 12,
    color: '#6B7280',
  },
  label: {
    fontSize: 16,
    marginBottom: 8,
    color: '#374151', // Darker gray for labels
    fontWeight: '600',
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: Platform.OS === 'ios' ? 16 : 14,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#D1D5DB', // Light border
    color: '#1F2937',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  inputError: {
    borderColor: '#EF4444', // Red for errors
    borderWidth: 2,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 12,
    marginTop: 4,
    fontWeight: '500',
  },
  ageText: {
    color: '#6366F1', // Purple accent like prototype
    fontSize: 14,
    marginTop: 4,
    fontWeight: '500',
  },
  genderContainer: {
    flexDirection: 'row',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  genderOption: {
    flex: 1,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  genderOptionSelected: {
    backgroundColor: '#4F46E5', // Blue-purple gradient start color
  },
  genderText: {
    fontSize: 16,
    color: '#6B7280',
    fontWeight: '500',
  },
  genderTextSelected: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  phoneInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  countryCode: {
    backgroundColor: '#F9FAFB',
    padding: 16,
    borderTopLeftRadius: 12,
    borderBottomLeftRadius: 12,
    borderWidth: 1,
    borderRightWidth: 0,
    borderColor: '#D1D5DB',
    justifyContent: 'center',
  },
  countryCodeText: {
    fontSize: 16,
    color: '#374151',
    fontWeight: '600',
  },
  phoneInput: {
    flex: 1,
    borderTopLeftRadius: 0,
    borderBottomLeftRadius: 0,
  },
  submitButton: {
    backgroundColor: '#4F46E5', // Blue-purple gradient start
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 32,
    elevation: 3,
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  submitButtonDisabled: {
    backgroundColor: '#A5B4FC', // Lighter version when disabled
    elevation: 1,
    shadowOpacity: 0.1,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  openDatePickerButton: {
    marginTop: 8,
    backgroundColor: '#F3F4F6',
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  openDatePickerText: {
    color: '#374151',
    fontSize: 14,
    fontWeight: '500',
  },
});

export default ProfileSetupScreen;