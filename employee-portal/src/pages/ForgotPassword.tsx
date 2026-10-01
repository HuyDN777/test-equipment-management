import { Button, Form, Input, message } from 'antd';
import { Link } from 'react-router-dom';
import axiosClient from '../api/axiosClient';
import { useState } from 'react';

export const ForgotPassword = () => {
  const [sending, setSending] = useState(false);

  const submit = async ({ email }: { email: string }) => {
    if (sending) return;
    setSending(true);
    try {
      const result = await axiosClient.post<any, { message: string }>('/forgot-password', { email });
      message.success(result.message);
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Không thể gửi email đặt lại mật khẩu');
    } finally {
      setSending(false);
    }
  };

  return <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
    <div className="w-full max-w-md bg-white border border-gray-200 rounded-2xl p-8 shadow-sm">
      <h1 className="text-2xl font-bold mb-2">Quên mật khẩu</h1>
      <p className="text-gray-500 mb-6">Nhập email tài khoản để nhận liên kết đặt lại mật khẩu.</p>
      <Form layout="vertical" onFinish={submit}>
        <Form.Item name="email" label="Email" rules={[{ required: true }, { type: 'email' }]}><Input size="large" /></Form.Item>
        <Button type="primary" htmlType="submit" size="large" loading={sending} disabled={sending} block>Gửi email</Button>
      </Form>
      <Link className="block text-center mt-5" to="/login">Quay lại đăng nhập</Link>
    </div>
  </div>;
};
