import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import defaultDashboard from "../data/dashboard.json"; // mock ตั้งต้น

export default function Home() {
  const navigate = useNavigate();
  const [dashboard, setDashboard] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);

  // โหลด user + dashboard (localStorage -> json) + version check
    useEffect(() => {
    const cu = JSON.parse(localStorage.getItem("currentUser") || "null");
    if (!cu) { navigate("/"); return; }
    setCurrentUser(cu);

    const stored = JSON.parse(localStorage.getItem("dashboard") || "null");

    // ถ้าไม่มี หรือ version ไม่ตรงกับไฟล์ json → ใช้ไฟล์ json แล้วเขียนทับ
    if (!stored || stored.version !== defaultDashboard.version) {
        localStorage.setItem("dashboard", JSON.stringify(defaultDashboard));
        setDashboard(defaultDashboard);
    } else {
        setDashboard(stored);
    }
    }, [navigate]);

  if (!currentUser || !dashboard) return null;

  const diffCust = dashboard.tc7 - dashboard.tccj;
  const diffColor =
    diffCust > 0 ? "text-green-600" : diffCust < 0 ? "text-red-600" : "text-gray-700";
    // รีเซ็ต dashboard ใน localStorage แล้วโหลดใหม่
    function resetDemo() {
    localStorage.removeItem("dashboard");
    window.location.reload();
    }

    // แก้ค่า dashboard แล้วเซฟลง localStorage
    function saveQuickEdit(next) {
    const newDb = { ...(dashboard || {}), ...next };
    localStorage.setItem("dashboard", JSON.stringify(newDb));
    setDashboard(newDb);
    }

  return (
    <div className="min-h-screen bg-secondary flex flex-col md:flex-row justify-center gap-8 p-6">

      {/* ===== ฝั่งข้อมูลสรุป + ปุ่มจัดการ (ขึ้นก่อนบนมือถือ) ===== */}
      <div className="flex-1 bg-white rounded-2xl shadow-lg p-6 flex flex-col items-center order-1 md:order-2">
        <div className="text-center mb-4">
          <h3 className="text-xl font-bold">
            สวัสดี คุณ{currentUser.name || "-"}
          </h3>
          <p className="text-sm text-gray-600">
            {currentUser.role} | สาขาที่รับผิดชอบ : {currentUser.branch}
          </p>
        </div>

        <div className="bg-gray-50 rounded-xl shadow-inner p-4 w-full max-w-sm text-left mb-6">
          <p className="font-semibold text-gray-800 mb-1">
            ข้อมูลล่าสุด (เมื่อวาน){" "}
            <span className="font-bold">{dashboard.asOf}</span>
          </p>
          <p className="text-sm text-gray-600">
            เฉลี่ย {dashboard.avgStores} ร้าน | เทียบวันที่ {dashboard.compareTo}
          </p>

          <div className="mt-3 space-y-1">
            <p>
              TC (7-Eleven): <b>{dashboard.tc7} คน</b>{" "}
              <span className={dashboard.tc7Delta >= 0 ? "text-green-600 font-semibold" : "text-red-600 font-semibold"}>
                {dashboard.tc7Delta > 0 ? `+${dashboard.tc7Delta}` : dashboard.tc7Delta}
              </span>
            </p>
            <p>
              TC (CJ): <b>{dashboard.tccj} คน</b>{" "}
              <span className={dashboard.tccjDelta >= 0 ? "text-green-600 font-semibold" : "text-red-600 font-semibold"}>
                {dashboard.tccjDelta > 0 ? `+${dashboard.tccjDelta}` : dashboard.tccjDelta}
              </span>
            </p>
            <p>
              ส่วนต่างลูกค้า:{" "}
              <b className={diffColor}>
                {diffCust > 0 ? `+${diffCust}` : diffCust} คน
              </b>
            </p>
          </div>
        </div>

        <div className="flex flex-col items-center gap-3 w-full max-w-sm">
          {/* ลิงก์จัดการเฉพาะ Admin */}
          {currentUser.role === "Admin" && (
            <div className="flex gap-4">
              <Link to="/user" className="text-primary font-semibold hover:underline">
                เพิ่ม/แก้ไข ผู้ใช้งาน
              </Link>
              <Link to="/branch" className="text-primary font-semibold hover:underline">
                แก้ไขร้านสาขา
              </Link>
            </div>
          )}

          <button className="btn bg-primary text-white w-full py-3 rounded-xl font-semibold hover:bg-green-700 transition-all">
            แก้ไขข้อมูลส่วนตัว
          </button>
        </div>
      </div>

      {/* ===== เมนูหลักฝั่งซ้าย ===== */}
      <div className="flex-1 bg-white rounded-2xl shadow-lg p-6 flex flex-col items-center order-2 md:order-1">
        <h2 className="text-2xl font-bold mb-6 text-primary">เมนูหลัก</h2>
        <div className="grid grid-cols-2 gap-4 w-full max-w-md">
          <Link
            to="/tracker"
            className="bg-green-100 border border-green-200 py-6 rounded-xl text-center font-semibold text-primary hover:bg-green-200 hover:scale-[1.02] transition-all"
          >
            เก็บข้อมูลRealTime
          </Link>
          <Link
            to="/branch-summary"
            className="bg-green-100 border border-green-200 py-6 rounded-xl text-center font-semibold text-primary hover:bg-green-200 hover:scale-[1.02] transition-all"
          >
            ข้อมูลร้านสาขา
          </Link>
        <Link
        to="/tc"
        className="btn bg-primary text-white py-6 rounded-xl font-semibold hover:bg-green-700 hover:scale-[1.02] transition-all block text-center"
        >
        กรอก TC
        </Link>
          {/* <button className="btn bg-primary text-white py-6 rounded-xl font-semibold hover:bg-green-700 hover:scale-[1.02] transition-all">
            เป้าหมายโครงการ
          </button>
          <button className="btn bg-primary text-white py-6 rounded-xl font-semibold hover:bg-green-700 hover:scale-[1.02] transition-all">
            กลุ่มลูกค้า CJ
          </button>
          <button className="btn bg-primary text-white py-6 rounded-xl font-semibold hover:bg-green-700 hover:scale-[1.02] transition-all col-span-2">
            ยอดขายก่อน-หลังโครงการ
          </button>
          <button className="btn bg-primary text-white py-6 rounded-xl font-semibold hover:bg-green-700 hover:scale-[1.02] transition-all col-span-2">
            ผลลัพธ์และขยายผล
          </button> */}
        </div>
      </div>
    </div>
  );
}