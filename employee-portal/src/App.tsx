import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

import Login from './pages/Login';
import DeviceList from './pages/DeviceList';
import MyRequests from './pages/MyRequests';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Định nghĩa các đường dẫn (URL) tương ứng với giao diện */}
        <Route path="/login" element={<Login />} />

        {/* Trang chủ mặc định hiển thị danh sách thiết bị */}
        <Route path="/" element={<DeviceList />} />

        {/* Trang xem lịch sử mượn */}
        <Route path="/my-requests" element={<MyRequests />} />

        {/* Nếu người dùng gõ linh tinh một đường dẫn không tồn tại (404) =>quay về Trang chủ */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;