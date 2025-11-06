import { useEffect, useMemo, useState } from "react";
import Select from "react-select";
import { supabase } from "../lib/supabaseClient";
import * as XLSX from "xlsx";


const PERIOD_SLOTS = {
  เช้า: ["06:00–07:00", "07:00–08:00", "08:00–09:00", "09:00–10:00"],
  บ่าย: ["12:00–13:00", "13:00–14:00", "14:00–15:00", "15:00–16:00"],
  เย็น: ["17:00–18:00", "18:00–19:00", "19:00–20:00"],
  ดึก: ["20:00–21:00", "21:00–22:00", "22:00–23:00"],
};

const isoDate = (d = new Date()) =>
  new Date(d.getTime() + 7 * 60 * 60 * 1000).toISOString().split("T")[0];

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
  const [searchTerm, setSearchTerm] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(false);

  const today = isoDate(new Date());

  // 🔹 โหลดสาขาจาก Supabase
  useEffect(() => {
    async function fetchBranches() {
      const { data, error } = await supabase.from("branches").select("id, name");
      if (!error && data) {
        setBranches(data);
        if (!canSelectBranch && currentUser?.branch) setBranch(currentUser.branch);
      }
    }
    fetchBranches();
  }, [canSelectBranch, currentUser?.branch]);

  // 🔹 โหลดข้อมูล TC Report ของวันนี้
  useEffect(() => {
    if (!branch) return;
    async function fetchReports() {
      setLoading(true);
      const { data, error } = await supabase
        .from("tc_report")
        .select("*")
        .eq("date", today)
        .eq("branch_id", branch)
        .order("created_at", { ascending: true });

      if (!error && data) setRecords(data);
      setLoading(false);
    }
    fetchReports();
  }, [branch, today]);

  // 🔹 เพิ่ม / แก้ไขข้อมูล
  const addRecord = async () => {
    if (!branch) return alert("กรุณาเลือกสาขา");
    if (!billCount) return alert("กรอกจำนวนบิลก่อน");

    if (editingId) {
      // ✏️ แก้ไข
      const { error } = await supabase
        .from("tc_report")
        .update({
          bill_count: Number(billCount),
          note,
          period,
          slot,
        })
        .eq("id", editingId);

      if (!error) {
        alert("✅ แก้ไขเรียบร้อย");
        setEditingId(null);
        setBillCount("");
        setNote("");
        reloadData();
      } else {
        console.error("Update error:", error);
      }
    } else {
      // ➕ เพิ่มใหม่
      const { error } = await supabase.from("tc_report").insert([
        {
          branch_id: branch,
          date: today,
          period,
          slot,
          bill_count: Number(billCount),
          note,
          created_by: currentUser.username || "-",
        },
      ]);

      if (!error) {
        alert("✅ บันทึกเรียบร้อย");
        setBillCount("");
        setNote("");
        reloadData();
      } else {
        console.error("Insert error:", error);
      }
    }
  };

  // 🔹 โหลดข้อมูลใหม่หลังแก้ไข
  const reloadData = async () => {
    const { data } = await supabase
      .from("tc_report")
      .select("*")
      .eq("date", today)
      .eq("branch_id", branch)
      .order("created_at", { ascending: true });
    setRecords(data || []);
  };

  // 🔹 ลบข้อมูล
  const deleteRecord = async (id) => {
    if (!confirm("ต้องการลบข้อมูลนี้ใช่ไหม?")) return;
    const { error } = await supabase.from("tc_report").delete().eq("id", id);
    if (!error) reloadData();
  };

  // 🔹 เริ่มแก้ไข
  const startEdit = (rec) => {
    setEditingId(rec.id);
    setPeriod(rec.period);
    setSlot(rec.slot);
    setBillCount(rec.bill_count);
    setNote(rec.note || "");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // 🔹 ข้อมูลสรุปวันนี้
  const todayData = useMemo(() => {
    return records.filter((r) =>
      !searchTerm
        ? true
        : r.note?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          r.period.toLowerCase().includes(searchTerm.toLowerCase()) ||
          r.slot.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [records, searchTerm]);

  const totalToday = todayData.reduce((sum, x) => sum + (x.bill_count || 0), 0);

  // 🔹 ✅ Export Excel
  const exportToExcel = () => {
    if (todayData.length === 0) return alert("ไม่มีข้อมูลให้ดาวน์โหลด");

    const ws = XLSX.utils.json_to_sheet(
      todayData.map((r) => ({
        วันที่: r.date,
        สาขา: r.branch_id,
        ช่วงเวลา: r.period,
        เวลา: r.slot,
        จำนวนบิล: r.bill_count,
        ผู้บันทึก: r.created_by,
        หมายเหตุ: r.note || "-",
      }))
    );
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "TC Report");
    XLSX.writeFile(wb, `TC_Report_${branch}_${today}.xlsx`);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">💰 บันทึกยอดบิล (TC Report)</h2>

      {/* ฟอร์ม */}
      <div className="bg-white rounded-2xl shadow p-4 mb-6 flex flex-col md:flex-row flex-wrap gap-3">
        {/* สาขา */}
        {canSelectBranch ? (
          <div className="w-full md:w-64">
            <Select
              options={branches.map((b) => ({
                value: b.id,
                label: `${b.name} (${b.id})`,
              }))}
              value={branch ? { value: branch, label: branch } : null}
              onChange={(option) => setBranch(option?.value || "")}
              placeholder="🔍 ค้นหาสาขา..."
              isClearable
            />
          </div>
        ) : (
          <input
            value={branch}
            disabled
            className="border p-2 rounded bg-gray-100 text-gray-600 w-full md:w-auto"
          />
        )}

        {/* ช่วง */}
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

        {/* เวลา */}
        <select
          value={slot}
          onChange={(e) => setSlot(e.target.value)}
          className="border p-2 rounded w-full md:w-auto"
        >
          {PERIOD_SLOTS[period].map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>

        {/* จำนวนบิล */}
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
          {editingId ? "บันทึกการแก้ไข" : "บันทึก"}
        </button>

        {editingId && (
          <button
            onClick={() => {
              setEditingId(null);
              setBillCount("");
              setNote("");
            }}
            className="bg-gray-100 border border-gray-400 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition w-full md:w-auto"
          >
            ❌ ยกเลิก
          </button>
        )}
      </div>

      {/* ช่องค้นหา + ปุ่มดาวน์โหลด */}
      <div className="flex flex-col md:flex-row justify-between items-center mb-4 gap-3">
        <div className="relative w-full md:w-96">
          <span className="absolute left-3 top-2.5 text-gray-400">🔍</span>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="ค้นหา หมายเหตุ / ช่วงเวลา"
            className="pl-8 w-full border p-2 rounded-lg shadow-sm focus:ring focus:ring-green-200"
          />
        </div>

        <button
          onClick={exportToExcel}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
        >
          📊 ดาวน์โหลด Excel
        </button>
      </div>

      {/* ตาราง */}
      <div className="bg-white rounded-2xl shadow p-4 overflow-x-auto">
        <h3 className="font-semibold mb-4 text-gray-700">
          รายการประจำวันที่ {new Date().toLocaleDateString("th-TH")}{" "}
          <span className="text-green-700 font-bold">
            (รวมทั้งหมด {totalToday.toLocaleString()} บิล)
          </span>
        </h3>

        {loading ? (
          <p className="text-center text-gray-500">กำลังโหลดข้อมูล...</p>
        ) : (
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
                <th className="py-2 px-3">จัดการ</th>
              </tr>
            </thead>
            <tbody>
              {todayData.length ? (
                todayData.map((r, i) => (
                  <tr key={r.id} className={i % 2 ? "bg-green-50" : "bg-white"}>
                    <td>{r.branch_id}</td>
                    <td>{r.date}</td>
                    <td>{r.period}</td>
                    <td>{r.slot}</td>
                    <td className="text-green-700 font-semibold">{r.bill_count}</td>
                    <td>{r.created_by}</td>
                    <td>{r.note || "-"}</td>
                    <td className="space-x-2">
                      <button
                        onClick={() => startEdit(r)}
                        className="bg-yellow-400 text-white px-3 py-1 rounded hover:bg-yellow-500"
                      >
                        แก้ไข
                      </button>
                      <button
                        onClick={() => deleteRecord(r.id)}
                        className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600"
                      >
                        ลบ
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="8" className="py-4 text-gray-500 italic">
                    ยังไม่มีข้อมูลในวันนี้
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}