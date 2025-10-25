import {User} from './user.interface';

export interface Admin {
  id: number;
  registDate: string;
}

export interface AdminItem {
  user: User;
  admin: Admin;
}
