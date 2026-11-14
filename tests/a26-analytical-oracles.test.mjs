import test from 'node:test';
import assert from 'node:assert/strict';
import {rectangularBuoyancy,electricalEnergy,cpa2d,sonarDepth,
 nmea0183Xor,idealWigleyVolume,sdofHeaveRatio,PROVENANCE}
 from '../scripts/a26-analytical-oracles.mjs';
test('independent analytic screens are synthetic, not candidate success or marine release',()=>{
 assert.equal(PROVENANCE.expectedFromCandidate,false);
 assert.equal(PROVENANCE.acceptedForUSV01Engineering,false);
 assert.match(PROVENANCE.kind,/SYNTHETIC/);
});
test('1 cubic metre submerged rectangular prism displaces density*g Newtons',()=>{
 const x=rectangularBuoyancy({lengthM:2,beamM:1,draftM:0.5,densityKgM3:1025});
 assert.equal(x.volumeM3,1);
 assert.ok(Math.abs(x.buoyancyN-10051.81625)<1e-9);
});
test('constant nonnegative electrical power integrates to watt-hours',()=>{
 assert.equal(electricalEnergy({powerW:1200,durationS:900}).energyWh,300);
 assert.equal(electricalEnergy({powerW:0,durationS:100}).energyWh,0);
});
test('independent geometric closest point of approach in a fixed Cartesian frame',()=>{
 const x=cpa2d({relativePositionM:[100,0],relativeVelocityMS:[-5,0]});
 assert.equal(x.tcpaS,20);
 assert.equal(x.dcpaM,0);
 const divergent=cpa2d({relativePositionM:[100,0],relativeVelocityMS:[5,0]});
 assert.equal(divergent.tcpaS,0);
 assert.equal(divergent.dcpaM,100);
});
test('sonar echo round trip 20 ms at 1500 m/s implies 15 m, not validated bathymetry',()=>{
 assert.equal(sonarDepth({speedOfSoundMS:1500,roundTripTimeS:0.02}).depthM,15);
});
test('NMEA 0183 public GPGGA illustrative XOR fixture has checksum 47',()=>{
 assert.equal(nmea0183Xor('GPGGA,123519,4807.038,N,01131.000,E,1,08,0.9,545.4,M,46.9,M,,').checksum,'47');
 assert.equal(nmea0183Xor('A').checksum,'41');
});
test('idealized Wigley volume derives from stated breadth function integral',()=>{
 assert.ok(Math.abs(idealWigleyVolume({lengthM:9,beamM:2,draftM:1}).volumeM3-8)<1e-12);
});
test('linear heave surrogate gives unity static response and tenfold resonant amplitude',()=>{
 assert.equal(sdofHeaveRatio({massKg:5,dampingNSM:1,stiffnessNM:20,omegaRadS:0}).responseRatio,1);
 assert.equal(sdofHeaveRatio({massKg:5,dampingNSM:1,stiffnessNM:20,omegaRadS:2}).responseRatio,10);
});
test('unit-invalid, degenerate and potentially unsafe inputs fail closed',()=>{
 for(const call of [
  ()=>rectangularBuoyancy({lengthM:0,beamM:1,draftM:1,densityKgM3:1025}),
  ()=>rectangularBuoyancy({lengthM:2,beamM:NaN,draftM:0.5,densityKgM3:1025}),
  ()=>electricalEnergy({powerW:-1,durationS:10}),
  ()=>cpa2d({relativePositionM:[1,0],relativeVelocityMS:[0,0]}),
  ()=>cpa2d({relativePositionM:[1,2,3],relativeVelocityMS:[1,0]}),
  ()=>sonarDepth({speedOfSoundMS:1500,roundTripTimeS:-0.01}),
  ()=>nmea0183Xor('$GPGGA,*47'),
  ()=>nmea0183Xor('A'.repeat(90)),
  ()=>idealWigleyVolume({lengthM:0,beamM:1,draftM:1}),
  ()=>sdofHeaveRatio({massKg:5,dampingNSM:0,stiffnessNM:20,omegaRadS:2})
 ])assert.throws(call,/Analytical reference HOLD/);
});
