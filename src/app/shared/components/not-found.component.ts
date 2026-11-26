import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  imports: [RouterLink],
  template: `<main class="store-page">
    <h1 class="store-title">Không tìm thấy trang</h1>
    <a routerLink="/home" class="store-button">Về trang chủ</a>
  </main>`,
})
export class NotFoundComponent {}
