import React, { useState, useEffect } from 'react';
import { Table, Input, InputNumber, Button, Modal, Form, Radio, Select, Tag, Avatar, message, Drawer } from 'antd';
import { SearchOutlined, CheckOutlined, CloseOutlined, EyeOutlined, FilterOutlined, RollbackOutlined, UserOutlined } from '@ant-design/icons';
import axiosClient from '../api/axiosClient';
import dayjs from 'dayjs';
import { useLocation } from 'react-router-dom';

const requestedAccessoriesOf = (request: any): { accessory_id?: string; name: string; quantity: number }[] =>
  (request?.requested_accessories || []).map((item: string | { accessory_id?: string; name: string; quantity: number }) =>
    typeof item === 'string' ? { name: item, quantity: 1 } : item);

const requestedAccessoriesLabel = (request: any) =>
  requestedAccessoriesOf(request).map(item => `${item.name} ×${item.quantity}`).join(', ');

export const BorrowRequests: React.FC = () => {
  const location = useLocation();
  const [isRejectModalVisible, setIsRejectModalVisible] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [detailRequest, setDetailRequest] = useState<any>(null);
  const [returnRequest, setReturnRequest] = useState<any>(null);
  const [returnQuantities, setReturnQuantities] = useState<Record<string, number>>({});
  const [returnNotes, setReturnNotes] = useState('');
  const [returnSubmitting, setReturnSubmitting] = useState(false);
  const [approveRequest, setApproveRequest] = useState<any>(null);
  const [availableAssets, setAvailableAssets] = useState<any[]>([]);
  const [accessoryStocks, setAccessoryStocks] = useState<any[]>([]);
  const [selectedAssetId, setSelectedAssetId] = useState<string | undefined>();
  const [issuedQuantities, setIssuedQuantities] = useState<Record<string, number>>({});
  const [approveLoading, setApproveLoading] = useState(false);
  const [form] = Form.useForm();
  
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');

  const fetchRequests = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const response = await axiosClient.get('/borrow-requests?limit=100');
      const nextRequests = (response as any).data || [];
      setRequests(nextRequests);
      setDetailRequest((current: any) => current
        ? nextRequests.find((request: any) => request.id === current.id) || null
        : null);
    } catch (error) {
      message.error('Không thể tải danh sách yêu cầu mượn');
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  useEffect(() => {
    const refreshInBackground = () => void fetchRequests(false);
    const refreshWhenVisible = () => {
      if (document.visibilityState === 'visible') refreshInBackground();
    };
    void fetchRequests(true);
    const timer = window.setInterval(refreshInBackground, 5_000);
    window.addEventListener('focus', refreshInBackground);
    document.addEventListener('visibilitychange', refreshWhenVisible);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('focus', refreshInBackground);
      document.removeEventListener('visibilitychange', refreshWhenVisible);
    };
  }, [location.key]);

  const selectAsset = (asset: any) => {
    setSelectedAssetId(asset.id);
  };

  const openApprove = async (request: any) => {
    setApproveRequest(request);
    setAvailableAssets([]);
    setAccessoryStocks([]);
    setSelectedAssetId(undefined);
    setIssuedQuantities({});
    setApproveLoading(true);
    try {
      const [assets, model] = await Promise.all([
        axiosClient.get<any, any[]>(`/devices/models/${request.device_model_id}/available-assets`),
        axiosClient.get<any, any>(`/devices/models/${request.device_model_id}`),
      ]);
      const stocks = model.accessory_options || [];
      setAvailableAssets(assets);
      setAccessoryStocks(stocks);
      const requested = requestedAccessoriesOf(request);
      setIssuedQuantities(Object.fromEntries(stocks.map((stock: any) => {
        const wanted = requested.find(item => item.accessory_id === stock.id
          || item.name.toLocaleLowerCase() === stock.name.toLocaleLowerCase());
        return [stock.id, Math.min(wanted?.quantity ?? 0, stock.available_quantity)];
      })));
      if (assets.length) selectAsset(assets[0]);
      else setSelectedAssetId(undefined);
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Không thể tải thiết bị sẵn sàng');
      setApproveRequest(null);
    } finally {
      setApproveLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!approveRequest || !selectedAssetId) return;
    if (!availableAssets.some(item => item.id === selectedAssetId)) return;
    setApproveLoading(true);
    try {
      await axiosClient.patch(`/borrow-requests/${approveRequest.id}/approve`, {
        device_id: selectedAssetId,
        accessories: accessoryStocks.filter((item: any) => issuedQuantities[item.id] > 0).map((item: any) => ({
          accessory_id: item.id, quantity: issuedQuantities[item.id],
        })),
      });
      message.success('Đã duyệt yêu cầu mượn!');
      setApproveRequest(null);
      setDetailRequest(null);
      fetchRequests();
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Không thể duyệt yêu cầu');
    } finally {
      setApproveLoading(false);
    }
  };

  const handleRejectSubmit = async (values: any) => {
    if (!selectedRequest) return;
    try {
      await axiosClient.patch(`/borrow-requests/${selectedRequest.id}/reject`, {
        rejection_reason: values.rejectReason
      });
      message.success('Đã từ chối yêu cầu mượn');
      setIsRejectModalVisible(false);
      setDetailRequest(null);
      form.resetFields();
      fetchRequests();
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Không thể từ chối yêu cầu');
    }
  };

  const handleRejectClick = (record: any) => {
    setSelectedRequest(record);
    setDetailRequest(null);
    setIsRejectModalVisible(true);
  };

  const openReturn = (request: any) => {
    setReturnRequest(request);
    setReturnQuantities(Object.fromEntries((request.issued_accessories || []).map((item: any) => [item.accessory_id, item.quantity])));
    setReturnNotes('');
  };

  const handleReturn = async () => {
    if (!returnRequest) return;
    setReturnSubmitting(true);
    try {
      await axiosClient.patch(`/borrow-requests/${returnRequest.id}/return`, {
        notes: returnNotes,
        accessories: (returnRequest.issued_accessories || []).map((item: any) => ({
          accessory_id: item.accessory_id,
          quantity: returnQuantities[item.accessory_id],
        })),
      });
      message.success('Đã xác nhận trả thiết bị');
      setReturnRequest(null);
      setDetailRequest(null);
      fetchRequests();
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Không thể xác nhận trả thiết bị');
    } finally {
      setReturnSubmitting(false);
    }
  };

  const displayedRequests = requests.filter((request) => {
    if (filter === 'pending' && request.status !== 'Pending') return false;
    if (filter === 'borrowed' && !['Approved', 'ReturnPending'].includes(request.status)) return false;
    if (filter === 'returned' && request.status !== 'Returned') return false;
    const keyword = search.trim().toLowerCase();
    if (!keyword) return true;
    return request.id?.toLowerCase().includes(keyword)
      || request.user?.name?.toLowerCase().includes(keyword)
      || request.deviceModel?.name?.toLowerCase().includes(keyword)
      || request.device?.code?.toLowerCase().includes(keyword);
  });

  const renderStatusTag = (status: string) => {
    let color = 'default';
    let label = status;
    if (status === 'Pending') { color = 'warning'; label = 'Chờ duyệt'; }
    if (status === 'Approved') { color = 'processing'; label = 'Đang mượn'; }
    if (status === 'ReturnPending') { color = 'warning'; label = 'Báo lỗi · Chờ tiếp nhận'; }
    if (status === 'Rejected') { color = 'error'; label = 'Đã từ chối'; }
    if (status === 'Returned') { color = 'default'; label = 'Đã trả'; }
    if (status === 'Cancelled') { color = 'default'; label = 'Đã hủy'; }
    return <Tag color={color} className="rounded-full px-3 py-1 font-medium border-0 shadow-sm uppercase tracking-wider text-[10px]">{label}</Tag>;
  };

  const columns = [
    { title: 'ID', dataIndex: 'id', key: 'id', render: (text: string) => <span className="font-mono text-slate-400 bg-slate-100 px-2 py-1 rounded-md text-xs">{text?.substring(0, 8).toUpperCase()}</span> },
    { title: 'NGƯỜI MƯỢN', key: 'user', render: (_: any, record: any) => (
      <div className="flex items-center gap-3">
        <Avatar src={record.user?.avatar_url || undefined} icon={<UserOutlined />} className="!bg-emerald-100 !text-emerald-700 border border-emerald-200" />
        <span className="font-bold text-slate-800">{record.user?.name || 'Unknown User'}</span>
      </div>
    )},
    { title: 'MODEL YÊU CẦU', key: 'deviceModel', render: (_: any, record: any) => (
      <div><div className="font-medium text-slate-700">{record.deviceModel?.name || '-'}</div><div className="text-xs text-slate-400">{record.deviceModel?.brand} {record.deviceModel?.model}</div></div>
    ) },
    { title: 'ASSET ĐƯỢC CẤP', key: 'device', render: (_: any, record: any) => record.device ? <span className="font-mono text-xs">{record.device.code}<br/>{record.device.serial_number || ''}</span> : <span className="text-slate-400">Chưa cấp</span> },
    { title: 'NGÀY NHẬN', dataIndex: 'borrow_date', key: 'borrow_date', render: (text: string) => <span className="text-slate-600">{dayjs(text).format('DD/MM/YYYY')}</span> },
    { title: 'NGÀY TRẢ', dataIndex: 'due_date', key: 'due_date', render: (text: string) => <span className="text-slate-600">{dayjs(text).format('DD/MM/YYYY')}</span> },
    { title: 'LÝ DO MƯỢN', dataIndex: 'reason', key: 'reason', ellipsis: true, render: (text: string) => <span className="text-slate-500 italic">{text || 'Không có lý do'}</span> },
    { title: 'TRẠNG THÁI', dataIndex: 'status', key: 'status', render: renderStatusTag },
    { title: 'CHI TIẾT', key: 'action', width: 120, render: (_: any, record: any) => (
      <Button
        size="small"
        icon={<EyeOutlined />}
        onClick={(event) => {
          event.stopPropagation();
          setDetailRequest(record);
        }}
        className="rounded-lg border-emerald-200 text-emerald-700 font-semibold hover:!border-emerald-400 hover:!text-emerald-700"
      >
        Xem
      </Button>
    )},
  ];

  return (
    <div className="font-sans max-w-7xl mx-auto space-y-8 pb-12 relative z-10">
      {/* Header */}
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-800 m-0 tracking-tight">Danh sách yêu cầu mượn</h1>
        </div>
        
        <div className="flex gap-4">
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 flex flex-col items-center justify-center min-w-[100px]">
            <div className="text-2xl font-black text-slate-800">{requests.length}</div>
            <div className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold mt-1">TỔNG YÊU CẦU</div>
          </div>
          <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl p-4 shadow-sm border border-orange-100 flex flex-col items-center justify-center min-w-[100px]">
            <div className="text-2xl font-black text-orange-600">{requests.filter((item) => item.status === 'Pending').length}</div>
            <div className="text-[10px] text-orange-600 uppercase tracking-widest font-semibold mt-1">CHỜ DUYỆT</div>
          </div>
          <div
            onClick={() => setFilter('borrowed')}
            className="cursor-pointer bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-4 shadow-sm border border-blue-100 flex flex-col items-center justify-center min-w-[130px]"
          >
            <div className="text-2xl font-black text-blue-600">{requests.filter((item) => ['Approved', 'ReturnPending'].includes(item.status)).length}</div>
            <div className="text-[10px] text-blue-600 uppercase tracking-widest font-semibold mt-1">CHỜ XÁC NHẬN TRẢ</div>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 flex flex-col md:flex-row gap-4 justify-between items-center">
        <Input 
          placeholder="Tìm theo ID, người mượn, thiết bị..." 
          prefix={<SearchOutlined className="text-slate-400" />} 
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="w-full md:w-96 rounded-xl border-slate-200 hover:border-blue-400 focus:border-blue-500 bg-slate-50 hover:bg-white focus:bg-white h-10"
        />
        <div className="flex items-center gap-2">
          <FilterOutlined className="text-slate-400 mr-2" />
          <Radio.Group value={filter} onChange={e => setFilter(e.target.value)} buttonStyle="solid" className="custom-radio-group">
            <Radio.Button value="all">Tất cả</Radio.Button>
            <Radio.Button value="pending">Chờ duyệt</Radio.Button>
            <Radio.Button value="borrowed">Đang mượn / xác nhận trả</Radio.Button>
            <Radio.Button value="returned">Đã trả</Radio.Button>
          </Radio.Group>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <h2 className="text-lg font-bold text-slate-800 m-0">Danh sách yêu cầu</h2>
        </div>
        
        <Table 
          columns={columns} 
          dataSource={displayedRequests} 
          rowKey="id" 
          loading={loading}
          pagination={{ 
            pageSize: 7, 
            className: "px-6 py-4 m-0 border-t border-slate-100",
            showTotal: (total, range) => `Hiển thị ${range[0]}-${range[1]} / ${total} yêu cầu`
          }}
          className="admin-modern-table"
          onRow={(record) => ({
            onClick: () => setDetailRequest(record),
            className: 'cursor-pointer',
          })}
        />
      </div>

      <Drawer
        title={
          <div>
            <div className="text-lg font-extrabold text-slate-800">Chi tiết yêu cầu mượn</div>
            <div className="text-xs text-slate-400 font-mono mt-1">{detailRequest?.id?.toUpperCase()}</div>
          </div>
        }
        width={620}
        open={Boolean(detailRequest)}
        onClose={() => setDetailRequest(null)}
        extra={detailRequest ? renderStatusTag(detailRequest.status) : null}
        footer={detailRequest ? (
          <div className="flex justify-end gap-3">
            <Button onClick={() => setDetailRequest(null)}>Đóng</Button>
            {detailRequest.status === 'Pending' && <>
              <Button danger icon={<CloseOutlined />} onClick={() => handleRejectClick(detailRequest)}>
                Từ chối
              </Button>
              <Button type="primary" icon={<CheckOutlined />} className="!bg-emerald-600" onClick={() => openApprove(detailRequest)}>
                Duyệt cho mượn
              </Button>
            </>}
            {['Approved', 'ReturnPending'].includes(detailRequest.status) && (() => {
              const isIssueReturn = detailRequest.status === 'ReturnPending' || detailRequest.device?.status === 'Maintenance';
              return <Button type="primary" icon={<RollbackOutlined />} onClick={() => openReturn(detailRequest)}>
                  {isIssueReturn ? 'Tiếp nhận thiết bị lỗi' : 'Xác nhận đã nhận lại'}
                </Button>;
            })()}
          </div>
        ) : null}
      >
        {detailRequest && <div className="space-y-6">
          <section className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
            <div className="flex items-center gap-4">
              <Avatar
                size={52}
                src={detailRequest.user?.avatar_url || undefined}
                icon={<UserOutlined />}
                className="!bg-emerald-100 !text-emerald-700 border border-emerald-200"
              />
              <div>
                <div className="font-extrabold text-slate-800 text-base">{detailRequest.user?.name || 'Không xác định'}</div>
                <div className="text-sm text-slate-500 mt-0.5">{detailRequest.user?.email || 'Không có email'}</div>
                <div className="text-xs text-emerald-700 mt-1">Phòng ban: {detailRequest.user?.department || 'Chưa cập nhật'}</div>
              </div>
            </div>
          </section>

          {detailRequest.status === 'Pending' && <section>
            <h3 className="text-xs font-extrabold tracking-widest uppercase text-slate-400 mb-3">Phụ kiện nhân viên muốn nhận</h3>
            <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-700">
              {requestedAccessoriesLabel(detailRequest) || 'Không yêu cầu phụ kiện'}
            </div>
          </section>}

          {detailRequest.issued_accessories?.length > 0 && <section>
            <h3 className="text-xs font-extrabold tracking-widest uppercase text-slate-400 mb-3">Phụ kiện bàn giao</h3>
            <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-4 space-y-2 text-sm">
              {detailRequest.issued_accessories.map((item: any) => {
                const returned = detailRequest.returned_accessories?.find((entry: any) => entry.accessory_id === item.accessory_id);
                return <div key={item.accessory_id} className="flex justify-between gap-3">
                  <span>{item.name}</span>
                  <span className="font-semibold">
                    {returned
                      ? `${returned.quantity}/${item.quantity} đã nhận lại${returned.quantity > item.quantity
                        ? ` · Thừa ${returned.quantity - item.quantity}`
                        : returned.quantity < item.quantity ? ` · Thiếu ${item.quantity - returned.quantity}` : ''}`
                      : `×${item.quantity}`}
                  </span>
                </div>;
              })}
            </div>
          </section>}

          <section>
            <h3 className="text-xs font-extrabold tracking-widest uppercase text-slate-400 mb-3">Thiết bị yêu cầu</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-slate-200 p-4 col-span-2">
                <div className="text-xs text-slate-400">Model</div>
                <div className="font-bold text-slate-800 mt-1">{detailRequest.deviceModel?.name || '-'}</div>
                <div className="text-sm text-slate-500 mt-1">{detailRequest.deviceModel?.brand || '-'} · {detailRequest.deviceModel?.model || '-'}</div>
              </div>
              <div className="rounded-xl border border-slate-200 p-4">
                <div className="text-xs text-slate-400">Asset được cấp</div>
                <div className="font-bold font-mono text-slate-800 mt-1">{detailRequest.device?.code || 'Chưa cấp'}</div>
              </div>
              <div className="rounded-xl border border-slate-200 p-4">
                <div className="text-xs text-slate-400">Serial number</div>
                <div className="font-bold font-mono text-slate-800 mt-1">{detailRequest.device?.serial_number || '-'}</div>
              </div>
            </div>
          </section>

          <section>
            <h3 className="text-xs font-extrabold tracking-widest uppercase text-slate-400 mb-3">Thời gian mượn</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-emerald-50 border border-emerald-100 p-4">
                <div className="text-xs text-emerald-700">Ngày nhận dự kiến</div>
                <div className="font-bold text-slate-800 mt-1">{dayjs(detailRequest.borrow_date).format('DD/MM/YYYY')}</div>
              </div>
              <div className="rounded-xl bg-amber-50 border border-amber-100 p-4">
                <div className="text-xs text-amber-700">Ngày trả dự kiến</div>
                <div className="font-bold text-slate-800 mt-1">{dayjs(detailRequest.due_date).format('DD/MM/YYYY')}</div>
              </div>
              {detailRequest.return_date && <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 col-span-2">
                <div className="text-xs text-slate-500">Ngày trả thực tế</div>
                <div className="font-bold text-slate-800 mt-1">{dayjs(detailRequest.return_date).format('DD/MM/YYYY')}</div>
              </div>}
            </div>
          </section>

          <section>
            <h3 className="text-xs font-extrabold tracking-widest uppercase text-slate-400 mb-3">Mục đích sử dụng</h3>
            <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm leading-6 text-slate-700 whitespace-pre-wrap min-h-20">
              {detailRequest.reason || 'Nhân viên không cung cấp mục đích sử dụng.'}
            </div>
          </section>

          {detailRequest.rejection_reason && <section>
            <h3 className="text-xs font-extrabold tracking-widest uppercase text-rose-400 mb-3">Lý do từ chối</h3>
            <div className="rounded-xl border border-rose-100 bg-rose-50 p-4 text-sm leading-6 text-rose-700 whitespace-pre-wrap">
              {detailRequest.rejection_reason}
            </div>
          </section>}

          {detailRequest.return_notes && <section>
            <h3 className="text-xs font-extrabold tracking-widest uppercase text-slate-400 mb-3">Ghi chú khi trả</h3>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-700 whitespace-pre-wrap">
              {detailRequest.return_notes}
            </div>
          </section>}
        </div>}
      </Drawer>

      <Modal
        title="Xác nhận thiết bị và phụ kiện bàn giao"
        open={Boolean(approveRequest)}
        onCancel={() => !approveLoading && setApproveRequest(null)}
        onOk={handleApprove}
        okText="Xác nhận cho mượn"
        okButtonProps={{ loading: approveLoading, disabled: !selectedAssetId }}
        cancelText="Hủy"
      >
        <div className="mb-4 text-sm text-slate-600">
          Nhân viên yêu cầu: {requestedAccessoriesLabel(approveRequest) || 'Không cần phụ kiện'}.
        </div>
        <div className="mb-3 font-semibold">Chọn thiết bị sẵn sàng</div>
        <Select
          className="w-full mb-5"
          value={selectedAssetId}
          placeholder={approveLoading ? 'Đang tải...' : 'Không còn thiết bị sẵn sàng'}
          options={availableAssets.map(item => ({ value: item.id, label: `${item.code}${item.serial_number ? ` · ${item.serial_number}` : ''}` }))}
          onChange={(id) => {
            const asset = availableAssets.find(item => item.id === id);
            if (asset) selectAsset(asset);
          }}
        />
        <div className="mb-3 font-semibold">Số phụ kiện thực tế bàn giao</div>
        {accessoryStocks.length === 0
          ? <div className="text-sm text-slate-500">Model này không có phụ kiện tương thích đang còn trong kho.</div>
          : accessoryStocks.map((item: any) => (
            <div key={item.id} className="mb-3 flex items-center justify-between gap-4">
              <span>{item.name} <span className="text-slate-500">(yêu cầu {requestedAccessoriesOf(approveRequest).find(
                wanted => wanted.accessory_id === item.id || wanted.name.toLocaleLowerCase() === item.name.toLocaleLowerCase())?.quantity ?? 0}; trong kho {item.available_quantity})</span></span>
              <InputNumber min={0} max={Math.min(item.available_quantity, requestedAccessoriesOf(approveRequest).find(
                wanted => wanted.accessory_id === item.id || wanted.name.toLocaleLowerCase() === item.name.toLocaleLowerCase())?.quantity ?? 0)}
                precision={0} value={issuedQuantities[item.id] ?? 0}
                disabled={!requestedAccessoriesOf(approveRequest).some(wanted => wanted.accessory_id === item.id || wanted.name.toLocaleLowerCase() === item.name.toLocaleLowerCase())}
                onChange={(value) => setIssuedQuantities(current => ({ ...current, [item.id]: value ?? 0 }))} />
            </div>
          ))}
        {requestedAccessoriesOf(approveRequest).some(wanted => {
          const accessory = accessoryStocks.find((item: any) => item.id === wanted.accessory_id
            || item.name.toLocaleLowerCase() === wanted.name.toLocaleLowerCase());
          return !accessory || (issuedQuantities[accessory.id] ?? 0) < wanted.quantity;
        }) && <div className="mt-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
          Số lượng bàn giao ít hơn yêu cầu. Hãy xác nhận với nhân viên trước khi duyệt.
        </div>}
      </Modal>

      <Modal
        title={`Xác nhận trả ${returnRequest?.device?.code || 'thiết bị'}`}
        open={Boolean(returnRequest)}
        onCancel={() => !returnSubmitting && setReturnRequest(null)}
        onOk={handleReturn}
        okText="Xác nhận đã nhận"
        okButtonProps={{ loading: returnSubmitting }}
        cancelText="Hủy"
      >
        {returnRequest && returnRequest.issued_accessories == null &&
          <div className="mb-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">Yêu cầu cũ chưa có biên bản phụ kiện. Hãy đối chiếu thủ công trước khi xác nhận.</div>}
        {returnRequest?.issued_accessories?.length > 0 && <div className="mb-5">
          <div className="mb-3 font-semibold">Kiểm kê phụ kiện nhận lại</div>
          {returnRequest.issued_accessories.map((item: any) => <div key={item.accessory_id} className="mb-3 flex items-center justify-between gap-4">
            <span>{item.name} <span className="text-slate-500">(đã cấp {item.quantity})</span></span>
            <InputNumber min={0} precision={0} value={returnQuantities[item.accessory_id]}
              onChange={(value) => setReturnQuantities(current => ({ ...current, [item.accessory_id]: value ?? 0 }))} />
          </div>)}
        </div>}
        <div className="mb-2 font-semibold">Ghi chú khi nhận lại</div>
        <Input.TextArea rows={3} value={returnNotes} onChange={event => setReturnNotes(event.target.value)} />
        {returnRequest?.issued_accessories?.some((item: any) => returnQuantities[item.accessory_id] < item.quantity) &&
          <div className="mt-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">Phụ kiện thiếu sẽ được trừ khỏi tổng tồn kho và ghi vào biên bản trả.</div>}
        {returnRequest?.issued_accessories?.some((item: any) => returnQuantities[item.accessory_id] > item.quantity) &&
          <div className="mt-3 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">Phụ kiện thừa sẽ được ghi nhận vào tồn kho; không tự chuyển thiết bị sang bảo trì.</div>}
      </Modal>

      {/* Reject Modal */}
      <Modal
        title={null}
        open={isRejectModalVisible}
        onCancel={() => setIsRejectModalVisible(false)}
        footer={null}
        width={500}
        closeIcon={<div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200 hover:text-slate-700 transition-colors"><CloseOutlined /></div>}
        className="font-sans modern-modal"
      >
        <div className="px-8 pt-8 pb-4">
          <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mb-4">
            <CloseOutlined className="text-xl text-red-500" />
          </div>
          <h3 className="text-2xl font-bold text-slate-800 m-0">Từ chối yêu cầu mượn</h3>
        </div>

        <div className="px-8 pb-8">
          <Form layout="vertical" form={form} requiredMark={false} onFinish={handleRejectSubmit}>
            {/* Request Info */}
            <div className="mb-6">
              <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 space-y-3 text-sm">
                <div className="flex justify-between items-center pb-2 border-b border-slate-200/50">
                  <span className="text-slate-500 font-medium">Mã yêu cầu</span>
                  <span className="font-bold text-slate-800 bg-slate-200 px-2 py-0.5 rounded text-xs">{selectedRequest?.id?.substring(0, 8).toUpperCase()}</span>
                </div>
                <div className="flex justify-between items-center pb-2 border-b border-slate-200/50">
                  <span className="text-slate-500 font-medium">Người mượn</span>
                  <span className="font-bold text-slate-800">{selectedRequest?.user?.name}</span>
                </div>
                <div className="flex justify-between items-center pb-2 border-b border-slate-200/50">
                  <span className="text-slate-500 font-medium">Thiết bị</span>
                  <span className="font-semibold text-slate-700">{selectedRequest?.deviceModel?.name}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-medium">Thời gian</span>
                  <span className="text-slate-700">{dayjs(selectedRequest?.borrow_date).format('DD/MM/YYYY')} - {dayjs(selectedRequest?.due_date).format('DD/MM/YYYY')}</span>
                </div>
              </div>
            </div>

            {/* Reason to borrow */}
            <div className="mb-6">
              <div className="text-sm font-bold text-slate-700 mb-2">Lý do mượn từ nhân viên:</div>
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-sm italic text-blue-800 shadow-sm">
                "{selectedRequest?.reason || 'Không có lý do'}"
              </div>
            </div>

            {/* Reason to reject */}
            <div className="mb-4">
              <Form.Item 
                name="rejectReason"
                label={<span className="font-semibold text-slate-700 text-sm">Lý do từ chối *</span>}
                rules={[{ required: true, message: 'Vui lòng nhập lý do từ chối' }]}
              >
                <Input.TextArea 
                  rows={4} 
                  placeholder="Nhập lý do từ chối"
                  className="rounded-xl border-slate-300 focus:border-red-400 hover:border-red-300 p-3 bg-white"
                />
              </Form.Item>
            </div>
          </Form>
        </div>
        
        {/* Modal Footer */}
        <div className="border-t border-slate-100 p-6 flex justify-end gap-3 bg-slate-50 rounded-b-2xl">
          <Button onClick={() => setIsRejectModalVisible(false)} className="rounded-xl font-semibold text-slate-600 px-6 h-10 border-slate-300 hover:bg-slate-100">
            Hủy bỏ
          </Button>
          <Button type="primary" danger onClick={() => form.submit()} className="rounded-xl shadow-md shadow-red-500/30 border-none font-semibold px-8 h-10 bg-red-500 hover:bg-red-600">
            Xác nhận từ chối
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

        .custom-radio-group .ant-radio-button-wrapper {
          border-radius: 0;
          height: 36px;
          line-height: 34px;
          padding: 0 16px;
          font-weight: 500;
          color: #64748b;
          background: #f8fafc;
          border-color: #e2e8f0;
        }
        .custom-radio-group .ant-radio-button-wrapper:first-child {
          border-top-left-radius: 8px;
          border-bottom-left-radius: 8px;
        }
        .custom-radio-group .ant-radio-button-wrapper:last-child {
          border-top-right-radius: 8px;
          border-bottom-right-radius: 8px;
        }
        .custom-radio-group .ant-radio-button-wrapper-checked {
          background: #059669 !important;
          border-color: #059669 !important;
          color: white !important;
          z-index: 1;
        }
        .custom-radio-group .ant-radio-button-wrapper:hover:not(.ant-radio-button-wrapper-checked) {
          color: #059669;
        }
        .custom-radio-group .ant-radio-button-wrapper-checked::before {
          background-color: transparent !important;
        }
      `}</style>
    </div>
  );
};
