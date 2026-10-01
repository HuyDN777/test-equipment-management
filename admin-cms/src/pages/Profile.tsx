import { useEffect, useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
import { Avatar, Button, Card, Form, Input, message } from 'antd';
import { BankOutlined, LockOutlined, MailOutlined, UploadOutlined, UserOutlined } from '@ant-design/icons';
import axios from 'axios';
import axiosClient from '../api/axiosClient';
import { useAuth } from '../contexts/AuthContext';

type ProfileValues = { name: string; department?: string; email: string };
type PasswordValues = { currentPassword: string; newPassword: string; confirmPassword: string };

const errorMessage = (error: unknown, fallback: string) =>
  axios.isAxiosError<{ message?: string }>(error) ? error.response?.data?.message || fallback : fallback;

export function Profile() {
  const { user, refreshUser } = useAuth();
  const [profileForm] = Form.useForm<ProfileValues>();
  const [passwordForm] = Form.useForm<PasswordValues>();
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
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
    profileForm.setFieldsValue({
      name: user?.name || '',
      email: user?.email || '',
      department: user?.department || '',
    });
  }, [profileForm, user]);

  const saveProfile = async (values: ProfileValues) => {
    setSavingProfile(true);
    try {
      await axiosClient.put('/users/me', {
        name: values.name.trim(),
        department: values.department?.trim() || '',
      });
      if (avatarFile) {
        const formData = new FormData();
        formData.append('file', avatarFile);
        try {
          await axiosClient.post('/users/me/avatar', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
        } catch (error) {
          await refreshUser();
          message.error(errorMessage(error, 'Thông tin đã lưu nhưng chưa thể lưu ảnh. Hãy thử lại.'));
          return;
        }
      }
      await refreshUser();
      clearAvatarSelection();
      message.success('Đã cập nhật hồ sơ');
    } catch (error) {
      message.error(errorMessage(error, 'Không thể cập nhật hồ sơ'));
    } finally {
      setSavingProfile(false);
    }
  };

  const selectAvatar = (event: ChangeEvent<HTMLInputElement>) => {
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

  const changePassword = async (values: PasswordValues) => {
    setSavingPassword(true);
    try {
      await axiosClient.put('/users/me/password', {
        current_password: values.currentPassword,
        new_password: values.newPassword,
      });
      passwordForm.resetFields();
      localStorage.removeItem('admin_access_token');
      window.location.replace('/login');
    } catch (error) {
      message.error(errorMessage(error, 'Không thể đổi mật khẩu'));
      setSavingPassword(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="rounded-3xl bg-gradient-to-r from-emerald-800 to-teal-600 p-8 text-white shadow-lg shadow-emerald-900/10">
        <h2 className="m-0 text-2xl font-bold text-white">Hồ sơ cá nhân</h2>
      </div>

      <Card title="Thông tin cơ bản" className="!rounded-3xl !border-emerald-100 shadow-sm">
        <Form form={profileForm} layout="vertical" onFinish={saveProfile}>
          <div className="mb-6 flex flex-wrap items-center gap-5">
            <Avatar size={88} src={avatarPreview || user?.avatar_url || undefined} icon={<UserOutlined />} className="!bg-emerald-100 !text-emerald-700" />
            <div>
              <div className="mb-2 text-sm font-medium text-slate-700">Ảnh đại diện</div>
              <input ref={avatarInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={selectAvatar} />
              <Button icon={<UploadOutlined />} disabled={savingProfile} onClick={() => avatarInputRef.current?.click()}>Chọn ảnh</Button>
              {avatarFile && <Button type="text" disabled={savingProfile} onClick={clearAvatarSelection}>Bỏ chọn</Button>}
              {avatarFile && <span className="ml-2 text-sm text-amber-700">Chưa lưu</span>}
            </div>
          </div>
          <Form.Item name="email" label="Email đăng nhập">
            <Input prefix={<MailOutlined />} disabled />
          </Form.Item>
          <Form.Item name="name" label="Họ và tên" rules={[{ required: true, whitespace: true, message: 'Vui lòng nhập họ và tên' }]}>
            <Input prefix={<UserOutlined />} maxLength={255} />
          </Form.Item>
          <Form.Item name="department" label="Phòng ban">
            <Input prefix={<BankOutlined />} maxLength={255} />
          </Form.Item>
          <Form.Item className="!mb-0 text-right">
            <Button type="primary" htmlType="submit" loading={savingProfile} className="!bg-emerald-700">Lưu thay đổi</Button>
          </Form.Item>
        </Form>
      </Card>

      <Card title="Đổi mật khẩu" className="!rounded-3xl !border-emerald-100 shadow-sm">
        <Form form={passwordForm} layout="vertical" onFinish={changePassword}>
          <Form.Item name="currentPassword" label="Mật khẩu hiện tại" rules={[{ required: true, message: 'Vui lòng nhập mật khẩu hiện tại' }]}>
            <Input.Password prefix={<LockOutlined />} autoComplete="current-password" />
          </Form.Item>
          <Form.Item name="newPassword" label="Mật khẩu mới" rules={[{ required: true, message: 'Vui lòng nhập mật khẩu mới' }, { min: 6, message: 'Mật khẩu phải có ít nhất 6 ký tự' }]}>
            <Input.Password prefix={<LockOutlined />} autoComplete="new-password" />
          </Form.Item>
          <Form.Item name="confirmPassword" label="Xác nhận mật khẩu mới" dependencies={['newPassword']} rules={[
            { required: true, message: 'Vui lòng xác nhận mật khẩu mới' },
            ({ getFieldValue }) => ({
              validator(_, value) {
                return !value || getFieldValue('newPassword') === value
                  ? Promise.resolve()
                  : Promise.reject(new Error('Mật khẩu xác nhận không khớp'));
              },
            }),
          ]}>
            <Input.Password prefix={<LockOutlined />} autoComplete="new-password" />
          </Form.Item>
          <Form.Item className="!mb-0 text-right">
            <Button type="primary" htmlType="submit" loading={savingPassword} className="!bg-emerald-700">Đổi mật khẩu</Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}
