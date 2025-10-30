import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import usersData from "../data/users.json"; // 👉 ต้องมี structure: { version: x, list: [...] }

export default function User() {
  const navigate = useNavigate();
  const currentUser = JSON.parse(localStorage.getItem("currentUser") || "null");

  const [users, setUsers] = useState([]);
  const [newUser, setNewUser] = useState({
    username: "",
    name: "",
    role: "",
    branch: "",
  });

  // ✅ โหลด user จาก localStorage หรือ JSON (ตรวจ version)
  useEffect(() => {
    if (!currentUser || currentUser.role !== "Admin") {
      navigate("/home");
      return;
    }

    const stored = JSON.parse(localStorage.getItem("usersVersioned") || "null");

    // ถ้าไม่มี หรือเวอร์ชันไม่ตรง → โหลดจาก JSON ใหม่
    if (!stored || stored.version !== usersData.version) {
      localStorage.setItem("usersVersioned", JSON.stringify(usersData));
      setUsers(usersData.list);
    } else {
      setUsers(stored.list);
    }
  }, [navigate]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setNewUser({ ...newUser, [name]: value });
  };

  // ✅ เพิ่มผู้ใช้ใหม่ + เขียนกลับ localStorage พร้อม version
  const handleSubmit = (e) => {
    e.preventDefault();
    const { username, name, role, branch } = newUser;

    if (!username || !name || !role) {
      alert("กรุณากรอก รหัสพนักงาน / ชื่อ / สิทธิ์การใช้งาน");
      return;
    }

    if (users.some((u) => u.username === username)) {
      alert("มีรหัสพนักงานนี้อยู่แล้ว");
      return;
    }

    const updatedList = [
      ...users,
      {
        username,
        name,
        role,
        branch,
        password: username, // เริ่มต้นเป็นรหัสพนักงาน
        isFirstLogin: role === "Admin" ? false : true, // Admin ไม่ต้องเปลี่ยน
      },
    ];

    const newData = { version: usersData.version, list: updatedList };
    setUsers(updatedList);
    localStorage.setItem("usersVersioned", JSON.stringify(newData));
    setNewUser({ username: "", name: "", role: "", branch: "" });
    alert(`เพิ่มผู้ใช้งาน ${name} เรียบร้อย ✅`);
  };

  // ✅ ลบผู้ใช้ + อัปเดตกลับ localStorage
  const handleDelete = (username) => {
    if (confirm("ต้องการลบผู้ใช้งานนี้หรือไม่?")) {
      const updatedList = users.filter((u) => u.username !== username);
      const newData = { version: usersData.version, list: updatedList };
      setUsers(updatedList);
      localStorage.setItem("usersVersioned", JSON.stringify(newData));
    }
  };

  // ✅ กรองไม่ให้โชว์บัญชีตัวเอง
  const displayUsers = users.filter(
    (u) => u.username !== currentUser?.username
  );

  return (
    <div className="min-h-screen bg-secondary p-4 md:p-6">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">ผู้ใช้งานระบบ</h2>

      {/* ฟอร์มเพิ่มผู้ใช้ */}
      <div className="bg-white p-4 rounded-2xl shadow mb-6 w-full max-w-5xl">
        <form
          onSubmit={handleSubmit}
          className="grid grid-cols-1 md:grid-cols-5 gap-3 text-sm md:text-base"
        >
          <input
            type="text"
            name="username"
            value={newUser.username}
            onChange={handleChange}
            placeholder="รหัสพนักงาน"
            className="border p-2 rounded"
            required
          />
          <input
            type="text"
            name="name"
            value={newUser.name}
            onChange={handleChange}
            placeholder="ชื่อผู้ใช้งาน"
            className="border p-2 rounded"
            required
          />
          <select
            name="role"
            value={newUser.role}
            onChange={handleChange}
            className="border p-2 rounded"
            required
          >
            <option value="">สิทธิ์การใช้งาน</option>
            <option value="Admin">Admin</option>
            <option value="Staff">Staff</option>
          </select>
          <input
            type="text"
            name="branch"
            value={newUser.branch}
            onChange={handleChange}
            placeholder="สาขาที่รับผิดชอบ"
            className="border p-2 rounded"
          />
          <button
            type="submit"
            className="bg-primary text-white py-2 rounded hover:bg-green-700 transition"
          >
            เพิ่มผู้ใช้งาน
          </button>
        </form>

        <p className="text-sm text-gray-500 mt-2">
          *รหัสผ่านเริ่มต้นคือ “รหัสพนักงาน” และจะมีการบังคับเปลี่ยนรหัสในครั้งแรกที่เข้าสู่ระบบ
        </p>
      </div>

      {/* ตารางรายชื่อผู้ใช้งาน */}
      <div className="bg-white rounded-2xl shadow w-full max-w-5xl overflow-x-auto">
        <table className="min-w-full table-auto">
          <thead className="bg-primary text-black">
            <tr>
              <th className="py-3 px-4 text-left">รหัสพนักงาน</th>
              <th className="py-3 px-4 text-left">ชื่อ</th>
              <th className="py-3 px-4 text-left">สิทธิ์</th>
              <th className="py-3 px-4 text-left">สาขา</th>
              <th className="py-3 px-4 text-left">สถานะ</th>
              <th className="py-3 px-4 text-left">จัดการ</th>
            </tr>
          </thead>
          <tbody>
            {displayUsers.length > 0 ? (
              displayUsers.map((u) => (
                <tr key={u.username} className="border-t hover:bg-gray-50">
                  <td className="py-3 px-4">{u.username}</td>
                  <td className="py-3 px-4">{u.name}</td>
                  <td className="py-3 px-4">{u.role}</td>
                  <td className="py-3 px-4">{u.branch || "-"}</td>
                  <td className="py-3 px-4">
                    {u.isFirstLogin ? (
                      <span className="text-amber-600 font-medium">
                        ยังไม่เปลี่ยนรหัส
                      </span>
                    ) : (
                      <span className="text-green-700 font-medium">
                        ใช้งานแล้ว
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    <button
                      onClick={() => handleDelete(u.username)}
                      className="text-red-600 hover:text-red-700 underline"
                    >
                      ลบ
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan="6"
                  className="text-center text-gray-500 py-4 italic"
                >
                  ยังไม่มีผู้ใช้งานในระบบ (ไม่รวมบัญชีของคุณ)
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}