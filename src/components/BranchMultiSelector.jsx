import { useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";
import branchesData from "../data/branches.json";

export default function BranchMultiSelector({
  selectedBranches,
  setSelectedBranches,
  canSelectBranch,
}) {
  const [branches, setBranches] = useState([]);
  const [search, setSearch] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);

  const currentUser = JSON.parse(localStorage.getItem("currentUser") || "{}");

  useEffect(() => {
    const fetchBranches = async () => {
      try {
        // ✅ โหลดข้อมูลจาก Supabase ก่อน
        const { data, error } = await supabase
          .from("branches")
          .select("id, name, province, district")
          .order("id", { ascending: true });

        if (error) throw error;

        if (data && data.length > 0) {
          setBranches(data);
          // เก็บลง localStorage เผื่อ offline
          localStorage.setItem(
            "branchesVersioned",
            JSON.stringify({ version: 2, list: data })
          );
        } else {
          throw new Error("No branches found in Supabase");
        }
      } catch (err) {
        console.warn("⚠️ โหลดจาก Supabase ไม่สำเร็จ ใช้ข้อมูลสำรองแทน:", err);
        const cached = JSON.parse(localStorage.getItem("branchesVersioned") || "null");
        setBranches(cached?.list || branchesData.list || []);
      }
    };

    fetchBranches();

    // ถ้าเป็น Staff → fix branch ตัวเองไว้
    if (!canSelectBranch && currentUser?.branch) {
      setSelectedBranches([currentUser.branch]);
    }
  }, [canSelectBranch, currentUser?.branch, setSelectedBranches]);

  const toggleBranch = (name) => {
    if (name === "เฉลี่ยทุกสาขา") {
      setSelectedBranches(["เฉลี่ยทุกสาขา"]);
    } else {
      let next;
      if (selectedBranches.includes(name)) {
        next = selectedBranches.filter((b) => b !== name);
      } else {
        next = selectedBranches
          .filter((b) => b !== "เฉลี่ยทุกสาขา")
          .concat(name);
      }
      setSelectedBranches(next);
    }
  };

  const filtered = branches.filter(
    (b) =>
      b.name.toLowerCase().includes(search.toLowerCase()) ||
      b.id.toLowerCase().includes(search.toLowerCase())
  );

  // 🔹 ถ้าไม่ใช่ admin (staff)
  if (!canSelectBranch) {
    return (
      <div className="w-full md:w-80">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          สาขาของคุณ
        </label>
        <input
          value={currentUser?.branch || ""}
          disabled
          className="border p-2 rounded-lg bg-gray-100 text-gray-600 w-full"
        />
      </div>
    );
  }

  // 🔹 ถ้าเป็น admin หรือ Team Seal (เลือกหลายสาขาได้)
  return (
    <div className="relative w-full md:w-80">
      <label className="block text-sm font-medium text-gray-700 mb-1">
        เลือกสาขา
      </label>

      <div
        className="border rounded-lg bg-white p-2 cursor-pointer flex justify-between items-center"
        onClick={() => setShowDropdown(!showDropdown)}
      >
        <div className="flex flex-wrap gap-1 text-sm">
          {selectedBranches.length === 0 ? (
            <span className="text-gray-400">ยังไม่ได้เลือกสาขา</span>
          ) : (
            selectedBranches.map((b) => (
              <span
                key={b}
                className="bg-green-100 text-green-700 px-2 py-0.5 rounded-lg"
              >
                {b}
              </span>
            ))
          )}
        </div>
        <span className="text-gray-500">▼</span>
      </div>

      {showDropdown && (
        <div className="absolute z-10 bg-white border rounded-lg mt-1 w-full shadow-xl">
          <div className="p-2 border-b">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ค้นหาชื่อหรือรหัสสาขา..."
              className="w-full p-2 border rounded-lg focus:ring focus:ring-green-200 text-sm"
            />
          </div>

          <ul className="max-h-60 overflow-y-auto">
            <li
              onClick={() => toggleBranch("เฉลี่ยทุกสาขา")}
              className={`px-3 py-2 cursor-pointer hover:bg-green-100 text-sm ${
                selectedBranches.includes("เฉลี่ยทุกสาขา")
                  ? "bg-green-50 font-semibold"
                  : ""
              }`}
            >
              🌎 เฉลี่ยทุกสาขา
            </li>

            {filtered.map((b) => (
              <li
                key={b.id}
                onClick={() => toggleBranch(b.id)}
                className={`px-3 py-2 cursor-pointer hover:bg-green-100 text-sm flex justify-between items-center ${
                  selectedBranches.includes(b.id)
                    ? "bg-green-50 font-semibold"
                    : ""
                }`}
              >
                <span>
                  <span className="font-semibold text-green-700">{b.id}</span> –{" "}
                  {b.name}
                </span>
                {selectedBranches.includes(b.id) && (
                  <span className="text-green-600">✔️</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}