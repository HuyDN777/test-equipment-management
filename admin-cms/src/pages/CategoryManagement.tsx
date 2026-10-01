import React, { useState, useEffect } from 'react';
import { Table, Input, Button, Tag, message, Modal, Drawer, Descriptions, Form, Popconfirm } from 'antd';
import { SearchOutlined, PlusOutlined, EditOutlined, DeleteOutlined, AppstoreOutlined, DesktopOutlined, CloseOutlined, EyeOutlined } from '@ant-design/icons';
import axiosClient from '../api/axiosClient';

export const CategoryManagement: React.FC = () => {
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [detailCategory, setDetailCategory] = useState<any | null>(null);
  const [form] = Form.useForm();

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    setLoading(true);
    try {
      const data = await axiosClient.get('/categories');
      setCategories(data as any);
    } catch (error) {
      message.error('Không thể tải danh sách danh mục');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (record?: any) => {
    if (record) {
      setEditingId(record.id);
      form.setFieldsValue(record);
    } else {
      setEditingId(null);
      form.resetFields();
    }
    setIsModalVisible(true);
  };

  const handleSubmit = async (values: any) => {
    try {
      if (editingId) {
        await axiosClient.put(`/categories/${editingId}`, values);
        message.success('Cập nhật danh mục thành công');
      } else {
        await axiosClient.post('/categories', values);
        message.success('Thêm danh mục mới thành công');
      }
      setIsModalVisible(false);
      fetchCategories();
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Có lỗi xảy ra');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await axiosClient.delete(`/categories/${id}`);
      message.success('Đã xóa danh mục');
      fetchCategories();
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Không thể xóa danh mục này');
    }
  };

  const columns = [
    { title: 'MÃ DM', dataIndex: 'id', key: 'id', render: (text: string) => <span className="font-mono text-slate-500 font-semibold bg-slate-100 px-2 py-1 rounded-md text-xs">{text?.substring(0, 8).toUpperCase()}</span> },
    { title: 'TÊN DANH MỤC', dataIndex: 'name', key: 'name', render: (text: string) => <span className="font-bold text-slate-800 text-base">{text}</span> },
    { title: 'MÔ TẢ', dataIndex: 'description', key: 'description', render: (text: string) => <span className="text-slate-500">{text || 'Không có mô tả'}</span> },
    { title: 'SỐ THIẾT BỊ', key: 'count', render: (_: any, record: any) => (
      <Tag className="rounded-lg px-3 py-1 font-bold border-indigo-100 bg-indigo-50 text-indigo-600 shadow-sm text-sm">{record.devices?.length || 0}</Tag>
    )},
    { title: 'THAO TÁC', key: 'action', render: (_: any, record: any) => (
      <div className="flex gap-2">
        <Button type="text" icon={<EyeOutlined />} aria-label="Xem chi tiết" onClick={() => setDetailCategory(record)} />
        <Button type="text" icon={<EditOutlined />} onClick={() => handleOpenModal(record)} className="text-blue-600 hover:text-blue-700 hover:bg-blue-50" />
        <Popconfirm title="Bạn có chắc muốn xóa danh mục này?" onConfirm={() => handleDelete(record.id)}>
          <Button type="text" icon={<DeleteOutlined />} className="text-red-500 hover:text-red-600 hover:bg-red-50" />
        </Popconfirm>
      </div>
    )},
  ];

  const totalDevices = categories.reduce((acc, cat) => acc + (cat.devices?.length || 0), 0);

  return (
    <div className="font-sans max-w-6xl mx-auto space-y-8 pb-12 relative z-10">
      {/* Header */}
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-800 m-0 tracking-tight">Quản lý danh mục thiết bị</h1>
        </div>
        
        <div className="flex gap-4">
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 flex flex-col items-center justify-center min-w-[120px]">
            <div className="text-2xl font-black text-indigo-600 flex items-center gap-2"><AppstoreOutlined /> {categories.length}</div>
            <div className="text-[10px] text-indigo-400 uppercase tracking-widest font-bold mt-1">DANH MỤC</div>
          </div>
          <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-2xl p-4 shadow-sm border border-blue-100 flex flex-col items-center justify-center min-w-[120px]">
            <div className="text-2xl font-black text-blue-600 flex items-center gap-2"><DesktopOutlined /> {totalDevices}</div>
            <div className="text-[10px] text-blue-400 uppercase tracking-widest font-bold mt-1">TỔNG THIẾT BỊ</div>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 flex gap-4 justify-between items-center">
        <Input 
          placeholder="Tìm kiếm theo tên danh mục, mô tả..." 
          prefix={<SearchOutlined className="text-slate-400" />} 
          className="w-full md:w-[450px] rounded-xl border-slate-200 hover:border-indigo-400 focus:border-indigo-500 bg-slate-50 hover:bg-white focus:bg-white h-10"
        />
        <Button 
          type="primary" 
          icon={<PlusOutlined />} 
          onClick={() => handleOpenModal()}
          className="bg-indigo-600 hover:bg-indigo-700 rounded-xl h-10 px-6 font-semibold shadow-md shadow-indigo-500/30 border-none"
        >
          Thêm danh mục
        </Button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <h2 className="text-lg font-bold text-slate-800 m-0">Danh sách danh mục thiết bị</h2>
        </div>
        
        <Table 
          columns={columns} 
          dataSource={categories} 
          rowKey="id" 
          loading={loading}
          pagination={{ 
            pageSize: 7, 
            className: "px-6 py-4 m-0 border-t border-slate-100",
            showTotal: (total, range) => `Hiển thị ${range[0]}-${range[1]} / ${total} danh mục`
          }}
          className="admin-modern-table"
        />
      </div>

      <Drawer title="Chi tiết danh mục" open={!!detailCategory} onClose={() => setDetailCategory(null)} width={500}>
        {detailCategory && <Descriptions bordered column={1} size="small">
          <Descriptions.Item label="Tên danh mục">{detailCategory.name}</Descriptions.Item>
          <Descriptions.Item label="Mô tả">{detailCategory.description || '—'}</Descriptions.Item>
          <Descriptions.Item label="Số thiết bị">{detailCategory.devices?.length || 0}</Descriptions.Item>
          <Descriptions.Item label="Mã danh mục">{detailCategory.id}</Descriptions.Item>
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
          <h3 className="text-2xl font-bold text-slate-800 m-0">{editingId ? 'Cập nhật danh mục' : 'Thêm mới danh mục'}</h3>
        </div>

        <div className="px-8 pb-8">
          <Form layout="vertical" form={form} onFinish={handleSubmit} requiredMark={false}>
            <Form.Item 
              name="name" 
              label={<span className="font-semibold text-slate-700 text-sm">Tên danh mục *</span>}
              rules={[{ required: true, message: 'Vui lòng nhập tên danh mục' }]}
            >
              <Input placeholder="Nhập tên danh mục..." className="rounded-xl border-slate-300 h-11" />
            </Form.Item>
            <Form.Item 
              name="description" 
              label={<span className="font-semibold text-slate-700 text-sm">Mô tả chi tiết</span>}
            >
              <Input.TextArea rows={4} placeholder="Nhập mô tả thêm..." className="rounded-xl border-slate-300 p-3" />
            </Form.Item>
          </Form>
        </div>
        
        <div className="border-t border-slate-100 p-6 flex justify-end gap-3 bg-slate-50 rounded-b-2xl">
          <Button onClick={() => setIsModalVisible(false)} className="rounded-xl font-semibold text-slate-600 px-6 h-10 border-slate-300 hover:bg-slate-100">
            Hủy bỏ
          </Button>
          <Button type="primary" onClick={() => form.submit()} className="rounded-xl bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-500/30 border-none font-semibold px-8 h-10">
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
