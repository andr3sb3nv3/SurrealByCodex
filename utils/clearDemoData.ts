import { writeBatch, doc, getDocs, collection } from 'firebase/firestore';
import type { DocumentReference } from 'firebase/firestore';
import { signInAnonymously } from 'firebase/auth';
import { db, auth } from '../services/firebase';

const TARGETED_DEMO_UIDS = [
  'InconsistentStreak2025',
  'DemoMetricas1111111111',
  'DemoMetricas2222222222',
] as const;

export const clearTargetedDemoUserData = async (targetUid: string): Promise<{success: boolean, error?: string}> => {
  if (!db || !auth) {
    return { success: false, error: "Database not initialized" };
  }

  if (!TARGETED_DEMO_UIDS.includes(targetUid as typeof TARGETED_DEMO_UIDS[number])) {
    return { success: false, error: "invalid-demo-target" };
  }

  if (!auth.currentUser) {
    try {
      await signInAnonymously(auth);
    } catch (e) {
      console.warn("Could not sign in anonymously:", e);
    }
  }

  const collectionsToClear = [
    'daily_logs',
    'Set_goals',
    'deepClinicalLogsAnxiety',
    'deepClinicalLogsDepression',
    'deepClinicalLogsBipolar',
    'deepClinicalLogsSchizophrenia',
    'deepClinicalLogsOCD',
    'deepClinicalLogsTrauma',
    'deepClinicalLogsSleep',
    'deepClinicalLogsPersonality',
    'deepClinicalLogsADHD',
    'deepClinicalLogsSubstance',
  ] as const;

  try {
    let batch = writeBatch(db);
    let opCount = 0;
    const commitAndResetBatch = async () => {
      if (opCount > 0) {
        await batch.commit();
        batch = writeBatch(db);
        opCount = 0;
      }
    };

    const addDeleteToBatch = async (ref: DocumentReference) => {
      batch.delete(ref);
      opCount++;
      if (opCount >= 450) await commitAndResetBatch();
    };

    for (const col of collectionsToClear) {
      const snap = await getDocs(collection(db, 'users', targetUid, col));
      for (const row of snap.docs) {
        await addDeleteToBatch(row.ref as DocumentReference);
      }
    }

    await addDeleteToBatch(doc(db, 'users', targetUid) as DocumentReference);
    await commitAndResetBatch();
    return { success: true };
  } catch (error: unknown) {
    const code = typeof error === 'object' && error !== null && 'code' in error
      ? String((error as { code?: string }).code)
      : '';
    if (code === 'permission-denied') return { success: false, error: 'permission-denied' };
    const message = typeof error === 'object' && error !== null && 'message' in error
      ? String((error as { message?: string }).message)
      : 'unknown';
    return { success: false, error: message };
  }
};
