import { supabase } from "../lib/supabaseClient";
import bcrypt from "bcryptjs";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

export default function ForceChangePassword() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ newPassword: "", confirmPassword: "" });
  const [error, setError] = useState("");

  // ดึงผู้ใช้ปัจจุบันจาก localStorage
  const currentUser = JSON.parse(localStorage.getItem("currentUser") || "null");

  useEffect(() => {
    // ถ้าไม่ได้ล็อกอิน → กลับไปหน้า Login
    if (!currentUser) {
      navigate("/");
      return;
    }

    // ถ้าเป็น Admin → ไม่ต้องบังคับ ให้กลับ Home
    if (currentUser.role === "Admin") {
      navigate("/home");
      return;
    }

    // ถ้าไม่ใช่ครั้งแรกแล้ว → กลับ Home
    if (currentUser.isFirstLogin === false || currentUser.is_first_login === false) {
      navigate("/home");
      return;
    }
  }, [currentUser, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!form.newPassword || !form.confirmPassword)
      return setError("กรุณากรอกข้อมูลให้ครบ");
    if (form.newPassword !== form.confirmPassword)
      return setError("รหัสผ่านไม่ตรงกัน");
    if (form.newPassword.length < 6)
      return setError("รหัสผ่านควรมีอย่างน้อย 6 ตัวอักษร");
    if (currentUser && form.newPassword === currentUser.username)
      return setError("รหัสผ่านใหม่ต้องแตกต่างจากรหัสพนักงาน");

    try {
      // ✅ เข้ารหัสรหัสผ่านใหม่
      const hashedPassword = await bcrypt.hash(form.newPassword, 10);

      // ✅ อัปเดตใน Supabase
      const { error: updateErr } = await supabase
        .from("users")
        .update({
          password_hash: hashedPassword,
          is_first_login: false,
        })
        .eq("username", currentUser.username);

      if (updateErr) throw updateErr;

      // ✅ อัปเดต currentUser ใน localStorage
      const updatedCurrent = {
        ...currentUser,
        password_hash: hashedPassword,
        isFirstLogin: false,
      };
      localStorage.setItem("currentUser", JSON.stringify(updatedCurrent));

      alert("เปลี่ยนรหัสผ่านเรียบร้อยแล้ว ✅");
      navigate("/home");
    } catch (err) {
      console.error("❌ เปลี่ยนรหัสผ่านล้มเหลว:", err);
      setError("เกิดข้อผิดพลาดในการบันทึก");
    }
  };

  return (
    <div className="min-h-screen bg-secondary flex items-center justify-center p-4">
      <div className="bg-white p-6 rounded-2xl shadow-md w-full max-w-sm">
        <h2 className="text-xl font-bold mb-2 text-primary text-center">
          เปลี่ยนรหัสผ่านใหม่
        </h2>
        <p className="text-gray-600 text-center mb-6">
          สวัสดี <b>{currentUser?.name || "-"}</b> กรุณาเปลี่ยนรหัสผ่านก่อนใช้งานครั้งแรก
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block mb-1 text-sm font-medium">รหัสผ่านใหม่</label>
            <input
              type="password"
              className="w-full border border-gray-300 rounded-lg p-2 outline-none focus:ring-1 focus:ring-primary"
              value={form.newPassword}
              onChange={(e) => setForm({ ...form, newPassword: e.target.value })}
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              อย่างน้อย 6 ตัวอักษร และไม่ควรตรงกับรหัสพนักงาน
            </p>
          </div>

          <div>
            <label className="block mb-1 text-sm font-medium">ยืนยันรหัสผ่านใหม่</label>
            <input
              type="password"
              className="w-full border border-gray-300 rounded-lg p-2 outline-none focus:ring-1 focus:ring-primary"
              value={form.confirmPassword}
              onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
              required
            />
          </div>

          {error && <p className="text-red-600 text-sm">{error}</p>}

          <button
            type="submit"
            className="w-full bg-primary hover:bg-green-700 text-white py-2.5 rounded-lg transition font-medium"
          >
            บันทึกและเข้าสู่ระบบ
          </button>
        </form>
      </div>
    </div>
  );
}