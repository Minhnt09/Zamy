import { Component, Inject, Input, PLATFORM_ID, TemplateRef, ViewChild, } from '@angular/core';
import { NavbarComponent } from '../../shared/components/navbar/navbar.component';
import { CommonModule, Location } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators, } from '@angular/forms';
import { NzInputModule } from 'ng-zorro-antd/input';
import { FooterComponent } from '../../shared/components/footer/footer.component';
import { CartservicesService } from '../services/cartservices.service';
import { NzModalService } from 'ng-zorro-antd/modal';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { CheckoutService } from '../services/checkout.service';
import { OrderService } from '../services/order.service';

@Component({
  selector: 'app-checkout',
  standalone: true,
  imports: [
    NavbarComponent,
    CommonModule,
    RouterModule,
    FormsModule,
    ReactiveFormsModule,
    NzInputModule,
    FooterComponent,
    NzModalModule,
  ],
  templateUrl: './checkout.component.html',
  styleUrl: './checkout.component.scss',
})
export class CheckoutComponent {
  @ViewChild('modalContent') modalContent!: TemplateRef<any>;
  @Input() countdownDurationInMinutes = 5;

  countdown!: number;
  isCountdownEnd = false;
  isShowBack = false;
  isSubmitting = false;
  submitError = '';
  shippingFee = 20000;
  cashOnDeliveryOrderCode = '';
  isCashOnDeliverySuccessVisible = false;
  form!: FormGroup;
  cart: any[] = [];


  constructor(
    private router: Router,
    private fb: FormBuilder,
    private location: Location,
    private cartService: CartservicesService,
    private checkoutService: CheckoutService,
    private modalService: NzModalService,
    private orderService: OrderService,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  ngOnInit() {
    this.initializeForm();

    const checkoutProducts = this.checkoutService.getProducts();

    if (checkoutProducts.length > 0) {
      this.cart = checkoutProducts;
    } else {
      this.cart = this.cartService.getCartItems();
    }
    this.checkoutService.clear();

    const now = Date.now();
    this.countdown =
      now + this.countdownDurationInMinutes * 60 * 1000;
  }
  initializeForm(): void {
    this.form = this.fb.group({
      fullName: ['', Validators.required],
      phoneNumber: [
        '',
        [
          Validators.required,
          Validators.pattern(/^[0-9]*$/),
          Validators.minLength(10),
          Validators.maxLength(10),
        ],
      ],
      email: ['', Validators.email],
      province: ['', Validators.required],
      district: ['', Validators.required],
      address: ['', Validators.required],
      paymentMethod: ['cod', Validators.required],
    });
  }

  get fullName() { return this.form.get('fullName'); }
  get phoneNumber() { return this.form.get('phoneNumber'); }
  get email() { return this.form.get('email'); }
  get province() { return this.form.get('province'); }
  get district() { return this.form.get('district'); }
  get address() { return this.form.get('address'); }
  private buildOrderPayload() {
    const v = this.form.value;

    return {
      customer: {
        name: v.fullName,
        phone: v.phoneNumber,
        email: v.email,
        address: `${v.address}, ${v.district}, ${v.province}`,
      },
      paymentMethod: v.paymentMethod,
      shippingFee: this.shippingFee,
      items: this.cart.map((item: any) => ({
        productId: item.id,
        qty: item.qty ?? 1,
      })),
    };
  }

  async onSubmit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    if (this.cart.length === 0) {
      this.submitError = 'Giỏ hàng đang trống. Vui lòng chọn sản phẩm trước khi thanh toán.';
      return;
    }
    const payload = this.buildOrderPayload();
    this.isSubmitting = true;

    this.orderService.createOrder(payload).subscribe({
      next: (res: any) => {
        this.isSubmitting = false;
        this.submitError = '';

        const paymentUrl = res?.paymentUrl || res?.data?.paymentUrl;
        const orderCode = res?.data?.orderCode || res?.orderCode;

        this.cartService.clearCart();

        if (paymentUrl) {
          window.location.href = paymentUrl;
          return;
        }

        this.showCashOnDeliverySuccess(orderCode);
        console.log('POST /orders response', res);
      },
      error: (err) => {
        this.isSubmitting = false;
        this.submitError = err?.error?.error || 'Không thể tạo đơn hàng. Vui lòng thử lại.';
      }
    });
  }

  goBack() {
    if (window.history.length > 1) {
      this.location.back();
    } else {
      this.router.navigate(['/store']);
    }
  }

  openModalTimeOut() {
    this.modalService.create({
      nzTitle: '',
      nzContent: this.modalContent,
    });
  }

  onCountdownFinished() {
    this.isCountdownEnd = true;
    this.openModalTimeOut();
  }

  openBackModal() {
    this.isShowBack = true;
  }

  handleOk() {
    this.router.navigate(['/home']);
    this.isShowBack = false;
  }

  handleCancel() {
    this.isShowBack = false;
  }

  private showCashOnDeliverySuccess(orderCode: string) {
    this.cashOnDeliveryOrderCode = orderCode;
    this.isCashOnDeliverySuccessVisible = true;
  }

  closeCashOnDeliverySuccess() {
    this.isCashOnDeliverySuccessVisible = false;
    this.router.navigate(['/home']);
  }

  getTotalPrice() {
    return this.cart.reduce(
      (sum: number, item: any) => sum + item.price * (item.qty ?? 1),
      0
    );
  }
}
