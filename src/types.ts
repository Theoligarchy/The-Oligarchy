export interface Source {
  category: 'academic' | 'government' | 'book' | 'court' | 'database' | 'investigative' | 'other';
  title: string;
  url?: string;
  citation?: string;
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
  seoTitle?: string;
  seoDescription?: string;
  canonicalUrl?: string;
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
  role: string;
  bio: string;
  avatarUrl?: string;
  tags: string[];
  socials: {
    instagram?: string;
    twitter?: string;
    linkedin?: string;
    website?: string;
  };
}

export interface SystemSettings {
  passwordHash: string; // or encrypted password overlay
  siteTitle: string;
  siteHeadline: string;
  siteSubheading: string;
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

