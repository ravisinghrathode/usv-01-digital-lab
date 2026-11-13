/**
 * USV-01 Digital Engineering Lab — EXPERIMENTAL naval visualizations.
 * IMPORTANT: The planing routine below is a legacy uncalibrated heuristic, not
 * a classical Savitsky trim/force/moment equilibrium solver. Its apparent
 * resistance, trim, transition and power outputs are NOT engineering predictions.
 * Do not use for design release, motor sizing, acceptance or certification.
 */

export interface SavitskyInputs {
  massKg: number; // Vessel full load displacement in kg
  beamM: number; // Waterline beam in meters (b)
  deadriseDeg: number; // Deadrise angle beta in degrees (10° to 30°)
  lcgM: number; // Longitudinal center of gravity forward of transom (m)
  shaftAngleDeg?: number; // Propeller shaft angle relative to baseline (deg)
}

export interface SpeedResistancePoint {
  speedKnots: number;
  speedMs: number;
  froudeBeam: number; // Cv = V / sqrt(g * b)
  trimDeg: number; // tau
  wettedLengthRatio: number; // lambda = Lk/b or mean
  reynoldsNumber: number;
  frictionalDragKN: number;
  pressureDragKN: number;
  sprayDragKN: number;
  totalResistanceKN: number;
  effectivePowerKW: number;
  planingRegime: 'Displacement' | 'Semi-Planing' | 'Fully Planing';
}

export interface SavitskyResult {
  engineeringComplianceValidated: false;
  modelStatus: 'UNVALIDATED_HEURISTIC';
  inputs: SavitskyInputs;
  curve: SpeedResistancePoint[];
  planingSpeedKnots: number; // Speed where Fn_b >= 1.0
  peakHumpResistanceKN: number;
  peakHumpSpeedKnots: number;
}

/**
 * Plot a legacy illustrative planing heuristic across 4 to 40 knots; NOT Savitsky validation
 */
export function calculateSavitskyPlaning(inputs: SavitskyInputs): SavitskyResult {
  const g = 9.80665;
  const rho = 1025.0; // Seawater density kg/m^3
  const nu = 1.188e-6; // Kinematic viscosity seawater m^2/s at 15°C
  const delta = inputs.massKg * g; // Total weight in Newtons
  const b = inputs.beamM;
  const betaRad = (inputs.deadriseDeg * Math.PI) / 180;
  const lcg = inputs.lcgM;

  const curve: SpeedResistancePoint[] = [];
  let peakDrag = 0;
  let peakSpeed = 0;

  // Speeds from 4 knots to 40 knots in steps of 2 knots
  for (let vk = 4; vk <= 40; vk += 2) {
    const v = vk * 0.514444; // m/s
    const cv = v / Math.sqrt(g * b); // Beam Froude number

    // Dynamic Lift Coefficient required: CL = Delta / (0.5 * rho * V^2 * b^2)
    const dynamicPressure = 0.5 * rho * v * v;
    const clBeta = delta / (dynamicPressure * b * b);

    // Iterative solution for trim angle (tau) and wetted length ratio (lambda)
    // Using empirical Savitsky relationship: CL_beta = CL0 - 0.0065 * beta * (CL0^0.6)
    // Approximate CL0:
    let cl0 = clBeta / (1 - 0.0065 * inputs.deadriseDeg);
    if (cl0 <= 0 || !isFinite(cl0)) cl0 = clBeta;

    // Estimate trim angle tau in degrees: typically 2.5° to 5.5° in planing
    // Equilibrium trim for given LCG: tau ≈ (lcg/b - 0.75) / (0.012 * cv) clipped
    let tauDeg = Math.min(Math.max((cl0 / 0.02) ** 0.65, 1.8), 7.5);
    if (cv < 1.0) {
      // Semi-displacement/pre-planing correction
      tauDeg = 1.5 + (cv / 1.0) * 2.8;
    } else if (cv > 2.5) {
      tauDeg = Math.max(tauDeg * 0.85, 2.5);
    }

    const tauRad = (tauDeg * Math.PI) / 180;

    // Mean wetted length-beam ratio lambda:
    // CL0 = tau^1.1 * (0.0120 * lambda^0.5 + 0.0055 * lambda^2.5 / Cv^2)
    let lambda = Math.max((cl0 / (0.0120 * Math.max(tauDeg, 0.5) ** 1.1)) ** 2, 0.8);
    lambda = Math.min(Math.max(lambda, 0.5), 4.5);

    // Mean wetted length Lm = lambda * b
    const lm = lambda * b;

    // Mean water velocity along bottom Vm:
    const vm = v * Math.sqrt(Math.max(1 - (0.012 * Math.max(tauDeg, 0.1) ** 1.1) / Math.sqrt(lambda), 0.75));

    // Reynolds number based on mean wetted length:
    const re = Math.max((vm * lm) / nu, 1e5);

    // ITTC-1957 skin friction correlation line:
    const logRe = Math.log10(re);
    const cf = 0.075 / Math.max((logRe - 2) ** 2, 0.1) + 0.0004; // including roughness allowance

    // Total wetted surface area S = (b * lambda * b) / cos(beta)
    const wettedArea = (b * lm) / Math.cos(betaRad);

    // Frictional Resistance Rf:
    const rfN = 0.5 * rho * vm * vm * wettedArea * cf;

    // Pressure Resistance Rp:
    const rpN = delta * Math.tan(tauRad);

    // Whisker spray drag addition (Savitsky spray component):
    const rsprayN = 0.0055 * delta * (Math.sin(tauRad) / Math.cos(betaRad));

    const totalDragN = Math.max(rpN + rfN + rsprayN, delta * 0.04);
    const totalDragKN = totalDragN / 1000;
    const peKW = (totalDragN * v) / 1000;

    if (totalDragKN > peakDrag) {
      peakDrag = totalDragKN;
      peakSpeed = vk;
    }

    const regime: SpeedResistancePoint['planingRegime'] =
      cv < 1.0 ? 'Displacement' : cv < 2.0 ? 'Semi-Planing' : 'Fully Planing';

    curve.push({
      speedKnots: vk,
      speedMs: Number(v.toFixed(2)),
      froudeBeam: Number(cv.toFixed(2)),
      trimDeg: Number(tauDeg.toFixed(2)),
      wettedLengthRatio: Number(lambda.toFixed(2)),
      reynoldsNumber: Math.round(re),
      frictionalDragKN: Number((rfN / 1000).toFixed(3)),
      pressureDragKN: Number((rpN / 1000).toFixed(3)),
      sprayDragKN: Number((rsprayN / 1000).toFixed(3)),
      totalResistanceKN: Number(totalDragKN.toFixed(3)),
      effectivePowerKW: Number(peKW.toFixed(2)),
      planingRegime: regime
    });
  }

  return {
    engineeringComplianceValidated: false,
    modelStatus: 'UNVALIDATED_HEURISTIC',
    inputs,
    curve,
    planingSpeedKnots: Math.round(1.0 * Math.sqrt(g * b) * 1.94384),
    peakHumpResistanceKN: Number(peakDrag.toFixed(2)),
    peakHumpSpeedKnots: peakSpeed
  };
}

export interface StabilityInputs {
  displacementKg: number;
  beamM: number;
  draftM: number;
  depthM: number;
  vcgM: number; // Vertical center of gravity KG from baseline
  blockCoeffCb: number;
}

export interface GZPoint {
  heelDeg: number;
  heelRad: number;
  gzM: number;
  rightingMomentKNm: number;
  isDeckImmersed: boolean;
}

export interface ImoStabilityAudit {
  area0To30DegMrad: number;
  area0To40DegMrad: number;
  area30To40DegMrad: number;
  gm0M: number;
  gzMaxM: number;
  gzMaxAngleDeg: number;
  deckEdgeAngleDeg: number;
  criteria: {
    area0To30Pass: boolean;
    area0To40Pass: boolean;
    area30To40Pass: boolean;
    gm0Pass: boolean;
    gzMaxPass: boolean;
    overallPass: boolean; // always false for heuristic GZ: not a regulatory pass
    screeningThresholdsMet: boolean;
  };
  engineeringComplianceValidated: false;
}

export interface StabilityResult {
  inputs: StabilityInputs;
  curve: GZPoint[];
  audit: ImoStabilityAudit;
  kmM: number;
  bmM: number;
  kbM: number;
}

/**
 * Illustrative hydrostatic estimates only; no validated hull geometry, downflooding,
 * free-surface or approved loading cases. Never assert statutory compliance.
 */
export function calculateGZStability(inputs: StabilityInputs): StabilityResult {
  if (!Object.values(inputs).every(v => typeof v === 'number' && Number.isFinite(v))) {
    throw new Error('Stability screening requires finite numerical inputs');
  }
  if (inputs.beamM < 0 || inputs.draftM < 0 || inputs.depthM < 0 ||
      inputs.displacementKg < 0 || inputs.vcgM < 0 || inputs.blockCoeffCb < 0 ||
      inputs.blockCoeffCb > 1) {
    throw new Error('Negative geometry/mass/CG or invalid Cb is not physically admissible');
  }
  if (!inputs.beamM || !inputs.draftM || !inputs.displacementKg ||
      !inputs.depthM || !inputs.blockCoeffCb || inputs.depthM <= inputs.draftM) {
    const curve: GZPoint[] = [];
    for (let deg = 0; deg <= 60; deg += 2) {
      curve.push({
        heelDeg: deg,
        heelRad: (deg * Math.PI) / 180,
        gzM: 0,
        rightingMomentKNm: 0,
        isDeckImmersed: false
      });
    }
    return {
      inputs,
      curve,
      audit: {
        area0To30DegMrad: 0,
        area0To40DegMrad: 0,
        area30To40DegMrad: 0,
        gm0M: 0,
        gzMaxM: 0,
        gzMaxAngleDeg: 0,
        deckEdgeAngleDeg: 0,
        criteria: {
          area0To30Pass: false,
          area0To40Pass: false,
          area30To40Pass: false,
          gm0Pass: false,
          gzMaxPass: false,
          overallPass: false,
          screeningThresholdsMet: false
        },
        engineeringComplianceValidated: false
      },
      kmM: 0,
      bmM: 0,
      kbM: 0
    };
  }

  const g = 9.80665;
  const deltaKN = (inputs.displacementKg * g) / 1000;
  const B = inputs.beamM;
  const T = inputs.draftM;
  const D = inputs.depthM;
  const KG = inputs.vcgM;
  const Cb = inputs.blockCoeffCb;

  // Center of buoyancy (Morrish formula): KB ≈ T * (5/6 - Cb/3)
  const KB = T * (5 / 6 - Cb / 3);

  // Transverse Metacentric Radius: BM = IT / nabla ≈ B^2 / (11.4 * T * Cb)
  const BM = (B * B) / (11.4 * T * Cb);
  const KM = KB + BM;
  const GM0 = KM - KG;

  // Deck edge immersion angle: theta_deck = arctan(2 * (D - T) / B)
  const freeboard = D - T;
  const thetaDeckRad = Math.atan((2 * freeboard) / B);
  const deckEdgeAngleDeg = Math.round((thetaDeckRad * 180) / Math.PI);

  const curve: GZPoint[] = [];

  // Calculate GZ from 0 to 60 degrees in steps of 2 degrees
  for (let deg = 0; deg <= 60; deg += 2) {
    const rad = (deg * Math.PI) / 180;
    let gz = 0;

    if (rad <= thetaDeckRad) {
      // Wall-sided formula: GZ = sin(theta) * (GM0 + 0.5 * BM * tan^2(theta))
      gz = Math.sin(rad) * (GM0 + 0.5 * BM * Math.tan(rad) ** 2);
    } else {
      // Beyond deck edge immersion: GZ rolls over with freeboard loss
      const gzAtDeck = Math.sin(thetaDeckRad) * (GM0 + 0.5 * BM * Math.tan(thetaDeckRad) ** 2);
      const anglePastDeck = rad - thetaDeckRad;
      gz = gzAtDeck * Math.cos(anglePastDeck) - (KG - D * 0.5) * Math.sin(anglePastDeck) * 0.4;
    }

    // Preserve negative righting arms: clipping would hide an unsafe estimate.

    curve.push({
      heelDeg: deg,
      heelRad: rad,
      gzM: Number(gz.toFixed(3)),
      rightingMomentKNm: Number((gz * deltaKN).toFixed(2)),
      isDeckImmersed: deg >= deckEdgeAngleDeg
    });
  }

  // Calculate Simpson numerical integrals for IMO 2008 IS Code areas
  // Area 0 to 30 deg
  const pointsUpTo30 = curve.filter((p) => p.heelDeg <= 30);
  const area0To30 = trapezoidalIntegral(pointsUpTo30);

  // Area 0 to 40 deg
  const pointsUpTo40 = curve.filter((p) => p.heelDeg <= 40);
  const area0To40 = trapezoidalIntegral(pointsUpTo40);

  // Area 30 to 40 deg
  const points30To40 = curve.filter((p) => p.heelDeg >= 30 && p.heelDeg <= 40);
  const area30To40 = trapezoidalIntegral(points30To40);

  // Find GZmax and angle
  let maxGZ = 0;
  let maxAngle = 0;
  for (const pt of curve) {
    if (pt.gzM > maxGZ) {
      maxGZ = pt.gzM;
      maxAngle = pt.heelDeg;
    }
  }

  // Illustrative comparison with common numerical thresholds only; the
  // applicable code and its full acceptance criteria have NOT been established.
  const area0To30Pass = area0To30 >= 0.055;
  const area0To40Pass = area0To40 >= 0.09;
  const area30To40Pass = area30To40 >= 0.03;
  const gm0Pass = GM0 >= 0.15;
  const gzMaxPass = maxGZ >= 0.2 && maxAngle >= 25;
  const screeningThresholdsMet = area0To30Pass && area0To40Pass && area30To40Pass && gm0Pass && gzMaxPass;
  const overallPass = false; // heuristic screening cannot certify a vessel

  return {
    inputs,
    curve,
    kbM: Number(KB.toFixed(3)),
    bmM: Number(BM.toFixed(3)),
    kmM: Number(KM.toFixed(3)),
    audit: {
      area0To30DegMrad: Number(area0To30.toFixed(4)),
      area0To40DegMrad: Number(area0To40.toFixed(4)),
      area30To40DegMrad: Number(area30To40.toFixed(4)),
      gm0M: Number(GM0.toFixed(3)),
      gzMaxM: Number(maxGZ.toFixed(3)),
      gzMaxAngleDeg: maxAngle,
      deckEdgeAngleDeg,
      criteria: {
        area0To30Pass,
        area0To40Pass,
        area30To40Pass,
        gm0Pass,
        gzMaxPass,
        overallPass,
        screeningThresholdsMet
      },
      engineeringComplianceValidated: false
    }
  };
}

function trapezoidalIntegral(points: GZPoint[]): number {
  if (points.length < 2) return 0;
  let sum = 0;
  for (let i = 1; i < points.length; i++) {
    const dTheta = points[i].heelRad - points[i - 1].heelRad;
    const avgGz = (points[i].gzM + points[i - 1].gzM) / 2;
    sum += avgGz * dTheta;
  }
  return sum; // negative dynamic stability area must not be silently hidden
}
