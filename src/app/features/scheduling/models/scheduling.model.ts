export type SchedulingStatus = 'Pre-agendado' | 'Agendado' | 'Em andamento' | 'Cancelado' | 'Finalizado';

export interface SchedulingServiceSelection {
  id: number;
  name: string;
  totalValue: number;
}

export interface SchedulingCheckIn {
  notes?: string;
  vehicleObservation?: string;
  photos?: string[];
  checkedAt?: string;
}

export interface SchedulingRecord {
  id?: number;
  date: string;
  time: string;
  customerId?: number;
  customerName?: string;
  services: SchedulingServiceSelection[];
  status: SchedulingStatus;
  serviceValue: number;
  discountPercent: number;
  scheduledValue: number;
  observation?: string;
  checkIn?: SchedulingCheckIn;
}