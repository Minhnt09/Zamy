import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterModule, Router} from '@angular/router';

@Component({
  selector: 'app-footer',
  imports: [CommonModule, RouterModule],
  templateUrl: './footer.component.html',
  styleUrl: './footer.component.scss'
})
export class FooterComponent {
  constructor(private router: Router) {
  }
  goAbout() {
    this.router.navigate(['/about-us']);
  }
  goNews() {
    this.router.navigate(['/news']);
  }
  goReturnPolicy(){
    this.router.navigate(['/return-policy'])
  }
  goShippingPolicy(){
    this.router.navigate(['/shipping-policy'])
  }
  goSizeGuide(){
    this.router.navigate(['/size-guide'])
  }
}
