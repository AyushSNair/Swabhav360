import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  FlatList, 
  TextInput, 
  KeyboardAvoidingView, 
  Platform,
  ScrollView,
  ActivityIndicator,
  Dimensions,
  Animated,
  Easing,
  SafeAreaView,
  Alert
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { collection, doc, setDoc, getDocs, query, where } from 'firebase/firestore';
import { FIRESTORE_DB } from '../../FirebaseConfig';

const { width, height } = Dimensions.get('window');

interface Student {
  id: string;
  name: string;
  email: string;
}

interface Class {
  id: string;
  name: string;
  subject: string;
  time: string;
  students: Student[];
}

interface SkillAssessmentRecord {
  studentId: string;
  date: string;
  skill: string;
  remark: string;
  rating: number;
}

interface Skill {
  name: string;
  level: 'Excellent' | 'Good' | 'Needs Improvement';
}

interface StudentSkill {
  name: string;
  skills: Skill[];
}

interface SkillAssessmentProps {
  selectedClass: Class;
  onBack: () => void;
  onSave: (classId: string, assessment: SkillAssessmentRecord) => Promise<void>;
}

const SkillAssessment: React.FC<SkillAssessmentProps> = ({ selectedClass, onBack, onSave }) => {
  const [animation] = useState(new Animated.Value(0));
  
  useEffect(() => {
    Animated.timing(animation, {
      toValue: 1,
      duration: 500,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, []);
  
  const translateY = animation.interpolate({
    inputRange: [0, 1],
    outputRange: [50, 0],
  });
  
  const opacity = animation.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [skill, setSkill] = useState('');
  const [remark, setRemark] = useState('');
  const [rating, setRating] = useState(3);
  const [loading, setLoading] = useState(false);
  const [assessments, setAssessments] = useState<SkillAssessmentRecord[]>([]);
  const [showAssessmentForm, setShowAssessmentForm] = useState(false);

  const [error, setError] = useState<string | null>(null);

  const handleSaveAssessment = async () => {
    if (!selectedStudent || !skill.trim() || !remark.trim()) {
      setError('Please fill in all fields');
      return;
    }

    const assessment: SkillAssessmentRecord = {
      studentId: selectedStudent.id,
      date: new Date().toISOString().split('T')[0],
      skill: skill.trim(),
      remark: remark.trim(),
      rating: Math.min(5, Math.max(1, rating))
    };

    setLoading(true);
    setError(null); // Clear previous errors
    try {
      const assessmentsRef = collection(FIRESTORE_DB, 'skillAssessments');
      const docRef = doc(assessmentsRef);
      
      await setDoc(docRef, {
        ...assessment,
        classId: selectedClass.id,
        studentName: selectedStudent.name,
        createdAt: new Date().toISOString()
      });
      
      setAssessments([...assessments, assessment]);
      setSkill('');
      setRemark('');
      setRating(3);
      setShowAssessmentForm(false);
      
      Alert.alert('Success', 'Skill assessment saved successfully');
    } catch (error) {
      console.error('Error saving assessment:', error);
      Alert.alert('Error', 'Failed to save assessment');
    } finally {
      setLoading(false);
    }
  };

  const renderRatingStars = () => {
    return (
      <View style={{ flexDirection: 'row', justifyContent: 'center' }}>
        {[1, 2, 3, 4, 5].map((star) => (
          <TouchableOpacity 
            key={star} 
            onPress={() => setRating(star)}
            activeOpacity={0.7}
            style={{
              padding: 8,
              marginHorizontal: 2,
            }}
          >
            <MaterialIcons
              name={star <= rating ? 'star' : 'star-border'}
              size={36}
              color={star <= rating ? '#F59E0B' : '#E5E7EB'}
            />
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  const renderStudentItem = ({ item }: { item: Student }) => (
    <Animated.View 
      style={{
        opacity,
        transform: [{ translateY }],
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#fff',
        padding: 16,
        marginBottom: 12,
        borderRadius: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
      }}
    >
      <View style={styles.studentInfo}>
        <MaterialIcons name="person" size={28} color="#4F46E5" style={styles.avatar} />
        <Text style={styles.studentName}>{item.name}</Text>
      </View>
      <TouchableOpacity 
        style={styles.assessButton}
        onPress={() => {
          setSelectedStudent(item);
          setShowAssessmentForm(true);
        }}
      >
        <Text style={styles.assessButtonText}>Assess</Text>
        <MaterialIcons name="chevron-right" size={20} color="#4F46E5" />
      </TouchableOpacity>
    </Animated.View>
  );

  const renderStudentSkillRow = ({ item, index }: { item: StudentSkill; index: number }) => (
    <View style={styles.skillCardModern}>
      <LinearGradient
        colors={["#7C3AED", "#4F46E5"]}
        style={styles.skillAvatar}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <MaterialIcons name="person" size={24} color="#fff" />
      </LinearGradient>
      <View style={styles.skillInfoModern}>
        <Text style={styles.skillNameModern}>{`🧑‍🎓 ${item.name}`}</Text>
        <View style={styles.skillChipsRow}>
          {item.skills.map((skill: Skill, idx: number) => (
            <View key={idx} style={[styles.skillChip, { backgroundColor: skill.level === 'Excellent' ? '#D1FAE5' : skill.level === 'Good' ? '#DBEAFE' : '#FEE2E2' }]}> 
              <Text style={[styles.skillChipText, { color: skill.level === 'Excellent' ? '#059669' : skill.level === 'Good' ? '#2563EB' : '#B91C1C' }]}>{skill.name}: {skill.level}</Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {!showAssessmentForm ? (
        <Animated.View style={[styles.content, { opacity }]}>
          <LinearGradient
            colors={["#7C3AED", "#4F46E5"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ borderBottomLeftRadius: 32, borderBottomRightRadius: 32, paddingBottom: 32, paddingTop: 48, paddingHorizontal: 24 }}
          >
            <TouchableOpacity
              onPress={onBack}
              style={{ position: 'absolute', top: 24, left: 18, zIndex: 10, flexDirection: 'row', alignItems: 'center', padding: 6 }}
              activeOpacity={0.7}
            >
              <MaterialIcons name="arrow-back" size={28} color="#fff" />
              <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16, marginLeft: 4, fontFamily: 'Nunito_700Bold' }}>⬅️ Back</Text>
            </TouchableOpacity>
            <Text style={{ fontSize: 28, fontWeight: 'bold', color: '#fff', textAlign: 'center', fontFamily: 'Nunito_700Bold', marginBottom: 12 }}>Skill Assessment 📊</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 18, padding: 18, shadowColor: '#7C3AED', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.10, shadowRadius: 8, elevation: 3, alignSelf: 'center', marginBottom: 8 }}>
              <MaterialIcons name="class" size={28} color="#7C3AED" style={{ marginRight: 12 }} />
              <Text style={{ fontSize: 20, fontWeight: '700', color: '#7C3AED', fontFamily: 'Nunito_700Bold' }}>{selectedClass.name} 🏫</Text>
            </View>
          </LinearGradient>
          
          <View style={styles.classInfo}>
            <Text style={styles.className}>{selectedClass.name}</Text>
            <Text style={styles.classDetails}>
              {selectedClass.subject} • {selectedClass.time}
            </Text>
          </View>
          
          <Text style={{ fontSize: 20, fontWeight: '700', color: '#1F2937', marginTop: 28, marginLeft: 24, marginBottom: 12, fontFamily: 'Nunito_700Bold' }}>Skill Assessment 📊</Text>
          
          <FlatList
            data={selectedClass.students}
            contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32 }}
            renderItem={({ item, index }) => (
              <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 16, paddingVertical: 18, paddingHorizontal: 18, marginBottom: 16, shadowColor: '#7C3AED', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.10, shadowRadius: 8, elevation: 3 }}>
                <MaterialIcons name="person" size={28} color="#7C3AED" style={{ marginRight: 16 }} />
                <Text style={{ fontSize: 17, fontWeight: '600', color: '#3730A3', fontFamily: 'Nunito_700Bold', flex: 1 }}>{`🧑‍🎓 ${item.name}`}</Text>
                <TouchableOpacity
                  style={{ backgroundColor: '#7C3AED', borderRadius: 16, paddingVertical: 8, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', elevation: 2 }}
                  onPress={() => {
                    setSelectedStudent(item);
                    setShowAssessmentForm(true);
                  }}
                  activeOpacity={0.85}
                >
                  <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15, fontFamily: 'Nunito_700Bold', marginRight: 6 }}>Assess ✍️</Text>
                  <MaterialIcons name="arrow-forward" size={20} color="#fff" />
                </TouchableOpacity>
              </View>
            )}
            keyExtractor={item => item.id}
          />
        </Animated.View>
      ) : (
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.flex1}
        >
          <ScrollView 
            contentContainerStyle={styles.scrollContainer}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.header}>
              <TouchableOpacity 
                onPress={() => {
                  setShowAssessmentForm(false);
                  setSelectedStudent(null);
                }} 
                style={styles.backButton}
              >
                <MaterialIcons name="arrow-back-ios" size={24} color="#fff" />
              </TouchableOpacity>
              <Text style={styles.title}>
                {selectedStudent?.name}'s Skills
              </Text>
              <View style={{ width: 24 }} />
            </View>

            {showAssessmentForm && selectedStudent && (
              <Animated.View style={[styles.assessmentFormCard, { opacity, transform: [{ translateY }] }]}> 
                <LinearGradient
                  colors={["#7C3AED", "#4F46E5"]}
                  style={styles.assessmentFormHeader}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <MaterialIcons name="person" size={36} color="#fff" style={styles.assessmentAvatar} />
                  <Text style={styles.assessmentStudentName}>{selectedStudent.name}</Text>
                </LinearGradient>
                <View style={styles.assessmentFormBody}>
                  <View style={styles.inputGroup}>
                    <MaterialIcons name="star" size={20} color="#6366F1" style={styles.inputIcon} />
                    <TextInput
                      style={styles.inputModern}
                      placeholder="Skill (e.g. Communication)"
                      placeholderTextColor="#A5B4FC"
                      value={skill}
                      onChangeText={setSkill}
                    />
                  </View>
                  <View style={styles.inputGroup}>
                    <MaterialIcons name="comment" size={20} color="#6366F1" style={styles.inputIcon} />
                    <TextInput
                      style={[styles.inputModern, { height: 60 }]}
                      placeholder="Remark"
                      placeholderTextColor="#A5B4FC"
                      value={remark}
                      onChangeText={setRemark}
                      multiline
                    />
                  </View>
                  <Text style={styles.ratingLabel}>Rating</Text>
                  <View style={styles.ratingRow}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <TouchableOpacity 
                        key={star} 
                        onPress={() => setRating(star)}
                        activeOpacity={0.7}
                        style={rating === star ? styles.ratingStarActive : styles.ratingStar}
                      >
                        <MaterialIcons
                          name={star <= rating ? 'star' : 'star-border'}
                          size={40}
                          color={star <= rating ? '#F59E0B' : '#E5E7EB'}
                        />
                      </TouchableOpacity>
                    ))}
                  </View>
                  <Text style={styles.ratingValue}>{rating} / 5</Text>
                  {error && <Text style={styles.errorText}>{error}</Text>}
                  <View style={styles.buttonRowModern}>
                    <TouchableOpacity style={styles.cancelButtonModern} onPress={() => setShowAssessmentForm(false)}>
                      <MaterialIcons name="close" size={20} color="#7C3AED" />
                      <Text style={styles.cancelButtonTextModern}>❌ Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.saveButtonModern} onPress={handleSaveAssessment} disabled={loading}>
                      <MaterialIcons name="save" size={20} color="#10B981" />
                      <Text style={styles.saveButtonTextModern}>{loading ? 'Saving...' : 'Save ✅'}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </Animated.View>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  content: {
    flex: 1,
  },
  flex1: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#4F46E5',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  title: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    flex: 1,
  },
  classInfo: {
    padding: 20,
    backgroundColor: '#fff',
    margin: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  className: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  classDetails: {
    fontSize: 14,
    color: '#6B7280',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4B5563',
    marginHorizontal: 24,
    marginTop: 8,
    marginBottom: 12,
  },
  listContainer: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  studentCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    marginBottom: 12,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  studentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#EEF2FF',
    textAlign: 'center',
    lineHeight: 40,
    marginRight: 12,
  },
  studentName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  assessButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: '#EEF2FF',
    borderRadius: 20,
  },
  assessButtonText: {
    color: '#4F46E5',
    fontSize: 14,
    fontWeight: '600',
    marginRight: 4,
  },
  scrollContainer: {
    flexGrow: 1,
    paddingBottom: 40,
    paddingTop: 8,
  },
  formContainer: {
    padding: 20,
    flex: 1,
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputWrapper: {
    backgroundColor: '#fff',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    overflow: 'hidden',
  },
  input: {
    padding: 16,
    fontSize: 16,
    color: '#111827',
  },
  remarksWrapper: {
    minHeight: 140,
  },
  remarksInput: {
    textAlignVertical: 'top',
    paddingTop: 16,
  },
  label: {
    fontSize: 14,
    color: '#4B5563',
    marginBottom: 8,
    fontWeight: '600',
    marginLeft: 4,
  },
  ratingContainer: {
    marginBottom: 24,
  },
  starsContainer: {
    alignItems: 'center',
    marginTop: 8,
  },
  ratingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#4F46E5',
    fontWeight: '600',
  },
  saveButton: {
    marginTop: 16,
    borderRadius: 12,
    overflow: 'hidden',
  },
  gradientButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  saveButtonDisabled: {
    opacity: 0.7,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  skillCardModern: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#fff',
    borderRadius: 18,
    marginBottom: 16,
    paddingVertical: 16,
    paddingHorizontal: 16,
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.10,
    shadowRadius: 10,
    elevation: 5,
  },
  skillAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  skillInfoModern: {
    flex: 1,
    justifyContent: 'center',
  },
  skillNameModern: {
    fontSize: 16,
    fontWeight: '600',
    color: '#3730A3',
    marginBottom: 6,
  },
  skillChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  skillChip: {
    borderRadius: 12,
    paddingVertical: 4,
    paddingHorizontal: 10,
    marginRight: 8,
    marginBottom: 6,
  },
  skillChipText: {
    fontWeight: '600',
    fontSize: 13,
  },
  buttonRowModern: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 24,
    marginBottom: 8,
    paddingHorizontal: 12,
  },
  backButtonModern: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#6366F1',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 18,
    marginRight: 8,
    borderWidth: 2,
    borderColor: '#6366F1',
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.10,
    shadowRadius: 8,
    elevation: 3,
  },
  backButtonTextModern: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
    marginLeft: 8,
  },
  saveButtonModern: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderWidth: 2,
    borderColor: '#10B981',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.10,
    shadowRadius: 8,
    elevation: 3,
  },
  saveButtonTextModern: {
    color: '#10B981',
    fontWeight: '700',
    fontSize: 15,
    marginLeft: 8,
  },
  assessmentFormCard: {
    backgroundColor: '#fff',
    borderRadius: 24,
    marginTop: 32,
    marginHorizontal: 16,
    marginBottom: 18,
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.16,
    shadowRadius: 18,
    elevation: 10,
    overflow: 'hidden',
  },
  assessmentFormHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 22,
    paddingHorizontal: 20,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  assessmentAvatar: {
    marginRight: 16,
  },
  assessmentStudentName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  assessmentFormBody: {
    padding: 22,
    paddingBottom: 10,
  },
  inputGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EEF2FF',
    borderRadius: 14,
    marginBottom: 16,
    paddingHorizontal: 10,
  },
  inputIcon: {
    marginRight: 8,
  },
  inputModern: {
    flex: 1,
    fontSize: 16,
    color: '#3730A3',
    paddingVertical: 10,
    backgroundColor: 'transparent',
    // Ensure editable look
    borderWidth: 0,
  },
  ratingLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#6366F1',
    marginBottom: 12,
    marginTop: 12,
  },
  ratingRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 12,
  },
  ratingStar: {
    transform: [{ scale: 1 }],
    marginHorizontal: 2,
  },
  ratingStarActive: {
    transform: [{ scale: 1.15 }],
    marginHorizontal: 2,
  },
  ratingValue: {
    textAlign: 'center',
    fontSize: 15,
    color: '#6366F1',
    fontWeight: '600',
    marginBottom: 18,
  },
  errorText: {
    color: '#EF4444',
    fontWeight: '600',
    fontSize: 14,
    marginBottom: 10,
    textAlign: 'center',
  },
  cancelButtonModern: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    paddingVertical: 2,
    paddingHorizontal: 18,
    marginRight: 8,
    borderWidth: 2,
    borderColor: '#7C3AED',
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.10,
    shadowRadius: 8,
    elevation: 3,
  },
  cancelButtonTextModern: {
    color: '#7C3AED',
    fontWeight: '700',
    fontSize: 15,
    marginLeft: 2,
  },
});

// No need for stylesWithStarButton as we're using inline styles now

export default SkillAssessment;
