import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { Product } from '../../../products/models/product.model';
import { ServiceRecord, ServiceProductUsage } from '../../models/service.model';
import { ServiceStorageService } from '../../services/service-storage.service';

@Component({
  selector: 'app-service-form',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './service-form.component.html',
  styleUrl: './service-form.component.css',
})
export class ServiceFormComponent implements OnInit {
  form: FormGroup;
  services: ServiceRecord[] = [];
  products: Product[] = [];
  selectedProductId = '';
  quantityMl = 0;
  editingId: number | null = null;
  isProductsListVisible = false;
  private hasManualChargeOverride = false;

  constructor(
    private readonly fb: FormBuilder,
    private readonly router: Router,
    private readonly serviceStorageService: ServiceStorageService,
  ) {
    this.form = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      operationalValue: [0, [Validators.min(0)]],
      items: [[]],
      chargeValue: [0, [Validators.min(0)]],
    });

    this.form.get('operationalValue')?.valueChanges.subscribe(() => {
      if (!this.hasManualChargeOverride) {
        this.form.patchValue({ chargeValue: this.totalSuggestedValue }, { emitEvent: false });
      }
    });

    this.form.get('items')?.valueChanges.subscribe(() => {
      if (!this.hasManualChargeOverride) {
        this.form.patchValue({ chargeValue: this.totalSuggestedValue }, { emitEvent: false });
      }
    });
  }

  ngOnInit(): void {
    this.loadProducts();
    this.loadServices();
  }

  get availableProducts(): Product[] {
    return this.products.filter((product) => !this.currentItems.some((item) => item.productId === product.id));
  }

  get currentItems(): ServiceProductUsage[] {
    const raw = this.form.get('items')?.value ?? [];
    return raw as ServiceProductUsage[];
  }

  get totalProductValue(): number {
    return this.currentItems.reduce((sum, item) => sum + item.productValue, 0);
  }

  get totalSuggestedValue(): number {
    return this.currentItems.reduce((sum, item) => sum + (item.chargedValue ?? item.productValue), 0)
      + (this.form.get('operationalValue')?.value ?? 0);
  }

  get totalValue(): number {
    return Number((this.form.get('chargeValue')?.value ?? this.totalSuggestedValue).toFixed(2));
  }

  goToHome(): void {
    this.router.navigate(['']);
  }

  loadProducts(): void {
    this.products = this.serviceStorageService.getProducts();
  }

  loadServices(): void {
    this.services = this.serviceStorageService.getServices();
    this.serviceStorageService.syncServiceProductValues();
    this.services = this.serviceStorageService.getServices();
  }

  addProductToService(): void {
    if (!this.selectedProductId) {
      return;
    }

    const product = this.products.find((item) => item.id === Number(this.selectedProductId));

    if (!product) {
      return;
    }

    const quantity = Number(this.quantityMl) || 0;
    if (quantity <= 0) {
      return;
    }

    const existing = this.currentItems.find((item) => item.productId === product.id);
    const currentUnitValue = product.pricePerLiter;
    const productValue = (currentUnitValue / 1000) * quantity;

    const nextItems = [...this.currentItems];
    if (existing) {
      const index = nextItems.findIndex((item) => item.productId === product.id);
      nextItems[index] = {
        ...existing,
        quantityMl: quantity,
        unitValue: currentUnitValue,
        productValue: Number(productValue.toFixed(2)),
        chargedValue: existing.chargedValue ?? Number(productValue.toFixed(2)),
      };
    } else {
      nextItems.push({
        productId: product.id!,
        productName: product.name,
        quantityMl: quantity,
        unitValue: currentUnitValue,
        productValue: Number(productValue.toFixed(2)),
        chargedValue: Number(productValue.toFixed(2)),
      });
    }

    this.form.patchValue({ items: nextItems });
    this.selectedProductId = '';
    this.quantityMl = 0;
  }

  removeProduct(item: ServiceProductUsage): void {
    const updated = this.currentItems.filter((entry) => entry.productId !== item.productId);
    this.form.patchValue({ items: updated });
  }

  updateItemCharge(productId: number, value: number): void {
    const nextItems = this.currentItems.map((item) => {
      if (item.productId !== productId) {
        return item;
      }

      return {
        ...item,
        chargedValue: Number((value || 0).toFixed(2)),
      };
    });

    this.form.patchValue({ items: nextItems });
  }

  onChargeValueInput(value: number): void {
    this.hasManualChargeOverride = true;
    this.form.patchValue({ chargeValue: Number((value || 0).toFixed(2)) }, { emitEvent: false });
  }

  toggleProductsList(): void {
    this.isProductsListVisible = !this.isProductsListVisible;
  }

  submit(): void {
    if (this.form.invalid || this.currentItems.length === 0) {
      this.form.markAllAsTouched();
      return;
    }

    const services = this.serviceStorageService.getServices();
    const payload: ServiceRecord = {
      id: this.editingId ?? Date.now(),
      name: this.form.get('name')?.value,
      items: this.currentItems.map((item) => ({
        ...item,
        productValue: Number(item.productValue.toFixed(2)),
        chargedValue: Number((item.chargedValue ?? item.productValue).toFixed(2)),
      })),
      operationalValue: Number(this.form.get('operationalValue')?.value ?? 0),
      totalProductValue: Number(this.totalProductValue.toFixed(2)),
      totalValue: Number((this.form.get('chargeValue')?.value ?? this.totalSuggestedValue).toFixed(2)),
    };

    if (this.editingId !== null) {
      const index = services.findIndex((item) => item.id === this.editingId);
      if (index >= 0) {
        services[index] = payload;
      }
    } else {
      services.push(payload);
    }

    this.serviceStorageService.saveServices(services);
    this.resetForm();
    this.loadServices();
  }

  editService(service: ServiceRecord): void {
    this.editingId = service.id ?? null;
    this.hasManualChargeOverride = true;
    this.form.patchValue({
      name: service.name,
      operationalValue: service.operationalValue,
      items: service.items,
      chargeValue: service.totalValue,
    });
  }

  deleteService(id?: number): void {
    if (!id) {
      return;
    }

    const services = this.serviceStorageService.getServices();
    const updated = services.filter((item) => item.id !== id);
    this.serviceStorageService.saveServices(updated);
    this.loadServices();
  }

  resetForm(): void {
    this.form.reset({
      name: '',
      operationalValue: 0,
      items: [],
      chargeValue: 0,
    });
    this.selectedProductId = '';
    this.quantityMl = 0;
    this.editingId = null;
    this.hasManualChargeOverride = false;
  }
}
