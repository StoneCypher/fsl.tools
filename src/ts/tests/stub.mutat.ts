
import { double } from '../stub.js';

describe('index baseline', () => {
  test('double() doubles a number', () => {
    expect(double(2)).toBe(4);
  });
});
