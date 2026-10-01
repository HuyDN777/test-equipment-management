import React, { useState, useEffect } from 'react';
import { Button, Empty, Form, Input, message, Modal, Pagination, Spin } from 'antd';
import { AppstoreOutlined, CalendarOutlined, CheckCircleOutlined, ClockCircleOutlined, SearchOutlined, WarningOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import axiosClient from '../api/axiosClient';
import type { BorrowRequest } from '../types';
import { useLocation } from 'react-router-dom';

const statusStyle: Record<BorrowRequest['status'], { label: string; className: string }> = {
  Pending: { label: 'Chờ duyệt', className: 'bg-amber-50 text-amber-700 border-amber-200' },
  Approved: { label: 'Đang mượn', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  ReturnPending: { label: 'Chờ bàn giao', className: 'bg-orange-50 text-orange-700 border-orange-200' },
  Rejected: { label: 'Đã từ chối', className: 'bg-rose-50 text-rose-700 border-rose-200' },
  Returned: { label: 'Đã trả', className: 'bg-slate-100 text-slate-600 border-slate-200' },
  Cancelled: { label: 'Đã hủy', className: 'bg-slate-100 text-slate-500 border-slate-200' },
};

const filterOptions = [
  { value: 'all', label: 'Tất cả' },
  { value: 'Pending', label: 'Chờ duyệt' },
  { value: 'Approved', label: 'Đang mượn' },
  { value: 'ReturnPending', label: 'Chờ bàn giao' },
  { value: 'Returned', label: 'Đã trả' },
  { value: 'Rejected', label: 'Từ chối' },
  { value: 'Cancelled', label: 'Đã hủy' },
];

const requestedAccessoryLabel = (request: BorrowRequest) =>
  request.requested_accessories?.map(item => typeof item === 'string'
    ? `${item} ×1` : `${item.name} ×${item.quantity}`).join(', ');

export const MyRequests: React.FC = () => {
  const location = useLocation();
  const [requests, setRequests] = useState<BorrowRequest[]>([]);
  const [filteredRequests, setFilteredRequests] = useState<BorrowRequest[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const [isReportModalVisible, setIsReportModalVisible] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<BorrowRequest | null>(null);
  const [reporting, setReporting] = useState(false);
  const [form] = Form.useForm();

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const response = await axiosClient.get<any, { data: BorrowRequest[] }>('/borrow-requests/me?limit=100');
      const sorted = response.data.sort((a, b) => dayjs(b.borrow_date).valueOf() - dayjs(a.borrow_date).valueOf());
      setRequests(sorted);
      setPage(1);
      applyFilters(sorted, filter, search);
    } catch (error) {
      console.error('Failed to fetch requests', error);
      message.error('Không thể tải lịch sử mượn thiết bị');
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = (data: BorrowRequest[], currentFilter: string, currentSearch: string) => {
    let result = data;
    if (currentFilter !== 'all') {
      result = result.filter(r => r.status === currentFilter);
    }
    if (currentSearch) {
      const lowerSearch = currentSearch.toLowerCase();
      result = result.filter(r => 
        r.deviceModel?.name?.toLowerCase().includes(lowerSearch) || 
        r.reason?.toLowerCase().includes(lowerSearch)
      );
    }
    setFilteredRequests(result);
  };

  useEffect(() => {
    void fetchRequests();
  }, [location.key]);

  const handleFilterChange = (val: string) => {
    setFilter(val);
    setPage(1);
    applyFilters(requests, val, search);
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearch(val);
    setPage(1);
    applyFilters(requests, filter, val);
  };

  const showReportModal = (record: BorrowRequest) => {
    setSelectedRequest(record);
    form.resetFields();
    setIsReportModalVisible(true);
  };

  const handleCancel = async (id: string) => {
    try {
      await axiosClient.patch(`/borrow-requests/${id}/cancel`);
      message.success('Đã hủy yêu cầu');
      fetchRequests();
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Không thể hủy yêu cầu');
    }
  };

  const handleReportIssue = async (values: any) => {
    if (!selectedRequest?.device?.id) return;
    
    setReporting(true);
    try {
      await axiosClient.post(`/devices/${selectedRequest.device.id}/report-issue`, {
        issue: values.issue,
        notes: values.notes,
      });
      message.success('Đã báo lỗi. Vui lòng bàn giao thiết bị để Admin xác nhận tiếp nhận.');
      setIsReportModalVisible(false);
      fetchRequests(); // Refresh requests to reflect status changes if any
    } catch (error: any) {
      console.error(error);
      message.error(error.response?.data?.message || 'Không thể báo lỗi thiết bị.');
    } finally {
      setReporting(false);
    }
  };

  // Calculate stats
  const activeCount = requests.filter(r => r.status === 'Approved').length;
  const issueCount = requests.filter(r => r.status === 'ReturnPending').length;
  const pendingCount = requests.filter(r => r.status === 'Pending').length;

  return (
    <div className="space-y-7 pb-12">
      <section className="relative overflow-hidden rounded-[28px] bg-gradient-to-br from-[#064e3b] via-[#047857] to-[#0f766e] px-7 py-9 text-white shadow-2xl shadow-emerald-900/15 lg:px-10 lg:py-11">
        <div className="absolute -right-20 -top-24 h-80 w-80 rounded-full border-[50px] border-white/5" />
        <div className="absolute right-24 -bottom-28 h-64 w-64 rounded-full bg-emerald-300/10 blur-2xl" />
        <div className="relative">
          <h1 className="m-0 text-3xl font-black tracking-tight lg:text-4xl">Yêu cầu của tôi</h1>
          <p className="mb-0 mt-2 text-sm text-emerald-50/85">Theo dõi yêu cầu mượn và bàn giao thiết bị</p>
        </div>
      </section>

      <section className="relative z-10 -mt-12 grid grid-cols-1 gap-3 px-3 sm:grid-cols-3 lg:gap-5 lg:px-6" aria-label="Thống kê yêu cầu">
        <div className="employee-surface flex items-center gap-4 rounded-[22px] p-5">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-xl text-emerald-700"><CheckCircleOutlined /></span>
          <div><div className="text-2xl font-extrabold text-slate-800">{activeCount}</div><div className="text-sm text-slate-500">Đang mượn</div></div>
        </div>
        <div className="employee-surface flex items-center gap-4 rounded-[22px] p-5">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 text-xl text-amber-700"><ClockCircleOutlined /></span>
          <div><div className="text-2xl font-extrabold text-slate-800">{pendingCount}</div><div className="text-sm text-slate-500">Chờ duyệt</div></div>
        </div>
        <div className="employee-surface flex items-center gap-4 rounded-[22px] p-5">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-100 text-xl text-orange-700"><WarningOutlined /></span>
          <div><div className="text-2xl font-extrabold text-slate-800">{issueCount}</div><div className="text-sm text-slate-500">Chờ bàn giao</div></div>
        </div>
      </section>

      <section className="employee-surface rounded-[24px] p-4 lg:p-5" aria-label="Tìm và lọc yêu cầu">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center">
          <Input
            size="large"
            allowClear
            value={search}
            placeholder="Tìm thiết bị hoặc lý do mượn..."
            prefix={<SearchOutlined className="text-emerald-600" />}
            onChange={handleSearch}
            className="w-full xl:max-w-sm"
          />
          <div className="min-w-0 flex-1 overflow-x-auto pb-1">
            <div className="flex w-max gap-2">
              {filterOptions.map(option => <button
                key={option.value}
                type="button"
                aria-pressed={filter === option.value}
                onClick={() => handleFilterChange(option.value)}
                className={`rounded-full border px-4 py-2 text-sm font-semibold transition-colors ${filter === option.value
                  ? 'border-emerald-700 bg-emerald-700 text-white shadow-sm'
                  : 'border-emerald-100 bg-white text-slate-600 hover:border-emerald-300 hover:text-emerald-700'}`}
              >{option.label}</button>)}
            </div>
          </div>
        </div>
      </section>

      <section aria-label="Danh sách yêu cầu">
        <div className="mb-4 flex items-end justify-between gap-3 px-1">
          <div><h2 className="m-0 text-xl font-extrabold text-slate-800">Danh sách yêu cầu</h2><p className="mb-0 mt-1 text-sm text-slate-500">{filteredRequests.length} yêu cầu phù hợp</p></div>
        </div>
        <Spin spinning={loading}>
          {!loading && filteredRequests.length === 0 ? <div className="employee-surface rounded-[24px] py-16"><Empty description="Chưa có yêu cầu phù hợp" /></div> :
            <div className="grid min-h-[180px] grid-cols-1 gap-5 xl:grid-cols-2">
              {filteredRequests.slice((page - 1) * 8, page * 8).map(record => <article key={record.id} className="employee-surface flex h-full flex-col rounded-[24px] p-5 transition-shadow hover:shadow-[0_24px_60px_rgba(16,80,58,.12)] sm:p-6">
                <div className="flex items-start justify-between gap-3">
                  <span className="font-mono text-xs font-semibold tracking-wide text-slate-400">YC-{record.id.slice(0, 8).toUpperCase()}</span>
                  <span className={`shrink-0 rounded-full border px-3 py-1 text-xs font-bold ${statusStyle[record.status].className}`}>{statusStyle[record.status].label}</span>
                </div>
                <div className="mt-4 flex items-center gap-4">
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-emerald-50 text-2xl text-emerald-300">
                    {record.deviceModel?.image_url ? <img src={record.deviceModel.image_url} alt="" className="h-full w-full object-contain" /> : <AppstoreOutlined />}
                  </div>
                  <div className="min-w-0"><h3 className="m-0 truncate text-lg font-extrabold text-slate-800">{record.deviceModel?.name || 'Thiết bị'}</h3>{record.reason && <p className="mb-0 mt-1 line-clamp-2 text-sm text-slate-500">{record.reason}</p>}</div>
                </div>
                <div className="mt-5 grid grid-cols-2 gap-3">
                  <div className="rounded-2xl bg-[#f4faf7] px-4 py-3"><div className="mb-1 text-xs font-semibold text-slate-500"><CalendarOutlined className="mr-1.5" />Ngày mượn</div><div className="text-sm font-bold text-slate-800">{dayjs(record.borrow_date).format('DD/MM/YYYY')}</div></div>
                  <div className="rounded-2xl bg-[#f4faf7] px-4 py-3"><div className="mb-1 text-xs font-semibold text-slate-500"><CalendarOutlined className="mr-1.5" />{record.return_date ? 'Đã trả ngày' : 'Dự kiến trả'}</div><div className="text-sm font-bold text-slate-800">{dayjs(record.return_date || record.due_date).format('DD/MM/YYYY')}</div></div>
                </div>
                {(record.requested_accessories?.length || record.issued_accessories?.length) ? <div className="mt-4 space-y-2 text-sm">
                  {record.requested_accessories?.length ? <div className="flex flex-wrap gap-2"><span className="font-semibold text-slate-500">Yêu cầu:</span><span className="text-slate-700">{requestedAccessoryLabel(record)}</span></div> : null}
                  {record.issued_accessories?.length ? <div className="flex flex-wrap gap-2"><span className="font-semibold text-slate-500">Đã giao:</span><span className="font-semibold text-emerald-700">{record.issued_accessories.map(item => `${item.name} ×${item.quantity}`).join(', ')}</span></div> : null}
                </div> : null}
                {record.rejection_reason && <div className="mt-4 rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">Lý do từ chối: {record.rejection_reason}</div>}
                {(record.status === 'Pending' || (record.status === 'Approved' && record.device?.status === 'Borrowed')) && <div className="mt-auto flex justify-end border-t border-slate-100 pt-4">
                  {record.status === 'Pending' ? <Button onClick={() => handleCancel(record.id)} className="!h-9 !rounded-xl">Hủy yêu cầu</Button>
                    : <Button icon={<WarningOutlined />} onClick={() => showReportModal(record)} className="!h-9 !rounded-xl !border-amber-200 !bg-amber-50 !font-semibold !text-amber-700">Báo lỗi thiết bị</Button>}
                </div>}
              </article>)}
            </div>}
        </Spin>
        {filteredRequests.length > 8 && <div className="flex justify-center pt-7"><Pagination current={page} total={filteredRequests.length} pageSize={8} showSizeChanger={false} onChange={setPage} /></div>}
      </section>

      <Modal
        title="Báo lỗi thiết bị"
        open={isReportModalVisible}
        onCancel={() => !reporting && setIsReportModalVisible(false)}
        footer={null}
        destroyOnClose
        width={560}
        className="employee-request-modal"
      >
        <div className="mt-5 rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
          <div className="text-xs font-semibold text-emerald-700">Thiết bị đang mượn</div>
          <div className="mt-1 font-bold text-slate-800">{selectedRequest?.deviceModel?.name || selectedRequest?.device?.name}</div>
        </div>
        <div className="mt-5">
          <Form
            form={form}
            layout="vertical"
            onFinish={handleReportIssue}
            requiredMark={false}
          >
            <Form.Item
              name="issue"
              label={<span className="font-semibold text-slate-700">Mô tả lỗi</span>}
              rules={[{ required: true, message: 'Vui lòng nhập mô tả lỗi' }]}
            >
              <Input.TextArea
                rows={4}
                className="!rounded-xl"
                placeholder="Mô tả tình trạng thiết bị..."
              />
            </Form.Item>

            <div className="mb-6 flex gap-3 rounded-2xl border border-amber-100 bg-amber-50 p-4 text-sm text-amber-800">
              <WarningOutlined className="mt-0.5" />
              <span>Sau khi báo lỗi, hãy bàn giao thiết bị để quản trị viên kiểm tra.</span>
            </div>

            <div className="flex justify-end gap-3 border-t border-slate-100 pt-5">
              <Button
                onClick={() => setIsReportModalVisible(false)}
                disabled={reporting}
                className="!h-10 !rounded-xl"
              >
                Hủy
              </Button>
              <Button
                type="primary"
                htmlType="submit"
                loading={reporting}
                className="!h-10 !rounded-xl"
              >
                Gửi báo cáo
              </Button>
            </div>
          </Form>
        </div>
      </Modal>
    </div>
  );
};
