import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

@Component({
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  selector: 'app-root',
  styleUrl: './app.css',
  templateUrl: './app.html',
})
export class App {
  menuOpen = false;

  readonly navigation = [
    { label: 'Início', path: '/', exact: true },
    { label: 'Clientes', path: '/clientes' },
    { label: 'Produtos', path: '/produtos' },
    { label: 'Serviços', path: '/servicos' },
    { label: 'Agendamentos', path: '/agendamentos' },
  ];

  toggleMenu(): void {
    this.menuOpen = !this.menuOpen;
  }

  closeMenu(): void {
    this.menuOpen = false;
  }
}

