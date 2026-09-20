import { db } from '../firebase';
import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where 
} from 'firebase/firestore';
import { ReviewInvitation, AuditLog, EditorialUser, EditorialRole, UserAccountInvitation, Permission } from '../types';
import { sanitizeFirestoreData } from '../utils/firestoreSanitizer';

const INVITATIONS_COLLECTION = 'invitations';
const USER_INVITATIONS_COLLECTION = 'user_invitations';
const AUDIT_LOGS_COLLECTION = 'audit_logs';
const LOCAL_STORAGE_INVITES_KEY = 'tol_invitations_cache';
const LOCAL_STORAGE_USER_INVITES_KEY = 'tol_user_invitations_cache';
const LOCAL_STORAGE_AUDIT_KEY = 'tol_audit_logs_cache';

/**
 * Generate a cryptographically strong random token
 */
function generateSecureToken(length: number = 32): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
  const array = new Uint8Array(length);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(array);
    return Array.from(array, byte => chars[byte % chars.length]).join('');
  }
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

/**
 * Fetch all invitations (Admin / Managing Editor only)
 */
export async function fetchInvitations(): Promise<ReviewInvitation[]> {
  try {
    const colRef = collection(db, INVITATIONS_COLLECTION);
    const snap = await getDocs(colRef);
    if (!snap.empty) {
      const list = snap.docs.map(d => ({ ...d.data(), id: d.id } as ReviewInvitation));
      // Sort newest first
      list.sort((a, b) => b.createdAt - a.createdAt);
      localStorage.setItem(LOCAL_STORAGE_INVITES_KEY, JSON.stringify(list));
      return list;
    }
  } catch (err) {
    console.warn('Could not fetch invitations from Firestore, reading local cache:', err);
  }

  try {
    const cached = localStorage.getItem(LOCAL_STORAGE_INVITES_KEY);
    return cached ? JSON.parse(cached) : [];
  } catch {
    return [];
  }
}

/**
 * Create and issue a new peer review or guest reviewer invitation
 */
export async function createInvitation(params: {
  articleId: string;
  articleTitle: string;
  recipientEmail: string;
  recipientName: string;
  role: 'reviewer' | 'guest_reviewer';
  durationDays: number;
  actor: EditorialUser;
}): Promise<ReviewInvitation> {
  const token = generateSecureToken(36);
  const id = `inv_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 7)}`;
  const now = Date.now();
  const expiresAt = now + (params.durationDays * 24 * 60 * 60 * 1000);

  const invitation: ReviewInvitation = {
    id,
    articleId: params.articleId,
    articleTitle: params.articleTitle,
    recipientEmail: params.recipientEmail.trim().toLowerCase(),
    recipientName: params.recipientName.trim(),
    role: params.role,
    token,
    status: 'pending',
    expiresAt,
    createdAt: now,
    createdBy: params.actor.email
  };

  try {
    const docRef = doc(db, INVITATIONS_COLLECTION, id);
    await setDoc(docRef, sanitizeFirestoreData(invitation));
  } catch (err) {
    console.warn('Writing invitation to Firestore failed, saving locally:', err);
  }

  // Update local cache
  try {
    const cached = await fetchInvitations();
    const updated = [invitation, ...cached.filter(i => i.id !== id)];
    localStorage.setItem(LOCAL_STORAGE_INVITES_KEY, JSON.stringify(updated));
  } catch {}

  // Record audit log
  await recordAuditLog({
    action: 'create_invitation',
    actor: params.actor,
    targetCollection: INVITATIONS_COLLECTION,
    targetId: id,
    details: `Issued ${params.role} invitation to ${params.recipientEmail} for article "${params.articleTitle}" (expires in ${params.durationDays}d)`
  });

  return invitation;
}

/**
 * Revoke an active invitation
 */
export async function revokeInvitation(inviteId: string, actor: EditorialUser): Promise<void> {
  try {
    const docRef = doc(db, INVITATIONS_COLLECTION, inviteId);
    await updateDoc(docRef, { status: 'revoked' });
  } catch (err) {
    console.warn('Failed to update revocation in Firestore, modifying local cache:', err);
  }

  try {
    const cached = await fetchInvitations();
    const updated = cached.map(i => i.id === inviteId ? { ...i, status: 'revoked' as const } : i);
    localStorage.setItem(LOCAL_STORAGE_INVITES_KEY, JSON.stringify(updated));
  } catch {}

  await recordAuditLog({
    action: 'revoke_invitation',
    actor,
    targetCollection: INVITATIONS_COLLECTION,
    targetId: inviteId,
    details: `Revoked review invitation ID: ${inviteId}`
  });
}

/**
 * Validate an invitation token for a guest reviewer
 */
export async function validateInvitationToken(token: string): Promise<ReviewInvitation | null> {
  if (!token) return null;
  try {
    const q = query(collection(db, INVITATIONS_COLLECTION), where('token', '==', token));
    const snap = await getDocs(q);
    if (!snap.empty) {
      const invite = { ...snap.docs[0].data(), id: snap.docs[0].id } as ReviewInvitation;
      if (invite.status === 'revoked') return null;
      if (Date.now() > invite.expiresAt) {
        return { ...invite, status: 'expired' };
      }
      return invite;
    }
  } catch (e) {
    console.warn('Error querying invitation token from Firestore:', e);
  }

  // Fallback cache check
  try {
    const cached: ReviewInvitation[] = JSON.parse(localStorage.getItem(LOCAL_STORAGE_INVITES_KEY) || '[]');
    const found = cached.find(i => i.token === token);
    if (found) {
      if (found.status === 'revoked') return null;
      if (Date.now() > found.expiresAt) return { ...found, status: 'expired' };
      return found;
    }
  } catch {}

  return null;
}

/**
 * Record an append-only, non-repudiable audit log entry
 */
export async function recordAuditLog(params: {
  action: string;
  actor: EditorialUser;
  targetCollection: string;
  targetId: string;
  details: string;
}): Promise<AuditLog> {
  const logId = `audit_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const entry: AuditLog = {
    id: logId,
    action: params.action,
    actorUid: params.actor.uid,
    actorEmail: params.actor.email,
    actorRole: params.actor.role,
    targetCollection: params.targetCollection,
    targetId: params.targetId,
    details: params.details,
    timestamp: Date.now()
  };

  try {
    const docRef = doc(db, AUDIT_LOGS_COLLECTION, logId);
    await setDoc(docRef, sanitizeFirestoreData(entry));
  } catch (err) {
    console.warn('Writing audit log to Firestore skipped or failed:', err);
  }

  try {
    const existing = JSON.parse(localStorage.getItem(LOCAL_STORAGE_AUDIT_KEY) || '[]');
    existing.unshift(entry);
    localStorage.setItem(LOCAL_STORAGE_AUDIT_KEY, JSON.stringify(existing.slice(0, 200)));
  } catch {}

  return entry;
}

/**
 * Fetch recent audit logs (Admin only)
 */
export async function fetchAuditLogs(): Promise<AuditLog[]> {
  try {
    const colRef = collection(db, AUDIT_LOGS_COLLECTION);
    const snap = await getDocs(colRef);
    if (!snap.empty) {
      const list = snap.docs.map(d => ({ ...d.data(), id: d.id } as AuditLog));
      list.sort((a, b) => b.timestamp - a.timestamp);
      localStorage.setItem(LOCAL_STORAGE_AUDIT_KEY, JSON.stringify(list));
      return list;
    }
  } catch (err) {
    console.warn('Fetching audit logs from Firestore skipped:', err);
  }

  try {
    const cached = localStorage.getItem(LOCAL_STORAGE_AUDIT_KEY);
    return cached ? JSON.parse(cached) : [];
  } catch {
    return [];
  }
}

// ══════════════════════════════════════════════════════════════
// USER ACCOUNT INVITATIONS & SECURE ONBOARDING
// ══════════════════════════════════════════════════════════════

/**
 * Fetch all user account invitations (Owner only)
 */
export async function fetchUserAccountInvitations(): Promise<UserAccountInvitation[]> {
  try {
    const colRef = collection(db, USER_INVITATIONS_COLLECTION);
    const snap = await getDocs(colRef);
    if (!snap.empty) {
      const list = snap.docs.map(d => ({ ...d.data(), id: d.id } as UserAccountInvitation));
      list.sort((a, b) => b.createdAt - a.createdAt);
      localStorage.setItem(LOCAL_STORAGE_USER_INVITES_KEY, JSON.stringify(list));
      return list;
    }
  } catch (err) {
    console.warn('Could not fetch user invitations from Firestore, reading local cache:', err);
  }

  try {
    const cached = localStorage.getItem(LOCAL_STORAGE_USER_INVITES_KEY);
    return cached ? JSON.parse(cached) : [];
  } catch {
    return [];
  }
}

/**
 * Create a new user account invitation issued by the Owner
 */
export async function createUserAccountInvitation(params: {
  email: string;
  displayName: string;
  role: EditorialRole;
  assignedArticleIds?: string[];
  permissionOverrides?: Partial<Record<Permission, boolean>>;
  durationDays?: number;
  actor: EditorialUser;
}): Promise<UserAccountInvitation> {
  const token = generateSecureToken(40);
  const id = `uinv_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 7)}`;
  const now = Date.now();
  const duration = params.durationDays || 14; // default 14 days
  const expiresAt = now + (duration * 24 * 60 * 60 * 1000);

  const invitation: UserAccountInvitation = {
    id,
    email: params.email.trim().toLowerCase(),
    displayName: params.displayName.trim(),
    role: params.role,
    assignedArticleIds: params.assignedArticleIds || [],
    permissionOverrides: params.permissionOverrides || {},
    token,
    status: 'pending',
    expiresAt,
    createdAt: now,
    createdBy: params.actor.email
  };

  try {
    const docRef = doc(db, USER_INVITATIONS_COLLECTION, id);
    await setDoc(docRef, sanitizeFirestoreData(invitation));
  } catch (err) {
    console.warn('Writing user invitation to Firestore failed, saving locally:', err);
  }

  // Pre-seed or stage editorial team registry entry with 'invited' status
  try {
    const stagingUid = `invited_${params.email.trim().toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
    const stagingMember: EditorialUser = {
      uid: stagingUid,
      email: params.email.trim().toLowerCase(),
      displayName: params.displayName.trim(),
      role: params.role,
      status: 'invited',
      assignedArticleIds: params.assignedArticleIds || [],
      permissionOverrides: params.permissionOverrides || {},
      createdAt: now,
      invitedBy: params.actor.email,
      invitationToken: token
    };
    await setDoc(doc(db, 'editorial_team', stagingUid), sanitizeFirestoreData(stagingMember), { merge: true });
  } catch (err) {
    console.warn('Pre-staging editorial member skipped:', err);
  }

  // Update local cache
  try {
    const cached = await fetchUserAccountInvitations();
    const updated = [invitation, ...cached.filter(i => i.id !== id)];
    localStorage.setItem(LOCAL_STORAGE_USER_INVITES_KEY, JSON.stringify(updated));
  } catch {}

  // Record non-repudiable audit log
  await recordAuditLog({
    action: 'INVITE_USER',
    actor: params.actor,
    targetCollection: USER_INVITATIONS_COLLECTION,
    targetId: id,
    details: `Issued ${params.role.toUpperCase()} account invitation to ${params.email} (${params.displayName}) with token validity ${duration}d.`
  });

  return invitation;
}

/**
 * Revoke an active user account invitation
 */
export async function revokeUserAccountInvitation(inviteId: string, actor: EditorialUser): Promise<void> {
  try {
    const docRef = doc(db, USER_INVITATIONS_COLLECTION, inviteId);
    await updateDoc(docRef, { status: 'revoked' });
  } catch (err) {
    console.warn('Failed to revoke user invitation in Firestore:', err);
  }

  try {
    const cached = await fetchUserAccountInvitations();
    const target = cached.find(i => i.id === inviteId);
    if (target) {
      // Also mark staged member as revoked
      const stagingUid = `invited_${target.email.replace(/[^a-z0-9]/g, '_')}`;
      try {
        await updateDoc(doc(db, 'editorial_team', stagingUid), { status: 'revoked' });
      } catch {}
    }
    const updated = cached.map(i => i.id === inviteId ? { ...i, status: 'revoked' as const } : i);
    localStorage.setItem(LOCAL_STORAGE_USER_INVITES_KEY, JSON.stringify(updated));
  } catch {}

  await recordAuditLog({
    action: 'REVOKE_USER_INVITATION',
    actor,
    targetCollection: USER_INVITATIONS_COLLECTION,
    targetId: inviteId,
    details: `Revoked user onboarding invitation ID: ${inviteId}`
  });
}

/**
 * Validate a user account setup token
 */
export async function validateUserInvitationToken(token: string): Promise<UserAccountInvitation | null> {
  if (!token) return null;
  const cleanToken = token.trim();

  try {
    const q = query(collection(db, USER_INVITATIONS_COLLECTION), where('token', '==', cleanToken));
    const snap = await getDocs(q);
    if (!snap.empty) {
      const invite = { ...snap.docs[0].data(), id: snap.docs[0].id } as UserAccountInvitation;
      if (invite.status === 'revoked') return null;
      if (Date.now() > invite.expiresAt) {
        return { ...invite, status: 'expired' };
      }
      return invite;
    }
  } catch (e) {
    console.warn('Error querying user invitation token from Firestore:', e);
  }

  // Check local cache fallback
  try {
    const cached: UserAccountInvitation[] = JSON.parse(localStorage.getItem(LOCAL_STORAGE_USER_INVITES_KEY) || '[]');
    const found = cached.find(i => i.token === cleanToken);
    if (found) {
      if (found.status === 'revoked') return null;
      if (Date.now() > found.expiresAt) return { ...found, status: 'expired' };
      return found;
    }
  } catch {}

  return null;
}

/**
 * Complete user account onboarding and activate member
 */
export async function completeUserAccountSetup(params: {
  token: string;
  uid: string;
  displayName: string;
  email: string;
}): Promise<EditorialUser> {
  const invitation = await validateUserInvitationToken(params.token);
  if (!invitation || invitation.status !== 'pending') {
    throw new Error('Invitation is no longer valid, expired, or already accepted.');
  }

  const now = Date.now();

  // 1. Mark invitation as accepted
  try {
    const inviteRef = doc(db, USER_INVITATIONS_COLLECTION, invitation.id);
    await updateDoc(inviteRef, {
      status: 'accepted',
      acceptedAt: now
    });
  } catch (e) {
    console.warn('Failed to update invitation status:', e);
  }

  // 2. Register/activate editorial user in Firestore under their real Auth UID
  const activeUser: EditorialUser = {
    uid: params.uid,
    email: params.email.trim().toLowerCase(),
    displayName: params.displayName.trim() || invitation.displayName,
    role: invitation.role,
    status: 'active',
    assignedArticleIds: invitation.assignedArticleIds || [],
    permissionOverrides: invitation.permissionOverrides || {},
    createdAt: now,
    lastLoginAt: now,
    invitedBy: invitation.createdBy,
    invitationToken: params.token
  };

  try {
    const userRef = doc(db, 'editorial_team', params.uid);
    await setDoc(userRef, sanitizeFirestoreData(activeUser), { merge: true });

    // Clean up temporary staged record if present
    const stagingUid = `invited_${invitation.email.replace(/[^a-z0-9]/g, '_')}`;
    if (stagingUid !== params.uid) {
      try {
        await deleteDoc(doc(db, 'editorial_team', stagingUid));
      } catch {}
    }
  } catch (e) {
    console.error('Failed to activate user in editorial_team registry:', e);
  }

  // 3. Record audit log
  await recordAuditLog({
    action: 'USER_ACCOUNT_ACTIVATED',
    actor: activeUser,
    targetCollection: 'editorial_team',
    targetId: params.uid,
    details: `User ${params.email} created their account and initialized credentials as ${invitation.role.toUpperCase()}.`
  });

  return activeUser;
}

