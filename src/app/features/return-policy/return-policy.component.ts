import { Component } from '@angular/core';
import { NavbarComponent } from '../../shared/components/navbar/navbar.component';
import { FooterComponent } from '../../shared/components/footer/footer.component';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-return-policy',
  standalone: true,
  imports: [NavbarComponent, FooterComponent, CommonModule, RouterModule],
  templateUrl: './return-policy.component.html',
  styleUrl: './return-policy.component.scss'
})
export class ReturnPolicyComponent {
  isOpen = false;

  navItems = [
    { label: 'Chính sách vận chuyển', path: '/shipping-policy' },
    { label: 'Chính sách đổi trả', path: '/return-policy', active: true },
    { label: 'Hướng dẫn chọn size', path: '/size-guide' },
  ];

  toggle() {
    this.isOpen = !this.isOpen;
  }

  close() {
    this.isOpen = false;
  }


}
