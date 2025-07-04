import React, { useEffect, useState } from 'react';
import { View, Text, Button, FlatList, ActivityIndicator } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { FIRESTORE_DB } from '../../FirebaseConfig';
import { collection, getDoc, getDocs, doc, updateDoc } from 'firebase/firestore';
import { addStudentToClass, removeStudentFromClass, deleteClass } from '../../services/classService';

export default function ClassDetailsScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { classId, className } = route.params as { classId: string; className: string };
  const [classData, setClassData] = useState<any>(null);
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [studentLoading, setStudentLoading] = useState(false);
  const [showStudentManager, setShowStudentManager] = useState(false);

  useEffect(() => {
    fetchClass();
    fetchStudents();
  }, []);

  async function fetchClass() {
    setLoading(true);
    const classDoc = await getDoc(doc(FIRESTORE_DB, 'classes', classId));
    setClassData(classDoc.data());
    setLoading(false);
  }

  async function fetchStudents() {
    setStudentLoading(true);
    const usersRef = collection(FIRESTORE_DB, 'users');
    const usersSnap = await getDocs(usersRef);
    const usersList = usersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    setStudents(usersList);
    setStudentLoading(false);
  }

  async function handleStudentToggle(studentId: string, isInClass: boolean) {
    if (isInClass) {
      await removeStudentFromClass(classId, studentId);
    } else {
      await addStudentToClass(classId, studentId);
    }
    fetchClass();
  }

  if (loading) return <ActivityIndicator size="large" style={{ marginTop: 40 }} />;

  return (
    <View style={{ flex: 1, padding: 20 }}>
      <Text style={{ fontSize: 22, fontWeight: 'bold', marginBottom: 10 }}>{className}</Text>
      <Text style={{ marginBottom: 20 }}>Class ID: {classId}</Text>
      <Button
        title="Delete Class"
        color="red"
        onPress={async () => {
          await deleteClass(classId);
          navigation.goBack();
        }}
      />
      <Button
        title={showStudentManager ? "Hide Student Manager" : "Manage Students"}
        onPress={() => setShowStudentManager(!showStudentManager)}
      />
      {showStudentManager && (
        <>
          <Text style={{ fontWeight: 'bold', marginBottom: 10, marginTop: 20 }}>Add/Remove Students:</Text>
          {studentLoading ? <ActivityIndicator /> : (
            <FlatList
              data={students}
              keyExtractor={item => item.id}
              renderItem={({ item }) => {
                const isInClass = classData?.studentIds && classData.studentIds.includes(item.id);
                return (
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginVertical: 4 }}>
                    <Text style={{ flex: 1 }}>{item.name || item.email}</Text>
                    <Button
                      title={isInClass ? 'Remove' : 'Add'}
                      onPress={() => handleStudentToggle(item.id, isInClass)}
                    />
                  </View>
                );
              }}
            />
          )}
        </>
      )}
    </View>
  );
}
