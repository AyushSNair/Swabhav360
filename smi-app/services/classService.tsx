const API_URL = "https://smi-backend-ieme.onrender.com/api/class"; // Replace <YOUR_BACKEND_URL> with your backend's address

export async function createClass(name: string, description?: string, coachId?: string) {
  const res = await fetch(`${API_URL}/create`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, description, coachId }),
  });
  return res.json();
}

export async function listClasses() {
  const res = await fetch(`${API_URL}/list`);
  const text = await res.text();
  // Debug: log the raw response
  console.log('Raw response from /list:', text);
  // Only parse as JSON if it looks like JSON
  if (text.startsWith('{') || text.startsWith('[')) {
    return JSON.parse(text);
  } else {
    throw new Error('API did not return JSON: ' + text);
  }
}

export async function addStudentToClass(classId: string, studentId: string) {
  const res = await fetch(`${API_URL}/${classId}/add-student`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ studentId }),
  });
  return res.json();
}

export async function removeStudentFromClass(classId: string, studentId: string) {
  const res = await fetch(`${API_URL}/${classId}/remove-student`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ studentId }),
  });
  return res.json();
}

export async function deleteClass(classId: string) {
  const res = await fetch(`${API_URL}/${classId}`, {
    method: "DELETE",
  });
  return res.json();
}

// Task Management Functions
export async function createTask(classId: string, taskData: {
  title: string;
  description?: string;
  dueDate?: string;
  assignedStudents?: string[];
}) {
  const res = await fetch(`${API_URL}/${classId}/tasks`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(taskData),
  });
  return res.json();
}

export async function getTasks(classId: string) {
  const res = await fetch(`${API_URL}/${classId}/tasks`);
  return res.json();
}

export async function updateTask(classId: string, taskId: string, taskData: {
  title?: string;
  description?: string;
  dueDate?: string;
  assignedStudents?: string[];
  status?: string;
}) {
  const res = await fetch(`${API_URL}/${classId}/tasks/${taskId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(taskData),
  });
  return res.json();
}

export async function deleteTask(classId: string, taskId: string) {
  const res = await fetch(`${API_URL}/${classId}/tasks/${taskId}`, {
    method: "DELETE",
  });
  return res.json();
} 