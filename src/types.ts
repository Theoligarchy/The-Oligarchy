export interface Source {
  category: 'academic' | 'government' | 'book' | 'court' | 'database' | 'investigative' | 'other';
  title: string;
  url?: string;
  citation?: string;
}

export interface CoAuthor {
  name: string;
  role?: string; // e.g. "Co-Author", "Lead Data Analyst", "Methodology Reviewer", "Field Researcher", "Forensic Consultant"
  institution?: string; // e.g. "Department of Criminology"
  orcid?: string; // e.g. "0000-0000-0000-0000"
  email?: string;
  bio?: string;
  avatarUrl?: string;
  profileUrl?: string;
}

export interface ArticleVersion {
  id: string;
  timestamp: number;
  title: string;
  excerpt: string;
  content: string;
  updatedBy: string;
}

export interface Article {
  id: string;
  title: string;
  subtitle?: string;
  slug: string;
  category: 'criminology' | 'psyche' | 'politics';
  tags: string[];
  featuredImage?: string;
  canvaEmbed?: string; // HTML iframe or Link
  pdfLink?: string; // Research report PDF download link
  authorId: string;
  authorName: string;
  authorTitle?: string;
  authorInstitution?: string;
  authorOrcid?: string; // e.g. "0000-0000-0000-0000"
  coAuthors?: CoAuthor[]; // Multi-author attribution for investigative series
  doi?: string; // e.g. "10.5281/zenodo.10892341"
  archivalRefId?: string; // e.g. "TOL-2026-PSY-001"
  readTime: string; // Calculated read time e.g. "12 min read"
  excerpt: string;
  content: string; // HTML content from Quill
  status: 'draft' | 'published' | 'scheduled' | 'archived';
  originalPublishedAt?: string; // Immutable historical first publication date (e.g. "6 July 2026"). Never altered by edits or status toggles.
  publishDate?: string; // Historical date string kept in sync with originalPublishedAt for backwards compatibility
  scheduledAt?: number; // timestamp for scheduling
  createdAt: number;
  updatedAt: number;
  views: number;
  isFeatured: boolean;
  featuredOrder?: number; // Order index for the 3-card horizontal featured layout (1 | 2 | 3)
  isPinned: boolean;
  sources: Source[];
  relatedArticles?: string[]; // IDs of related articles
  seriesName?: string; // Series grouping name
  seriesPart?: number; // Part index
  versions?: ArticleVersion[]; // History of edits
  createdByUid?: string; // UID of the author/editor who created this manuscript
  createdByEmail?: string; // Email of the creator for ownership checks
  assignedReviewerUids?: string[]; // Reviewers assigned to evaluate this manuscript
  assignedReviewerEmails?: string[]; // Emails of assigned peer reviewers
  seoTitle?: string;
  seoDescription?: string;
  metaTitle?: string;
  metaDescription?: string;
  canonicalUrl?: string;
}

export type EditorialRole = 'owner' | 'admin' | 'author' | 'reviewer' | 'guest_reviewer';

export type Permission =
  | 'article:create'
  | 'article:read_all'
  | 'article:read_own'
  | 'article:read_assigned'
  | 'article:edit_all'
  | 'article:edit_own_draft'
  | 'article:edit_assigned'
  | 'article:suggest_edits'
  | 'article:submit_for_review'
  | 'article:review'
  | 'article:leave_comments'
  | 'article:request_revisions'
  | 'article:approve'
  | 'article:publish'
  | 'article:schedule'
  | 'article:delete'
  | 'featured:manage'
  | 'author:manage_all'
  | 'author:manage_own'
  | 'analytics:view'
  | 'analytics:view_own'
  | 'user:invite'
  | 'user:manage'
  | 'role:assign'
  | 'settings:manage'
  | 'deployment:view'
  | 'security:manage';

export interface EditorialUser {
  uid: string;
  email: string;
  displayName: string;
  role: EditorialRole;
  authorId?: string; // Links to AuthorProfile (e.g. 'priyasha-priyal-jena')
  institution?: string;
  orcid?: string; // e.g. "0000-0000-0000-0000"
  credentials?: string;
  bio?: string;
  assignedCategories?: ('criminology' | 'psyche' | 'politics')[];
  assignedArticleIds?: string[]; // Specific articles assigned to this reviewer/author
  permissionOverrides?: Partial<Record<Permission, boolean>>; // Individual permission overrides set by Owner
  createdAt?: number;
  lastLoginAt?: number;
  status?: 'invited' | 'active' | 'suspended' | 'revoked';
  invitedBy?: string;
  invitationToken?: string;
}

export interface UserAccountInvitation {
  id: string;
  email: string;
  displayName: string;
  role: EditorialRole;
  assignedArticleIds?: string[];
  permissionOverrides?: Partial<Record<Permission, boolean>>;
  token: string;
  status: 'pending' | 'accepted' | 'expired' | 'revoked';
  expiresAt: number;
  createdAt: number;
  createdBy: string;
  acceptedAt?: number;
}

export interface MediaFile {
  id: string;
  name: string;
  url: string;
  size: number;
  type: string;
  uploadedAt: number;
  altText?: string;
  caption?: string;
}

export interface ReadingItem {
  id: string;
  title: string;
  author: string;
  link?: string;
  addedAt: number;
}

export interface NewsletterSubscriber {
  email: string;
  subscribedAt: number;
}

export interface ResearchTip {
  id: string;
  subject: string;
  message: string;
  contact?: string;
  submittedAt: number;
  isRead: boolean;
}

export interface AuthorProfile {
  id: string;
  name: string;
  slug?: string;
  role: string;
  bio: string;
  avatarUrl?: string;
  profileImage?: string; // interchangeable with avatarUrl
  institution?: string;
  credentials?: string;
  orcid?: string; // e.g. "0000-0000-0000-0000"
  researchAreas?: string[]; // e.g. ["Pathological Fantasy", "State Bureaucracy", "Forensic Profiling"]
  specializations?: string[]; // alias / compatibility with researchAreas
  affiliations?: string[]; // e.g. ["The Oligarchy Research Group", "Centre for Constitutional Studies"]
  email?: string;
  tags?: string[];
  socials: {
    instagram?: string;
    twitter?: string;
    linkedin?: string;
    website?: string;
    googleScholar?: string;
    researchGate?: string;
    ssrn?: string;
    email?: string;
  };
  isVisible?: boolean; // Controls public visibility (default true)
  displayOrder?: number; // Sorting index in public registry
  isFounder?: boolean;
  joinedDate?: string;
  createdAt?: number;
  updatedAt?: number;
  featuredArticleIds?: string[];
}

export interface SystemSettings {
  passwordHash: string; // or encrypted password overlay
  siteTitle: string;
  siteHeadline: string;
  siteSubheading: string;
}

export interface SiteSettings {
  siteName: string;
  tagline: string;
  subheading: string;
  missionStatement: string;
  foundingYear: string;
  issnNumber?: string;
  
  // Announcement banner
  announcementActive: boolean;
  announcementText: string;
  announcementLink?: string;
  
  // Hero section
  heroFeaturedArticleId?: string; // If set, manually forces this article as hero
  heroSubtitleOverride?: string;
  heroExcerptOverride?: string;
  
  // Category configuration
  criminologyHeading: string;
  criminologyDescription: string;
  psycheHeading: string;
  psycheDescription: string;
  politicsHeading: string;
  politicsDescription: string;
  
  // About / Philosophy / Manifesto
  aboutTitle: string;
  aboutContent: string;
  editorialPrinciples: string;
  peerReviewPolicy: string;
  
  // Social links & Contact
  socials: {
    instagram: string;
    twitter: string;
    linkedinPersonal: string;
    linkedinCompany: string;
    substack?: string;
    email: string;
  };
  
  // Footer & Legal
  footerDescription: string;
  copyrightText: string;
  disclaimerText: string;
  
  // SEO defaults
  defaultSeoTitle: string;
  defaultSeoDescription: string;
  defaultOgImage?: string;
  
  updatedAt?: number;
}

export type ReaderClassification = 'bouncer_skimmer' | 'engaged_browser' | 'deep_reader';

export type SignupLocation = 'in-article' | 'homepage' | 'footer' | 'drawer' | 'modal' | 'unknown';
export type SubscriptionStatus = 'submitted' | 'confirmed' | 'failed';

export interface ConversionEvent {
  id?: string;
  eventType: 'newsletter_signup';
  visitorId: string;
  sessionId: string;
  firstTouchArticleId: string | null;
  firstTouchArticleTitle: string | null;
  lastTouchArticleId: string | null;
  lastTouchArticleTitle: string | null;
  conversionArticleId: string | null;
  conversionArticleTitle: string | null;
  signupLocation: SignupLocation;
  referrer: string;
  timestamp: number;
  attributionWindowDays: number; // default: 7 days
  subscriptionStatus: SubscriptionStatus;
}

export interface ArticleAttributionBreakdown {
  articleId: string;
  articleTitle: string;
  category: string;
  firstTouchCount: number;
  lastTouchCount: number;
  directConversionCount: number;
  totalTouchpoints: number;
  totalViews: number;
  totalDeepReads: number;
  conversionRatePerThousandViews: number;
  conversionRatePerThousandReads: number;
}

export interface ViewLog {
  id?: string;
  articleId: string;
  articleTitle: string;
  category: string;
  timestamp: number; // millisecond timestamp
  visitorId?: string;
  sessionId?: string;
  isReturning?: boolean;
  deviceType?: 'desktop' | 'mobile' | 'tablet';
  browser?: string;
  userAgent?: string;
  referrer?: string;
  readDurationSeconds?: number;
  activeReadingSeconds?: number;
  scrollDepthPercent?: number;
  maxScrollDepth?: number;
  classification?: ReaderClassification | null;
  milestones?: number[]; // [25, 50, 75, 90, 100]
  authorId?: string;
  authorEmail?: string;
}

export interface PeerReply {
  id: string;
  authorName: string;
  authorTitle: string;
  isVerifiedPeer: boolean;
  content: string;
  timestamp: number;
}

export interface PeerAnnotation {
  id?: string;
  articleId: string;
  paragraphIndex: number; // Index of the paragraph in the article, or -1 for general notes
  selectedText?: string;  // Context/excerpt from the paragraph
  authorName: string;
  authorTitle: string;    // e.g. "PhD Candidate, Forensic Psychology"
  authorInstitution?: string; // e.g. "Tata Institute of Social Sciences"
  isVerifiedPeer: boolean; // Approved / expert status indicator
  content: string;
  timestamp: number;
  likes: number;          // Scholarly upvotes/endorsements
  replies: PeerReply[];   // Nested replies
}

export interface ManuscriptSubmission {
  id: string;
  referenceId: string; // e.g. "TOL-2026-X84K"
  authorName: string;
  authorEmail: string;
  authorTitle: string; // e.g. "Fellow in Criminological Sciences"
  authorInstitution?: string; // e.g. "Cambridge Institute of Criminology"
  authorBio?: string;
  authorSocialUrl?: string; // LinkedIn, Twitter, or Academic Portfolio
  category: 'criminology' | 'psyche' | 'politics';
  submissionType: 'full_manuscript' | 'investigative_pitch' | 'case_study' | 'methodological_critique';
  title: string;
  subtitle?: string;
  abstract: string;
  content: string; // HTML or Markdown formatted manuscript body
  sourcesText?: string;
  datasetUrl?: string;
  coAuthors?: string;
  status: 'received' | 'in_peer_review' | 'revisions_needed' | 'accepted' | 'declined';
  submittedAt: number;
  updatedAt: number;
  editorialNotes?: string;
  peerReviewerFeedback?: string;
  notificationHistory?: Array<{
    status: string;
    timestamp: number;
    recipient: string;
    subject: string;
  }>;
}

export interface DraftNoteReply {
  id: string;
  authorName: string;
  authorEmail: string;
  authorRole: EditorialRole;
  content: string;
  timestamp: number;
}

export type DraftNoteCategory = 'fact_checking' | 'legal_review' | 'citation_validation' | 'methodology' | 'general';
export type DraftNoteUrgency = 'critical' | 'moderate' | 'minor';
export type DraftNoteStatus = 'open' | 'in_progress' | 'resolved';

export interface DraftInternalNote {
  id: string;
  articleId: string;
  articleTitle?: string;
  category: DraftNoteCategory;
  urgency: DraftNoteUrgency;
  status: DraftNoteStatus;
  authorName: string;
  authorEmail: string;
  authorRole: EditorialRole;
  content: string;
  referencedSnippet?: string; // Optional excerpt or quote from the draft being flagged
  sectionName?: string; // Section or paragraph reference
  timestamp: number;
  resolvedAt?: number;
  resolvedBy?: string;
  resolutionNote?: string;
  replies: DraftNoteReply[];
}

export interface ContributorStats {
  totalArticles: number;
  publishedCount: number;
  draftsCount: number;
  totalViews: number;
  totalBookmarks: number;
  totalPeerAnnotations: number;
  totalCitationsGenerated: number;
  openRevisionNotesCount: number;
  resolvedRevisionNotesCount: number;
}

export interface SavedArticle {
  id: string; // `${readerId}_${articleId}`
  readerId: string;
  articleId: string;
  title: string;
  subtitle?: string;
  category: string;
  authorName: string;
  readTime: string;
  excerpt: string;
  featuredImage?: string;
  savedAt: number;
  isRead: boolean;
  personalNote?: string;
  pdfLink?: string;
  slug?: string;
}

// ══════════════════════════════════════════════════════════════
// RESONANT QUOTES & TEXT INTERACTION TELEMETRY TYPES
// (Zero-PII Signals of Attention & Text Interaction)
// ══════════════════════════════════════════════════════════════

export type ResonantInteractionType = 'highlight' | 'copy';

export interface ResonantQuoteEvent {
  id?: string;
  eventType: 'resonant_quote_interaction';
  articleId: string;
  articleTitle?: string;
  category?: string;
  seriesName?: string;
  contentBlockId: string;
  interactionType: ResonantInteractionType;
  sessionId: string;
  anonymousVisitorId: string;
  timestamp: number;
  pageVersion: string;
}

export interface ParagraphResonanceStats {
  contentBlockId: string;
  articleId: string;
  articleTitle: string;
  category: string;
  seriesName?: string;
  paragraphText: string;
  paragraphIndex: number;
  tagName: string;
  highlightCount: number;
  copyCount: number;
  totalInteractions: number;
  uniqueSessionCount: number;
  meaningfulArticleSessions: number;
  resonanceRate: number; // (uniqueSessionCount / meaningfulArticleSessions) * 100
}

export interface ArticleResonanceSummary {
  articleId: string;
  articleTitle: string;
  category: string;
  seriesName?: string;
  highlightCount: number;
  copyCount: number;
  totalInteractions: number;
  uniqueSessions: number;
  meaningfulSessions: number;
  resonanceRate: number;
  topParagraphId?: string;
}

export interface CategoryResonanceSummary {
  category: string;
  totalInteractions: number;
  highlightCount: number;
  copyCount: number;
  uniqueSessions: number;
  articleCount: number;
}

export interface SeriesResonanceSummary {
  seriesName: string;
  totalInteractions: number;
  highlightCount: number;
  copyCount: number;
  uniqueSessions: number;
  articleCount: number;
}

// ══════════════════════════════════════════════════════════════
// SCALABLE DAILY ROLL-UP ANALYTICS (GLOBAL & PER-ARTICLE)
// ══════════════════════════════════════════════════════════════

export interface DailyGlobalStats {
  id?: string; // YYYY-MM-DD
  date: string; // YYYY-MM-DD
  totalViews: number;
  uniqueVisitors: number;
  totalActiveSeconds: number;
  durationSampleCount: number;
  bouncers: number;
  engagedBrowsers: number;
  deepReaders: number;
  completedReads: number;
  totalScrollDepth: number;
  newsletterSignups: number;
  textInteractions: number;
  updatedAt?: any; // Firestore server timestamp or epoch ms
  rebuiltAt?: number;
}

export interface DailyArticleStats {
  id?: string; // YYYY-MM-DD_articleId
  date: string; // YYYY-MM-DD
  articleId: string;
  articleTitle?: string;
  category?: string;
  totalViews: number;
  uniqueVisitors: number;
  totalActiveSeconds: number;
  durationSampleCount: number;
  bouncers: number;
  engagedBrowsers: number;
  deepReaders: number;
  completedReads?: number;
  highlightInteractions: number;
  copyInteractions: number;
  attributedNewsletterSignups: number;
  updatedAt?: any; // Firestore server timestamp or epoch ms
  rebuiltAt?: number;
}

// ══════════════════════════════════════════════════════════════
// ROLE-BASED ACCESS CONTROL & SECURITY INVITATIONS
// ══════════════════════════════════════════════════════════════

export interface ReviewInvitation {
  id: string;
  articleId: string;
  articleTitle: string;
  recipientEmail: string;
  recipientName: string;
  role: 'reviewer' | 'guest_reviewer';
  token: string;
  status: 'pending' | 'accepted' | 'expired' | 'revoked';
  expiresAt: number;
  createdAt: number;
  createdBy: string;
  acceptedAt?: number;
}

export interface AuditLog {
  id: string;
  action: string;
  actorUid: string;
  actorEmail: string;
  actorRole: EditorialRole;
  targetCollection: string;
  targetId: string;
  details: string;
  timestamp: number;
}

export interface Subscriber {
  id: string;
  email: string;
  subscribedAt?: number | string;
  location?: string;
  source?: string;
}


