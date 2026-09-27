import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { Product } from '../../models/product.model';
import { ProductApiService } from '../../services/product-api.service';
import { ServiceStorageService } from '../../../services/services/service-storage.service';

@Component({
  selector: 'app-product-form',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './product-form.component.html',
  styleUrl: './product-form.component.css',
})
export class ProductFormComponent implements OnInit {
  form: FormGroup;
  products: Product[] = [];
  filteredProducts: Product[] = [];
  searchTerm = '';
  page = 1;
  pageSize = 15;
  pageOptions = [15, 30, 50];
  isApiMode = false;
  editingId: number | null = null;

  constructor(
    private readonly fb: FormBuilder,
    private readonly productApiService: ProductApiService,
    private readonly router: Router,
    private readonly serviceStorageService: ServiceStorageService,
  ) {
    this.form = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      functionName: ['', [Validators.required, Validators.minLength(2)]],
      brand: ['', [Validators.required, Validators.minLength(2)]],
      pricePerLiter: [0, [Validators.required, Validators.min(0.01)]],
    });
  }

  ngOnInit(): void {
    this.loadProducts();
  }

  goToHome(): void {
    this.router.navigate(['']);
  }

  togglePersistenceMode(): void {
    this.isApiMode = !this.isApiMode;
    this.loadProducts();
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.filteredProducts.length / this.pageSize));
  }

  get paginatedProducts(): Product[] {
    const start = (this.page - 1) * this.pageSize;
    return this.filteredProducts.slice(start, start + this.pageSize);
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

  private loadProducts(): void {
    if (this.isApiMode) {
      this.productApiService.list().subscribe({
        next: (items) => {
          this.products = items;
          this.applyFilter();
        },
        error: () => {
          this.products = [];
          this.filteredProducts = [];
        },
      });
      return;
    }

    const saved = this.getLocalStorageValue<Product[]>('products');
    this.products = saved ?? [];
    this.applyFilter();
  }

  private applyFilter(): void {
    const term = this.searchTerm.trim().toLowerCase();

    this.filteredProducts = this.products.filter((product) => {
      if (!term) {
        return true;
      }

      return product.name.toLowerCase().includes(term);
    });

    const maxPage = Math.max(1, Math.ceil(this.filteredProducts.length / this.pageSize));
    if (this.page > maxPage) {
      this.page = maxPage;
    }
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const product: Product = this.form.value;

    if (this.isApiMode) {
      const request$ = this.editingId !== null
        ? this.productApiService.update(this.editingId, product)
        : this.productApiService.create(product);

      request$.subscribe({
        next: () => {
          this.resetForm();
          this.loadProducts();
        },
      });
      return;
    }

    const products = this.getLocalStorageValue<Product[]>('products') ?? [];

    if (this.editingId !== null) {
      const index = products.findIndex((item) => item.id === this.editingId);
      if (index >= 0) {
        products[index] = { ...product, id: this.editingId };
      }
    } else {
      products.push({ ...product, id: Date.now() });
    }

    this.setLocalStorageValue('products', products);
    this.serviceStorageService.syncServiceProductValues();
    this.resetForm();
    this.loadProducts();
  }

  editProduct(product: Product): void {
    this.editingId = product.id ?? null;
    this.form.patchValue({
      name: product.name,
      functionName: product.functionName,
      brand: product.brand,
      pricePerLiter: product.pricePerLiter,
    });
  }

  deleteProduct(id?: number): void {
    if (!id) {
      return;
    }

    if (this.isApiMode) {
      this.productApiService.delete(id).subscribe({
        next: () => this.loadProducts(),
      });
      return;
    }

    const products = this.getLocalStorageValue<Product[]>('products') ?? [];
    const updated = products.filter((item) => item.id !== id);
    this.setLocalStorageValue('products', updated);
    this.serviceStorageService.syncServiceProductValues();
    this.loadProducts();
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
