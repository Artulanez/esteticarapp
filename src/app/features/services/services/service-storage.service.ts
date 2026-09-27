import { Injectable } from '@angular/core';
import { Product } from '../../products/models/product.model';
import { ServiceRecord } from '../models/service.model';

@Injectable({ providedIn: 'root' })
export class ServiceStorageService {
  private readonly storageKey = 'services';
  private readonly productKey = 'products';

  getServices(): ServiceRecord[] {
    return this.getLocalStorageValue<ServiceRecord[]>(this.storageKey) ?? [];
  }

  saveServices(services: ServiceRecord[]): void {
    this.setLocalStorageValue(this.storageKey, services);
  }

  getProducts(): Product[] {
    return this.getLocalStorageValue<Product[]>(this.productKey) ?? [];
  }

  syncServiceProductValues(): void {
    const services = this.getServices();
    const products = this.getProducts();

    const updatedServices = services.map((service) => {
      const recalculatedItems = service.items.map((item) => {
        const product = products.find((entry) => entry.id === item.productId);
        const currentUnitValue = product?.pricePerLiter ?? item.unitValue ?? 0;
        const currentProductValue = (currentUnitValue / 1000) * item.quantityMl;
        const fallbackChargedValue = item.chargedValue ?? currentProductValue;

        return {
          ...item,
          unitValue: currentUnitValue,
          productValue: Number(currentProductValue.toFixed(2)),
          chargedValue: Number(fallbackChargedValue.toFixed(2)),
        };
      });

      const totalProductValue = recalculatedItems.reduce((sum, item) => sum + item.productValue, 0);
      const recalculatedSuggestedTotal = recalculatedItems.reduce((sum, item) => sum + (item.chargedValue ?? item.productValue), 0)
        + (service.operationalValue ?? 0);

      const shouldKeepManualCharge = typeof service.totalValue === 'number' && service.totalValue >= 0;
      const totalValue = shouldKeepManualCharge ? service.totalValue : recalculatedSuggestedTotal;

      return {
        ...service,
        items: recalculatedItems,
        totalProductValue: Number(totalProductValue.toFixed(2)),
        totalValue: Number(totalValue.toFixed(2)),
      };
    });

    this.saveServices(updatedServices);
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
}
