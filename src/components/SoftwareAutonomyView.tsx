import React, { useState } from 'react';
import {
  Cpu,
  Navigation,
  Radio,
  ShieldAlert,
  Sparkles,
  Download,
  Plus,
  Network,
  Activity,
  CheckCircle2,
  FileCode,
  Copy,
  Check,
  Terminal,
  Layers
} from 'lucide-react';
import { InterfaceDefinition, Requirement, SimulationJob } from '../types/engineering';
import { getStatusBadgeClass, downloadCsv } from '../utils/engineeringUtils';

interface SoftwareAutonomyViewProps {
  interfaces: InterfaceDefinition[];
  requirements: Requirement[];
  simulations: SimulationJob[];
  onAskAi: (prompt: string, record?: any) => void;
}

export const SoftwareAutonomyView: React.FC<SoftwareAutonomyViewProps> = ({
  interfaces,
  requirements,
  simulations,
  onAskAi
}) => {
  const [activeTab, setActiveTab] = useState<'microros' | 'colregs' | 'architecture' | 'sensors' | 'icd'>('microros');
  const [selectedTopic, setSelectedTopic] = useState<'thruster' | 'odometry' | 'radar' | 'watchdog'>('thruster');
  const [codeType, setCodeType] = useState<'msg' | 'cpp' | 'qos'>('msg');
  const [copied, setCopied] = useState(false);

  const autonomyReqs = requirements.filter(r => r.subsystemCode === 'AUT');
  const autonomySims = simulations.filter(s => s.discipline === 'AUT');

  const handleExportIcdCsv = () => {
    const headers = ['ICD ID', 'Interface Title', 'Source', 'Target', 'Physical Medium', 'Protocol', 'Frequency (Hz)', 'Latency Budget (ms)', 'Status'];
    const rows = interfaces.map(i => [i.id, i.title, i.sourceSubsystem, i.targetSubsystem, i.physicalMedium, i.protocol, i.frequencyHz, i.latencyBudgetMs, i.status]);
    downloadCsv(`USV01_Interface_Control_Documents_${new Date().toISOString().split('T')[0]}.csv`, headers, rows);
  };

  // ROS 2 Code Snippet Generator Data
  const getRosCode = () => {
    if (selectedTopic === 'thruster') {
      if (codeType === 'msg') {
        return `# usv_interfaces/msg/ThrusterCommand.msg
# Authoritative propulsion control topic for twin PMSM drives
# Target execution rate: 50 Hz (20ms latency budget)

std_msgs/Header header

# Normalized thrust demand [-1.0 (full astern) to +1.0 (full ahead)]
float32 left_thrust_normalized
float32 right_thrust_normalized

# Steerable pod azimuth angles in radians [-pi/2 to +pi/2]
float32 left_pod_angle_rad
float32 right_pod_angle_rad

# Emergency stop override flag (true = clamp inverter gate to 0V)
bool emergency_stop_asserted

# Motor thermal threshold safeguard status
uint8 STATUS_NOMINAL = 0
uint8 STATUS_DERATING_THERMAL = 1
uint8 STATUS_SHUTDOWN_FAULT = 2
uint8 inverter_health_state`;
      }
      if (codeType === 'cpp') {
        return `// micro_ros_thruster_node.cpp
// Target Platform: STM32H743ZI / FreeRTOS micro-ROS Client
// Transport: CAN FD 1Mbps / UART DMA

#include <rcl/rcl.h>
#include <rclc/rclc.h>
#include <rclc/executor.h>
#include <usv_interfaces/msg/thruster_command.h>

rcl_subscription_t thruster_subscriber;
usv_interfaces__msg__ThrusterCommand thruster_msg;

void thruster_subscription_callback(const void *msgin) {
  const usv_interfaces__msg__ThrusterCommand *cmd = 
    (const usv_interfaces__msg__ThrusterCommand *)msgin;

  if (cmd->emergency_stop_asserted) {
    // Hardware interlock clamp
    HAL_CAN_Transmit_Throttle(&hcan1, 0.0f, 0.0f);
    return;
  }

  // Differential thrust translation to CAN motor controllers
  float left_cmd = cmd->left_thrust_normalized;
  float right_cmd = cmd->right_thrust_normalized;
  
  Set_PMSM_DutyCycle_Left(left_cmd);
  Set_PMSM_DutyCycle_Right(right_cmd);
}

void init_microros_actuator_node() {
  rclc_support_t support;
  rcl_allocator_t allocator = rcl_get_default_allocator();
  rclc_support_init(&support, 0, NULL, &allocator);

  rcl_node_t node;
  rclc_node_init_default(&node, "micro_ros_thrusters", "usv01", &support);

  rclc_subscription_init_best_effort(
    &thruster_subscriber,
    &node,
    ROSIDL_GET_MSG_TYPE_SUPPORT(usv_interfaces, msg, ThrusterCommand),
    "/usv01/actuators/thruster_cmd"
  );
}`;
      }
      return `<!-- cyclonedds_qos.xml -->
<!-- Ultra-Low Latency Actuator Profile -->
<CycloneDDS xmlns="https://cdds.io/config">
  <Domain id="any">
    <General>
      <NetworkInterfaceAddress>auto</NetworkInterfaceAddress>
      <AllowMulticast>true</AllowMulticast>
    </General>
    <Internal>
      <Watermarks>
        <WhcHigh>500kB</WhcHigh>
      </Watermarks>
    </Internal>
  </Domain>
</CycloneDDS>`;
    }

    if (selectedTopic === 'odometry') {
      if (codeType === 'msg') {
        return `# usv_interfaces/msg/VesselOdometry.msg
# Fused Tactical RTK GNSS/INS Marine Navigation State
# Target rate: 100 Hz

std_msgs/Header header
string child_frame_id     # "base_link" (transom AP origin)

# Geodetic coordinates
float64 latitude_deg
float64 longitude_deg
float32 altitude_m

# Local navigation frame (North-East-Down or UTM)
geometry_msgs/PoseWithCovariance pose
geometry_msgs/TwistWithCovariance twist

# Marine Specific State
float32 speed_over_ground_knots
float32 course_over_ground_deg
float32 heading_true_deg
float32 rate_of_turn_deg_per_sec

# RTK Carrier Phase Fix Quality
uint8 FIX_NONE = 0
uint8 FIX_AUTONOMOUS = 1
uint8 FIX_RTK_FLOAT = 2
uint8 FIX_RTK_FIXED = 3
uint8 rtk_status`;
      }
      return `// ROS2 Odometry Publisher Hook
rcl_publisher_t odom_pub;
// Streamed to EKF nav2 filter at 100Hz`;
    }

    if (selectedTopic === 'radar') {
      return `# usv_interfaces/msg/RadarTargetArray.msg
# 4G FMCW Radar Extracted ARPA Track Cluster
std_msgs/Header header

uint32 target_count
RadarTarget[] targets

# Target Definition:
# - float32 range_m
# - float32 bearing_deg
# - float32 speed_knots
# - float32 cpa_m (Closest Point of Approach)
# - float32 tcpa_sec (Time to CPA)`;
    }

    // Watchdog
    return `// heartbeat_watchdog_node.cpp
// Monitors shoreside command telemetry link.
// If elapsed time exceeds timeout, transition to Autonomous Loiter/Anchor.

#include <rclcpp/rclcpp.hpp>
#include <std_msgs/msg/empty.hpp>

class WatchdogNode : public rclcpp::Node {
public:
  WatchdogNode() : Node("watchdog_node") {
    last_heartbeat_time_ = this->now();
    
    sub_ = this->create_subscription<std_msgs/msg/Empty>(
      "/usv01/telemetry/heartbeat", 10,
      [this](const std_msgs/msg/Empty::SharedPtr) {
        last_heartbeat_time_ = this->now();
      });

    timer_ = this->create_wall_timer(
      std::chrono::milliseconds(100),
      [this]() {
        double elapsed_sec = (this->now() - last_heartbeat_time_).seconds();
        if (elapsed_sec > 2.5) { // 2.5s Fail-safe trigger
          RCLCPP_WARN_THROTTLE(this->get_logger(), *this->get_clock(), 1000,
            "HEARTBEAT LOST (%.1fs). Clamping to Fail-Safe Loiter Mode!", elapsed_sec);
          TriggerFailSafeLoiter();
        }
      });
  }

private:
  void TriggerFailSafeLoiter() {
    // Clamp thrusters, engage GPS virtual anchor loiter
  }
  rclcpp::Time last_heartbeat_time_;
  rclcpp::Subscription<std_msgs/msg/Empty>::SharedPtr sub_;
  rclcpp::TimerBase::SharedPtr timer_;
};`;
  };

  const copyCodeToClipboard = () => {
    navigator.clipboard.writeText(getRosCode());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadCodeFile = () => {
    const filename =
      codeType === 'msg'
        ? `${selectedTopic}.msg`
        : codeType === 'cpp'
        ? `${selectedTopic}_node.cpp`
        : 'cyclonedds_qos.xml';
    const blob = new Blob([getRosCode()], { type: 'text/plain;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs text-teal-400 bg-teal-500/10 border border-teal-500/30 px-2 py-0.5 rounded">
              AUT-07
            </span>
            <span className="text-xs text-slate-500 font-mono">SOFTWARE & AUTONOMY WORKSPACE</span>
          </div>
          <h2 className="text-xl font-bold text-slate-100 mt-1">
            ROS 2 Humble, micro-ROS Node Generator & COLREGs Engine
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            DDS middleware topology, real-time micro-ROS embedded C++ stubs, RTK GNSS/INS perception, and interface control documents.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onAskAi('Audit the Software & Autonomy ROS 2 architecture and micro-ROS hardware transport against COLREGs Rule 14/15 collision avoidance and watchdog heartbeat requirements.')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/30 text-sky-300 text-xs transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>AI Autonomy Audit</span>
          </button>
        </div>
      </div>

      {/* Mandatory Safety Boundary Notice */}
      <div className="p-3.5 rounded bg-slate-900 border border-slate-800 flex items-start gap-3 text-xs">
        <ShieldAlert className="w-5 h-5 text-teal-400 flex-shrink-0 mt-0.5" />
        <div>
          <h4 className="font-semibold text-slate-200">Design Workspace Boundary & Safety Disclaimer</h4>
          <p className="text-slate-400 mt-0.5 leading-relaxed">
            This module generates formal software architectures, DDS QoS configurations, and micro-ROS node boilerplate for testing on HIL hardware testbeds. It is <strong>NOT</strong> a live shipboard operational controller.
          </p>
        </div>
      </div>

      {/* Sub-tabs */}
      <div className="flex border-b border-slate-800 gap-1 text-xs font-mono overflow-x-auto">
        <button
          onClick={() => setActiveTab('microros')}
          className={`px-4 py-2 border-b-2 font-medium transition-colors whitespace-nowrap ${
            activeTab === 'microros'
              ? 'border-teal-400 text-teal-300 bg-slate-900/40'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          ROS 2 & micro-ROS Generator
        </button>
        <button
          onClick={() => setActiveTab('colregs')}
          className={`px-4 py-2 border-b-2 font-medium transition-colors whitespace-nowrap ${
            activeTab === 'colregs'
              ? 'border-teal-400 text-teal-300 bg-slate-900/40'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          COLREGs Collision Avoidance
        </button>
        <button
          onClick={() => setActiveTab('architecture')}
          className={`px-4 py-2 border-b-2 font-medium transition-colors whitespace-nowrap ${
            activeTab === 'architecture'
              ? 'border-teal-400 text-teal-300 bg-slate-900/40'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          ROS 2 Stack Architecture
        </button>
        <button
          onClick={() => setActiveTab('sensors')}
          className={`px-4 py-2 border-b-2 font-medium transition-colors whitespace-nowrap ${
            activeTab === 'sensors'
              ? 'border-teal-400 text-teal-300 bg-slate-900/40'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Perception & Sensor Suite
        </button>
        <button
          onClick={() => setActiveTab('icd')}
          className={`px-4 py-2 border-b-2 font-medium transition-colors whitespace-nowrap ${
            activeTab === 'icd'
              ? 'border-teal-400 text-teal-300 bg-slate-900/40'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Interface Control Documents ({interfaces.length})
        </button>
      </div>

      {/* TAB 0: ROS 2 & micro-ROS Generator */}
      {activeTab === 'microros' && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Left Column: Topic & Node Selector */}
            <div className="lg:col-span-4 bg-slate-900 border border-slate-800 rounded p-4 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <h3 className="text-xs font-semibold text-slate-200 flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-teal-400" />
                  <span>Hardware Node Interfaces</span>
                </h3>
                <span className="text-[10px] font-mono text-slate-400">ROS 2 HUMBLE</span>
              </div>

              <div className="space-y-1.5 font-mono text-xs">
                <button
                  onClick={() => setSelectedTopic('thruster')}
                  className={`w-full text-left p-2.5 rounded border transition-colors ${
                    selectedTopic === 'thruster'
                      ? 'bg-teal-500/15 border-teal-500/40 text-teal-300 font-semibold'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <div className="text-slate-200 font-bold">1. Twin Thrusters ESC Inverter</div>
                  <div className="text-[10px] text-slate-500">CAN FD / micro-ROS 50Hz</div>
                </button>

                <button
                  onClick={() => setSelectedTopic('odometry')}
                  className={`w-full text-left p-2.5 rounded border transition-colors ${
                    selectedTopic === 'odometry'
                      ? 'bg-teal-500/15 border-teal-500/40 text-teal-300 font-semibold'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <div className="text-slate-200 font-bold">2. Tactical RTK GNSS/INS State</div>
                  <div className="text-[10px] text-slate-500">Ethernet UDP / ROS2 100Hz</div>
                </button>

                <button
                  onClick={() => setSelectedTopic('radar')}
                  className={`w-full text-left p-2.5 rounded border transition-colors ${
                    selectedTopic === 'radar'
                      ? 'bg-teal-500/15 border-teal-500/40 text-teal-300 font-semibold'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <div className="text-slate-200 font-bold">3. FMCW Radar Target Tracks</div>
                  <div className="text-[10px] text-slate-500">ARPA Clusters / 10Hz</div>
                </button>

                <button
                  onClick={() => setSelectedTopic('watchdog')}
                  className={`w-full text-left p-2.5 rounded border transition-colors ${
                    selectedTopic === 'watchdog'
                      ? 'bg-teal-500/15 border-teal-500/40 text-teal-300 font-semibold'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <div className="text-slate-200 font-bold">4. Fail-Safe Heartbeat Watchdog</div>
                  <div className="text-[10px] text-slate-500">Loiter fallback on 2.5s dropout</div>
                </button>
              </div>

              {/* Hardware Transport Specs */}
              <div className="p-3 rounded bg-slate-950 border border-slate-800 text-[11px] font-mono space-y-1.5">
                <span className="text-slate-400 font-bold block text-[10px] uppercase">micro-ROS Hardware Bus:</span>
                <div className="text-slate-300">• MCU: STM32H743ZI Cortex-M7 (480 MHz)</div>
                <div className="text-slate-300">• Transport: CAN FD 1 Mbps / UART DMA</div>
                <div className="text-slate-300">• RTOS: FreeRTOS 10.4.x</div>
                <div className="text-slate-300">• Agent Host: Jetson AGX Orin (micro-ROS Agent)</div>
              </div>
            </div>

            {/* Right Column: Interactive Code Viewer */}
            <div className="lg:col-span-8 bg-slate-900 border border-slate-800 rounded p-4 space-y-3 flex flex-col justify-between">
              <div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 border-b border-slate-800 gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-slate-200 font-mono">
                      {selectedTopic === 'thruster'
                        ? 'usv_interfaces/msg/ThrusterCommand.msg'
                        : selectedTopic === 'odometry'
                        ? 'usv_interfaces/msg/VesselOdometry.msg'
                        : selectedTopic === 'radar'
                        ? 'usv_interfaces/msg/RadarTargetArray.msg'
                        : 'usv_autonomy/src/heartbeat_watchdog_node.cpp'}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* View Code Type */}
                    <div className="flex bg-slate-950 rounded p-0.5 border border-slate-800 text-[10px] font-mono">
                      <button
                        onClick={() => setCodeType('msg')}
                        className={`px-2 py-0.5 rounded transition-colors ${codeType === 'msg' ? 'bg-teal-500/20 text-teal-300 font-bold' : 'text-slate-400'}`}
                      >
                        .msg
                      </button>
                      <button
                        onClick={() => setCodeType('cpp')}
                        className={`px-2 py-0.5 rounded transition-colors ${codeType === 'cpp' ? 'bg-teal-500/20 text-teal-300 font-bold' : 'text-slate-400'}`}
                      >
                        C++
                      </button>
                      <button
                        onClick={() => setCodeType('qos')}
                        className={`px-2 py-0.5 rounded transition-colors ${codeType === 'qos' ? 'bg-teal-500/20 text-teal-300 font-bold' : 'text-slate-400'}`}
                      >
                        QoS
                      </button>
                    </div>

                    <button
                      onClick={copyCodeToClipboard}
                      className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono flex items-center gap-1"
                    >
                      {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copied ? 'Copied' : 'Copy'}</span>
                    </button>

                    <button
                      onClick={downloadCodeFile}
                      className="px-2 py-1 rounded bg-teal-500/10 hover:bg-teal-500/20 border border-teal-500/30 text-teal-300 text-xs font-mono flex items-center gap-1"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download</span>
                    </button>
                  </div>
                </div>

                {/* Preformatted Code Box */}
                <div className="mt-3 bg-slate-950 rounded border border-slate-800 p-3 max-h-96 overflow-y-auto">
                  <pre className="text-xs font-mono text-slate-300 leading-relaxed whitespace-pre-wrap select-all">
                    {getRosCode()}
                  </pre>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-[11px] font-mono text-slate-500">
                <span>DDS Standard: CycloneDDS • Best Effort UDP Multicast</span>
                <span>ISO 26262 / MISRA C++ Compliant Guidelines</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 1: COLREGs */}
      {activeTab === 'colregs' && (
        <div className="space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded p-4 text-xs space-y-3">
            <h3 className="text-xs font-semibold text-slate-200 pb-2 border-b border-slate-800 flex items-center gap-2">
              <Navigation className="w-4 h-4 text-teal-400" />
              <span>COLREGs Autonomous Avoidance Rules & State Machine</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 font-mono">
              <div className="p-3 bg-slate-950 rounded border border-slate-800">
                <span className="text-teal-400 font-bold block text-[11px]">RULE 14: HEAD-ON ENCOUNTERS</span>
                <p className="text-slate-300 mt-1 text-[11px] leading-relaxed">
                  Both vessels shall alter course to starboard to pass port-to-port. USV-01 autonomy detects reciprocal target bearings within ±6° and initiates minimum 25° starboard maneuver at CPA range ≥ 250 meters.
                </p>
                <div className="mt-2 text-[10px] text-slate-500">
                  Traceability: REQ-AUT-001 • Verification: SIM-AUT-001
                </div>
              </div>

              <div className="p-3 bg-slate-950 rounded border border-slate-800">
                <span className="text-teal-400 font-bold block text-[11px]">RULE 15: CROSSING SITUATIONS</span>
                <p className="text-slate-300 mt-1 text-[11px] leading-relaxed">
                  When crossing, the vessel having the other on her starboard side is the Give-way vessel and shall alter course to pass astern. Stand-on state maintains predictable speed until threshold emergency trigger.
                </p>
                <div className="mt-2 text-[10px] text-slate-500">
                  Traceability: REQ-AUT-001 • Verification: SIM-AUT-001
                </div>
              </div>

              <div className="p-3 bg-slate-950 rounded border border-slate-800">
                <span className="text-teal-400 font-bold block text-[11px]">RULE 16: GIVE-WAY EARLY ACTION</span>
                <p className="text-slate-300 mt-1 text-[11px] leading-relaxed">
                  Avoidance action shall be taken early and substantially. Tiny incremental heading adjustments are prohibited to prevent target vessel confusion.
                </p>
                <div className="mt-2 text-[10px] text-slate-500">
                  Minimum course alteration angle: 25.0 degrees
                </div>
              </div>

              <div className="p-3 bg-slate-950 rounded border border-slate-800">
                <span className="text-teal-400 font-bold block text-[11px]">RULE 17: STAND-ON ACTION BY OWN SHIP</span>
                <p className="text-slate-300 mt-1 text-[11px] leading-relaxed">
                  Maintain course and speed until give-way vessel fails to take appropriate action, then execute autonomous emergency evasive turn to starboard.
                </p>
                <div className="mt-2 text-[10px] text-slate-500">
                  Last-ditch evasive time-to-CPA: 45 seconds
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Architecture */}
      {activeTab === 'architecture' && (
        <div className="bg-slate-900 border border-slate-800 rounded p-4 text-xs font-mono space-y-3">
          <h3 className="text-xs font-semibold text-slate-200 pb-2 border-b border-slate-800 flex items-center gap-2">
            <Cpu className="w-4 h-4 text-teal-400" />
            <span>ROS2 Humble Autonomy Compute Topology (DEC-AUT-001)</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="p-3 bg-slate-950 rounded border border-slate-800">
              <span className="text-slate-500 text-[10px]">PRIMARY MISSION COMPUTE</span>
              <strong className="text-teal-400 block mt-1">Nvidia Jetson AGX Orin 64GB</strong>
              <span className="text-[11px] text-slate-400 block mt-1">Perception DNN inference, 3D LiDAR point cloud SLAM, radar spoke processing.</span>
            </div>
            <div className="p-3 bg-slate-950 rounded border border-slate-800">
              <span className="text-slate-500 text-[10px]">FAIL-SAFE FLIGHT/DRIVE CONTROLLER</span>
              <strong className="text-slate-200 block mt-1">Dual STM32H7 Cortex-M7 RTOS</strong>
              <span className="text-[11px] text-slate-400 block mt-1">Hard real-time CAN bus motor torque loop, watchdog heartbeat monitor, loiter fallback.</span>
            </div>
            <div className="p-3 bg-slate-950 rounded border border-slate-800">
              <span className="text-slate-500 text-[10px]">MIDDLEWARE & QOS</span>
              <strong className="text-slate-200 block mt-1">CycloneDDS with Best-Effort Sensor QoS</strong>
              <span className="text-[11px] text-slate-400 block mt-1">Reliable QoS on motor setpoints; transient local on mission plan waypoints.</span>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: Sensors */}
      {activeTab === 'sensors' && (
        <div className="bg-slate-900 border border-slate-800 rounded p-4 text-xs space-y-3">
          <h3 className="text-xs font-semibold text-slate-200 pb-2 border-b border-slate-800">
            Perception & Marine Navigation Sensor Suite
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 font-mono text-[11px]">
            <div className="p-3 bg-slate-950 rounded border border-slate-800">
              <span className="text-teal-400 font-bold">1. Tactile MEMS GNSS/INS (BOM-001)</span>
              <p className="text-slate-300 mt-1">Dual antenna RTK centimeter positioning with fused 9-axis tactical IMU for dead reckoning during satellite occlusions.</p>
            </div>
            <div className="p-3 bg-slate-950 rounded border border-slate-800">
              <span className="text-teal-400 font-bold">2. Solid-State FMCW 4G Marine Radar (BOM-003)</span>
              <p className="text-slate-300 mt-1">Continuous all-weather surface target detection up to 24 nautical miles with automated ARPA target tracking.</p>
            </div>
            <div className="p-3 bg-slate-950 rounded border border-slate-800">
              <span className="text-teal-400 font-bold">3. 3D Marine LiDAR (905nm)</span>
              <p className="text-slate-300 mt-1">Near-field 360° obstacle and debris detection for docking and harbor navigation.</p>
            </div>
            <div className="p-3 bg-slate-950 rounded border border-slate-800">
              <span className="text-teal-400 font-bold">4. Class B AIS Transceiver</span>
              <p className="text-slate-300 mt-1">Continuous broadcast and reception of vessel MMSI, GPS position, course over ground, and speed over ground.</p>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: ICD Register */}
      {activeTab === 'icd' && (
        <div className="bg-slate-900 border border-slate-800 rounded p-4 text-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <h3 className="text-xs font-semibold text-slate-200 flex items-center gap-2">
              <Network className="w-4 h-4 text-teal-400" />
              <span>Interface Control Documents (ICD) Register</span>
            </h3>
            <button
              onClick={handleExportIcdCsv}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono"
            >
              <Download className="w-3 h-3" />
              <span>Export ICD CSV</span>
            </button>
          </div>

          <div className="overflow-x-auto mt-4">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="bg-slate-950 border-b border-slate-800 text-slate-400 text-[10px]">
                  <th className="py-2 px-3">ICD ID</th>
                  <th className="py-2 px-3">Interface Title</th>
                  <th className="py-2 px-3">Source → Target</th>
                  <th className="py-2 px-3">Physical Medium</th>
                  <th className="py-2 px-3">Protocol</th>
                  <th className="py-2 px-3">Rate (Hz)</th>
                  <th className="py-2 px-3">Latency Budget</th>
                  <th className="py-2 px-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 font-sans">
                {interfaces.map((icd) => (
                  <tr key={icd.id} className="hover:bg-slate-800/50">
                    <td className="py-2.5 px-3 font-mono text-teal-400 font-bold">{icd.id}</td>
                    <td className="py-2.5 px-3 text-slate-200 font-medium">{icd.title}</td>
                    <td className="py-2.5 px-3 font-mono text-slate-400">{icd.sourceSubsystem} → {icd.targetSubsystem}</td>
                    <td className="py-2.5 px-3 font-mono text-slate-300">{icd.physicalMedium}</td>
                    <td className="py-2.5 px-3 font-mono text-teal-400">{icd.protocol}</td>
                    <td className="py-2.5 px-3 font-mono text-slate-300">{icd.frequencyHz}</td>
                    <td className="py-2.5 px-3 font-mono text-slate-300">{icd.latencyBudgetMs}</td>
                    <td className="py-2.5 px-3">
                      <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded ${getStatusBadgeClass(icd.status)}`}>
                        {icd.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
