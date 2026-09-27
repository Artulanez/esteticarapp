import { describe, expect, it } from 'vitest';
import { PHONE_PATTERN } from '../../../../shared/utils/phone-pattern';

describe('PHONE_PATTERN', () => {
  it('should accept a valid WhatsApp number without formatting', () => {
    expect(PHONE_PATTERN.test('81981546565')).toBe(true);
  });

  it('should accept a valid formatted WhatsApp number', () => {
    expect(PHONE_PATTERN.test('(81) 98154-6565')).toBe(true);
  });
});
