import {Component, OnInit} from '@angular/core';
import {AdminProfileCardComponent} from '../../components/admin-profile-card/admin-profile-card.component';
import {IonicModule, ModalController} from '@ionic/angular';
import {DatePipe, NgClass, NgForOf} from '@angular/common';
import {HttpClient, HttpHeaders} from '@angular/common/http';
import {forkJoin} from 'rxjs';
import {DoctorProfileCardComponent} from '../../../doctor/components/doctor-profile-card/doctor-profile-card.component';
import {AddUserComponent} from '../../components/add-user/add-user.component';
import {
  PatientProfileCardComponent
} from '../../../patient/components/patient-profile-card/patient-profile-card.component';
import {ActivatedRoute} from '@angular/router';
import {ToastService} from '../../../../shared/toast/toast.service';
import {AlertService} from '../../../../shared/alert/alert.service.component';
import {
  AdminEditProfileModalComponent
} from '../../components/admin-edit-profile-modal/admin-edit-profile-modal.component';
import {
  DoctorEditProfileModalComponent
} from '../../../doctor/components/doctor-edit-profile-modal/doctor-edit-profile-modal.component';
import {
  PatientEditProfileModalComponent
} from '../../../patient/components/patient-edit-profile-modal/patient-edit-profile-modal.component';

type UserSortKey = 'name' | 'role' | 'createdAt';

@Component({
  selector: 'app-all-users',
  imports: [
    IonicModule,
    NgForOf,
    DatePipe,
    NgClass
  ],
  templateUrl: './all-users.component.html',
  standalone: true,
  styleUrl: './all-users.component.css'
})
export class AllUsersComponent implements OnInit{
  patients: any = [];
  doctors: any = [];
  admins: any = [];
  users: any[] = [];
  total: number = 0;
  countsByRole: { patient: number; doctor: number; admin: number } = {
    patient: 0,
    doctor: 0,
    admin: 0
  };

  filtered: any[] = [];
  query = '';
  role: string = '';
  sortColumn: UserSortKey = 'createdAt';
  sortDirection: 'asc' | 'desc' = 'asc';

  selectedIds = new Set<number>();
  error: string | null = null;

  constructor(
    private http: HttpClient,
    private modalCtrl: ModalController,
    private route: ActivatedRoute,
    private alert: AlertService,
    private toast: ToastService
  ) {}

  ngOnInit() {
    this.fetchAll();
    this.applyFilters();
    this.route.queryParamMap.subscribe(params => {
      const role = (params.get('role') ?? '') as '' | 'patient' | 'doctor' | 'admin';
      this.onRoleCard(role);
    });
  }

  getAllPatients(headers: HttpHeaders) {
    return this.http.get<any[]>('http://localhost:3000/api/admin/getAllPatients', { headers });
  }
  getAllDoctors(headers: HttpHeaders) {
    return this.http.get<any[]>('http://localhost:3000/api/admin/getAllDoctors', { headers });
  }
  getAllAdmins(headers: HttpHeaders) {
    return this.http.get<any[]>('http://localhost:3000/api/admin/getAllAdmins', { headers });
  }
  fetchAll() {
    const token = localStorage.getItem('token');
    if (!token) return;
    const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });

    forkJoin([
      this.getAllPatients(headers),
      this.getAllDoctors(headers),
      this.getAllAdmins(headers),
    ]).subscribe({
      next: ([patients, doctors, admins]) => {
        this.patients = patients;
        this.doctors  = doctors;
        this.admins   = admins;

        this.users = [
          ...patients.map(p => ({ ...p, role: 'patient' })),
          ...doctors.map(d  => ({ ...d, role: 'doctor'  })),
          ...admins.map(a   => ({ ...a, role: 'admin'   })),
        ];

        this.total = this.users.length;
        this.countsByRole = {
          patient: patients.length,
          doctor:  doctors.length,
          admin:   admins.length,
        };
        this.applyFilters();
      },
      error: err => console.error('❌ Összes user lekérése sikertelen:', err),
    });
  }
  private normalize(s: any): string {
    return (s ?? '')
      .toString()
      .toLowerCase()
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '');
  }
  private digitsOnly(s: any): string {
    return (s ?? '').toString().replace(/\D+/g, '');
  }
  onSearch(ev: any) {
    this.query = ev?.detail?.value ?? ev?.target?.value ?? '';
    this.applyFilters();
  }
  onRole(role: string) {
    this.role = role;
    this.applyFilters();
  }
  private getSortValue(u: any, key: UserSortKey) {
    switch (key) {
      case 'name':
        return u.name ?? u.User?.name ?? `${u.User?.firstName || ''} ${u.User?.lastName || ''}`.trim();
      case 'role':
        return u.role ?? u.User?.role;
      case 'createdAt':
        return u.createdAt ?? u.registDate ?? u.User?.registDate ?? u.User?.createdAt;
    }
  }
  private collator = new Intl.Collator('hu', { sensitivity: 'base', numeric: true });
  private compareValues(a: any, b: any, key: UserSortKey): number {
    if (a == null && b == null) return 0;
    if (a == null) return 1;
    if (b == null) return -1;

    if (key === 'createdAt') {
      const ta = new Date(a).getTime() || 0;
      const tb = new Date(b).getTime() || 0;
      return ta - tb;
    }

    if (typeof a === 'number' && typeof b === 'number') {
      return a - b;
    }

    return this.collator.compare(String(a), String(b));
  }
  sortUsers(column: UserSortKey) {
    if (this.sortColumn === column) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortColumn = column;
      this.sortDirection = 'asc';
    }

    const key = this.sortColumn;
    const dir = this.sortDirection === 'asc' ? 1 : -1;

    this.filtered = [...this.filtered].sort((x, y) => {
      const vx = this.getSortValue(x, key);
      const vy = this.getSortValue(y, key);
      return this.compareValues(vx, vy, key) * dir;
    });
  }
  applyFilters() {
    const qNorm   = this.normalize(this.query);
    const qDigits = this.digitsOnly(this.query);
    const roleSel = (this.role ?? '').toLowerCase();

    this.filtered = (this.users ?? []).filter(row => {
      const u = row?.User ?? row?.user ?? row;

      const rowRole = (row?.role ?? u?.role ?? '').toLowerCase();
      const roleMatch = !roleSel || rowRole === roleSel;

      if (!qNorm && !qDigits) return roleMatch;

      const nameNorm    = this.normalize(u?.name);
      const addressNorm = this.normalize(u?.address);
      const phoneDigits = this.digitsOnly(u?.phoneNumber);

      const textMatch  = !!qNorm && (nameNorm.includes(qNorm) || addressNorm.includes(qNorm));
      const phoneMatch = !!qDigits && phoneDigits.includes(qDigits);

      return roleMatch && (textMatch || phoneMatch);
    });
  }
  roleBadgeClass(param: string): string {
    const role = (param || '').toLowerCase().trim();
    switch (role) {
      case 'admin': return 'admin-badge';
      case 'doctor': return 'doctor-badge';
      case 'patient': return 'patient-badge';
      default: return 'default-badge';
    }
  }
  onRoleCard(val: '' | 'patient' | 'doctor' | 'admin') {
    this.role = (this.role === val) ? '' : val;
    this.applyFilters();
  }
  onProfileClick(user: any, ev: Event) {
    ev.stopPropagation();
    void this.openProfile(user);
  }
  async openProfile(user: any) {
    if (user.role == 'patient') {
      const modal = await this.modalCtrl.create({
        component: PatientProfileCardComponent as any,
        componentProps: {
          user: user.User,
          patient: user,
          tags: user.tags,
          editable: false
        },
        cssClass: 'profile-view-modal',
        backdropDismiss: true
      });
      await modal.present();
    }else if(user.role == 'doctor') {
      const modal = await this.modalCtrl.create({
        component: DoctorProfileCardComponent as any,
        componentProps: {
          user: user.User,
          doctor: user,
          editable: false
        },
        cssClass: 'profile-view-modal',
        backdropDismiss: true
      });
      await modal.present();
    } else {
      const modal = await this.modalCtrl.create({
        component: AdminProfileCardComponent as any,
        componentProps: {
          user: user.User,
          admin: user,
          editable: false
        },
        cssClass: 'profile-view-modal',
        backdropDismiss: true
      });
      await modal.present();
    }
  }
  private getUserId(u: any): number | null {
    return (u?.User?.id ?? u?.id) ?? null;
  }
  isSelected(u: any): boolean {
    const id = u?.User?.id ?? u?.id ?? null;
    return id != null && this.selectedIds.has(id);
  }
  get hasSelection(): boolean {
    return (this.selectedIds?.size ?? 0) > 0;
  }
  get selectionCount(): number {
    return this.selectedIds?.size ?? 0;
  }
  get hasExactlyOneSelection(): boolean {
    return this.selectionCount === 1;
  }
  onRowClick(u: any, _ev: MouseEvent) {
    this.isSelected(u) ? this.deselect(u) : this.select(u);
  }
  isIndeterminate(): boolean {
    const selectedCount = this.filtered.filter(u => this.isSelected(u)).length;
    return selectedCount > 0 && selectedCount < this.filtered.length;
  }
  select(u: any) {
    const id = this.getUserId(u);
    if (id != null) this.selectedIds.add(id);
  }
  deselect(u: any) {
    const id = this.getUserId(u);
    if (id != null) this.selectedIds.delete(id);
  }
  onCheckboxChange(u: any, ev: CustomEvent) {
    ev.stopPropagation();
    if (ev.detail?.checked) this.select(u);
    else this.deselect(u);
  }
  areAllSelected(): boolean {
    return this.filtered.length > 0 && this.filtered.every(u => this.isSelected(u));
  }
  getSingleSelectedUser(): any | null {
    if (this.selectedIds.size !== 1) return null;
    const id = Array.from(this.selectedIds)[0];
    return this.users.find(u => this.getUserId(u) === id) ?? null;
  }
  toggleSelectAll(checked: boolean) {
    if (checked) {
      this.filtered.forEach(u => this.select(u));
    } else {
      this.filtered.forEach(u => this.deselect(u));
    }
  }
  async editUser() {
    if (!this.hasExactlyOneSelection) return;

    const selected = this.getSingleSelectedUser();
    if (!selected) return;

    const role: string =
      (selected.role || selected.User?.role || '').toLowerCase();

    const component = this.getModalComponentByRole(role);
    if (!component) {
      console.warn('Ismeretlen role:', role);
      return;
    }

    const componentProps = this.mapToModalProps(selected);

    const modal = await this.modalCtrl.create({
      component,
      componentProps,
      backdropDismiss: false
    });

    await modal.present();

    const { role: modalRole } = await modal.onWillDismiss();
    if (modalRole === 'saved' || modalRole === 'updated') {
      this.fetchAll();
    }
  }
  private getModalComponentByRole(role: string) {
    switch (role) {
      case 'patient': return PatientEditProfileModalComponent;
      case 'doctor':  return DoctorEditProfileModalComponent;
      case 'admin':   return AdminEditProfileModalComponent;
      default:        return null;
    }
  }
  private mapToModalProps(row: any) {
    const flatUser = row.User ?? row;

    return {
      user: {
        user: flatUser,
        patient: row.Patient ?? (row.role === 'patient' ? row : null),
        doctor: row.Doctor  ?? (row.role === 'doctor'  ? row : null),
        admin: row.Admin   ?? (row.role === 'admin'   ? row : null),
      }
    };
  }
  firstConfirmUserDelete() {
    void this.alert.show(
      'Felhasználó törlés',
      'Biztosan törölni szeretnéd a kijelölt felhasználót/felhasználókat?',
      () => this.secondConfirmUserDelete()
    )
  }
  secondConfirmUserDelete() {
    void this.alert.show(
      'Biztos vagy döntésedben?',
      'Törlés után az adatok elvesznek és visszaállíthatatlanok!',
      () => this.deleteUser()
    )
  }
  deleteUser() {
    if (this.selectedIds.size === 0) {
      return;
    }

    const payload = {
      userIds: Array.from(this.selectedIds)
    };

    const token = localStorage.getItem('token');
    if (!token) return;

    this.http.delete('http://localhost:3000/api/admin/deleteUsers', {
      body: payload,
      headers: {
        Authorization: `Bearer ${token}`
      }
    }).subscribe({
      next: (res) => {
        this.toast.show("Sikeres felhasználó törlés!", "success");
        this.selectedIds.clear();
        setTimeout(() => window.location.reload(), 0);
      },
      error: (err) => {
        console.error('Hiba a törlés közben:', err);
      }
    });
  }
  async addUser() {
    const modal = await this.modalCtrl.create({
      component: AddUserComponent,
    });

    await modal.present();
    const { data } = await modal.onDidDismiss();
    if (data) {
      this.fetchAll();
    }
  }
  exportCsv() {
    const rows = this.filtered ?? [];
    if (!rows.length) return;

    const DELIM = ';';
    const CRLF  = '\r\n';

    const cell = (v: any) => `"${(v ?? '').toString().replace(/"/g, '""')}"`;

    const pick = (row: any) => {
      const u = row?.User ?? row?.user ?? row;
      const id    = u?.id ?? row?.id ?? '';
      const name  = u?.name ?? '';
      const role  = row?.role ?? u?.role ?? '';
      const email = u?.email ?? '';
      const phone = u?.phoneNumber ?? '';

      const createdRaw = row?.createdAt ?? u?.createdAt ?? row?.registDate ?? '';
      const created    = createdRaw ? new Date(createdRaw).toLocaleDateString('hu-HU') : '';

      return [id, name, role, email, phone, created]; // <-- 6 mező
    };

    const headers = ['id','name','role','email','phone','created']; // <-- 6 fejléc
    const lines = [headers.map(cell).join(DELIM)];
    for (const r of rows) lines.push(pick(r).map(cell).join(DELIM));

    const csv = '\uFEFF' + lines.join(CRLF);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `users_${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }
}
