import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Badge, Button, Empty, Popover, Spin } from 'antd';
import { BellOutlined, CheckCircleFilled, CloseCircleFilled, InfoCircleFilled } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import axiosClient from '../api/axiosClient';

type NotificationItem = {
  id: string;
  title: string;
  message: string;
  type: string;
  payload: { link?: string } | null;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
};

const timeAgo = (value: string) => {
  const minutes = Math.floor((Date.now() - new Date(value).getTime()) / 60_000);
  if (minutes < 1) return 'Vừa xong';
  if (minutes < 60) return `${minutes} phút trước`;
  if (minutes < 1_440) return `${Math.floor(minutes / 60)} giờ trước`;
  if (minutes < 10_080) return `${Math.floor(minutes / 1_440)} ngày trước`;
  return new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short' }).format(new Date(value));
};

const iconFor = (type: string) => {
  if (['BorrowRequestRejected', 'BorrowRequestCancelled'].includes(type)) {
    return <CloseCircleFilled className="text-rose-500" />;
  }
  if (['BorrowRequestApproved', 'BorrowRequestReturned'].includes(type)) {
    return <CheckCircleFilled className="text-emerald-500" />;
  }
  return <InfoCircleFilled className="text-teal-500" />;
};

export const NotificationBell: React.FC = () => {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const lastUnreadCount = useRef<number | null>(null);

  const syncUnreadCount = useCallback((nextCount: number) => {
    const previousCount = lastUnreadCount.current;
    lastUnreadCount.current = nextCount;
    setUnreadCount(nextCount);
    if (previousCount !== null && nextCount > previousCount) {
      window.dispatchEvent(new CustomEvent('app:data-refresh', {
        detail: { source: 'notification', unreadCount: nextCount },
      }));
    }
  }, []);

  const load = useCallback(async (withLoading = false) => {
    if (withLoading) setLoading(true);
    try {
      const response = await axiosClient.get<any, { data: NotificationItem[]; unreadCount: number }>('/notifications?limit=20');
      setItems(response.data || []);
      syncUnreadCount(response.unreadCount || 0);
    } catch {
      // Authentication errors are handled by the Axios interceptor.
    } finally {
      if (withLoading) setLoading(false);
    }
  }, [syncUnreadCount]);

  const loadUnreadCount = useCallback(async () => {
    try {
      const response = await axiosClient.get<any, { count: number }>('/notifications/unread-count');
      syncUnreadCount(response.count || 0);
    } catch {
      // Authentication errors are handled by the Axios interceptor.
    }
  }, [syncUnreadCount]);

  useEffect(() => {
    const refreshWhenVisible = () => {
      if (document.visibilityState === 'visible') void loadUnreadCount();
    };
    void loadUnreadCount();
    const timer = window.setInterval(() => void loadUnreadCount(), 3_000);
    window.addEventListener('focus', loadUnreadCount);
    document.addEventListener('visibilitychange', refreshWhenVisible);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('focus', loadUnreadCount);
      document.removeEventListener('visibilitychange', refreshWhenVisible);
    };
  }, [loadUnreadCount]);

  const selectNotification = async (notification: NotificationItem) => {
    if (!notification.is_read) {
      await axiosClient.patch(`/notifications/${notification.id}/read`);
      setItems((current) => current.map((item) => item.id === notification.id ? { ...item, is_read: true } : item));
      setUnreadCount((value) => {
        const nextCount = Math.max(0, value - 1);
        lastUnreadCount.current = nextCount;
        return nextCount;
      });
    }
    setOpen(false);
    if (notification.payload?.link) {
      navigate(notification.payload.link, {
        state: { notificationId: notification.id, refreshAt: Date.now() },
      });
    }
  };

  const markAll = async () => {
    await axiosClient.patch('/notifications/read-all');
    setItems((current) => current.map((item) => ({ ...item, is_read: true })));
    lastUnreadCount.current = 0;
    setUnreadCount(0);
  };

  const panel = <div className="w-[380px] max-w-[calc(100vw-32px)]">
    <div className="flex items-center justify-between px-1 pb-3 border-b border-slate-100">
      <div><div className="font-extrabold text-slate-800">Thông báo</div><div className="text-xs text-slate-400">{unreadCount} chưa đọc</div></div>
      {unreadCount > 0 && <Button type="link" size="small" onClick={() => void markAll()}>Đánh dấu đã đọc</Button>}
    </div>
    <Spin spinning={loading}>
      <div className="max-h-[430px] overflow-y-auto -mx-3 mt-1">
        {!items.length
          ? <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Chưa có thông báo" className="my-10" />
          : items.map((item) => <button type="button" key={item.id} onClick={() => void selectNotification(item)} className={`w-full border-0 border-b border-slate-100 px-4 py-3 flex gap-3 text-left cursor-pointer hover:bg-emerald-50 ${item.is_read ? 'bg-white' : 'bg-emerald-50/70'}`}>
            <span className="text-lg mt-0.5">{iconFor(item.type)}</span>
            <span className="flex-1 min-w-0">
              <span className={`block text-sm text-slate-800 ${item.is_read ? 'font-semibold' : 'font-extrabold'}`}>{item.title}</span>
              <span className="block text-xs leading-5 text-slate-500 mt-0.5">{item.message}</span>
              <span className="block text-[11px] text-emerald-600 mt-1">{timeAgo(item.created_at)}</span>
            </span>
            {!item.is_read && <span className="w-2 h-2 mt-2 rounded-full bg-emerald-500" />}
          </button>)}
      </div>
    </Spin>
  </div>;

  return <Popover content={panel} trigger="click" placement="bottomRight" open={open} onOpenChange={(value) => { setOpen(value); if (value) void load(true); }}>
    <Badge count={unreadCount} overflowCount={99} size="small">
      <Button aria-label="Mở thông báo" shape="circle" icon={<BellOutlined />} className="!border-emerald-100 !text-emerald-800 hover:!bg-emerald-50" />
    </Badge>
  </Popover>;
};
