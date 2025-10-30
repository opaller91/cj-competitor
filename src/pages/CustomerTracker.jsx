import { useEffect, useMemo, useState } from "react";
import branchesData from "../data/branches.json";

const STORAGE_KEY = "customerTrackerEvents_v2";

// 🔹 ตารางเวลาไทย (UTC+7)
const SLOT_MAP = {
  เช้า: [
    ["06:00", "07:00"],
    ["07:00", "08:00"],
    ["08:00", "09:00"],
    ["09:00", "10:00"],
    ["10:00", "11:00"],
  ],
  บ่าย: [
    ["12:00", "13:00"],
    ["13:00", "14:00"],
    ["14:00", "15:00"],
    ["15:00", "16:00"],
    ["16:00", "17:00"],
  ],
  เย็น: [
    ["17:00", "18:00"],
    ["18:00", "19:00"],
  ],
  ดึก: [
    ["19:00", "20:00"],
    ["20:00", "21:00"],
    ["21:00", "22:00"],
    ["22:00", "23:00"],
  ],
};

// 🔹 ฟังก์ชันคำนวณช่วงเวลา
function hourToPeriodSlot(d = new Date()) {
  const local = new Date(d.getTime() + 7 * 60 * 60 * 1000); // ไทย +7
  const h = local.getUTCHours();
  const m = local.getUTCMinutes();
  const two = (x) => x.toString().padStart(2, "0");
  const stamp = `${two(h)}:${two(m)}`;
  const inRange = (s, e) => stamp >= s && stamp < e;

  for (const [period, slots] of Object.entries(SLOT_MAP)) {
    for (const [s, e] of slots) if (inRange(s, e)) return { period, slotLabel: `${s}–${e}` };
  }
  return { period: "เช้า", slotLabel: "06:00–07:00" };
}

const isoDate = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;

export default function CustomerTracker() {
  const currentUser = JSON.parse(localStorage.getItem("currentUser") || "{}");
  const canSelectBranch =
    currentUser?.role === "Admin" || currentUser?.branch === "Team Seal";

  const [branches, setBranches] = useState([]);
  const [branch, setBranch] = useState("");
  const [{ period, slotLabel }, setTimeBox] = useState(hourToPeriodSlot());
  const [events, setEvents] = useState([]);
  const [drinkCups, setDrinkCups] = useState(1);
  const [age, setAge] = useState("20–30");
  const [career, setCareer] = useState("พนักงานออฟฟิศ");

  useEffect(() => {
    const b = JSON.parse(localStorage.getItem("branchesVersioned") || "null");
    setBranches(b?.list || branchesData.list);

    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    if (!stored || stored.version !== 2) {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ version: 2, events: [] })
      );
      setEvents([]);
    } else {
      setEvents(stored.events || []);
    }

    if (!canSelectBranch && currentUser?.branch) setBranch(currentUser.branch);

    // อัปเดตเวลาทุก 30 วิ
    const t = setInterval(() => setTimeBox(hourToPeriodSlot(new Date())), 30000);
    return () => clearInterval(t);
  }, [canSelectBranch, currentUser?.branch]);

  const persist = (next) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 2, events: next }));
    setEvents(next);
  };

  // ✅ context ปัจจุบัน
  const nowCtx = useMemo(() => {
    const now = new Date();
    return {
      date: isoDate(now),
      period,
      hourSlot: slotLabel,
      branch,
      createdAt: now.toISOString(),
      createdBy: currentUser?.username || "",
    };
  }, [branch, period, slotLabel, currentUser?.username]);

  const addEvent = (group, type, dir = null, extra = {}) => {
    if (!branch) {
      alert("กรุณาเลือกสาขา");
      return;
    }

    const entry = {
      ...nowCtx,
      typeGroup: group, // เช่น “ลูกค้า”, “ยานพาหนะ”, “สินค้า”
      type, // เช่น male, car, food
      dir, // left, right
      qty: 1,
      ...extra,
    };
    persist([...events, entry]);
  };

  // 🔹 Undo ล่าสุด
  const undoLast = () => {
    if (!events.length) return;
    const idx = [...events]
      .reverse()
      .findIndex((e) => e.branch === branch && e.date === isoDate());
    if (idx === -1) return;
    const realIndex = events.length - 1 - idx;
    const next = [...events];
    next.splice(realIndex, 1);
    persist(next);
  };

  // 🔹 รวมสรุป
  const liveAgg = useMemo(() => {
    const today = isoDate();
    const f = events.filter(
      (e) =>
        e.branch === branch &&
        e.date === today &&
        e.period === period &&
        e.hourSlot === slotLabel
    );

    const sum = (sel) => f.filter(sel).length;
    const sumCups = () =>
      f.filter((e) => e.type === "drink").reduce((a, c) => a + (Number(c.cups) || 0), 0);

    return {
      male: sum((e) => e.typeGroup === "ลูกค้า" && e.type === "male"),
      female: sum((e) => e.typeGroup === "ลูกค้า" && e.type === "female"),
      car: sum((e) => e.typeGroup === "ยานพาหนะ" && e.type === "car"),
      moto: sum((e) => e.typeGroup === "ยานพาหนะ" && e.type === "moto"),
      walk: sum((e) => e.typeGroup === "ยานพาหนะ" && e.type === "walk"),
      food: sum((e) => e.typeGroup === "สินค้า" && e.type === "food"),
      nonfood: sum((e) => e.typeGroup === "สินค้า" && e.type === "nonfood"),
      drink: sum((e) => e.typeGroup === "สินค้า" && e.type === "drink"),
      cups: sumCups(),
    };
  }, [events, branch, period, slotLabel]);

  return (
    <div className="min-h-screen bg-secondary p-4 md:p-6">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">
        🧍‍♀️ เก็บข้อมูลลูกค้าเข้า CJ — Real-time
      </h2>

      {/* 🔹 ส่วนเลือกสาขา */}
      <div className="bg-white rounded-2xl shadow p-4 mb-6 flex flex-col md:flex-row gap-3 items-start md:items-center">
        {canSelectBranch ? (
          <select
            value={branch}
            onChange={(e) => setBranch(e.target.value)}
            className="border p-2 rounded"
          >
            <option value="">เลือกสาขา</option>
            {branches.map((b) => (
              <option key={b.id} value={b.name}>
                {b.name}
              </option>
            ))}
          </select>
        ) : (
          <input
            value={branch}
            disabled
            className="border p-2 rounded bg-gray-50 text-gray-600"
          />
        )}
        <div className="text-sm text-gray-700">
          วันนี้: <b>{isoDate()}</b> | ช่วง: <b>{period}</b> | ชั่วโมง:{" "}
          <b>{slotLabel}</b>
        </div>
      </div>

      {/* 🔹 กลุ่มลูกค้า */}
      <div className="bg-white rounded-2xl shadow p-4 mb-6">
        <h3 className="font-semibold mb-3 text-lg text-gray-800">
          👥 กลุ่มลูกค้า
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-3">
          <select
            value={age}
            onChange={(e) => setAge(e.target.value)}
            className="border p-2 rounded"
          >
            <option>ต่ำกว่า 20 ปี</option>
            <option>20–30 ปี</option>
            <option>30–40 ปี</option>
            <option>40–50 ปี</option>
            <option>50 ปีขึ้นไป</option>
          </select>

          <select
            value={career}
            onChange={(e) => setCareer(e.target.value)}
            className="border p-2 rounded"
          >
            <option>พนักงานออฟฟิศ</option>
            <option>พนักงานทั่วไป</option>
            <option>พ่อค้าแม่ค้า</option>
            <option>นักเรียน / นักศึกษา</option>
          </select>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => addEvent("ลูกค้า", "male", null, { age, career })}
            className="bg-blue-100 border border-blue-300 px-4 py-3 rounded-lg hover:bg-blue-200"
          >
            👨 เพศชาย +1
          </button>
          <button
            onClick={() => addEvent("ลูกค้า", "female", null, { age, career })}
            className="bg-pink-100 border border-pink-300 px-4 py-3 rounded-lg hover:bg-pink-200"
          >
            👩 เพศหญิง +1
          </button>
        </div>
      </div>

      {/* 🔹 ยานพาหนะ */}
      <VehicleSection addEvent={addEvent} />

      {/* 🔹 สินค้าที่ซื้อ */}
      <ProductSection
        addEvent={addEvent}
        drinkCups={drinkCups}
        setDrinkCups={setDrinkCups}
      />

      {/* 🔹 สรุป realtime */}
      <div className="bg-white rounded-2xl shadow p-4 mt-6">
        <h3 className="font-semibold mb-3">
          สรุป {isoDate()} | {branch || "-"} | {period} {slotLabel}
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

      {/* ❌ Undo */}
      <button
        onClick={undoLast}
        className="bg-red-100 border border-red-400 rounded-xl px-4 py-2 mt-4 hover:bg-red-200"
      >
        ↩️ Undo ล่าสุด
      </button>
    </div>
  );
}

// 🔸 Components
function VehicleSection({ addEvent }) {
  return (
    <div className="bg-white rounded-2xl shadow p-4 mb-6">
      <h3 className="font-semibold mb-4 text-lg text-gray-800">
        🚗 ยานพาหนะที่ใช้เดินทาง
      </h3>
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
        <button onClick={() => addEvent("สินค้า", "food")} className="btn bg-sky-100 hover:bg-sky-200">
          🍜 ของกิน +1
        </button>
        <button onClick={() => addEvent("สินค้า", "nonfood")} className="btn bg-indigo-100 hover:bg-indigo-200">
          🧻 ของใช้ +1
        </button>
      </div>

      <div className="bg-amber-50 border border-amber-300 rounded-xl p-4">
        <div className="mb-2 font-semibold">🧋 เครื่องดื่ม (1 คน ซื้อกี่แก้ว)</div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center border rounded-lg overflow-hidden">
            <button onClick={() => setDrinkCups((v) => Math.max(1, v - 1))} className="px-3 py-1 bg-amber-100">−</button>
            <input
              type="number"
              min={1}
              value={drinkCups}
              onChange={(e) => setDrinkCups(Math.max(1, Number(e.target.value) || 1))}
              className="w-16 text-center"
            />
            <button onClick={() => setDrinkCups((v) => v + 1)} className="px-3 py-1 bg-amber-100">+</button>
          </div>

          <button
            onClick={() => addEvent("สินค้า", "drink", null, { cups: drinkCups })}
            className="bg-amber-500 text-white px-4 py-2 rounded hover:bg-amber-600"
          >
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
