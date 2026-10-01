import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Badge, Button, Empty, Popover, Spin } from 'antd';
import {
  BellOutlined,
  CalendarOutlined,
  CheckCircleFilled,
  CloseCircleFilled,
  InfoCircleFilled,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import axiosClient from '../api/axiosClient';

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: string;
  payload: { link?: string; [key: string]: unknown } | null;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
}

interface NotificationResponse {
  data: NotificationItem[];
  unreadCount: number;
}

const timeAgo = (value: string) => {
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 1000));
  if (seconds < 60) return 'Vừa xong';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} phút trước`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} giờ trước`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} ngày trước`;
  return new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short' }).format(new Date(value));
};

const typeIcon = (type: string) => {
  if (type === 'CalibrationDue') return <CalendarOutlined className="text-amber-500" />;
  if (type === 'BorrowRequestRejected' || type === 'BorrowRequestCancelled') {
    return <CloseCircleFilled className="text-rose-500" />;
  }
  if (type === 'BorrowRequestApproved' || type === 'BorrowRequestReturned') {
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

  const loadNotifications = useCallback(async (showLoading = false) => {
    if (showLoading) setLoading(true);
    try {
      const response = await axiosClient.get<any, NotificationResponse>('/notifications?limit=20');
      setItems(response.data || []);
      syncUnreadCount(response.unreadCount || 0);
    } catch {
      // Authentication errors are handled globally by the Axios interceptor.
    } finally {
      if (showLoading) setLoading(false);
    }
  }, [syncUnreadCount]);

  const loadUnreadCount = useCallback(async () => {
    try {
      const response = await axiosClient.get<any, { count: number }>('/notifications/unread-count');
      syncUnreadCount(response.count || 0);
    } catch {
      // Authentication errors are handled globally by the Axios interceptor.
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

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (nextOpen) void loadNotifications(true);
  };

  const openNotification = async (notification: NotificationItem) => {
    if (!notification.is_read) {
      await axiosClient.patch(`/notifications/${notification.id}/read`);
      setItems((current) => current.map((item) => item.id === notification.id
        ? { ...item, is_read: true, read_at: new Date().toISOString() }
        : item));
      setUnreadCount((count) => {
        const nextCount = Math.max(0, count - 1);
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

  const markAllAsRead = async () => {
    await axiosClient.patch('/notifications/read-all');
    setItems((current) => current.map((item) => ({
      ...item,
      is_read: true,
      read_at: item.read_at || new Date().toISOString(),
    })));
    lastUnreadCount.current = 0;
    setUnreadCount(0);
  };

  const panel = (
    <div className="w-[380px] max-w-[calc(100vw-32px)]">
      <div className="flex items-center justify-between px-1 pb-3 border-b border-slate-100">
        <div>
          <div className="font-extrabold text-slate-800 text-base">Thông báo</div>
          <div className="text-xs text-slate-400 mt-0.5">{unreadCount} thông báo chưa đọc</div>
        </div>
        {unreadCount > 0 && (
          <Button type="link" size="small" onClick={() => void markAllAsRead()}>
            Đánh dấu đã đọc
          </Button>
        )}
      </div>
      <Spin spinning={loading}>
        <div className="max-h-[430px] overflow-y-auto -mx-3 mt-1">
          {!items.length ? (
            <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Chưa có thông báo" className="my-10" />
          ) : items.map((notification) => (
            <button
              type="button"
              key={notification.id}
              onClick={() => void openNotification(notification)}
              className={`w-full text-left flex gap-3 px-4 py-3 border-0 border-b border-slate-100 cursor-pointer transition-colors hover:bg-emerald-50/70 ${notification.is_read ? 'bg-white' : 'bg-emerald-50/60'}`}
            >
              <span className="text-lg mt-0.5">{typeIcon(notification.type)}</span>
              <span className="min-w-0 flex-1">
                <span className="flex items-start justify-between gap-3">
                  <span className={`text-sm text-slate-800 ${notification.is_read ? 'font-semibold' : 'font-extrabold'}`}>{notification.title}</span>
                  {!notification.is_read && <span className="mt-1.5 w-2 h-2 shrink-0 rounded-full bg-emerald-500" />}
                </span>
                <span className="block text-xs leading-5 text-slate-500 mt-0.5">{notification.message}</span>
                <span className="block text-[11px] text-emerald-600 mt-1">{timeAgo(notification.created_at)}</span>
              </span>
            </button>
          ))}
        </div>
      </Spin>
    </div>
  );

  return (
    <Popover content={panel} trigger="click" placement="bottomRight" open={open} onOpenChange={handleOpenChange}>
      <Badge count={unreadCount} overflowCount={99} size="small">
        <Button
          aria-label="Mở thông báo"
          shape="circle"
          icon={<BellOutlined />}
          className="!border-emerald-100 !text-emerald-800 hover:!bg-emerald-50"
        />
      </Badge>
    </Popover>
  );
};
