import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function Logout() {
  const navigate = useNavigate();

  useEffect(() => {
    // ตัวอย่าง: ล้างเฉพาะ currentUser (แนะนำ)
    localStorage.removeItem("currentUser");

    // ถ้าต้องการล้าง users ทั้งหมดด้วย (ไม่แนะนำสำหรับ demo หลายคน)
    // localStorage.removeItem("users");

    navigate("/"); // กลับไปหน้า Login
  }, [navigate]);

  return null;
}