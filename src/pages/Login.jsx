import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import usersData from "../data/users.json";

export default function Login() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: "", password: "" });
  const [error, setError] = useState("");
  const [users, setUsers] = useState([]);

  // โหลด users จาก localStorage (พร้อมตรวจ version)
  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem("usersVersioned") || "null");

    if (!stored || stored.version !== usersData.version) {
      // ถ้าไม่มี หรือ version ไม่ตรง → ใช้ JSON ใหม่แล้วเก็บลง localStorage
      localStorage.setItem("usersVersioned", JSON.stringify(usersData));
      setUsers(usersData.list);
    } else {
      setUsers(stored.list);
    }
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
  };

  const handleLogin = (e) => {
    e.preventDefault();
    const found = users.find(
      (u) => u.username === form.username && u.password === form.password
    );

    if (!found) {
      setError("รหัสพนักงานหรือรหัสผ่านไม่ถูกต้อง");
      return;
    }

    // บันทึก current user
    localStorage.setItem("currentUser", JSON.stringify(found));

    // ✅ Logic: ถ้าเป็น Staff ครั้งแรก → ไปเปลี่ยนรหัสผ่านก่อน
    if (found.isFirstLogin && found.role !== "Admin") {
      navigate("/force-change-password");
    } else {
      navigate("/home");
    }
  };

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-secondary">
      {/* พื้นที่ภาพฝั่งซ้าย */}
      <div className="hidden md:flex flex-1  from-green-200 to-green-400 justify-center items-center">
        <img
          src="https://upload.wikimedia.org/wikipedia/commons/7/7b/7-eleven_logo.svg"
          alt="7-Eleven"
          className="w-40"
        />
      </div>

      {/* ฟอร์มฝั่งขวา */}
      <div className="flex-1 flex flex-col justify-center items-center p-6 bg-white">
        <img
          src="src/assets/Logo7-11.png"
          alt="7-Eleven"
          className="w-20 mb-6 md:hidden"
        />
        <h2 className="text-xl font-semibold mb-4 text-center text-gray-800">
          ระบบเก็บข้อมูลร้านคู่แข่ง (CJ) โดย PLP BW
        </h2>

        <form
          onSubmit={handleLogin}
          className="w-full max-w-sm bg-gray-50 p-6 rounded-xl shadow-inner"
        >
          <label className="block mb-2 text-sm font-medium text-gray-700">
            รหัสพนักงาน
          </label>
          <input
            name="username"
            type="text"
            onChange={handleChange}
            value={form.username}
            className="w-full border border-gray-300 p-2 rounded mb-4 focus:ring-2 focus:ring-green-300 outline-none"
            required
          />

          <label className="block mb-2 text-sm font-medium text-gray-700">
            รหัสผ่าน
          </label>
          <input
            name="password"
            type="password"
            onChange={handleChange}
            value={form.password}
            className="w-full border border-gray-300 p-2 rounded mb-4 focus:ring-2 focus:ring-green-300 outline-none"
            required
          />

          {error && (
            <p className="text-red-500 text-sm mb-4 text-center">{error}</p>
          )}

          <button
            type="submit"
            className="btn w-full bg-primary text-white py-2 rounded-lg font-semibold hover:bg-green-700 transition-all"
          >
            เข้าสู่ระบบ
          </button>
        </form>

        <p className="text-xs text-gray-500 mt-4">
          *หากเป็นการเข้าสู่ระบบครั้งแรก โปรดใช้รหัสพนักงานเป็นรหัสผ่าน
        </p>
        <button
        onClick={() => {
            localStorage.clear();
            window.location.reload();
        }}
        className="text-sm text-red-500 underline hover:opacity-80 mt-3"
        >
        🔄 รีเซ็ตข้อมูลทั้งหมด
        </button>
      </div>
       
    </div>
  );
}