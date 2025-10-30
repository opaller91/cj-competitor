// 🔹 TCReport.jsx
import { useEffect, useMemo, useState } from "react";
import branchesData from "../data/branches.json";

const STORAGE_KEY = "tcReportVersioned";
const VERSION = 2;

// 🔸 กำหนดช่วงเวลาหลักและย่อย
const PERIOD_SLOTS = {
  เช้า: ["06:00–07:00", "07:00–08:00", "08:00–09:00", "09:00–10:00"],
  บ่าย: ["12:00–13:00", "13:00–14:00", "14:00–15:00", "15:00–16:00"],
  เย็น: ["17:00–18:00", "18:00–19:00", "19:00–20:00"],
  ดึก: ["20:00–21:00", "21:00–22:00", "22:00–23:00"],
};

// ✅ ฟังก์ชันสร้างวันที่แบบไทย
const isoDate = (d = new Date()) => {
  const local = new Date(d.getTime() + 7 * 60 * 60 * 1000);
  return `${local.getFullYear()}-${String(local.getMonth() + 1).padStart(
    2,
    "0"
  )}-${String(local.getDate()).padStart(2, "0")}`;
};

export default function TCReport() {
  const currentUser = JSON.parse(localStorage.getItem("currentUser") || "{}");
  const canSelectBranch =
    currentUser?.role === "Admin" || currentUser?.branch === "Team Seal";

  const [branches, setBranches] = useState([]);
  const [branch, setBranch] = useState("");
  const [records, setRecords] = useState([]);

  const [period, setPeriod] = useState("เช้า");
  const [slot, setSlot] = useState("06:00–07:00");
  const [billCount, setBillCount] = useState("");
  const [note, setNote] = useState("");

  // โหลดข้อมูลเริ่มต้น
  useEffect(() => {
    const b = JSON.parse(localStorage.getItem("branchesVersioned") || "null");
    setBranches(b?.list || branchesData.list);

    if (!canSelectBranch && currentUser?.branch) setBranch(currentUser.branch);

    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    if (!stored || stored.version !== VERSION) {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ version: VERSION, data: [] })
      );
      setRecords([]);
    } else {
      setRecords(stored.data || []);
    }
  }, [canSelectBranch, currentUser?.branch]);

  // บันทึกข้อมูลใหม่
  const persist = (next) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: VERSION, data: next }));
    setRecords(next);
  };

  const addRecord = () => {
    if (!branch) return alert("กรุณาเลือกสาขา");
    if (!billCount) return alert("กรอกจำนวนบิลก่อน");

    const record = {
      id: Date.now(),
      branch,
      date: isoDate(new Date()),
      period,
      slot,
      billCount: Number(billCount),
      note,
      createdBy: currentUser.username || "-",
      createdAt: new Date().toLocaleString("th-TH"),
    };

    persist([...records, record]);
    setBillCount("");
    setNote("");
  };

  const undoLast = () => {
    if (!records.length) return alert("ไม่มีข้อมูลให้ลบ");
    const lastIdx = [...records]
      .reverse()
      .findIndex((r) => r.branch === branch && r.date === isoDate());
    if (lastIdx === -1) return alert("ไม่มีข้อมูลวันนี้ในสาขานี้");
    const realIndex = records.length - 1 - lastIdx;
    const next = [...records];
    next.splice(realIndex, 1);
    persist(next);
  };

  const today = isoDate(new Date());
  const todayData = useMemo(
    () => records.filter((r) => r.date === today && r.branch === branch),
    [records, branch]
  );

  const totalToday = todayData.reduce((sum, x) => sum + (x.billCount || 0), 0);

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">
        💰 บันทึกยอดบิล (TC Report)
      </h2>

      {/* ฟอร์มบันทึก */}
      <div className="bg-white rounded-2xl shadow p-4 mb-6 flex flex-col md:flex-row flex-wrap gap-3">
        {/* เลือกสาขา */}
        {canSelectBranch ? (
          <select
            value={branch}
            onChange={(e) => setBranch(e.target.value)}
            className="border p-2 rounded w-full md:w-auto"
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
            className="border p-2 rounded bg-gray-100 text-gray-600 w-full md:w-auto"
          />
        )}

        {/* เลือกช่วงหลัก */}
        <select
          value={period}
          onChange={(e) => {
            setPeriod(e.target.value);
            setSlot(PERIOD_SLOTS[e.target.value][0]);
          }}
          className="border p-2 rounded w-full md:w-auto"
        >
          {Object.keys(PERIOD_SLOTS).map((p) => (
            <option key={p}>{p}</option>
          ))}
        </select>

        {/* เลือกช่วงย่อย */}
        <select
          value={slot}
          onChange={(e) => setSlot(e.target.value)}
          className="border p-2 rounded w-full md:w-auto"
        >
          {PERIOD_SLOTS[period].map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>

        {/* กรอกยอดบิล */}
        <input
          type="number"
          placeholder="จำนวนบิล"
          value={billCount}
          onChange={(e) => setBillCount(e.target.value)}
          className="border p-2 rounded w-full md:w-40"
        />

        {/* หมายเหตุ */}
        <input
          type="text"
          placeholder="หมายเหตุ (ถ้ามี)"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className="border p-2 rounded flex-1"
        />

        <button
          onClick={addRecord}
          className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition w-full md:w-auto"
        >
          บันทึก
        </button>

        <button
          onClick={undoLast}
          className="bg-red-100 border border-red-400 text-red-700 px-4 py-2 rounded-lg hover:bg-red-200 transition w-full md:w-auto"
        >
          ↩️ Undo ล่าสุด
        </button>
      </div>

      {/* ตารางสรุป */}
      <div className="bg-white rounded-2xl shadow p-4 overflow-x-auto">
        <h3 className="font-semibold mb-4 text-gray-700">
          รายการบันทึกประจำวันที่{" "}
          {new Date().toLocaleDateString("th-TH", {
            day: "2-digit",
            month: "long",
          })}{" "}
          <span className="text-green-700 font-bold">
            (รวมทั้งหมด {totalToday.toLocaleString()} บิล)
          </span>
        </h3>

        <table className="min-w-full text-sm border text-center">
          <thead className="bg-green-700 text-white">
            <tr>
              <th className="py-2 px-3">สาขา</th>
              <th className="py-2 px-3">วันที่</th>
              <th className="py-2 px-3">ช่วง</th>
              <th className="py-2 px-3">เวลา</th>
              <th className="py-2 px-3">จำนวนบิล</th>
              <th className="py-2 px-3">ผู้บันทึก</th>
              <th className="py-2 px-3">หมายเหตุ</th>
            </tr>
          </thead>
          <tbody>
            {todayData.length ? (
              todayData.map((r, i) => (
                <tr key={r.id} className={i % 2 ? "bg-green-50" : "bg-white"}>
                  <td className="py-2 px-3">{r.branch}</td>
                  <td className="py-2 px-3">{r.date}</td>
                  <td className="py-2 px-3">{r.period}</td>
                  <td className="py-2 px-3 text-gray-700 font-semibold">{r.slot}</td>
                  <td className="py-2 px-3 text-green-700 font-semibold">
                    {r.billCount.toLocaleString()}
                  </td>
                  <td className="py-2 px-3">{r.createdBy}</td>
                  <td className="py-2 px-3">{r.note || "-"}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={7} className="py-4 text-gray-500 italic">
                  ยังไม่มีข้อมูลในวันนี้
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}