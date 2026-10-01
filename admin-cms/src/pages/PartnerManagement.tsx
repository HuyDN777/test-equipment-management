import React, { useState, useEffect } from 'react';
import { Table, Input, Button, Tag, Avatar, message, Popconfirm, Modal, Drawer, Descriptions, Form, Select } from 'antd';
import { SearchOutlined, PlusOutlined, EditOutlined, DeleteOutlined, ShopOutlined, CloseOutlined, EyeOutlined } from '@ant-design/icons';
import axiosClient from '../api/axiosClient';

export const PartnerManagement: React.FC = () => {
  const [vendors, setVendors] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [totalVendors, setTotalVendors] = useState(0);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [detailVendor, setDetailVendor] = useState<any | null>(null);
  const [form] = Form.useForm();

  useEffect(() => {
    fetchVendors();
  }, []);

  const fetchVendors = async () => {
    setLoading(true);
    try {
      const response = await axiosClient.get('/vendors?limit=100');
      const data = (response as any).data || [];
      setVendors(data);
      setTotalVendors((response as any).total || 0);
    } catch (error) {
      message.error('Không thể tải danh sách đối tác');
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
        await axiosClient.put(`/vendors/${editingId}`, values);
        message.success('Cập nhật đối tác thành công');
      } else {
        await axiosClient.post('/vendors', values);
        message.success('Thêm đối tác mới thành công');
      }
      setIsModalVisible(false);
      fetchVendors();
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Có lỗi xảy ra');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await axiosClient.delete(`/vendors/${id}`);
      message.success('Đã xóa đối tác');
      fetchVendors();
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Không thể xóa đối tác này');
    }
  };

  const columns = [
    { 
      title: 'TÊN ĐỐI TÁC', 
      key: 'name', 
      render: (_: any, record: any) => (
        <div className="flex items-center gap-4">
          <Avatar 
            shape="square"
            size={42} 
            src={`https://ui-avatars.com/api/?name=${record.name}&background=random&color=fff&rounded=true`}
            className="border border-slate-200 shadow-sm rounded-xl"
          />
          <div>
            <div className="font-bold text-slate-800">{record.name}</div>
            <div className="text-xs text-slate-400 font-mono mt-0.5">{record.id?.substring(0, 8).toUpperCase()}</div>
          </div>
        </div>
      )
    },
    { 
      title: 'NGƯỜI LIÊN HỆ', 
      dataIndex: 'contact_person', 
      key: 'contact_person',
      render: (text: string) => <span className="font-semibold text-slate-700">{text || 'Không rõ'}</span>
    },
    { 
      title: 'THÔNG TIN LIÊN LẠC', 
      key: 'contact',
      render: (_: any, record: any) => (
        <div className="flex flex-col gap-1">
          <span className="text-sm text-slate-600">{record.email}</span>
          <span className="text-xs text-slate-500">{record.phone}</span>
        </div>
      )
    },
    { 
      title: 'LOẠI ĐỐI TÁC', 
      dataIndex: 'type', 
      key: 'type', 
      render: (type: string) => {
        let color = "blue";
        if (type === 'Nhà sản xuất') color = "purple";
        if (type === 'Nhà phân phối') color = "cyan";
        if (type === 'Trung tâm sửa chữa') color = "orange";
        return <Tag color={color} className="rounded-md px-3 py-1 font-medium border-0 shadow-sm">{type}</Tag>;
      }
    },
    { 
      title: 'THAO TÁC', 
      key: 'action', 
      render: (_: any, record: any) => (
        <div className="flex gap-2">
          <Button type="text" icon={<EyeOutlined />} aria-label="Xem chi tiết" onClick={() => setDetailVendor(record)} />
          <Button type="text" icon={<EditOutlined />} onClick={() => handleOpenModal(record)} className="text-blue-600 hover:text-blue-700 hover:bg-blue-50" />
          <Popconfirm title="Bạn có chắc muốn xóa đối tác này?" onConfirm={() => handleDelete(record.id)}>
            <Button type="text" icon={<DeleteOutlined />} className="text-red-500 hover:text-red-600 hover:bg-red-50" />
          </Popconfirm>
        </div>
      )
    },
  ];

  return (
    <div className="font-sans max-w-7xl mx-auto space-y-8 pb-12 relative z-10">
      {/* Header */}
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-800 m-0 tracking-tight">Quản lý đối tác</h1>
        </div>
        
        <div className="flex gap-4">
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 flex flex-col items-center justify-center min-w-[120px]">
            <div className="text-2xl font-black text-indigo-600 flex items-center gap-2"><ShopOutlined /> {totalVendors}</div>
            <div className="text-[10px] text-indigo-400 uppercase tracking-widest font-bold mt-1">ĐỐI TÁC</div>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 flex gap-4 justify-between items-center flex-wrap">
        <Input 
          placeholder="Tìm theo tên đối tác, người liên hệ, email..." 
          prefix={<SearchOutlined className="text-slate-400" />} 
          className="w-full md:w-[450px] rounded-xl border-slate-200 hover:border-indigo-400 focus:border-indigo-500 bg-slate-50 hover:bg-white focus:bg-white h-10"
        />
        <Button 
          type="primary" 
          icon={<PlusOutlined />} 
          onClick={() => handleOpenModal()}
          className="bg-indigo-600 hover:bg-indigo-700 rounded-xl h-10 px-6 font-semibold shadow-md shadow-indigo-500/30 border-none"
        >
          Thêm đối tác
        </Button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <h2 className="text-lg font-bold text-slate-800 m-0">Danh sách đối tác</h2>
        </div>
        
        <Table 
          columns={columns} 
          dataSource={vendors} 
          rowKey="id" 
          loading={loading}
          pagination={{ 
            pageSize: 6, 
            className: "px-6 py-4 m-0 border-t border-slate-100",
            showTotal: (total, range) => `Hiển thị ${range[0]}-${range[1]} / ${total} đối tác`
          }}
          className="admin-modern-table"
        />
      </div>

      <Drawer title="Chi tiết đối tác" open={!!detailVendor} onClose={() => setDetailVendor(null)} width={520}>
        {detailVendor && <Descriptions bordered column={1} size="small">
          <Descriptions.Item label="Tên đối tác">{detailVendor.name}</Descriptions.Item>
          <Descriptions.Item label="Thông tin liên hệ">{detailVendor.contact_info || '—'}</Descriptions.Item>
          <Descriptions.Item label="Loại">{detailVendor.type || '—'}</Descriptions.Item>
          <Descriptions.Item label="Người liên hệ">{detailVendor.contact_person || '—'}</Descriptions.Item>
          <Descriptions.Item label="Email">{detailVendor.email || '—'}</Descriptions.Item>
          <Descriptions.Item label="Số điện thoại">{detailVendor.phone || '—'}</Descriptions.Item>
          <Descriptions.Item label="Địa chỉ">{detailVendor.address || '—'}</Descriptions.Item>
          <Descriptions.Item label="Mã đối tác">{detailVendor.id}</Descriptions.Item>
        </Descriptions>}
      </Drawer>

      <Modal
        title={null}
        open={isModalVisible}
        onCancel={() => setIsModalVisible(false)}
        footer={null}
        width={600}
        closeIcon={<div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200 hover:text-slate-700 transition-colors"><CloseOutlined /></div>}
        className="font-sans modern-modal"
      >
        <div className="px-8 pt-8 pb-4">
          <h3 className="text-2xl font-bold text-slate-800 m-0">{editingId ? 'Cập nhật đối tác' : 'Thêm mới đối tác'}</h3>
        </div>

        <div className="px-8 pb-8">
          <Form layout="vertical" form={form} onFinish={handleSubmit} requiredMark={false}>
            <div className="grid grid-cols-2 gap-4">
              <Form.Item 
                name="name" 
                label={<span className="font-semibold text-slate-700 text-xs">TÊN CÔNG TY / ĐỐI TÁC *</span>}
                rules={[{ required: true, message: 'Nhập tên đối tác' }]}
                className="col-span-2"
              >
                <Input placeholder="VD: Công ty TNHH ABC" className="rounded-xl border-slate-300 h-11" />
              </Form.Item>
              
              <Form.Item 
                name="type" 
                label={<span className="font-semibold text-slate-700 text-xs">LOẠI ĐỐI TÁC *</span>}
                rules={[{ required: true, message: 'Chọn loại đối tác' }]}
                className="col-span-2"
              >
                <Select className="h-11 custom-select" placeholder="Chọn loại đối tác">
                  <Select.Option value="Nhà sản xuất">Nhà sản xuất</Select.Option>
                  <Select.Option value="Nhà phân phối">Nhà phân phối</Select.Option>
                  <Select.Option value="Trung tâm sửa chữa">Trung tâm sửa chữa</Select.Option>
                  <Select.Option value="Nhà cung cấp">Nhà cung cấp</Select.Option>
                </Select>
              </Form.Item>

              <Form.Item 
                name="contact_person" 
                label={<span className="font-semibold text-slate-700 text-xs">NGƯỜI LIÊN HỆ</span>}
              >
                <Input placeholder="Tên người đại diện..." className="rounded-xl border-slate-300 h-11" />
              </Form.Item>

              <Form.Item 
                name="phone" 
                label={<span className="font-semibold text-slate-700 text-xs">SỐ ĐIỆN THOẠI</span>}
              >
                <Input placeholder="0912..." className="rounded-xl border-slate-300 h-11" />
              </Form.Item>

              <Form.Item 
                name="email" 
                label={<span className="font-semibold text-slate-700 text-xs">EMAIL LIÊN HỆ</span>}
                className="col-span-2"
              >
                <Input placeholder="email@company.com" className="rounded-xl border-slate-300 h-11" />
              </Form.Item>

              <Form.Item 
                name="address" 
                label={<span className="font-semibold text-slate-700 text-xs">ĐỊA CHỈ</span>}
                className="col-span-2"
              >
                <Input.TextArea rows={2} placeholder="Nhập địa chỉ..." className="rounded-xl border-slate-300 p-3" />
              </Form.Item>
            </div>
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
        .custom-select .ant-select-selector {
          border-radius: 12px !important;
          align-items: center !important;
        }
      `}</style>
    </div>
  );
};
