import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";

export default function Logout() {
  const navigate = useNavigate();

  useEffect(() => {
    const logout = async () => {
      try {
        const currentUser = JSON.parse(localStorage.getItem("currentUser") || "null");
        if (currentUser) {
          // ✅ อัปเดตเวลา logout ของ user คนนี้ใน log ล่าสุด
          const { error } = await supabase
            .from("login_logs")
            .update({ logout_time: new Date().toISOString() })
            .eq("username", currentUser.username)
            .order("login_time", { ascending: false })
            .limit(1);

          if (error) console.error("❌ logout log update error:", error);
        }

        // ✅ ล้างข้อมูล session
        localStorage.removeItem("currentUser");

        // 🧭 กลับไปหน้า Login
        navigate("/");
      } catch (err) {
        console.error("❌ Logout error:", err);
        navigate("/");
      }
    };

    logout();
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center text-gray-600">
      <p>กำลังออกจากระบบ...</p>
    </div>
  );
}