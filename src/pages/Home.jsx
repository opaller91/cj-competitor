import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import defaultDashboard from "../data/dashboard.json";

export default function Home() {
  const navigate = useNavigate();
  const [dashboard, setDashboard] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);

  // -------------------------------------------------------------------
  // ✅ โหลด user + dashboard จาก Supabase
  // -------------------------------------------------------------------
  useEffect(() => {
    const cu = JSON.parse(localStorage.getItem("currentUser") || "null");
    if (!cu) {
      navigate("/");
      return;
    }
    setCurrentUser(cu);

    const fetchDashboard = async () => {
      try {
        const { data, error } = await supabase.from("dashboard").select("*").limit(1);
        if (error) throw error;

        if (!data || data.length === 0) {
          // ✅ ถ้ายังไม่มีข้อมูล ให้ insert mock default
          await supabase.from("dashboard").insert([defaultDashboard]);
          setDashboard(defaultDashboard);
        } else {
          const d = data[0];
          // ✅ ถ้า version mismatch → update จาก mock
          if (d.version !== defaultDashboard.version) {
            await supabase.from("dashboard").update(defaultDashboard).eq("id", d.id);
            setDashboard(defaultDashboard);
          } else {
            setDashboard(d);
          }
        }
      } catch (err) {
        console.error("❌ โหลด dashboard ไม่สำเร็จ:", err);
      }
    };

    fetchDashboard();
  }, [navigate]);

  if (!currentUser || !dashboard) return null;

  const diffCust = dashboard.tc7 - dashboard.tccj;
  const diffColor =
    diffCust > 0 ? "text-green-600" : diffCust < 0 ? "text-red-600" : "text-gray-700";

  // -------------------------------------------------------------------
  // ✅ รีเซ็ต dashboard
  // -------------------------------------------------------------------
  const resetDemo = async () => {
    if (!confirm("ต้องการรีเซ็ตข้อมูลหรือไม่?")) return;
    try {
      await supabase.from("dashboard").delete().neq("id", 0);
      await supabase.from("dashboard").insert([defaultDashboard]);
      setDashboard(defaultDashboard);
      alert("รีเซ็ตข้อมูลสำเร็จ ✅");
    } catch (err) {
      alert("❌ รีเซ็ตไม่สำเร็จ");
      console.error(err);
    }
  };

  // -------------------------------------------------------------------
  // ✅ Quick Edit แล้วอัปเดต Supabase
  // -------------------------------------------------------------------
  const saveQuickEdit = async (next) => {
    try {
      const newDb = { ...(dashboard || {}), ...next };
      const { error } = await supabase
        .from("dashboard")
        .update(newDb)
        .eq("id", dashboard.id);
      if (error) throw error;
      setDashboard(newDb);
      alert("อัปเดตข้อมูลสำเร็จ ✅");
    } catch (err) {
      console.error("❌ update failed:", err);
      alert("อัปเดตข้อมูลไม่สำเร็จ");
    }
  };

  // -------------------------------------------------------------------
  // ✅ UI
  // -------------------------------------------------------------------
  return (
    <div className="min-h-screen bg-secondary flex flex-col md:flex-row justify-center gap-8 p-6">

      {/* ===== ฝั่งข้อมูลสรุป + ปุ่มจัดการ (ขึ้นก่อนบนมือถือ) ===== */}
      <div className="flex-1 bg-white rounded-2xl shadow-lg p-6 flex flex-col items-center order-1 md:order-2">
        <div className="text-center mb-4">
          <h3 className="text-xl font-bold">สวัสดี คุณ{currentUser.name || "-"}</h3>
          <p className="text-sm text-gray-600">
            {currentUser.role} | สาขาที่รับผิดชอบ : {currentUser.branch}
          </p>
        </div>

        <div className="bg-gray-50 rounded-xl shadow-inner p-4 w-full max-w-sm text-left mb-6">
          <p className="font-semibold text-gray-800 mb-1">
            ข้อมูลล่าสุด (เมื่อวาน){" "}
            <span className="font-bold">{dashboard.as_of}</span>
          </p>
          <p className="text-sm text-gray-600">
            เฉลี่ย {dashboard.avg_stores} ร้าน | เทียบวันที่ {dashboard.compare_to}
          </p>

          <div className="mt-3 space-y-1">
            <p>
              TC (7-Eleven): <b>{dashboard.tc7} คน</b>{" "}
              <span
                className={
                  dashboard.tc7_delta >= 0
                    ? "text-green-600 font-semibold"
                    : "text-red-600 font-semibold"
                }
              >
                {dashboard.tc7_delta > 0 ? `+${dashboard.tc7_delta}` : dashboard.tc7_delta}
              </span>
            </p>
            <p>
              TC (CJ): <b>{dashboard.tccj} คน</b>{" "}
              <span
                className={
                  dashboard.tccj_delta >= 0
                    ? "text-green-600 font-semibold"
                    : "text-red-600 font-semibold"
                }
              >
                {dashboard.tccj_delta > 0 ? `+${dashboard.tccj_delta}` : dashboard.tccj_delta}
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

          <button
            className="btn bg-primary text-white w-full py-3 rounded-xl font-semibold hover:bg-green-700 transition-all"
            onClick={resetDemo}
          >
            รีเซ็ต Dashboard
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
        </div>
      </div>
    </div>
  );
}