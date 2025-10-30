import { useEffect, useMemo, useState } from "react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
} from "recharts";
import branchesData from "../data/branches.json";

const STORAGE_TRACKER = "customerTrackerEvents_v2";
const STORAGE_TC = "tcReportVersioned";
const COLORS = ["#4ade80", "#60a5fa", "#fbbf24", "#f87171", "#a78bfa"];

export default function BranchSummary() {
  const currentUser = JSON.parse(localStorage.getItem("currentUser") || "{}");
  const canSelectBranch =
    currentUser?.role === "Admin" || currentUser?.branch === "Team Seal";

  const [branches, setBranches] = useState([]);
  const [branch, setBranch] = useState("");
  const [trackerEvents, setTrackerEvents] = useState([]);
  const [tcRecords, setTcRecords] = useState([]);

  const [selectedDate, setSelectedDate] = useState("ทั้งหมด");
  const [selectedPeriod, setSelectedPeriod] = useState("ทั้งหมด");

  useEffect(() => {
    try {
      const t = JSON.parse(localStorage.getItem(STORAGE_TRACKER) || "null");
      const tc = JSON.parse(localStorage.getItem(STORAGE_TC) || "null");
      setTrackerEvents(t?.events || []);
      setTcRecords(tc?.data || []);

      const b = JSON.parse(localStorage.getItem("branchesVersioned") || "null");
      setBranches(b?.list || branchesData.list);
      if (!canSelectBranch && currentUser?.branch) setBranch(currentUser.branch);
    } catch (err) {
      console.error("❌ โหลดข้อมูลล้มเหลว:", err);
      setTrackerEvents([]);
      setTcRecords([]);
      setBranches(branchesData.list);
    }
  }, [canSelectBranch, currentUser?.branch]);

  const branchOptions = useMemo(() => {
    const list = branches.map((b) => b.name);
    return canSelectBranch ? ["เฉลี่ยทุกสาขา", ...list] : list;
  }, [branches, canSelectBranch]);

  const filteredTracker = useMemo(() => {
    if (branch === "เฉลี่ยทุกสาขา") return trackerEvents;
    return trackerEvents.filter((e) => e.branch === branch);
  }, [trackerEvents, branch]);

  const filteredTC = useMemo(() => {
    if (branch === "เฉลี่ยทุกสาขา") return tcRecords;
    return tcRecords.filter((r) => r.branch === branch);
  }, [tcRecords, branch]);

  const allDates = useMemo(() => {
    const unique = [
      ...new Set([
        ...filteredTracker.map((e) => e.date),
        ...filteredTC.map((r) => r.date),
      ]),
    ]
      .filter(Boolean)
      .sort()
      .reverse();
    return ["ทั้งหมด", ...unique];
  }, [filteredTracker, filteredTC]);

  const allPeriods = ["ทั้งหมด", "เช้า", "บ่าย", "เย็น", "ดึก"];

  const filteredTrackerEvents = useMemo(
    () =>
      filteredTracker.filter(
        (e) =>
          (selectedDate === "ทั้งหมด" || e.date === selectedDate) &&
          (selectedPeriod === "ทั้งหมด" || e.period === selectedPeriod)
      ),
    [filteredTracker, selectedDate, selectedPeriod]
  );

  const filteredTCData = useMemo(
    () =>
      filteredTC.filter(
        (r) =>
          (selectedDate === "ทั้งหมด" || r.date === selectedDate) &&
          (selectedPeriod === "ทั้งหมด" || r.period === selectedPeriod)
      ),
    [filteredTC, selectedDate, selectedPeriod]
  );

  const groupedSummary = useMemo(() => {
    const dates = new Set([
      ...filteredTrackerEvents.map((e) => e.date),
      ...filteredTCData.map((r) => r.date),
    ]);

    return [...dates].map((date) => {
      const tList = filteredTrackerEvents.filter((e) => e.date === date);
      const tcList = filteredTCData.filter((r) => r.date === date);

      const sumBy = (f) => tList.filter(f).length;
      const sumCup = () =>
        tList
          .filter((x) => x.type === "drink")
          .reduce((a, c) => a + (Number(c.cups) || 0), 0);
      const totalTC = tcList.reduce((a, c) => a + (c.billCount || 0), 0);

      return {
        date,
        car: sumBy((x) => x.type === "car"),
        moto: sumBy((x) => x.type === "moto"),
        walk: sumBy((x) => x.type === "walk"),
        male: sumBy((x) => x.type === "male"),
        female: sumBy((x) => x.type === "female"),
        food: sumBy((x) => x.type === "food"),
        nonfood: sumBy((x) => x.type === "nonfood"),
        drinkPerson: sumBy((x) => x.type === "drink"),
        drinkCup: sumCup(),
        totalTC,
      };
    });
  }, [filteredTrackerEvents, filteredTCData]);

  const totalTCOverall = groupedSummary.reduce((a, c) => a + c.totalTC, 0);
  const tcChartData = groupedSummary.map((d) => ({
    date: d.date,
    totalTC: d.totalTC,
  }));

  const totalFood = filteredTrackerEvents.filter((e) => e.type === "food").length;
  const totalNonFood = filteredTrackerEvents.filter((e) => e.type === "nonfood").length;
  const totalDrink = filteredTrackerEvents
    .filter((e) => e.type === "drink")
    .reduce((a, c) => a + (Number(c.cups) || 0), 0);
  const totalAll = totalFood + totalNonFood + totalDrink || 1;

  const productPie = [
    { name: "ของใช้", value: (totalNonFood / totalAll) * 100 },
    { name: "อาหาร", value: (totalFood / totalAll) * 100 },
    { name: "เครื่องดื่ม", value: (totalDrink / totalAll) * 100 },
  ];

  // ✅ นับอาชีพจริง
  const careerCounts = useMemo(() => {
    const map = {};
    const list = filteredTrackerEvents.filter(
      (e) => (e.typeGroup || "").trim() === "ลูกค้า"
    );
    list.forEach((e) => {
      const career =
        e.career || e.job || e.position || e.occupation || "ไม่ระบุอาชีพ";
      map[career] = (map[career] || 0) + 1;
    });
    return map;
  }, [filteredTrackerEvents]);

  const totalCareer = Object.values(careerCounts).reduce((a, c) => a + c, 0) || 1;
  const customerPie = Object.entries(careerCounts).map(([career, count]) => ({
    name: career,
    value: Number(((count / totalCareer) * 100).toFixed(1)),
  }));

  // ✅ สรุปช่วงอายุ
  const ageGroups = [
    { range: "ต่ำกว่า 20 ปี", min: 0, max: 20 },
    { range: "30-40 ปี", min: 30, max: 40 },
    { range: "40-50 ปี", min: 40, max: 50 },
    { range: "50-60 ปี", min: 50, max: 60 },
  ];

  const ageData = ageGroups.map((g) => {
    const count = filteredTrackerEvents.filter(
      (e) =>
        (e.typeGroup || "").trim() === "ลูกค้า" &&
        Number(e.age) >= g.min &&
        Number(e.age) < g.max
    ).length;
    return { ...g, percent: ((count / (totalCareer || 1)) * 100).toFixed(0) };
  });

  // ✅ ยานพาหนะ
  const vehiclePie = [
    {
      name: "รถยนต์",
      value: filteredTrackerEvents.filter((e) => e.type === "car").length,
    },
    {
      name: "มอไซค์",
      value: filteredTrackerEvents.filter((e) => e.type === "moto").length,
    },
    {
      name: "เดินเข้า",
      value: filteredTrackerEvents.filter((e) => e.type === "walk").length,
    },
  ];

  return (
    <div className="min-h-screen bg-secondary p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-3">
        <h2 className="text-2xl font-bold text-gray-800">
          {branch === "เฉลี่ยทุกสาขา"
            ? `สรุปเฉลี่ยทุกสาขา (${branches.length} สาขา)`
            : `สรุปข้อมูลสาขา ${branch || "-"}`}
        </h2>
        {canSelectBranch && (
          <select
            value={branch}
            onChange={(e) => setBranch(e.target.value)}
            className="border p-2 rounded-lg shadow bg-white"
          >
            <option value="">เลือกสาขา</option>
            {branchOptions.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 mb-8">
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">เลือกวันที่</label>
          <select
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="border p-2 rounded-lg bg-white shadow-sm"
          >
            {allDates.map((d) => (
              <option key={d}>{d}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">เลือกช่วงเวลา</label>
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="border p-2 rounded-lg bg-white shadow-sm"
          >
            {allPeriods.map((p) => (
              <option key={p}>{p}</option>
            ))}
          </select>
        </div>
      </div>

      {/* TC รวม */}
      <div className="bg-white rounded-2xl shadow p-4 mb-6">
        <h3 className="text-xl font-semibold text-gray-800 mb-2">💰 จำนวน TC รวมทั้งหมด</h3>
        <p className="text-3xl font-bold text-green-600">
          {totalTCOverall.toLocaleString()} <span className="text-gray-500 text-base">บิล</span>
        </p>
      </div>

      {/* กราฟ TC */}
      <div className="bg-white rounded-2xl shadow p-4 mb-10">
        <h3 className="text-xl font-semibold text-gray-800 mb-4">📈 กราฟ TC รายวัน</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={tcChartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="totalTC" fill="#4ade80" name="ยอดบิล (TC)" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* พฤติกรรมลูกค้า */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
        <SummaryCard title="1. กลุ่มสินค้าซื้อบ่อย">
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie data={productPie} dataKey="value" nameKey="name" outerRadius={80} label={({ name }) => name}>
                {productPie.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </SummaryCard>

        <SummaryCard title="2. กลุ่มลูกค้าตามอาชีพ">
          {customerPie.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={customerPie} dataKey="value" nameKey="name" outerRadius={80} label={({ name }) => name}>
                  {customerPie.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-center text-gray-500 mt-10 italic">ยังไม่มีข้อมูลลูกค้า</p>
          )}
        </SummaryCard>
      </div>

      {/* 🔸 ตารางอายุ + กราฟยานพาหนะ */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
        <SummaryCard title="3. แบ่งตามช่วงอายุ">
          <table className="min-w-full text-sm text-center border">
            <thead className="bg-green-700 text-white">
              <tr>
                <th className="py-2 px-3">กลุ่มอายุ</th>
                <th>ร้อยละ (%)</th>
              </tr>
            </thead>
            <tbody>
              {ageData.map((a, i) => (
                <tr key={i} className={i % 2 ? "bg-green-50" : "bg-white"}>
                  <td className="py-2">{a.range}</td>
                  <td className="font-semibold">{a.percent}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </SummaryCard>

        <SummaryCard title="4. สัดส่วนยานพาหนะ">
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie data={vehiclePie} dataKey="value" nameKey="name" outerRadius={80} label={({ name }) => name}>
                {vehiclePie.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </SummaryCard>
      </div>

      {/* ตารางรายวัน */}
      <div className="bg-white p-4 rounded-2xl shadow overflow-x-auto">
        <h3 className="text-xl font-semibold mb-4 text-gray-800">📅 สรุปข้อมูลรายวัน</h3>
        <table className="min-w-full text-sm text-center border">
          <thead className="bg-green-700 text-white">
            <tr>
              <th className="py-2 px-3">วันที่</th>
              <th>รถยนต์</th>
              <th>มอไซค์</th>
              <th>เดินเข้า</th>
              <th>ชาย</th>
              <th>หญิง</th>
              <th>ของกิน</th>
              <th>ของใช้</th>
              <th>เครื่องดื่ม(คน)</th>
              <th>เครื่องดื่ม(แก้ว)</th>
              <th>จำนวน TC รวม</th>
            </tr>
          </thead>
          <tbody>
            {groupedSummary.length ? (
              groupedSummary.map((r, i) => (
                <tr key={i} className={i % 2 ? "bg-green-50" : "bg-white"}>
                  <td className="py-2 px-3">{r.date}</td>
                  <td>{r.car}</td>
                  <td>{r.moto}</td>
                  <td>{r.walk}</td>
                  <td>{r.male}</td>
                  <td>{r.female}</td>
                  <td>{r.food}</td>
                  <td>{r.nonfood}</td>
                  <td>{r.drinkPerson}</td>
                  <td>{r.drinkCup}</td>
                  <td className="font-semibold text-green-700">{r.totalTC}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={11} className="py-4 text-gray-500 italic">
                  ยังไม่มีข้อมูลในช่วงที่เลือก
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SummaryCard({ title, children }) {
  return (
    <div className="bg-white rounded-2xl shadow p-4">
      <h3 className="font-semibold mb-3 text-gray-700">{title}</h3>
      {children}
    </div>
  );
}
