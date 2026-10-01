import React, { useEffect, useState } from 'react';
import { Empty, Input, Pagination, Select, Spin } from 'antd';
import { AppstoreOutlined, ArrowRightOutlined, CheckCircleFilled, SearchOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import axiosClient from '../api/axiosClient';
import type { DeviceCategory, DeviceModel } from '../types';

export const DeviceList: React.FC = () => {
  const [devices, setDevices] = useState<DeviceModel[]>([]);
  const [categories, setCategories] = useState<DeviceCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState('all');
  const [status, setStatus] = useState('all');
  const navigate = useNavigate();

  const fetchCategories = async () => {
    try {
      const response = await axiosClient.get<any, DeviceCategory[] | { data: DeviceCategory[] }>('/categories');
      setCategories(Array.isArray(response) ? response : response.data || []);
    } catch { setCategories([]); }
  };

  const fetchDevices = async (nextPage = page, keyword = search, category = categoryId, availability = status) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(nextPage), limit: '12' });
      if (keyword) params.set('search', keyword);
      if (category !== 'all') params.set('category_id', category);
      if (availability !== 'all') params.set('status', availability);
      const response = await axiosClient.get<any, { data: DeviceModel[]; total: number }>(`/devices/models/catalog?${params}`);
      setDevices(Array.isArray(response.data) ? response.data : []);
      setTotal(response.total || 0);
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchCategories(); fetchDevices(1); }, []);
  const applyFilter = (nextSearch: string, nextCategory: string, nextStatus: string) => {
    setPage(1); setSearch(nextSearch); setCategoryId(nextCategory); setStatus(nextStatus);
    fetchDevices(1, nextSearch, nextCategory, nextStatus);
  };

  return <div className="space-y-7 pb-10">
    <section className="relative overflow-hidden rounded-[28px] bg-gradient-to-br from-[#064e3b] via-[#047857] to-[#0f766e] px-7 py-9 lg:px-10 lg:py-11 text-white shadow-2xl shadow-emerald-900/15">
      <div className="absolute -right-20 -top-24 w-80 h-80 rounded-full border-[50px] border-white/5" />
      <div className="absolute right-28 -bottom-28 w-64 h-64 rounded-full bg-emerald-300/10 blur-2xl" />
      <div className="relative max-w-3xl">
        <h1 className="m-0 text-3xl lg:text-4xl font-black tracking-tight">Tìm thiết bị phù hợp cho công việc</h1>
      </div>
    </section>

    <section className="employee-surface rounded-[24px] p-4 lg:p-5 -mt-11 relative z-10 mx-3 lg:mx-6">
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_220px_210px] gap-3">
        <Input size="large" allowClear value={search} prefix={<SearchOutlined className="text-emerald-600" />} placeholder="Tìm theo tên, hãng hoặc model..." onChange={(e) => setSearch(e.target.value)} onPressEnter={() => applyFilter(search, categoryId, status)} />
        <Select size="large" value={categoryId} onChange={(value) => applyFilter(search, value, status)} options={[{ value: 'all', label: 'Tất cả danh mục' }, ...categories.map((item) => ({ value: item.id, label: item.name }))]} />
        <Select size="large" value={status} onChange={(value) => applyFilter(search, categoryId, value)} options={[{ value: 'all', label: 'Mọi trạng thái' }, { value: 'Available', label: 'Đang sẵn sàng' }, { value: 'Borrowed', label: 'Tạm hết thiết bị' }]} />
      </div>
    </section>

    <div className="flex items-center justify-between px-1"><div><h2 className="m-0 text-xl font-extrabold text-slate-800">Danh mục thiết bị</h2><p className="m-0 mt-1 text-sm text-slate-400">Tìm thấy {total} model phù hợp</p></div></div>

    <Spin spinning={loading}>
      {!loading && devices.length === 0 ? <div className="employee-surface rounded-[24px] py-20"><Empty description="Không tìm thấy thiết bị phù hợp" /></div> :
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6">
        {devices.map((device) => {
          const available = device.available_count > 0;
          return <article key={device.id} onClick={() => navigate(`/devices/${device.id}`)} className="group employee-surface rounded-[24px] overflow-hidden cursor-pointer transition-all duration-300 hover:-translate-y-1.5 hover:shadow-[0_24px_60px_rgba(16,80,58,.14)] hover:border-emerald-200">
            <div className="h-56 bg-gradient-to-br from-emerald-50 to-slate-50 relative overflow-hidden flex items-center justify-center p-5">
              {device.image_url ? <img src={device.image_url} alt={device.name} className="w-full h-full object-contain transition-transform duration-500 group-hover:scale-105" /> : <AppstoreOutlined className="text-6xl text-emerald-200" />}
              <div className={`absolute top-4 left-4 rounded-full px-3 py-1.5 text-[11px] font-bold shadow-sm ${available ? 'bg-white text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                {available ? <><CheckCircleFilled className="mr-1.5" />Sẵn sàng</> : 'Tạm hết'}
              </div>
            </div>
            <div className="p-5">
              <div className="text-xs font-bold uppercase tracking-[.14em] text-emerald-600 mb-2">{device.brand || 'Thiết bị'}</div>
              <h3 className="m-0 text-lg font-extrabold text-slate-800 group-hover:text-emerald-700 transition-colors">{device.name}</h3>
              {device.model && <p className="mt-1 mb-5 text-sm text-slate-400">{device.model}</p>}
              <div className="flex items-center justify-between border-t border-slate-100 pt-4">
                <span className="text-sm text-slate-500">{available ? <><b className="text-emerald-700">Còn {device.available_count} máy</b></> : <b className="text-amber-700">Đã hết máy</b>}</span>
                <span className="w-9 h-9 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition-colors"><ArrowRightOutlined /></span>
              </div>
            </div>
          </article>;
        })}
      </div>}
    </Spin>

    {total > 12 && <div className="flex justify-center pt-4"><Pagination current={page} total={total} pageSize={12} showSizeChanger={false} onChange={(next) => { setPage(next); fetchDevices(next); }} /></div>}
  </div>;
};
