import React, { useEffect, useState } from 'react';
import { Avatar, Dropdown, Layout } from 'antd';
import { AppstoreOutlined, FileTextOutlined, HomeOutlined, LogoutOutlined, UserOutlined } from '@ant-design/icons';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { NotificationBell } from '../NotificationBell';

const { Content } = Layout;

export const EmployeeLayout: React.FC = () => {
  const [dataVersion, setDataVersion] = useState(0);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  useEffect(() => { window.scrollTo({ top: 0, left: 0, behavior: 'instant' }); }, [location.pathname]);
  useEffect(() => {
    const refreshCurrentPage = () => setDataVersion((version) => version + 1);
    window.addEventListener('app:data-refresh', refreshCurrentPage);
    return () => window.removeEventListener('app:data-refresh', refreshCurrentPage);
  }, []);
  const navClass = (path: string) => `h-11 px-4 flex items-center gap-2 rounded-xl cursor-pointer font-semibold text-sm transition-all ${location.pathname.startsWith(path) ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20' : 'text-slate-500 hover:text-emerald-700 hover:bg-emerald-50'}`;
  const menu = [
    { key: 'profile', icon: <UserOutlined />, label: 'Hồ sơ cá nhân', onClick: () => navigate('/profile') },
    { type: 'divider' as const },
    { key: 'logout', icon: <LogoutOutlined />, label: 'Đăng xuất', danger: true, onClick: logout },
  ];

  return <Layout className="min-h-screen !bg-[#f4f8f6]">
    <header className="h-[76px] sticky top-0 z-50 bg-white/90 backdrop-blur-xl border-b border-emerald-950/5 px-6 lg:px-10 flex items-center justify-between shadow-[0_1px_20px_rgba(16,80,58,.04)]">
      <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/devices')}>
        <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 text-white flex items-center justify-center shadow-lg shadow-emerald-600/20"><AppstoreOutlined className="text-lg" /></div>
        <div><div className="font-extrabold text-lg text-slate-800 tracking-tight leading-tight">DEVPORTAL</div><div className="text-[10px] text-emerald-700/70 font-bold tracking-[.16em]">EQUIPMENT HUB</div></div>
      </div>
      <nav className="hidden md:flex items-center gap-2 rounded-2xl bg-slate-50 p-1.5 border border-slate-100">
        <div className={navClass('/devices')} onClick={() => navigate('/devices')}><HomeOutlined /> Kho thiết bị</div>
        <div className={navClass('/my-requests')} onClick={() => navigate('/my-requests')}><FileTextOutlined /> Yêu cầu của tôi</div>
      </nav>
      <div className="flex items-center gap-3">
        <NotificationBell />
        <Dropdown menu={{ items: menu }} placement="bottomRight" trigger={['click']}>
          <div className="flex items-center gap-3 cursor-pointer rounded-2xl border border-emerald-100 bg-emerald-50/60 py-2 pl-2 pr-4 hover:bg-emerald-50 transition-colors">
            <Avatar src={user?.avatar_url || undefined} icon={<UserOutlined />} className="!bg-emerald-600" />
            <div className="hidden sm:block"><div className="text-sm font-bold text-slate-700 leading-tight">{user?.name || 'Nhân viên'}</div><div className="text-[11px] text-emerald-700 mt-0.5">{user?.department || 'Employee'}</div></div>
          </div>
        </Dropdown>
      </div>
    </header>
    <Content className="w-full max-w-[1380px] mx-auto px-5 lg:px-10 py-8">
      <div key={`${location.pathname}-${dataVersion}`}><Outlet /></div>
    </Content>
  </Layout>;
};
