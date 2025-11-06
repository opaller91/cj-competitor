import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import bcrypt from "bcryptjs";

export default function User() {
  const navigate = useNavigate();
  const currentUser = JSON.parse(localStorage.getItem("currentUser") || "null");

  const [users, setUsers] = useState([]);
  const [branches, setBranches] = useState([]);
  const [newUser, setNewUser] = useState({
    username: "",
    name: "",
    role: "",
    branch: "",
  });

  // ✅ ตรวจ role ก่อนเข้า
  useEffect(() => {
    if (!currentUser || currentUser.role !== "Admin") {
      navigate("/home");
      return;
    }
    fetchData();
  }, [navigate]);

  // ✅ โหลด users และ branches
  const fetchData = async () => {
    const { data: userData, error: userErr } = await supabase
      .from("users")
      .select("username, name, role, branch, is_first_login");
    if (userErr) console.error("User fetch error:", userErr);
    setUsers(userData || []);

    const { data: branchData, error: branchErr } = await supabase
      .from("branches")
      .select("id, name");
    if (branchErr) console.error("Branch fetch error:", branchErr);
    setBranches(branchData || []);
  };

  // ✅ เพิ่มผู้ใช้ใหม่
  const handleSubmit = async (e) => {
    e.preventDefault();
    const { username, name, role, branch } = newUser;

    if (!username || !name || !role) {
      alert("กรุณากรอก รหัสพนักงาน / ชื่อ / สิทธิ์การใช้งาน");
      return;
    }

    // ตรวจซ้ำ
    const exists = users.some((u) => u.username === username);
    if (exists) {
      alert("มีรหัสพนักงานนี้อยู่แล้ว");
      return;
    }

    // เข้ารหัสรหัสผ่านเริ่มต้น
    const hashed = await bcrypt.hash(username, 10);

    const { error } = await supabase.from("users").insert([
      {
        username,
        name,
        role,
        branch,
        password_hash: hashed,
        is_first_login: role !== "Admin",
      },
    ]);

    if (error) {
      console.error("Add user error:", error);
      alert("❌ เพิ่มผู้ใช้งานไม่สำเร็จ");
    } else {
      alert(`✅ เพิ่มผู้ใช้งาน ${name} เรียบร้อย`);
      setNewUser({ username: "", name: "", role: "", branch: "" });
      fetchData();
    }
  };

  // ✅ ลบผู้ใช้
  const handleDelete = async (username) => {
    if (!confirm("ต้องการลบผู้ใช้งานนี้หรือไม่?")) return;
    const { error } = await supabase.from("users").delete().eq("username", username);
    if (error) {
      console.error("Delete error:", error);
    } else {
      fetchData();
    }
  };

  const displayUsers = users.filter((u) => u.username !== currentUser?.username);

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
            onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
            placeholder="รหัสพนักงาน"
            className="border p-2 rounded"
            required
          />
          <input
            type="text"
            name="name"
            value={newUser.name}
            onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
            placeholder="ชื่อผู้ใช้งาน"
            className="border p-2 rounded"
            required
          />
          <select
            name="role"
            value={newUser.role}
            onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
            className="border p-2 rounded"
            required
          >
            <option value="">สิทธิ์การใช้งาน</option>
            <option value="Admin">Admin</option>
            <option value="Staff">Staff</option>
            <option value="Team Seal">Team Seal</option>
          </select>
          <select
            name="branch"
            value={newUser.branch}
            onChange={(e) => setNewUser({ ...newUser, branch: e.target.value })}
            className="border p-2 rounded"
          >
            <option value="">เลือกสาขา (ถ้ามี)</option>
            {branches.map((b) => (
              <option key={b.id} value={b.name}>
                {b.name}
              </option>
            ))}
          </select>
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
          <thead className="bg-green-700 text-white">
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
                    {u.is_first_login ? (
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
                <td colSpan="6" className="text-center text-gray-500 py-4 italic">
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