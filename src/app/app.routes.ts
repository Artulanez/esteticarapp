import { Routes } from '@angular/router';
import { CustomerFormComponent } from './features/customers/pages/customer-form/customer-form.component';
import { HomeComponent } from './features/home/pages/home.component';
import { ProductFormComponent } from './features/products/pages/product-form/product-form.component';
import { SchedulingFormComponent } from './features/scheduling/pages/scheduling-form/scheduling-form.component';
import { ServiceFormComponent } from './features/services/pages/service-form/service-form.component';

export const routes: Routes = [
  {
    path: '',
    component: HomeComponent,
  },
  {
    path: 'clientes',
    component: CustomerFormComponent,
  },
  {
    path: 'produtos',
    component: ProductFormComponent,
  },
  {
    path: 'servicos',
    component: ServiceFormComponent,
  },
  {
    path: 'agendamentos',
    component: SchedulingFormComponent,
  },
];
