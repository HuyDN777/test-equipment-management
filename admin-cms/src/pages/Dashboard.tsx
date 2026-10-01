import React, { useEffect, useMemo, useState } from 'react';
import { Spin, Table, Tag, message } from 'antd';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import dayjs from 'dayjs';
import axiosClient from '../api/axiosClient';

export const Dashboard: React.FC = () => {
  const [devices, setDevices] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      axiosClient.get('/devices?limit=100'),
      axiosClient.get('/borrow-requests?limit=100'),
    ]).then(([deviceResponse, requestResponse]) => {
      setDevices((deviceResponse as any).data || []);
      setRequests((requestResponse as any).data || []);
    }).catch(() => message.error('Không thể tải dữ liệu tổng quan'))
      .finally(() => setLoading(false));
  }, []);

  const chartData = useMemo(() => {
    const months = Array.from({ length: 6 }, (_, index) => dayjs().subtract(5 - index, 'month'));
    return months.map((month) => ({
      name: month.format('MM/YYYY'),
      requests: requests.filter((request) => dayjs(request.created_at).format('YYYY-MM') === month.format('YYYY-MM')).length,
      returned: requests.filter((request) => request.status === 'Returned' && dayjs(request.return_date).format('YYYY-MM') === month.format('YYYY-MM')).length,
    }));
  }, [requests]);

  const stats = [
    { label: 'Tổng asset', value: devices.length, color: 'text-blue-600' },
    { label: 'Có sẵn', value: devices.filter((item) => item.status === 'Available').length, color: 'text-emerald-600' },
    { label: 'Đang mượn', value: devices.filter((item) => item.status === 'Borrowed').length, color: 'text-indigo-600' },
    { label: 'Xử lý kỹ thuật', value: devices.filter((item) => item.status === 'Maintenance').length, color: 'text-orange-600' },
    { label: 'Chờ duyệt', value: requests.filter((item) => item.status === 'Pending').length, color: 'text-amber-600' },
  ];

  return (
    <Spin spinning={loading}>
      <div className="space-y-7">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-800 m-0">Tổng quan hệ thống</h1>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          {stats.map((stat) => (
            <div key={stat.label} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
              <div className={`text-3xl font-black ${stat.color}`}>{stat.value}</div>
              <div className="text-xs uppercase tracking-wider text-slate-500 mt-2">{stat.label}</div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
            <h2 className="font-bold text-slate-800 mb-5">Hoạt động 6 tháng gần nhất</h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="requests" name="Yêu cầu" fill="#3b82f6" />
                <Bar dataKey="returned" name="Đã trả" fill="#10b981" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
            <h2 className="font-bold text-slate-800 mb-5">Yêu cầu gần đây</h2>
            <Table
              size="small"
              pagination={false}
              rowKey="id"
              dataSource={requests.slice(0, 6)}
              columns={[
                { title: 'Model', render: (_, row) => row.deviceModel?.name || '-' },
                { title: 'Người mượn', render: (_, row) => row.user?.name || '-' },
                { title: 'Trạng thái', dataIndex: 'status', render: (status) => <Tag>{status}</Tag> },
              ]}
            />
          </div>
        </div>
      </div>
    </Spin>
  );
};
