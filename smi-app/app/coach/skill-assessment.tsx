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
import { FIRESTORE_DB } from '@/config/FirebaseConfig';

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
  const [selectedAssessment, setSelectedAssessment] = useState<SkillAssessmentRecord | null>(null);

  const handleSaveAssessment = async () => {
    if (!selectedStudent || !skill.trim() || !remark.trim()) {
      Alert.alert('Error', 'Please fill in all fields');
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
      setSelectedAssessment(null);
      
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

  return (
    <SafeAreaView style={styles.container}>
      {!showAssessmentForm ? (
        <Animated.View style={[styles.content, { opacity }]}>
          <View style={styles.header}>
            <TouchableOpacity onPress={onBack} style={styles.backButton}>
              <MaterialIcons name="arrow-back-ios" size={24} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.title}>Skill Assessment</Text>
            <View style={{ width: 24 }} />
          </View>
          
          <View style={styles.classInfo}>
            <Text style={styles.className}>{selectedClass.name}</Text>
            <Text style={styles.classDetails}>
              {selectedClass.subject} • {selectedClass.time}
            </Text>
          </View>
          
          <Text style={styles.sectionTitle}>Select Student</Text>
          
          <FlatList
            data={selectedClass.students}
            keyExtractor={(item) => item.id}
            renderItem={renderStudentItem}
            contentContainerStyle={styles.listContainer}
            showsVerticalScrollIndicator={false}
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
                  setSelectedAssessment(null);
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

            <View style={styles.formContainer}>
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Skill Category</Text>
                <View style={styles.inputWrapper}>
                  <TextInput
                    style={styles.input}
                    value={skill}
                    onChangeText={setSkill}
                    placeholder="e.g., Dribbling, Shooting, Defense"
                    placeholderTextColor="#9CA3AF"
                    selectionColor="#4F46E5"
                  />
                </View>
              </View>

              <View style={styles.ratingContainer}>
                <Text style={styles.label}>Rating</Text>
                <View style={styles.starsContainer}>
                  {renderRatingStars()}
                  <Text style={styles.ratingText}>
                    {rating === 5 ? 'Excellent' : 
                     rating >= 4 ? 'Very Good' : 
                     rating >= 3 ? 'Good' : 
                     rating >= 2 ? 'Needs Improvement' : 'Poor'}
                  </Text>
                </View>
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.label}>Detailed Feedback</Text>
                <View style={[styles.inputWrapper, styles.remarksWrapper]}>
                  <TextInput
                    style={[styles.input, styles.remarksInput]}
                    value={remark}
                    onChangeText={setRemark}
                    placeholder="Provide detailed feedback on the student's performance..."
                    placeholderTextColor="#9CA3AF"
                    multiline
                    numberOfLines={4}
                    textAlignVertical="top"
                    selectionColor="#4F46E5"
                  />
                </View>
              </View>

              <TouchableOpacity
                style={[styles.saveButton, loading && styles.saveButtonDisabled]}
                onPress={handleSaveAssessment}
                disabled={loading}
                activeOpacity={0.8}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <LinearGradient
                    colors={['#4F46E5', '#7C3AED']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.gradientButton}
                  >
                    <Text style={styles.saveButtonText}>
                      {selectedAssessment ? 'Update Assessment' : 'Save Assessment'}
                    </Text>
                    <MaterialIcons name="arrow-forward" size={20} color="#fff" style={{ marginLeft: 8 }} />
                  </LinearGradient>
                )}
              </TouchableOpacity>
            </View>
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
});

// No need for stylesWithStarButton as we're using inline styles now

export default SkillAssessment;
