import { useState, useEffect, useRef } from "react";
import { supabase } from "../lib/supabaseClient";

export default function Branch() {
  const [branches, setBranches] = useState([]);
  const [users, setUsers] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const formRef = useRef(null);

  const emptyForm = {
    id: "",
    name: "",
    province: "",
    district: "",
    competitor: "",
    competitorId: "",
    staff: "",
  };
  const [form, setForm] = useState(emptyForm);
  const [searchTerm, setSearchTerm] = useState("");


  // โหลดข้อมูลจาก localStorage (มี version)
  useEffect(() => {
    const fetchData = async () => {
      // โหลดสาขาจากตาราง branches
      const { data: branches, error: branchErr } = await supabase
        .from("branches")
        .select("*")
        .order("id", { ascending: true });
      if (branchErr) console.error(branchErr);
      else setBranches(branches);

      // โหลดรายชื่อผู้ใช้จากตาราง users
      const { data: users, error: userErr } = await supabase
        .from("users")
        .select("*")
        .order("id", { ascending: true });
      if (userErr) console.error(userErr);
      else setUsers(users);
    };

    fetchData();
  }, []);


  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((s) => ({ ...s, [name]: value }));
  };

  const startEdit = (id) => {
    const b = branches.find((x) => x.id === id);
    setForm(b || emptyForm);
    setEditingId(id);
    // เลื่อนจอไปที่ฟอร์ม
    setTimeout(() => formRef.current?.scrollIntoView({ behavior: "smooth" }), 0);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setForm(emptyForm);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const { id, name } = form;
    if (!id || !name) return alert("กรุณากรอกรหัสร้านและชื่อสาขา");

    if (editingId) {
      // UPDATE
      const { error } = await supabase
        .from("branches")
        .update({
          name: form.name,
          province: form.province,
          district: form.district,
          competitor: form.competitor,
          competitor_id: form.competitorId,
          staff: form.staff,
        })
        .eq("id", editingId);
      if (error) alert("❌ แก้ไขไม่สำเร็จ");
      else {
        alert("✅ แก้ไขเรียบร้อย");
        cancelEdit();
      }
    } else {
      // INSERT
      const { error } = await supabase.from("branches").insert([
        {
          id: form.id,
          name: form.name,
          province: form.province,
          district: form.district,
          competitor: form.competitor,
          competitor_id: form.competitorId,
          staff: form.staff,
        },
      ]);
      if (error) alert("❌ เพิ่มไม่สำเร็จ");
      else {
        alert("✅ เพิ่มเรียบร้อย");
        setForm(emptyForm);
      }
    }

    // รีโหลดข้อมูล
    const { data } = await supabase.from("branches").select("*").order("id");
    setBranches(data);
  };

  const handleDelete = async (id) => {
    if (!confirm("ต้องการลบสาขานี้หรือไม่?")) return;
    const { error } = await supabase.from("branches").delete().eq("id", id);
    if (error) alert("❌ ลบไม่สำเร็จ");
    else {
      alert("✅ ลบเรียบร้อย");
      const { data } = await supabase.from("branches").select("*").order("id");
      setBranches(data);
    }
  };


  return (
    <div className="p-4 md:p-6 bg-secondary min-h-screen">
      <h2 className="text-2xl font-bold mb-6 text-primary">ร้านสาขาในโครงการ</h2>

      {/* ฟอร์มเพิ่ม/แก้ไข */}
      <div ref={formRef} className="bg-white p-4 rounded-2xl shadow mb-6 w-full max-w-5xl">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold">
            {editingId ? "แก้ไขข้อมูลสาขา" : "เพิ่มสาขาใหม่"}
          </h3>
          {editingId && (
            <button
              onClick={cancelEdit}
              className="btn text-sm px-3 py-1 rounded border border-gray-300 hover:bg-gray-100"
            >
              ยกเลิกการแก้ไข
            </button>
          )}
        </div>

        <form
          onSubmit={handleSubmit}
          className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm md:text-base"
        >
          <input
            name="id"
            value={form.id}
            onChange={handleChange}
            placeholder="รหัสร้าน 7-Eleven"
            className={`border p-2 rounded ${editingId ? "bg-gray-50" : ""}`}
          />
          <input
            name="name"
            value={form.name}
            onChange={handleChange}
            placeholder="ชื่อสาขา"
            className="border p-2 rounded"
          />
          <input
            name="province"
            value={form.province}
            onChange={handleChange}
            placeholder="จังหวัด"
            className="border p-2 rounded"
          />
          <input
            name="district"
            value={form.district}
            onChange={handleChange}
            placeholder="อำเภอ"
            className="border p-2 rounded"
          />
          <input
            name="competitor"
            value={form.competitor}
            onChange={handleChange}
            placeholder="ชื่อร้าน CJ คู่แข่ง"
            className="border p-2 rounded"
          />
          <input
            name="competitorId"
            value={form.competitorId}
            onChange={handleChange}
            placeholder="รหัสร้าน CJ"
            className="border p-2 rounded"
          />
          <select
            name="staff"
            value={form.staff}
            onChange={handleChange}
            className="border p-2 rounded"
          >
            <option value="">พนักงานรับผิดชอบ</option>
            {users.map((u) => (
              <option key={u.id} value={u.username}>
                {u.username} ({u.role})
              </option>
            ))}
          </select>

        {/* ปุ่มบันทึก / ยกเลิก */}
          <div className="col-span-1 md:col-span-3 flex items-center gap-3">
            <button
              type="submit"
              className="btn bg-primary text-white px-4 py-2 rounded hover:bg-green-700 transition"
            >
              {editingId ? "บันทึกการแก้ไข" : "เพิ่มสาขาใหม่"}
            </button>
            {!editingId && (
              <button
                type="button"
                onClick={() => setForm(emptyForm)}
                className="btn px-4 py-2 rounded border border-gray-300 hover:bg-gray-100"
              >
                ล้างฟอร์ม
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Legend */}
      <div className="flex gap-4 mb-3 text-sm text-gray-700 items-center">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-green-100 border border-green-300 rounded"></div>
          <span>ข้อมูลร้าน 7-Eleven</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-orange-100 border border-orange-300 rounded"></div>
          <span>ข้อมูลคู่แข่ง CJ</span>
        </div>
      </div>
      
      {/* ช่องค้นหา */}
      <div className="flex justify-end mb-4">
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="🔍 ค้นหาโดยรหัสหรือชื่อ 7-Eleven / CJ"
          className="w-full md:w-96 border p-2 rounded-lg shadow-sm focus:ring focus:ring-green-200"
        />
      </div>

      {/* ตารางสาขา */}
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white rounded-2xl shadow text-sm md:text-base">
          <thead>
            <tr className="bg-green-700 text-white">
              <th className="py-2 px-3 text-left">รหัสร้าน</th>
              <th className="py-2 px-3 text-left">ชื่อร้าน</th>
              <th className="py-2 px-3 text-left bg-green-50 text-green-900">จังหวัด</th>
              <th className="py-2 px-3 text-left bg-green-50 text-green-900">อำเภอ</th>
              <th className="py-2 px-3 text-left bg-orange-50 text-orange-900 border-l-4 border-orange-300">รหัส CJ</th>
              <th className="py-2 px-3 text-left bg-orange-50 text-orange-900">CJ คู่แข่ง</th>
              <th className="py-2 px-3 text-left">ผู้รับผิดชอบ</th>
              <th className="py-2 px-3 text-left">จัดการ</th>
            </tr>
          </thead>
          <tbody>
            {branches.length ? (
              branches
                .filter((b) => {
                  if (!searchTerm) return true;
                  const term = searchTerm.toLowerCase();
                  return (
                    b.id.toLowerCase().includes(term) ||
                    b.name.toLowerCase().includes(term) ||
                    (b.competitorId || "").toLowerCase().includes(term) ||
                    (b.competitor || "").toLowerCase().includes(term)
                  );
                }).map((b) => (
                <tr key={b.id} className="border-t hover:bg-gray-50">
                  <td className="py-2 px-3 font-medium">{b.id}</td>
                  <td className="py-2 px-3">{b.name}</td>
                  <td className="py-2 px-3 bg-green-50/40">{b.province}</td>
                  <td className="py-2 px-3 bg-green-50/40">{b.district}</td>
                  <td className="py-2 px-3 bg-orange-50/40 font-medium text-orange-700">{b.competitorId}</td>
                  <td className="py-2 px-3 bg-orange-50/40 text-orange-700">{b.competitor}</td>
                  <td className="py-2 px-3">{b.staff}</td>
                  <td className="py-2 px-3 space-x-2">
                    <button
                      onClick={() => startEdit(b.id)}
                      className="btn bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700"
                    >
                      แก้ไข
                    </button>
                    <button
                      onClick={() => handleDelete(b.id)}
                      className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600"
                    >
                      ลบ
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="8" className="text-center py-4 text-gray-500 italic">
                  ยังไม่มีข้อมูลสาขา
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}