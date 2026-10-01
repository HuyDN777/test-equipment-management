import React, { useEffect, useRef, useState } from 'react';
import { Avatar, Button, Dropdown, Layout, Menu } from 'antd';
import {
  AppstoreOutlined, DashboardOutlined, DesktopOutlined,
  FileTextOutlined, LogoutOutlined, MenuFoldOutlined, MenuUnfoldOutlined,
  SafetyCertificateOutlined, TeamOutlined, ToolOutlined, UserOutlined,
} from '@ant-design/icons';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { NotificationBell } from '../NotificationBell';

const { Sider, Content } = Layout;

export const AdminLayout: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [dataVersion, setDataVersion] = useState(0);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const contentRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    window.scrollTo(0, 0);
    contentRef.current?.scrollTo({ top: 0, left: 0 });
  }, [location.pathname]);

  useEffect(() => {
    const refreshCurrentPage = () => setDataVersion((version) => version + 1);
    window.addEventListener('app:data-refresh', refreshCurrentPage);
    return () => window.removeEventListener('app:data-refresh', refreshCurrentPage);
  }, []);

  const menuItems = [
    { key: '/dashboard', icon: <DashboardOutlined />, label: 'Tổng quan' },
    { key: '/devices', icon: <DesktopOutlined />, label: 'Thiết bị' },
    { key: '/categories', icon: <AppstoreOutlined />, label: 'Danh mục' },
    { key: '/borrow-requests', icon: <FileTextOutlined />, label: 'Yêu cầu mượn' },
    { key: '/maintenance', icon: <ToolOutlined />, label: 'Bảo trì & hiệu chuẩn' },
    { key: '/partners', icon: <TeamOutlined />, label: 'Đối tác' },
    { key: '/users', icon: <UserOutlined />, label: 'Người dùng' },
  ];
  const currentMenu = location.pathname === '/profile'
    ? 'Hồ sơ cá nhân'
    : menuItems.find((item) => location.pathname.startsWith(item.key))?.label || 'Quản trị';
  const userMenu = [
    { key: 'account', icon: <SafetyCertificateOutlined />, label: user?.email || 'Tài khoản quản trị', onClick: () => navigate('/profile') },
    { type: 'divider' as const },
    { key: 'logout', icon: <LogoutOutlined />, label: 'Đăng xuất', danger: true, onClick: logout },
  ];

  return (
    <Layout className="admin-shell bg-[#f4f8f6]">
      <Sider width={270} collapsedWidth={86} collapsed={collapsed} trigger={null} className="admin-sidebar !bg-[#073b2d] z-30 shadow-2xl shadow-emerald-950/20">
        <div onClick={() => navigate('/dashboard')} className={`h-20 flex items-center ${collapsed ? 'justify-center' : 'px-6'} gap-3 cursor-pointer border-b border-white/10`}>
          <div className="w-11 h-11 shrink-0 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-500 text-white flex items-center justify-center shadow-lg shadow-emerald-900/30">
            <SafetyCertificateOutlined className="text-xl" />
          </div>
          {!collapsed && <div><div className="text-white font-extrabold text-lg tracking-tight">DEVPORTAL</div><div className="text-emerald-200/70 text-[10px] font-bold tracking-[.2em]">ADMIN CONSOLE</div></div>}
        </div>

        <div className="px-3 py-6">
          {!collapsed && <div className="px-3 mb-3 text-[10px] font-bold tracking-[.18em] text-emerald-200/50">QUẢN LÝ HỆ THỐNG</div>}
          <Menu mode="inline" theme="dark" inlineCollapsed={collapsed} selectedKeys={[location.pathname]} items={menuItems} onClick={({ key }) => navigate(key)} className="green-admin-menu !bg-transparent !border-none" />
        </div>

        <div className="absolute bottom-0 left-0 right-0 border-t border-white/10 bg-emerald-950/20 p-3">
          <Dropdown menu={{ items: userMenu }} placement="topRight" trigger={['click']}>
            <div className={`flex items-center ${collapsed ? 'justify-center' : ''} gap-3 rounded-2xl p-3 cursor-pointer hover:bg-white/10 transition-colors`}>
              <Avatar size={40} src={user?.avatar_url || undefined} icon={<UserOutlined />} className="!bg-emerald-400 !text-emerald-950" />
              {!collapsed && <div className="min-w-0"><div className="text-sm font-bold text-white truncate">{user?.name || 'Quản trị viên'}</div><div className="text-xs text-emerald-100/55 truncate">{user?.email}</div></div>}
            </div>
          </Dropdown>
        </div>
      </Sider>

      <Layout className="admin-main !bg-[#f4f8f6] transition-all duration-300">
        <header className="admin-header h-20 z-20 bg-white/85 backdrop-blur-xl border-b border-emerald-950/5 px-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button type="text" shape="circle" icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />} onClick={() => setCollapsed(!collapsed)} className="!text-emerald-900" />
            <div><h1 className="m-0 text-[22px] font-extrabold tracking-tight text-slate-800">{currentMenu}</h1><p className="m-0 text-xs text-slate-400">DEVPORTAL <span className="mx-1">/</span> <span className="text-emerald-600 font-semibold">{currentMenu}</span></p></div>
          </div>
          <div className="flex items-center gap-3">
            <NotificationBell />
            <div className="hidden lg:block text-right"><div className="text-sm font-bold text-slate-700">{user?.name || 'Admin'}</div><div className="text-[11px] text-slate-400">Quản trị hệ thống</div></div>
          </div>
        </header>
        <Content ref={contentRef} className="admin-content admin-page-content p-8 relative">
          <div aria-hidden="true" className="absolute z-0 -top-32 -right-24 w-96 h-96 rounded-full bg-emerald-300/10 blur-3xl pointer-events-none" />
          <div aria-hidden="true" className="absolute z-0 -bottom-40 left-20 w-96 h-96 rounded-full bg-teal-300/10 blur-3xl pointer-events-none" />
          <div key={`${location.pathname}-${dataVersion}`} className="relative z-10">
            <Outlet />
          </div>
        </Content>
      </Layout>
      <style>{`
        .green-admin-menu .ant-menu-item { height: 48px !important; line-height: 48px !important; border-radius: 14px !important; margin: 5px 0 !important; color: rgba(209,250,229,.68) !important; font-weight: 600; }
        .green-admin-menu .ant-menu-item:hover { color: white !important; background: rgba(255,255,255,.08) !important; }
        .green-admin-menu .ant-menu-item-selected { color: #052e22 !important; background: linear-gradient(135deg,#6ee7b7,#2dd4bf) !important; box-shadow: 0 10px 24px rgba(16,185,129,.22); }
      `}</style>
    </Layout>
  );
};
