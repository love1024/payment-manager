import {
  Component,
  ElementRef,
  inject,
  OnInit,
  signal,
  TemplateRef,
  viewChild,
} from '@angular/core';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatSortModule } from '@angular/material/sort';
import {
  MatTable,
  MatTableDataSource,
  MatTableModule,
} from '@angular/material/table';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { Payment, PaymentInfo } from '@app/core/models';
import { DashboardService } from './dashboard.service';
import {
  CurrencyPipe,
  DatePipe,
  NgClass,
  TitleCasePipe,
} from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { NullableString, PayeePaymentStatus } from '@app/core/constants';
import { Metadata } from '@app/core/dto';
import {
  MatDialog,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import {
  MAT_DATE_LOCALE,
  NativeDateModule,
  provideNativeDateAdapter,
} from '@angular/material/core';
import { PaymentUpdateForm, paymentUpdateFormErors } from './dashboard.form';
import {
  AbstractControl,
  FormBuilder,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { FirstKeyPipe } from '@app/core/pipes';
import { format } from 'date-fns';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { debounceTime } from 'rxjs';
import {
  DashboardFilterComponent,
  Filter,
} from '../dashboard-filter/dashboard-filter.component';

const maxSizeInBytes = 10 * 1024 * 1024; // 10 MB

@Component({
  selector: 'app-dashboard',
  imports: [
    MatFormFieldModule,
    MatButtonModule,
    MatInputModule,
    MatTableModule,
    MatSortModule,
    MatPaginatorModule,
    CurrencyPipe,
    MatIconModule,
    MatTooltipModule,
    MatDialogModule,
    NgClass,
    TitleCasePipe,
    DatePipe,
    MatDatepickerModule,
    NativeDateModule,
    ReactiveFormsModule,
    MatSnackBarModule,
    FirstKeyPipe,
    DashboardFilterComponent,
  ],
  providers: [
    provideNativeDateAdapter(),
    { provide: MAT_DATE_LOCALE, useValue: 'en-CA' },
  ],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export default class DashboardComponent implements OnInit {
  displayedColumns: string[] = [
    'addedDate',
    'fullName',
    'contact',
    'address',
    'totalDue',
    'dueDate',
    'paymentStatus',
    'evidence',
    'actions',
  ];
  dataSource: MatTableDataSource<PaymentInfo> = new MatTableDataSource(
    [] as PaymentInfo[]
  );
  paymentStatus = PayeePaymentStatus;
  errors = paymentUpdateFormErors;
  totalItems = signal(0);
  pageSize = signal(50);
  currentPage = signal(0);

  updateForm: FormGroup<PaymentUpdateForm>;

  private filter: Filter = {};
  private fb = inject(FormBuilder);
  private table = viewChild(MatTable);
  private selectedPaymentId = signal('');
  private service = inject(DashboardService);
  private dialog = inject(MatDialog);
  private dialogRef?: MatDialogRef<unknown>;
  private snackbar = inject(MatSnackBar);
  private deleteDialog = viewChild<TemplateRef<unknown>>('deleteDialog');
  private editDialog = viewChild<TemplateRef<unknown>>('editDialog');
  private fileUploader = viewChild<ElementRef>('fileUploader');

  constructor() {
    this.updateForm = this.initUpdateForm();
  }

  /**
   * Lifecycle hook that is called after data-bound properties of a directive are initialized.
   */
  ngOnInit(): void {
    this.fetchPayments();
  }

  /**
   * Handles page change event.
   * @param event Page event containing page index and page size.
   */
  onPageChange(event: PageEvent): void {
    this.pageSize.set(event.pageSize);
    this.currentPage.set(event.pageIndex); // MatPaginator uses 0-based indexing
    this.fetchPayments();
  }

  /**
   * Opens the delete dialog and deletes the payment if confirmed.
   * @param id Payment ID to be deleted.
   */
  onDeletePayment(id?: string): void {
    if (!id) {
      return;
    }
    const deleteDialog = this.deleteDialog();
    if (deleteDialog) {
      this.dialogRef = this.dialog.open(deleteDialog);
      this.dialogRef.afterClosed().subscribe((confirmed: boolean) => {
        if (confirmed) {
          this.deletePayment(id);
        }
      });
    }
  }

  /**
   * Open the edit dialog on edit action click
   * @param id
   * @returns
   */
  onEditPayment(id?: string): void {
    if (!id) {
      return;
    }
    const editDialog = this.editDialog();
    if (editDialog) {
      this.hydrateUpdateForm(id);
      this.dialogRef = this.dialog.open(editDialog);
      this.dialogRef.afterClosed().subscribe((confirmed: boolean) => {
        if (confirmed) {
          this.updatePayment(id);
        }
      });
    }
  }

  downloadEvidenceFile(id: string): void {
    this.service.downloadEvidenceFile(id);
  }

  onDialogConfirmation(): void {
    this.dialogRef?.close(true);
  }

  selectFile(id: string): void {
    this.selectedPaymentId.set(id);
    this.fileUploader()?.nativeElement.click();
  }

  /**
   * Upload given evidence
   * @param event
   */
  uploadFile(event: Event): void {
    const element = event.currentTarget as HTMLInputElement;
    const fileList: FileList | null = element.files;
    if (fileList && fileList.length > 0) {
      const fileSize = fileList[0].size;
      if (fileSize > maxSizeInBytes) {
        this.snackbar.open('Maximum size allowed is 10MB', 'Close', {
          duration: 3000,
        });
        return;
      }
      this.service
        .uploadEvidenceFile(this.selectedPaymentId(), fileList[0])
        .subscribe(() => {
          this.fetchPayments();
        });
    }
  }

  /**
   * Clear file upload event, to upload again
   * @param event
   */
  onFileUploadClick(event: Event): void {
    const element = event.currentTarget as HTMLInputElement;
    element.value = '';
  }

  onFilterChange(filter: Filter): void {
    console.log(filter);
    this.filter = filter;
    this.fetchPayments();
  }

  // /**
  //  * Listen to filter changes and fetch payments accordingaly
  //  */
  // private subscribeToFilterChanges(): void {
  //   this.filterValue.valueChanges.pipe(debounceTime(250)).subscribe(val => {
  //     const value = val?.trim().toLowerCase();
  //     this.fetchPayments();

  //     if (this.dataSource.paginator) {
  //       this.dataSource.paginator.firstPage();
  //     }
  //   });
  // }

  /**
   * Delete payment using given Id
   * @param id
   */
  private deletePayment(id: string): void {
    this.service.deletePayment(id).subscribe(() => {
      this.snackbar.open('Payment is deleted.', 'Close', {
        duration: 2000,
      });
      this.fetchPayments();
    });
  }

  /**
   * Update payments given fields
   * @param id
   */
  private updatePayment(id: string): void {
    const formValue = this.updateForm.value;
    this.service
      .updatePayment(id, {
        dueDate: formValue.dueDate,
        dueAmount: formValue.dueAmount,
        paymentStatus: formValue.status,
      })
      .subscribe(() => {
        this.snackbar.open('Payment is updated.', 'Close', {
          duration: 2000,
        });
        this.fetchPayments();
      });
  }

  /**
   * Initialize payment update form
   * @returns
   */
  private initUpdateForm(): FormGroup<PaymentUpdateForm> {
    return this.fb.nonNullable.group(
      {
        dueDate: ['', [Validators.required]],
        dueAmount: ['', [Validators.required]],
        status: ['', [Validators.required]],
        evidenceId: ['' as NullableString],
      },
      {
        validators: [
          this.dueDateAndStatusValidator,
          this.completePaymentStatusValidator,
        ],
      }
    );
  }

  /**
   * Verify that evidence Id is available before
   * marking a payment as complete
   * @param control
   * @returns
   */
  private completePaymentStatusValidator = (
    control: AbstractControl
  ): ValidationErrors | null => {
    if (!this.updateForm) {
      return null;
    }
    const status = this.updateForm.controls.status.value;
    const evidenceId = this.updateForm.controls.evidenceId.value;
    return status === PayeePaymentStatus.COMPLETED && !evidenceId
      ? { evidence: true }
      : null;
  };

  /**
   * Validator function for due date and status
   * @param control
   * @returns
   */
  private dueDateAndStatusValidator = (
    control: AbstractControl
  ): ValidationErrors | null => {
    if (!this.updateForm) {
      return null;
    }
    const status = this.updateForm.controls.status.value;
    const dueDate = new Date(this.updateForm.controls.dueDate.value);
    const formattedDate = format(dueDate, 'yyyy-MM-dd');
    return this.validateStatusAndDueDate(status, formattedDate);
  };

  /**
   * Validate that status and due date are in sync
   * overdue - for past dates
   * pending - for future dates
   * due now - for today
   * @param status
   * @param dueDate
   * @returns
   */
  private validateStatusAndDueDate(
    status: string,
    dueDate: string
  ): ValidationErrors | null {
    const today = new Date().toISOString().split('T')[0]; // Format today as YYYY-MM-DD

    if (dueDate) {
      switch (status) {
        case PayeePaymentStatus.PENDING:
          if (dueDate <= today) {
            return { futureDate: true };
          }
          break;
        case PayeePaymentStatus.OVERDUE:
          if (dueDate >= today) {
            return { pastDate: true };
          }
          break;
        case PayeePaymentStatus.DUE_NOW:
          if (dueDate !== today) {
            return { now: true };
          }
          break;
      }
    }
    return null;
  }

  /**
   * Fetch payments from the backend
   */
  private fetchPayments(): void {
    this.service
      .getPayments(
        this.currentPage() + 1,
        this.pageSize(),
        this.filter?.search ?? '',
        this.filter.status ?? ''
      )
      .subscribe(res => {
        const payments = this.service.toPayment(res.payments);
        this.hydrateMetadata(res.metadata);
        this.dataSource.data = payments;
        this.table()?.renderRows();
      });
  }

  /**
   * Hydrate the update form
   * @param id
   */
  private hydrateUpdateForm(id: string): void {
    const payment = this.dataSource.data.find(p => p._id === id);
    if (payment) {
      this.updateForm.controls.dueDate.patchValue(payment.dueDate);
      this.updateForm.controls.dueAmount.patchValue(payment.dueAmount);
      this.updateForm.controls.status.patchValue(payment.paymentStatus);
      this.updateForm.controls.evidenceId.patchValue(payment.evidenceId ?? '');
    }
  }

  /**
   * Hydrate meta information of pages
   * @param metadata
   */
  private hydrateMetadata(metadata: Metadata): void {
    this.totalItems.set(metadata.total_count);
    this.pageSize.set(metadata.per_page);
    this.currentPage.set(metadata.page - 1);
  }
}
