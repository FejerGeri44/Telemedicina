import { Component } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {Router} from '@angular/router';

@Component({
  selector: 'app-patient-regist',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonicModule
  ],
  templateUrl: './patient-regist.component.html',
  styleUrls: ['./patient-regist.component.css']
})
export class PatientRegistComponent {
  isMobile: boolean = false;
  private resizeListener!: () => void;

  fullName: string = '';
  email: string = '';
  password: string = '';
  password_again: string = '';
  phone: string = '';
  address: string = '';
  date: string = '';

  constructor(private router: Router) {}

  ngOnInit() {
    this.updateScreenSize();
    this.resizeListener = () => this.updateScreenSize();
    window.addEventListener('resize', this.resizeListener);
  }

  ngOnDestroy(): void {
    window.removeEventListener('resize', this.resizeListener);
  }

  updateScreenSize() {
    this.isMobile = window.innerWidth < 768;
  }

  onRegister() {

  }
  backToDash() {
    void this.router.navigate(['/']);
  }
}
