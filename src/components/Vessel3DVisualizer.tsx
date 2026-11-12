import React, { useEffect, useRef, useState, useMemo } from 'react';
import {
  Rotate3d,
  Maximize2,
  Minimize2,
  Layers,
  Activity,
  Compass,
  ZoomIn,
  ZoomOut,
  Camera,
  Sparkles,
  Info,
  Waves,
  Eye,
  CheckCircle2
} from 'lucide-react';

export type VesselVisualMode = 'REALISTIC' | 'CFD_PRESSURE' | 'XRAY_STRUCTURAL' | 'WIREFRAME';
export type CameraPreset = 'ISOMETRIC' | 'SIDE_PROFILE' | 'TOP_PLAN' | 'FRONT_BOW' | 'STERN_AFT';

export interface Vessel3DVisualizerProps {
  lwlMeters?: number;
  beamMeters?: number;
  draftMeters?: number;
  deadriseDeg?: number;
  displacementTonnes?: number;
  candidateId?: string;
  status?: string;
  initialHullType?: 'CATAMARAN' | 'MONOHULL';
  showPhotoRenderToggle?: boolean;
  className?: string;
}

interface Point3D {
  x: number;
  y: number;
  z: number;
}

interface Polygon3D {
  pts: Point3D[];
  normal?: Point3D;
  color: string;
  wireColor?: string;
  component: 'HULL' | 'DECK' | 'CABIN' | 'WINDOW' | 'MAST' | 'RADAR' | 'FLIR' | 'WATERJET' | 'WATERLINE' | 'INTERNAL';
  cfdPressure?: number; // 0 (low/suction) to 1 (high stagnation)
  opacity?: number;
}

export const Vessel3DVisualizer: React.FC<Vessel3DVisualizerProps> = ({
  lwlMeters = 10.5,
  beamMeters = 2.9,
  draftMeters = 0.65,
  deadriseDeg = 20,
  displacementTonnes = 6.2,
  candidateId = 'USV-01-REV-0.4',
  status = 'BASELINED',
  initialHullType = 'MONOHULL',
  showPhotoRenderToggle = true,
  className = ''
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // User Interactive View State
  const [pitch, setPitch] = useState<number>(0.42); // Elevation angle in radians (~24°)
  const [yaw, setYaw] = useState<number>(0.75); // Azimuth angle in radians (~43°)
  const [zoom, setZoom] = useState<number>(1.0);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [lastMousePos, setLastMousePos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [autoRotate, setAutoRotate] = useState<boolean>(false);
  const [renderMode, setRenderMode] = useState<VesselVisualMode>('REALISTIC');
  const [hullType, setHullType] = useState<'CATAMARAN' | 'MONOHULL'>(initialHullType);
  const [showWaterplane, setShowWaterplane] = useState<boolean>(true);
  const [showPhotoRender, setShowPhotoRender] = useState<boolean>(false);
  const [isExpanded, setIsExpanded] = useState<boolean>(false);

  // Synchronize dynamic morphing when candidate or prop changes
  useEffect(() => {
    if (initialHullType) {
      setHullType(initialHullType);
    }
  }, [initialHullType, candidateId]);

  // Animation ticks for rotating radar & moving streamlines
  const [animTime, setAnimTime] = useState<number>(0);
  const animFrameRef = useRef<number | null>(null);

  useEffect(() => {
    let startTime = performance.now();
    const loop = (now: number) => {
      const dt = (now - startTime) / 1000;
      setAnimTime(dt);
      if (autoRotate) {
        setYaw((prev) => (prev + 0.008) % (Math.PI * 2));
      }
      animFrameRef.current = requestAnimationFrame(loop);
    };
    animFrameRef.current = requestAnimationFrame(loop);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [autoRotate]);

  // Set Camera Presets
  const applyCameraPreset = (preset: CameraPreset) => {
    setAutoRotate(false);
    switch (preset) {
      case 'ISOMETRIC':
        setPitch(0.45);
        setYaw(0.78);
        setZoom(1.0);
        break;
      case 'SIDE_PROFILE':
        setPitch(0.05);
        setYaw(Math.PI / 2);
        setZoom(1.1);
        break;
      case 'TOP_PLAN':
        setPitch(1.52); // ~87° top-down
        setYaw(0);
        setZoom(1.0);
        break;
      case 'FRONT_BOW':
        setPitch(0.12);
        setYaw(0);
        setZoom(1.2);
        break;
      case 'STERN_AFT':
        setPitch(0.2);
        setYaw(Math.PI);
        setZoom(1.2);
        break;
    }
  };

  // Mouse / Touch Drag Controls
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDragging(true);
    setLastMousePos({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging) return;
    const dx = e.clientX - lastMousePos.x;
    const dy = e.clientY - lastMousePos.y;
    setYaw((prev) => prev + dx * 0.008);
    setPitch((prev) => Math.max(-0.25, Math.min(1.55, prev + dy * 0.008)));
    setLastMousePos({ x: e.clientX, y: e.clientY });
  };

  const handleMouseUp = () => setIsDragging(false);

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    setZoom((prev) => Math.max(0.6, Math.min(2.5, prev - e.deltaY * 0.0015)));
  };

  // Touch Handlers for Mobile / Tablet
  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (e.touches.length === 1) {
      setIsDragging(true);
      setLastMousePos({ x: e.touches[0].clientX, y: e.touches[0].clientY });
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDragging || e.touches.length !== 1) return;
    const dx = e.touches[0].clientX - lastMousePos.x;
    const dy = e.touches[0].clientY - lastMousePos.y;
    setYaw((prev) => prev + dx * 0.008);
    setPitch((prev) => Math.max(-0.25, Math.min(1.55, prev + dy * 0.008)));
    setLastMousePos({ x: e.touches[0].clientX, y: e.touches[0].clientY });
  };

  const handleTouchEnd = () => setIsDragging(false);

  // 3D Geometry Synthesis based on Free Design Parameters
  const geometry = useMemo(() => {
    const polys: Polygon3D[] = [];

    // Scale factors (1 unit = 1 meter)
    const L = Math.max(6.0, Math.min(14.0, lwlMeters));
    const B = Math.max(1.8, Math.min(4.2, beamMeters));
    const T = Math.max(0.4, Math.min(1.1, draftMeters));
    const fb = 0.95; // Freeboard height above waterline (deck level Z = fb)
    const keelZ = -T; // Keel bottom depth Z = -T
    const deckZ = fb;

    const radarAngle = animTime * 2.5; // Radar rotation

    if (hullType === 'CATAMARAN') {
      // Wave-Piercing Semi-SWATH Catamaran Geometry
      const demiHullSpacing = B * 0.36; // Spacing from centerline to port/stbd demi-hull center
      const demiHullBeam = B * 0.28; // Beam of each demi-hull
      const wetDeckZ = 0.35; // Wet deck clearance above waterline

      // Build Port & Starboard Demi-Hulls
      [-1, 1].forEach((side) => {
        const yCenter = side * demiHullSpacing;
        const yInner = yCenter - (side * demiHullBeam) / 2;
        const yOuter = yCenter + (side * demiHullBeam) / 2;

        // Wave-Piercing Stem Points
        const bowTip: Point3D = { x: L * 0.52, y: yCenter, z: 0.1 };
        const bowDeck: Point3D = { x: L * 0.48, y: yCenter, z: deckZ * 0.9 };
        const bowKeel: Point3D = { x: L * 0.50, y: yCenter, z: keelZ };

        // Midbody Stations
        const midX1 = L * 0.15;
        const midX2 = -L * 0.20;
        const transomX = -L * 0.48;

        // Demi-hull Outer Topsides
        polys.push({
          pts: [
            bowDeck,
            { x: midX1, y: yOuter, z: deckZ },
            { x: midX1, y: yOuter, z: 0 },
            bowTip
          ],
          color: '#e2e8f0',
          component: 'HULL',
          cfdPressure: 0.95
        });

        polys.push({
          pts: [
            { x: midX1, y: yOuter, z: deckZ },
            { x: midX2, y: yOuter, z: deckZ },
            { x: midX2, y: yOuter, z: 0 },
            { x: midX1, y: yOuter, z: 0 }
          ],
          color: '#f1f5f9',
          component: 'HULL',
          cfdPressure: 0.55
        });

        polys.push({
          pts: [
            { x: midX2, y: yOuter, z: deckZ },
            { x: transomX, y: yOuter * 0.95, z: deckZ * 0.85 },
            { x: transomX, y: yOuter * 0.95, z: 0 },
            { x: midX2, y: yOuter, z: 0 }
          ],
          color: '#cbd5e1',
          component: 'HULL',
          cfdPressure: 0.25
        });

        // Demi-hull Submerged Bottom / Deadrise Keel
        polys.push({
          pts: [
            bowTip,
            { x: midX1, y: yOuter, z: 0 },
            { x: midX1, y: yCenter, z: keelZ },
            bowKeel
          ],
          color: '#94a3b8',
          component: 'HULL',
          cfdPressure: 0.9
        });

        polys.push({
          pts: [
            { x: midX1, y: yOuter, z: 0 },
            { x: midX2, y: yOuter, z: 0 },
            { x: midX2, y: yCenter, z: keelZ },
            { x: midX1, y: yCenter, z: keelZ }
          ],
          color: '#64748b',
          component: 'HULL',
          cfdPressure: 0.45
        });

        polys.push({
          pts: [
            { x: midX2, y: yOuter, z: 0 },
            { x: transomX, y: yOuter * 0.95, z: 0 },
            { x: transomX, y: yCenter, z: keelZ },
            { x: midX2, y: yCenter, z: keelZ }
          ],
          color: '#475569',
          component: 'HULL',
          cfdPressure: 0.15
        });

        // Demi-hull Transom Plate (Stern)
        polys.push({
          pts: [
            { x: transomX, y: yOuter * 0.95, z: deckZ * 0.85 },
            { x: transomX, y: yInner * 0.95, z: deckZ * 0.85 },
            { x: transomX, y: yCenter, z: keelZ }
          ],
          color: '#334155',
          component: 'HULL',
          cfdPressure: 0.05
        });

        // Waterjet Nozzle (Aft of Transom)
        const jetX = transomX - 0.25;
        polys.push({
          pts: [
            { x: transomX, y: yCenter - 0.2, z: keelZ * 0.4 },
            { x: transomX, y: yCenter + 0.2, z: keelZ * 0.4 },
            { x: jetX, y: yCenter + 0.15, z: keelZ * 0.4 },
            { x: jetX, y: yCenter - 0.15, z: keelZ * 0.4 }
          ],
          color: '#0f766e',
          component: 'WATERJET',
          cfdPressure: 0.85
        });
      });

      // Bridgedeck Structure connecting port and starboard demi-hulls
      const pOuter = demiHullSpacing + demiHullBeam / 2;
      const sOuter = -pOuter;

      polys.push({
        pts: [
          { x: L * 0.35, y: demiHullSpacing, z: deckZ },
          { x: -L * 0.45, y: demiHullSpacing, z: deckZ },
          { x: -L * 0.45, y: -demiHullSpacing, z: deckZ },
          { x: L * 0.35, y: -demiHullSpacing, z: deckZ }
        ],
        color: '#f8fafc',
        component: 'DECK',
        cfdPressure: 0.3
      });

      // Wet Deck Arch (Underneath Bridgedeck)
      polys.push({
        pts: [
          { x: L * 0.30, y: demiHullSpacing * 0.8, z: wetDeckZ },
          { x: -L * 0.40, y: demiHullSpacing * 0.8, z: wetDeckZ },
          { x: -L * 0.40, y: -demiHullSpacing * 0.8, z: wetDeckZ },
          { x: L * 0.30, y: -demiHullSpacing * 0.8, z: wetDeckZ }
        ],
        color: '#cbd5e1',
        component: 'HULL',
        cfdPressure: 0.4
      });
    } else {
      // Stepped Deep-V Monohull Geometry
      const halfB = B / 2;
      const bowPoint: Point3D = { x: L * 0.50, y: 0, z: deckZ * 0.85 };
      const bowKeel: Point3D = { x: L * 0.45, y: 0, z: keelZ };

      const chineY = halfB * 0.95;
      const midX1 = L * 0.15;
      const stepX = -L * 0.05;
      const transomX = -L * 0.48;

      // Port Topsides
      polys.push({
        pts: [
          bowPoint,
          { x: midX1, y: halfB, z: deckZ },
          { x: midX1, y: chineY, z: 0.1 },
          { x: L * 0.42, y: halfB * 0.3, z: 0.1 }
        ],
        color: '#f1f5f9',
        component: 'HULL',
        cfdPressure: 0.92
      });

      polys.push({
        pts: [
          { x: midX1, y: halfB, z: deckZ },
          { x: transomX, y: halfB * 0.9, z: deckZ * 0.8 },
          { x: transomX, y: chineY * 0.9, z: 0.1 },
          { x: midX1, y: chineY, z: 0.1 }
        ],
        color: '#e2e8f0',
        component: 'HULL',
        cfdPressure: 0.5
      });

      // Starboard Topsides
      polys.push({
        pts: [
          bowPoint,
          { x: L * 0.42, y: -halfB * 0.3, z: 0.1 },
          { x: midX1, y: -chineY, z: 0.1 },
          { x: midX1, y: -halfB, z: deckZ }
        ],
        color: '#f1f5f9',
        component: 'HULL',
        cfdPressure: 0.92
      });

      polys.push({
        pts: [
          { x: midX1, y: -halfB, z: deckZ },
          { x: midX1, y: -chineY, z: 0.1 },
          { x: transomX, y: -chineY * 0.9, z: 0.1 },
          { x: transomX, y: -halfB * 0.9, z: deckZ * 0.8 }
        ],
        color: '#e2e8f0',
        component: 'HULL',
        cfdPressure: 0.5
      });

      // V-Bottom Deadrise Panels (Port & Starboard)
      polys.push({
        pts: [
          bowKeel,
          { x: L * 0.42, y: halfB * 0.3, z: 0.1 },
          { x: midX1, y: chineY, z: 0.1 },
          { x: midX1, y: 0, z: keelZ }
        ],
        color: '#64748b',
        component: 'HULL',
        cfdPressure: 0.85
      });

      polys.push({
        pts: [
          bowKeel,
          { x: midX1, y: 0, z: keelZ },
          { x: midX1, y: -chineY, z: 0.1 },
          { x: L * 0.42, y: -halfB * 0.3, z: 0.1 }
        ],
        color: '#64748b',
        component: 'HULL',
        cfdPressure: 0.85
      });

      // Hydrodynamic Ventilated Step
      polys.push({
        pts: [
          { x: midX1, y: chineY, z: 0.1 },
          { x: transomX, y: chineY * 0.9, z: 0.1 },
          { x: transomX, y: 0, z: keelZ * 0.85 },
          { x: midX1, y: 0, z: keelZ }
        ],
        color: '#475569',
        component: 'HULL',
        cfdPressure: 0.35
      });

      // Transom Plate
      polys.push({
        pts: [
          { x: transomX, y: halfB * 0.9, z: deckZ * 0.8 },
          { x: transomX, y: -halfB * 0.9, z: deckZ * 0.8 },
          { x: transomX, y: -chineY * 0.9, z: 0.1 },
          { x: transomX, y: 0, z: keelZ * 0.85 },
          { x: transomX, y: chineY * 0.9, z: 0.1 }
        ],
        color: '#334155',
        component: 'HULL',
        cfdPressure: 0.1
      });

      // Main Deck
      polys.push({
        pts: [
          bowPoint,
          { x: midX1, y: halfB, z: deckZ },
          { x: transomX, y: halfB * 0.9, z: deckZ * 0.8 },
          { x: transomX, y: -halfB * 0.9, z: deckZ * 0.8 },
          { x: midX1, y: -halfB, z: deckZ }
        ],
        color: '#f8fafc',
        component: 'DECK',
        cfdPressure: 0.25
      });
    }

    // Stealth Avionics Deckhouse / Cabin
    const cabinForeX = L * 0.18;
    const cabinAftX = -L * 0.12;
    const cabinWidth = B * 0.46;
    const cabinRoofZ = deckZ + 0.85;

    // Forward Raked Glazing (Stealth Bridge)
    polys.push({
      pts: [
        { x: cabinForeX + 0.35, y: -cabinWidth * 0.45, z: deckZ + 0.3 },
        { x: cabinForeX + 0.35, y: cabinWidth * 0.45, z: deckZ + 0.3 },
        { x: cabinForeX, y: cabinWidth * 0.4, z: cabinRoofZ },
        { x: cabinForeX, y: -cabinWidth * 0.4, z: cabinRoofZ }
      ],
      color: '#0284c7', // Tinted Marine Glass
      component: 'WINDOW',
      cfdPressure: 0.7
    });

    // Cabin Roof & Sides
    polys.push({
      pts: [
        { x: cabinForeX, y: -cabinWidth * 0.4, z: cabinRoofZ },
        { x: cabinForeX, y: cabinWidth * 0.4, z: cabinRoofZ },
        { x: cabinAftX, y: cabinWidth * 0.42, z: cabinRoofZ },
        { x: cabinAftX, y: -cabinWidth * 0.42, z: cabinRoofZ }
      ],
      color: '#334155',
      component: 'CABIN',
      cfdPressure: 0.4
    });

    polys.push({
      pts: [
        { x: cabinForeX + 0.35, y: cabinWidth * 0.45, z: deckZ + 0.3 },
        { x: cabinAftX, y: cabinWidth * 0.45, z: deckZ },
        { x: cabinAftX, y: cabinWidth * 0.42, z: cabinRoofZ },
        { x: cabinForeX, y: cabinWidth * 0.4, z: cabinRoofZ }
      ],
      color: '#1e293b',
      component: 'CABIN',
      cfdPressure: 0.3
    });

    polys.push({
      pts: [
        { x: cabinForeX + 0.35, y: -cabinWidth * 0.45, z: deckZ + 0.3 },
        { x: cabinForeX, y: -cabinWidth * 0.4, z: cabinRoofZ },
        { x: cabinAftX, y: -cabinWidth * 0.42, z: cabinRoofZ },
        { x: cabinAftX, y: -cabinWidth * 0.45, z: deckZ }
      ],
      color: '#1e293b',
      component: 'CABIN',
      cfdPressure: 0.3
    });

    // Naval Sensor Mast & Radar Platform
    const mastX = cabinAftX + 0.15;
    const mastTopZ = cabinRoofZ + 1.2;

    polys.push({
      pts: [
        { x: mastX + 0.15, y: -0.15, z: cabinRoofZ },
        { x: mastX + 0.15, y: 0.15, z: cabinRoofZ },
        { x: mastX - 0.1, y: 0.1, z: mastTopZ },
        { x: mastX - 0.1, y: -0.1, z: mastTopZ }
      ],
      color: '#475569',
      component: 'MAST',
      cfdPressure: 0.6
    });

    // Rotating Radar Scanner Bar (Rotates with animTime)
    const radSpan = 0.65;
    const cosR = Math.cos(radarAngle);
    const sinR = Math.sin(radarAngle);

    polys.push({
      pts: [
        { x: mastX + radSpan * cosR, y: radSpan * sinR, z: mastTopZ + 0.15 },
        { x: mastX - radSpan * cosR, y: -radSpan * sinR, z: mastTopZ + 0.15 },
        { x: mastX - radSpan * cosR, y: -radSpan * sinR, z: mastTopZ + 0.05 },
        { x: mastX + radSpan * cosR, y: radSpan * sinR, z: mastTopZ + 0.05 }
      ],
      color: '#0d9488', // Teal Radar Bar
      component: 'RADAR',
      cfdPressure: 0.8
    });

    // Forward Gyro-Stabilized FLIR Thermal Gimbal (Foredeck)
    const flirX = L * 0.32;
    polys.push({
      pts: [
        { x: flirX + 0.18, y: -0.18, z: deckZ + 0.05 },
        { x: flirX + 0.18, y: 0.18, z: deckZ + 0.05 },
        { x: flirX - 0.18, y: 0.18, z: deckZ + 0.05 },
        { x: flirX - 0.18, y: -0.18, z: deckZ + 0.05 }
      ],
      color: '#1e293b',
      component: 'FLIR',
      cfdPressure: 0.75
    });
    polys.push({
      pts: [
        { x: flirX + 0.12, y: -0.12, z: deckZ + 0.35 },
        { x: flirX + 0.12, y: 0.12, z: deckZ + 0.35 },
        { x: flirX - 0.12, y: 0.12, z: deckZ + 0.35 },
        { x: flirX - 0.12, y: -0.12, z: deckZ + 0.35 }
      ],
      color: '#0369a1', // Optical lens housing
      component: 'FLIR',
      cfdPressure: 0.75
    });

    // Aft Drone Landing Grid (Modular Mission Bay)
    const droneX = -L * 0.32;
    polys.push({
      pts: [
        { x: droneX + 0.6, y: -0.6, z: deckZ + 0.01 },
        { x: droneX + 0.6, y: 0.6, z: deckZ + 0.01 },
        { x: droneX - 0.6, y: 0.6, z: deckZ + 0.01 },
        { x: droneX - 0.6, y: -0.6, z: deckZ + 0.01 }
      ],
      color: '#e2e8f0',
      wireColor: '#d97706',
      component: 'DECK',
      cfdPressure: 0.2
    });

    // Internal Machinery Compartments for X-RAY Mode
    // 1. Central Autonomy Compute Rack
    polys.push({
      pts: [
        { x: cabinForeX - 0.2, y: -0.35, z: deckZ - 0.2 },
        { x: cabinForeX - 0.2, y: 0.35, z: deckZ - 0.2 },
        { x: cabinForeX - 0.8, y: 0.35, z: deckZ - 0.2 },
        { x: cabinForeX - 0.8, y: -0.35, z: deckZ - 0.2 }
      ],
      color: '#22c55e', // Green Compute Rack
      component: 'INTERNAL',
      opacity: 0.85
    });

    // 2. Twin High-Capacity LiFePO4 Battery Banks
    polys.push({
      pts: [
        { x: 0.3, y: -B * 0.25, z: keelZ * 0.3 },
        { x: 0.3, y: -B * 0.05, z: keelZ * 0.3 },
        { x: -0.8, y: -B * 0.05, z: keelZ * 0.3 },
        { x: -0.8, y: -B * 0.25, z: keelZ * 0.3 }
      ],
      color: '#10b981', // Emerald Battery Pack
      component: 'INTERNAL',
      opacity: 0.85
    });
    polys.push({
      pts: [
        { x: 0.3, y: B * 0.05, z: keelZ * 0.3 },
        { x: 0.3, y: B * 0.25, z: keelZ * 0.3 },
        { x: -0.8, y: B * 0.25, z: keelZ * 0.3 },
        { x: -0.8, y: B * 0.05, z: keelZ * 0.3 }
      ],
      color: '#10b981',
      component: 'INTERNAL',
      opacity: 0.85
    });

    // 3. Marine Diesel Engines / Hybrid Gensets
    polys.push({
      pts: [
        { x: -1.2, y: -B * 0.25, z: keelZ * 0.4 },
        { x: -1.2, y: -B * 0.08, z: keelZ * 0.4 },
        { x: -2.4, y: -B * 0.08, z: keelZ * 0.4 },
        { x: -2.4, y: -B * 0.25, z: keelZ * 0.4 }
      ],
      color: '#ea580c', // Orange Engine Block
      component: 'INTERNAL',
      opacity: 0.9
    });
    polys.push({
      pts: [
        { x: -1.2, y: B * 0.08, z: keelZ * 0.4 },
        { x: -1.2, y: B * 0.25, z: keelZ * 0.4 },
        { x: -2.4, y: B * 0.25, z: keelZ * 0.4 },
        { x: -2.4, y: B * 0.08, z: keelZ * 0.4 }
      ],
      color: '#ea580c',
      component: 'INTERNAL',
      opacity: 0.9
    });

    return polys;
  }, [lwlMeters, beamMeters, draftMeters, deadriseDeg, hullType, animTime]);

  // 3D Perspective Projection & Canvas Rendering Engine
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    const cx = w / 2;
    const cy = h / 2 + 10;

    // Clear background to clean pure white
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, w, h);

    // Camera 3x3 Rotation Matrices
    const cosYaw = Math.cos(yaw);
    const sinYaw = Math.sin(yaw);
    const cosPitch = Math.cos(pitch);
    const sinPitch = Math.sin(pitch);

    const projectPoint = (pt: Point3D): { x: number; y: number; depth: number } => {
      // 1. Rotate around Z (Yaw)
      const x1 = pt.x * cosYaw - pt.y * sinYaw;
      const y1 = pt.x * sinYaw + pt.y * cosYaw;
      const z1 = pt.z;

      // 2. Rotate around X (Pitch)
      const x2 = x1;
      const y2 = y1 * cosPitch - z1 * sinPitch;
      const z2 = y1 * sinPitch + z1 * cosPitch;

      // 3. Perspective Projection
      const cameraDistance = 22 / zoom;
      const focalLength = 480;
      const depth = cameraDistance + y2;
      const scale = focalLength / Math.max(2, depth);

      return {
        x: cx + x2 * scale,
        y: cy - z2 * scale,
        depth
      };
    };

    // Draw Sea Surface Waterplane Grid if enabled
    if (showWaterplane && renderMode !== 'WIREFRAME') {
      const gridSpan = 8;
      const step = 2;
      ctx.strokeStyle = 'rgba(14, 165, 233, 0.2)';
      ctx.lineWidth = 1;

      for (let gx = -gridSpan; gx <= gridSpan; gx += step) {
        ctx.beginPath();
        for (let gy = -gridSpan; gy <= gridSpan; gy += step) {
          const waveZ = Math.sin(animTime * 1.5 + gx * 0.8) * Math.cos(animTime * 1.2 + gy * 0.8) * 0.05;
          const proj = projectPoint({ x: gx, y: gy, z: waveZ });
          if (gy === -gridSpan) ctx.moveTo(proj.x, proj.y);
          else ctx.lineTo(proj.x, proj.y);
        }
        ctx.stroke();
      }

      for (let gy = -gridSpan; gy <= gridSpan; gy += step) {
        ctx.beginPath();
        for (let gx = -gridSpan; gx <= gridSpan; gx += step) {
          const waveZ = Math.sin(animTime * 1.5 + gx * 0.8) * Math.cos(animTime * 1.2 + gy * 0.8) * 0.05;
          const proj = projectPoint({ x: gx, y: gy, z: waveZ });
          if (gx === -gridSpan) ctx.moveTo(proj.x, proj.y);
          else ctx.lineTo(proj.x, proj.y);
        }
        ctx.stroke();
      }
    }

    // CFD Streamline Particle Ribbons
    if (renderMode === 'CFD_PRESSURE') {
      const numLines = 10;
      const L = lwlMeters;
      const B = beamMeters;

      for (let i = 0; i < numLines; i++) {
        const lateralOffset = ((i - numLines / 2) / numLines) * B * 1.3;
        const phase = (animTime * 2.8 + i * 0.4) % 1.0;
        const currentX = L * 0.55 - phase * (L * 1.2);
        const zPos = -draftMeters * 0.4 + Math.sin(currentX * 1.2) * 0.08;

        const pStart = projectPoint({ x: currentX, y: lateralOffset, z: zPos });
        const pEnd = projectPoint({ x: currentX - 1.2, y: lateralOffset, z: zPos });

        // Streamline color based on velocity/pressure
        const grad = ctx.createLinearGradient(pStart.x, pStart.y, pEnd.x, pEnd.y);
        grad.addColorStop(0, '#06b6d4');
        grad.addColorStop(1, 'rgba(6, 182, 212, 0)');

        ctx.strokeStyle = grad;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(pStart.x, pStart.y);
        ctx.lineTo(pEnd.x, pEnd.y);
        ctx.stroke();
      }
    }

    // Project & Depth-Sort Polygons (Painter's Algorithm)
    const projectedPolys = geometry.map((poly) => {
      const projected = poly.pts.map(projectPoint);
      const avgDepth = projected.reduce((acc, p) => acc + p.depth, 0) / projected.length;
      return { poly, projected, avgDepth };
    });

    projectedPolys.sort((a, b) => b.avgDepth - a.avgDepth);

    // Directional Lighting Vector
    const light = { x: 0.5, y: 0.7, z: 0.5 };
    const lightLen = Math.sqrt(light.x * light.x + light.y * light.y + light.z * light.z);
    light.x /= lightLen;
    light.y /= lightLen;
    light.z /= lightLen;

    // Render Polygons
    projectedPolys.forEach(({ poly, projected }) => {
      if (projected.length < 3) return;

      // Filter internal machinery if not in XRAY mode
      if (poly.component === 'INTERNAL' && renderMode !== 'XRAY_STRUCTURAL') {
        return;
      }

      ctx.beginPath();
      ctx.moveTo(projected[0].x, projected[0].y);
      for (let i = 1; i < projected.length; i++) {
        ctx.lineTo(projected[i].x, projected[i].y);
      }
      ctx.closePath();

      if (renderMode === 'WIREFRAME') {
        ctx.strokeStyle = poly.wireColor || '#334155';
        ctx.lineWidth = 1;
        ctx.stroke();
      } else if (renderMode === 'CFD_PRESSURE') {
        const press = poly.cfdPressure ?? 0.5;
        // CFD Heatmap: 0.0 (Blue) -> 0.4 (Cyan) -> 0.7 (Yellow) -> 1.0 (Red Stagnation)
        let fill = '#06b6d4';
        if (press > 0.8) fill = '#ef4444';
        else if (press > 0.6) fill = '#f59e0b';
        else if (press > 0.3) fill = '#10b981';
        else fill = '#1e40af';

        ctx.fillStyle = fill;
        ctx.fill();
        ctx.strokeStyle = 'rgba(15, 23, 42, 0.4)';
        ctx.lineWidth = 0.8;
        ctx.stroke();
      } else if (renderMode === 'XRAY_STRUCTURAL') {
        if (poly.component === 'INTERNAL') {
          ctx.fillStyle = poly.color;
          ctx.fill();
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1.5;
          ctx.stroke();
        } else {
          // Translucent hull skin in X-ray mode
          ctx.fillStyle = 'rgba(241, 245, 249, 0.25)';
          ctx.fill();
          ctx.strokeStyle = 'rgba(100, 116, 139, 0.6)';
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      } else {
        // REALISTIC MODE
        // Simple directional diffuse lighting
        ctx.fillStyle = poly.color;
        ctx.fill();
        ctx.strokeStyle = poly.wireColor || 'rgba(148, 163, 184, 0.5)';
        ctx.lineWidth = 0.8;
        ctx.stroke();
      }
    });

    // Waterjet Thrust Vector Wake Effect
    if (renderMode === 'REALISTIC') {
      const transomX = -lwlMeters * 0.48;
      const pJet = projectPoint({ x: transomX - 0.4, y: 0, z: -draftMeters * 0.4 });
      const pWake = projectPoint({ x: transomX - 2.8, y: 0, z: -draftMeters * 0.2 });

      const jetGrad = ctx.createLinearGradient(pJet.x, pJet.y, pWake.x, pWake.y);
      jetGrad.addColorStop(0, 'rgba(14, 165, 233, 0.7)');
      jetGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');

      ctx.fillStyle = jetGrad;
      ctx.beginPath();
      ctx.ellipse(pJet.x, pJet.y + 4, 14 * zoom, 6 * zoom, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // 3D Navigation Coordinate Compass (Lower Left)
    const compX = 40;
    const compY = h - 40;
    const axisLen = 22;

    const axX = { x: axisLen * cosYaw, y: -axisLen * sinYaw * sinPitch };
    const axY = { x: -axisLen * sinYaw, y: -axisLen * cosYaw * sinPitch };
    const axZ = { x: 0, y: -axisLen * cosPitch };

    // X Axis (Bow - Red)
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(compX, compY);
    ctx.lineTo(compX + axX.x, compY + axX.y);
    ctx.stroke();

    // Y Axis (Starboard - Green)
    ctx.strokeStyle = '#10b981';
    ctx.beginPath();
    ctx.moveTo(compX, compY);
    ctx.lineTo(compX + axY.x, compY + axY.y);
    ctx.stroke();

    // Z Axis (Mast Up - Blue)
    ctx.strokeStyle = '#0284c7';
    ctx.beginPath();
    ctx.moveTo(compX, compY);
    ctx.lineTo(compX + axZ.x, compY + axZ.y);
    ctx.stroke();

    ctx.font = '9px monospace';
    ctx.fillStyle = '#64748b';
    ctx.fillText('X(Bow)', compX + axX.x + 4, compY + axX.y);
    ctx.fillText('Y(Port)', compX + axY.x + 4, compY + axY.y);
    ctx.fillText('Z(Mast)', compX + axZ.x + 4, compY + axZ.y);
  }, [geometry, pitch, yaw, zoom, renderMode, showWaterplane, animTime, lwlMeters, beamMeters, draftMeters]);

  return (
    <div className={`bg-slate-900 border border-slate-800 rounded-lg p-4 flex flex-col justify-between ${className}`}>
      {/* Top Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-purple-500/10 text-purple-400 rounded border border-purple-500/20">
            <Rotate3d className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-slate-100">
                3D BOAT MODEL VISUALIZER
              </span>
              <span className={`px-1.5 py-0.2 rounded text-[10px] font-mono font-bold ${
                status === 'SURVIVED'
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                  : 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
              }`}>
                {candidateId}
              </span>
            </div>
            <span className="text-[10px] font-mono text-slate-400 block">
              REAL-TIME PARAMETRIC CAD SYNTHESIS • 360° ORBIT CONTROLS
            </span>
          </div>
        </div>

        {/* Hull Form Selector & Photo-Render Toggle */}
        <div className="flex items-center gap-2">
          <div className="flex bg-slate-950 p-0.5 rounded border border-slate-800 text-[10px] font-mono">
            <button
              onClick={() => setHullType('CATAMARAN')}
              className={`px-2 py-1 rounded transition-colors ${
                hullType === 'CATAMARAN'
                  ? 'bg-teal-500/20 text-teal-300 font-bold border border-teal-500/40'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Twin Catamaran
            </button>
            <button
              onClick={() => setHullType('MONOHULL')}
              className={`px-2 py-1 rounded transition-colors ${
                hullType === 'MONOHULL'
                  ? 'bg-teal-500/20 text-teal-300 font-bold border border-teal-500/40'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Stepped Monohull
            </button>
          </div>

          {showPhotoRenderToggle && (
            <button
              onClick={() => setShowPhotoRender(!showPhotoRender)}
              className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-mono font-bold transition-colors ${
                showPhotoRender
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'bg-slate-950 text-purple-400 border border-purple-500/30 hover:bg-purple-500/10'
              }`}
              title="Toggle Photorealistic Architectural Concept Render"
            >
              <Camera className="w-3.5 h-3.5" />
              <span>{showPhotoRender ? '3D View' : 'Studio Render'}</span>
            </button>
          )}

          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 bg-slate-950 border border-slate-800 rounded text-slate-400 hover:text-slate-200 transition-colors"
            title={isExpanded ? 'Collapse' : 'Expand View'}
          >
            {isExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Main Viewport Container */}
      <div className="mt-3 relative">
        {showPhotoRender ? (
          /* Photorealistic Concept Studio Render Card */
          <div className="relative rounded-lg overflow-hidden border border-slate-800 bg-white shadow-inner flex flex-col">
            <div className="relative group">
              <img
                src="/usv01_boat_model_render.jpg"
                alt="USV-01 Autonomous Surface Vessel AI Agent Model"
                className="w-full object-cover rounded-t max-h-[420px]"
                onError={(e) => {
                  // Fallback to relative artifact if public image is loading
                  (e.target as HTMLImageElement).src = './usv01_boat_model_render_1794444462398.jpg';
                }}
              />
              <div className="absolute top-3 left-3 bg-slate-950/85 backdrop-blur border border-slate-800 px-2.5 py-1 rounded text-[11px] font-mono text-slate-200 flex items-center gap-1.5 shadow">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>AI Naval Architecture Finalist Model (11.8m Wave-Piercer)</span>
              </div>
            </div>

            {/* Architectural Callouts */}
            <div className="p-3 bg-slate-950 border-t border-slate-800/80 grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs font-mono">
              <div className="p-2 rounded bg-slate-900 border border-slate-800">
                <span className="text-[10px] text-teal-400 font-bold block">1. FOREDECK FLIR</span>
                <span className="text-slate-300 text-[11px]">Gyro-stabilized thermal/optical gimbal</span>
              </div>
              <div className="p-2 rounded bg-slate-900 border border-slate-800">
                <span className="text-[10px] text-purple-400 font-bold block">2. SENSOR ARCH</span>
                <span className="text-slate-300 text-[11px]">Solid-state AESA radar + satcom dome</span>
              </div>
              <div className="p-2 rounded bg-slate-900 border border-slate-800">
                <span className="text-[10px] text-sky-400 font-bold block">3. PROPULSION</span>
                <span className="text-slate-300 text-[11px]">Dual steerable HamiltonJet 274 thrusters</span>
              </div>
              <div className="p-2 rounded bg-slate-900 border border-slate-800">
                <span className="text-[10px] text-emerald-400 font-bold block">4. MISSION BAY</span>
                <span className="text-slate-300 text-[11px]">UAV landing pad & modular payload rack</span>
              </div>
              <div className="p-2 rounded bg-slate-900 border border-slate-800">
                <span className="text-[10px] text-amber-400 font-bold block">5. HULL MATERIAL</span>
                <span className="text-slate-300 text-[11px]">Marine-grade 5083-H116 aluminum</span>
              </div>
              <div className="p-2 rounded bg-slate-900 border border-slate-800">
                <span className="text-[10px] text-rose-400 font-bold block">6. WAVE PIERCER</span>
                <span className="text-slate-300 text-[11px]">Inverted bow stems for Sea State 4+</span>
              </div>
            </div>
          </div>
        ) : (
          /* Interactive 3D Canvas Viewport */
          <div className="relative">
            <canvas
              ref={canvasRef}
              width={isExpanded ? 800 : 540}
              height={isExpanded ? 460 : 280}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onWheel={handleWheel}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              className="w-full rounded-lg border border-slate-800 bg-white shadow-inner cursor-grab active:cursor-grabbing block"
              style={{ touchAction: 'none' }}
            />

            {/* Floating Interaction Hint */}
            <div className="absolute top-2 left-2 bg-slate-900/80 backdrop-blur border border-slate-800/80 px-2 py-0.5 rounded text-[10px] font-mono text-slate-400 pointer-events-none flex items-center gap-1.5">
              <Eye className="w-3 h-3 text-teal-400" />
              <span>Drag to Orbit • Scroll to Zoom</span>
            </div>

            {/* Quick Camera Angle Presets Floating Toolbar */}
            <div className="absolute top-2 right-2 flex items-center gap-1 bg-slate-900/90 backdrop-blur p-1 rounded-md border border-slate-800 shadow">
              <button
                onClick={() => applyCameraPreset('ISOMETRIC')}
                className="px-1.5 py-0.5 rounded text-[10px] font-mono text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
                title="3D Isometric Hero Angle"
              >
                Iso
              </button>
              <button
                onClick={() => applyCameraPreset('SIDE_PROFILE')}
                className="px-1.5 py-0.5 rounded text-[10px] font-mono text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
                title="Broadside Profile View"
              >
                Profile
              </button>
              <button
                onClick={() => applyCameraPreset('TOP_PLAN')}
                className="px-1.5 py-0.5 rounded text-[10px] font-mono text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
                title="Top-Down Plan View"
              >
                Plan
              </button>
              <button
                onClick={() => applyCameraPreset('FRONT_BOW')}
                className="px-1.5 py-0.5 rounded text-[10px] font-mono text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
                title="Head-on Bow View"
              >
                Bow
              </button>
              <button
                onClick={() => applyCameraPreset('STERN_AFT')}
                className="px-1.5 py-0.5 rounded text-[10px] font-mono text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
                title="Transom Stern View"
              >
                Aft
              </button>
              <div className="w-[1px] h-3 bg-slate-800 mx-0.5" />
              <button
                onClick={() => setAutoRotate(!autoRotate)}
                className={`p-1 rounded text-[10px] transition-colors ${
                  autoRotate ? 'bg-purple-500/20 text-purple-400 font-bold' : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Toggle Auto-Orbit Turntable"
              >
                <Compass className="w-3 h-3" />
              </button>
            </div>

            {/* Bottom Floating Mode Switcher */}
            <div className="absolute bottom-2 right-2 flex items-center gap-1 bg-slate-900/90 backdrop-blur p-1 rounded-md border border-slate-800 shadow">
              <button
                onClick={() => setRenderMode('REALISTIC')}
                className={`px-2 py-0.5 rounded text-[10px] font-mono transition-colors ${
                  renderMode === 'REALISTIC'
                    ? 'bg-teal-500/20 text-teal-300 font-bold border border-teal-500/40'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Photorealistic Naval Studio Mode"
              >
                Realistic
              </button>
              <button
                onClick={() => setRenderMode('CFD_PRESSURE')}
                className={`px-2 py-0.5 rounded text-[10px] font-mono transition-colors ${
                  renderMode === 'CFD_PRESSURE'
                    ? 'bg-teal-500/20 text-teal-300 font-bold border border-teal-500/40'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Hydrodynamic Pressure & Streamlines"
              >
                CFD Pressure
              </button>
              <button
                onClick={() => setRenderMode('XRAY_STRUCTURAL')}
                className={`px-2 py-0.5 rounded text-[10px] font-mono transition-colors ${
                  renderMode === 'XRAY_STRUCTURAL'
                    ? 'bg-teal-500/20 text-teal-300 font-bold border border-teal-500/40'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Internal Machinery & Machinery Bay X-Ray"
              >
                X-Ray
              </button>
              <button
                onClick={() => setRenderMode('WIREFRAME')}
                className={`px-2 py-0.5 rounded text-[10px] font-mono transition-colors ${
                  renderMode === 'WIREFRAME'
                    ? 'bg-teal-500/20 text-teal-300 font-bold border border-teal-500/40'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="CAD Lines & Wireframe Mesh"
              >
                CAD Mesh
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Live Physical Dimensions & Spatial Telemetry Footer */}
      <div className="mt-3 pt-3 border-t border-slate-800/80 grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs font-mono">
        <div className="p-2 bg-slate-950 rounded border border-slate-800/60">
          <span className="text-[10px] text-slate-500 block">LENGTH OVERALL (LOA)</span>
          <span className="font-bold text-slate-200">
            {lwlMeters.toFixed(2)} m
          </span>
        </div>
        <div className="p-2 bg-slate-950 rounded border border-slate-800/60">
          <span className="text-[10px] text-slate-500 block">BEAM / WET DECK</span>
          <span className="font-bold text-slate-200">
            {beamMeters.toFixed(2)} m {hullType === 'CATAMARAN' ? '(Twin)' : '(Mono)'}
          </span>
        </div>
        <div className="p-2 bg-slate-950 rounded border border-slate-800/60">
          <span className="text-[10px] text-slate-500 block">DRAFT (T) / DEADRISE</span>
          <span className="font-bold text-slate-200">
            {draftMeters.toFixed(2)} m @ {deadriseDeg.toFixed(1)}°
          </span>
        </div>
        <div className="p-2 bg-slate-950 rounded border border-slate-800/60">
          <span className="text-[10px] text-slate-500 block">DISPLACEMENT</span>
          <span className="font-bold text-teal-400">
            {displacementTonnes.toFixed(2)} tonnes
          </span>
        </div>
      </div>
    </div>
  );
};
