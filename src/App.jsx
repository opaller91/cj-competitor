import { useState } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Link,
  useLocation,
} from "react-router-dom";

import Login from "./pages/Login";
import Home from "./pages/Home";
import Branch from "./pages/Branch";
import CustomerTracker from "./pages/CustomerTracker";
import User from "./pages/User";
import NotFound from "./pages/NotFound";
import ForceChangePassword from "./pages/ForceChangePassword";
import Logout from "./pages/Logout";
import BranchSummary from "./pages/BranchSummary";
import TCReport from "./pages/TCReport";

function Layout() {
  const location = useLocation();
  const hideNav = location.pathname === "/"; // ซ่อน Navbar เฉพาะหน้า Login
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* 🔹 Navbar */}
      {!hideNav && (
        <nav className=" from-green-700 via-green-600 to-green-500 text-white shadow-lg relative">
          <div className="max-w-7xl mx-auto px-4 py-3 flex justify-between items-center">
            {/* โลโก้ */}
            <div className="flex items-center gap-3">
              <img
                src="src/assets/Logo7-11.png"
                alt="7-Eleven"
                className="w-10 drop-shadow-md"
              />
              <span className="text-lg text-black md:text-xl font-semibold tracking-wide">
                ระบบเก็บข้อมูลคู่แข่ง by PLP BW
              </span>
            </div>

            {/* ปุ่ม Hamburger (แสดงเฉพาะจอเล็ก) */}
            <button
              className="md:hidden focus:outline-none text-white"
              onClick={() => setMenuOpen(!menuOpen)}
            >
              {menuOpen ? (
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              ) : (
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                </svg>
              )}
            </button>

            {/* เมนูหลัก (Desktop) */}
            <div className="hidden md:flex gap-4 text-sm font-medium">
              <NavLink to="/home" text="หน้าแรก" />
              <NavLink to="/tracker" text="เก็บข้อมูลRealTime" />
              <NavLink to="/tc" text="ยอดบิล (TC)" />
              <NavLink to="/branch-summary" text="สรุปสาขา" />
        
              <Link
                to="/logout"
                className="bg-white text-green-700 px-3 py-1.5 rounded-lg font-semibold hover:bg-green-100 transition shadow-sm"
              >
                ออกจากระบบ
              </Link>
            </div>
          </div>

          {/* เมนูในมือถือ (toggle ได้) */}
          {menuOpen && (
            <div className="md:hidden flex flex-col bg-green-600 text-white px-4 pb-3 space-y-2 shadow-inner">
              <NavLink to="/home" text="หน้าแรก" onClick={() => setMenuOpen(false)} />
              <NavLink to="/tracker" text="เก็บข้อมูลRealTime" onClick={() => setMenuOpen(false)} />
              <NavLink to="/tc" text="ยอดบิล (TC)" />
              <NavLink to="/branch" text="ร้านสาขา" onClick={() => setMenuOpen(false)} />
              <NavLink
                to="/branch-summary"
                text="สรุปสาขา"
                onClick={() => setMenuOpen(false)}
              />
              <NavLink to="/user" text="ผู้ใช้งาน" onClick={() => setMenuOpen(false)} />
              <Link
                to="/logout"
                onClick={() => setMenuOpen(false)}
                className="bg-white text-green-700 px-3 py-2 rounded-lg font-semibold hover:bg-green-100 transition shadow-sm text-center"
              >
                ออกจากระบบ
              </Link>
            </div>
          )}
        </nav>
      )}

      {/* 🔹 Routing */}
      <div className="flex-1">
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/home" element={<Home />} />
          <Route path="/branch" element={<Branch />} />
          <Route path="/branch-summary" element={<BranchSummary />} />
          <Route path="/tracker" element={<CustomerTracker />} />
          <Route path="/tc" element={<TCReport />} />
          <Route path="/user" element={<User />} />
          <Route path="/force-change-password" element={<ForceChangePassword />} />
          <Route path="/logout" element={<Logout />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </div>

      {/* 🔹 Footer */}
      <footer className="bg-green-700 text-white py-3 text-center text-xs sm:text-sm font-light shadow-inner mt-auto">
        © 2025 Competitor Tracker | Developed by{" "}
        <span className="font-semibold text-yellow-300">PLP BW</span>
      </footer>
    </div>
  );
}

// 🔸 NavLink Component (เน้น active state)
function NavLink({ to, text, onClick }) {
  const location = useLocation();
  const active = location.pathname === to;

  return (
    <Link
      to={to}
      onClick={onClick}
      className={`px-3 py-1.5 rounded-md transition text-center ${
        active
          ? "bg-white text-green-700 font-semibold shadow-sm"
          : "hover:bg-green-800 hover:text-white"
      }`}
    >
      {text}
    </Link>
  );
}

// 🔹 Main App Wrapper
export default function App() {
  return (
    <Router>
      <Layout />
    </Router>
  );
}