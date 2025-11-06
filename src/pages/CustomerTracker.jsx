import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

const SLOT_MAP = {
  เช้า: [["06:00", "07:00"], ["07:00", "08:00"], ["08:00", "09:00"], ["09:00", "10:00"], ["10:00", "11:00"]],
  บ่าย: [["12:00", "13:00"], ["13:00", "14:00"], ["14:00", "15:00"], ["15:00", "16:00"], ["16:00", "17:00"]],
  เย็น: [["17:00", "18:00"], ["18:00", "19:00"]],
  ดึก: [["19:00", "20:00"], ["20:00", "21:00"], ["21:00", "22:00"], ["22:00", "23:00"]],
};

function hourToPeriodSlot(d = new Date()) {
  const local = new Date(d.getTime() + 7 * 60 * 60 * 1000);
  const h = local.getUTCHours();
  const m = local.getUTCMinutes();
  const stamp = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  const inRange = (s, e) => stamp >= s && stamp < e;
  for (const [period, slots] of Object.entries(SLOT_MAP))
    for (const [s, e] of slots) if (inRange(s, e)) return { period, slotLabel: `${s}–${e}` };
  return { period: "เช้า", slotLabel: "06:00–07:00" };
}

const isoDate = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export default function CustomerTracker() {
  const currentUser = JSON.parse(localStorage.getItem("currentUser") || "{}");
  const canSelectBranch = currentUser?.role === "Admin" || currentUser?.branch === "Team Seal";

  const [branches, setBranches] = useState([]);
  const [branchId, setBranchId] = useState("");
  const [events, setEvents] = useState([]);
  const [drinkCups, setDrinkCups] = useState(1);
  const [age, setAge] = useState("20–30 ปี");
  const [career, setCareer] = useState("พนักงานออฟฟิศ");
  const [{ period, slotLabel }, setTimeBox] = useState(hourToPeriodSlot());
  const [searchTerm, setSearchTerm] = useState("");

  // ✅ โหลดข้อมูลจาก Supabase
  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: branchData } = await supabase
          .from("branches")
          .select("id, name")
          .neq("name", "Team Seal HQ")
          .order("id");
        setBranches(branchData || []);

        const { data: trackerData } = await supabase
          .from("customer_tracker")
          .select("*")
          .order("created_at");
        setEvents(trackerData || []);

        if (!canSelectBranch && currentUser?.branch) {
          const found = branchData?.find((b) => b.name === currentUser.branch);
          if (found) setBranchId(found.id);
        }
      } catch (err) {
        console.error("❌ โหลดข้อมูลล้มเหลว:", err);
      }
    };
    fetchData();
    const timer = setInterval(() => setTimeBox(hourToPeriodSlot(new Date())), 30000);
    return () => clearInterval(timer);
  }, [canSelectBranch, currentUser?.branch]);

  // ✅ เพิ่มข้อมูลลูกค้าใหม่
  const addEvent = async (group, type, dir = null, extra = {}) => {
    if (!branchId) return alert("กรุณาเลือกสาขา");

    const entry = {
      branch_id: branchId,
      date: isoDate(),
      period,
      type_group: group,
      type,
      age: extra.age || age,
      gender: type === "male" ? "ชาย" : type === "female" ? "หญิง" : "อื่นๆ",
      career: extra.career || career,
      cups: extra.cups || 1,
      note: dir ? `ทางเข้า: ${dir}` : null,
      created_by: currentUser?.username || "",
    };

    const { error } = await supabase.from("customer_tracker").insert([entry]);
    if (error) return alert("❌ บันทึกไม่สำเร็จ");
    const { data } = await supabase.from("customer_tracker").select("*").order("created_at");
    setEvents(data || []);
    alert("✅ บันทึกเรียบร้อย");
  };

  // ✅ Undo ล่าสุด
  const undoLast = async () => {
    const today = isoDate();
    const { data } = await supabase
      .from("customer_tracker")
      .select("*")
      .eq("branch_id", branchId)
      .eq("date", today)
      .order("created_at", { ascending: false })
      .limit(1);
    if (!data?.length) return alert("ไม่มีข้อมูลให้ Undo");

    await supabase.from("customer_tracker").delete().eq("id", data[0].id);
    const { data: updated } = await supabase.from("customer_tracker").select("*").order("created_at");
    setEvents(updated || []);
  };

  // ✅ ลบข้อมูล
  const deleteEvent = async (target) => {
    if (!confirm("ต้องการลบรายการนี้ใช่ไหม?")) return;
    await supabase.from("customer_tracker").delete().eq("id", target.id);
    const { data } = await supabase.from("customer_tracker").select("*").order("created_at");
    setEvents(data || []);
  };

  // ✅ Export Excel
  const exportToExcel = () => {
    const branchData = events.filter((e) => e.branch_id === branchId);
    if (!branchData.length) return alert("ยังไม่มีข้อมูลสำหรับสาขานี้");

    const ws = XLSX.utils.json_to_sheet(branchData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "CustomerTracker");
    const buf = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    saveAs(
      new Blob([buf], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      }),
      `customer_tracker_${branchId}_${isoDate()}.xlsx`
    );
  };

  // ✅ Aggregate
  const liveAgg = useMemo(() => {
    const today = isoDate();
    const f = events.filter((e) => e.branch_id === branchId && e.date === today && e.period === period);
    const sum = (sel) => f.filter(sel).length;
    const sumCups = () => f.filter((e) => e.type === "drink").reduce((a, c) => a + (Number(c.cups) || 0), 0);
    return {
      male: sum((e) => e.type_group === "ลูกค้า" && e.type === "male"),
      female: sum((e) => e.type_group === "ลูกค้า" && e.type === "female"),
      car: sum((e) => e.type_group === "ยานพาหนะ" && e.type === "car"),
      moto: sum((e) => e.type_group === "ยานพาหนะ" && e.type === "moto"),
      walk: sum((e) => e.type_group === "ยานพาหนะ" && e.type === "walk"),
      food: sum((e) => e.type_group === "สินค้า" && e.type === "food"),
      nonfood: sum((e) => e.type_group === "สินค้า" && e.type === "nonfood"),
      cups: sumCups(),
    };
  }, [events, branchId, period]);

  return (
    <div className="min-h-screen bg-secondary p-4 md:p-6">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">🧍‍♀️ เก็บข้อมูลลูกค้าเข้า CJ — Real-time</h2>

      {/* 🔹 เลือกสาขา */}
      <div className="bg-white rounded-2xl shadow p-4 mb-6 flex flex-col md:flex-row gap-3 items-start md:items-center">
        <div className="w-full md:w-72">
          <label className="block text-sm font-semibold mb-1">เลือกสาขา</label>
          <input
            type="text"
            placeholder="ค้นหาสาขา..."
            className="border p-2 rounded w-full mb-2"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <select
            value={branchId}
            onChange={(e) => setBranchId(e.target.value)}
            className="border p-2 rounded w-full"
          >
            <option value="">-- เลือกสาขา --</option>
            {branches
              .filter(
                (b) =>
                  b.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                  b.id.toLowerCase().includes(searchTerm.toLowerCase())
              )
              .map((b) => (
                <option key={b.id} value={b.id}>
                  {b.id} - {b.name}
                </option>
              ))}
          </select>
        </div>

        <div className="text-sm text-gray-700 mt-2 md:mt-0">
          วันนี้: <b>{isoDate()}</b> | ช่วง: <b>{period}</b> | ชั่วโมง: <b>{slotLabel}</b>
        </div>
      </div>

      <CustomerSection addEvent={addEvent} age={age} setAge={setAge} career={career} setCareer={setCareer} />
      <VehicleSection addEvent={addEvent} />
      <ProductSection addEvent={addEvent} drinkCups={drinkCups} setDrinkCups={setDrinkCups} />

      <div className="bg-white rounded-2xl shadow p-4 mt-6">
        <h3 className="font-semibold mb-3">
          สรุป {isoDate()} | {branchId || "-"} | {period}
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3 text-sm">
          <Summary label="เพศชาย" value={liveAgg.male} />
          <Summary label="เพศหญิง" value={liveAgg.female} />
          <Summary label="รถยนต์" value={liveAgg.car} />
          <Summary label="มอไซค์" value={liveAgg.moto} />
          <Summary label="เดินเข้า" value={liveAgg.walk} />
          <Summary label="ของกิน" value={liveAgg.food} />
          <Summary label="ของใช้" value={liveAgg.nonfood} />
          <Summary label="เครื่องดื่ม (แก้ว)" value={liveAgg.cups} highlight />
        </div>
      </div>

      <div className="flex gap-2 mt-4">
        <button onClick={undoLast} className="bg-red-100 border border-red-400 rounded-xl px-4 py-2 hover:bg-red-200">
          ↩️ Undo ล่าสุด
        </button>
        <button
          onClick={exportToExcel}
          className="bg-green-100 border border-green-400 rounded-xl px-4 py-2 hover:bg-green-200"
        >
          📥 ดาวน์โหลด Excel
        </button>
      </div>

      {/* 🔹 ประวัติ */}
      <div className="bg-white rounded-2xl shadow p-4 mt-6 overflow-x-auto">
        <h3 className="font-semibold mb-3 text-gray-800">🕘 ประวัติการบันทึกล่าสุด</h3>
        {events.filter((e) => e.branch_id === branchId).length ? (
          <table className="min-w-full text-sm text-center border">
            <thead className="bg-green-700 text-white">
              <tr>
                <th>#</th>
                <th>วันที่</th>
                <th>ช่วงเวลา</th>
                <th>ประเภท</th>
                <th>รายละเอียด</th>
                <th>อายุ</th>
                <th>อาชีพ</th>
                <th>ลบ</th>
              </tr>
            </thead>
            <tbody>
              {[...events]
                .filter((e) => e.branch_id === branchId)
                .slice(-25)
                .reverse()
                .map((e, i) => (
                  <tr key={e.id} className="border-b hover:bg-gray-50">
                    <td>{i + 1}</td>
                    <td>{e.date}</td>
                    <td>{e.period}</td>
                    <td>{e.type_group}</td>
                    <td>{e.type === "drink" ? `เครื่องดื่ม ${e.cups} แก้ว` : e.type}</td>
                    <td>{e.age}</td>
                    <td>{e.career}</td>
                    <td>
                      <button onClick={() => deleteEvent(e)} className="text-red-500 hover:text-red-700">
                        ❌
                      </button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        ) : (
          <p className="text-gray-500 italic">ยังไม่มีข้อมูลการบันทึก</p>
        )}
      </div>
    </div>
  );
}

// 🔸 Components
function CustomerSection({ addEvent, age, setAge, career, setCareer }) {
  return (
    <div className="bg-white rounded-2xl shadow p-4 mb-6">
      <h3 className="font-semibold mb-3 text-lg text-gray-800">👥 กลุ่มลูกค้า</h3>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-3">
        <select value={age} onChange={(e) => setAge(e.target.value)} className="border p-2 rounded">
          <option>ต่ำกว่า 20 ปี</option>
          <option>20–30 ปี</option>
          <option>30–40 ปี</option>
          <option>40–50 ปี</option>
          <option>50 ปีขึ้นไป</option>
        </select>

        <select value={career} onChange={(e) => setCareer(e.target.value)} className="border p-2 rounded">
          <option>พนักงานออฟฟิศ</option>
          <option>พนักงานทั่วไป</option>
          <option>พ่อค้าแม่ค้า</option>
          <option>นักเรียน / นักศึกษา</option>
        </select>
      </div>

      <div className="flex flex-wrap gap-3">
        <button onClick={() => addEvent("ลูกค้า", "male", null, { age, career })} className="bg-blue-100 px-4 py-3 rounded-lg">
          👨 เพศชาย +1
        </button>
        <button onClick={() => addEvent("ลูกค้า", "female", null, { age, career })} className="bg-pink-100 px-4 py-3 rounded-lg">
          👩 เพศหญิง +1
        </button>
      </div>
    </div>
  );
}

function VehicleSection({ addEvent }) {
  return (
    <div className="bg-white rounded-2xl shadow p-4 mb-6">
      <h3 className="font-semibold mb-4 text-lg text-gray-800">🚗 ยานพาหนะที่ใช้เดินทาง</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-green-50 border border-green-300 rounded-xl p-4">
          <h4 className="font-semibold text-green-700 mb-3 text-center">⬅️ ทางซ้าย</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button onClick={() => addEvent("ยานพาหนะ", "car", "left")} className="btn">🚗 รถยนต์ซ้าย</button>
            <button onClick={() => addEvent("ยานพาหนะ", "moto", "left")} className="btn">🛵 มอไซค์ซ้าย</button>
            <button onClick={() => addEvent("ยานพาหนะ", "walk", "left")} className="btn">🚶 เดินเข้าซ้าย</button>
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-300 rounded-xl p-4">
          <h4 className="font-semibold text-blue-700 mb-3 text-center">➡️ ทางขวา</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button onClick={() => addEvent("ยานพาหนะ", "car", "right")} className="btn">🚗 รถยนต์ขวา</button>
            <button onClick={() => addEvent("ยานพาหนะ", "moto", "right")} className="btn">🛵 มอไซค์ขวา</button>
            <button onClick={() => addEvent("ยานพาหนะ", "walk", "right")} className="btn">🚶 เดินเข้าขวา</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ProductSection({ addEvent, drinkCups, setDrinkCups }) {
  return (
    <div className="bg-white rounded-2xl shadow p-4 mb-6">
      <h3 className="font-semibold mb-3 text-lg text-gray-800">🛒 สินค้าที่ซื้อ</h3>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
        <button onClick={() => addEvent("สินค้า", "food")} className="btn bg-sky-100 hover:bg-sky-200">🍜 ของกิน +1</button>
        <button onClick={() => addEvent("สินค้า", "nonfood")} className="btn bg-indigo-100 hover:bg-indigo-200">🧻 ของใช้ +1</button>
      </div>

      <div className="bg-amber-50 border border-amber-300 rounded-xl p-4">
        <div className="mb-2 font-semibold">🧋 เครื่องดื่ม (1 คน ซื้อกี่แก้ว)</div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center border rounded-lg overflow-hidden">
            <button onClick={() => setDrinkCups((v) => Math.max(1, v - 1))} className="px-3 py-1 bg-amber-100">−</button>
            <input type="number" min={1} value={drinkCups} onChange={(e) => setDrinkCups(Math.max(1, Number(e.target.value) || 1))} className="w-16 text-center" />
            <button onClick={() => setDrinkCups((v) => v + 1)} className="px-3 py-1 bg-amber-100">+</button>
          </div>

          <button onClick={() => addEvent("สินค้า", "drink", null, { cups: drinkCups })} className="bg-amber-500 text-white px-4 py-2 rounded hover:bg-amber-600">
            บันทึกเครื่องดื่ม
          </button>
        </div>
      </div>
    </div>
  );
}

function Summary({ label, value, highlight }) {
  return (
    <div
      className={
        "rounded-xl border p-3 text-center " +
        (highlight ? "bg-emerald-50 border-emerald-200" : "bg-gray-50 border-gray-200")
      }
    >
      <p className="text-gray-600">{label}</p>
      <p className="text-xl font-semibold">{value || 0}</p>
    </div>
  );
}
