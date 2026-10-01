import React, { useState } from 'react';
import { Form, Input, Button, message } from 'antd';
import { Link, useNavigate } from 'react-router-dom';
import axiosClient from '../api/axiosClient';
import { useAuth } from '../contexts/AuthContext';
import { AppstoreOutlined } from '@ant-design/icons';

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

      login(response.access_token, userProfile as any);
      message.success('Đăng nhập thành công');
      navigate('/');
    } catch (error: any) {
      console.error(error);
      message.error(error.response?.data?.message || 'Đăng nhập thất bại. Vui lòng kiểm tra lại thông tin.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center bg-gradient-to-br from-blue-50 via-white to-purple-50 relative overflow-hidden">
      {/* Decorative Blobs */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-emerald-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
      <div className="absolute top-0 right-0 w-96 h-96 bg-teal-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
      <div className="absolute -bottom-32 left-20 w-96 h-96 bg-pink-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000"></div>


      <div className="w-full max-w-md bg-white/80 backdrop-blur-xl p-10 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/50 z-10">
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-500 text-white flex items-center justify-center rounded-xl shadow-lg shadow-emerald-600/20 mb-4">
            <AppstoreOutlined className="text-2xl" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 mb-1">DEVPORTAL</h1>
        </div>

        <Form
          name="login_form"
          layout="vertical"
          onFinish={onFinish}
          requiredMark={false}
          size="large"
        >
          <Form.Item
            name="email"
            label={<span className="text-xs font-bold tracking-wider text-gray-700 uppercase">Email</span>}
            rules={[
              { required: true, message: 'Vui lòng nhập email!' },
              { type: 'email', message: 'Email không hợp lệ!' }
            ]}
          >
            <Input 
              placeholder="nguyen.van.a@company.com" 
              className="rounded-lg bg-gray-50/50 hover:bg-white focus:bg-white border-gray-200" 
            />
          </Form.Item>

          <Form.Item
            name="password"
            label={<span className="text-xs font-bold tracking-wider text-gray-700 uppercase">Mật khẩu</span>}
            rules={[{ required: true, message: 'Vui lòng nhập mật khẩu!' }]}
          >
            <Input.Password 
              placeholder="••••••••" 
              className="rounded-lg bg-gray-50/50 hover:bg-white focus:bg-white border-gray-200"
            />
          </Form.Item>

          <div className="flex justify-end mb-6">
            <Link to="/forgot-password" className="text-xs font-medium text-blue-600 hover:text-blue-800">Quên mật khẩu?</Link>
          </div>

          <Form.Item className="mb-6">
            <Button 
              type="primary" 
              htmlType="submit" 
              className="w-full h-12 rounded-lg bg-black hover:bg-gray-800 text-white font-medium border-none shadow-lg shadow-black/20"
              loading={loading}
            >
              Đăng nhập
            </Button>
          </Form.Item>
        </Form>
      </div>

    </div>
  );
};
