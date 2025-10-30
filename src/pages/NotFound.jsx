import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <div className="h-screen flex flex-col items-center justify-center bg-secondary text-gray-700">
      <h1 className="text-5xl font-bold mb-4 text-primary">404</h1>
      <p className="text-lg mb-6">ไม่พบหน้าที่คุณค้นหา</p>
      <Link
        to="/home"
        className="bg-primary text-white py-2 px-4 rounded-lg hover:bg-green-700 transition"
      >
        กลับหน้าแรก
      </Link>
    </div>
  );
}