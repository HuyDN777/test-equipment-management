import React, { useState, useEffect } from 'react';
import { Table, Input, Button, Avatar, Radio, Tag, message, Modal, Drawer, Descriptions, Form, Popconfirm, Select } from 'antd';
import { SearchOutlined, PlusOutlined, EditOutlined, DeleteOutlined, FilterOutlined, CloseOutlined, UserOutlined, EyeOutlined } from '@ant-design/icons';
import axiosClient from '../api/axiosClient';
import { useAuth } from '../contexts/AuthContext';

export const UserManagement: React.FC = () => {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<any[]>([]);
  const [totalUsers, setTotalUsers] = useState(0);
  const [adminCount, setAdminCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('all');
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [detailUser, setDetailUser] = useState<any | null>(null);
  const [form] = Form.useForm();

  useEffect(() => {
    fetchUsers();
  }, [filter]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      let roleParams = '';
      if (filter === 'admin') roleParams = '&role=Admin';
      if (filter === 'user') roleParams = '&role=Employee';
      
      const response = await axiosClient.get(`/users?limit=100${roleParams}`);
      const data = (response as any).data || [];
      setUsers(data);
      setTotalUsers((response as any).total || 0);
      
      if (filter === 'all') {
        setAdminCount(data.filter((u: any) => u.role === 'Admin').length);
      }
    } catch (error) {
      message.error('Không thể tải danh sách người dùng');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (record?: any) => {
    if (record) {
      setEditingId(record.id);
      form.setFieldsValue({
        ...record,
        password: '', // Don't prefill password
      });
    } else {
      setEditingId(null);
      form.resetFields();
    }
    setIsModalVisible(true);
  };

  const handleSubmit = async (values: any) => {
    try {
      if (editingId) {
        if (!values.password) delete values.password; // Don't update password if empty
        await axiosClient.put(`/users/${editingId}`, values);
        message.success('Cập nhật người dùng thành công');
      } else {
        await axiosClient.post('/users', values);
        message.success('Thêm người dùng mới thành công');
      }
      setIsModalVisible(false);
      fetchUsers();
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Có lỗi xảy ra');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await axiosClient.delete(`/users/${id}`);
      message.success('Đã xóa người dùng');
      fetchUsers();
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Không thể xóa người dùng này');
    }
  };

  const displayedUsers = filter === 'all'
    ? users
    : users.filter((user) => user.role === (filter === 'admin' ? 'Admin' : 'Employee'));

  const columns = [
    { 
      title: 'TÊN NHÂN VIÊN', 
      key: 'name', 
      render: (_: any, record: any) => (
        <div className="flex items-center gap-4">
          <Avatar 
            size={42} 
            src={record.avatar_url || undefined}
            icon={<UserOutlined />}
            className="!bg-emerald-100 !text-emerald-700 border border-emerald-200 shadow-sm"
          />
          <div>
            <div className="font-bold text-slate-800">{record.name}</div>
            <div className="text-xs text-slate-400 font-mono mt-0.5">{record.id?.substring(0, 8).toUpperCase()}</div>
          </div>
        </div>
      )
    },
    { 
      title: 'EMAIL', 
      dataIndex: 'email', 
      key: 'email',
      render: (text: string) => <span className="text-slate-600 font-medium">{text}</span>
    },
    { 
      title: 'PHÒNG BAN', 
      dataIndex: 'department', 
      key: 'department',
      render: (text: string) => <span className="text-slate-500">{text || 'Không rõ'}</span>
    },
    { 
      title: 'VAI TRÒ', 
      dataIndex: 'role', 
      key: 'role', 
      render: (role: string) => {
        if (role === 'Admin') {
          return <Tag color="gold" className="rounded-md px-3 py-1 font-bold border-amber-200 bg-amber-50 text-amber-700 shadow-sm">{role}</Tag>;
        }
        return <Tag className="rounded-md px-3 py-1 font-medium border-slate-200 bg-slate-50 text-slate-600 shadow-sm">User</Tag>;
      }
    },
    { 
      title: 'THAO TÁC', 
      key: 'action', 
      render: (_: any, record: any) => (
        <div className="flex gap-2">
          <Button type="text" icon={<EyeOutlined />} aria-label="Xem chi tiết" onClick={() => setDetailUser(record)} />
          <Button type="text" icon={<EditOutlined />} onClick={() => handleOpenModal(record)} className="text-blue-600 hover:text-blue-700 hover:bg-blue-50" />
          {record.id !== currentUser?.id && (
            <Popconfirm title="Bạn có chắc muốn xóa người dùng này?" onConfirm={() => handleDelete(record.id)}>
              <Button type="text" icon={<DeleteOutlined />} aria-label="Xóa người dùng" className="text-red-500 hover:text-red-600 hover:bg-red-50" />
            </Popconfirm>
          )}
        </div>
      )
    },
  ];

  return (
    <div className="font-sans max-w-6xl mx-auto space-y-8 pb-12 relative z-10">
      {/* Header */}
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-800 m-0 tracking-tight">Quản lý người dùng</h1>
        </div>
        
        <div className="flex gap-4">
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 flex flex-col items-center justify-center min-w-[100px]">
            <div className="text-2xl font-black text-slate-800">{filter === 'all' ? totalUsers : (filter === 'admin' ? adminCount : totalUsers - adminCount)}</div>
            <div className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold mt-1">TỔNG CỘNG</div>
          </div>
          <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl p-4 shadow-sm border border-amber-100 flex flex-col items-center justify-center min-w-[100px]">
            <div className="text-2xl font-black text-amber-600">{adminCount}</div>
            <div className="text-[10px] text-amber-600 uppercase tracking-widest font-semibold mt-1">ADMIN</div>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 flex gap-4 justify-between items-center flex-wrap">
        <Input 
          placeholder="Tìm theo tên, email, phòng ban..." 
          prefix={<SearchOutlined className="text-slate-400" />} 
          className="w-full md:w-96 rounded-xl border-slate-200 hover:border-blue-400 focus:border-blue-500 bg-slate-50 hover:bg-white focus:bg-white h-10"
        />
        
        <div className="flex gap-4 items-center">
          <div className="flex items-center gap-2">
            <FilterOutlined className="text-slate-400 mr-1" />
            <Radio.Group value={filter} onChange={(e) => setFilter(e.target.value)} buttonStyle="solid" className="custom-radio-group">
              <Radio.Button value="all">Tất cả</Radio.Button>
              <Radio.Button value="admin">Admin</Radio.Button>
              <Radio.Button value="user">User</Radio.Button>
            </Radio.Group>
          </div>
          <Button 
            type="primary" 
            icon={<PlusOutlined />} 
            onClick={() => handleOpenModal()}
            className="bg-blue-600 hover:bg-blue-700 rounded-xl h-10 px-6 font-semibold shadow-md shadow-blue-500/30 border-none"
          >
            Thêm người dùng
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <h2 className="text-lg font-bold text-slate-800 m-0">Danh sách nhân viên</h2>
        </div>
        
        <Table 
          columns={columns} 
          dataSource={displayedUsers} 
          rowKey="id" 
          loading={loading}
          pagination={{ 
            pageSize: 8, 
            className: "px-6 py-4 m-0 border-t border-slate-100",
            showTotal: (total, range) => `Hiển thị ${range[0]}-${range[1]} / ${total} người dùng`
          }}
          className="admin-modern-table"
        />
      </div>

      <Drawer title="Chi tiết người dùng" open={!!detailUser} onClose={() => setDetailUser(null)} width={520}>
        {detailUser && <Descriptions bordered column={1} size="small">
          <Descriptions.Item label="Họ tên">{detailUser.name}</Descriptions.Item>
          <Descriptions.Item label="Email">{detailUser.email}</Descriptions.Item>
          <Descriptions.Item label="Phòng ban">{detailUser.department || '—'}</Descriptions.Item>
          <Descriptions.Item label="Vai trò">{detailUser.role}</Descriptions.Item>
          <Descriptions.Item label="Mã người dùng">{detailUser.id}</Descriptions.Item>
        </Descriptions>}
      </Drawer>

      <Modal
        title={null}
        open={isModalVisible}
        onCancel={() => setIsModalVisible(false)}
        footer={null}
        width={500}
        closeIcon={<div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200 hover:text-slate-700 transition-colors"><CloseOutlined /></div>}
        className="font-sans modern-modal"
      >
        <div className="px-8 pt-8 pb-4">
          <h3 className="text-2xl font-bold text-slate-800 m-0">{editingId ? 'Cập nhật người dùng' : 'Thêm mới người dùng'}</h3>
        </div>

        <div className="px-8 pb-8">
          <Form layout="vertical" form={form} onFinish={handleSubmit} requiredMark={false}>
            <Form.Item 
              name="name" 
              label={<span className="font-semibold text-slate-700 text-sm">Họ và tên *</span>}
              rules={[{ required: true, message: 'Vui lòng nhập tên' }]}
            >
              <Input placeholder="Nguyễn Văn A" className="rounded-xl border-slate-300 h-11" />
            </Form.Item>
            <Form.Item 
              name="email" 
              label={<span className="font-semibold text-slate-700 text-sm">Email *</span>}
              rules={[{ required: true, message: 'Vui lòng nhập email', type: 'email' }]}
            >
              <Input placeholder="email@company.vn" className="rounded-xl border-slate-300 h-11" />
            </Form.Item>
            <Form.Item 
              name="password" 
              label={<span className="font-semibold text-slate-700 text-sm">Mật khẩu {editingId ? '(Để trống nếu không đổi)' : '*'}</span>}
              rules={[{ required: !editingId, message: 'Vui lòng nhập mật khẩu' }]}
            >
              <Input.Password placeholder="********" className="rounded-xl border-slate-300 h-11" />
            </Form.Item>
            
            <div className="grid grid-cols-2 gap-4">
              <Form.Item 
                name="department" 
                label={<span className="font-semibold text-slate-700 text-sm">Phòng ban</span>}
              >
                <Input placeholder="QA, Phát triển..." className="rounded-xl border-slate-300 h-11" />
              </Form.Item>
              <Form.Item 
                name="role" 
                label={<span className="font-semibold text-slate-700 text-sm">Vai trò *</span>}
                initialValue="Employee"
                rules={[{ required: true, message: 'Chọn vai trò' }]}
              >
                <Select className="h-11">
                  <Select.Option value="Employee">User</Select.Option>
                  <Select.Option value="Admin">Admin</Select.Option>
                </Select>
              </Form.Item>
            </div>
          </Form>
        </div>
        
        <div className="border-t border-slate-100 p-6 flex justify-end gap-3 bg-slate-50 rounded-b-2xl">
          <Button onClick={() => setIsModalVisible(false)} className="rounded-xl font-semibold text-slate-600 px-6 h-10 border-slate-300 hover:bg-slate-100">
            Hủy bỏ
          </Button>
          <Button type="primary" onClick={() => form.submit()} className="rounded-xl bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-500/30 border-none font-semibold px-8 h-10">
            {editingId ? 'Lưu thay đổi' : 'Thêm mới'}
          </Button>
        </div>
      </Modal>

      <style>{`
        .admin-modern-table .ant-table-thead > tr > th {
          background-color: transparent !important;
          color: #64748b;
          font-weight: 600;
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          border-bottom: 1px solid #f1f5f9;
          padding: 16px 24px;
        }
        .admin-modern-table .ant-table-tbody > tr > td {
          border-bottom: 1px solid #f8fafc;
          padding: 16px 24px;
          font-size: 14px;
        }
        .admin-modern-table .ant-table-tbody > tr:hover > td {
          background-color: #f8fafc !important;
        }
        
        .custom-radio-group .ant-radio-button-wrapper {
          border-radius: 0;
          height: 38px;
          line-height: 36px;
          padding: 0 16px;
          font-weight: 500;
          color: #64748b;
          background: #f8fafc;
          border-color: #e2e8f0;
        }
        .custom-radio-group .ant-radio-button-wrapper:first-child {
          border-top-left-radius: 10px;
          border-bottom-left-radius: 10px;
        }
        .custom-radio-group .ant-radio-button-wrapper:last-child {
          border-top-right-radius: 10px;
          border-bottom-right-radius: 10px;
        }
        .custom-radio-group .ant-radio-button-wrapper-checked {
          background: #3b82f6 !important;
          border-color: #3b82f6 !important;
          color: white !important;
          z-index: 1;
        }
        .custom-radio-group .ant-radio-button-wrapper:hover:not(.ant-radio-button-wrapper-checked) {
          color: #3b82f6;
        }
        .custom-radio-group .ant-radio-button-wrapper-checked::before {
          background-color: transparent !important;
        }

        .modern-modal .ant-modal-content {
          border-radius: 24px;
          padding: 0;
          overflow: hidden;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
        }
      `}</style>
    </div>
  );
};
