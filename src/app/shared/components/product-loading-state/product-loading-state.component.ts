import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-product-loading-state',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './product-loading-state.component.html'
})
export class ProductLoadingStateComponent {
  @Input() loading = false;
  @Input() hasData = false;
  @Input() errorMessage: string | null = null;
  @Output() retryRequested = new EventEmitter<void>();
}
