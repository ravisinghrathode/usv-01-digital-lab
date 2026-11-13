import {describe,expect,it} from 'vitest';
import {evaluateThreeGridConvergence} from '../src/core/verification/ThreeGridConvergence.ts';

const d=(x:string)=>'sha256:'+x.repeat(64).slice(0,64);
describe('Three-grid CFD convergence screen',()=>{
  it('computes positive observed order, Richardson extrapolation and fine-grid GCI for monotonic equal-ratio sequence',()=>{
    // Exact second-order synthetic sequence: phi(h)=1+0.1*h^2, h={1,2,4}.
    const result=evaluateThreeGridConvergence([
      {id:'fine',characteristicCellSize:1,value:1.1,sourceDigest:d('a')},
      {id:'medium',characteristicCellSize:2,value:1.4,sourceDigest:d('b')},
      {id:'coarse',characteristicCellSize:4,value:2.6,sourceDigest:d('c')}
    ]);
    expect(result.status).toBe('GCI_SCREEN_PASS_UNCERTIFIED');
    expect(result.observedOrder).toBeCloseTo(2,10);
    expect(result.refinementRatio).toBeCloseTo(2,10);
    expect(result.extrapolatedValue).toBeCloseTo(1,10);
    expect(result.fineGridGciFraction).toBeGreaterThan(0);
    expect(result.engineeringValidated).toBe(false);
    expect(result.engineeringReleaseAuthorized).toBe(false);
  });
  it('rejects oscillatory, unequal-ratio and unhashed evidence rather than manufacturing uncertainty',()=>{
    expect(evaluateThreeGridConvergence([
      {id:'f',characteristicCellSize:1,value:1.0,sourceDigest:d('a')},
      {id:'m',characteristicCellSize:2,value:1.2,sourceDigest:d('b')},
      {id:'c',characteristicCellSize:4,value:1.1,sourceDigest:d('c')}
    ]).status).toBe('REJECTED');
    expect(evaluateThreeGridConvergence([
      {id:'f',characteristicCellSize:1,value:1.0,sourceDigest:d('a')},
      {id:'m',characteristicCellSize:2,value:1.1,sourceDigest:d('b')},
      {id:'c',characteristicCellSize:5,value:1.5,sourceDigest:d('c')}
    ]).issues.join(' ')).toMatch(/Refinement ratios/);
    expect(evaluateThreeGridConvergence([
      {id:'f',characteristicCellSize:1,value:1.0,sourceDigest:'untrusted'},
      {id:'m',characteristicCellSize:2,value:1.1,sourceDigest:d('b')},
      {id:'c',characteristicCellSize:4,value:1.5,sourceDigest:d('c')}
    ]).status).toBe('REJECTED');
  });
});
