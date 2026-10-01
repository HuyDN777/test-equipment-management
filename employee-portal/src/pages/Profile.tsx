import React, { useState, useEffect, useRef } from 'react';
import { Avatar, Card, Form, Input, Button, message } from 'antd';
import { UserOutlined, MailOutlined, BankOutlined, LockOutlined, UploadOutlined } from '@ant-design/icons';
import axiosClient from '../api/axiosClient';
import { useAuth } from '../contexts/AuthContext';

export const Profile: React.FC = () => {
  const { user, refreshUser } = useAuth();
  const [form] = Form.useForm();
  const [passwordForm] = Form.useForm();
  const [updating, setUpdating] = useState(false);
  const [updatingPassword, setUpdatingPassword] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const previewUrlRef = useRef<string | null>(null);

  useEffect(() => () => {
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
  }, []);

  const clearAvatarSelection = () => {
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    previewUrlRef.current = null;
    setAvatarFile(null);
    setAvatarPreview(null);
  };

  useEffect(() => {
    if (user) {
      form.setFieldsValue({
        name: user.name,
        email: user.email,
        department: user.department,
      });
    }
  }, [user, form]);

  const handleSelectAvatar = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024) {
      message.error('Chọn ảnh JPG, PNG hoặc WebP, tối đa 5 MB');
      return;
    }

    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    const previewUrl = URL.createObjectURL(file);
    previewUrlRef.current = previewUrl;
    setAvatarFile(file);
    setAvatarPreview(previewUrl);
  };

  const handleUpdateProfile = async (values: any) => {
    setUpdating(true);
    try {
      await axiosClient.put('/users/me', {
        name: values.name,
        department: values.department,
      });
      if (avatarFile) {
        const formData = new FormData();
        formData.append('file', avatarFile);
        try {
          await axiosClient.post('/users/me/avatar', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
        } catch (error: any) {
          await refreshUser();
          message.error(error.response?.data?.message || 'Thông tin đã lưu nhưng chưa thể lưu ảnh. Hãy thử lại.');
          return;
        }
      }
      await refreshUser();
      clearAvatarSelection();
      message.success('Đã cập nhật hồ sơ');
    } catch (error: any) {
      console.error(error);
      message.error(error.response?.data?.message || 'Cập nhật thông tin thất bại.');
    } finally {
      setUpdating(false);
    }
  };

  const handleUpdatePassword = async (values: any) => {
    if (values.newPassword !== values.confirmPassword) {
      message.error('Mật khẩu xác nhận không khớp!');
      return;
    }

    setUpdatingPassword(true);
    try {
      await axiosClient.put('/users/me/password', {
        current_password: values.currentPassword,
        new_password: values.newPassword,
      });
      message.success('Đổi mật khẩu thành công! Vui lòng đăng nhập lại vào lần sau.');
      passwordForm.resetFields();
      localStorage.removeItem('access_token');
      window.location.replace('/login');
    } catch (error: any) {
      console.error(error);
      message.error(error.response?.data?.message || 'Đổi mật khẩu thất bại.');
    } finally {
      setUpdatingPassword(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="rounded-[24px] bg-gradient-to-r from-emerald-700 to-teal-600 p-7 text-white shadow-xl shadow-emerald-900/10">
        <h2 className="text-2xl font-bold text-white m-0">Hồ sơ cá nhân</h2>
      </div>

      <Card className="!rounded-[24px] shadow-[0_18px_50px_rgba(24,72,55,.07)] !border-emerald-100" title="Thông tin cơ bản">
        <Form
          form={form}
          layout="vertical"
          onFinish={handleUpdateProfile}
        >
          <div className="mb-6 flex flex-wrap items-center gap-5">
            <Avatar size={88} src={avatarPreview || user?.avatar_url || undefined} icon={<UserOutlined />} className="!bg-emerald-100 !text-emerald-700" />
            <div>
              <div className="mb-2 text-sm font-medium text-slate-700">Ảnh đại diện</div>
              <input ref={avatarInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleSelectAvatar} />
              <Button icon={<UploadOutlined />} disabled={updating} onClick={() => avatarInputRef.current?.click()}>Chọn ảnh</Button>
              {avatarFile && <Button type="text" disabled={updating} onClick={clearAvatarSelection}>Bỏ chọn</Button>}
              {avatarFile && <span className="ml-2 text-sm text-amber-700">Chưa lưu</span>}
            </div>
          </div>
          <Form.Item
            name="email"
            label="Email đăng nhập (Không thể thay đổi)"
          >
            <Input prefix={<MailOutlined />} disabled />
          </Form.Item>

          <Form.Item
            name="name"
            label="Họ và Tên hiển thị"
            rules={[{ required: true, message: 'Vui lòng nhập họ và tên' }]}
          >
            <Input prefix={<UserOutlined />} placeholder="Nhập họ và tên" />
          </Form.Item>

          <Form.Item
            name="department"
            label="Phòng ban"
          >
            <Input prefix={<BankOutlined />} placeholder="Ví dụ: R&D, QA, IT..." />
          </Form.Item>

          <Form.Item className="mb-0 text-right">
            <Button type="primary" htmlType="submit" loading={updating} className="!bg-emerald-700">
              Lưu thay đổi
            </Button>
          </Form.Item>
        </Form>
      </Card>

      <Card className="!rounded-[24px] shadow-[0_18px_50px_rgba(24,72,55,.07)] !border-emerald-100" title="Đổi mật khẩu">
        <Form
          form={passwordForm}
          layout="vertical"
          onFinish={handleUpdatePassword}
        >
          <Form.Item
            name="currentPassword"
            label="Mật khẩu hiện tại"
            rules={[{ required: true, message: 'Vui lòng nhập mật khẩu hiện tại' }]}
          >
            <Input.Password prefix={<LockOutlined />} autoComplete="current-password" />
          </Form.Item>
          <Form.Item
            name="newPassword"
            label="Mật khẩu mới"
            rules={[{ required: true, message: 'Vui lòng nhập mật khẩu mới' }, { min: 6, message: 'Mật khẩu ít nhất 6 ký tự' }]}
          >
            <Input.Password prefix={<LockOutlined />} autoComplete="new-password" placeholder="Nhập mật khẩu mới" />
          </Form.Item>

          <Form.Item
            name="confirmPassword"
            label="Xác nhận mật khẩu mới"
            dependencies={['newPassword']}
            rules={[
              { required: true, message: 'Vui lòng xác nhận mật khẩu' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('newPassword') === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error('Mật khẩu xác nhận không khớp!'));
                },
              }),
            ]}
          >
            <Input.Password prefix={<LockOutlined />} autoComplete="new-password" placeholder="Xác nhận mật khẩu mới" />
          </Form.Item>

          <Form.Item className="mb-0 text-right">
            <Button type="primary" htmlType="submit" loading={updatingPassword} className="!bg-emerald-700">
              Cập nhật mật khẩu
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
};
