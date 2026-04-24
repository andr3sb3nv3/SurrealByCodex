export const DEMO_UIDS = [
  'JDzx9vojl2dlKs5sg0gInEhRiHF3',
  'InconsistentStreak2025',
  'DemoMetricas1111111111',
  'DemoMetricas2222222222',
] as const;

const demoUidRuleLines = DEMO_UIDS.map(uid => `         userId == '${uid}' ||`).join('\n');

export const FIRESTORE_RULES = `rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // =========================================================
    // 1. REGLA MAESTRA DE USUARIOS
    // =========================================================
    // ESCRITURA: sólo el dueño (o un demo user seed).
    match /users/{userId}/{document=**} {
      allow write: if request.auth != null && (
${demoUidRuleLines}
         request.auth.uid == userId
      );

      // LECTURA: el dueño, un demo user, o alguien a quien el dueño
      // le compartió el perfil. El "share" se materializa como un doc
      // users/{viewerUid}/incoming_connections/{ownerUid}, que el dueño
      // crea cuando usa "Compartir perfil" en la app.
      allow read: if request.auth != null && (
${demoUidRuleLines}
         request.auth.uid == userId ||
         exists(/databases/$(database)/documents/users/$(request.auth.uid)/incoming_connections/$(userId))
      );
    }

    // =========================================================
    // 2. CONEXIONES COMPARTIDAS
    // =========================================================
    match /users/{userId}/incoming_connections/{senderId} {
      allow read, write: if request.auth != null;
    }

    // =========================================================
    // 3. DIRECTORIO PÚBLICO
    // =========================================================
    match /public_emails/{email} {
      allow read, write: if request.auth != null;
    }

    // =========================================================
    // 4. INVITACIONES PENDIENTES
    // =========================================================
    match /pending_invites/{inviteId} {
      allow read, write: if request.auth != null;
    }
  }
}`;
