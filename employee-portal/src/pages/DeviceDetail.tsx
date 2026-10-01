import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Row, Col, Form, Input, InputNumber, Button, DatePicker, Checkbox, message, Spin, Table, Tag } from 'antd';
import { DesktopOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import axiosClient from '../api/axiosClient';
import type { DeviceModel, BorrowRequest } from '../types';
import { useAuth } from '../contexts/AuthContext';

export const DeviceDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [device, setDevice] = useState<DeviceModel | null>(null);
  const [history, setHistory] = useState<BorrowRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [form] = Form.useForm();
  const selectedAccessoryNames = (Form.useWatch('selected_accessories', form) ?? []) as string[];

  const fetchDeviceData = async () => {
    setLoading(true);
    try {
      const [deviceRes, requestsRes] = await Promise.all([
        axiosClient.get<any, DeviceModel>(`/devices/models/${id}`),
        // Fetch only MY requests as per user instruction
        axiosClient.get<any, { data: BorrowRequest[] }>('/borrow-requests/me')
      ]);
      
      setDevice(deviceRes);
      // Filter history for this specific device
      const deviceHistory = requestsRes.data.filter(req => req.device_model_id === id || req.deviceModel?.id === id);
      setHistory(deviceHistory);
    } catch (error) {
      console.error('Failed to load device details', error);
      message.error('Không thể tải thông tin thiết bị.');
      navigate('/devices');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      fetchDeviceData();
    }
  }, [id]);

  useEffect(() => {
    if (!id) return;
    const refreshStock = async () => {
      try {
        const latest = await axiosClient.get<any, DeviceModel>(`/devices/models/${id}`);
        setDevice(latest);
      } catch {
        // Keep the last known count until the next successful refresh.
      }
    };
    const timer = window.setInterval(refreshStock, 15_000);
    window.addEventListener('focus', refreshStock);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('focus', refreshStock);
    };
  }, [id]);

  useEffect(() => {
    if (!device?.accessory_options) return;
    const availableByName = new Map(device.accessory_options.map(item => [item.name, item.max_quantity]));
    const selected = (form.getFieldValue('selected_accessories') ?? []) as string[];
    const quantities = { ...(form.getFieldValue('accessory_quantities') ?? {}) } as Record<string, number>;
    const nextSelected = selected.filter(name => availableByName.has(name));
    let changed = nextSelected.length !== selected.length;

    for (const name of nextSelected) {
      const maximum = availableByName.get(name)!;
      if (Number(quantities[name]) > maximum) {
        quantities[name] = maximum;
        changed = true;
      }
    }
    if (changed) {
      form.setFieldsValue({
        selected_accessories: nextSelected,
        accessory_quantities: quantities,
      });
    }
  }, [device?.accessory_options, form]);

  const handleBorrowSubmit = async (values: any) => {
    if (!device) return;
    const requestedAccessories = ((values.selected_accessories ?? []) as string[]).map(name => ({
      accessory_id: device.accessory_options?.find(option => option.name === name)?.id,
      name,
      quantity: Number(values.accessory_quantities?.[name] ?? 1),
    }));
    if (requestedAccessories.some(item => {
      const maximum = device.accessory_options?.find(option => option.name === item.name)?.max_quantity;
      return !maximum || !Number.isSafeInteger(item.quantity) || item.quantity < 1 || item.quantity > maximum;
    })) {
      message.error('Số lượng phụ kiện yêu cầu không hợp lệ hoặc đã thay đổi. Vui lòng kiểm tra lại.');
      return;
    }
    
    setSubmitting(true);
    try {
      await axiosClient.post('/borrow-requests', {
        device_model_id: device.id,
        borrow_date: dayjs().format('YYYY-MM-DD'),
        due_date: values.due_date.format('YYYY-MM-DD'),
        reason: values.reason,
        requested_accessories: requestedAccessories,
      });
      message.success('Đã gửi yêu cầu mượn thiết bị thành công!');
      form.resetFields();
      fetchDeviceData(); // Refresh history and device status
    } catch (error: any) {
      console.error(error);
      message.error(error.response?.data?.message || 'Không thể tạo yêu cầu mượn.');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusTag = (status: string) => {
    switch (status) {
      case 'Available':
        return <span className="inline-block px-3 py-1 border border-gray-900 text-gray-900 text-xs font-bold uppercase tracking-wider bg-white">Sẵn sàng</span>;
      case 'Borrowed':
        return <span className="inline-block px-3 py-1 border border-gray-300 text-gray-500 text-xs font-bold uppercase tracking-wider bg-gray-100">Tạm hết thiết bị</span>;
      case 'Maintenance':
        return <span className="inline-block px-3 py-1 border border-red-500 text-red-500 text-xs font-bold uppercase tracking-wider bg-red-50">Đang xử lý kỹ thuật</span>;
      default:
        return <span className="inline-block px-3 py-1 border border-gray-300 text-gray-500 text-xs font-bold uppercase tracking-wider bg-white">{status}</span>;
    }
  };

  const getHistoryStatusTag = (status: string) => {
    switch (status) {
      case 'Pending': return <Tag>Chờ duyệt</Tag>;
      case 'Approved': return <Tag color="success">Đang mượn</Tag>;
      case 'ReturnPending': return <Tag color="warning">Đã báo lỗi · Chờ bàn giao</Tag>;
      case 'Rejected': return <Tag color="error">Từ chối</Tag>;
      case 'Returned': return <Tag color="default">Đã trả</Tag>;
      case 'Cancelled': return <Tag color="warning">Đã hủy</Tag>;
      default: return <Tag>{status}</Tag>;
    }
  };

  const historyColumns = [
    {
      title: 'NGƯỜI MƯỢN',
      key: 'user',
      render: () => <span className="font-medium text-gray-800">{user?.name}</span>,
    },
    {
      title: 'NGÀY MƯỢN',
      dataIndex: 'borrow_date',
      key: 'borrow_date',
      render: (date: string) => dayjs(date).format('DD/MM/YYYY'),
    },
    {
      title: 'NGÀY TRẢ',
      key: 'return_date',
      render: (_: any, record: BorrowRequest) => {
        if (record.return_date) return dayjs(record.return_date).format('DD/MM/YYYY');
        return dayjs(record.due_date).format('DD/MM/YYYY') + ' (Dự kiến)';
      },
    },
    {
      title: 'TRẠNG THÁI',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => getHistoryStatusTag(status),
    },
  ];

  // Parse specs if it's a string, or use as object
  let specsObj: any = {};
  if (device?.specifications) {
    try {
      specsObj = typeof device.specifications === 'string' 
        ? JSON.parse(device.specifications) 
        : device.specifications;
    } catch (e) {
      console.warn('Failed to parse specifications');
    }
  }

  const specItems = Object.entries(specsObj || {})
    .filter(([, value]) => value !== null && value !== undefined && String(value).trim() !== '' && String(value).toLowerCase() !== 'n/a')
    .map(([key, value]) => ({ key, value }));

  if (loading || !device) {
    return <div className="flex justify-center p-20"><Spin size="large" /></div>;
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Breadcrumb */}
      <div className="text-gray-400 text-xs font-mono uppercase tracking-widest flex items-center gap-2">
        <span className="hover:text-black cursor-pointer transition-colors" onClick={() => navigate('/devices')}>
          Trang chủ
        </span> 
        <span>/</span> 
        <span className="text-black font-bold">Chi tiết thiết bị</span>
      </div>

      <Row gutter={[32, 32]}>
        {/* LEFT COLUMN */}
        <Col xs={24} lg={8}>
          <div className="space-y-6">
            {/* Image Placeholder */}
            <div className="aspect-video employee-surface rounded-[24px] bg-gradient-to-br from-emerald-50 to-slate-50 relative overflow-hidden flex items-center justify-center p-4">
              {device.image_url ? <img src={device.image_url} alt={device.name} className="absolute inset-0 h-full w-full object-contain bg-white" /> : <>
              <div className="absolute inset-0 opacity-10">
                <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
                  <line x1="0" y1="0" x2="100%" y2="100%" stroke="currentColor" strokeWidth="1"/>
                  <line x1="100%" y1="0" x2="0" y2="100%" stroke="currentColor" strokeWidth="1"/>
                </svg>
              </div>
              <DesktopOutlined className="text-6xl text-gray-300 relative z-10" />
              </>}
            </div>

            {/* Basic Info */}
            <div className="employee-surface rounded-[24px] p-6">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4 pb-2 border-b border-dashed border-gray-200">
                Thông tin cơ bản
              </h3>
              
              <h1 className="text-2xl font-bold text-gray-900 mb-1">{device.name}</h1>
              {device.brand && <p className="text-sm text-gray-500 mb-4">Nhà sản xuất: {device.brand}</p>}
              
              <div className="mb-8">
                {getStatusTag(device.available_count > 0 ? 'Available' : 'Borrowed')}
              </div>

              <div className="mb-4 rounded-2xl bg-emerald-50 px-5 py-4 text-emerald-800">
                <div className="text-2xl font-extrabold">{device.available_count > 0 ? `Còn ${device.available_count} máy` : 'Đã hết máy'}</div>
              </div>
              <div className="space-y-4 text-sm text-gray-600">
                <div className="flex justify-between border-b border-dashed border-gray-100 pb-2">
                  <span>Tổng số máy</span>
                  <span className="font-bold text-black">{device.total_count}</span>
                </div>
                {device.model && <div className="flex justify-between pb-2">
                  <span>Model</span>
                  <span className="font-bold text-black">{device.model}</span>
                </div>}
                <div className="border-t border-dashed border-gray-100 pt-3">
                  <div className="font-semibold text-gray-800 mb-2">Vị trí máy còn sẵn</div>
                  {device.available_locations?.length
                    ? device.available_locations.map((item) => <div key={item.location} className="flex justify-between gap-4 py-1">
                        <span>{item.location}</span><span className="font-semibold text-black">{item.count} máy</span>
                      </div>)
                    : <span>{device.available_count > 0 ? 'Chưa cập nhật vị trí' : 'Hiện không còn máy sẵn'}</span>}
                </div>
              </div>
            </div>
          </div>
        </Col>

        {/* RIGHT COLUMN */}
        <Col xs={24} lg={16}>
          <div className="space-y-6">
            
            {/* Technical Specs */}
            {specItems.length > 0 && <div className="employee-surface rounded-[24px] p-6">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-6 pb-2 border-b border-dashed border-gray-200">
                Thông số kỹ thuật
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {specItems.map((spec, index) => (
                  <div key={index} className="bg-emerald-50/50 border border-emerald-100 p-4 rounded-2xl">
                    <div className="text-[10px] text-gray-400 uppercase tracking-widest mb-1">{spec.key}</div>
                    <div className="font-bold text-sm text-gray-800">{String(spec.value)}</div>
                  </div>
                ))}
              </div>
            </div>}

            {/* Borrow Form */}
            <div className="employee-surface rounded-[24px] p-6">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 pb-2 border-b border-dashed border-gray-200">
                Tạo yêu cầu mượn
              </h3>

              <Form
                form={form}
                layout="vertical"
                onFinish={handleBorrowSubmit}
                requiredMark={false}
              >
                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item
                      label={<span className="text-xs font-bold tracking-wider text-gray-700 uppercase">Ngày mượn</span>}
                    >
                      <Input value={dayjs().format('DD/MM/YYYY')} disabled className="bg-gray-50 border-gray-200 text-center font-mono" />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item
                      name="due_date"
                      label={<span className="text-xs font-bold tracking-wider text-gray-700 uppercase">Ngày trả dự kiến *</span>}
                      rules={[{ required: true, message: 'Vui lòng chọn ngày trả' }]}
                    >
                      <DatePicker 
                        className="w-full border-gray-200 text-center font-mono hover:border-black focus:border-black" 
                        disabledDate={(current) => current && current < dayjs().startOf('day')}
                        format="DD/MM/YYYY"
                        placeholder=""
                      />
                    </Form.Item>
                  </Col>
                </Row>

                <Form.Item
                  name="reason"
                  label={<span className="text-xs font-bold tracking-wider text-gray-700 uppercase">Mục đích sử dụng *</span>}
                  rules={[{ required: true, message: 'Vui lòng nhập mục đích' }]}
                >
                  <Input.TextArea 
                    rows={4} 
                    className="border-gray-200 hover:border-black focus:border-black font-mono text-sm p-4" 
                    placeholder="Mô tả ngắn mục đích mượn thiết bị..." 
                  />
                </Form.Item>

                {device.accessory_options && device.accessory_options.length > 0 && <>
                  <Form.Item
                    name="selected_accessories"
                    label={<span className="text-xs font-bold tracking-wider text-gray-700 uppercase">Phụ kiện muốn nhận (không bắt buộc)</span>}
                  >
                    <Checkbox.Group className="flex flex-col gap-2"
                      options={device.accessory_options.map(item => ({ label: item.name, value: item.name }))} />
                  </Form.Item>
                  {selectedAccessoryNames.map(name => {
                    const option = device.accessory_options?.find(item => item.name === name);
                    if (!option) return null;
                    return <Form.Item
                      key={name}
                      name={['accessory_quantities', name]}
                      initialValue={1}
                    label={`Số lượng ${name} (kho còn ${option.available_quantity})`}
                      rules={[{ required: true, message: 'Vui lòng nhập số lượng' }]}
                    >
                      <InputNumber min={1} max={option.max_quantity} precision={0} className="w-full" />
                    </Form.Item>;
                  })}
                </>}

                <Button 
                  type="primary" 
                  htmlType="submit" 
                  loading={submitting}
                  disabled={device.available_count < 1}
                  className="w-full h-12 bg-black hover:bg-gray-800 text-white font-bold uppercase tracking-widest border-none shadow-lg shadow-black/20"
                >
                  {device.available_count > 0 ? 'Tạo yêu cầu mượn' : 'Hết máy'}
                </Button>
              </Form>
            </div>

            {/* Borrow History */}
            <div className="employee-surface rounded-[24px] p-6">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-6 pb-2 border-b border-dashed border-gray-200">
                Lịch sử mượn thiết bị (Cá nhân)
              </h3>
              
              <Table 
                columns={historyColumns} 
                dataSource={history} 
                rowKey="id" 
                pagination={false}
                size="small"
                className="font-mono text-sm"
                bordered
              />
            </div>

          </div>
        </Col>
      </Row>
    </div>
  );
};
