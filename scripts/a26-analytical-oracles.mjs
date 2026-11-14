/**
 * Trusted, deterministic A18/A24 first-principles analytic screening functions.
 * All scenarios are SYNTHETIC, independent of third-party project source,
 * NOT accepted marine validation, and never a vessel performance prediction.
 */
const finite=(name,x,{positive=false,nonnegative=false}={})=>{
 if(typeof x!=='number'||!Number.isFinite(x)||(positive&&x<=0)||(nonnegative&&x<0))
  throw Error('Analytical reference HOLD: '+name+' must be finite and physically admissible');
 return x;
};
const vec=(name,v)=>{
 if(!Array.isArray(v)||v.length!==2)throw Error('Analytical reference HOLD: '+name+' requires 2D vector');
 return v.map((x,i)=>finite(name+'['+i+']',x));
};
export const PROVENANCE={
 kind:'SYNTHETIC_INDEPENDENT_ANALYTICAL_SCREEN',
 source:'STANDARD_ALGEBRAIC_IDENTITIES_NOT_THIRD_PARTY_SOLVER',
 expectedFromCandidate:false,
 acceptedForUSV01Engineering:false,
 scope:'NO_VESSEL_SPECIFIC_PARAMETERS_AND_NO_PHYSICAL_ACTUATION'
};
export function rectangularBuoyancy({lengthM,beamM,draftM,densityKgM3,gravityMS2=9.80665}){
 const volumeM3=finite('lengthM',lengthM,{positive:true})*finite('beamM',beamM,{positive:true})*finite('draftM',draftM,{positive:true});
 return {volumeM3,buoyancyN:volumeM3*finite('densityKgM3',densityKgM3,{positive:true})*finite('gravityMS2',gravityMS2,{positive:true}),reference:PROVENANCE};
}
export function electricalEnergy({powerW,durationS}){
 return {energyWh:finite('powerW',powerW,{nonnegative:true})*finite('durationS',durationS,{nonnegative:true})/3600,reference:PROVENANCE};
}
export function cpa2d({relativePositionM,relativeVelocityMS}){
 const [rx,ry]=vec('relativePositionM',relativePositionM),[vx,vy]=vec('relativeVelocityMS',relativeVelocityMS);
 const square=vx*vx+vy*vy;
 if(square<=0)throw Error('Analytical reference HOLD: no unique CPA time for zero relative speed');
 const tcpaUnclampedS=-(rx*vx+ry*vy)/square;
 const tcpaS=Math.max(0,tcpaUnclampedS);
 return {tcpaS,dcpaM:Math.hypot(rx+vx*tcpaS,ry+vy*tcpaS),
  conventions:'2D inertial Cartesian, relative target-minus-own, future time t>=0',reference:PROVENANCE};
}
export function sonarDepth({speedOfSoundMS,roundTripTimeS}){
 return {depthM:finite('speedOfSoundMS',speedOfSoundMS,{positive:true})*finite('roundTripTimeS',roundTripTimeS,{nonnegative:true})/2,reference:PROVENANCE};
}
export function nmea0183Xor(payload){
 if(typeof payload!=='string'||!payload.length||payload.length>82||/[^\x20-\x7e]/.test(payload)||payload.includes('$')||payload.includes('*'))
  throw Error('Analytical reference HOLD: bare ASCII NMEA payload only; no framing characters');
 let xor=0;for(const c of payload)xor^=c.charCodeAt(0);
 return {checksum:xor.toString(16).toUpperCase().padStart(2,'0'),reference:PROVENANCE};
}
/** Idealized symmetric Wigley immersed breadth:
 * b(x,z)=B(1-(2x/L)^2)(1-(z/T)^2), x∈[-L/2,L/2], z∈[-T,0].
 * Algebraic integral ∫∫b dx dz = (4/9)LBT. Not an actual hull validation.
 */
export function idealWigleyVolume({lengthM,beamM,draftM}){
 return {volumeM3:(4/9)*finite('lengthM',lengthM,{positive:true})*
  finite('beamM',beamM,{positive:true})*finite('draftM',draftM,{positive:true}),reference:PROVENANCE};
}
/** Simple linear SDOF heave transfer magnitude |k/[k-mω² + icω]|.
 * A surrogate oscillator screen, NOT an independently validated strip-theory RAO.
 */
export function sdofHeaveRatio({massKg,dampingNSM,stiffnessNM,omegaRadS}){
 const m=finite('massKg',massKg,{positive:true}),c=finite('dampingNSM',dampingNSM,{nonnegative:true});
 const k=finite('stiffnessNM',stiffnessNM,{positive:true}),w=finite('omegaRadS',omegaRadS,{nonnegative:true});
 const d=Math.hypot(k-m*w*w,c*w);
 if(d<=0)throw Error('Analytical reference HOLD: singular undamped resonance');
 return {responseRatio:k/d,reference:PROVENANCE};
}
