import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';

@Component({
  selector: 'app-product-filter',
  imports: [CommonModule],
  standalone: true,
  templateUrl: './product-filter.component.html',
  styleUrl: './product-filter.component.scss'
})
export class ProductFilterComponent {
  // Biến toggle cho filter panel
  showColor = false;
  showSize = false;
  showForm = false;
  
  // Toggle các panel
  togglePanel(panel: 'color' | 'size' | 'form') {
    if (panel === 'color') this.showColor = !this.showColor;
    if (panel === 'size') this.showSize = !this.showSize;
    if (panel === 'form') this.showForm = !this.showForm;
  }
}
