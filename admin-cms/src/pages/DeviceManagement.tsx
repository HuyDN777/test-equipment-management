import React, { useState, useEffect, useRef } from 'react';
import { Table, Input, InputNumber, Select, Button, Modal, Drawer, Form, Row, Col, Tag, Avatar, message, Popconfirm, Radio, Upload, Descriptions } from 'antd';
import { SearchOutlined, PlusOutlined, EditOutlined, DeleteOutlined, CloseOutlined, UploadOutlined, PictureOutlined, EyeOutlined } from '@ant-design/icons';
import axiosClient from '../api/axiosClient';

export const DeviceManagement: React.FC = () => {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [form] = Form.useForm();
  const [accessoryForm] = Form.useForm();
  const [isAccessoryModalVisible, setIsAccessoryModalVisible] = useState(false);
  const [savingAccessory, setSavingAccessory] = useState(false);
  const [devices, setDevices] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [deviceModels, setDeviceModels] = useState<any[]>([]);
  const [totalDevices, setTotalDevices] = useState(0);
  const [selectedModel, setSelectedModel] = useState<any | null>(null);
  const [selectedAsset, setSelectedAsset] = useState<any | null>(null);
  const [modelDetail, setModelDetail] = useState<any | null>(null);
  const [modelAssets, setModelAssets] = useState<any[]>([]);
  const [modelAccessories, setModelAccessories] = useState<any[]>([]);
  const [assetTotal, setAssetTotal] = useState(0);
  const [assetPage, setAssetPage] = useState(1);
  const [selectedAssetIds, setSelectedAssetIds] = useState<React.Key[]>([]);
  const [bulkLocationOpen, setBulkLocationOpen] = useState(false);
  const [bulkSaving, setBulkSaving] = useState(false);
  const [bulkForm] = Form.useForm();
  const [detailLoading, setDetailLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [stockSummary, setStockSummary] = useState({ total: 0, available: 0, borrowed: 0, maintenance: 0 });
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [modelMode, setModelMode] = useState<'new' | 'existing'>('new');
  const [saving, setSaving] = useState(false);
  const [pendingImage, setPendingImage] = useState<File | null>(null);
  const [pendingImagePreview, setPendingImagePreview] = useState<string | null>(null);
  const previewUrlRef = useRef<string | null>(null);
  const imageUrl = Form.useWatch('image_url', form);
  const displayCode = (code?: string) => code?.replace(/^AUTO-/, '') || '—';

  useEffect(() => () => {
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
  }, []);

  const clearPendingImage = () => {
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    previewUrlRef.current = null;
    setPendingImage(null);
    setPendingImagePreview(null);
  };

  const selectImage = (file: File) => {
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024) {
      message.error('Chọn ảnh JPG, PNG hoặc WebP, tối đa 5 MB');
      return false;
    }
    clearPendingImage();
    const previewUrl = URL.createObjectURL(file);
    previewUrlRef.current = previewUrl;
    setPendingImage(file);
    setPendingImagePreview(previewUrl);
    return false;
  };

  useEffect(() => {
    fetchDevices(1);
    fetchStockSummary();
    fetchCategories();
    fetchDeviceModels();
  }, []);

  const fetchDevices = async (nextPage = 1, keyword = search, category = categoryId, status = statusFilter) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(nextPage), limit: '8' });
      if (keyword.trim()) params.set('search', keyword.trim());
      if (category !== 'all') params.set('category_id', category);
      if (status !== 'all') params.set('status', status);
      const response = await axiosClient.get(`/devices/models/catalog?${params}`);
      setDevices((response as any).data || []);
      setTotalDevices((response as any).total || 0);
      setPage(nextPage);
    } catch (error) {
      message.error('Không thể tải danh sách thiết bị');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const openModelDetail = async (model: any, nextAssetPage = 1) => {
    if (selectedModel?.id !== model.id) setSelectedAssetIds([]);
    setSelectedModel(model);
    setAssetPage(nextAssetPage);
    setDetailLoading(true);
    try {
      const [detail, assets, accessories] = await Promise.all([
        axiosClient.get<any, any>(`/devices/models/${model.id}`),
        axiosClient.get<any, { data: any[]; total: number }>(`/devices/models/${model.id}/assets?page=${nextAssetPage}&limit=8`),
        axiosClient.get<any, any[]>(`/devices/accessory-stocks?model_id=${model.id}`),
      ]);
      setModelDetail(detail);
      setModelAssets(assets.data || []);
      setAssetTotal(assets.total || 0);
      setModelAccessories(accessories || []);
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Không tải được chi tiết model');
    } finally {
      setDetailLoading(false);
    }
  };

  const saveBulkLocation = async (values: { location: string }) => {
    if (!selectedModel || !selectedAssetIds.length) return;
    setBulkSaving(true);
    try {
      const response = await axiosClient.patch<any, { updated_count: number }>('/devices/bulk/location', {
        device_model_id: selectedModel.id,
        device_ids: selectedAssetIds,
        location: values.location.trim(),
      });
      message.success(`Đã cập nhật vị trí cho ${response.updated_count} máy`);
      setBulkLocationOpen(false);
      setSelectedAssetIds([]);
      bulkForm.resetFields();
      void openModelDetail(selectedModel, assetPage);
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Không thể cập nhật vị trí hàng loạt');
    } finally {
      setBulkSaving(false);
    }
  };

  const fetchStockSummary = async () => {
    try {
      const summary = await axiosClient.get<any, { total: number; available: number; borrowed: number; maintenance: number }>('/devices/stock/summary');
      setStockSummary(summary);
    } catch (error) {
      console.error('Không thể tải thống kê kho', error);
    }
  };

  const fetchCategories = async () => {
    try {
      const data = await axiosClient.get('/categories');
      setCategories(data as unknown as any[]);
    } catch (error) {
      console.error('Không thể tải danh sách danh mục', error);
    }
  };

  const fetchDeviceModels = async () => {
    try {
      const response = await axiosClient.get('/devices/models/catalog?limit=100');
      setDeviceModels((response as any).data || []);
    } catch (error) {
      console.error('Không thể tải danh sách model thiết bị', error);
    }
  };

  const handleModelChange = (modelId: string) => {
    clearPendingImage();
    if (modelId === '__new__') {
      form.setFieldsValue({
        catalog_model_id: undefined,
        name: undefined,
        brand: undefined,
        model: undefined,
        device_categories_id: undefined,
        image_url: undefined,
      });
      return;
    }
    const selectedModel = deviceModels.find((item) => item.id === modelId);
    if (!selectedModel) return;
    form.setFieldsValue({
      name: selectedModel.name,
      brand: selectedModel.brand,
      model: selectedModel.model,
      device_categories_id: selectedModel.device_categories_id,
      image_url: selectedModel.image_url,
      specifications: selectedModel.specifications,
    });
  };

  const handleOpenModal = (record?: any) => {
    clearPendingImage();
    if (record) {
      setEditingId(record.id);
      form.setFieldsValue({
        ...record,
        device_categories_id: record.device_categories_id || record.category?.id,
      });
    } else {
      setEditingId(null);
      setModelMode('new');
      form.resetFields();
    }
    setIsModalVisible(true);
  };

  const handleSubmit = async (values: any) => {
    setSaving(true);
    try {
      const { catalog_model_id: _catalogModelId, ...payload } = values;
      if (!editingId && modelMode === 'existing') payload.device_model_id = _catalogModelId;
      if (pendingImage) {
        const formData = new FormData();
        formData.append('file', pendingImage);
        const uploaded = await axiosClient.post<any, { url: string }>('/uploads/images', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        payload.image_url = uploaded.url;
      }
      if (editingId) {
        await axiosClient.put(`/devices/${editingId}`, {
          code: payload.code,
          serial_number: payload.serial_number,
          location: payload.location,
          image_url: payload.image_url,
        });
        message.success('Cập nhật thiết bị thành công');
      } else {
        await axiosClient.post('/devices/stock', payload);
        message.success(`Đã thêm ${payload.quantity} máy vào kho`);
      }
      clearPendingImage();
      setIsModalVisible(false);
      fetchDevices(1);
      fetchStockSummary();
      fetchDeviceModels();
      if (selectedModel) void openModelDetail(selectedModel, assetPage);
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Có lỗi xảy ra');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await axiosClient.delete(`/devices/${id}`);
      message.success('Đã xóa thiết bị');
      fetchDevices(1);
      fetchStockSummary();
      if (selectedModel) void openModelDetail(selectedModel, assetPage);
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Không thể xóa thiết bị này (có thể đang được mượn)');
    }
  };

  const handleReplenishAccessory = async (values: any) => {
    setSavingAccessory(true);
    try {
      await axiosClient.post('/devices/accessory-stocks/replenish', values);
      message.success(`Đã nhập thêm ${values.quantity} ${values.name}`);
      accessoryForm.resetFields();
      setIsAccessoryModalVisible(false);
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Không thể nhập phụ kiện');
    } finally {
      setSavingAccessory(false);
    }
  };

  const assetColumns = [
    { title: 'MÃ THIẾT BỊ', dataIndex: 'code', key: 'code', render: (text: string, record: any) => <div>
      <div className="font-semibold font-mono text-slate-700">{displayCode(text)}</div>
      {record.serial_number && <div className="font-mono text-xs text-slate-500">SN: {record.serial_number}</div>}
    </div> },
    { title: 'ẢNH', key: 'image', render: (_: any, record: any) => (
      <Avatar shape="square" size={48} icon={<PictureOutlined />} className="bg-slate-100 text-slate-400 border border-slate-200 shadow-sm" src={record.image_url || record.deviceModel?.image_url || modelDetail?.image_url} />
    )},
    { title: 'TÊN THIẾT BỊ', dataIndex: 'name', key: 'name', render: (text: string) => <div>
      <div className="font-bold text-slate-800">{text}</div>
    </div> },
    { title: 'HÃNG', dataIndex: 'brand', key: 'brand', render: (text: string) => <span className="text-slate-600">{text || 'Không rõ'}</span> },
    { title: 'DANH MỤC', key: 'category', render: (_: any, record: any) => (
      <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-full text-xs font-medium">{record.category?.name || record.deviceModel?.category?.name || modelDetail?.category?.name || 'Chưa phân loại'}</span>
    )},
    { title: 'TRẠNG THÁI', dataIndex: 'status', key: 'status', render: (status: string) => {
        let color = "default";
        if (status === 'Available') color = "success";
        if (status === 'Borrowed') color = "processing";
        if (status === 'Maintenance') color = "warning";
        return <Tag color={color} className="rounded-full px-3 py-1 font-medium border-0 shadow-sm uppercase text-[10px] tracking-wider">{status === 'Available' ? 'Có sẵn' : (status === 'Borrowed' ? 'Đang mượn' : 'Xử lý kỹ thuật')}</Tag>;
    }},
    { title: 'VỊ TRÍ', dataIndex: 'location', key: 'location', render: (text: string) => <span className="text-slate-500">{text || 'Chưa cập nhật'}</span> },
    { title: 'THAO TÁC', key: 'action', render: (_: any, record: any) => (
        <div className="flex gap-2" onClick={(event) => event.stopPropagation()}>
          <Button type="text" icon={<EyeOutlined />} aria-label="Xem chi tiết máy" onClick={() => setSelectedAsset(record)} />
          <Button type="text" icon={<EditOutlined />} onClick={(event) => { event.stopPropagation(); handleOpenModal(record); }} className="text-blue-600 hover:text-blue-700 hover:bg-blue-50" />
          <Popconfirm title="Bạn có chắc muốn xóa thiết bị này?" onConfirm={() => handleDelete(record.id)}>
            <Button type="text" icon={<DeleteOutlined />} className="text-red-500 hover:text-red-600 hover:bg-red-50" />
          </Popconfirm>
        </div>
    )},
  ];

  const modelColumns = [
    { title: 'MODEL THIẾT BỊ', key: 'name', render: (_: any, record: any) => <div className="flex items-center gap-3">
      <Avatar shape="square" size={52} icon={<PictureOutlined />} src={record.image_url} className="!bg-slate-100" />
      <div><div className="font-bold text-slate-800">{record.name}</div><div className="text-xs text-slate-500">{record.brand || '—'} · {record.model || 'Chưa có mã model'}</div></div>
    </div> },
    { title: 'DANH MỤC', key: 'category', render: (_: any, record: any) => record.category?.name || '—' },
    { title: 'SỐ MÁY', key: 'total', render: (_: any, record: any) => <span className="font-semibold">{record.total_count}</span> },
    { title: 'CÓ SẴN', key: 'available', render: (_: any, record: any) => <Tag color={record.available_count ? 'success' : 'default'}>{record.available_count}/{record.total_count}</Tag> },
    { title: 'THAO TÁC', key: 'action', render: (_: any, record: any) => <Button icon={<EyeOutlined />} onClick={(event) => { event.stopPropagation(); void openModelDetail(record); }}>Xem chi tiết</Button> },
  ];

  return (
    <div className="font-sans max-w-7xl mx-auto space-y-8 pb-12 relative z-10">
      {/* Header */}
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-800 m-0 tracking-tight">Quản lý thiết bị</h1>
        </div>
        
        <div className="flex gap-4">
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 w-32 flex flex-col items-center justify-center">
            <div className="text-2xl font-black text-slate-800">{stockSummary.total}</div>
            <div className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold mt-1">TỔNG CỘNG</div>
          </div>
          <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl p-4 shadow-sm border border-emerald-100 w-32 flex flex-col items-center justify-center">
            <div className="text-2xl font-black text-emerald-600">{stockSummary.available}</div>
            <div className="text-[10px] text-emerald-600 uppercase tracking-widest font-semibold mt-1">CÓ SẴN</div>
          </div>
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-4 shadow-sm border border-blue-100 w-32 flex flex-col items-center justify-center">
            <div className="text-2xl font-black text-blue-600">{stockSummary.borrowed}</div>
            <div className="text-[10px] text-blue-600 uppercase tracking-widest font-semibold mt-1">ĐANG MƯỢN</div>
          </div>
          <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-2xl p-4 shadow-sm border border-orange-100 w-32 flex flex-col items-center justify-center">
            <div className="text-2xl font-black text-orange-600">{stockSummary.maintenance}</div>
            <div className="text-[10px] text-orange-600 uppercase tracking-widest font-semibold mt-1">BẢO TRÌ</div>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 flex gap-4">
        <Input 
          placeholder="Tìm theo mã, tên thiết bị, hãng..." 
          prefix={<SearchOutlined className="text-slate-400" />} 
          allowClear
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
            if (!event.target.value) fetchDevices(1, '', categoryId, statusFilter);
          }}
          onPressEnter={() => fetchDevices(1, search, categoryId, statusFilter)}
          className="flex-1 rounded-xl border-slate-200 hover:border-blue-400 focus:border-blue-500 bg-slate-50 hover:bg-white focus:bg-white"
        />
        <Select value={categoryId} onChange={(value) => { setCategoryId(value); fetchDevices(1, search, value, statusFilter); }} className="w-48" options={[{ value: 'all', label: 'Tất cả danh mục' }, ...categories.map((item) => ({ value: item.id, label: item.name }))]} />
        <Select value={statusFilter} onChange={(value) => { setStatusFilter(value); fetchDevices(1, search, categoryId, value); }} className="w-40" options={[{ value: 'all', label: 'Tất cả model' }, { value: 'Available', label: 'Còn máy sẵn' }, { value: 'Borrowed', label: 'Hết máy sẵn' }]} />
        <Button 
          type="primary" 
          icon={<PlusOutlined />} 
          onClick={() => handleOpenModal()}
          className="bg-blue-600 rounded-xl h-[40px] px-6 font-semibold shadow-md shadow-blue-500/30 border-none"
        >
          Nhập thiết bị
        </Button>
        <Button
          icon={<PlusOutlined />}
          onClick={() => setIsAccessoryModalVisible(true)}
          className="rounded-xl h-[40px] px-5 font-semibold border-emerald-300 text-emerald-700"
        >
          Nhập phụ kiện
        </Button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <h2 className="text-lg font-bold text-slate-800 m-0">Thiết bị theo model</h2>
        </div>
        
        <Table 
          columns={modelColumns} 
          dataSource={devices} 
          rowKey="id" 
          loading={loading}
          pagination={{ 
            current: page,
            total: totalDevices,
            pageSize: 8, 
            className: "px-6 py-4 m-0 border-t border-slate-100",
            showTotal: (total, range) => `Hiển thị ${range[0]}-${range[1]} / ${total} model`
          }}
          onChange={(pagination) => fetchDevices(pagination.current || 1)}
          className="admin-modern-table"
          onRow={(record) => ({ onClick: () => void openModelDetail(record), className: 'cursor-pointer' })}
        />
      </div>

      <Drawer title={selectedModel ? `Chi tiết ${selectedModel.name}` : 'Chi tiết model'} width={900}
        open={!!selectedModel} onClose={() => { setSelectedModel(null); setModelDetail(null); setSelectedAssetIds([]); }}>
        <div className="space-y-6">
          <Descriptions bordered size="small" column={2}>
            <Descriptions.Item label="Danh mục">{modelDetail?.category?.name || selectedModel?.category?.name || '—'}</Descriptions.Item>
            <Descriptions.Item label="Hãng">{modelDetail?.brand || selectedModel?.brand || '—'}</Descriptions.Item>
            <Descriptions.Item label="Mã model">{modelDetail?.model || selectedModel?.model || '—'}</Descriptions.Item>
            <Descriptions.Item label="Tổng số máy">{modelDetail?.total_count ?? selectedModel?.total_count ?? 0}</Descriptions.Item>
            <Descriptions.Item label="Còn sẵn">{modelDetail?.available_count ?? selectedModel?.available_count ?? 0}</Descriptions.Item>
          </Descriptions>
          <section><h3 className="font-bold text-slate-800">Phụ kiện tương thích trong kho chung</h3>
            {modelAccessories.length
              ? <div className="flex flex-wrap gap-2">{modelAccessories.map((item: any) => <Tag key={item.id} color={item.available_quantity ? 'green' : 'default'}>{item.name}: còn {item.available_quantity}/{item.total_quantity}</Tag>)}</div>
              : <div className="text-slate-500">Chưa có phụ kiện tương thích.</div>}
          </section>
          <section>
            <div className="mb-3 flex items-center justify-between gap-3">
              <h3 className="m-0 font-bold text-slate-800">Các máy thuộc model</h3>
              <Button disabled={!selectedAssetIds.length} onClick={() => setBulkLocationOpen(true)}>
                Đổi vị trí {selectedAssetIds.length ? `(${selectedAssetIds.length})` : ''}
              </Button>
            </div>
            <Table columns={assetColumns} dataSource={modelAssets} rowKey="id" size="small" loading={detailLoading}
              rowSelection={{ selectedRowKeys: selectedAssetIds, preserveSelectedRowKeys: true,
                onChange: (keys) => {
                  if (keys.length > 100) {
                    message.warning('Chọn tối đa 100 máy mỗi lần cập nhật');
                    return;
                  }
                  setSelectedAssetIds(keys);
                },
                getCheckboxProps: (record) => ({ disabled: record.status !== 'Available' }) }}
              onRow={(record) => ({ onClick: () => setSelectedAsset(record), className: 'cursor-pointer' })}
              scroll={{ x: 1000 }} pagination={{ current: assetPage, pageSize: 8, total: assetTotal,
                onChange: (nextPage) => selectedModel && void openModelDetail(selectedModel, nextPage) }} />
          </section>
        </div>
      </Drawer>

      <Modal title={`Đổi vị trí cho ${selectedAssetIds.length} máy`} open={bulkLocationOpen}
        onCancel={() => !bulkSaving && setBulkLocationOpen(false)} onOk={() => bulkForm.submit()}
        okText="Cập nhật" okButtonProps={{ loading: bulkSaving }} cancelText="Hủy">
        <Form form={bulkForm} layout="vertical" onFinish={saveBulkLocation}>
          <Form.Item name="location" label="Vị trí lưu trữ mới" rules={[{ required: true, whitespace: true, message: 'Nhập vị trí lưu trữ' }]}>
            <Input maxLength={255} placeholder="Ví dụ: Tủ A, ngăn 03" />
          </Form.Item>
        </Form>
      </Modal>

      <Modal title="Chi tiết máy" open={!!selectedAsset} onCancel={() => setSelectedAsset(null)} footer={null} width={600}>
        {selectedAsset && <Descriptions bordered column={1} size="small">
          <Descriptions.Item label="Tên thiết bị">{selectedAsset.name}</Descriptions.Item>
          <Descriptions.Item label="Mã thiết bị">{displayCode(selectedAsset.code)}</Descriptions.Item>
          <Descriptions.Item label="Serial">{selectedAsset.serial_number || '—'}</Descriptions.Item>
          <Descriptions.Item label="Trạng thái">{selectedAsset.status}</Descriptions.Item>
          <Descriptions.Item label="Vị trí">{selectedAsset.location || '—'}</Descriptions.Item>
          <Descriptions.Item label="Mã asset">{selectedAsset.id}</Descriptions.Item>
        </Descriptions>}
      </Modal>

      {/* Add Device Modal */}
      <Modal
        title={null}
        open={isModalVisible}
        onCancel={() => { clearPendingImage(); setIsModalVisible(false); }}
        footer={null}
        width={800}
        closeIcon={<div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200 hover:text-slate-700 transition-colors"><CloseOutlined /></div>}
        className="font-sans modern-modal"
      >
        <div className="px-8 pt-8 pb-4">
          <h3 className="text-2xl font-bold text-slate-800 m-0">{editingId ? 'Cập nhật thiết bị' : 'Thêm thiết bị vào kho'}</h3>
        </div>

        <div className="px-8 pb-8 max-h-[58vh] overflow-y-auto custom-scrollbar">
          <Form layout="vertical" form={form} onFinish={handleSubmit} requiredMark={false}>
            {!editingId && (
              <div className="mb-6 rounded-2xl border border-blue-100 bg-blue-50 p-5">
                <div className="text-sm font-bold text-slate-800 mb-1">Bước 1 — Chọn model thiết bị</div>
                <Radio.Group
                  value={modelMode}
                  onChange={(event) => {
                    const mode = event.target.value as 'new' | 'existing';
                    setModelMode(mode);
                    if (mode === 'new') handleModelChange('__new__');
                  }}
                  optionType="button"
                  buttonStyle="solid"
                  className="mb-4"
                >
                  <Radio.Button value="new">Tạo model mới</Radio.Button>
                  <Radio.Button value="existing" disabled={deviceModels.length === 0}>Dùng model có sẵn</Radio.Button>
                </Radio.Group>

                {modelMode === 'existing' && (
                  <Form.Item name="catalog_model_id" className="mb-0" rules={[{ required: true, message: 'Hãy chọn model' }]}>
                    <Select placeholder="Chọn model thiết bị" onChange={handleModelChange} className="h-10">
                      {deviceModels.map((item) => (
                        <Select.Option key={item.id} value={item.id}>
                          {item.name} {item.model ? `— ${item.model}` : ''} ({item.available_count}/{item.total_count} sẵn sàng)
                        </Select.Option>
                      ))}
                    </Select>
                  </Form.Item>
                )}

              </div>
            )}

            <div className="mb-6 rounded-xl border border-slate-200 bg-white p-5">
              <div className="text-sm font-bold text-slate-700 mb-4">Thông tin model</div>
              <Row gutter={24}>
                <Col span={12}>
                  <Form.Item name="name" label="Tên model *" rules={[{ required: true, message: 'Nhập tên model' }]}>
                    <Input placeholder="VD: Đồng hồ vạn năng Fluke 87V" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="device_categories_id" label="Danh mục *" rules={[{ required: true, message: 'Chọn danh mục' }]}>
                    <Select placeholder="Chọn danh mục">
                      {categories.map((cat) => <Select.Option key={cat.id} value={cat.id}>{cat.name}</Select.Option>)}
                    </Select>
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="brand" label="Hãng sản xuất"><Input placeholder="VD: Fluke" /></Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="model" label="Mã model"><Input placeholder="VD: 87V" /></Form.Item>
                </Col>
                <Col span={24}>
                  <Form.Item name="image_url" hidden><Input /></Form.Item>
                  <div className="mb-2 text-sm font-medium text-slate-700">Ảnh thiết bị</div>
                  <Upload accept="image/jpeg,image/png,image/webp" maxCount={1} showUploadList={false} beforeUpload={selectImage}>
                    <Button icon={<UploadOutlined />} disabled={saving}>Chọn ảnh</Button>
                  </Upload>
                  {pendingImage && <Button type="text" disabled={saving} onClick={clearPendingImage}>Bỏ chọn</Button>}
                  {pendingImage && <span className="ml-2 text-sm text-amber-700">Chưa lưu</span>}
                  {(pendingImagePreview || imageUrl) && <img src={pendingImagePreview || imageUrl} alt="Xem trước thiết bị" className="mt-3 h-32 max-w-full rounded-lg border border-slate-200 object-contain" />}
                </Col>
              </Row>
            </div>

            <div className="mb-4 rounded-xl border border-slate-200 bg-white px-4 py-3">
              <div className="text-sm font-bold text-slate-700">{editingId ? 'Thông tin máy' : 'Bước 2 — Số lượng nhập kho'}</div>
            </div>
            <div className="mb-8">
              <Row gutter={24}>
                {!editingId && <Col span={12}>
                  <Form.Item name="quantity" label="Số lượng máy *" initialValue={1} rules={[{ required: true, message: 'Nhập số lượng' }]}>
                    <InputNumber min={1} max={1000} precision={0} className="w-full" />
                  </Form.Item>
                </Col>}
                {editingId && <Col span={12}>
                  <Form.Item name="code" label="Mã thiết bị *" rules={[{ required: true, message: 'Nhập mã thiết bị' }]}>
                    <Input placeholder="VD: DMM-001" />
                  </Form.Item>
                </Col>}
                {editingId && <Col span={12}>
                  <Form.Item name="serial_number" label="Số serial"><Input placeholder="VD: SN-A001" /></Form.Item>
                </Col>}
                <Col span={12}>
                  <Form.Item name="location" label="Vị trí lưu trữ"><Input placeholder="VD: Kệ A-01, Phòng Lab B" /></Form.Item>
                </Col>
              </Row>
            </div>

            {!editingId && <div className="mb-8 rounded-xl border border-emerald-100 bg-emerald-50/40 p-5">
              <div className="mb-4 text-sm font-bold text-slate-700">Phụ kiện nhập kho</div>
              <Form.List name="accessory_stocks">
                {(fields, { add, remove }) => <div className="space-y-3">
                  {fields.map((field) => <Row gutter={12} key={field.key} align="middle">
                    <Col span={14}>
                      <Form.Item className="mb-0" name={[field.name, 'name']} label="Tên phụ kiện" rules={[{ required: true, whitespace: true, message: 'Nhập tên phụ kiện' }]}>
                        <Input placeholder="VD: Tai nghe" />
                      </Form.Item>
                    </Col>
                    <Col span={6}>
                      <Form.Item className="mb-0" name={[field.name, 'quantity']} label="Số lượng nhập" rules={[{ required: true, message: 'Nhập số lượng' }]}>
                        <InputNumber min={1} max={100000} precision={0} className="w-full" />
                      </Form.Item>
                    </Col>
                    <Col span={4} className="pt-7">
                      <Button danger type="text" onClick={() => remove(field.name)}>Xóa</Button>
                    </Col>
                  </Row>)}
                  <Button type="dashed" onClick={() => add({ quantity: 1 })}>+ Thêm loại phụ kiện</Button>
                </div>}
              </Form.List>
            </div>}

          </Form>
        </div>
        
        {/* Modal Footer */}
        <div className="border-t border-slate-100 p-6 flex justify-end gap-3 bg-slate-50 rounded-b-2xl">
          <Button onClick={() => { clearPendingImage(); setIsModalVisible(false); }} disabled={saving} className="rounded-xl font-semibold text-slate-600 px-6 h-10 border-slate-300 hover:bg-slate-100">
            Hủy bỏ
          </Button>
          <Button type="primary" onClick={() => form.submit()} loading={saving} className="rounded-xl bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-500/30 border-none font-semibold px-8 h-10">
            {editingId ? 'Lưu thay đổi' : 'Lưu thiết bị'}
          </Button>
        </div>
      </Modal>

      <Modal
        title="Nhập phụ kiện vào kho chung"
        open={isAccessoryModalVisible}
        onCancel={() => !savingAccessory && setIsAccessoryModalVisible(false)}
        onOk={() => accessoryForm.submit()}
        okText="Nhập kho"
        cancelText="Hủy"
        okButtonProps={{ loading: savingAccessory, className: 'bg-emerald-600' }}
      >
        <Form form={accessoryForm} layout="vertical" onFinish={handleReplenishAccessory} requiredMark={false}>
          <Form.Item name="device_model_id" label="Dùng được với model *" rules={[{ required: true, message: 'Chọn model tương thích' }]}>
            <Select
              showSearch
              optionFilterProp="label"
              placeholder="Chọn model"
              options={deviceModels.map(item => ({ value: item.id, label: `${item.name}${item.model ? ` — ${item.model}` : ''}` }))}
            />
          </Form.Item>
          <Form.Item name="name" label="Tên phụ kiện *" rules={[{ required: true, whitespace: true, message: 'Nhập tên phụ kiện' }]}>
            <Input placeholder="VD: Tai nghe" />
          </Form.Item>
          <Form.Item name="quantity" label="Số lượng nhập *" rules={[{ required: true, message: 'Nhập số lượng' }]}>
            <InputNumber min={1} max={100000} precision={0} className="w-full" />
          </Form.Item>
        </Form>
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
        .modern-modal .ant-select-selector {
          border-radius: 12px !important;
          background-color: #f8fafc !important;
          border-color: #e2e8f0 !important;
        }
      `}</style>
    </div>
  );
};
