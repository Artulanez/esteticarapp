import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css',
})
export class HomeComponent {
  selectedModule = '';

  constructor(private readonly router: Router) {}

  goToSelectedModule(): void {
    if (!this.selectedModule) {
      return;
    }

    this.router.navigate([this.selectedModule]);
  }
}
