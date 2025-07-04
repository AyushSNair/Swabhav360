const API_URL = "http://192.168.7.9:3000/api/class"; // Replace <YOUR_BACKEND_URL> with your backend's address

export async function createClass(name: string) {
  const res = await fetch(`${API_URL}/create`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });
  return res.json();
}

export async function listClasses() {
  const res = await fetch(`${API_URL}/list`);
  return res.json();
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