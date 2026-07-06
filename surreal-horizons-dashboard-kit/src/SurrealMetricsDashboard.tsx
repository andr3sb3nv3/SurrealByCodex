import React, { useMemo, useState } from 'react';
import { User } from 'firebase/auth';
import { CalendarClock, UserRound } from 'lucide-react';
import ClinicalDashboard from './views/ClinicalDashboard';
import { Language, Theme } from './types';

export interface SurrealClientProfile {
  uid: string;
  displayName: string;
  email?: string | null;
  photoURL?: string | null;
}

export interface SurrealSnapshot {
  id: string;
  label: string;
  description?: string;
}

export interface SurrealMetricsDashboardProps {
  authUser: User | null;
  profiles?: SurrealClientProfile[];
  snapshots?: SurrealSnapshot[];
  initialProfileUid?: string;
  initialSnapshotId?: string;
  language?: Language;
  theme?: Theme;
  isPro?: boolean;
  readOnly?: boolean;
  onBack?: () => void;
  onAuthRequest?: () => void;
  onLogout?: () => void;
  onProfileChange?: (profile: SurrealClientProfile) => void;
  onSnapshotChange?: (snapshot: SurrealSnapshot) => void;
}

const toUserLike = (profile: SurrealClientProfile): User => ({
  uid: profile.uid,
  displayName: profile.displayName,
  email: profile.email ?? null,
  photoURL: profile.photoURL ?? null,
  isAnonymous: false,
  emailVerified: true,
  providerData: [],
  metadata: {},
  phoneNumber: null,
  tenantId: null,
  delete: async () => {},
  getIdToken: async () => '',
  getIdTokenResult: async () => ({
    authTime: '',
    expirationTime: '',
    issuedAtTime: '',
    signInProvider: null,
    signInSecondFactor: null,
    token: '',
    claims: {},
  }),
  reload: async () => {},
  toJSON: () => profile,
} as unknown as User);

const DEFAULT_SNAPSHOTS: SurrealSnapshot[] = [
  { id: 'current', label: 'Actual', description: 'Lectura viva de Firestore' },
];

const SurrealMetricsDashboard: React.FC<SurrealMetricsDashboardProps> = ({
  authUser,
  profiles,
  snapshots = DEFAULT_SNAPSHOTS,
  initialProfileUid,
  initialSnapshotId,
  language = 'es',
  theme = 'system',
  isPro = true,
  readOnly = false,
  onBack,
  onAuthRequest,
  onLogout,
  onProfileChange,
  onSnapshotChange,
}) => {
  const profileOptions = useMemo<SurrealClientProfile[]>(() => {
    if (profiles && profiles.length > 0) return profiles;
    if (!authUser) return [];
    return [{
      uid: authUser.uid,
      displayName: authUser.displayName || authUser.email || 'Usuario',
      email: authUser.email,
      photoURL: authUser.photoURL,
    }];
  }, [authUser, profiles]);

  const [selectedProfileUid, setSelectedProfileUid] = useState(
    initialProfileUid ?? profileOptions[0]?.uid ?? ''
  );
  const [selectedSnapshotId, setSelectedSnapshotId] = useState(
    initialSnapshotId ?? snapshots[0]?.id ?? 'current'
  );

  const selectedProfile = profileOptions.find(profile => profile.uid === selectedProfileUid) ?? profileOptions[0] ?? null;
  const selectedSnapshot = snapshots.find(snapshot => snapshot.id === selectedSnapshotId) ?? snapshots[0] ?? null;
  const user = selectedProfile ? toUserLike(selectedProfile) : null;

  const setTheme = (nextTheme: Theme) => {
    const root = window.document.documentElement;
    root.classList.toggle('dark', nextTheme === 'dark');
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      {(profileOptions.length > 1 || snapshots.length > 1) && (
        <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
          <div className="max-w-7xl mx-auto px-4 py-3 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-end">
            {profileOptions.length > 1 && (
              <label className="flex items-center gap-2 text-xs font-bold text-slate-500 dark:text-slate-400">
                <UserRound size={16} />
                <select
                  value={selectedProfile?.uid ?? ''}
                  onChange={(event) => {
                    setSelectedProfileUid(event.target.value);
                    const next = profileOptions.find(profile => profile.uid === event.target.value);
                    if (next) onProfileChange?.(next);
                  }}
                  className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-slate-100"
                >
                  {profileOptions.map(profile => (
                    <option key={profile.uid} value={profile.uid}>{profile.displayName}</option>
                  ))}
                </select>
              </label>
            )}
            {snapshots.length > 1 && (
              <label className="flex items-center gap-2 text-xs font-bold text-slate-500 dark:text-slate-400">
                <CalendarClock size={16} />
                <select
                  value={selectedSnapshot?.id ?? ''}
                  onChange={(event) => {
                    setSelectedSnapshotId(event.target.value);
                    const next = snapshots.find(snapshot => snapshot.id === event.target.value);
                    if (next) onSnapshotChange?.(next);
                  }}
                  className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-slate-100"
                >
                  {snapshots.map(snapshot => (
                    <option key={snapshot.id} value={snapshot.id}>{snapshot.label}</option>
                  ))}
                </select>
              </label>
            )}
          </div>
        </div>
      )}

      <ClinicalDashboard
        user={user}
        authUser={authUser}
        onBack={onBack ?? (() => window.history.back())}
        onAuthRequest={onAuthRequest ?? (() => {})}
        onNavigateToProfile={() => {}}
        language={language}
        onToggleLanguage={() => {}}
        theme={theme}
        onSetTheme={setTheme}
        isPro={isPro}
        onTogglePro={() => {}}
        onLogout={onLogout ?? (() => {})}
        readOnly={readOnly}
        viewingFriendName={readOnly ? selectedProfile?.displayName : undefined}
      />
    </div>
  );
};

export default SurrealMetricsDashboard;
