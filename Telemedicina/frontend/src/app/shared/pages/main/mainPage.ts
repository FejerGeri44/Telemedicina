import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './mainPage.html',
  standalone: true,
  styleUrl: './mainPage.css'
})
export class MainPage {
  title = 'untitled';
}
