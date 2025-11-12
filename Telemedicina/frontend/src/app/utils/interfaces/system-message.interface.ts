import {AdminItem} from './admin.interface';

export interface SystemMessage {
  id: number;
  adminId: number | null;
  admin?: AdminItem;
  title: string;
  message: string;
  audience: 'all' | 'patient' | 'doctor' | 'admin';
  type: 'info' | 'warning' | 'error';
  created_at: string;
  valid_until: string;
}
