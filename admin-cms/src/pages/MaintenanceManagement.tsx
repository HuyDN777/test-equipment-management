import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button, DatePicker, Form, Input, InputNumber, Modal, Drawer, Descriptions, Select, Table, Tag, message } from 'antd';
import { PlusOutlined, SearchOutlined, SyncOutlined, EyeOutlined } from '@ant-design/icons';
import dayjs, { Dayjs } from 'dayjs';
import { useSearchParams } from 'react-router-dom';
import axiosClient from '../api/axiosClient';

type Status = 'Pending' | 'InProgress' | 'Completed';
type WorkKind = 'maintenance' | 'calibration';
type Device = { id: string; code: string; name: string; status: string };
type Vendor = { id: string; name: string };
type WorkRecord = {
  id: string;
  device_id: string;
  device?: Device;
  vendor?: Vendor | null;
  vendors_id?: string | null;
  status: Status;
  issue?: string;
  calibration_type?: string;
  planned_date?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  calibration_date?: string | null;
  next_due_date?: string | null;
  result?: 'Pass' | 'Fail' | null;
  cost?: number | null;
  notes?: string | null;
};
type Page<T> = { data: T[]; total: number };

const dateText = (value?: string | null) => value ? dayjs(value).format('DD/MM/YYYY') : '—';
const dateValue = (value?: Dayjs) => value?.format('YYYY-MM-DD');
const isPastDate = (value: Dayjs) => value.startOf('day').isBefore(dayjs().startOf('day'));

const statusLabel: Record<Status, string> = {
  Pending: 'Chờ thực hiện',
  InProgress: 'Đang thực hiện',
  Completed: 'Hoàn tất',
};

export function MaintenanceManagement() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');
  const calibrationIdParam = searchParams.get('calibrationId');
  const [kind, setKind] = useState<WorkKind>(tabParam === 'calibration' ? 'calibration' : 'maintenance');
  const [records, setRecords] = useState<WorkRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [devices, setDevices] = useState<Device[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState(calibrationIdParam ?? '');
  const [statusFilter, setStatusFilter] = useState<Status | 'all'>('all');
  const [createOpen, setCreateOpen] = useState(false);
  const [actionRecord, setActionRecord] = useState<WorkRecord | null>(null);
  const [detailRecord, setDetailRecord] = useState<WorkRecord | null>(null);
  const [saving, setSaving] = useState(false);
  const [createForm] = Form.useForm();
  const [actionForm] = Form.useForm();
  const result = Form.useWatch('result', actionForm);
  const calibrationDate = Form.useWatch('calibration_date', actionForm) as Dayjs | undefined;

  const isInvalidNextDueDate = (value: Dayjs) => {
    if (isPastDate(value)) return true;
    return calibrationDate ? !value.startOf('day').isAfter(calibrationDate.startOf('day')) : false;
  };

  useEffect(() => {
    setKind(tabParam === 'calibration' ? 'calibration' : 'maintenance');
    setSearch(calibrationIdParam ?? '');
  }, [tabParam, calibrationIdParam]);

  const changeTab = (next: WorkKind) => {
    setKind(next);
    setSearch('');
    setStatusFilter('all');
    setSearchParams(next === 'calibration' ? { tab: 'calibration' } : {});
  };

  const fetchRecords = useCallback(async (showLoader = true) => {
    if (showLoader) setLoading(true);
    try {
      const path = kind === 'maintenance' ? '/maintenance' : '/maintenance/calibrations';
      const response = await axiosClient.get<any, Page<WorkRecord>>(`${path}?limit=200`);
      const items = response.data ?? [];
      if (kind === 'calibration' && calibrationIdParam && !items.some(item => item.id === calibrationIdParam)) {
        try {
          const record = await axiosClient.get<any, WorkRecord>(`/maintenance/calibrations/${calibrationIdParam}`);
          items.unshift(record);
        } catch {
          if (showLoader) message.warning('Phiếu hiệu chuẩn trong thông báo không còn tồn tại');
        }
      }
      setRecords(items);
      setTotal(response.total ?? 0);
    } catch {
      if (showLoader) message.error('Không tải được danh sách phiếu');
    } finally {
      if (showLoader) setLoading(false);
    }
  }, [kind, calibrationIdParam]);

  useEffect(() => {
    void fetchRecords();
    const refresh = () => void fetchRecords(false);
    const timer = window.setInterval(refresh, 10_000);
    window.addEventListener('app:data-refresh', refresh);
    window.addEventListener('focus', refresh);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('app:data-refresh', refresh);
      window.removeEventListener('focus', refresh);
    };
  }, [fetchRecords]);

  useEffect(() => {
    const fetchOptions = async () => {
      try {
        const [deviceResponse, vendorResponse] = await Promise.all([
          axiosClient.get<any, Page<Device>>('/devices?limit=500'),
          axiosClient.get<any, Page<Vendor>>('/vendors?limit=500'),
        ]);
        setDevices(deviceResponse.data ?? []);
        setVendors(vendorResponse.data ?? []);
      } catch {
        message.error('Không tải được danh sách thiết bị hoặc đối tác');
      }
    };
    void fetchOptions();
  }, []);

  const filtered = useMemo(() => records.filter((record) => {
    const matchesStatus = statusFilter === 'all' || record.status === statusFilter;
    const haystack = [record.id, record.device?.name, record.device?.code, record.vendor?.name, record.issue, record.calibration_type]
      .filter(Boolean).join(' ').toLowerCase();
    return matchesStatus && haystack.includes(search.trim().toLowerCase());
  }), [records, search, statusFilter]);

  const submitCreate = async (values: any) => {
    setSaving(true);
    try {
      if (kind === 'maintenance') {
        await axiosClient.post('/maintenance', {
          device_id: values.device_id,
          vendors_id: values.vendors_id,
          issue: values.issue,
          planned_date: dateValue(values.planned_date),
          notes: values.notes,
        });
      } else {
        await axiosClient.post('/maintenance/calibrations', {
          device_id: values.device_id,
          vendors_id: values.vendors_id,
          calibration_type: values.calibration_type,
          planned_date: dateValue(values.planned_date),
          notes: values.notes,
        });
      }
      message.success('Đã tạo phiếu chờ thực hiện');
      setCreateOpen(false);
      createForm.resetFields();
      await fetchRecords();
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Không thể tạo phiếu');
    } finally {
      setSaving(false);
    }
  };

  const openAction = (record: WorkRecord) => {
    actionForm.resetFields();
    actionForm.setFieldsValue({
      vendors_id: record.vendors_id ?? undefined,
      start_date: dayjs(),
      end_date: dayjs(),
      calibration_date: dayjs(),
      cost: record.cost ?? undefined,
      notes: record.notes ?? undefined,
    });
    setActionRecord(record);
  };

  const submitAction = async (values: any) => {
    if (!actionRecord) return;
    setSaving(true);
    try {
      const starting = actionRecord.status === 'Pending';
      if (kind === 'maintenance') {
        await axiosClient.patch(`/maintenance/${actionRecord.id}`, starting
          ? { status: 'InProgress', start_date: dateValue(values.start_date), vendors_id: values.vendors_id, notes: values.notes }
          : { status: 'Completed', end_date: dateValue(values.end_date), cost: values.cost, notes: values.notes });
      } else {
        await axiosClient.patch(`/maintenance/calibrations/${actionRecord.id}`, starting
          ? { status: 'InProgress', start_date: dateValue(values.start_date), notes: values.notes }
          : {
            status: 'Completed',
            calibration_date: dateValue(values.calibration_date),
            result: values.result,
            next_due_date: values.result === 'Pass' ? dateValue(values.next_due_date) : undefined,
            notes: values.notes,
          });
      }
      message.success(starting ? 'Đã bắt đầu thực hiện' : 'Đã ghi nhận kết quả');
      setActionRecord(null);
      await fetchRecords();
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Không thể cập nhật phiếu');
    } finally {
      setSaving(false);
    }
  };

  const columns: any[] = [
    { title: 'Thiết bị', key: 'device', width: 200, render: (_: unknown, row: WorkRecord) => (
      <div><strong className="text-slate-800">{row.device?.name || 'Thiết bị đã xóa'}</strong><div className="text-xs text-slate-500">{row.device?.code}</div></div>
    ) },
    { title: kind === 'maintenance' ? 'Sự cố / công việc' : 'Loại hiệu chuẩn', key: 'task', width: 240, render: (_: unknown, row: WorkRecord) => row.issue || row.calibration_type },
    { title: 'Đối tác', key: 'vendor', width: 170, render: (_: unknown, row: WorkRecord) => row.vendor?.name || 'Chưa chọn' },
    { title: 'Dự kiến', dataIndex: 'planned_date', width: 120, render: dateText },
    { title: 'Bắt đầu', dataIndex: 'start_date', width: 120, render: dateText },
    { title: kind === 'maintenance' ? 'Hoàn tất' : 'Thực hiện', dataIndex: kind === 'maintenance' ? 'end_date' : 'calibration_date', width: 120, render: dateText },
    ...(kind === 'calibration' ? [
      { title: 'Kết quả', dataIndex: 'result', width: 110, render: (value: string | null) => value === 'Pass' ? <Tag color="green">Đạt</Tag> : value === 'Fail' ? <Tag color="red">Không đạt</Tag> : '—' },
      { title: 'Hạn kế tiếp', dataIndex: 'next_due_date', width: 120, render: dateText },
    ] : []),
    { title: 'Trạng thái', dataIndex: 'status', width: 145, render: (value: Status) => <Tag color={value === 'Completed' ? 'green' : value === 'InProgress' ? 'blue' : 'gold'}>{statusLabel[value]}</Tag> },
    { title: 'Thao tác', key: 'actions', width: 190, render: (_: unknown, row: WorkRecord) => <div className="flex gap-2">
      <Button type="link" icon={<EyeOutlined />} className="!px-0" onClick={() => setDetailRecord(row)}>Xem</Button>
      {row.status !== 'Completed' && <Button type="link" className="!text-emerald-700 !px-0" onClick={() => openAction(row)}>
        {row.status === 'Pending' ? 'Bắt đầu' : 'Ghi kết quả'}
      </Button>}
    </div> },
  ];

  return (
    <div className="mx-auto w-full max-w-[1500px] space-y-6 pb-12">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-1 text-sm font-semibold uppercase tracking-widest text-emerald-700">Quản lý kỹ thuật</p>
          <h1 className="m-0 text-3xl font-bold text-slate-900">Bảo trì & hiệu chuẩn</h1>
          <p className="mb-0 mt-2 text-slate-500">Theo dõi phiếu, đơn vị thực hiện và kết quả thực tế.</p>
        </div>
        <Button type="primary" icon={<PlusOutlined />} className="!h-11 !rounded-xl !bg-emerald-700" onClick={() => { createForm.resetFields(); setCreateOpen(true); }}>
          Tạo phiếu mới
        </Button>
      </div>

      <div className="rounded-2xl border border-emerald-100 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex rounded-xl bg-emerald-50 p-1">
            <Button type="text" className={kind === 'maintenance' ? '!bg-white !text-emerald-800 !shadow-sm' : ''} onClick={() => changeTab('maintenance')}>Bảo trì</Button>
            <Button type="text" className={kind === 'calibration' ? '!bg-white !text-emerald-800 !shadow-sm' : ''} onClick={() => changeTab('calibration')}>Hiệu chuẩn</Button>
          </div>
          <Input prefix={<SearchOutlined />} placeholder="Tìm thiết bị, phiếu, đối tác..." value={search} onChange={(event) => setSearch(event.target.value)} className="!h-10 min-w-[220px] max-w-md flex-1" allowClear />
          <Select value={statusFilter} onChange={setStatusFilter} className="w-44" options={[
            { value: 'all', label: 'Mọi trạng thái' },
            ...Object.entries(statusLabel).map(([value, label]) => ({ value, label })),
          ]} />
          <Button icon={<SyncOutlined />} onClick={() => void fetchRecords()}>Làm mới</Button>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-emerald-100 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h2 className="m-0 text-lg font-bold text-slate-800">{kind === 'maintenance' ? 'Phiếu bảo trì' : 'Phiếu hiệu chuẩn'}</h2>
          <span className="text-sm text-slate-500">{filtered.length} / {total} phiếu</span>
        </div>
        <Table columns={columns} dataSource={filtered} rowKey="id" loading={loading} scroll={{ x: 1100 }} pagination={{ pageSize: 10, className: '!px-4' }} />
      </div>

      <Drawer title={`Chi tiết phiếu ${kind === 'maintenance' ? 'bảo trì' : 'hiệu chuẩn'}`} open={!!detailRecord} onClose={() => setDetailRecord(null)} width={620}>
        {detailRecord && <Descriptions bordered column={1} size="small">
          <Descriptions.Item label="Mã phiếu">{detailRecord.id}</Descriptions.Item>
          <Descriptions.Item label="Thiết bị">{detailRecord.device?.name || '—'} · {detailRecord.device?.code || '—'}</Descriptions.Item>
          <Descriptions.Item label="Đối tác">{detailRecord.vendor?.name || 'Chưa chọn'}</Descriptions.Item>
          <Descriptions.Item label="Nội dung">{detailRecord.issue || detailRecord.calibration_type || '—'}</Descriptions.Item>
          <Descriptions.Item label="Trạng thái">{statusLabel[detailRecord.status]}</Descriptions.Item>
          <Descriptions.Item label="Dự kiến">{dateText(detailRecord.planned_date)}</Descriptions.Item>
          <Descriptions.Item label="Bắt đầu">{dateText(detailRecord.start_date)}</Descriptions.Item>
          <Descriptions.Item label="Hoàn tất / thực hiện">{dateText(detailRecord.end_date || detailRecord.calibration_date)}</Descriptions.Item>
          {kind === 'calibration' && <>
            <Descriptions.Item label="Kết quả">{detailRecord.result === 'Pass' ? 'Đạt' : detailRecord.result === 'Fail' ? 'Không đạt' : '—'}</Descriptions.Item>
            <Descriptions.Item label="Hạn tiếp theo">{dateText(detailRecord.next_due_date)}</Descriptions.Item>
          </>}
          <Descriptions.Item label="Chi phí">{detailRecord.cost != null ? detailRecord.cost.toLocaleString('vi-VN') : '—'}</Descriptions.Item>
          <Descriptions.Item label="Ghi chú">{detailRecord.notes || '—'}</Descriptions.Item>
        </Descriptions>}
      </Drawer>

      <Modal title={`Tạo phiếu ${kind === 'maintenance' ? 'bảo trì' : 'hiệu chuẩn'}`} open={createOpen} onCancel={() => setCreateOpen(false)} onOk={() => createForm.submit()} okText="Tạo phiếu chờ" okButtonProps={{ loading: saving, className: '!bg-emerald-700' }} cancelText="Hủy" destroyOnHidden>
        <Form form={createForm} layout="vertical" onFinish={submitCreate} className="mt-5">
          <Form.Item name="device_id" label="Thiết bị" rules={[{ required: true, message: 'Chọn thiết bị' }]}>
            <Select showSearch optionFilterProp="label" placeholder="Chọn thiết bị" options={devices.map((device) => ({ value: device.id, label: `${device.name} (${device.code})` }))} />
          </Form.Item>
          <Form.Item name="vendors_id" label="Đối tác thực hiện" rules={kind === 'calibration' ? [{ required: true, message: 'Chọn đối tác hiệu chuẩn' }] : []}>
            <Select showSearch allowClear optionFilterProp="label" placeholder="Chọn đối tác" options={vendors.map((vendor) => ({ value: vendor.id, label: vendor.name }))} />
          </Form.Item>
          {kind === 'maintenance' ? (
            <Form.Item name="issue" label="Sự cố / công việc" rules={[{ required: true, message: 'Nhập nội dung công việc' }]}><Input.TextArea rows={3} /></Form.Item>
          ) : (
            <Form.Item name="calibration_type" label="Loại hiệu chuẩn" rules={[{ required: true, message: 'Nhập loại hiệu chuẩn' }]}><Input /></Form.Item>
          )}
          <Form.Item name="planned_date" label="Ngày dự kiến"><DatePicker className="w-full" format="DD/MM/YYYY" disabledDate={isPastDate} /></Form.Item>
          <Form.Item name="notes" label="Ghi chú"><Input.TextArea rows={2} /></Form.Item>
          <p className="mb-0 text-xs text-slate-500">Phiếu mới ở trạng thái chờ; thiết bị chỉ bị khóa khi bắt đầu thực hiện.</p>
        </Form>
      </Modal>

      <Modal title={`${actionRecord?.status === 'Pending' ? 'Bắt đầu' : 'Ghi kết quả'} ${kind === 'maintenance' ? 'bảo trì' : 'hiệu chuẩn'}`} open={!!actionRecord} onCancel={() => setActionRecord(null)} onOk={() => actionForm.submit()} okText="Lưu" okButtonProps={{ loading: saving, className: '!bg-emerald-700' }} cancelText="Hủy" destroyOnHidden>
        {actionRecord && <Form form={actionForm} layout="vertical" onFinish={submitAction} className="mt-5">
          <p className="text-sm text-slate-600">{actionRecord.device?.name} · {actionRecord.device?.code}</p>
          {actionRecord.status === 'Pending' ? <>
            {kind === 'maintenance' && <Form.Item name="vendors_id" label="Đối tác thực hiện"><Select allowClear showSearch optionFilterProp="label" placeholder="Chọn đối tác nếu gửi bên ngoài" options={vendors.map((vendor) => ({ value: vendor.id, label: vendor.name }))} /></Form.Item>}
            <Form.Item name="start_date" label="Ngày bắt đầu thực tế" rules={[{ required: true, message: 'Chọn ngày bắt đầu' }]}><DatePicker className="w-full" format="DD/MM/YYYY" /></Form.Item>
            <p className="text-xs text-amber-700">Khi bắt đầu, thiết bị sẽ tạm ngừng cho mượn.</p>
          </> : kind === 'maintenance' ? (
            <>
              <Form.Item name="end_date" label="Ngày hoàn tất thực tế" rules={[{ required: true, message: 'Chọn ngày hoàn tất' }]}><DatePicker className="w-full" format="DD/MM/YYYY" /></Form.Item>
              <Form.Item name="cost" label="Chi phí (nếu có)"><InputNumber min={0} className="w-full" /></Form.Item>
              <p className="text-xs text-slate-500">Nếu lần hiệu chuẩn gần nhất không đạt, máy vẫn bị khóa cho tới khi hiệu chuẩn lại đạt.</p>
            </>
          ) : <>
            <Form.Item name="calibration_date" label="Ngày hiệu chuẩn thực tế" rules={[{ required: true, message: 'Chọn ngày thực hiện' }]}><DatePicker className="w-full" format="DD/MM/YYYY" /></Form.Item>
            <Form.Item name="result" label="Kết quả" rules={[{ required: true, message: 'Chọn kết quả' }]}><Select placeholder="Chọn sau khi nhận kết quả" options={[{ value: 'Pass', label: 'Đạt' }, { value: 'Fail', label: 'Không đạt' }]} /></Form.Item>
            {result === 'Pass' && <Form.Item name="next_due_date" label="Hạn hiệu chuẩn tiếp theo" rules={[{ required: true, message: 'Nhập hạn tiếp theo' }]}><DatePicker className="w-full" format="DD/MM/YYYY" disabledDate={isInvalidNextDueDate} /></Form.Item>}
            {result === 'Fail' && <p className="text-xs text-red-700">Thiết bị sẽ tiếp tục bị khóa và hệ thống tạo phiếu xử lý.</p>}
          </>}
          <Form.Item name="notes" label="Ghi chú"><Input.TextArea rows={3} /></Form.Item>
        </Form>}
      </Modal>
    </div>
  );
}
