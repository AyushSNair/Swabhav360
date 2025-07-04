import React, { useEffect, useState } from "react";
import { View, Text, TextInput, Button, FlatList, TouchableOpacity } from "react-native";
import { createClass, listClasses, addStudentToClass, removeStudentFromClass, deleteClass } from "../../services/classService";
import { FIRESTORE_DB } from '../../FirebaseConfig';
import { collection, getDocs } from 'firebase/firestore';
import { useNavigation } from '@react-navigation/native';

export default function ManageClassesScreen() {
  const [classes, setClasses] = useState<any[]>([]);
  const [newClassName, setNewClassName] = useState("");
  const [loading, setLoading] = useState(false);
  const [students, setStudents] = useState<any[]>([]);
  const [selectedClass, setSelectedClass] = useState<any | null>(null);
  const [studentLoading, setStudentLoading] = useState(false);
  const navigation = useNavigation();

  useEffect(() => {
    fetchClasses();
    fetchStudents();
  }, []);

  async function fetchClasses() {
    setLoading(true);
    const data = await listClasses();
    setClasses(data);
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

  async function handleCreateClass() {
    if (!newClassName.trim()) return;
    await createClass(newClassName);
    setNewClassName("");
    fetchClasses();
  }

  async function handleDeleteClass(classId: string) {
    await deleteClass(classId);
    fetchClasses();
    setSelectedClass(null);
  }

  async function handleStudentToggle(classId: string, studentId: string, isInClass: boolean) {
    if (isInClass) {
      await removeStudentFromClass(classId, studentId);
    } else {
      await addStudentToClass(classId, studentId);
    }
    fetchClasses();
  }

  return (
    <View style={{ flex: 1, padding: 20 }}>
      <Text style={{ fontSize: 22, fontWeight: "bold" }}>Manage Classes</Text>
      <TextInput
        placeholder="New class name"
        value={newClassName}
        onChangeText={setNewClassName}
        style={{ borderWidth: 1, marginVertical: 10, padding: 8, borderRadius: 5 }}
      />
      <Button title="Create Class" onPress={handleCreateClass} />
      <FlatList
        data={classes}
        keyExtractor={item => item.id}
        refreshing={loading}
        onRefresh={fetchClasses}
        renderItem={({ item }) => (
          <View style={{ padding: 10, borderBottomWidth: 1 }}>
            <TouchableOpacity onPress={() => {
              setSelectedClass(selectedClass && selectedClass.id === item.id ? null : item);
              (navigation as any).navigate('ClassDetails', { classId: item.id, className: item.name });
            }}>
              <Text style={{ fontSize: 18 }}>{item.name}</Text>
            </TouchableOpacity>
            {selectedClass && selectedClass.id === item.id && (
              <View style={{ marginTop: 10 }}>
                {/* <Text style={{ fontWeight: 'bold' }}>Add/Remove Students:</Text> */}
                {/* {studentLoading ? <Text>Loading students...</Text> : (
                  students.map(student => {
                    const isInClass = item.studentIds && item.studentIds.includes(student.id);
                    return (
                      <View key={student.id} style={{ flexDirection: 'row', alignItems: 'center', marginVertical: 4 }}>
                        <Text style={{ flex: 1 }}>{student.name || student.email}</Text>
                        <Button
                          title={isInClass ? "Remove" : "Add"}
                          onPress={() => handleStudentToggle(item.id, student.id, isInClass)}
                        />
                      </View>
                    );
                  })
                )} */}
              </View>
            )}
          </View>
        )}
      />
    </View>
  );
}
