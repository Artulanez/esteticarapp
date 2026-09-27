import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { Customer } from '../../models/customer.model';
import { CustomerApiService } from '../../services/customer-api.service';
import { phoneValidator } from '../../../../shared/utils/phone.validator';

@Component({
  selector: 'app-customer-form',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './customer-form.component.html',
  styleUrl: './customer-form.component.css',
})
export class CustomerFormComponent implements OnInit {
  form: FormGroup;
  customers: Customer[] = [];
  filteredCustomers: Customer[] = [];
  searchTerm = '';
  page = 1;
  pageSize = 15;
  pageOptions = [15, 30, 50];
  isApiMode = false;
  editingId: number | null = null;

  constructor(
    private readonly fb: FormBuilder,
    private readonly customerApiService: CustomerApiService,
    private readonly router: Router,
  ) {
    this.form = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      phone: ['', [Validators.required, phoneValidator]],
    });
  }

  ngOnInit(): void {
    this.loadCustomers();
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.filteredCustomers.length / this.pageSize));
  }

  get paginatedCustomers(): Customer[] {
    const start = (this.page - 1) * this.pageSize;
    return this.filteredCustomers.slice(start, start + this.pageSize);
  }

  onSearch(): void {
    this.page = 1;
    this.applyFilter();
  }

  onPageSizeChange(): void {
    this.page = 1;
    this.applyFilter();
  }

  previousPage(): void {
    if (this.page > 1) {
      this.page -= 1;
    }
  }

  nextPage(): void {
    if (this.page < this.totalPages) {
      this.page += 1;
    }
  }

  goToHome(): void {
    this.router.navigate(['']);
  }

  togglePersistenceMode(): void {
    this.isApiMode = !this.isApiMode;
    this.loadCustomers();
  }

  private loadCustomers(): void {
    if (this.isApiMode) {
      this.customerApiService.list().subscribe({
        next: (items) => {
          this.customers = items;
          this.applyFilter();
        },
        error: () => {
          this.customers = [];
          this.filteredCustomers = [];
        },
      });
      return;
    }

    const saved = this.getLocalStorageValue<Customer[]>('customers');
    this.customers = saved ?? [];
    this.applyFilter();
  }

  private applyFilter(): void {
    const term = this.searchTerm.trim().toLowerCase();

    this.filteredCustomers = this.customers.filter((customer) => {
      if (!term) {
        return true;
      }

      return customer.name.toLowerCase().includes(term);
    });

    const maxPage = Math.max(1, Math.ceil(this.filteredCustomers.length / this.pageSize));
    if (this.page > maxPage) {
      this.page = maxPage;
    }
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const customer: Customer = this.form.value;

    if (this.isApiMode) {
      const request$ = this.editingId !== null
        ? this.customerApiService.update(this.editingId, customer)
        : this.customerApiService.create(customer);

      request$.subscribe({
        next: () => {
          this.resetForm();
          this.loadCustomers();
        },
      });
      return;
    }

    const customers = this.getLocalStorageValue<Customer[]>('customers') ?? [];

    if (this.editingId !== null) {
      const index = customers.findIndex((item) => item.id === this.editingId);
      if (index >= 0) {
        customers[index] = { ...customer, id: this.editingId };
      }
    } else {
      customers.push({ ...customer, id: Date.now() });
    }

    this.setLocalStorageValue('customers', customers);
    this.resetForm();
    this.loadCustomers();
  }

  editCustomer(customer: Customer): void {
    this.editingId = customer.id ?? null;
    this.form.patchValue({
      name: customer.name,
      phone: customer.phone,
    });
  }

  deleteCustomer(id?: number): void {
    if (!id) {
      return;
    }

    if (this.isApiMode) {
      this.customerApiService.delete(id).subscribe({
        next: () => this.loadCustomers(),
      });
      return;
    }

    const customers = this.getLocalStorageValue<Customer[]>('customers') ?? [];
    const updated = customers.filter((item) => item.id !== id);
    this.setLocalStorageValue('customers', updated);
    this.loadCustomers();
  }

  private getLocalStorageValue<T>(key: string): T | null {
    if (typeof window === 'undefined') {
      return null;
    }

    const value = window.localStorage.getItem(key);
    return value ? (JSON.parse(value) as T) : null;
  }

  private setLocalStorageValue<T>(key: string, value: T): void {
    if (typeof window === 'undefined') {
      return;
    }

    window.localStorage.setItem(key, JSON.stringify(value));
  }

  private resetForm(): void {
    this.form.reset();
    this.editingId = null;
  }
}
