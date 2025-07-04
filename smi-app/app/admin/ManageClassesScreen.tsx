import React, { useEffect, useState } from "react";
import { View, Text, TextInput, Button, FlatList, TouchableOpacity } from "react-native";
import { createClass, listClasses, addStudentToClass, removeStudentFromClass } from "../../services/classService";

export default function ManageClassesScreen() {
  const [classes, setClasses] = useState<any[]>([]);
  const [newClassName, setNewClassName] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchClasses();
  }, []);

  async function fetchClasses() {
    setLoading(true);
    const data = await listClasses();
    setClasses(data);
    setLoading(false);
  }

  async function handleCreateClass() {
    if (!newClassName.trim()) return;
    await createClass(newClassName);
    setNewClassName("");
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
            <Text style={{ fontSize: 18 }}>{item.name}</Text>
            {/* You can add UI here to show and manage students in the class */}
          </View>
        )}
      />
    </View>
  );
}
