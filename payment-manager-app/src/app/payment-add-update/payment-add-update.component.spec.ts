import { ComponentFixture, TestBed } from '@angular/core/testing';

import PaymentAddUpdateComponent from './payment-add-update.component';

describe('PaymentAddUpdateComponent', () => {
  let component: PaymentAddUpdateComponent;
  let fixture: ComponentFixture<PaymentAddUpdateComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PaymentAddUpdateComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(PaymentAddUpdateComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
