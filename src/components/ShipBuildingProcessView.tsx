import React, { useState } from 'react';
import {
  Hammer,
  Layers,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Sparkles,
  ChevronRight,
  Anchor,
  ShieldCheck,
  Compass,
  Cpu,
  Gauge,
  Zap,
  Radio,
  Sliders,
  Package,
  Wrench,
  Check,
  ExternalLink,
  Info
} from 'lucide-react';
import { ComponentBOM } from '../types/engineering';

interface BuildStage {
  id: string;
  stageNumber: number;
  title: string;
  category: 'TOOLING' | 'COMPOSITES' | 'STRUCTURE' | 'MECHANICAL' | 'ELECTRICAL' | 'AVIONICS' | 'TESTING' | 'TRIALS';
  durationWeeks: number;
  progressPercent: number;
  status: 'COMPLETED' | 'IN_PROGRESS' | 'SCHEDULED' | 'PENDING_APPROVAL';
  description: string;
  objectives: string[];
  specifications: { label: string; value: string; tolerance: string }[];
  qcChecklist: { id: string; label: string; checked: boolean; inspectorRole: string }[];
  allocatedBomParts: string[];
  safetyStandard: string;
}

const INITIAL_BUILD_STAGES: BuildStage[] = [
  {
    id: 'STAGE-01',
    stageNumber: 1,
    title: '3D Lines Lofting & 5-Axis CNC Plug Tooling',
    category: 'TOOLING',
    durationWeeks: 3,
    progressPercent: 100,
    status: 'COMPLETED',
    description: 'Precision CAD surface lofting of the deep-V monohull with 20° deadrise. Subcontracted milling of high-density EPS foam plug on 5-axis gantry CNC router, sealed with vinylester tooling paste and polished to Class-A mirror finish.',
    objectives: [
      'Extract 3D CNC surface offsets from certified lines plan USV-NA-001',
      'Mill port and starboard hull halves + deck plug from 40kg/m³ EPS block',
      'Apply 2mm epoxy fairing compound and guide coat sand to 800-grit finish',
      'Laser scan finished plug to verify dimensional tolerance within ±1.5mm'
    ],
    specifications: [
      { label: 'Plug Substrate', value: 'High-Density Expanded Polystyrene (EPS)', tolerance: '±0.5 kg/m³' },
      { label: 'Surface Profile Accuracy', value: 'Laser Scanned vs CAD Lofting', tolerance: '±1.5 mm' },
      { label: 'Deadrise Angle Verification', value: '20.0° at Transom, 42.0° at Entry', tolerance: '±0.2°' },
      { label: 'Surface Finish', value: 'High Gloss Mirror Polish (SPI A-2)', tolerance: 'Ra < 0.1 µm' }
    ],
    qcChecklist: [
      { id: 'qc-01-1', label: 'CAD lofting curves signed off by Naval Architect', checked: true, inspectorRole: 'Naval Architect' },
      { id: 'qc-01-2', label: '5-axis CNC toolpath simulation collision check passed', checked: true, inspectorRole: 'Tooling Lead' },
      { id: 'qc-01-3', label: 'Faro laser tracker dimensional scan verified vs STEP model', checked: true, inspectorRole: 'QA Manager' },
      { id: 'qc-01-4', label: 'Release agent chemical compatibility certified', checked: true, inspectorRole: 'Composites Specialist' }
    ],
    allocatedBomParts: ['BOM-001 (Tooling Gelcoat)', 'BOM-002 (Vinylester Paste)'],
    safetyStandard: 'ISO 12215-5 Hull Construction Standards'
  },
  {
    id: 'STAGE-02',
    stageNumber: 2,
    title: 'Vacuum-Assisted Resin Infusion (VARI) & Composite Layup',
    category: 'COMPOSITES',
    durationWeeks: 3,
    progressPercent: 85,
    status: 'IN_PROGRESS',
    description: 'Closed-mold single-shot vacuum infusion of hull skin and deck. E-glass quadraxial fabrics and carbon-reinforced stringer caps sandwiching PVC structural foam core under 0.98 bar continuous vacuum.',
    objectives: [
      'Apply semi-permanent release wax and marine vinyl ester barrier coat',
      'Dry-lay biaxial/quadraxial multiaxial fabrics with vacuum distribution mesh',
      'Draw vacuum down to <50 mbar and hold 4-hour drop test (<2 mbar/hr loss)',
      'Infuse low-viscosity epoxy resin and execute 60°C post-cure thermal cycle'
    ],
    specifications: [
      { label: 'Fiber Reinforcement', value: 'E-Glass Quadraxial (0°/±45°/90°) + Carbon Keel Cap', tolerance: '±2% areal wt' },
      { label: 'Core Material', value: 'Cross-linked PVC Structural Foam 80 kg/m³', tolerance: '15mm ±0.5mm' },
      { label: 'Resin System', value: 'High-Tg Infusion Epoxy with 4-hr Gel Window', tolerance: '±1% mix ratio' },
      { label: 'Vacuum Pressure', value: '-0.98 bar gauge (<20 mbar absolute)', tolerance: '<2 mbar/hr drop' }
    ],
    qcChecklist: [
      { id: 'qc-02-1', label: 'Dry laminate schedule ply count and orientation verified', checked: true, inspectorRole: 'Composites Lead' },
      { id: 'qc-02-2', label: 'Vacuum drop test passed: <2 mbar drop over 4 hours', checked: true, inspectorRole: 'QA Lead' },
      { id: 'qc-02-3', label: 'Resin exothermic temperature recorded (<85°C peak)', checked: true, inspectorRole: 'Process Engineer' },
      { id: 'qc-02-4', label: 'Post-cure furnace cycle 16h @ 60°C completed with Barcol hardness test', checked: false, inspectorRole: 'QA Inspector' }
    ],
    allocatedBomParts: ['BOM-COMP-01 (Quadraxial Glass)', 'BOM-COMP-02 (Epoxy System)'],
    safetyStandard: 'DNV-RU-HSLC Pt.3 Ch.2 Composites Rules'
  },
  {
    id: 'STAGE-03',
    stageNumber: 3,
    title: 'Watertight Bulkheads, Collision Zone & Internal Framing',
    category: 'STRUCTURE',
    durationWeeks: 2,
    progressPercent: 40,
    status: 'IN_PROGRESS',
    description: 'Secondary bonding of structural composite bulkheads. Division of vessel into three independent watertight compartments: forward collision zone, central avionics/battery bay, and aft drivetrain cell.',
    objectives: [
      'Position CNC-cut composite foam bulkheads at Stations 2, 5, and 8',
      'Execute secondary bonding with carbon biaxial tabbing brackets',
      'Install longitudinal box-girder engine/battery stringers',
      'Perform pneumatic seal and dye-penetrant checks on watertight bulkheads'
    ],
    specifications: [
      { label: 'Collision Bulkhead Location', value: 'Station 2 (0.15 * LWL from Forward Perpendicular)', tolerance: '±5 mm' },
      { label: 'Watertight Subdivisions', value: '3 Autonomous Floodable Zones', tolerance: '100% Hermetic' },
      { label: 'Bonding Tabbing Width', value: '150mm overlap carbon/vinylester joint', tolerance: 'Min 120mm' },
      { label: 'Limber Hole Drainage', value: 'Self-closing check valves to central bilge sump', tolerance: 'Zero backflow' }
    ],
    qcChecklist: [
      { id: 'qc-03-1', label: 'Bulkhead alignment laser verified against hull centerline', checked: true, inspectorRole: 'Structural Engineer' },
      { id: 'qc-03-2', label: 'Tabbing laminate peel test coupon verified (shear > 18 MPa)', checked: true, inspectorRole: 'QA Lab' },
      { id: 'qc-03-3', label: 'Watertight compartment air decay pressure test (15 kPa hold for 10 min)', checked: false, inspectorRole: 'Classification Surveyor' }
    ],
    allocatedBomParts: ['BOM-STR-01 (Structural Foam Bulkheads)', 'BOM-STR-02 (Carbon Tabbing Tape)'],
    safetyStandard: 'IMO Resolution MSC.267(85) Subdivision Criteria'
  },
  {
    id: 'STAGE-04',
    stageNumber: 4,
    title: 'Propulsion Plant & Mechanical Drivetrain Outfitting',
    category: 'MECHANICAL',
    durationWeeks: 3,
    progressPercent: 0,
    status: 'SCHEDULED',
    description: 'Installation of twin steerable electric azimuth pod thrusters (or inboard PMSM drives). Alignment of shaft seals, cooling water sea chests, dynamic pod azimuth bearing drives, and emergency bilge dewatering pumps.',
    objectives: [
      'Precision bore and install transom/keel thruster mounting collars',
      'Mount twin 48V/96V Permanent Magnet Synchronous Motors (PMSM)',
      'Integrate dual steerable azimuth actuators with absolute optical encoders',
      'Plumb redundant automated bilge pumps with mechanical float switches'
    ],
    specifications: [
      { label: 'Propulsion Configuration', value: 'Twin Azimuth Steerable Electric Pods', tolerance: '±0.1° alignment' },
      { label: 'Max Continuous Power', value: '2x 35 kW PMSM High-Torque Drives', tolerance: '±2% torque curve' },
      { label: 'Steering Rate', value: '35°/sec slew rate via brushless servo gearheads', tolerance: 'Min 30°/sec' },
      { label: 'Bilge Dewatering Capacity', value: '2x 2000 GPH Submersible Pumps with Alarm', tolerance: 'Redundant Power' }
    ],
    qcChecklist: [
      { id: 'qc-04-1', label: 'Thruster hull penetrations sealed with marine polyurethane and torque checked', checked: false, inspectorRole: 'Mechanical Lead' },
      { id: 'qc-04-2', label: 'Azimuth steering mechanical end-stops and zero-datum calibrated', checked: false, inspectorRole: 'Automation Engineer' },
      { id: 'qc-04-3', label: 'Dry spin test with inverter CAN bus telemetry confirmed', checked: false, inspectorRole: 'Propulsion Lead' }
    ],
    allocatedBomParts: ['BOM-PRP-01 (Twin Electric Thrusters)', 'BOM-PRP-02 (Steering Servo Drives)'],
    safetyStandard: 'ABYC P-4 Marine Propulsion Electrical & Mechanical'
  },
  {
    id: 'STAGE-05',
    stageNumber: 5,
    title: 'Electrical Microgrid, LiFePO4 Energy Bank & Safety E-Stops',
    category: 'ELECTRICAL',
    durationWeeks: 3,
    progressPercent: 0,
    status: 'SCHEDULED',
    description: 'Assembly of the 48V/96V LiFePO4 battery banks inside IP67 sealed aluminium safety enclosures. Integration of dual Battery Management Systems (BMS), high-voltage isolation contactors, 24V/12V avionics DC-DC converters, and physical actuator air-gap E-Stops.',
    objectives: [
      'Install 45 kWh Lithium Iron Phosphate (LiFePO4) modular battery cells',
      'Wire dual redundant CAN-bus BMS with cell voltage and thermal telemetry',
      'Implement fail-open emergency power contactors wired to hardware kill switch',
      'Perform 500V DC megger insulation resistance check across chassis ground'
    ],
    specifications: [
      { label: 'Usable Energy Capacity', value: '45 kWh (LiFePO4 Chemistry, prismatic cells)', tolerance: '±1 kWh' },
      { label: 'Nominal Bus Voltage', value: '96 VDC Traction Bus / 24 VDC Control Bus', tolerance: '±1.5 VDC' },
      { label: 'Insulation Resistance', value: '> 100 Megaohms at 500 VDC to hull earth', tolerance: 'Class Standard' },
      { label: 'Thermal Safety Ingress', value: 'IP67 Sealed Box with Pressure Relief Gore Vent', tolerance: '100% Water/Vapor tight' }
    ],
    qcChecklist: [
      { id: 'qc-05-1', label: 'Battery cell balancing verified (<10mV delta between cells)', checked: false, inspectorRole: 'Electrical Lead' },
      { id: 'qc-05-2', label: 'BMS over-voltage, under-voltage, and over-temp trip thresholds tested', checked: false, inspectorRole: 'Safety Director' },
      { id: 'qc-05-3', label: 'Manual E-stop loop physically breaks motor contactor circuit in <15ms', checked: false, inspectorRole: 'Red Team Reviewer' }
    ],
    allocatedBomParts: ['BOM-ELE-01 (LiFePO4 Battery Modules)', 'BOM-ELE-02 (Redundant BMS & HV Relays)'],
    safetyStandard: 'DNV-RU-SHIP Pt.4 Ch.8 Electrical & Battery Safety'
  },
  {
    id: 'STAGE-06',
    stageNumber: 6,
    title: 'Autonomy Avionics, Sensor Mast & ROS 2 Embedded Stack',
    category: 'AVIONICS',
    durationWeeks: 2,
    progressPercent: 0,
    status: 'SCHEDULED',
    description: 'Rigging of the fold-down carbon fiber perception mast. Mounting of FMCW marine radar, 3D LiDAR, dual RTK-GNSS antennas, and AIS transponder. Mounting of Nvidia Jetson / x86 industrial autonomy computer and STM32 micro-ROS CAN FD bus.',
    objectives: [
      'Bolt and seal carbon avionics mast with vibration-isolating elastomer mounts',
      'Mount FMCW solid-state radar dome and 360° LiDAR scanner at 2.4m height',
      'Install industrial IP67 ruggedized computer with Nvidia Jetson Orin GPU',
      'Flash ROS 2 Humble node images and test CAN FD micro-ROS telemetry'
    ],
    specifications: [
      { label: 'Sensor Height above Waterline', value: '2.4 meters (Radar & LiDAR unobstructed 360°)', tolerance: '±20 mm' },
      { label: 'Compute Hardware', value: 'Nvidia Jetson AGX Orin 64GB Industrial Compute', tolerance: 'MIL-STD-810H' },
      { label: 'Internal Bus Interface', value: 'CAN FD 1 Mbps + Gigabit Ethernet (IP67 M12)', tolerance: 'Zero packet loss' },
      { label: 'GNSS Accuracy', value: 'Dual Antenna RTK-GNSS with INS Heading Gyro', tolerance: '< 2 cm pos / < 0.2° heading' }
    ],
    qcChecklist: [
      { id: 'qc-06-1', label: 'Perception sensor line-of-sight blind zone audit completed', checked: false, inspectorRole: 'Perception Specialist' },
      { id: 'qc-06-2', label: 'micro-ROS node heartbeat watchdog timer verified (50 Hz cycle)', checked: false, inspectorRole: 'Software Architect' },
      { id: 'qc-06-3', label: 'RF co-existence check: Radar, 4G LTE, and GNSS signal isolation verified', checked: false, inspectorRole: 'Comms Specialist' }
    ],
    allocatedBomParts: ['BOM-AUT-01 (Nvidia Jetson Orin)', 'BOM-AUT-02 (Solid State FMCW Radar)', 'BOM-AUT-03 (3D LiDAR)'],
    safetyStandard: 'IEC 60945 Marine Navigation & Radio Equipment'
  },
  {
    id: 'STAGE-07',
    stageNumber: 7,
    title: 'Dry Factory Acceptance Testing (FAT) & Hardware-in-the-Loop',
    category: 'TESTING',
    durationWeeks: 2,
    progressPercent: 0,
    status: 'SCHEDULED',
    description: 'Full vessel dry testing inside clean room assembly bay. Hardware-in-the-Loop (HIL) injection of synthetic sensor data into ROS 2 autonomy computer while monitoring motor inverter outputs on dynamometer.',
    objectives: [
      'Inject simulated radar/LiDAR COLREGs encounter scenarios into ROS 2 stack',
      'Verify thruster pod angle and RPM response matches COLREGs Rule 14/15 demand',
      'Execute comms-loss fail-safe test (assert autonomous loiter upon link drop)',
      'Verify physical actuator E-stop clamp and thermal trip alarms'
    ],
    specifications: [
      { label: 'HIL Simulation Fidelity', value: 'Gazebo / ROS 2 Hardware-in-the-Loop Injector', tolerance: 'Real-time sync' },
      { label: 'Comms-Loss Watchdog Timeout', value: '3.0 seconds loss triggers LOITER state', tolerance: '±0.1 sec' },
      { label: 'Dynamic Range Test', value: '0° to 35° rudder command latency', tolerance: '< 250 ms' },
      { label: 'Dry Weight Verification', value: 'Crane load cell total lightship mass check', tolerance: '±15 kg' }
    ],
    qcChecklist: [
      { id: 'qc-07-1', label: 'HIL simulated Rule 14 collision avoidance passed 25 consecutive runs', checked: false, inspectorRole: 'V&V Lead' },
      { id: 'qc-07-2', label: 'Comms-loss autonomous state executive transition verified', checked: false, inspectorRole: 'Autonomy Lead' },
      { id: 'qc-07-3', label: 'Engineering Director formal dry sign-off certificate issued', checked: false, inspectorRole: 'Engineering Director' }
    ],
    allocatedBomParts: ['BOM-TEST-01 (Dynamometer & Load Bank)', 'BOM-TEST-02 (HIL Harness)'],
    safetyStandard: 'ISO 26262 / DNV HIL Testing Protocol'
  },
  {
    id: 'STAGE-08',
    stageNumber: 8,
    title: 'Water Basin Inclining Experiment & Flotation Verification',
    category: 'TESTING',
    durationWeeks: 1,
    progressPercent: 0,
    status: 'SCHEDULED',
    description: 'First crane launch into calm test basin. Water ingress inspection, static draft verification, and statutory inclining experiment with certified transverse shifting weights to measure actual vertical center of gravity ($KG_{actual}$).',
    objectives: [
      'Crane launch vessel and monitor all through-hull fittings for 4 hours',
      'Measure actual draft forward, midships, and aft to calculate true displacement',
      'Execute statutory inclining experiment with 4 distinct transverse weight shifts',
      'Calculate actual GMt and verify compliance with IMO MSC.267(85)'
    ],
    specifications: [
      { label: 'Measured Lightship Mass', value: 'Target 5,200 kg ± 3% vs SWBS prediction', tolerance: '±50 kg' },
      { label: 'Measured Static Draft (T)', value: '0.62 meters in seawater 1.025 t/m³', tolerance: '±15 mm' },
      { label: 'Measured Metacentric Height (GMt)', value: 'Min 0.65 meters (IMO criteria requires >= 0.35m)', tolerance: 'Statutory Pass' },
      { label: 'Watertight Integrity', value: 'Zero bilge accumulation over 24-hour basin soak', tolerance: '0.00 L ingress' }
    ],
    qcChecklist: [
      { id: 'qc-08-1', label: '24-hour water soak test: zero ingress in all 3 compartments', checked: false, inspectorRole: 'Surveyor' },
      { id: 'qc-08-2', label: 'Inclining experiment pendulum & U-tube readings recorded with class surveyor', checked: false, inspectorRole: 'Chief Naval Architect' },
      { id: 'qc-08-3', label: 'Stability booklet updated with certified KG and GZ righting arm curves', checked: false, inspectorRole: 'Naval Architect' }
    ],
    allocatedBomParts: ['BOM-INST-01 (Inclining Pendulum & Load Cells)'],
    safetyStandard: 'IMO Resolution MSC.267(85) Part 7.1 Inclining Test'
  },
  {
    id: 'STAGE-09',
    stageNumber: 9,
    title: 'Sea Trials, Teleoperation & Autonomous COLREGs Commissioning',
    category: 'TRIALS',
    durationWeeks: 3,
    progressPercent: 0,
    status: 'SCHEDULED',
    description: 'Graduated maritime trials in designated coastal test area with chase boat. Step 1: Manual radio remote teleoperation. Step 2: Autonomous waypoint following. Step 3: Fully autonomous COLREGs collision avoidance against cooperative target vessels.',
    objectives: [
      'Harbor teleoperation trials and maximum speed / bollard pull verification',
      'Execute autonomous transit across 10-nautical-mile offshore waypoint circuit',
      'Run staged COLREGs Rule 14 head-on encounter with radar target vessel',
      'Confirm fail-safe emergency stop from chase boat over satellite/RF link'
    ],
    specifications: [
      { label: 'Max Speed Trial', value: 'Achieve >= 25.0 knots sustained at full power', tolerance: '±0.5 kt' },
      { label: 'Waypoint Tracking Cross-Track Error', value: '< 2.5 meters in Sea State 2', tolerance: 'Max 4.0m' },
      { label: 'COLREGs Starboard Alteration Range', value: 'Initiate avoidance at CPA range >= 300 meters', tolerance: '±25m' },
      { label: 'Emergency Stop Reaction Time', value: '< 500 ms from RF trigger to 0 RPM clamp', tolerance: '< 1.0s' }
    ],
    qcChecklist: [
      { id: 'qc-09-1', label: 'Harbor teleoperation steering and propulsion control certified', checked: false, inspectorRole: 'Test Pilot' },
      { id: 'qc-09-2', label: '10nm autonomous waypoint circuit completed without operator intervention', checked: false, inspectorRole: 'Autonomy Director' },
      { id: 'qc-09-3', label: 'Live COLREGs Rule 14 head-on avoidance verified against chase craft', checked: false, inspectorRole: 'Lead Systems Architect' },
      { id: 'qc-09-4', label: 'Official Vessel Acceptance Certificate signed by Engineering Director', checked: false, inspectorRole: 'Engineering Director' }
    ],
    allocatedBomParts: ['BOM-TRL-01 (Sea Trial Telemetry Buoys & Chase Rig)'],
    safetyStandard: 'IMO Maritime Safety Committee MASS Code Trials Guidelines'
  }
];

interface ShipBuildingProcessViewProps {
  onAskAi?: (prompt: string, record?: any) => void;
}

export const ShipBuildingProcessView: React.FC<ShipBuildingProcessViewProps> = ({ onAskAi }) => {
  const [stages, setStages] = useState<BuildStage[]>(INITIAL_BUILD_STAGES);
  const [selectedStageId, setSelectedStageId] = useState<string>('STAGE-02');
  const [activeSection, setActiveSection] = useState<'overview' | 'cutaway' | 'checklist' | 'specs'>('overview');

  const selectedStage = stages.find((s) => s.id === selectedStageId) || stages[0];

  // Toggle checklist item
  const handleToggleCheck = (stageId: string, checkId: string) => {
    setStages((prev) =>
      prev.map((stage) => {
        if (stage.id !== stageId) return stage;
        return {
          ...stage,
          qcChecklist: stage.qcChecklist.map((c) => (c.id === checkId ? { ...c, checked: !c.checked } : c))
        };
      })
    );
  };

  // Overall project progress calculation
  const totalWeeks = stages.reduce((acc, s) => acc + s.durationWeeks, 0);
  const completedWeeks = stages.reduce((acc, s) => acc + (s.durationWeeks * s.progressPercent) / 100, 0);
  const overallProgress = Math.round((completedWeeks / totalWeeks) * 100);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded flex items-center gap-1.5">
              <Hammer className="w-3.5 h-3.5" /> SHIP-CONSTRUCT
            </span>
            <span className="text-xs text-slate-500 font-mono">PHYSICAL PRODUCTION & COMMISSIONING ROADMAP</span>
          </div>
          <h2 className="text-xl font-bold text-slate-100 mt-1">
            USV-01 Physical Shipbuilding & Commissioning Lifecycle
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            End-to-end 9-phase naval manufacturing roadmap: CNC plug tooling, vacuum resin infusion, watertight framing, twin electric pod outfitting, and autonomous sea trials.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="text-[10px] font-mono text-slate-400">TOTAL BUILD PROGRESS</div>
            <div className="text-lg font-bold font-mono text-amber-400">{overallProgress}% <span className="text-xs font-normal text-slate-500">({completedWeeks.toFixed(1)} / {totalWeeks} wks)</span></div>
          </div>

          <button
            onClick={() => onAskAi?.(`Audit the current manufacturing stage (${selectedStage.title}) quality assurance checklist and DNV composites inspection criteria.`)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/30 text-sky-300 text-xs transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>AI QA Audit</span>
          </button>
        </div>
      </div>

      {/* Visual 9-Stage Progress Timeline */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 space-y-3">
        <div className="flex items-center justify-between text-xs font-mono">
          <span className="text-slate-400 font-semibold uppercase tracking-wider">Manufacturing Pipeline (26 Weeks Total)</span>
          <span className="text-slate-500">Click any stage to inspect dossier</span>
        </div>

        <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-9 gap-1.5 font-mono text-xs">
          {stages.map((stage) => {
            const isSelected = stage.id === selectedStageId;
            const isDone = stage.status === 'COMPLETED';
            const isWIP = stage.status === 'IN_PROGRESS';

            return (
              <button
                key={stage.id}
                onClick={() => setSelectedStageId(stage.id)}
                className={`p-2 rounded text-left transition-all border flex flex-col justify-between h-20 ${
                  isSelected
                    ? 'bg-amber-500/15 border-amber-500/50 text-amber-300 shadow-md shadow-amber-500/10'
                    : isDone
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/20'
                    : isWIP
                    ? 'bg-sky-500/10 border-sky-500/30 text-sky-300 hover:bg-sky-500/20'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-900'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <span className="text-[10px] font-bold">#{stage.stageNumber}</span>
                  {isDone ? (
                    <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                  ) : isWIP ? (
                    <Clock className="w-3 h-3 text-sky-400 animate-pulse" />
                  ) : (
                    <span className="text-[9px] text-slate-600">{stage.durationWeeks}w</span>
                  )}
                </div>

                <div className="text-[10px] font-medium leading-tight line-clamp-2 mt-1">
                  {stage.title.split('&')[0]}
                </div>

                {/* Micro Progress Bar */}
                <div className="w-full bg-slate-800 h-1 rounded-full overflow-hidden mt-1">
                  <div
                    className={`h-full ${isDone ? 'bg-emerald-400' : isWIP ? 'bg-sky-400' : 'bg-slate-700'}`}
                    style={{ width: `${stage.progressPercent}%` }}
                  />
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Stage Detail & Vessel Schematic Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Selected Stage Technical Dossier (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-5 space-y-4">
            {/* Stage Title Banner */}
            <div className="flex items-start justify-between gap-4 pb-3 border-b border-slate-800">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded font-bold">
                    STAGE 0{selectedStage.stageNumber}
                  </span>
                  <span className="font-mono text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                    {selectedStage.category}
                  </span>
                  <span className={`font-mono text-[10px] px-2 py-0.5 rounded font-semibold ${
                    selectedStage.status === 'COMPLETED' ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30' :
                    selectedStage.status === 'IN_PROGRESS' ? 'bg-sky-500/15 text-sky-300 border border-sky-500/30' :
                    'bg-slate-800 text-slate-400'
                  }`}>
                    {selectedStage.status.replace('_', ' ')}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-slate-100 mt-2">
                  {selectedStage.title}
                </h3>
              </div>

              <div className="text-right font-mono text-xs flex-shrink-0">
                <div className="text-slate-400">Duration</div>
                <div className="text-slate-200 font-bold">{selectedStage.durationWeeks} Weeks</div>
                <div className="text-amber-400 font-bold mt-1">{selectedStage.progressPercent}% Complete</div>
              </div>
            </div>

            {/* Description */}
            <p className="text-xs text-slate-300 leading-relaxed">
              {selectedStage.description}
            </p>

            {/* Sub-tabs for Stage Dossier */}
            <div className="flex border-b border-slate-800 gap-2 text-xs font-mono">
              <button
                onClick={() => setActiveSection('overview')}
                className={`px-3 py-1.5 border-b-2 font-medium transition-colors ${
                  activeSection === 'overview'
                    ? 'border-amber-400 text-amber-300'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                Work Scope & Objectives
              </button>
              <button
                onClick={() => setActiveSection('checklist')}
                className={`px-3 py-1.5 border-b-2 font-medium transition-colors ${
                  activeSection === 'checklist'
                    ? 'border-amber-400 text-amber-300'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                Quality Control Checklist ({selectedStage.qcChecklist.filter(c => c.checked).length}/{selectedStage.qcChecklist.length})
              </button>
              <button
                onClick={() => setActiveSection('specs')}
                className={`px-3 py-1.5 border-b-2 font-medium transition-colors ${
                  activeSection === 'specs'
                    ? 'border-amber-400 text-amber-300'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                Tolerances & Specs
              </button>
            </div>

            {/* SECTION 1: WORK SCOPE & OBJECTIVES */}
            {activeSection === 'overview' && (
              <div className="space-y-3 pt-1">
                <h4 className="text-xs font-semibold text-slate-200 font-mono flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-amber-400" />
                  <span>Mandatory Engineering Objectives:</span>
                </h4>
                <div className="space-y-2">
                  {selectedStage.objectives.map((obj, i) => (
                    <div key={i} className="p-2.5 bg-slate-950 rounded border border-slate-800 flex items-start gap-2.5 text-xs text-slate-300">
                      <span className="font-mono text-amber-400 font-bold flex-shrink-0 mt-0.5">{i + 1}.</span>
                      <span className="leading-relaxed">{obj}</span>
                    </div>
                  ))}
                </div>

                <div className="pt-2 flex items-center justify-between text-[11px] font-mono text-slate-400 border-t border-slate-800">
                  <span>Governing Standard: <strong className="text-slate-200">{selectedStage.safetyStandard}</strong></span>
                </div>
              </div>
            )}

            {/* SECTION 2: QC CHECKLIST */}
            {activeSection === 'checklist' && (
              <div className="space-y-3 pt-1">
                <div className="flex items-center justify-between text-xs font-mono text-slate-400">
                  <span>Mandatory Quality Assurance Sign-Offs:</span>
                  <span className="text-[11px] text-teal-400">Interactive Gate Checks</span>
                </div>

                <div className="space-y-2">
                  {selectedStage.qcChecklist.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => handleToggleCheck(selectedStage.id, item.id)}
                      className={`p-3 rounded border transition-all cursor-pointer flex items-center justify-between gap-3 text-xs ${
                        item.checked
                          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200'
                          : 'bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-900'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${
                          item.checked ? 'bg-emerald-500 border-emerald-400 text-slate-950 font-bold' : 'border-slate-700'
                        }`}>
                          {item.checked && <Check className="w-3 h-3 stroke-[3]" />}
                        </div>
                        <span className="leading-relaxed font-sans">{item.label}</span>
                      </div>

                      <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-400 flex-shrink-0">
                        {item.inspectorRole}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* SECTION 3: TOLERANCES & SPECS */}
            {activeSection === 'specs' && (
              <div className="space-y-3 pt-1">
                <table className="w-full text-left text-xs font-mono">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 text-[11px]">
                      <th className="pb-2">Parameter</th>
                      <th className="pb-2">Manufacturing Specification</th>
                      <th className="pb-2 text-right">Acceptance Tolerance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {selectedStage.specifications.map((spec, i) => (
                      <tr key={i} className="hover:bg-slate-950/40">
                        <td className="py-2.5 text-slate-200 font-semibold">{spec.label}</td>
                        <td className="py-2.5 text-slate-300">{spec.value}</td>
                        <td className="py-2.5 text-right text-teal-400 font-bold">{spec.tolerance}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Physical Vessel Anatomy & Internal Outfitting Cutaway (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          {/* Interactive Vessel Profile Schematic */}
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h3 className="text-xs font-semibold text-slate-200 flex items-center gap-2">
                <Anchor className="w-4 h-4 text-amber-400" />
                <span>USV-01 Internal Outfitting Anatomy</span>
              </h3>
              <span className="text-[10px] font-mono text-slate-400">PROFILE CUTAWAY</span>
            </div>

            {/* SVG Profile Cutaway Diagram */}
            <div className="p-3 bg-slate-950 rounded border border-slate-800 flex items-center justify-center">
              <svg viewBox="0 0 500 240" className="w-full h-auto">
                {/* Waterline */}
                <line x1="20" y1="150" x2="480" y2="150" stroke="#0284c7" strokeWidth="1.5" strokeDasharray="4 3" opacity="0.6" />
                <text x="25" y="145" fill="#0284c7" fontSize="9" fontFamily="monospace">DESIGN WATERLINE (DWL 0.65m)</text>

                {/* Monohull Profile Outline */}
                <path
                  d="M 60,60 L 440,60 L 420,170 L 140,170 L 60,60 Z"
                  fill="#f1f5f9"
                  stroke="#0284c7"
                  strokeWidth="2"
                />

                {/* Watertight Bulkheads */}
                {/* Bulkhead 1: Collision Zone (Station 2) */}
                <line x1="160" y1="60" x2="160" y2="170" stroke="#e11d48" strokeWidth="2.5" />
                <text x="163" y="80" fill="#e11d48" fontSize="8" fontFamily="monospace" transform="rotate(90,163,80)">COLLISION BULKHEAD</text>

                {/* Bulkhead 2: Avionics/Aft Partition (Station 7) */}
                <line x1="330" y1="60" x2="330" y2="170" stroke="#e11d48" strokeWidth="2.5" />
                <text x="333" y="80" fill="#e11d48" fontSize="8" fontFamily="monospace" transform="rotate(90,333,80)">POWERTRAIN BULKHEAD</text>

                {/* Subsystem Zones */}
                {/* Zone 1: Bow Collision Buoyancy Compartment */}
                <rect x="70" y="70" width="80" height="90" fill="#ffe4e6" stroke="#f43f5e" strokeWidth="1" rx="4" />
                <text x="110" y="115" fill="#be123c" fontSize="9" fontFamily="monospace" textAnchor="middle" fontWeight="bold">CRASH BOX</text>
                <text x="110" y="128" fill="#475569" fontSize="7" fontFamily="monospace" textAnchor="middle">FOAM FILLED</text>

                {/* Zone 2: Midships Battery & Avionics Compartment */}
                <rect x="170" y="90" width="150" height="70" fill="#e0f2fe" stroke="#38bdf8" strokeWidth="1" rx="4" />
                {/* 45kWh Battery Packs */}
                <rect x="180" y="125" width="130" height="30" fill="#d1fae5" stroke="#059669" strokeWidth="1" rx="2" />
                <text x="245" y="144" fill="#065f46" fontSize="8" fontFamily="monospace" textAnchor="middle" fontWeight="bold">45kWh LiFePO4 BATTERY (KEEL)</text>
                {/* Autonomy Compute Box */}
                <rect x="200" y="95" width="90" height="22" fill="#e0e7ff" stroke="#6366f1" strokeWidth="1" rx="2" />
                <text x="245" y="110" fill="#3730a3" fontSize="8" fontFamily="monospace" textAnchor="middle" fontWeight="bold">JETSON ORIN AVIONICS</text>

                {/* Zone 3: Aft Thrusters Compartment */}
                <rect x="340" y="85" width="70" height="75" fill="#fef3c7" stroke="#d97706" strokeWidth="1" rx="4" />
                <text x="375" y="125" fill="#92400e" fontSize="8" fontFamily="monospace" textAnchor="middle" fontWeight="bold">ELECTRIC PODS</text>

                {/* Perception Mast */}
                <line x1="210" y1="60" x2="210" y2="15" stroke="#64748b" strokeWidth="3" />
                {/* FMCW Radar Dome */}
                <circle cx="210" cy="15" r="9" fill="#0284c7" stroke="#0369a1" strokeWidth="1.5" />
                <text x="225" y="18" fill="#0284c7" fontSize="8" fontFamily="monospace" fontWeight="bold">FMCW RADAR (2.4m)</text>
                {/* LiDAR */}
                <rect x="204" y="26" width="12" height="7" fill="#db2777" rx="1" />
                <text x="225" y="32" fill="#be185d" fontSize="8" fontFamily="monospace" fontWeight="bold">3D LiDAR</text>

                {/* Twin Pod Thrusters below transom */}
                <rect x="405" y="170" width="14" height="28" fill="#0d9488" stroke="#0f766e" strokeWidth="1" rx="2" />
                {/* Propeller Blade */}
                <polygon points="419,180 432,175 432,193" fill="#14b8a6" />
                <text x="390" y="215" fill="#0f766e" fontSize="8" fontFamily="monospace" fontWeight="bold">TWIN PMSM PODS</text>
              </svg>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center font-mono text-[11px]">
              <div className="p-2 bg-slate-950 rounded border border-slate-800">
                <span className="text-slate-500 block text-[9px]">COMPARTMENT 1</span>
                <span className="text-rose-400 font-bold">Bow Crash Box</span>
              </div>
              <div className="p-2 bg-slate-950 rounded border border-slate-800">
                <span className="text-slate-500 block text-[9px]">COMPARTMENT 2</span>
                <span className="text-sky-400 font-bold">Energy & Compute</span>
              </div>
              <div className="p-2 bg-slate-950 rounded border border-slate-800">
                <span className="text-slate-500 block text-[9px]">COMPARTMENT 3</span>
                <span className="text-amber-400 font-bold">Dual Pod Drives</span>
              </div>
            </div>
          </div>

          {/* Bill of Materials Linkage for this stage */}
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 space-y-3">
            <h4 className="text-xs font-semibold text-slate-200 flex items-center gap-2">
              <Package className="w-4 h-4 text-amber-400" />
              <span>Allocated BOM Components for this Phase:</span>
            </h4>

            <div className="space-y-1.5 font-mono text-xs">
              {selectedStage.allocatedBomParts.map((part, i) => (
                <div key={i} className="p-2.5 bg-slate-950 rounded border border-slate-800 flex items-center justify-between">
                  <span className="text-slate-300">{part}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-teal-500/10 border border-teal-500/30 text-teal-400">
                    Allocated
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
