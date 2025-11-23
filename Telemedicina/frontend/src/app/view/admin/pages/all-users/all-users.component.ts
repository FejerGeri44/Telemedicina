import {Component, OnInit} from '@angular/core';
import {AdminProfileCardComponent} from '../../components/admin-profile-card/admin-profile-card.component';
import { ModalController } from '@ionic/angular/standalone';
import {DatePipe, NgClass, NgForOf, NgIf, NgOptimizedImage} from '@angular/common';
import {HttpClient} from '@angular/common/http';
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
import {formatPhoneNumber, getUserRoleLabel} from '../../../../utils/formatProfileData';
import {PatientItem} from '../../../../utils/interfaces/patient.interface';
import {DoctorItem} from '../../../../utils/interfaces/doctor.interface';
import {AdminItem} from '../../../../utils/interfaces/admin.interface';
import {environment} from '../../../../../../enviroment';
import {IONIC_COMPONENTS} from '../../../../shared/ionic-imports';

type UserSortKey = 'name' | 'role' | 'createdAt';

@Component({
  selector: 'app-all-users',
    imports: [
      ...IONIC_COMPONENTS,
        NgForOf,
        DatePipe,
        NgClass,
        NgIf,
        NgOptimizedImage
    ],
  templateUrl: './all-users.component.html',
  standalone: true,
  styleUrl: './all-users.component.scss'
})
export class AllUsersComponent implements OnInit{
  patients: PatientItem[] = [];
  doctors: DoctorItem[] = [];
  admins: AdminItem[] = [];
  users: any[] = [];
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
  isLoading: boolean = true;

  constructor(
    private http: HttpClient,
    private modalCtrl: ModalController,
    private route: ActivatedRoute,
    private alert: AlertService,
    private toast: ToastService
  ) {}

  ngOnInit() {
    this.loadAll();
    this.applyFilters();
    this.route.queryParamMap.subscribe(params => {
      const role = (params.get('role') ?? '') as '' | 'patient' | 'doctor' | 'admin';
      this.onRoleCard(role);
    });
  }

  loadPatients(): void {
    this.isLoading = true;
    this.http.get<PatientItem[]>(`${environment.apiUrl}/admin/getAllPatients`, {
      withCredentials: true
    }).subscribe({
      next: (res) => {
        this.patients = res;
        this.countsByRole.patient = this.patients.length;
        this.buildUsers();
        this.applyFilters();
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Páciensek lekérési hiba:', err);
      }
    });
  }

  loadDoctors(): void {
    this.isLoading = true;
    this.http.get<DoctorItem[]>(`${environment.apiUrl}/admin/getAllDoctors`, {
      withCredentials: true
    }).subscribe({
      next: (res) => {
        this.doctors = res;
        this.countsByRole.doctor = this.doctors.length;
        this.buildUsers();
        this.applyFilters();
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Orvosok lekérési hiba:', err);
      }
    });
  }

  loadAdmins(): void {
    this.isLoading = true;
    this.http.get<AdminItem[]>(`${environment.apiUrl}/admin/getAllAdmins`, {
      withCredentials: true
    }).subscribe({
      next: (res) => {
        this.admins = res;
        this.countsByRole.admin = this.admins.length;
        this.buildUsers();
        this.applyFilters();
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Adminok lekérési hiba:', err);
      }
    });
  }

  loadAll(): void {
    this.loadPatients();
    this.loadDoctors();
    this.loadAdmins();
  }

  private buildUsers(): void {
    const mapUserKey = (x: any) => ({ ...x, user: x.user ?? x.User });

    this.users = [
      ...this.patients.map((p: any) => ({ ...mapUserKey(p), role: 'patient' })),
      ...this.doctors.map((d: any)  => ({ ...mapUserKey(d), role: 'doctor'  })),
      ...this.admins.map((a: any)   => ({ ...mapUserKey(a), role: 'admin'   })),
    ];
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

  sortUsers(column: 'name' | 'role' | 'createdAt') {
    if (this.sortColumn === column) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortColumn = column;
      this.sortDirection = 'asc';
    }
    const dir = this.sortDirection === 'asc' ? 1 : -1;

    const getValue = (row: any, col: string) => {
      if (col === 'name') {
        return row?.user?.name ?? '';
      }
      if (col === 'createdAt') {
        const d =
          row.role === 'patient' ? row.patient?.registDate :
            row.role === 'doctor'  ? row.doctor?.registDate  :
              row.admin?.registDate;
        return d ? new Date(d).getTime() : 0;
      }
      return row[col];
    };

    this.filtered = [...this.filtered].sort((a, b) => {
      const va = getValue(a, column);
      const vb = getValue(b, column);
      if (typeof va === 'number' && typeof vb === 'number') {
        return (va - vb) * dir;
      }
      return String(va).localeCompare(String(vb)) * dir;
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
          user: user,
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
          user: user,
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
          user: user,
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
    return this.selectedIds.has(u.user.id);
  }

  get hasSelection(): boolean {
    return this.selectedIds.size > 0;
  }

  get hasExactlyOneSelection(): boolean {
    return this.selectedIds.size === 1;
  }

  onRowClick(u: any, ev?: MouseEvent) {
    const el = ev?.target as HTMLElement;
    if (el && el.closest('ion-button, ion-checkbox')) {
      return;
    }
    this.toggleUser(u);
  }

  private toggleUser(u: any, makeSelected?: boolean) {
    const id = u.user.id;
    const shouldSelect = (makeSelected !== undefined)
      ? makeSelected
      : !this.selectedIds.has(id);

    const next = new Set(this.selectedIds);
    if (shouldSelect) { next.add(id); } else { next.delete(id); }
    this.selectedIds = next;
  }

  isIndeterminate(): boolean {
    const count = this.filtered.filter(u => this.selectedIds.has(u.user.id)).length;
    return count > 0 && count < this.filtered.length;
  }

  select(u: any) {
    const id = this.getUserId(u);
    if (id != null) this.selectedIds.add(id);
  }

  onCheckboxChange(u: any, checked: boolean) {
    this.toggleUser(u, checked);
  }

  areAllSelected(): boolean {
    return this.filtered.length > 0 && this.filtered.every(u => this.selectedIds.has(u.user.id));
  }

  getSingleSelectedUser() {
    if (this.selectedIds.size !== 1) return null;
    const id = Array.from(this.selectedIds)[0];
    return this.filtered.find(it => it.user?.id === id) ?? null;
  }

  toggleSelectAll(checked: boolean) {
    const next = new Set(this.selectedIds);
    if (checked) {
      this.filtered.forEach(u => next.add(u.user.id));
    } else {
      this.filtered.forEach(u => next.delete(u.user.id));
    }
    this.selectedIds = next;
  }

  async editUser() {
    if (!this.hasExactlyOneSelection) return;

    const selected = this.getSingleSelectedUser();
    if (!selected) {
      console.warn('Nincs kiválasztott user.');
      return;
    }

    const role = (selected.role || selected.user?.role || '')
      .toString()
      .trim()
      .toLowerCase();

    const component = this.getModalComponentByRole(role);
    if (!component) {
      console.warn('Ismeretlen role:', role);
      return;
    }
    const modal = await this.modalCtrl.create({
      component: component as any,
      componentProps: this.mapToModalProps(selected),
      backdropDismiss: false
    });

    await modal.present();

    const { role: modalRole } = await modal.onWillDismiss();
    if (modalRole === 'saved' || modalRole === 'updated') {
      this.loadAll();
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

  private mapToModalProps(selected: any) {
    return { user: selected };
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
    if (this.selectedIds.size === 0) return;

    const payload = {
      userIds: Array.from(this.selectedIds)
    };

    type DeleteResponse = {
      message?: string;
      deletedCount?: number;
      roles?: string[];
    };

    this.http.post<DeleteResponse>(`${environment.apiUrl}/admin/deleteUsers`, payload,
      { withCredentials: true }
      ).subscribe({
      next: (res) => {
        this.toast.show('Sikeres felhasználó törlés!', 'success');

        const removedIds = Array.from(this.selectedIds);
        this.selectedIds.clear();

        const roles = (res?.roles ?? [])
          .map(r => r?.toLowerCase?.())
          .filter(Boolean) as string[];

        this.removeUsersFromMemory(removedIds, roles);
      },
      error: (err) => {
        console.error('Hiba a törlés közben:', err);
      }
    });
  }

  private getId(row: any): string {
    const u = row?.User ?? row?.user ?? row;
    return String(u?.id ?? row?.id ?? '');
  }

  private pruneByIds<T = any>(items: T[], idSet: Set<string>): T[] {
    return (items ?? []).filter(item => !idSet.has(this.getId(item)));
  }

  private removeUsersFromMemory(ids: (string|number)[], roles?: string[]) {
    const idSet = new Set(ids.map(x => String(x)));

    const hasRoles = Array.isArray(roles) && roles.length > 0;
    const rset = new Set((roles ?? []).map(r => String(r).toLowerCase()));

    if (!hasRoles || rset.has('patient')) this.patients = this.pruneByIds(this.patients, idSet);
    if (!hasRoles || rset.has('doctor'))  this.doctors  = this.pruneByIds(this.doctors,  idSet);
    if (!hasRoles || rset.has('admin'))   this.admins   = this.pruneByIds(this.admins,   idSet);

    this.countsByRole.patient = this.patients.length;
    this.countsByRole.doctor  = this.doctors.length;
    this.countsByRole.admin   = this.admins.length;

    this.buildUsers();
    this.applyFilters();
  }

  async addUser() {
    const modal = await this.modalCtrl.create({
      component: AddUserComponent as any,
    });

    await modal.present();
    const { data } = await modal.onDidDismiss();
    if (data) {
      this.loadAll();
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

  protected readonly formatPhoneNumber = formatPhoneNumber;
  protected readonly getUserRoleLabel = getUserRoleLabel;
}
