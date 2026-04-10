import Dexie, { type EntityTable } from 'dexie';
import { z } from 'zod';
import { ShotData, UserSettings, ProductItem, SavedAnalysis, GeminiShotAnalysis, ListItem, TampLevel, SettingsValue, MaintenanceLogEntry } from '../types';
import { TAG_DATA_DEFAULT } from '../constants';
import { getReconstructedTimes, formatGrindSetting } from '../utils/shotUtils';

const ShotSchema = z.object({
  id: z.string().uuid(),
  date: z.string().datetime(),
  machineName: z.string().min(1),
  beanName: z.string().min(1),
  doseIn: z.number().positive(),
  yieldOut: z.number().positive(),
  time: z.number().positive(),
  temperature: z.number().positive(),
  pressure: z.number().nonnegative(),
});

// Enterprise-grade: Define strongly typed Database Class extending Dexie
class PharmaBaristaDB extends Dexie {
  shots!: EntityTable<ShotData, 'id'>;
  settings!: EntityTable<{ key: string; value: SettingsValue }, 'key'>;
  machines!: EntityTable<ProductItem, 'id'>;
  beans!: EntityTable<ProductItem, 'id'>;
  analyses!: EntityTable<SavedAnalysis, 'id'>;
  maintenanceLog!: EntityTable<MaintenanceLogEntry, 'id'>;
  geminiHistory!: EntityTable<GeminiShotAnalysis, 'id'>;

  constructor() {
    super('PharmaBaristaDB');

    // Schema definition versioning
    // V6: Updated bean and shot indices for lot/roastDate support
    this.version(6).stores({
      shots: 'id, date, machineName, beanId',
      settings: 'key',
      machines: '++id, &name',
      beans: '++id, name, lot, roastDate',
      analyses: '++id, date',
      maintenanceLog: 'id, dueDate, status'
    });

    // V7: Add geminiHistory for per-shot AI analysis caching
    this.version(7).stores({
      shots: 'id, date, machineName, beanId',
      settings: 'key',
      machines: '++id, &name',
      beans: '++id, name, lot, roastDate',
      analyses: '++id, date',
      maintenanceLog: 'id, dueDate, status',
      geminiHistory: '++id, shotId, date, &shotHash'
    });
  }
}

// Singleton instance initialization
export const db = new PharmaBaristaDB();

// Global DB Error Handler for Stability
db.on('versionchange', (event: IDBVersionChangeEvent) => {
  (event.target as IDBOpenDBRequest).result.close();
  console.warn("Database version changed in another tab. Reloading...");
  window.location.reload();
  return false;
});

db.on('blocked', () => {
  console.error("Database upgrade blocked. Please close other tabs of this app.");
});

// --- EMERGENCY RECOVERY ---
export const hardResetDatabase = async (): Promise<void> => {
  try {
    console.warn("INITIATING HARD RESET...");
    await Dexie.delete('PharmaBaristaDB');
    localStorage.clear();
    console.log("Database and LocalStorage cleared.");
  } catch (e) {
    console.error("Hard reset failed:", e);
    localStorage.clear();
  }
};

export const backupDatabase = async (): Promise<string> => {
  const data = {
    shots: await db.shots.toArray(),
    machines: await db.machines.toArray(),
    beans: await db.beans.toArray(),
    maintenance: await db.maintenanceLog.toArray(),
    settings: await db.settings.toArray(),
    timestamp: new Date().toISOString()
  };
  return JSON.stringify(data);
};

// --- SEEDING / MIGRATION LOGIC ---
export const ensureDefaultSettings = async (): Promise<void> => {
  const categories = ['aspect', 'aroma', 'taste', 'body'] as const;
  try {
    for (const cat of categories) {
      const keyPos = `tags_${cat}_positive`;
      const hasPos = await db.settings.get(keyPos);
      if (!hasPos) {
        const items: ListItem[] = TAG_DATA_DEFAULT[cat].positive.map((t, i) => ({
          id: crypto.randomUUID(),
          label: t.replace(/_/g, ' '),
          order: i
        }));
        await db.settings.put({ key: keyPos, value: items });
      }
      const keyNeg = `tags_${cat}_negative`;
      const hasNeg = await db.settings.get(keyNeg);
      if (!hasNeg) {
        const items: ListItem[] = TAG_DATA_DEFAULT[cat].negative.map((t, i) => ({
          id: crypto.randomUUID(),
          label: t.replace(/_/g, ' '),
          order: i
        }));
        await db.settings.put({ key: keyNeg, value: items });
      }
    }
    const hasTamp = await db.settings.get('tamp_levels');
    if (!hasTamp) {
      const defaults = [TampLevel.WEAK, TampLevel.MEDIUM, TampLevel.STRONG];
      const items: ListItem[] = defaults.map((t, i) => ({
        id: crypto.randomUUID(),
        label: t,
        order: i
      }));
      await db.settings.put({ key: 'tamp_levels', value: items });
    }
  } catch (error) {
    console.error("Failed to ensure default settings:", error);
  }
};

// --- SHOT METHODS ---
export const migrateShotTimes = async (): Promise<void> => {
  try {
    await db.transaction('rw', db.shots, async () => {
      const shots = await db.shots.toArray();
      console.log(`Starting migration for ${shots.length} shots.`);
      const updates = shots.map(shot => {
        const newTimes = getReconstructedTimes(shot, true);
        return {
          key: shot.id,
          changes: {
            preinfusionTime: newTimes.preinfusionTime,
            infusionTime: newTimes.infusionTime,
            postinfusionTime: newTimes.postinfusionTime,
            effectiveExtractionTime: newTimes.effectiveExtractionTime,
            standardExtractionTime: newTimes.standardExtractionTime,
            grindSettingText: shot.grindSetting ? formatGrindSetting(shot.grindSetting) : shot.grindSettingText
          }
        };
      });
      await db.shots.bulkUpdate(updates);
      console.log("Migration completed successfully.");
    });
  } catch (error) {
    console.error("Migration failed:", error);
  }
};

export const migrateEurekaGrindSettings = async (): Promise<void> => {
  try {
    await db.transaction('rw', db.shots, async () => {
      const shots = await db.shots.toArray();
      const updates = shots
        .filter(shot => shot.grindScaleType === 'eureka' && shot.grindSetting && shot.grindSetting >= 20)
        .map(shot => {
          const rotations = Math.floor(shot.grindSetting! / 20);
          const dial = shot.grindSetting! % 20;
          const newGrindSetting = rotations + dial / 10;
          return { key: shot.id, changes: { grindSetting: newGrindSetting } };
        });
      await db.shots.bulkUpdate(updates);
    });
  } catch (error) {
    console.error("Eureka grind setting migration failed:", error);
  }
};

export const saveShot = async (shot: ShotData): Promise<void> => {
  try {
    ShotSchema.parse({
      id: shot.id, date: shot.date, machineName: shot.machineName,
      beanName: shot.beanName, doseIn: shot.doseIn, yieldOut: shot.yieldOut,
      time: shot.time, temperature: shot.temperature, pressure: shot.pressure
    });
    await db.shots.put(shot);
  } catch (error: unknown) {
    console.error("Failed to save shot:", error);
    throw error;
  }
};

export const updateShot = async (id: string, changes: Partial<ShotData>): Promise<void> => {
  try {
    await db.shots.update(id, changes);
  } catch (error) {
    console.error("Failed to update shot:", error);
    throw error;
  }
};

export const deleteShot = async (id: string): Promise<void> => {
  try {
    await db.shots.delete(id);
  } catch (error) {
    console.error("Failed to delete shot:", error);
    throw error;
  }
};

export const clearAllShots = async (): Promise<void> => {
  try {
    await db.shots.clear();
  } catch (error) {
    console.error("Failed to clear shots:", error);
    throw error;
  }
};

// --- PRODUCT METHODS (Machines & Beans) ---
export const saveProduct = async (type: 'machine' | 'bean', product: ProductItem): Promise<void> => {
  const table = type === 'machine' ? db.machines : db.beans;
  try {
    const existing = await table.where({ name: product.name, lot: product.lot || '', roastDate: product.roastDate || '' }).first();
    if (existing && existing.id) { product.id = existing.id; }
    await table.put(product);
  } catch (error) {
    console.error(`Failed to save product (${type}):`, error);
    throw error;
  }
};

export const deleteProduct = async (type: 'machine' | 'bean', id: number): Promise<void> => {
  const table = type === 'machine' ? db.machines : db.beans;
  try {
    await table.delete(id);
  } catch (error) {
    console.error(`Failed to delete product (${type}):`, error);
    throw error;
  }
};

export const getAllProducts = async (type: 'machine' | 'bean'): Promise<ProductItem[]> => {
  const table = type === 'machine' ? db.machines : db.beans;
  return await table.orderBy('name').toArray();
};

export const clearAllProducts = async (): Promise<void> => {
  try {
    await db.machines.clear();
    await db.beans.clear();
  } catch (error) {
    console.error("Failed to clear products:", error);
    throw error;
  }
};

// --- ANALYSIS METHODS ---
export const saveAnalysis = async (analysis: SavedAnalysis): Promise<void> => {
  await db.analyses.add(analysis);
};

export const getAnalyses = async (): Promise<SavedAnalysis[]> => {
  return await db.analyses.orderBy('date').reverse().toArray();
};

export const deleteAnalysis = async (id: number): Promise<void> => {
  await db.analyses.delete(id);
};

// --- GEMINI HISTORY METHODS (Feature: history + cache) ---
export const saveGeminiAnalysis = async (analysis: GeminiShotAnalysis): Promise<void> => {
  try {
    await db.geminiHistory.put(analysis);
  } catch (error) {
    console.error('Failed to save Gemini analysis to history:', error);
    // Non-fatal: app continues without caching
  }
};

export const getGeminiAnalysisByHash = async (hash: string): Promise<GeminiShotAnalysis | undefined> => {
  try {
    return await db.geminiHistory.where('shotHash').equals(hash).first();
  } catch {
    return undefined;
  }
};

export const getGeminiHistoryByShotId = async (shotId: string): Promise<GeminiShotAnalysis | undefined> => {
  try {
    return await db.geminiHistory.where('shotId').equals(shotId).last();
  } catch {
    return undefined;
  }
};

export const getAllGeminiHistory = async (): Promise<GeminiShotAnalysis[]> => {
  try {
    return await db.geminiHistory.orderBy('date').reverse().toArray();
  } catch {
    return [];
  }
};

export const deleteGeminiAnalysis = async (id: number): Promise<void> => {
  try {
    await db.geminiHistory.delete(id);
  } catch (error) {
    console.error('Failed to delete Gemini analysis:', error);
  }
};

// --- MAINTENANCE LOG METHODS ---
export const getMaintenanceTasks = async (): Promise<MaintenanceLogEntry[]> => {
  return await db.maintenanceLog.orderBy('dueDate').toArray();
};

export const addMaintenanceTask = async (task: MaintenanceLogEntry): Promise<void> => {
  await db.maintenanceLog.put(task);
};

export const deleteMaintenanceTask = async (id: string): Promise<void> => {
  await db.maintenanceLog.delete(id);
};

// --- SETTINGS METHODS ---
export const saveSetting = async (key: string, value: SettingsValue): Promise<void> => {
  try {
    await db.settings.put({ key, value });
  } catch (error) {
    console.error(`Failed to save setting ${key}:`, error);
  }
};

export const saveSettings = async (settings: { key: string; value: SettingsValue }[]): Promise<void> => {
  try {
    await db.settings.bulkPut(settings);
  } catch (error) {
    console.error("Failed to bulk save settings:", error);
    throw error;
  }
};

export const getSetting = async (key: string): Promise<SettingsValue | undefined> => {
  try {
    const result = await db.settings.get(key);
    return result ? result.value : undefined;
  } catch (error) {
    console.error(`Failed to get setting ${key}:`, error);
    return undefined;
  }
};

export const getAllSettings = async (): Promise<UserSettings> => {
  try {
    const allParams = await db.settings.toArray();
    const settingsObj: Record<string, SettingsValue> = {};
    allParams.forEach(item => { settingsObj[item.key] = item.value; });
    return settingsObj as UserSettings;
  } catch (error) {
    console.error("Failed to get all settings:", error);
    return {};
  }
};
