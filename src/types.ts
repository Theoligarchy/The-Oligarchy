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
  publishDate?: string; // ISO date or localized text
  scheduledAt?: number; // timestamp for scheduling
  createdAt: number;
  updatedAt: number;
  views: number;
  isFeatured: boolean;
  isPinned: boolean;
  sources: Source[];
  relatedArticles?: string[]; // IDs of related articles
  seriesName?: string; // Series grouping name
  seriesPart?: number; // Part index
  versions?: ArticleVersion[]; // History of edits
  createdByUid?: string; // UID of the author/editor who created this manuscript
  createdByEmail?: string; // Email of the creator for ownership checks
  seoTitle?: string;
  seoDescription?: string;
  metaTitle?: string;
  metaDescription?: string;
  canonicalUrl?: string;
}

export type EditorialRole = 'author' | 'reviewer' | 'admin';

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
  createdAt?: number;
  lastLoginAt?: number;
  status?: 'active' | 'pending' | 'suspended';
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

export interface ViewLog {
  id?: string;
  articleId: string;
  articleTitle: string;
  category: string;
  timestamp: number; // millisecond timestamp
  userAgent?: string;
  referrer?: string;
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


