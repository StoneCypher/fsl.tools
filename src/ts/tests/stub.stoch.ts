
import * as fc    from 'fast-check';
import { double } from '../stub.js';

describe('stochastic baseline', () => {
  test('stoch: double() produces a number', () => {
    fc.assert( 
      fc.property( fc.float(), (n: number) => {
        expect(typeof double(n)).toBe('number');
      })
    )
  });
});
