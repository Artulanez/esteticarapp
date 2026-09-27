import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { Customer } from '../../../customers/models/customer.model';
import { ServiceRecord } from '../../../services/models/service.model';
import { ServiceStorageService } from '../../../services/services/service-storage.service';
import { SchedulingCalculationService } from '../../services/scheduling-calculation.service';
import { SchedulingRecord, SchedulingStatus } from '../../models/scheduling.model';

@Component({
  selector: 'app-scheduling-form',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './scheduling-form.component.html',
  styleUrl: './scheduling-form.component.css',
})
export class SchedulingFormComponent implements OnInit {
  form: FormGroup;
  schedulingList: SchedulingRecord[] = [];
  customers: Customer[] = [];
  services: ServiceRecord[] = [];
  editingId: number | null = null;
  selectedServiceIds: number[] = [];
  selectedServiceId = '';
  readonly statuses: SchedulingStatus[] = ['Pre-agendado', 'Agendado', 'Em andamento', 'Cancelado', 'Finalizado'];
  readonly whatsappBaseUrl = 'https://wa.me/';

  constructor(
    private readonly fb: FormBuilder,
    private readonly router: Router,
    private readonly serviceStorageService: ServiceStorageService,
    private readonly schedulingCalculationService: SchedulingCalculationService,
  ) {
    this.form = this.fb.group({
      date: ['', Validators.required],
      time: ['', Validators.required],
      customerId: ['', Validators.required],
      status: ['Pre-agendado', Validators.required],
      services: [[]],
      serviceValue: [0, [Validators.required, Validators.min(0)]],
      discountPercent: [0, [Validators.min(0), Validators.max(100)]],
      scheduledValue: [0, [Validators.required, Validators.min(0)]],
      observation: [''],
      checkIn: this.fb.group({
        notes: [''],
        vehicleObservation: [''],
        photos: [[]],
        checkedAt: [''],
      }),
    });

    this.form.get('discountPercent')?.valueChanges.subscribe((value) => {
      const serviceValue = this.form.get('serviceValue')?.value ?? 0;
      const nextScheduledValue = this.schedulingCalculationService.calculateScheduledValue(serviceValue, value);
      this.form.patchValue({ scheduledValue: nextScheduledValue }, { emitEvent: false });
    });

    this.form.get('scheduledValue')?.valueChanges.subscribe((value) => {
      const serviceValue = this.form.get('serviceValue')?.value ?? 0;
      const currentDiscount = this.form.get('discountPercent')?.value ?? 0;

      if (this.form.get('scheduledValue')?.dirty && Number(value) > 0 && Number(serviceValue) > 0) {
        const computedDiscount = this.schedulingCalculationService.calculateDiscountPercent(serviceValue, value);
        if (computedDiscount !== currentDiscount) {
          this.form.patchValue({ discountPercent: computedDiscount }, { emitEvent: false });
        }
      }
    });
  }

  ngOnInit(): void {
    this.loadData();
  }

  get serviceOptions(): ServiceRecord[] {
    return this.services.filter((item) => !this.selectedServiceIds.includes(item.id ?? -1));
  }

  get selectedServices(): ServiceRecord[] {
    return this.services.filter((item) => this.selectedServiceIds.includes(item.id ?? -1));
  }

  get currentServiceValue(): number {
    return this.selectedServices.reduce((sum, service) => sum + (service.totalValue ?? 0), 0);
  }

  get selectedCustomerName(): string {
    const customerId = Number(this.form.get('customerId')?.value ?? 0);
    const customer = this.customers.find((item) => item.id === customerId);
    return customer?.name ?? 'Cliente não selecionado';
  }

  get selectedCustomerPhone(): string {
    const customerId = Number(this.form.get('customerId')?.value ?? 0);
    const customer = this.customers.find((item) => item.id === customerId);
    return customer?.phone ?? '';
  }

  get checkInPhotoPreviews(): string[] {
    return this.form.get('checkIn.photos')?.value ?? [];
  }

  goToHome(): void {
    this.router.navigate(['']);
  }

  private loadData(): void {
    this.customers = this.getLocalStorageValue<Customer[]>('customers') ?? [];
    this.services = this.getLocalStorageValue<ServiceRecord[]>('services') ?? [];
    this.loadScheduling();
  }

  private loadScheduling(): void {
    const schedules = this.getLocalStorageValue<SchedulingRecord[]>('schedules') ?? [];
    this.schedulingList = [...schedules].sort((a, b) => {
      const isCancelledA = a.status === 'Cancelado';
      const isCancelledB = b.status === 'Cancelado';

      if (isCancelledA !== isCancelledB) {
        return Number(isCancelledA) - Number(isCancelledB);
      }

      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      return dateA - dateB;
    });
  }

  addServiceToSchedule(serviceId: number): void {
    if (!serviceId) {
      return;
    }

    const hasService = this.selectedServiceIds.includes(serviceId);
    if (hasService) {
      this.selectedServiceId = '';
      return;
    }

    this.selectedServiceIds = [...this.selectedServiceIds, serviceId];
    this.selectedServiceId = '';
    this.updateServiceTotals();
  }

  removeServiceFromSchedule(serviceId: number): void {
    this.selectedServiceIds = this.selectedServiceIds.filter((id) => id !== serviceId);
    this.updateServiceTotals();
  }

  updateServiceTotals(): void {
    const currentServices = this.selectedServices.map((service) => ({
      id: service.id ?? Date.now() + Math.random(),
      name: service.name,
      totalValue: service.totalValue ?? 0,
    }));

    this.form.patchValue({
      services: currentServices,
      serviceValue: currentServices.reduce((sum, item) => sum + (item.totalValue ?? 0), 0),
    }, { emitEvent: false });

    const discount = Number(this.form.get('discountPercent')?.value ?? 0);
    const serviceValue = Number(this.form.get('serviceValue')?.value ?? 0);
    this.form.patchValue({
      scheduledValue: this.schedulingCalculationService.calculateScheduledValue(serviceValue, discount),
    }, { emitEvent: false });
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const payload = this.buildSchedulingPayload();
    const schedules = this.getLocalStorageValue<SchedulingRecord[]>('schedules') ?? [];

    if (this.editingId !== null) {
      const index = schedules.findIndex((item) => item.id === this.editingId);
      if (index >= 0) {
        schedules[index] = payload;
      }
    } else {
      schedules.push(payload);
    }

    this.setLocalStorageValue('schedules', schedules);
    this.resetForm();
    this.loadScheduling();
  }

  completeVehicleCheckIn(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const customerPhone = this.getCustomerPhoneById(Number(this.form.get('customerId')?.value));
    if (!customerPhone) {
      return;
    }

    const payload = this.buildSchedulingPayload();
    payload.status = 'Em andamento';
    payload.checkIn = {
      notes: this.form.get('checkIn.notes')?.value ?? '',
      vehicleObservation: this.form.get('checkIn.vehicleObservation')?.value ?? '',
      photos: this.form.get('checkIn.photos')?.value ?? [],
      checkedAt: new Date().toISOString(),
    };

    const schedules = this.getLocalStorageValue<SchedulingRecord[]>('schedules') ?? [];

    if (this.editingId !== null) {
      const index = schedules.findIndex((item) => item.id === this.editingId);
      if (index >= 0) {
        schedules[index] = payload;
      }
    } else {
      schedules.push(payload);
    }

    this.setLocalStorageValue('schedules', schedules);
    this.openWhatsApp(customerPhone, this.buildCheckInMessage(payload));
    this.resetForm();
    this.loadScheduling();
  }

  onCheckInPhotosSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files ?? []);

    if (!files.length) {
      return;
    }

    const fileReaders = files.map(
      (file) =>
        new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result ?? ''));
          reader.onerror = () => reject(reader.error);
          reader.readAsDataURL(file);
        }),
    );

    Promise.all(fileReaders)
      .then((photos) => {
        const currentPhotos = this.form.get('checkIn.photos')?.value ?? [];
        const nextPhotos = [...currentPhotos, ...photos];
        this.form.get('checkIn')?.patchValue({ photos: nextPhotos }, { emitEvent: false });
      })
      .finally(() => {
        input.value = '';
      });
  }

  removeCheckInPhoto(index: number): void {
    const currentPhotos = [...(this.form.get('checkIn.photos')?.value ?? [])];
    currentPhotos.splice(index, 1);
    this.form.get('checkIn')?.patchValue({ photos: currentPhotos }, { emitEvent: false });
  }

  editSchedule(schedule: SchedulingRecord): void {
    this.editingId = schedule.id ?? null;
    this.selectedServiceIds = schedule.services.map((item) => item.id);
    this.selectedServiceId = '';
    this.form.patchValue({
      date: schedule.date,
      time: schedule.time || '09:00',
      customerId: schedule.customerId,
      status: schedule.status,
      services: schedule.services,
      serviceValue: schedule.serviceValue,
      discountPercent: schedule.discountPercent,
      scheduledValue: schedule.scheduledValue,
      observation: schedule.observation ?? '',
      checkIn: {
        notes: schedule.checkIn?.notes ?? '',
        vehicleObservation: schedule.checkIn?.vehicleObservation ?? '',
        photos: schedule.checkIn?.photos ?? [],
        checkedAt: schedule.checkIn?.checkedAt ?? '',
      },
    });
  }

  deleteSchedule(id?: number): void {
    if (!id) {
      return;
    }

    const schedules = this.getLocalStorageValue<SchedulingRecord[]>('schedules') ?? [];
    const updated = schedules.filter((item) => item.id !== id);
    this.setLocalStorageValue('schedules', updated);
    this.loadScheduling();
  }

  resetForm(): void {
    this.form.reset({
      status: 'Pre-agendado',
      discountPercent: 0,
      serviceValue: 0,
      scheduledValue: 0,
      observation: '',
      services: [],
      date: '',
      time: '',
      customerId: '',
      checkIn: {
        notes: '',
        vehicleObservation: '',
        photos: [],
        checkedAt: '',
      },
    });
    this.selectedServiceIds = [];
    this.selectedServiceId = '';
    this.editingId = null;
  }

  sendReminderMessage(schedule?: SchedulingRecord): void {
    const phone = schedule ? this.getCustomerPhoneById(schedule.customerId) : this.selectedCustomerPhone;
    if (!phone) {
      return;
    }

    const message = schedule ? this.buildReminderMessage(schedule) : this.buildReminderMessage();
    this.openWhatsApp(phone, message);
  }

  sendFeedbackMessage(schedule: SchedulingRecord): void {
    const phone = this.getCustomerPhoneById(schedule.customerId);
    if (!phone) {
      return;
    }

    const message = this.buildFeedbackMessage(schedule);
    this.openWhatsApp(phone, message);
  }

  canSendReminder(schedule: SchedulingRecord): boolean {
    return schedule.status !== 'Finalizado' && schedule.status !== 'Cancelado';
  }

  canSendFeedback(schedule: SchedulingRecord): boolean {
    return schedule.status === 'Finalizado';
  }

  private getCustomerPhoneById(customerId?: number): string {
    const customer = this.customers.find((item) => item.id === customerId);
    return customer?.phone ?? '';
  }

  private buildReminderMessage(schedule?: SchedulingRecord): string {
    const customerName = schedule?.customerName ?? this.selectedCustomerName;
    const serviceNames = schedule
      ? (schedule.services?.map((service) => service.name).join(', ') || 'Atendimento personalizado')
      : this.selectedServices.map((service) => service.name).join(', ');
    const dateText = schedule ? this.formatDateForMessage(schedule.date) : this.formatDateForMessage(this.form.get('date')?.value);
    const timeText = schedule ? (schedule.time || 'horário a combinar') : (this.form.get('time')?.value || 'horário a combinar');

    return [
      'Olá, ' + customerName + '!',
      '',
      'Este é um lembrete do seu agendamento na EsteticarApp.',
      'Data: ' + dateText,
      'Horário: ' + timeText,
      'Serviços: ' + (serviceNames || 'Atendimento personalizado'),
      '',
      'Por favor, chegue com 10 minutos de antecedência para que possamos iniciar o atendimento com agilidade e conforto.',
      'Agradecemos pela confiança e estamos à disposição para cuidar do seu veículo com excelência.',
      '',
      'Atenciosamente,',
      'Equipe EsteticarApp',
    ].join('\n');
  }

  private buildFeedbackMessage(schedule: SchedulingRecord): string {
    const servicesText = (schedule.services?.map((service) => service.name).join(', ')) || 'atendimento';
    const dateText = this.formatDateForMessage(schedule.date);

    return [
      'Olá, ' + (schedule.customerName || 'cliente') + '!',
      '',
      'Agradecemos pela escolha da EsteticarApp e pelo carinho com o seu veículo.',
      'Seu agendamento para ' + servicesText + ' foi concluído em ' + dateText + '.',
      '',
      'Sua avaliação é muito importante para nós. Ficaremos gratos se puder compartilhar sua experiência sobre o atendimento, qualidade do serviço e cuidado com o seu veículo.',
      'Se preferir, responda esta mensagem com um texto breve contando como o serviço foi executado e se ficou satisfeito com o resultado.',
      '',
      'Muito obrigado pela confiança!',
      'Equipe EsteticarApp',
    ].join('\n');
  }

  private buildCheckInMessage(schedule: SchedulingRecord): string {
    const servicesText = (schedule.services?.map((service) => service.name).join(', ')) || 'atendimento';
    const dateText = this.formatDateForMessage(schedule.date);
    const notes = schedule.checkIn?.notes || 'Sem observações de atendimento do cliente.';
    const vehicleObservation = schedule.checkIn?.vehicleObservation || 'Nenhuma marca ou dano foi registrado no recebimento.';
    const photosText = (schedule.checkIn?.photos?.length ?? 0) > 0
      ? schedule.checkIn?.photos?.map((photo) => `- ${photo}`).join('\n') || 'Nenhuma foto registrada.'
      : 'Nenhuma foto registrada.';

    return [
      'Olá, ' + (schedule.customerName || 'cliente') + '!',
      '',
      'Seu veículo entrou em check-in na EsteticarApp.',
      'Serviços agendados: ' + servicesText,
      'Data: ' + dateText,
      'Horário: ' + (schedule.time || 'a confirmar'),
      '',
      'Observações do atendimento:',
      notes,
      '',
      'Observações do veículo no recebimento:',
      vehicleObservation,
      '',
      'Fotos registradas no check-in:',
      photosText,
      '',
      'Seu agendamento está em andamento e nossa equipe seguirá com o cuidado do seu veículo.',
      'Atenciosamente,',
      'Equipe EsteticarApp',
    ].join('\n');
  }

  private buildSchedulingPayload(): SchedulingRecord {
    const checkIn = this.form.get('checkIn')?.value ?? {};

    return {
      id: this.editingId ?? Date.now(),
      date: this.form.get('date')?.value,
      time: this.form.get('time')?.value || '00:00',
      customerId: Number(this.form.get('customerId')?.value),
      customerName: this.selectedCustomerName,
      services: this.form.get('services')?.value ?? [],
      status: this.form.get('status')?.value,
      serviceValue: Number(this.form.get('serviceValue')?.value ?? 0),
      discountPercent: Number(this.form.get('discountPercent')?.value ?? 0),
      scheduledValue: Number(this.form.get('scheduledValue')?.value ?? 0),
      observation: this.form.get('observation')?.value ?? '',
      checkIn: {
        notes: checkIn.notes ?? '',
        vehicleObservation: checkIn.vehicleObservation ?? '',
        photos: checkIn.photos ?? [],
        checkedAt: checkIn.checkedAt ?? '',
      },
    };
  }

  private formatDateForMessage(dateValue: string): string {
    if (!dateValue) {
      return 'a confirmar';
    }

    const parsedDate = new Date(dateValue + 'T00:00:00');
    if (Number.isNaN(parsedDate.getTime())) {
      return dateValue;
    }

    return parsedDate.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  }

  private openWhatsApp(phone: string, message: string): void {
    const cleaned = this.normalizePhone(phone);
    if (!cleaned) {
      return;
    }

    const encodedMessage = encodeURIComponent(message);
    const baseUrl = `${this.whatsappBaseUrl}${cleaned}?text=${encodedMessage}`;
    window.open(baseUrl, '_blank');
  }

  private normalizePhone(value: string): string {
    const digits = value.replace(/\D/g, '');
    if (!digits) {
      return '';
    }

    if (digits.length === 13 && digits.startsWith('55')) {
      return digits;
    }

    if (digits.length === 11 || digits.length === 10) {
      return `55${digits}`;
    }

    if (digits.length > 11) {
      return digits.startsWith('55') ? digits : `55${digits}`;
    }

    return digits;
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
