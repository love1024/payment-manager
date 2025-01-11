import {
  Component,
  DestroyRef,
  inject,
  OnInit,
  signal,
  viewChild,
} from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  FormGroup,
  FormGroupDirective,
  ReactiveFormsModule,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { PaymentForm, paymentFormErors } from './payment-add-update.form';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { FirstKeyPipe } from '@app/core/pipes';
import { PaymentAddUpdateService } from './payment-add-update.service';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatDatepickerModule } from '@angular/material/datepicker';
import {
  MAT_DATE_LOCALE,
  provideNativeDateAdapter,
} from '@angular/material/core';
import { CountryData, Payment } from '@app/core/models';
import { debounceTime, finalize } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { NullableString } from '@app/core/constants';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { format } from 'date-fns';
import { dateFormatValidator, phoneValidator } from '@app/core/validators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-payment-add-update',
  imports: [
    MatFormFieldModule,
    MatInputModule,
    ReactiveFormsModule,
    MatIconModule,
    FirstKeyPipe,
    MatAutocompleteModule,
    MatDatepickerModule,
    MatButtonModule,
    MatSnackBarModule,
  ],
  providers: [
    provideNativeDateAdapter(),
    { provide: MAT_DATE_LOCALE, useValue: 'en-CA' },
  ],
  templateUrl: './payment-add-update.component.html',
  styleUrl: './payment-add-update.component.scss',
})
export default class PaymentAddUpdateComponent implements OnInit {
  form: FormGroup<PaymentForm>;
  errors = paymentFormErors;
  countries = signal<CountryData[]>([]);
  states = signal<string[]>([]);
  cities = signal<string[]>([]);
  filteredCountries = signal<CountryData[]>([]);
  filteredStates = signal<string[]>([]);
  filteredCities = signal<string[]>([]);

  private fb = inject(FormBuilder);
  private service = inject(PaymentAddUpdateService);
  private snackbar = inject(MatSnackBar);
  private formGroupDirective = viewChild(FormGroupDirective);
  private destroyRef = inject(DestroyRef);

  constructor() {
    this.form = this.initForm();
  }

  ngOnInit(): void {
    this.fetchCountries();
    this.subscribeToCountryFilter();
    this.subscribeToStateFilter();
    this.subscribeToCityFilter();
  }

  onSavePayment(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const payment = this.form.getRawValue() as Payment;
    payment.dueDate = format(payment.dueDate, 'yyyy-MM-dd');

    this.service.savePayment(payment).subscribe(() => {
      this.snackbar.open('Payment is saved', 'Close', {
        duration: 2000,
      });
      this.formGroupDirective()?.resetForm();
    });
  }

  private initForm(): FormGroup<PaymentForm> {
    return this.fb.nonNullable.group({
      firstName: ['', [Validators.required, Validators.maxLength(50)]],
      lastName: ['', [Validators.required, Validators.maxLength(50)]],
      email: ['', [Validators.required, Validators.email]],
      phone: ['', [Validators.required, phoneValidator()]],
      address1: ['', [Validators.required, Validators.maxLength(200)]],
      address2: [null as NullableString, [Validators.maxLength(200)]],
      country: [{ value: '', disabled: true }, [Validators.required]],
      state: [{ value: null as NullableString, disabled: true }],
      city: [{ value: '', disabled: true }, [Validators.required]],
      postalCode: ['', [Validators.required]],
      currency: [{ value: '', disabled: true }, Validators.required],
      dueDate: ['', [Validators.required, dateFormatValidator()]],
      dueAmount: ['', [Validators.required, Validators.max(1000000000000000)]],
      discountPct: ['', Validators.max(1000000000000000)],
      taxPct: ['', Validators.max(1000000000000000)],
    });
  }

  private subscribeToCountryFilter() {
    this.form.controls.country.valueChanges
      .pipe(debounceTime(200), takeUntilDestroyed(this.destroyRef))
      .subscribe((value: string) => {
        this.filteredCountries.set(this.filterCountries(value));
        this.onCountryChange();
      });
  }

  private subscribeToStateFilter() {
    this.form.controls.state.valueChanges
      .pipe(debounceTime(200), takeUntilDestroyed(this.destroyRef))
      .subscribe((value: NullableString) => {
        if (value) {
          this.filteredStates.set(this.filterStates(value));
          this.onStateChange();
        } else {
          this.filteredStates.set(this.states());
        }
      });
  }

  private subscribeToCityFilter() {
    this.form.controls.city.valueChanges
      .pipe(debounceTime(200), takeUntilDestroyed(this.destroyRef))
      .subscribe((value: NullableString) => {
        if (value) {
          this.filteredCities.set(this.filterCities(value));
        } else {
          this.filteredCities.set(this.cities());
        }
      });
  }

  private onCountryChange(): void {
    if (this.form.controls.country.valid) {
      this.form.controls.state.enable({ emitEvent: false });
      this.form.controls.city.enable({ emitEvent: false });
      this.fetchStates();
      this.fetchCities();
      this.fetchCurrency();
    } else {
      this.form.controls.state.reset();
      this.form.controls.city.reset();
      this.states.set([]);
      this.filteredStates.set([]);
      this.cities.set([]);
      this.filteredCities.set([]);
      this.form.controls.state.disable({ emitEvent: false });
      this.form.controls.city.disable({ emitEvent: false });
    }
  }

  private onStateChange(): void {
    this.fetchCities();
  }

  /**
   * Fetch all countries
   */
  private fetchCountries(): void {
    this.showProgressBar();
    this.service
      .getCountries()
      .pipe(finalize(() => this.hideProgressBar()))
      .subscribe(res => {
        this.countries.set(res);
        this.filteredCountries.set(res);
        this.form.controls.country.setValidators([
          Validators.required,
          this.selectionValidator(res.map(r => r.name)),
        ]);
        this.form.controls.country.enable({ emitEvent: false });
      });
  }

  /**
   * Fetch states for the given country
   */
  private fetchStates(): void {
    const country = this.form.controls.country.value;
    this.showProgressBar();
    this.service
      .getStates(country)
      .pipe(finalize(() => this.hideProgressBar()))
      .subscribe(res => {
        this.states.set(res);
        this.filteredStates.set(res);
        this.form.controls.state.setValidators([
          Validators.required,
          this.selectionValidator(res),
        ]);
        this.form.controls.state.enable({ emitEvent: false });
      });
  }

  /**
   * Fetch cities either for the country, or
   * for the state if available
   * @returns
   */
  private fetchCities(): void {
    if (this.form.controls.country.invalid) {
      return;
    }
    const country = this.form.controls.country.value;
    const state = this.form.controls.state.valid
      ? this.form.controls.state.value
      : null;
    const endpoint = state
      ? this.service.getStateCities(country, state)
      : this.service.getCities(country);

    this.showProgressBar();
    endpoint.pipe(finalize(() => this.hideProgressBar())).subscribe(res => {
      if (res.length === 0) {
        return;
      }
      this.cities.set(res);
      this.filteredCities.set(res);
      this.form.controls.city.setValidators([
        Validators.required,
        this.selectionValidator(res),
      ]);
      this.form.controls.city.enable({ emitEvent: false });
    });
  }

  /**
   * Fetch currency for the given country
   */
  private fetchCurrency(): void {
    const country = this.form.controls.country.value;
    this.service.getCurrency(country).subscribe(res => {
      this.form.controls.currency.setValue(res);
    });
  }

  private filterCountries(value: string): CountryData[] {
    const filterValue = value.toLowerCase();

    return this.countries().filter(option =>
      option.name.toLowerCase().includes(filterValue)
    );
  }

  private filterStates(value: string): string[] {
    const filterValue = value.toLowerCase();

    return this.states().filter(option =>
      option.toLowerCase().includes(filterValue)
    );
  }

  private filterCities(value: string): string[] {
    const filterValue = value.toLowerCase();

    return this.cities().filter(option =>
      option.toLowerCase().includes(filterValue)
    );
  }

  /**
   * Validate that the control is from the given selections
   * @param names
   * @returns
   */
  private selectionValidator(names: string[]): ValidatorFn {
    return (control: AbstractControl): { [key: string]: any } | null => {
      const index = names.findIndex(name => {
        return new RegExp('\^' + name + '\$').test(control.value);
      });
      return index < 0 ? { selection: true } : null;
    };
  }

  private showProgressBar(): void {
    this.form.disable({ emitEvent: false });
    this.service.showProgressBar();
  }

  private hideProgressBar(): void {
    this.form.enable({ emitEvent: false });
    this.form.controls.currency.disable();
    this.service.hideProgressBar();
  }
}
