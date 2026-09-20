# Security Specification: Role-Based Access Control (RBAC) & Editorial Integrity

## 1. System Overview & Core Philosophy
The Oligarchy is an independent investigative research publication and scholarly portal. The platform requires a Zero-Trust Attribute-Based and Role-Based Access Control (ABAC/RBAC) architecture.
- **Sole Designated Owner / Super Admin**: `theoligarchy.ppj@gmail.com` (Priyasha Priyal Jena). Holds non-revocable root authority across publications, site configuration, invitations, audit logs, and member management.
- **Managing Editor (`admin`)**: Can curate articles, manage authors, review submissions, and manage draft notes.
- **Peer Reviewer (`reviewer`)**: Specialized scholarly review access. Can view the review queue, read assigned manuscripts, submit peer annotations / reviews, and resolve draft margin notes. Cannot publish articles, feature posts, access subscriber emails, or modify global settings.
- **Author / Contributor (`author`)**: Restricted scholar persona. Can compose and edit **only their own** manuscripts (`status == 'draft'`), save personal drafts, submit their manuscripts for review (`status == 'draft'` -> `status == 'draft'` with workflow notes or submissions collection), and view personal analytics. Cannot modify published articles, view other authors' unpublished drafts, modify site settings, access subscriber lists, or delete published content.
- **Guest Reviewer (`guest_reviewer`)**: Temporary external reviewer authenticated via a secure cryptographic invite token for a designated article. Restricted strictly to viewing that article and submitting structured peer review reports.
- **Public Reader**: Anonymous or unauthenticated. Can read published articles (`status == 'published'`), public author profiles, submit tips, submit pitches to `/submissions`, record zero-PII reading telemetry, and subscribe to newsletters.

---

## 2. Invariants & Security Pillars

1. **Owner Invariant**: Only `theoligarchy.ppj@gmail.com` can create/delete/modify user roles in `/editorial_team/{memberId}` to grant or revoke `admin` status. No user can escalate their own role.
2. **Editorial Draft Isolation**: An author can only read, create, update, or delete an article draft if `request.auth.uid == article.createdByUid` or `request.auth.token.email == article.createdByEmail`. Authors cannot touch `status == 'published'`.
3. **Publish Gate**: Transitioning an article to `status: 'published'`, or updating fields of a published article (content, title, slug, isFeatured, featuredOrder), is strictly reserved for `isOwner()` or `isManagingEditor()`.
4. **Subscriber & PII Isolation**: Document reads on `/subscribers/{subId}` and `/tips/{tipId}` are strictly forbidden to public and author roles; only verified admins/managing editors may read.
5. **Invitation Token Invariants**: Guest reviewer tokens in `/invitations/{inviteId}` are protected. Public or external guests can only validate their specific token if not revoked and not expired. Creation and revocation are restricted to admins.
6. **Immutable Fields**: `createdAt`, `id`, and `createdByUid` are immutable once written.
7. **Audit Log Non-Repudiation**: Audit logs in `/audit_logs/{logId}` can only be appended (`create`) by authenticated editorial staff during actions; records can never be updated or deleted by anyone.

---

## 3. The "Dirty Dozen" Threat Payloads (Adversarial Security Test Vectors)

The following 12 attack vectors represent malicious attempts to bypass identity, integrity, and state machines:

1. **Payload 1 (Privilege Escalation via Self-Registration)**:
   - Attack: An author attempts to write to `/editorial_team/{theirUid}` setting `"role": "admin"`.
   - Expected: `PERMISSION_DENIED`
2. **Payload 2 (Ghost Field Injection / Shadow Update)**:
   - Attack: An author updates their own draft adding `"isFeatured": true`, `"status": "published"`, or an arbitrary administrative field.
   - Expected: `PERMISSION_DENIED` (strictly caught by `hasOnly` and status checks).
3. **Payload 3 (Orphaned Draft Overwrite / Cross-Author Hijack)**:
   - Attack: Author A attempts to update or delete an article owned by Author B (`article.createdByUid != request.auth.uid`).
   - Expected: `PERMISSION_DENIED`
4. **Payload 4 (Unverified Admin Email Spoofing)**:
   - Attack: Attacker creates a Firebase Auth account with email `theoligarchy.ppj@gmail.com` on an insecure provider without email verification (`email_verified == false`).
   - Expected: `PERMISSION_DENIED` (rule checks `request.auth.token.email_verified == true`).
5. **Payload 5 (Direct Publish Bypass)**:
   - Attack: Author creates an article directly with `"status": "published"`.
   - Expected: `PERMISSION_DENIED` (authors may only create `"status": "draft"`).
6. **Payload 6 (PII Harvesting on Subscribers)**:
   - Attack: Author or Peer Reviewer attempts `get` or `list` on `/subscribers`.
   - Expected: `PERMISSION_DENIED`
7. **Payload 7 (Confidential Tip Inspection)**:
   - Attack: Unauthenticated user or Author attempts `list` on `/tips`.
   - Expected: `PERMISSION_DENIED`
8. **Payload 8 (Guest Reviewer Token Tampering)**:
   - Attack: Guest reviewer attempts to update their own invitation document in `/invitations/{token}` to extend expiration time or change article assignment.
   - Expected: `PERMISSION_DENIED`
9. **Payload 9 (Audit Log Deletion / Evidence Tampering)**:
   - Attack: A compromised editor attempts to delete an entry in `/audit_logs/{logId}`.
   - Expected: `PERMISSION_DENIED`
10. **Payload 10 (Denial of Wallet String Injection)**:
    - Attack: Malicious user attempts to write a 2MB payload into an annotation or draft note comment.
    - Expected: `PERMISSION_DENIED` (string sizes strictly enforced `<= 10000`).
11. **Payload 11 (Terminal State / Immutable Timestamp Mutation)**:
    - Attack: Editor tries to alter the `createdAt` timestamp of a historical 2024 investigation.
    - Expected: `PERMISSION_DENIED` (`incoming().createdAt == existing().createdAt`).
12. **Payload 12 (Settings Defacement by Non-Admin)**:
    - Attack: Peer reviewer or author attempts `update` on `/settings/site_settings` to alter the masthead or social links.
    - Expected: `PERMISSION_DENIED`

---

## 4. Entity Collections Matrix

| Collection | Create | Read | Update | Delete |
| :--- | :--- | :--- | :--- | :--- |
| `/articles/{id}` | Author (draft only) / Admin | Public (`published`) / Author (own) / Admin | Author (own draft only) / Admin | Author (own draft only) / Admin |
| `/editorial_team/{uid}` | Owner / Admin | Authenticated Editorial Team / Public Masthead | Owner (`role` changes) / Admin | Owner only |
| `/invitations/{id}` | Admin | Token holder / Admin | Admin | Admin |
| `/audit_logs/{id}` | Authenticated Staff | Admin | False (Immutable) | False (Immutable) |
| `/subscribers/{id}` | Public | Admin | Admin | Admin |
| `/tips/{id}` | Public | Admin | Admin | Admin |
| `/draft_notes/{id}` | Editorial Staff | Editorial Staff | Author of note / Admin | Author of note / Admin |
| `/submissions/{id}` | Public / Author | Admin / Reviewer / Author (own) | Admin / Reviewer | Admin |
| `/settings/{id}` | Admin | Public | Admin | Admin |
| `/contributors/{id}`| Admin | Public | Admin | Admin |
