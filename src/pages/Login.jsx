import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import bcrypt from "bcryptjs";

export default function Login() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // 🔹 ดึงข้อมูลผู้ใช้จาก Supabase
      const { data: users, error: fetchError } = await supabase
        .from("users")
        .select("*")
        .eq("username", form.username)
        .limit(1);

      if (fetchError) throw fetchError;
      if (!users || users.length === 0) {
        setError("ไม่พบรหัสพนักงานนี้ในระบบ");
        setLoading(false);
        return;
      }

      const user = users[0];

      // 🔹 ตรวจสอบรหัสผ่านด้วย bcrypt
      const isMatch = await bcrypt.compare(form.password, user.password_hash || "");
      if (!isMatch) {
        setError("รหัสพนักงานหรือรหัสผ่านไม่ถูกต้อง");
        setLoading(false);
        return;
      }

      // ✅ บันทึกเวลาล็อกอินลง Supabase
      await supabase.from("login_logs").insert([
        {
          username: user.username,
          role: user.role,
          branch: user.branch,
          ip_address: window.location.hostname,
          user_agent: navigator.userAgent,
        },
      ]);

      // ✅ เก็บ user ลง localStorage
      localStorage.setItem("currentUser", JSON.stringify(user));

      // ✅ ตรวจสอบว่าเป็นการเข้าใช้ครั้งแรกไหม
      if (user.is_first_login && user.role !== "Admin") {
        navigate("/force-change-password");
      } else {
        navigate("/home");
      }
    } catch (err) {
      console.error("❌ Login error:", err);
      setError("เกิดข้อผิดพลาดในการเข้าสู่ระบบ");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-secondary">
      {/* พื้นที่ภาพฝั่งซ้าย */}
      <div className="hidden md:flex flex-1 justify-center items-center  from-green-200 to-green-400">
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
            value={form.username}
            onChange={handleChange}
            className="w-full border border-gray-300 p-2 rounded mb-4 focus:ring-2 focus:ring-green-300 outline-none"
            required
          />

          <label className="block mb-2 text-sm font-medium text-gray-700">
            รหัสผ่าน
          </label>
          <input
            name="password"
            type="password"
            value={form.password}
            onChange={handleChange}
            className="w-full border border-gray-300 p-2 rounded mb-4 focus:ring-2 focus:ring-green-300 outline-none"
            required
          />

          {error && <p className="text-red-500 text-sm mb-4 text-center">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="btn w-full bg-primary text-white py-2 rounded-lg font-semibold hover:bg-green-700 transition-all"
          >
            {loading ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
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