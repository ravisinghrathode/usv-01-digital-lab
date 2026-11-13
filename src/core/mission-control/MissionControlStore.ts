import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';

export type MissionTaskState =
  | 'PENDING'
  | 'ORCHESTRATING'
  | 'EXECUTING'
  | 'REVIEWING'
  | 'TECHNICALLY_REVIEWED'
  | 'READY_FOR_HUMAN_REVIEW'
  | 'BLOCKED'
  | 'FAILED';

export interface MissionTaskRecord {
  taskId: string;
  agentId: string;
  objective: string;
  state: MissionTaskState;
  commitSha: string;
  createdAt: string;
  updatedAt: string;
  reviewCycle: number;
  lastError?: string;
  evidenceManifest?: unknown;
}

export interface MissionControlEvent {
  timestamp: string;
  taskId: string;
  action: string;
  details?: Record<string, unknown>;
}

interface MissionControlState {
  schemaVersion: 1;
  tasks: Record<string, MissionTaskRecord>;
  events: MissionControlEvent[];
}

const EMPTY_STATE: MissionControlState = { schemaVersion: 1, tasks: {}, events: [] };

export class MissionControlStore {
  private writeChain: Promise<void> = Promise.resolve();

  constructor(private readonly filePath: string) {}

  private async readState(): Promise<MissionControlState> {
    try {
      const parsed = JSON.parse(await readFile(this.filePath, 'utf8')) as MissionControlState;
      if (parsed?.schemaVersion !== 1 || !parsed.tasks || !Array.isArray(parsed.events)) {
        throw new Error('Mission Control store schema invalid');
      }
      return parsed;
    } catch (err: any) {
      if (err?.code === 'ENOENT') return structuredClone(EMPTY_STATE);
      throw err;
    }
  }

  private async writeState(state: MissionControlState): Promise<void> {
    await mkdir(path.dirname(this.filePath), { recursive: true });
    const temporary = `${this.filePath}.tmp-${process.pid}`;
    await writeFile(temporary, JSON.stringify(state, null, 2) + '\n', { encoding: 'utf8', mode: 0o600 });
    await rename(temporary, this.filePath);
  }

  private serialize(operation: () => Promise<void>): Promise<void> {
    this.writeChain = this.writeChain.then(operation, operation);
    return this.writeChain;
  }

  async getTask(taskId: string): Promise<MissionTaskRecord | undefined> {
    const state = await this.readState();
    return state.tasks[taskId];
  }

  async getAllTasks(): Promise<MissionTaskRecord[]> {
    const state = await this.readState();
    return Object.values(state.tasks);
  }

  async createTask(record: MissionTaskRecord): Promise<void> {
    await this.serialize(async () => {
      const state = await this.readState();
      if (state.tasks[record.taskId]) throw new Error(`Mission task '${record.taskId}' already exists`);
      state.tasks[record.taskId] = record;
      state.events.push({
        timestamp: new Date().toISOString(),
        taskId: record.taskId,
        action: 'TASK_CREATED',
        details: { agentId: record.agentId, commitSha: record.commitSha }
      });
      await this.writeState(state);
    });
  }

  async updateTask(taskId: string, updates: Partial<Omit<MissionTaskRecord, 'taskId' | 'createdAt'>>): Promise<void> {
    await this.serialize(async () => {
      const state = await this.readState();
      const current = state.tasks[taskId];
      if (!current) throw new Error(`Mission task '${taskId}' not found`);
      state.tasks[taskId] = {
        ...current,
        ...updates,
        taskId,
        createdAt: current.createdAt,
        updatedAt: new Date().toISOString()
      };
      state.events.push({
        timestamp: new Date().toISOString(),
        taskId,
        action: 'TASK_UPDATED',
        details: { state: state.tasks[taskId].state, reviewCycle: state.tasks[taskId].reviewCycle }
      });
      if (state.events.length > 5000) state.events = state.events.slice(-5000);
      await this.writeState(state);
    });
  }
}
