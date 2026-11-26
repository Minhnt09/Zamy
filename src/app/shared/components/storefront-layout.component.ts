import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NavbarComponent } from './navbar/navbar.component';
import { FooterComponent } from './footer/footer.component';

@Component({
  imports: [RouterOutlet, NavbarComponent, FooterComponent],
  template: `
    <a href="#storefront-content" class="sr-only focus:not-sr-only focus:absolute focus:z-[70] focus:bg-white focus:p-3">Bỏ qua menu</a>
    <app-navbar class="sticky top-0 z-40 block"></app-navbar>
    <div id="storefront-content" tabindex="-1"><router-outlet></router-outlet></div>
    <app-footer></app-footer>
  `,
})
export class StorefrontLayoutComponent {}
