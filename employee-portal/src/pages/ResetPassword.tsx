import { Button, Form, Input, message } from 'antd';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import axiosClient from '../api/axiosClient';

export const ResetPassword = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = params.get('token');
  const submit = async ({ password }: { password: string }) => {
    if (!token) return;
    try {
      await axiosClient.post('/reset-password', { token, new_password: password });
      message.success('Đặt lại mật khẩu thành công');
      navigate('/login', { replace: true });
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Liên kết không hợp lệ hoặc đã hết hạn');
    }
  };

  return <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
    <div className="w-full max-w-md bg-white border border-gray-200 rounded-2xl p-8 shadow-sm">
      <h1 className="text-2xl font-bold mb-6">Đặt lại mật khẩu</h1>
      {!token ? <p className="text-red-500">Liên kết thiếu reset token.</p> : <Form layout="vertical" onFinish={submit}>
        <Form.Item name="password" label="Mật khẩu mới" rules={[{ required: true }, { min: 6 }]}><Input.Password size="large" /></Form.Item>
        <Form.Item name="confirm" label="Nhập lại mật khẩu" dependencies={['password']} rules={[{ required: true }, ({ getFieldValue }) => ({ validator: (_, value) => !value || value === getFieldValue('password') ? Promise.resolve() : Promise.reject(new Error('Mật khẩu không khớp')) })]}><Input.Password size="large" /></Form.Item>
        <Button type="primary" htmlType="submit" size="large" block>Đổi mật khẩu</Button>
      </Form>}
      <Link className="block text-center mt-5" to="/login">Quay lại đăng nhập</Link>
    </div>
  </div>;
};
