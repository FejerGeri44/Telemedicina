import { Component } from '@angular/core';
import {FormsModule} from '@angular/forms';
import {HttpClient} from '@angular/common/http';
import {IonicModule} from '@ionic/angular';

@Component({
  selector: 'app-system-messages',
  imports: [
    FormsModule,
    IonicModule
  ],
  templateUrl: './system-messages.component.html',
  standalone: true,
  styleUrl: './system-messages.component.css'
})
export class SystemMessagesComponent {
  formData = {
    title: '',
    message: '',
    type: 'info',
    audience: 'all',
    validUntil: ''
  };

  constructor(private http: HttpClient) {}

  createMessage() { /* ... */ }
  resetForm()     { this.formData = { title:'', message:'', type:'info', audience:'all', validUntil:'' }; }
}
