export interface User {
  id: string;
  name: string;
  email: string;
  department: string;
  role: 'Admin' | 'Employee';
  avatar_url: string | null;
}

export interface Device {
  id: string;
  code: string;
  name: string;
  brand?: string;
  model?: string;
  serial_number?: string;
  status: 'Available' | 'Borrowed' | 'Maintenance' | 'Inactive';
  specifications?: any;
  accessories?: { id: string; name: string; quantity: number }[];
}

export interface DeviceModel {
  id: string;
  name: string;
  brand?: string;
  model?: string;
  specifications?: any;
  image_url?: string;
  total_count: number;
  available_count: number;
  available_locations?: { location: string; count: number }[];
  accessory_options?: { id: string; name: string; available_quantity: number; max_quantity: number }[];
}

export interface BorrowRequest {
  id: string;
  device_id: string | null;
  device_model_id: string;
  users_id: string;
  borrow_date: string;
  due_date: string;
  return_date?: string;
  reason?: string;
  rejection_reason?: string;
  status: 'Pending' | 'Approved' | 'ReturnPending' | 'Rejected' | 'Returned' | 'Cancelled';
  device?: Device;
  issued_accessories?: { accessory_id: string; name: string; quantity: number }[] | null;
  requested_accessories?: ({ accessory_id?: string; name: string; quantity: number } | string)[] | null;
  returned_accessories?: { accessory_id: string; name: string; quantity: number }[] | null;
  deviceModel?: DeviceModel;
  user?: User;
}

export interface DeviceCategory {
  id: string;
  name: string;
  description?: string;
}
