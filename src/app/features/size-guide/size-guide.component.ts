import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { NavbarComponent } from '../../shared/components/navbar/navbar.component';
import { FooterComponent } from '../../shared/components/footer/footer.component';

type SizeRow = {
  size: string;
  bust: string;
  waist: string;
  hip: string;
  weight: string;
};

@Component({
  selector: 'app-size-guide',
  standalone: true,
  imports: [CommonModule, RouterModule, NavbarComponent, FooterComponent],
  templateUrl: './size-guide.component.html',
})
export class SizeGuideComponent {
  isOpen = false;

  rows: SizeRow[] = [
    { size: 'S',  bust: '82–85', waist: '64–66', hip: '90–92',  weight: '42–47' },
    { size: 'M',  bust: '86–89', waist: '67–70', hip: '93–96',  weight: '48–53' },
    { size: 'L',  bust: '90–93', waist: '71–74', hip: '97–100', weight: '54–59' },
    { size: 'XL', bust: '94–97', waist: '75–78', hip: '101–104',weight: '60–65' },
  ];

  navItems = [
    { label: 'Chính sách vận chuyển', path: '/shipping-policy' },
    { label: 'Chính sách đổi trả', path: '/return-policy' },
    { label: 'Hướng dẫn chọn size', path: '/size-guide', active: true },
  ];

  toggle() {
    this.isOpen = !this.isOpen;
  }

  close() {
    this.isOpen = false;
  }
}
