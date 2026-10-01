import React, { useState } from 'react';
import { Form, Input, Button, message } from 'antd';
import { useNavigate } from 'react-router-dom';
import axiosClient from '../api/axiosClient';
import { useAuth } from '../contexts/AuthContext';
import { SlackOutlined } from '@ant-design/icons';

export const Login: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  const onFinish = async (values: any) => {
    setLoading(true);
    try {
      const response = await axiosClient.post<any, { access_token: string }>('/login', {
        email: values.email,
        password: values.password,
      });
      
      const userProfile = await axiosClient.get('/users/me', {
        headers: { Authorization: `Bearer ${response.access_token}` }
      });

      if ((userProfile as any).role !== 'Admin') {
        message.error('Truy cập bị từ chối! Tài khoản này không có quyền quản trị.');
        return;
      }

      login(response.access_token, userProfile as any);
      message.success('Đăng nhập thành công');
      navigate('/dashboard');
    } catch (error: any) {
      console.error(error);
      message.error(error.response?.data?.message || 'Đăng nhập thất bại. Vui lòng kiểm tra lại thông tin.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center bg-slate-900 relative overflow-hidden font-sans">
      {/* Decorative Blobs */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-emerald-500 rounded-full mix-blend-screen filter blur-[100px] opacity-20 animate-blob"></div>
      <div className="absolute top-0 right-0 w-96 h-96 bg-teal-500 rounded-full mix-blend-screen filter blur-[100px] opacity-20 animate-blob animation-delay-2000"></div>
      
      <div className="w-full max-w-md bg-white/10 backdrop-blur-xl p-10 rounded-3xl shadow-2xl border border-white/20 z-10">
        <div className="flex flex-col items-center mb-10">
          <div className="w-16 h-16 bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center rounded-2xl shadow-lg shadow-emerald-500/30 mb-6">
            <SlackOutlined className="text-3xl text-white" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-white mb-2">DEVPORTAL</h1>
          <p className="text-sm text-blue-200 font-medium tracking-widest uppercase">Admin CMS</p>
        </div>

        <Form
          name="admin_login_form"
          layout="vertical"
          onFinish={onFinish}
          requiredMark={false}
          size="large"
        >
          <Form.Item
            name="email"
            rules={[
              { required: true, message: 'Vui lòng nhập email!' },
              { type: 'email', message: 'Email không hợp lệ!' }
            ]}
          >
            <Input 
              placeholder="Email quản trị viên" 
              className="rounded-xl bg-white/10 text-white placeholder-slate-400 hover:bg-white/20 focus:bg-white/20 border-white/10 h-12 px-4" 
            />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[{ required: true, message: 'Vui lòng nhập mật khẩu!' }]}
          >
            <Input.Password 
              placeholder="Mật khẩu" 
              className="rounded-xl bg-white/10 text-white placeholder-slate-400 hover:bg-white/20 focus:bg-white/20 border-white/10 h-12 px-4"
            />
          </Form.Item>

          <Form.Item className="mt-8 mb-0">
            <Button 
              type="primary" 
              htmlType="submit" 
              className="w-full h-12 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold border-none shadow-lg shadow-blue-600/30"
              loading={loading}
            >
              Đăng nhập hệ thống
            </Button>
          </Form.Item>
        </Form>
      </div>
      
      <style>{`
        /* Overriding antd input styles for dark theme */
        .ant-input, .ant-input-password {
          background-color: rgba(255, 255, 255, 0.1) !important;
          color: white !important;
          border-color: rgba(255, 255, 255, 0.2) !important;
        }
        .ant-input:hover, .ant-input:focus, .ant-input-password:hover, .ant-input-password:focus {
          background-color: rgba(255, 255, 255, 0.15) !important;
          border-color: #3b82f6 !important;
        }
        .ant-input::placeholder, .ant-input-password input::placeholder {
          color: #94a3b8 !important;
        }
        .ant-input-password input {
          background-color: transparent !important;
          color: white !important;
        }
        .ant-input-password-icon {
          color: rgba(255, 255, 255, 0.5) !important;
        }
        .ant-input-password-icon:hover {
          color: rgba(255, 255, 255, 0.8) !important;
        }
      `}</style>
    </div>
  );
};
