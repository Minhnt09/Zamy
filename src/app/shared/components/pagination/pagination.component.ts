import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

type PageItem = number | '...';

@Component({
  selector: 'app-pagination',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './pagination.component.html',
  styleUrl: './pagination.component.scss'
})
export class PaginationComponent {
  @Input() totalItems = 0;
  @Input() currentPage = 1;
  @Input() pageSize = 6;
  @Input() pageSizeOptions = [6, 9, 12, 24];
  @Input() disabled = false;

  @Output() pageChange = new EventEmitter<number>();
  @Output() pageSizeChange = new EventEmitter<number>();

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.totalItems / this.pageSize));
  }

  get safeCurrentPage(): number {
    return Math.min(Math.max(this.currentPage, 1), this.totalPages);
  }

  get startItem(): number {
    if (this.totalItems === 0) {
      return 0;
    }

    return (this.safeCurrentPage - 1) * this.pageSize + 1;
  }

  get endItem(): number {
    return Math.min(this.safeCurrentPage * this.pageSize, this.totalItems);
  }

  get pages(): PageItem[] {
    const total = this.totalPages;
    const current = this.safeCurrentPage;

    if (total <= 7) {
      return Array.from({ length: total }, (_, index) => index + 1);
    }

    if (current <= 4) {
      return [1, 2, 3, 4, 5, '...', total];
    }

    if (current >= total - 3) {
      return [1, '...', total - 4, total - 3, total - 2, total - 1, total];
    }

    return [1, '...', current - 1, current, current + 1, '...', total];
  }

  goToPage(page: number) {
    if (this.disabled || page === this.safeCurrentPage || page < 1 || page > this.totalPages) {
      return;
    }

    this.pageChange.emit(page);
  }

  goToPrevious() {
    this.goToPage(this.safeCurrentPage - 1);
  }

  goToNext() {
    this.goToPage(this.safeCurrentPage + 1);
  }

  changePageSize(event: Event) {
    const value = Number((event.target as HTMLSelectElement).value);

    if (!value || value === this.pageSize) {
      return;
    }

    this.pageSizeChange.emit(value);
  }

  isNumber(page: PageItem): page is number {
    return typeof page === 'number';
  }
}
