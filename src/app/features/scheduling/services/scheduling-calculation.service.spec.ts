import { SchedulingCalculationService } from './scheduling-calculation.service';

describe('SchedulingCalculationService', () => {
  let service: SchedulingCalculationService;

  beforeEach(() => {
    service = new SchedulingCalculationService();
  });

  it('calcula o valor do agendamento a partir do percentual de desconto', () => {
    expect(service.calculateScheduledValue(250, 10)).toBe(225);
  });

  it('calcula o percentual de desconto a partir do valor do agendamento', () => {
    expect(service.calculateDiscountPercent(250, 200)).toBeCloseTo(20, 2);
  });

  it('retorna zero para valores vazios ou inválidos', () => {
    expect(service.calculateScheduledValue(0, 10)).toBe(0);
    expect(service.calculateDiscountPercent(0, 100)).toBe(0);
  });
});
