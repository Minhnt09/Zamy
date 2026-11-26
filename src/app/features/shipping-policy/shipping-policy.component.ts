import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-shipping-policy',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './shipping-policy.component.html',
  styleUrl: './shipping-policy.component.scss'
})
export class ShippingPolicyComponent {
  isOpen = false;

  navItems = [
    { label: 'Chính sách vận chuyển', path: '/shipping-policy', active: true },
    { label: 'Chính sách đổi trả', path: '/return-policy' },
    { label: 'Hướng dẫn chọn size', path: '/size-guide' },
  ];

  toggle() {
    this.isOpen = !this.isOpen;
  }

  close() {
    this.isOpen = false;
  }


}
