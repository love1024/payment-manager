import { Component, DestroyRef, inject, OnInit, output } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatFormField } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { debounceTime, merge } from 'rxjs';

export interface Filter {
  search?: string;
  status?: string;
}

@Component({
  selector: 'app-dashboard-filter',
  imports: [MatFormField, ReactiveFormsModule, MatInputModule, MatIconModule],
  templateUrl: './dashboard-filter.component.html',
  styleUrl: './dashboard-filter.component.scss',
})
export class DashboardFilterComponent implements OnInit {
  changed = output<Filter>();
  search = new FormControl<string>('');
  status = new FormControl<string>('');

  private destroyRef = inject(DestroyRef);

  ngOnInit(): void {
    this.subscribeToFilterChanges();
    this.subscribeToStatusChanges();
  }

  /**
   * Clears the filter value.
   */
  onClearFilter(): void {
    this.search.setValue('');
  }

  /**
   * Listen to filter changes and fetch payments accordingaly
   */
  private subscribeToFilterChanges(): void {
    this.search.valueChanges
      .pipe(debounceTime(250), takeUntilDestroyed(this.destroyRef))
      .subscribe(val => {
        this.emitChange();
      });
  }

  /**
   * Listen to filter changes and fetch payments accordingaly
   */
  private subscribeToStatusChanges(): void {
    this.status.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(val => {
        this.emitChange();
      });
  }

  private emitChange(): void {
    this.changed.emit({
      search: this.search.value ?? undefined,
      status: this.status.value ?? undefined,
    });
  }
}
