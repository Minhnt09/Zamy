import { Component, input, computed } from '@angular/core';

const optimizedImages = new Set([
  'sale1', 'sale2', 'sale3', 'sale4', 'dress1', 'dress2', 'dress3', 'dress4', 'shirt1', 'shirt2',
  'shirt3', 'shirt4', 'trousers1', 'trousers2', 'trousers3', 'trousers4', 'skirt1', 'skirt2', 'skirt3', 'skirt4',
]);

@Component({
  selector: 'app-product-image',
  template: `
    <picture>
      @if (srcset(); as sources) {
        <source type="image/webp" [attr.srcset]="sources" [attr.sizes]="sizes()">
      }
      <img [src]="src()" [alt]="alt()" [attr.loading]="priority() ? 'eager' : 'lazy'"
        [attr.fetchpriority]="priority() ? 'high' : 'auto'" decoding="async"
        width="480" height="640" class="aspect-[3/4] w-full object-cover">
    </picture>
  `,
})
export class ProductImageComponent {
  readonly src = input.required<string>();
  readonly alt = input('');
  readonly sizes = input('(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw');
  readonly priority = input(false);
  readonly srcset = computed(() => {
    const match = this.src()?.match(/^\/?assets\/img\/([a-z]+\d+)\.png$/);
    if (!match || !optimizedImages.has(match[1])) return null;
    return [320, 640, 960].map(width => '/assets/optimized/' + match[1] + '-' + width + '.webp ' + width + 'w').join(', ');
  });
}
