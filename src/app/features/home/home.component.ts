import { AfterViewInit, Component, ElementRef, HostListener, Inject, OnDestroy, PLATFORM_ID, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { NavbarComponent } from '../../shared/components/navbar/navbar.component';
import { FooterComponent } from '../../shared/components/footer/footer.component';
import { HighlightProductsComponent } from '../../shared/components/highlight-products/highlight-products.component';

@Component({
  selector: 'app-home',
  imports: [
    NavbarComponent,
    FooterComponent,
    CommonModule,
    HighlightProductsComponent

  ],
  standalone: true,
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss'
})
export class HomeComponent implements AfterViewInit, OnDestroy {
  @ViewChild('bannerCarousel') bannerCarousel?: ElementRef<HTMLElement>;

  readonly banners = [
    '/assets/img/banner1.png',
    '/assets/img/banner2.png',
    '/assets/img/banner3.png',
    '/assets/img/banner4.png'
  ];
  bannerIndex = 0;
  private autoplayId?: ReturnType<typeof setInterval>;
  private readonly isBrowser: boolean;

  showScrollTop = false;
  goAbout() {
    this.router.navigate(['/about-us']);
  }
  goNews() {
    this.router.navigate(['/news']);
  }
  constructor(private router: Router, @Inject(PLATFORM_ID) platformId: object) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  ngAfterViewInit(): void {
    this.startBannerAutoplay();
  }

  ngOnDestroy(): void {
    this.stopBannerAutoplay();
  }

  goToBanner(index: number): void {
    this.bannerIndex = index;
    this.scrollToBanner();
    this.restartBannerAutoplay();
  }

  onBannerScroll(): void {
    const carousel = this.bannerCarousel?.nativeElement;
    if (!carousel?.clientWidth) return;
    this.bannerIndex = Math.min(this.banners.length - 1, Math.max(0, Math.round(carousel.scrollLeft / carousel.clientWidth)));
  }

  pauseBannerAutoplay(): void {
    this.stopBannerAutoplay();
  }

  resumeBannerAutoplay(): void {
    this.onBannerScroll();
    this.startBannerAutoplay();
  }

  @HostListener('document:visibilitychange')
  onVisibilityChange(): void {
    if (!this.isBrowser) return;
    document.hidden ? this.stopBannerAutoplay() : this.startBannerAutoplay();
  }

  @HostListener('window:resize')
  onResize(): void {
    if (!this.isBrowser) return;
    if (this.isMobileViewport()) {
      this.scrollToBanner('auto');
      this.startBannerAutoplay();
    } else {
      this.stopBannerAutoplay();
    }
  }

  private startBannerAutoplay(): void {
    if (!this.isBrowser || this.autoplayId || document.hidden || !this.isMobileViewport()) return;
    this.autoplayId = setInterval(() => {
      this.bannerIndex = (this.bannerIndex + 1) % this.banners.length;
      this.scrollToBanner();
    }, 2500);
  }

  private restartBannerAutoplay(): void {
    this.stopBannerAutoplay();
    this.startBannerAutoplay();
  }

  private stopBannerAutoplay(): void {
    if (!this.autoplayId) return;
    clearInterval(this.autoplayId);
    this.autoplayId = undefined;
  }

  private scrollToBanner(behavior: ScrollBehavior = 'smooth'): void {
    const carousel = this.bannerCarousel?.nativeElement;
    if (!carousel) return;
    carousel.scrollTo({ left: carousel.clientWidth * this.bannerIndex, behavior });
  }

  private isMobileViewport(): boolean {
    return window.matchMedia('(max-width: 767px)').matches;
  }
}
