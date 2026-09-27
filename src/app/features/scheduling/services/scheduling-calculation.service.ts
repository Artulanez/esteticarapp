import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class SchedulingCalculationService {
  calculateScheduledValue(serviceValue: number, discountPercent: number): number {
    const safeServiceValue = Number(serviceValue) || 0;
    const safeDiscount = Number(discountPercent) || 0;

    const discountAmount = safeServiceValue * (safeDiscount / 100);
    return Number((safeServiceValue - discountAmount).toFixed(2));
  }

  calculateDiscountPercent(serviceValue: number, scheduledValue: number): number {
    const safeServiceValue = Number(serviceValue) || 0;
    const safeScheduledValue = Number(scheduledValue) || 0;

    if (safeServiceValue <= 0) {
      return 0;
    }

    const discount = ((safeServiceValue - safeScheduledValue) / safeServiceValue) * 100;
    return Number(Math.max(0, Math.min(100, discount)).toFixed(2));
  }
}
