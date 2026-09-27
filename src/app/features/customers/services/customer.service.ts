import { Injectable } from '@angular/core';
import { Customer } from '../models/customer.model';

@Injectable({
  providedIn: 'root',
})
export class CustomerService {
  private readonly customers: Customer[] = [];

  create(customer: Customer): Customer {
    const newCustomer = {
      ...customer,
      id: Date.now(),
    };

    this.customers.push(newCustomer);
    return newCustomer;
  }

  list(): Customer[] {
    return [...this.customers];
  }
}
