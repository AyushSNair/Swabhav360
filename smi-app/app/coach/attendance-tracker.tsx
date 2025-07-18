import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Modal,
  TouchableWithoutFeedback,
  Keyboard,
  Alert,
  ActivityIndicator,
  Dimensions,
  Platform,
  ScrollView,
} from "react-native";
import { MaterialIcons, MaterialCommunityIcons } from "@expo/vector-icons";
import {
  collection,
  doc,
  setDoc,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import { FIRESTORE_DB } from "../../FirebaseConfig";
import { getAuth } from "firebase/auth";
// Define types locally since we're having issues with the types module
interface Student {
  id: string;
  name: string;
}

interface Class {
  id: string;
  name: string;
  subject: string;
  time: string;
  students: Student[];
}

// Update AttendanceRecord for new Firestore structure
interface AttendanceRecord {
  studentId: string;
  status: "present" | "present_disciplined" | "absent_disciplined" | "absent";
  updatedBy?: string;
  updatedAt?: string;
}
import DateTimePicker from "@react-native-community/datetimepicker";

interface AttendanceTrackerProps {
  selectedClass: Class;
  onBack: () => void;
  onSave: (
    classId: string,
    date: string,
    attendance: AttendanceRecord[]
  ) => Promise<void>;
}

const { width } = Dimensions.get("window");

const AttendanceTracker: React.FC<AttendanceTrackerProps> = ({
  selectedClass,
  onBack,
  onSave,
}) => {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [showDatePicker, setShowDatePicker] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  // Update attendance state to use status string
  const [attendance, setAttendance] = useState<
    Record<string, AttendanceRecord["status"]>
  >(
    selectedClass.students.reduce<Record<string, AttendanceRecord["status"]>>(
      (acc, student) => {
        acc[student.id] = "absent"; // Default to 'absent'
        return acc;
      },
      {}
    )
  );

  const [isInitialized, setIsInitialized] = useState(false);

  // Load attendance data from Firestore when component mounts or date changes
  useEffect(() => {
    const loadAttendance = async () => {
      try {
        const dateStr = selectedDate.toISOString().split("T")[0];
        const attendanceRef = collection(FIRESTORE_DB, "attendance");
        const q = query(
          attendanceRef,
          where("classId", "==", selectedClass.id),
          where("date", "==", dateStr)
        );

        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
          const attendanceMap = {} as Record<
            string,
            AttendanceRecord["status"]
          >;
          querySnapshot.forEach((docSnap) => {
            const data = docSnap.data();
            attendanceMap[data.studentId] = data.status;
          });
          setAttendance(attendanceMap);
        } else {
          setAttendance(
            selectedClass.students.reduce<
              Record<string, AttendanceRecord["status"]>
            >((acc, student) => {
              acc[student.id] = "absent";
              return acc;
            }, {})
          );
        }
      } catch (error) {
        console.error("Error loading attendance:", error);
        Alert.alert("Error", "Failed to load attendance data");
      }
    };

    loadAttendance();
  }, [selectedClass.id, selectedDate]);

  const toggleAttendance = (studentId: string) => {
    setAttendance((prev) => ({
      ...prev,
      [studentId]: prev[studentId] === "present" ? "absent" : "present",
    }));
  };

  // Update handleSave to save per-student records
  const handleSave = async (): Promise<void> => {
    try {
      setLoading(true);
      const dateStr = selectedDate.toISOString().split("T")[0];
      const auth = getAuth();
      const user = auth.currentUser;
      const updatedBy = user ? user.uid : "unknown";
      const attendanceRef = collection(FIRESTORE_DB, "attendance");
      // Filter out undefined studentId or status
      const savePromises = Object.entries(attendance)
        .filter(
          ([studentId, status]) =>
            studentId && status && studentId !== "undefined"
        )
        .map(([studentId, status]) => {
          const docId = `${selectedClass.id}_${dateStr}_${studentId}`;
          const docRef = doc(attendanceRef, docId);
          return setDoc(
            docRef,
            {
              classId: selectedClass.id,
              date: dateStr,
              studentId,
              status,
              updatedBy,
              updatedAt: new Date().toISOString(),
            },
            { merge: true }
          );
        });
      await Promise.all(savePromises);
      Alert.alert("Success", "Attendance saved successfully!");
    } catch (error) {
      console.error("Error saving attendance:", error);
      Alert.alert("Error", "Failed to save attendance. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Update present/absent counts
  const presentCount = Object.values(attendance).filter(
    (status) => status === "present" || status === "present_disciplined"
  ).length;
  const absentCount = Object.values(attendance).filter(
    (status) => status === "absent" || status === "absent_disciplined"
  ).length;

  // Segmented control for attendance status
  const attendanceOptions = [
    {
      label: "Present",
      value: "present",
      color: "#10B981",
      icon: <MaterialIcons name="check-circle" size={16} color="#fff" />,
    },
    {
      label: "Present Disciplined",
      value: "present_disciplined",
      color: "#2563EB",
      icon: (
        <MaterialCommunityIcons name="account-check" size={16} color="#fff" />
      ),
    },
    {
      label: "Absent Disciplined",
      value: "absent_disciplined",
      color: "#F59E42",
      icon: (
        <MaterialCommunityIcons name="account-alert" size={16} color="#fff" />
      ),
    },
    {
      label: "Absent",
      value: "absent",
      color: "#EF4444",
      icon: <MaterialIcons name="cancel" size={16} color="#fff" />,
    },
  ];

  const renderAttendanceSegment = (studentId: string) => (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={{ flex: 1 }}
      contentContainerStyle={{ flexGrow: 1 }}
    >
      <View style={styles.segmentContainer}>
        {attendanceOptions.map((option, idx) => {
          const selected = attendance[studentId] === option.value;
          return (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.segmentButton,
                selected && {
                  backgroundColor: option.color,
                  borderColor: option.color,
                },
                idx === 0 && styles.segmentButtonFirst,
                idx === attendanceOptions.length - 1 &&
                  styles.segmentButtonLast,
              ]}
              onPress={() =>
                setAttendance((prev) => ({
                  ...prev,
                  [studentId]: option.value as AttendanceRecord["status"],
                }))
              }
              activeOpacity={0.85}
            >
              <View style={styles.segmentContent}>
                <View style={styles.segmentIcon}>
                  {React.cloneElement(option.icon, {
                    color: selected ? "#fff" : option.color,
                  })}
                </View>
                <Text
                  style={[
                    styles.segmentButtonText,
                    selected ? { color: "#fff" } : { color: option.color },
                  ]}
                >
                  {option.label}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </ScrollView>
  );

  const renderStudentItem = ({
    item,
    index,
  }: {
    item: Student;
    index: number;
  }) => (
    <View
      style={[
        styles.studentCard,
        index % 2 === 0 ? styles.evenCard : styles.oddCard,
      ]}
    >
      <View style={styles.studentInfo}>
        <Text
          style={[
            styles.studentName,
            attendance[item.id] === undefined && styles.pendingStatus,
          ]}
        >
          {item.name}
        </Text>
      </View>
      {renderAttendanceSegment(item.id)}
    </View>
  );

  const handleDateChange = (event: any, selectedDate?: Date) => {
    if (selectedDate) {
      setSelectedDate(selectedDate);
      if (Platform.OS === "android") {
        setShowDatePicker(false);
      }
    }
  };

  const renderDatePicker = () => {
    if (Platform.OS === "ios") {
      return (
        <Modal
          visible={showDatePicker}
          transparent={true}
          animationType="slide"
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Select Date</Text>
                <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                  <MaterialIcons name="close" size={24} color="#6B7280" />
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={selectedDate}
                mode="date"
                display={Platform.OS === "ios" ? "spinner" : "default"}
                onChange={handleDateChange}
                style={styles.datePicker as any}
              />
              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.confirmButton]}
                  onPress={() => setShowDatePicker(false)}
                >
                  <Text style={styles.confirmButtonText}>Done</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      );
    } else {
      return (
        showDatePicker && (
          <DateTimePicker
            value={selectedDate}
            mode="date"
            display="default"
            onChange={handleDateChange}
            style={styles.datePicker as any}
          />
        )
      );
    }
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={onBack}
            style={styles.backButton}
            activeOpacity={0.8}
          >
            <MaterialIcons name="arrow-back-ios" size={20} color="#4F46E5" />
            <Text style={styles.backButtonText}>Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Mark Attendance</Text>
          <View style={styles.headerRight} />
        </View>

        {/* Class Info Card */}
        <View style={styles.classInfoCard}>
          <View style={styles.classInfo}>
            <Text
              style={styles.className}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {selectedClass.name}
            </Text>
            <View style={styles.statsContainer}>
              <View style={styles.statItem}>
                <MaterialIcons name="people" size={16} color="#6B7280" />
                <Text style={styles.statText}>
                  {selectedClass.students.length} Students
                </Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <MaterialIcons name="check-circle" size={16} color="#10B981" />
                <Text style={[styles.statText, { color: "#10B981" }]}>
                  {presentCount} Present
                </Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <MaterialIcons name="cancel" size={16} color="#EF4444" />
                <Text style={[styles.statText, { color: "#EF4444" }]}>
                  {absentCount} Absent
                </Text>
              </View>
            </View>
          </View>

          <TouchableOpacity
            style={styles.dateInputContainer}
            onPress={() => setShowDatePicker(true)}
            activeOpacity={0.8}
          >
            <MaterialIcons
              name="event"
              size={20}
              color="#4F46E5"
              style={styles.dateIcon}
            />
            <Text style={styles.dateText}>
              {selectedDate.toLocaleDateString("en-US", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </Text>
            <MaterialIcons
              name="keyboard-arrow-down"
              size={20}
              color="#6B7280"
            />
          </TouchableOpacity>
        </View>

        {/* Student List */}
        <View style={styles.studentListContainer}>
          <View style={styles.listHeader}>
            <Text style={styles.studentsHeader}>Student List</Text>
            <Text style={styles.studentsCount}>
              {presentCount} of {selectedClass.students.length} present
            </Text>
          </View>

          <FlatList
            data={selectedClass.students}
            renderItem={renderStudentItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.studentList}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <MaterialIcons
                  name="people-outline"
                  size={48}
                  color="#E5E7EB"
                />
                <Text style={styles.emptyText}>No students in this class</Text>
              </View>
            }
          />
        </View>

        {/* Save Button */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.saveButton, loading && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={loading}
            activeOpacity={0.9}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.saveButtonText}>Save Attendance</Text>
            )}
          </TouchableOpacity>
        </View>

        {renderDatePicker()}
      </View>
    </TouchableWithoutFeedback>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
    paddingTop: Platform.OS === "ios" ? 50 : 16,
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    padding: 4,
  },
  backButtonText: {
    color: "#4F46E5",
    fontSize: 16,
    fontWeight: "500",
    marginLeft: 4,
  },
  headerRight: {
    width: 60,
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
    color: "#111827",
    textAlign: "center",
  },
  classInfoCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    margin: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  classInfo: {
    marginBottom: 16,
  },
  className: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 12,
  },
  statsContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    padding: 8,
  },
  statItem: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
  },
  statText: {
    fontSize: 12,
    color: "#6B7280",
    marginLeft: 4,
    fontWeight: "500",
  },
  statDivider: {
    width: 1,
    height: 24,
    backgroundColor: "#E5E7EB",
    marginHorizontal: 8,
  },
  dateInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  dateIcon: {
    marginRight: 12,
  },
  dateText: {
    flex: 1,
    fontSize: 15,
    color: "#111827",
    fontWeight: "500",
  },
  studentListContainer: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 24,
    paddingHorizontal: 16,
    marginTop: 8,
  },
  listHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
    paddingHorizontal: 8,
  },
  studentsHeader: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
  },
  studentsCount: {
    fontSize: 13,
    color: "#6B7280",
    backgroundColor: "#F3F4F6",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  studentList: {
    paddingBottom: 100,
  },
  studentCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 8,
  },
  evenCard: {
    backgroundColor: "#FFFFFF",
  },
  oddCard: {
    backgroundColor: "#F9FAFB",
  },
  studentInfo: {
    flex: 1,
    marginRight: 12,
  },
  studentName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
  },
  pendingStatus: {
    color: "#6B7280",
    fontStyle: "italic",
  },
  studentEmail: {
    fontSize: 13,
    color: "#6B7280",
    maxWidth: width * 0.5,
  },
  attendanceButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    minWidth: 100,
    justifyContent: "center",
    borderWidth: 1.5,
  },
  presentButton: {
    backgroundColor: "#ECFDF5",
    borderColor: "#10B981",
  },
  absentButton: {
    backgroundColor: "#FEF2F2",
    borderColor: "#EF4444",
  },
  buttonIcon: {
    marginRight: 6,
  },
  attendanceButtonText: {
    fontSize: 13,
    fontWeight: "600",
  },
  presentButtonText: {
    color: "#10B981",
  },
  absentButtonText: {
    color: "#EF4444",
  },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#FFFFFF",
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 10,
  },
  saveButton: {
    backgroundColor: "#4F46E5",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#4F46E5",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  saveButtonDisabled: {
    backgroundColor: "#A5B4FC",
    opacity: 0.8,
  },
  saveButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 48,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 14,
    color: "#9CA3AF",
    textAlign: "center",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: "50%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
  },
  datePicker: {
    width: "100%",
  },
  modalButtons: {
    marginTop: 20,
  },
  modalButton: {
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  confirmButton: {
    backgroundColor: "#4F46E5",
  },
  confirmButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  // Add styles for segmented control
  segmentContainer: {
    flexDirection: "row",
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginVertical: 4,
    backgroundColor: "#F3F4F6",
  },
  segmentButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 4,
    alignItems: "center",
    justifyContent: "center",
    borderRightWidth: 1,
    borderRightColor: "#E5E7EB",
    backgroundColor: "#F3F4F6",
    borderColor: "#E5E7EB",
  },
  segmentButtonFirst: {
    borderTopLeftRadius: 12,
    borderBottomLeftRadius: 12,
  },
  segmentButtonLast: {
    borderTopRightRadius: 12,
    borderBottomRightRadius: 12,
    borderRightWidth: 0,
  },
  segmentContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  segmentIcon: {
    marginRight: 6,
  },
  segmentButtonText: {
    fontSize: 13,
    fontWeight: "600",
  },
});

export default AttendanceTracker;
