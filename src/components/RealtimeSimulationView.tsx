import React, { useState, useEffect, useRef } from 'react';
import {
  Navigation,
  Waves,
  Play,
  Pause,
  RotateCcw,
  Sliders,
  ShieldCheck,
  AlertTriangle,
  Radio,
  Eye,
  Crosshair,
  Compass,
  Ship,
  Sparkles,
  RefreshCw,
  Plus,
  Trash2,
  Activity,
  Layers,
  ChevronRight,
  Info,
  CheckCircle2,
  Rotate3d
} from 'lucide-react';
import { SharedMemory } from '../core/memory/SharedMemory';
import { Vessel3DVisualizer } from './Vessel3DVisualizer';

interface ObstacleVessel {
  id: string;
  name: string;
  type: 'vessel' | 'buoy';
  x: number; // nautical grid meters (-600 to +600)
  y: number; // nautical grid meters (-600 to +600)
  speedKnots: number;
  headingDeg: number; // 0 = North, 90 = East, 180 = South, 270 = West
  lengthM: number;
  beamM: number;
  color: string;
}

interface RealtimeSimulationViewProps {
  onAskAi?: (prompt: string, record?: any) => void;
  onNavigateToOptimizer?: () => void;
}

export const RealtimeSimulationView: React.FC<RealtimeSimulationViewProps> = ({ onAskAi, onNavigateToOptimizer }) => {
  const [activeTab, setActiveTab] = useState<'design3d' | 'hydrostatics' | 'radar'>('design3d');

  // Simulation running state
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [simSpeed, setSimSpeed] = useState<number>(1); // 1x, 2x, 5x
  const [selectedScenario, setSelectedScenario] = useState<string>('rule14_headon');

  // USV State
  const [usvPos, setUsvPos] = useState({ x: 0, y: -350 });
  const [usvHeading, setUsvHeading] = useState<number>(0); // 0 = North
  const [usvSpeed, setUsvSpeed] = useState<number>(14.0); // knots
  const [rudderAngle, setRudderAngle] = useState<number>(0); // degrees (-30 to +30)
  const [colregsState, setColregsState] = useState<'NORMAL_TRANSIT' | 'ASSESSING_RISK' | 'GIVE_WAY_ALTER_STARBOARD' | 'CLEARING_PASS_ASTERN' | 'STAND_ON' | 'RETURNING_TO_COURSE'>('NORMAL_TRANSIT');
  const [activeRule, setActiveRule] = useState<string>('Rule 10 (Traffic Lane)');
  const [closestCPA, setClosestCPA] = useState<number>(999);
  const [closestTCPA, setClosestTCPA] = useState<number>(999);
  const [threatLevel, setThreatLevel] = useState<'CLEAR' | 'ADVISORY' | 'CRITICAL'>('CLEAR');

  // Environment
  const [windSpeed, setWindSpeed] = useState<number>(12); // knots
  const [windDir, setWindDir] = useState<number>(45); // degrees
  const [seaState, setSeaState] = useState<number>(2); // 0=Calm, 1=Slight, 2=Moderate, 3=Rough

  // Sensor Toggles
  const [showRadarSweep, setShowRadarSweep] = useState(true);
  const [showLidarCone, setShowLidarCone] = useState(true);
  const [showVectors, setShowVectors] = useState(true);
  const [showRangeRings, setShowRangeRings] = useState(true);

  // Obstacle Vessels
  const [obstacles, setObstacles] = useState<ObstacleVessel[]>([]);

  // Canvas Refs
  const radarCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const hydroCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Internal Animation Refs — Synchronized with Rev 0.4 Baseline (14 kt cruise speed)
  const stateRef = useRef({
    usv: { x: 0, y: -350, heading: 0, speed: 14.0, baseHeading: 0, rudder: 0 },
    obstacles: [] as ObstacleVessel[],
    radarAngle: 0,
    isPlaying: true,
    simSpeed: 1,
    trail: [] as { x: number; y: number }[],
    colregsState: 'NORMAL_TRANSIT' as string,
    activeRule: 'Rule 10 (Traffic Lane)' as string
  });

  // Hydrostatics & Closed-Loop Simulation State — Synchronized with SharedMemory & Generative Optimizer
  const sharedMemory = SharedMemory.getInstance();
  const lwlParam = sharedMemory.getParameter('USV-NA-001');
  const beamParam = sharedMemory.getParameter('USV-NA-002');
  const draftParam = sharedMemory.getParameter('USV-NA-003');
  const displParam = sharedMemory.getParameter('USV-NA-004');
  const gmtParam = sharedMemory.getParameter('USV-NA-005');
  const kgParam = sharedMemory.getParameter('USV-NA-006');
  const sprintParam = sharedMemory.getParameter('USV-PROP-001');

  const [vesselLwl, setVesselLwl] = useState<number>(typeof lwlParam?.value === 'number' && lwlParam.value > 0 ? Number(lwlParam.value) : 10.5);
  const [vesselBeam, setVesselBeam] = useState<number>(typeof beamParam?.value === 'number' && beamParam.value > 0 ? Number(beamParam.value) : 2.9);
  const [vesselDraft, setVesselDraft] = useState<number>(typeof draftParam?.value === 'number' && draftParam.value > 0 ? Number(draftParam.value) : 0.65);
  const [hydroMass, setHydroMass] = useState<number>(typeof displParam?.value === 'number' && displParam.value > 0 ? Number(displParam.value) : 6.2);
  const [vesselGmt, setVesselGmt] = useState<number>(typeof gmtParam?.value === 'number' && gmtParam.value > 0 ? Number(gmtParam.value) : 1.32);
  const [hydroKg, setHydroKg] = useState<number>(typeof kgParam?.value === 'number' && kgParam.value > 0 ? Number(kgParam.value) : 0.66);
  const [vesselSprint, setVesselSprint] = useState<number>(typeof sprintParam?.value === 'number' && sprintParam.value > 0 ? Number(sprintParam.value) : 22.0);
  const [activeDesignLabel, setActiveDesignLabel] = useState<string>('REV 0.4 BASELINE');

  const [waveAmp, setWaveAmp] = useState<number>(0.4); // meters
  const [waveFreq, setWaveFreq] = useState<number>(1.2); // rad/s
  const [heelAngle, setHeelAngle] = useState<number>(0); // dynamic heel deg

  // Reactive subscription: auto-update simulation whenever any agent or optimizer writes to SharedMemory
  useEffect(() => {
    const unsubscribe = sharedMemory.subscribe((param) => {
      if (param.id === 'USV-NA-001' && typeof param.value === 'number') {
        setVesselLwl(param.value);
        if (param.assumptions?.[0]?.includes('Applied from Optimizer')) {
          setActiveDesignLabel(param.assumptions[0].replace('Applied from Optimizer candidate ', ''));
        }
      } else if (param.id === 'USV-NA-002' && typeof param.value === 'number') {
        setVesselBeam(param.value);
      } else if (param.id === 'USV-NA-003' && typeof param.value === 'number') {
        setVesselDraft(param.value);
      } else if (param.id === 'USV-NA-004' && typeof param.value === 'number') {
        setHydroMass(param.value);
      } else if (param.id === 'USV-NA-005' && typeof param.value === 'number') {
        setVesselGmt(param.value);
      } else if (param.id === 'USV-NA-006' && typeof param.value === 'number') {
        setHydroKg(param.value);
      } else if (param.id === 'USV-PROP-001' && typeof param.value === 'number') {
        setVesselSprint(param.value);
      } else if (param.id === 'USV-PROP-002' && typeof param.value === 'number') {
        setUsvSpeed(param.value);
        stateRef.current.usv.speed = param.value;
      }
    });
    return unsubscribe;
  }, [sharedMemory]);

  // Design Presets Switcher
  const handleApplyDesignPreset = (preset: 'REV04' | 'CHAMPION' | 'SPRINT' | 'GUARDIAN') => {
    if (preset === 'REV04') {
      setVesselLwl(10.5);
      setVesselBeam(2.9);
      setVesselDraft(0.65);
      setHydroMass(6.2);
      setVesselGmt(1.32);
      setHydroKg(0.66);
      setVesselSprint(22.0);
      setActiveDesignLabel('REV 0.4 BASELINE');
      sharedMemory.updateParameter('USV-NA-001', { value: 10.5, assumptions: ['Rev 0.4 Planing Monohull'] }, 'SIM-PRESET');
      sharedMemory.updateParameter('USV-NA-002', { value: 2.9, assumptions: ['Molded beam 2.9m'] }, 'SIM-PRESET');
      sharedMemory.updateParameter('USV-NA-003', { value: 0.65, assumptions: ['Design draft 0.65m'] }, 'SIM-PRESET');
      sharedMemory.updateParameter('USV-NA-004', { value: 6.2, assumptions: ['6.20 t displacement'] }, 'SIM-PRESET');
      sharedMemory.updateParameter('USV-NA-005', { value: 1.32, assumptions: ['GMt 1.32m'] }, 'SIM-PRESET');
      sharedMemory.updateParameter('USV-NA-006', { value: 0.66, assumptions: ['KG 0.66m'] }, 'SIM-PRESET');
      sharedMemory.updateParameter('USV-PROP-001', { value: 22.0, assumptions: ['22.0 kt sprint'] }, 'SIM-PRESET');
    } else if (preset === 'CHAMPION') {
      setVesselLwl(10.8);
      setVesselBeam(2.85);
      setVesselDraft(0.63);
      setHydroMass(6.1);
      setVesselGmt(1.38);
      setHydroKg(0.64);
      setVesselSprint(23.8);
      setActiveDesignLabel('OPTIMIZER CHAMPION');
      sharedMemory.updateParameter('USV-NA-001', { value: 10.8, assumptions: ['Applied from Optimizer champion'] }, 'SIM-PRESET');
      sharedMemory.updateParameter('USV-NA-002', { value: 2.85, assumptions: ['Applied from Optimizer champion'] }, 'SIM-PRESET');
      sharedMemory.updateParameter('USV-NA-003', { value: 0.63, assumptions: ['Applied from Optimizer champion'] }, 'SIM-PRESET');
      sharedMemory.updateParameter('USV-NA-004', { value: 6.1, assumptions: ['Applied from Optimizer champion'] }, 'SIM-PRESET');
      sharedMemory.updateParameter('USV-NA-005', { value: 1.38, assumptions: ['Applied from Optimizer champion'] }, 'SIM-PRESET');
      sharedMemory.updateParameter('USV-NA-006', { value: 0.64, assumptions: ['Applied from Optimizer champion'] }, 'SIM-PRESET');
      sharedMemory.updateParameter('USV-PROP-001', { value: 23.8, assumptions: ['Applied from Optimizer champion'] }, 'SIM-PRESET');
    } else if (preset === 'SPRINT') {
      setVesselLwl(9.8);
      setVesselBeam(2.45);
      setVesselDraft(0.58);
      setHydroMass(5.2);
      setVesselGmt(1.18);
      setHydroKg(0.62);
      setVesselSprint(26.4);
      setActiveDesignLabel('ALPHA SPRINT (26.4kt)');
      sharedMemory.updateParameter('USV-NA-001', { value: 9.8, assumptions: ['Alpha Sprint variant'] }, 'SIM-PRESET');
      sharedMemory.updateParameter('USV-NA-002', { value: 2.45, assumptions: ['Narrow beam for sprint'] }, 'SIM-PRESET');
      sharedMemory.updateParameter('USV-NA-003', { value: 0.58, assumptions: ['Shallow draft'] }, 'SIM-PRESET');
      sharedMemory.updateParameter('USV-NA-004', { value: 5.2, assumptions: ['Lightweight 5.2t'] }, 'SIM-PRESET');
      sharedMemory.updateParameter('USV-NA-005', { value: 1.18, assumptions: ['GMt 1.18m'] }, 'SIM-PRESET');
      sharedMemory.updateParameter('USV-NA-006', { value: 0.62, assumptions: ['KG 0.62m'] }, 'SIM-PRESET');
      sharedMemory.updateParameter('USV-PROP-001', { value: 26.4, assumptions: ['26.4 kt sprint'] }, 'SIM-PRESET');
    } else if (preset === 'GUARDIAN') {
      setVesselLwl(11.4);
      setVesselBeam(3.15);
      setVesselDraft(0.72);
      setHydroMass(7.4);
      setVesselGmt(1.52);
      setHydroKg(0.68);
      setVesselSprint(20.5);
      setActiveDesignLabel('CHARLIE GUARDIAN (SS5)');
      sharedMemory.updateParameter('USV-NA-001', { value: 11.4, assumptions: ['Charlie Guardian SS5'] }, 'SIM-PRESET');
      sharedMemory.updateParameter('USV-NA-002', { value: 3.15, assumptions: ['Wide beam for high sea state'] }, 'SIM-PRESET');
      sharedMemory.updateParameter('USV-NA-003', { value: 0.72, assumptions: ['Deep draft 0.72m'] }, 'SIM-PRESET');
      sharedMemory.updateParameter('USV-NA-004', { value: 7.4, assumptions: ['Heavy displacement 7.4t'] }, 'SIM-PRESET');
      sharedMemory.updateParameter('USV-NA-005', { value: 1.52, assumptions: ['High GMt 1.52m'] }, 'SIM-PRESET');
      sharedMemory.updateParameter('USV-NA-006', { value: 0.68, assumptions: ['KG 0.68m'] }, 'SIM-PRESET');
      sharedMemory.updateParameter('USV-PROP-001', { value: 20.5, assumptions: ['20.5 kt sprint'] }, 'SIM-PRESET');
    }
  };

  // Pre-configured Scenarios
  const loadScenario = (scenarioKey: string) => {
    setSelectedScenario(scenarioKey);
    let newObs: ObstacleVessel[] = [];
    let initialUsv = { x: 0, y: -350, heading: 0, speed: 14.0, baseHeading: 0, rudder: 0 };

    if (scenarioKey === 'rule14_headon') {
      newObs = [
        {
          id: 'OBS-14',
          name: 'MV NORDIC TRADER',
          type: 'vessel',
          x: 5,
          y: 420,
          speedKnots: 16.0,
          headingDeg: 180, // Coming directly south toward USV
          lengthM: 28,
          beamM: 6.5,
          color: '#f43f5e'
        }
      ];
    } else if (scenarioKey === 'rule15_crossing_giveway') {
      newObs = [
        {
          id: 'OBS-15',
          name: 'PATROL CUTTER 04',
          type: 'vessel',
          x: 380,
          y: -50,
          speedKnots: 15.0,
          headingDeg: 275, // Crossing from starboard (USV must give way!)
          lengthM: 22,
          beamM: 5.2,
          color: '#fbbf24'
        }
      ];
    } else if (scenarioKey === 'rule15_crossing_standon') {
      newObs = [
        {
          id: 'OBS-15B',
          name: 'F/V PACIFIC WAVE',
          type: 'vessel',
          x: -380,
          y: -80,
          speedKnots: 12.0,
          headingDeg: 85, // Crossing from port (USV has right of way)
          lengthM: 18,
          beamM: 4.8,
          color: '#38bdf8'
        }
      ];
    } else if (scenarioKey === 'rule13_overtaking') {
      newObs = [
        {
          id: 'OBS-13',
          name: 'TUG ARCTIC PULLER',
          type: 'vessel',
          x: 0,
          y: -120,
          speedKnots: 8.0,
          headingDeg: 0, // Ahead of USV, slower speed
          lengthM: 24,
          beamM: 7.0,
          color: '#a855f7'
        }
      ];
    } else if (scenarioKey === 'multi_channel') {
      newObs = [
        {
          id: 'OBS-M1',
          name: 'CARGO LINK 1',
          type: 'vessel',
          x: 80,
          y: 400,
          speedKnots: 14.0,
          headingDeg: 185,
          lengthM: 32,
          beamM: 7.5,
          color: '#f43f5e'
        },
        {
          id: 'OBS-M2',
          name: 'PILOT CUTTER',
          type: 'vessel',
          x: 350,
          y: 50,
          speedKnots: 18.0,
          headingDeg: 260,
          lengthM: 16,
          beamM: 4.2,
          color: '#fbbf24'
        },
        {
          id: 'BUOY-01',
          name: 'FAIRWAY BUOY 3',
          type: 'buoy',
          x: -90,
          y: -50,
          speedKnots: 0,
          headingDeg: 0,
          lengthM: 4,
          beamM: 4,
          color: '#10b981'
        },
        {
          id: 'BUOY-02',
          name: 'SHALLOWS CARDINAL S',
          type: 'buoy',
          x: 120,
          y: -100,
          speedKnots: 0,
          headingDeg: 0,
          lengthM: 4,
          beamM: 4,
          color: '#eab308'
        }
      ];
    }

    setObstacles(newObs);
    setUsvPos({ x: initialUsv.x, y: initialUsv.y });
    setUsvHeading(0);
    setRudderAngle(0);
    setColregsState('NORMAL_TRANSIT');
    setActiveRule('Rule 10 (Traffic Lane)');

    stateRef.current.usv = initialUsv;
    stateRef.current.obstacles = JSON.parse(JSON.stringify(newObs));
    stateRef.current.trail = [];
    stateRef.current.colregsState = 'NORMAL_TRANSIT';
    stateRef.current.activeRule = 'Rule 10 (Traffic Lane)';
  };

  useEffect(() => {
    loadScenario('rule14_headon');
  }, []);

  useEffect(() => {
    stateRef.current.isPlaying = isPlaying;
    stateRef.current.simSpeed = simSpeed;
  }, [isPlaying, simSpeed]);

  // Main 60 FPS Radar Simulation Loop
  useEffect(() => {
    let animationFrameId: number;
    let lastTime = performance.now();

    const loop = (currentTime: number) => {
      const dt = Math.min((currentTime - lastTime) / 1000, 0.1);
      lastTime = currentTime;

      const state = stateRef.current;

      if (state.isPlaying) {
        // Step Simulation Physics
        const stepDt = dt * state.simSpeed;

        // 1. Advance Radar Angle
        state.radarAngle = (state.radarAngle + stepDt * 180) % 360;

        // 2. Advance Obstacles
        for (const obs of state.obstacles) {
          if (obs.speedKnots > 0) {
            const rad = ((90 - obs.headingDeg) * Math.PI) / 180;
            const speedMs = obs.speedKnots * 0.514444;
            obs.x += Math.cos(rad) * speedMs * stepDt;
            obs.y += Math.sin(rad) * speedMs * stepDt;
          }
        }

        // 3. Autonomous COLREGs Kinematics & CPA Calculation
        const usv = state.usv;
        const usvSpeedMs = usv.speed * 0.514444;
        let minCPA = 999;
        let minTCPA = 999;
        let mostThreateningObs: ObstacleVessel | null = null;
        let detectedRule = 'Rule 10 (Traffic Lane)';
        let targetState: any = 'NORMAL_TRANSIT';
        let desiredHeading = usv.baseHeading;

        for (const obs of state.obstacles) {
          // Relative coordinates
          const dx = obs.x - usv.x;
          const dy = obs.y - usv.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          // Relative velocity
          const usvVx = Math.cos(((90 - usv.heading) * Math.PI) / 180) * usvSpeedMs;
          const usvVy = Math.sin(((90 - usv.heading) * Math.PI) / 180) * usvSpeedMs;

          const obsSpeedMs = obs.speedKnots * 0.514444;
          const obsVx = Math.cos(((90 - obs.headingDeg) * Math.PI) / 180) * obsSpeedMs;
          const obsVy = Math.sin(((90 - obs.headingDeg) * Math.PI) / 180) * obsSpeedMs;

          const relVx = obsVx - usvVx;
          const relVy = obsVy - usvVy;
          const relSpeedSq = relVx * relVx + relVy * relVy;

          let tcpa = 0;
          let cpa = dist;

          if (relSpeedSq > 0.01) {
            tcpa = -(dx * relVx + dy * relVy) / relSpeedSq;
            if (tcpa > 0) {
              const cpaX = dx + relVx * tcpa;
              const cpaY = dy + relVy * tcpa;
              cpa = Math.sqrt(cpaX * cpaX + cpaY * cpaY);
            }
          }

          if (dist < 700 && tcpa > 0 && tcpa < 120) {
            if (cpa < minCPA) {
              minCPA = cpa;
              minTCPA = tcpa;
              mostThreateningObs = obs;
            }
          }
        }

        // COLREGs Decision Logic
        if (mostThreateningObs && minCPA < 300) {
          // Determine relative bearing
          const dx = mostThreateningObs.x - usv.x;
          const dy = mostThreateningObs.y - usv.y;
          let bearingToObs = (Math.atan2(dx, dy) * 180) / Math.PI; // 0=North, 90=East
          if (bearingToObs < 0) bearingToObs += 360;

          let relBearing = bearingToObs - usv.heading;
          if (relBearing > 180) relBearing -= 360;
          if (relBearing < -180) relBearing += 360;

          // Encounter categorization
          const aspectDiff = Math.abs(usv.heading - mostThreateningObs.headingDeg);

          if (aspectDiff > 165 && aspectDiff < 195 && Math.abs(relBearing) < 15) {
            // Rule 14: Head-on encounter! Both shall alter course to Starboard.
            detectedRule = 'Rule 14 (Head-on)';
            if (minCPA < 240) {
              targetState = 'GIVE_WAY_ALTER_STARBOARD';
              desiredHeading = usv.baseHeading + 35; // 35° Starboard alteration
            } else {
              targetState = 'ASSESSING_RISK';
            }
          } else if (relBearing > 5 && relBearing < 112.5) {
            // Rule 15: Crossing from Starboard. Target has right of way! USV gives way.
            detectedRule = 'Rule 15 (Crossing Starboard - Give-Way)';
            if (minCPA < 250) {
              targetState = 'GIVE_WAY_ALTER_STARBOARD';
              desiredHeading = usv.baseHeading + 40; // Turn right to pass astern
            } else {
              targetState = 'ASSESSING_RISK';
            }
          } else if (relBearing < -5 && relBearing > -112.5) {
            // Rule 15: Crossing from Port. USV is Stand-on!
            detectedRule = 'Rule 15 (Crossing Port - Stand-On)';
            if (minCPA < 90) {
              // Dangerously close: Action by stand-on vessel to avoid collision
              targetState = 'GIVE_WAY_ALTER_STARBOARD';
              desiredHeading = usv.baseHeading + 45;
            } else {
              targetState = 'STAND_ON';
              desiredHeading = usv.baseHeading;
            }
          } else if (Math.abs(relBearing) < 20 && usv.speed > mostThreateningObs.speedKnots) {
            // Rule 13: Overtaking
            detectedRule = 'Rule 13 (Overtaking)';
            targetState = 'CLEARING_PASS_ASTERN';
            desiredHeading = usv.baseHeading + 25; // Overtake on starboard side
          }
        } else {
          // No immediate threat: return to original track
          targetState = Math.abs(usv.heading - usv.baseHeading) > 3 ? 'RETURNING_TO_COURSE' : 'NORMAL_TRANSIT';
          desiredHeading = usv.baseHeading;
        }

        // Steer toward desired heading (rudder kinematics with rate limit)
        const headingErr = desiredHeading - usv.heading;
        const targetRudder = Math.max(Math.min(headingErr * 1.5, 30), -30);
        usv.rudder += (targetRudder - usv.rudder) * Math.min(stepDt * 4.0, 1.0);
        usv.heading += usv.rudder * stepDt * 0.8;

        // Advance USV Position
        const usvRad = ((90 - usv.heading) * Math.PI) / 180;
        usv.x += Math.cos(usvRad) * usvSpeedMs * stepDt;
        usv.y += Math.sin(usvRad) * usvSpeedMs * stepDt;

        // Loop / wrap around when reaching the top
        if (usv.y > 450) {
          usv.y = -400;
          state.trail = [];
        }

        // Add to breadcrumb trail
        if (Math.random() < 0.2) {
          state.trail.push({ x: usv.x, y: usv.y });
          if (state.trail.length > 100) state.trail.shift();
        }

        // Update state ref
        state.colregsState = targetState;
        state.activeRule = detectedRule;

        // React state update every 5 frames for smooth HUD
        setUsvPos({ x: usv.x, y: usv.y });
        setUsvHeading(usv.heading);
        setRudderAngle(usv.rudder);
        setColregsState(targetState);
        setActiveRule(detectedRule);
        setClosestCPA(minCPA);
        setClosestTCPA(minTCPA);
        setThreatLevel(minCPA < 150 ? 'CRITICAL' : minCPA < 300 ? 'ADVISORY' : 'CLEAR');
      }

      // Draw Radar Display
      drawRadarCanvas(radarCanvasRef.current, stateRef.current);

      animationFrameId = requestAnimationFrame(loop);
    };

    animationFrameId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animationFrameId);
  }, []);

  // Draw Tactical Radar Screen
  const drawRadarCanvas = (canvas: HTMLCanvasElement | null, state: typeof stateRef.current) => {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const centerX = width / 2;
    const centerY = height / 2;
    const scale = width / 1100; // meters to canvas pixels

    // Background & Water
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);

    // Subtle navigation grid
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1;
    const gridSize = 50 * scale;
    for (let x = 0; x < width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y < height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // Range Rings (100m, 250m, 500m)
    if (showRangeRings) {
      const rings = [100, 250, 450];
      for (const r of rings) {
        ctx.strokeStyle = 'rgba(13, 148, 136, 0.25)';
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.arc(centerX + state.usv.x * scale, centerY - state.usv.y * scale, r * scale, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);

        // Ring distance text
        ctx.fillStyle = '#0f766e';
        ctx.font = '9px monospace';
        ctx.fillText(`${r}m`, centerX + state.usv.x * scale + (r - 20) * scale, centerY - state.usv.y * scale - 4);
      }
    }

    // Radar Scanning Sweep
    if (showRadarSweep) {
      const sweepAngleRad = (state.radarAngle * Math.PI) / 180;
      const usvCanvasX = centerX + state.usv.x * scale;
      const usvCanvasY = centerY - state.usv.y * scale;

      const sweepGradient = ctx.createRadialGradient(
        usvCanvasX,
        usvCanvasY,
        5,
        usvCanvasX,
        usvCanvasY,
        450 * scale
      );
      sweepGradient.addColorStop(0, 'rgba(45, 212, 191, 0.25)');
      sweepGradient.addColorStop(1, 'rgba(45, 212, 191, 0)');

      ctx.save();
      ctx.beginPath();
      ctx.moveTo(usvCanvasX, usvCanvasY);
      ctx.arc(usvCanvasX, usvCanvasY, 450 * scale, sweepAngleRad - 0.4, sweepAngleRad);
      ctx.closePath();
      ctx.fillStyle = sweepGradient;
      ctx.fill();

      // Sharp sweep line
      ctx.strokeStyle = 'rgba(45, 212, 191, 0.7)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(usvCanvasX, usvCanvasY);
      ctx.lineTo(
        usvCanvasX + Math.cos(sweepAngleRad) * 450 * scale,
        usvCanvasY + Math.sin(sweepAngleRad) * 450 * scale
      );
      ctx.stroke();
      ctx.restore();
    }

    // LiDAR Perception Field (Forward 120° sector, 120m range)
    if (showLidarCone) {
      const usvCanvasX = centerX + state.usv.x * scale;
      const usvCanvasY = centerY - state.usv.y * scale;
      const headingRad = ((90 - state.usv.heading) * Math.PI) / 180;
      const halfSpread = (60 * Math.PI) / 180;

      ctx.save();
      ctx.beginPath();
      ctx.moveTo(usvCanvasX, usvCanvasY);
      ctx.arc(usvCanvasX, usvCanvasY, 120 * scale, headingRad - halfSpread, headingRad + halfSpread);
      ctx.closePath();
      ctx.fillStyle = 'rgba(56, 189, 248, 0.08)';
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.3)';
      ctx.lineWidth = 1;
      ctx.setLineDash([2, 2]);
      ctx.fill();
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
    }

    // USV Past Trail
    ctx.strokeStyle = 'rgba(45, 212, 191, 0.4)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let i = 0; i < state.trail.length; i++) {
      const px = centerX + state.trail[i].x * scale;
      const py = centerY - state.trail[i].y * scale;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();

    // Draw Obstacle Vessels & Buoys
    for (const obs of state.obstacles) {
      const ox = centerX + obs.x * scale;
      const oy = centerY - obs.y * scale;

      if (obs.type === 'buoy') {
        // Buoy Symbol
        ctx.fillStyle = obs.color;
        ctx.beginPath();
        ctx.arc(ox, oy, 5 * scale, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.fillStyle = '#94a3b8';
        ctx.font = '9px monospace';
        ctx.fillText(obs.name, ox + 8, oy + 3);
      } else {
        // Dynamic Vessel
        ctx.save();
        ctx.translate(ox, oy);
        ctx.rotate((obs.headingDeg * Math.PI) / 180);

        // Vessel Hull Shape
        ctx.fillStyle = obs.color;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, -obs.lengthM * 0.5 * scale);
        ctx.lineTo(obs.beamM * 0.5 * scale, 0);
        ctx.lineTo(obs.beamM * 0.4 * scale, obs.lengthM * 0.5 * scale);
        ctx.lineTo(-obs.beamM * 0.4 * scale, obs.lengthM * 0.5 * scale);
        ctx.lineTo(-obs.beamM * 0.5 * scale, 0);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.restore();

        // Heading Vector (Velocity Leader line)
        if (showVectors && obs.speedKnots > 0) {
          const vLen = obs.speedKnots * 4 * scale;
          const vRad = ((90 - obs.headingDeg) * Math.PI) / 180;
          ctx.strokeStyle = obs.color;
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(ox, oy);
          ctx.lineTo(ox + Math.cos(vRad) * vLen, oy - Math.sin(vRad) * vLen);
          ctx.stroke();
        }

        // AIS Tag Text
        ctx.fillStyle = '#1e293b';
        ctx.font = '10px monospace';
        ctx.fillText(`${obs.name} [${obs.speedKnots.toFixed(0)}kt]`, ox + 10, oy - 6);

        // CPA Alert Circle if near
        const dx = obs.x - state.usv.x;
        const dy = obs.y - state.usv.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 280) {
          ctx.strokeStyle = dist < 150 ? 'rgba(244, 63, 94, 0.7)' : 'rgba(251, 191, 36, 0.6)';
          ctx.lineWidth = 1;
          ctx.setLineDash([3, 3]);
          ctx.beginPath();
          ctx.arc(ox, oy, 25 * scale, 0, Math.PI * 2);
          ctx.stroke();
          ctx.setLineDash([]);
        }
      }
    }

    // Draw USV-01 Vessel
    const ux = centerX + state.usv.x * scale;
    const uy = centerY - state.usv.y * scale;

    ctx.save();
    ctx.translate(ux, uy);
    ctx.rotate((state.usv.heading * Math.PI) / 180);

    // USV Hull Dimensions (Parametric 11.2m x 2.9m)
    const usvLen = 11.2 * scale;
    const usvBeam = 2.9 * scale;

    // Twin prop wash trail
    ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.fillRect(-usvBeam * 0.3, usvLen * 0.5, usvBeam * 0.18, 12 * scale);
    ctx.fillRect(usvBeam * 0.12, usvLen * 0.5, usvBeam * 0.18, 12 * scale);

    // Composite Hull Body
    ctx.fillStyle = '#0d9488'; // Teal marine gelcoat
    ctx.strokeStyle = '#5eead4';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, -usvLen * 0.55); // Sharp bow
    ctx.lineTo(usvBeam * 0.5, -usvLen * 0.1);
    ctx.lineTo(usvBeam * 0.45, usvLen * 0.5); // Transom starboard
    ctx.lineTo(-usvBeam * 0.45, usvLen * 0.5); // Transom port
    ctx.lineTo(-usvBeam * 0.5, -usvLen * 0.1);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Sensor Mast / Cabin Cockpit
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(-usvBeam * 0.25, -usvLen * 0.2, usvBeam * 0.5, usvLen * 0.35);

    // Steerable Pod Thrusters Indicator (Rudder deflection)
    const rudderRad = (state.usv.rudder * Math.PI) / 180;
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2;
    // Left pod
    ctx.beginPath();
    ctx.moveTo(-usvBeam * 0.25, usvLen * 0.5);
    ctx.lineTo(
      -usvBeam * 0.25 - Math.sin(rudderRad) * 6 * scale,
      usvLen * 0.5 + Math.cos(rudderRad) * 6 * scale
    );
    ctx.stroke();
    // Right pod
    ctx.beginPath();
    ctx.moveTo(usvBeam * 0.25, usvLen * 0.5);
    ctx.lineTo(
      usvBeam * 0.25 - Math.sin(rudderRad) * 6 * scale,
      usvLen * 0.5 + Math.cos(rudderRad) * 6 * scale
    );
    ctx.stroke();

    ctx.restore();

    // USV SOG / Heading Vector
    if (showVectors) {
      const usvVRad = ((90 - state.usv.heading) * Math.PI) / 180;
      const usvVLen = state.usv.speed * 4 * scale;
      ctx.strokeStyle = '#2dd4bf';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(ux, uy);
      ctx.lineTo(ux + Math.cos(usvVRad) * usvVLen, uy - Math.sin(usvVRad) * usvVLen);
      ctx.stroke();
    }

    // USV Name Tag
    ctx.fillStyle = '#0f766e';
    ctx.font = 'bold 11px monospace';
    ctx.fillText('USV-01 (OWN SHIP)', ux + 14, uy - 10);
    ctx.font = '9px monospace';
    ctx.fillStyle = '#475569';
    ctx.fillText(`${state.usv.speed.toFixed(1)} kt • ${state.usv.heading.toFixed(0)}°`, ux + 14, uy + 4);
  };

  // Add Custom Obstacle by clicking
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = radarCanvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    const width = canvas.width;
    const height = canvas.height;
    const centerX = width / 2;
    const centerY = height / 2;
    const scale = width / 1100;

    const worldX = (clickX - centerX) / scale;
    const worldY = -(clickY - centerY) / scale;

    const newObs: ObstacleVessel = {
      id: `USER-OBS-${Date.now().toString().slice(-4)}`,
      name: `TARGET ${stateRef.current.obstacles.length + 1}`,
      type: 'vessel',
      x: worldX,
      y: worldY,
      speedKnots: 12.0,
      headingDeg: Math.floor(Math.random() * 360),
      lengthM: 20,
      beamM: 5.0,
      color: '#f59e0b'
    };

    setObstacles((prev) => [...prev, newObs]);
    stateRef.current.obstacles.push(newObs);
  };

  // -------------------------------------------------------------
  // TAB 2: Hydrostatic Flotation & Waterline Physics Animation
  // -------------------------------------------------------------
  useEffect(() => {
    if (activeTab !== 'hydrostatics') return;
    let animId: number;
    let time = 0;

    const canvas = hydroCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const render = () => {
      time += 0.03;
      const w = canvas.width;
      const h = canvas.height;
      const cx = w / 2;
      const cy = h / 2 + 30;

      // Clear
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, w, h);

      // Hydrostatic physics calculation — Synchronized with TOOL-HYDROSTATICS-01 & Optimizer
      const rho = 1.025; // t/m^3
      const volume = hydroMass / rho; // m^3
      const lwl = vesselLwl;
      const beam = vesselBeam;
      const cb = 0.42;
      const cwp = 0.64;
      // Draft T = V / (L * B * Cb)
      const draft = volume > 0 ? volume / (lwl * beam * cb) : vesselDraft;
      const kb = draft * (5 / 6 - cb / (3 * cwp)); // Center of Buoyancy above keel (Normand formula)
      const It = (1 / 12) * cwp * lwl * Math.pow(beam, 3);
      const bmt = volume > 0 ? It / volume : 1.64; // Transverse metacentric radius
      const kmt = kb + bmt; // Metacenter above keel
      const gmt = Math.max(kmt - hydroKg, 0); // Metacentric height GMt

      // Wave elevation at hull location
      const waveY = Math.sin(time * waveFreq) * (waveAmp * 40);
      const waveSlopeDeg = Math.cos(time * waveFreq) * waveAmp * 8;

      // Restoring moment: RM = Delta * GM * sin(theta)
      // Vessel rolls toward wave slope with damped oscillation
      const naturalRollPeriod = (2 * Math.PI * beam * 0.4) / Math.sqrt(9.81 * Math.max(gmt, 0.05));
      const targetRoll = waveSlopeDeg * (1.0 / (1 + naturalRollPeriod * 0.2));
      const simulatedHeel = targetRoll;
      setHeelAngle(simulatedHeel);

      // Draw Animated Water Surface
      ctx.fillStyle = 'rgba(14, 116, 144, 0.45)';
      ctx.beginPath();
      ctx.moveTo(0, cy);
      for (let x = 0; x <= w; x += 10) {
        const y = cy + Math.sin(time * waveFreq + (x - cx) * 0.02) * (waveAmp * 35);
        ctx.lineTo(x, y);
      }
      ctx.lineTo(w, h);
      ctx.lineTo(0, h);
      ctx.closePath();
      ctx.fill();

      // Deep Water Overlay
      ctx.fillStyle = 'rgba(8, 47, 73, 0.7)';
      ctx.fillRect(0, cy + 40, w, h - (cy + 40));

      // Draw Waterline Baseline
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.3)';
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(0, cy);
      ctx.lineTo(w, cy);
      ctx.stroke();
      ctx.setLineDash([]);

      // Draw Floating Hull Transverse Section
      const pixelsPerMeter = 90;
      const hullBeamPx = beam * pixelsPerMeter;
      const hullDepthPx = 1.6 * pixelsPerMeter;
      const draftPx = draft * pixelsPerMeter;

      ctx.save();
      // Hull origin at center of waterline
      ctx.translate(cx, cy + waveY);
      ctx.rotate((simulatedHeel * Math.PI) / 180);

      // Hull Keel / Chines Profile (V-hull deadrise 20°)
      ctx.fillStyle = '#0f766e'; // Composite Gelcoat
      ctx.strokeStyle = '#2dd4bf';
      ctx.lineWidth = 3;

      ctx.beginPath();
      ctx.moveTo(-hullBeamPx / 2, -hullDepthPx + draftPx); // Port Deck Gunwale
      ctx.lineTo(-hullBeamPx * 0.45, draftPx * 0.3); // Port Chine
      ctx.lineTo(0, draftPx); // Keel (V-bottom)
      ctx.lineTo(hullBeamPx * 0.45, draftPx * 0.3); // Starboard Chine
      ctx.lineTo(hullBeamPx / 2, -hullDepthPx + draftPx); // Starboard Deck Gunwale
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Deck line
      ctx.strokeStyle = '#5eead4';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-hullBeamPx / 2, -hullDepthPx + draftPx);
      ctx.lineTo(hullBeamPx / 2, -hullDepthPx + draftPx);
      ctx.stroke();

      // Internal Subsystems & Centers (K, B, G, M)
      const keelY = draftPx;
      const kY = keelY;
      const bY = keelY - kb * pixelsPerMeter;
      const gY = keelY - hydroKg * pixelsPerMeter;
      const mY = keelY - kmt * pixelsPerMeter;

      // Keel (K) Marker
      ctx.fillStyle = '#94a3b8';
      ctx.beginPath();
      ctx.arc(0, kY, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillText('K (Keel)', 8, kY + 3);

      // Center of Buoyancy (B) Marker
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.arc(0, bY, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillText(`B (KB=${kb.toFixed(2)}m)`, 10, bY + 3);

      // Center of Gravity (G) Marker
      ctx.fillStyle = '#f43f5e';
      ctx.beginPath();
      ctx.arc(0, gY, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillText(`G (KG=${hydroKg.toFixed(2)}m)`, 10, gY + 3);

      // Metacenter (M) Marker
      ctx.fillStyle = gmt > 0 ? '#10b981' : '#ef4444';
      ctx.beginPath();
      ctx.arc(0, mY, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillText(`M (KM=${kmt.toFixed(2)}m)`, 10, mY + 3);

      // Righting Arm GZ line if tilted
      if (Math.abs(simulatedHeel) > 0.5) {
        ctx.strokeStyle = '#eab308';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, gY);
        const gzLen = gmt * Math.sin((simulatedHeel * Math.PI) / 180) * pixelsPerMeter;
        ctx.lineTo(-gzLen, gY);
        ctx.stroke();
      }

      ctx.restore();

      // Static Telemetry overlay on tank
      ctx.fillStyle = '#0f172a';
      ctx.font = '12px monospace';
      ctx.fillText(`Draft (T): ${draft.toFixed(2)} m`, 20, 30);
      ctx.fillText(`Displacement (Δ): ${hydroMass.toFixed(1)} t`, 20, 50);
      ctx.fillText(`Transverse GMt: ${gmt.toFixed(2)} m`, 20, 70);
      ctx.fillText(`Heel Angle (θ): ${simulatedHeel.toFixed(1)}°`, 20, 90);

      // IMO Status
      const isCompliant = gmt >= 0.35;
      ctx.fillStyle = isCompliant ? '#059669' : '#dc2626';
      ctx.fillText(
        `IMO MSC.267(85) Status: ${isCompliant ? 'PASS (GMt >= 0.35m)' : 'FAIL / UNSTABLE'}`,
        20,
        115
      );

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [activeTab, hydroMass, hydroKg, waveAmp, waveFreq]);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs text-teal-400 bg-teal-500/10 border border-teal-500/30 px-2 py-0.5 rounded flex items-center gap-1.5">
              <Compass className="w-3.5 h-3.5" /> REALTIME-SIM
            </span>
            <span className="text-xs text-slate-500 font-mono">AUTONOMY & HYDRODYNAMIC SIMULATOR</span>
          </div>
          <h2 className="text-xl font-bold text-slate-100 mt-1">
            Real-Time COLREGs Autonomous Navigation & Flotation Dynamics
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Interactive closed-loop kinematics, statutory collision avoidance (Rules 13, 14, 15), radar perception sweeps, and hydrostatic restoration physics.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => onAskAi?.('Audit the real-time COLREGs evasive maneuver telemetry and IMO MSC.267(85) hydrostatic righting arm stability curve.')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/30 text-sky-300 text-xs transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>AI Sim Audit</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-800 gap-2 text-xs font-mono">
        <button
          onClick={() => setActiveTab('design3d')}
          className={`px-4 py-2 border-b-2 font-medium transition-colors flex items-center gap-2 ${
            activeTab === 'design3d'
              ? 'border-teal-400 text-teal-300 bg-slate-900/40'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Rotate3d className="w-4 h-4 text-cyan-400" />
          <span>1. 3D Boat Design & CAD Mesh</span>
        </button>

        <button
          onClick={() => setActiveTab('hydrostatics')}
          className={`px-4 py-2 border-b-2 font-medium transition-colors flex items-center gap-2 ${
            activeTab === 'hydrostatics'
              ? 'border-teal-400 text-teal-300 bg-slate-900/40'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Waves className="w-4 h-4 text-cyan-400" />
          <span>2. Flotation & Intact Stability Wave Tank</span>
        </button>

        <button
          onClick={() => setActiveTab('radar')}
          className={`px-4 py-2 border-b-2 font-medium transition-colors flex items-center gap-2 ${
            activeTab === 'radar'
              ? 'border-teal-400 text-teal-300 bg-slate-900/40'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Radio className="w-4 h-4 text-teal-400" />
          <span>3. Tactical Radar & Autonomous COLREGs View</span>
        </button>
      </div>

      {/* TAB 1: 3D BOAT DESIGN & CAD MESH */}
      {activeTab === 'design3d' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8 bg-slate-900 border border-slate-800 rounded-lg p-4 space-y-3">
            {/* Header and Preset Switcher */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-3 border-b border-slate-800 gap-2 text-xs">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono text-cyan-400 font-bold flex items-center gap-1.5">
                  <Rotate3d className="w-4 h-4" /> 3D Vessel Design & Perception Mast
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 font-bold">
                  {activeDesignLabel}
                </span>
              </div>

              {/* Quick Design Switcher */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[10px] text-slate-400 font-mono">LOAD DESIGN:</span>
                <button
                  onClick={() => handleApplyDesignPreset('REV04')}
                  className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold transition ${
                    activeDesignLabel.includes('REV 0.4')
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                      : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Rev 0.4 (10.5m)
                </button>
                <button
                  onClick={() => handleApplyDesignPreset('CHAMPION')}
                  className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold transition ${
                    activeDesignLabel.includes('CHAMPION')
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Optimizer Champion
                </button>
                <button
                  onClick={() => handleApplyDesignPreset('SPRINT')}
                  className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold transition ${
                    activeDesignLabel.includes('SPRINT')
                      ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                      : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Sprint (9.8m)
                </button>
                <button
                  onClick={() => handleApplyDesignPreset('GUARDIAN')}
                  className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold transition ${
                    activeDesignLabel.includes('GUARDIAN')
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                      : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Guardian (11.4m)
                </button>
                {onNavigateToOptimizer && (
                  <button
                    onClick={onNavigateToOptimizer}
                    className="ml-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-purple-600/20 hover:bg-purple-600/40 text-purple-300 border border-purple-500/40 flex items-center gap-1 transition"
                  >
                    <Sparkles className="w-3 h-3 text-purple-400" />
                    <span>AI Optimizer ➔</span>
                  </button>
                )}
              </div>
            </div>

            <div className="rounded-lg overflow-hidden border border-slate-800 bg-slate-950">
              <Vessel3DVisualizer
                initialHullType="MONOHULL"
                lwlMeters={vesselLwl}
                beamMeters={vesselBeam}
                draftMeters={vesselDraft}
                displacementTonnes={hydroMass}
                status="VALIDATED"
                candidateId={activeDesignLabel}
                className="w-full h-[480px]"
              />
            </div>
          </div>

          <div className="lg:col-span-4 space-y-4 font-mono text-xs">
            <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 space-y-3">
              <div className="border-b border-slate-800 pb-2 flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase tracking-wider text-slate-500 block">DESIGN SPECIFICATIONS</span>
                  <span className="text-cyan-400 font-bold text-sm">USV-01 PLANING MONOHULL</span>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">
                  CLOSED-LOOP SYNC
                </span>
              </div>
              <div className="space-y-2 text-slate-300">
                <div className="flex justify-between"><span>Length Waterline (LWL):</span> <strong className="text-white">{vesselLwl.toFixed(2)} m</strong></div>
                <div className="flex justify-between"><span>Beam Overall (B):</span> <strong className="text-white">{vesselBeam.toFixed(2)} m</strong></div>
                <div className="flex justify-between"><span>Draft Molded (T):</span> <strong className="text-white">{vesselDraft.toFixed(2)} m</strong></div>
                <div className="flex justify-between"><span>Metacentric Height (GMt):</span> <strong className="text-teal-400">{vesselGmt.toFixed(2)} m</strong></div>
                <div className="flex justify-between"><span>Max Sprint Speed:</span> <strong className="text-cyan-400">{vesselSprint.toFixed(1)} knots</strong></div>
                <div className="flex justify-between"><span>Freeboard (fb):</span> <strong className="text-white">0.80 m</strong></div>
                <div className="flex justify-between"><span>Deadrise Angle:</span> <strong className="text-white">19° Deep-V</strong></div>
                <div className="flex justify-between"><span>Displacement (Δ):</span> <strong className="text-amber-400">{hydroMass.toFixed(2)} t</strong></div>
                <div className="flex justify-between"><span>Vertical CG (KG):</span> <strong className="text-amber-400">{hydroKg.toFixed(2)} m</strong></div>
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 space-y-3">
              <div className="border-b border-slate-800 pb-2">
                <span className="text-[10px] uppercase tracking-wider text-slate-500 block">INTEGRATED PERCEPTION SUITE</span>
                <span className="text-purple-400 font-bold text-sm">GATE 1 SENSOR MAST</span>
              </div>
              <div className="space-y-2 text-slate-300 text-[11px]">
                <div className="flex justify-between"><span>Radar:</span> <strong className="text-white">Simrad HALO24 (60 RPM)</strong></div>
                <div className="flex justify-between"><span>LiDAR:</span> <strong className="text-white">Ouster OS1-32 (120m)</strong></div>
                <div className="flex justify-between"><span>EO/IR Turret:</span> <strong className="text-white">FLIR SeaFLIR 230 HD</strong></div>
                <div className="flex justify-between"><span>Propulsion:</span> <strong className="text-emerald-400">Twin Azimuth Pods (182 kW)</strong></div>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-teal-950/40 border border-teal-500/30 text-[11px] text-teal-300">
              <CheckCircle2 className="w-3.5 h-3.5 inline mr-1 text-teal-400" />
              Direct closed-loop rendering: 3D CAD mesh, wave tank physics, and SharedMemory update in real time when agents or the optimizer find new validated parameters.
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: RADAR & AUTONOMOUS NAVIGATION */}
      {activeTab === 'radar' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Main Radar Screen (Canvas) */}
          <div className="lg:col-span-8 bg-slate-900 border border-slate-800 rounded-lg p-4 space-y-3">
            {/* Controls Bar */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 flex-wrap gap-2 text-xs">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsPlaying(!isPlaying)}
                  className={`px-3 py-1.5 rounded flex items-center gap-1.5 font-medium transition-colors ${
                    isPlaying
                      ? 'bg-amber-500/15 border border-amber-500/40 text-amber-300 hover:bg-amber-500/25'
                      : 'bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/25'
                  }`}
                >
                  {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                  <span>{isPlaying ? 'Pause' : 'Resume'}</span>
                </button>

                <div className="flex items-center border border-slate-800 rounded overflow-hidden font-mono text-[11px]">
                  {[1, 2, 5].map((spd) => (
                    <button
                      key={spd}
                      onClick={() => setSimSpeed(spd)}
                      className={`px-2 py-1 transition-colors ${
                        simSpeed === spd ? 'bg-teal-500/20 text-teal-300 font-bold' : 'bg-slate-950 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {spd}x
                    </button>
                  ))}
                </div>

                <button
                  onClick={() => loadScenario(selectedScenario)}
                  className="px-2.5 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center gap-1 transition-colors"
                  title="Reset Scenario"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset</span>
                </button>
              </div>

              {/* Scenario Selector */}
              <div className="flex items-center gap-2">
                <span className="text-slate-400 text-[11px]">Scenario:</span>
                <select
                  value={selectedScenario}
                  onChange={(e) => loadScenario(e.target.value)}
                  className="bg-slate-950 border border-slate-700 rounded px-2.5 py-1 text-slate-200 font-mono text-xs focus:outline-none focus:border-teal-500"
                >
                  <option value="rule14_headon">Rule 14: Head-On Encounter (Both Turn Starboard)</option>
                  <option value="rule15_crossing_giveway">Rule 15: Starboard Crossing (USV Give-Way)</option>
                  <option value="rule15_crossing_standon">Rule 15: Port Crossing (USV Stand-On)</option>
                  <option value="rule13_overtaking">Rule 13: Overtaking Slower Vessel</option>
                  <option value="multi_channel">Multi-Vessel & Buoy Channel Navigation</option>
                </select>
              </div>
            </div>

            {/* Radar Canvas */}
            <div className="relative rounded overflow-hidden border border-slate-800 bg-slate-950 flex items-center justify-center">
              <canvas
                ref={radarCanvasRef}
                width={700}
                height={550}
                onClick={handleCanvasClick}
                className="w-full h-auto cursor-crosshair block"
              />

              {/* In-canvas Click Hint */}
              <div className="absolute bottom-2 left-3 text-[10px] font-mono text-slate-400 bg-slate-950/80 px-2 py-1 rounded border border-slate-800 pointer-events-none">
                💡 Tip: Click anywhere on radar to spawn dynamic target vessels
              </div>
            </div>

            {/* Display Toggles */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-[11px] font-mono text-slate-400">
              <div className="flex items-center gap-4 flex-wrap">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showRadarSweep}
                    onChange={(e) => setShowRadarSweep(e.target.checked)}
                    className="rounded bg-slate-900 border-slate-700 text-teal-500 focus:ring-0"
                  />
                  <span>FMCW Radar Sweep</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showLidarCone}
                    onChange={(e) => setShowLidarCone(e.target.checked)}
                    className="rounded bg-slate-900 border-slate-700 text-teal-500 focus:ring-0"
                  />
                  <span>3D LiDAR 120° Field</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showVectors}
                    onChange={(e) => setShowVectors(e.target.checked)}
                    className="rounded bg-slate-900 border-slate-700 text-teal-500 focus:ring-0"
                  />
                  <span>Velocity Vectors</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showRangeRings}
                    onChange={(e) => setShowRangeRings(e.target.checked)}
                    className="rounded bg-slate-900 border-slate-700 text-teal-500 focus:ring-0"
                  />
                  <span>Range Rings</span>
                </label>
              </div>

              <span>Grid: 1100m x 1100m</span>
            </div>
          </div>

          {/* Right Column: Live Telemetry & COLREGs Decision Engine */}
          <div className="lg:col-span-4 space-y-4">
            {/* Live Autonomy State Card */}
            <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <h3 className="text-xs font-semibold text-slate-200 flex items-center gap-2">
                  <Activity className="w-4 h-4 text-teal-400" />
                  <span>Autonomy Executive Status</span>
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-teal-500/10 border border-teal-500/30 text-teal-300">
                  50 Hz DDS
                </span>
              </div>

              {/* State Badge */}
              <div className="p-3 bg-slate-950 rounded border border-slate-800 space-y-2">
                <div className="text-[11px] font-mono text-slate-400">CURRENT EXECUTIVE STATE:</div>
                <div className="flex items-center gap-2">
                  <span className={`w-2.5 h-2.5 rounded-full ${
                    colregsState === 'GIVE_WAY_ALTER_STARBOARD'
                      ? 'bg-amber-400 animate-pulse'
                      : colregsState === 'STAND_ON'
                      ? 'bg-sky-400'
                      : 'bg-emerald-400'
                  }`} />
                  <span className="font-mono text-xs font-bold text-slate-100">
                    {colregsState}
                  </span>
                </div>
                <div className="text-[11px] font-mono text-teal-400">
                  Applicable Statutory Code: {activeRule}
                </div>
              </div>

              {/* Telemetry Grid */}
              <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                <div className="p-2.5 bg-slate-950 rounded border border-slate-800">
                  <div className="text-[10px] text-slate-500">SPEED OVER GROUND</div>
                  <div className="text-base font-bold text-slate-200 mt-0.5">{usvSpeed.toFixed(1)} <span className="text-xs font-normal text-slate-400">kts</span></div>
                </div>

                <div className="p-2.5 bg-slate-950 rounded border border-slate-800">
                  <div className="text-[10px] text-slate-500">GYRO HEADING</div>
                  <div className="text-base font-bold text-slate-200 mt-0.5">{usvHeading.toFixed(1)}° <span className="text-xs font-normal text-slate-400">True</span></div>
                </div>

                <div className="p-2.5 bg-slate-950 rounded border border-slate-800">
                  <div className="text-[10px] text-slate-500">POD STEER DEMAND</div>
                  <div className={`text-base font-bold mt-0.5 ${rudderAngle > 1 ? 'text-amber-400' : rudderAngle < -1 ? 'text-sky-400' : 'text-slate-200'}`}>
                    {rudderAngle.toFixed(1)}° {rudderAngle > 0 ? 'STBD' : rudderAngle < 0 ? 'PORT' : 'MID'}
                  </div>
                </div>

                <div className="p-2.5 bg-slate-950 rounded border border-slate-800">
                  <div className="text-[10px] text-slate-500">TWIN DRIVE PWM</div>
                  <div className="text-base font-bold text-emerald-400 mt-0.5">82% <span className="text-xs font-normal text-slate-400">sync</span></div>
                </div>
              </div>

              {/* Threat & CPA / TCPA Metrics */}
              <div className="p-3 bg-slate-950 rounded border border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-slate-400">CLOSEST POINT (CPA):</span>
                  <span className={`font-bold ${threatLevel === 'CRITICAL' ? 'text-rose-400' : threatLevel === 'ADVISORY' ? 'text-amber-400' : 'text-emerald-400'}`}>
                    {closestCPA < 900 ? `${closestCPA.toFixed(0)} meters` : 'CLEAR (>900m)'}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-slate-400">TIME TO CPA (TCPA):</span>
                  <span className="font-bold text-slate-200">
                    {closestTCPA < 900 ? `${closestTCPA.toFixed(0)} seconds` : 'N/A'}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs font-mono pt-1 border-t border-slate-800/80">
                  <span className="text-slate-400">COLLISION THREAT:</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    threatLevel === 'CRITICAL' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40' :
                    threatLevel === 'ADVISORY' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' :
                    'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  }`}>
                    {threatLevel}
                  </span>
                </div>
              </div>
            </div>

            {/* Environmental Conditions */}
            <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 space-y-3">
              <h3 className="text-xs font-semibold text-slate-200 flex items-center gap-2">
                <Sliders className="w-4 h-4 text-teal-400" />
                <span>Environmental Disturbances</span>
              </h3>

              <div className="space-y-2.5 text-xs font-mono">
                <div>
                  <div className="flex justify-between text-slate-400 mb-1">
                    <span>True Wind Speed</span>
                    <span className="text-slate-200">{windSpeed} knots</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="35"
                    value={windSpeed}
                    onChange={(e) => setWindSpeed(Number(e.target.value))}
                    className="w-full accent-teal-400 h-1 bg-slate-950 rounded cursor-pointer"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-slate-400 mb-1">
                    <span>Sea State (Douglas Scale)</span>
                    <span className="text-slate-200">State {seaState} ({seaState === 0 ? 'Calm' : seaState === 1 ? 'Slight' : seaState === 2 ? 'Moderate' : 'Rough'})</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="3"
                    value={seaState}
                    onChange={(e) => setSeaState(Number(e.target.value))}
                    className="w-full accent-teal-400 h-1 bg-slate-950 rounded cursor-pointer"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: FLOTATION & HYDROSTATIC STABILITY TANK */}
      {activeTab === 'hydrostatics' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Main Tank Canvas */}
          <div className="lg:col-span-8 bg-slate-900 border border-slate-800 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Waves className="w-4 h-4 text-cyan-400" />
                <h3 className="text-xs font-semibold text-slate-200">
                  Dynamic Hydrostatic Flotation & Restoration Tank (Transverse Section)
                </h3>
              </div>
              <span className="text-[10px] font-mono text-slate-400">
                ARCHIMEDES & METACENTRIC RESTORATION
              </span>
            </div>

            {/* Flotation Canvas */}
            <div className="rounded overflow-hidden border border-slate-800 bg-slate-950 flex items-center justify-center">
              <canvas
                ref={hydroCanvasRef}
                width={720}
                height={460}
                className="w-full h-auto block"
              />
            </div>

            <div className="p-3 bg-slate-950 rounded border border-slate-800 text-xs text-slate-400 leading-relaxed">
              <div className="font-semibold text-slate-200 mb-1">Why the USV-01 Floats and Self-Rights:</div>
              The vessel floats because buoyant force ($F_B = \rho g \nabla$) balances total weight ($F_g = \Delta g$). Because the transverse metacenter ($M$) sits comfortably above the vertical center of gravity ($G$), any roll induced by waves produces an instantaneous positive righting lever ($GZ = GM_t \sin\theta$) that restores the boat upright.
            </div>
          </div>

          {/* Right Column: Physical Controls & Math Audit */}
          <div className="lg:col-span-4 space-y-4">
            <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 space-y-4">
              <h3 className="text-xs font-semibold text-slate-200 flex items-center gap-2 pb-2 border-b border-slate-800">
                <Sliders className="w-4 h-4 text-cyan-400" />
                <span>Parametric Naval Architecture Sliders</span>
              </h3>

              {/* Length LWL */}
              <div className="space-y-1 text-xs font-mono">
                <div className="flex justify-between text-slate-400">
                  <span>Waterline Length (LWL)</span>
                  <span className="text-cyan-300 font-bold">{vesselLwl.toFixed(2)} m</span>
                </div>
                <input
                  type="range"
                  min="8.0"
                  max="14.0"
                  step="0.1"
                  value={vesselLwl}
                  onChange={(e) => setVesselLwl(Number(e.target.value))}
                  className="w-full accent-cyan-400 h-1 bg-slate-950 rounded cursor-pointer"
                />
              </div>

              {/* Beam */}
              <div className="space-y-1 text-xs font-mono">
                <div className="flex justify-between text-slate-400">
                  <span>Waterline Beam (B)</span>
                  <span className="text-cyan-300 font-bold">{vesselBeam.toFixed(2)} m</span>
                </div>
                <input
                  type="range"
                  min="2.0"
                  max="4.0"
                  step="0.05"
                  value={vesselBeam}
                  onChange={(e) => setVesselBeam(Number(e.target.value))}
                  className="w-full accent-cyan-400 h-1 bg-slate-950 rounded cursor-pointer"
                />
              </div>

              {/* Mass */}
              <div className="space-y-1 text-xs font-mono">
                <div className="flex justify-between text-slate-400">
                  <span>Full Load Displacement (Δ)</span>
                  <span className="text-teal-300 font-bold">{hydroMass.toFixed(2)} tonnes</span>
                </div>
                <input
                  type="range"
                  min="3.0"
                  max="14.0"
                  step="0.1"
                  value={hydroMass}
                  onChange={(e) => setHydroMass(Number(e.target.value))}
                  className="w-full accent-teal-400 h-1 bg-slate-950 rounded cursor-pointer"
                />
                <div className="text-[10px] text-slate-500">Heavier displacement deepens draft (T)</div>
              </div>

              {/* KG */}
              <div className="space-y-1 text-xs font-mono">
                <div className="flex justify-between text-slate-400">
                  <span>Vertical Center of Gravity (KG)</span>
                  <span className="text-rose-300 font-bold">{hydroKg.toFixed(2)} meters</span>
                </div>
                <input
                  type="range"
                  min="0.4"
                  max="1.5"
                  step="0.02"
                  value={hydroKg}
                  onChange={(e) => setHydroKg(Number(e.target.value))}
                  className="w-full accent-rose-400 h-1 bg-slate-950 rounded cursor-pointer"
                />
                <div className="text-[10px] text-slate-500">Keep low (batteries in keel) for high GMt</div>
              </div>

              {/* Wave Amplitude */}
              <div className="space-y-1 text-xs font-mono">
                <div className="flex justify-between text-slate-400">
                  <span>Wave Amplitude</span>
                  <span className="text-cyan-300 font-bold">{waveAmp.toFixed(2)} meters</span>
                </div>
                <input
                  type="range"
                  min="0.0"
                  max="0.8"
                  step="0.05"
                  value={waveAmp}
                  onChange={(e) => setWaveAmp(Number(e.target.value))}
                  className="w-full accent-cyan-400 h-1 bg-slate-950 rounded cursor-pointer"
                />
              </div>

              {/* Wave Frequency */}
              <div className="space-y-1 text-xs font-mono">
                <div className="flex justify-between text-slate-400">
                  <span>Wave Encounter Frequency</span>
                  <span className="text-cyan-300 font-bold">{waveFreq.toFixed(1)} rad/s</span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="2.5"
                  step="0.1"
                  value={waveFreq}
                  onChange={(e) => setWaveFreq(Number(e.target.value))}
                  className="w-full accent-cyan-400 h-1 bg-slate-950 rounded cursor-pointer"
                />
              </div>

              {/* Reset to Rev 0.4 Baseline */}
              <button
                onClick={() => handleApplyDesignPreset('REV04')}
                className="w-full py-1.5 rounded bg-cyan-600/20 hover:bg-cyan-600/30 border border-cyan-500/40 text-cyan-300 text-xs font-mono font-bold flex items-center justify-center gap-1.5 transition-colors"
                title="Reset to Rev 0.4 Approved Baseline"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset to Rev 0.4 Baseline (10.5m)</span>
              </button>

              {/* Sync with Optimizer Champion */}
              <button
                onClick={() => handleApplyDesignPreset('CHAMPION')}
                className="w-full py-1.5 rounded bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 text-xs font-mono font-bold flex items-center justify-center gap-1.5 transition-colors"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Sync with Optimizer Champion</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
