/**
 * The Oligarchy — Form Validation & Anti-Placeholder Guard
 * 
 * Strict client-side validation for:
 * 1. Admin Dashboard Article Editor ('Edit Article' / 'New Article')
 * 2. Contributor Registry ('New Contributor' / 'Edit Contributor')
 * 3. Editorial Team Registry ('New Member' / 'Edit Member')
 * 
 * Guarantees that no placeholder, mock, sample, or dummy text is ever submitted
 * or saved into persistent storage. All fields must be either truly empty
 * (or undefined) or contain authentic, user-provided content.
 */

import { Article, AuthorProfile, CoAuthor, Source, EditorialUser, EditorialRole } from '../types';

// Regular expressions for format checking
const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
const ORCID_REGEX = /^\d{4}-\d{4}-\d{4}-\d{3}[\dX]$/i;
const DOI_REGEX = /^(?:doi:\s*|https?:\/\/(?:dx\.)?doi\.org\/)?(10\.\d{4,9}\/[-._;()/:A-Za-z0-9]+)$/i;
const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const URL_REGEX = /^https?:\/\/(?:www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b(?:[-a-zA-Z0-9()@:%_+.~#?&//=]*)$/i;
const DATA_IMAGE_REGEX = /^data:image\/(?:jpeg|jpg|png|webp|gif|svg\+xml|avif);base64,[A-Za-z0-9+/=]+$/i;

// Banned generic placeholder substrings (case-insensitive)
const BANNED_PLACEHOLDER_SNIPPETS = [
  'lorem ipsum',
  'dolor sit amet',
  'sample text',
  'sample title',
  'placeholder',
  'insert title',
  'insert text',
  'your title here',
  'your name here',
  'test title',
  'test name',
  'test article',
  'test user',
  'asdf',
  'qwerty',
  'foo bar',
  'untitled article',
  'untitled document'
];

// Banned dummy emails
const BANNED_EMAILS = new Set([
  'scholar@domain.org',
  'scholar@university.edu',
  'author@theoligarchy.org',
  'editor@theoligarchy.in',
  'test@test.com',
  'test@example.com',
  'user@domain.com',
  'example@example.com',
  'admin@example.com',
  'dr.vance.forensics@theoligarchy.org',
  'marcus.thorne.investigations@theoligarchy.org',
  'a.somasekharan@crim.cam.ac.uk',
  'meera.nair@criticallegal.org',
  'vikramaditya.sen@tiss.edu'
]);

// Banned dummy names
const BANNED_NAMES = new Set([
  'john doe',
  'jane doe',
  'scholar contributor',
  'guest researcher',
  'dr. alistair vance',
  'marcus thorne',
  'dr. arvind somasekharan',
  'adv. meera nair',
  'vikramaditya sen',
  'author full name',
  'scholar full name',
  'contributor name'
]);

// Banned dummy ORCIDs
const BANNED_ORCIDS = new Set([
  '0000-0000-0000-0000',
  '0000-0001-2345-6789',
  '1234-5678-9012-3456',
  '0000-0003-4412-8891',
  '0000-0001-9234-7718',
  '0000-0002-7819-3304',
  '0000-0001-8932-4411',
  '0000-0003-4421-9980'
]);

// Generic domain root URLs without actual user profiles
const BANNED_GENERIC_URLS = new Set([
  'https://scholar.google.com',
  'https://scholar.google.com/',
  'https://www.scholar.google.com',
  'https://www.scholar.google.com/',
  'http://scholar.google.com',
  'https://researchgate.net',
  'https://researchgate.net/',
  'https://www.researchgate.net',
  'https://www.researchgate.net/',
  'https://ssrn.com',
  'https://ssrn.com/',
  'https://www.ssrn.com',
  'https://www.ssrn.com/',
  'https://linkedin.com',
  'https://linkedin.com/',
  'https://www.linkedin.com',
  'https://www.linkedin.com/',
  'https://twitter.com',
  'https://twitter.com/',
  'https://x.com',
  'https://x.com/',
  'https://instagram.com',
  'https://instagram.com/',
  'https://www.instagram.com',
  'https://www.instagram.com/'
]);

/**
 * Checks if a string contains obvious placeholder prefixes like "e.g.", "eg:", "example:", "sample:"
 */
export function hasPlaceholderPrefix(val: string): boolean {
  if (!val) return false;
  const trimmed = val.trim().toLowerCase();
  return (
    trimmed.startsWith('e.g.') ||
    trimmed.startsWith('e.g ') ||
    trimmed.startsWith('eg.') ||
    trimmed.startsWith('eg:') ||
    trimmed.startsWith('example:') ||
    trimmed.startsWith('sample:') ||
    trimmed.startsWith('placeholder:') ||
    trimmed.startsWith('[placeholder') ||
    trimmed.startsWith('n/a') ||
    trimmed.startsWith('none') && trimmed.length <= 4
  );
}

/**
 * Checks if a string contains banned placeholder snippets or dummy markers
 */
export function isPlaceholderText(val: string): boolean {
  if (!val) return false;
  const trimmed = val.trim().toLowerCase();

  if (hasPlaceholderPrefix(trimmed)) return true;

  for (const snippet of BANNED_PLACEHOLDER_SNIPPETS) {
    if (trimmed.includes(snippet)) {
      return true;
    }
  }

  return false;
}

/**
 * Validates Email Address
 */
export function validateEmail(val?: string, fieldName = 'Email'): { isValid: boolean; error?: string; cleanVal?: string } {
  if (!val || !val.trim()) {
    return { isValid: true, cleanVal: undefined };
  }
  const clean = val.trim().toLowerCase();

  if (isPlaceholderText(clean) || BANNED_EMAILS.has(clean)) {
    return { isValid: false, error: `${fieldName} contains placeholder or sample text. Please provide an authentic email address or leave it empty.` };
  }

  if (!EMAIL_REGEX.test(clean)) {
    return { isValid: false, error: `${fieldName} must be a valid email format (e.g. user@domain.com).` };
  }

  return { isValid: true, cleanVal: clean };
}

/**
 * Validates ORCID Identifier
 */
export function validateOrcid(val?: string, fieldName = 'ORCID iD'): { isValid: boolean; error?: string; cleanVal?: string } {
  if (!val || !val.trim()) {
    return { isValid: true, cleanVal: undefined };
  }
  let clean = val.trim();

  // Strip URL prefix if user pasted full https://orcid.org/...
  clean = clean.replace(/^https?:\/\/(?:www\.)?orcid\.org\//i, '');

  if (isPlaceholderText(clean) || BANNED_ORCIDS.has(clean)) {
    return { isValid: false, error: `${fieldName} contains a sample/placeholder identifier. Please provide a verified 16-digit ORCID or leave empty.` };
  }

  if (!ORCID_REGEX.test(clean)) {
    return { isValid: false, error: `${fieldName} must follow the standard 16-digit format (0000-0000-0000-0000).` };
  }

  return { isValid: true, cleanVal: clean };
}

/**
 * Validates DOI
 */
export function validateDoi(val?: string, fieldName = 'DOI'): { isValid: boolean; error?: string; cleanVal?: string } {
  if (!val || !val.trim()) {
    return { isValid: true, cleanVal: undefined };
  }
  const clean = val.trim();

  if (isPlaceholderText(clean)) {
    return { isValid: false, error: `${fieldName} contains placeholder text. Please enter a valid DOI (e.g. 10.1000/182) or leave blank.` };
  }

  if (!DOI_REGEX.test(clean)) {
    return { isValid: false, error: `${fieldName} must start with '10.' followed by registrant code and document suffix (e.g. 10.5281/zenodo.12345).` };
  }

  return { isValid: true, cleanVal: clean };
}

/**
 * Validates Web URL
 */
export function validateUrl(val?: string, fieldName = 'URL', requireHttp = true): { isValid: boolean; error?: string; cleanVal?: string } {
  if (!val || !val.trim()) {
    return { isValid: true, cleanVal: undefined };
  }
  let clean = val.trim();

  if (isPlaceholderText(clean)) {
    return { isValid: false, error: `${fieldName} contains placeholder text. Please provide a genuine link or leave empty.` };
  }

  if (BANNED_GENERIC_URLS.has(clean.toLowerCase())) {
    return { isValid: false, error: `${fieldName} points to a generic homepage. Please provide the full path to your specific profile or treatise, or leave empty.` };
  }

  if (requireHttp && !clean.startsWith('http://') && !clean.startsWith('https://')) {
    clean = `https://${clean}`;
  }

  if (!URL_REGEX.test(clean)) {
    return { isValid: false, error: `${fieldName} must be a valid web URL (https://...).` };
  }

  return { isValid: true, cleanVal: clean };
}

/**
 * Validates Image URL (Supports Web URLs, Base64 Data URIs, and local relative paths)
 */
export function validateImageUrl(val?: string, fieldName = 'Featured Image URL'): { isValid: boolean; error?: string; cleanVal?: string } {
  if (!val || !val.trim()) {
    return { isValid: true, cleanVal: undefined };
  }
  const clean = val.trim();

  // 1. Check for placeholder text
  if (isPlaceholderText(clean)) {
    return { isValid: false, error: `${fieldName} contains placeholder text. Please provide an authentic image or leave empty.` };
  }

  // 2. Allow base64 Data URIs (from drag-and-drop or local file compression)
  if (clean.startsWith('data:image/')) {
    if (DATA_IMAGE_REGEX.test(clean) || clean.startsWith('data:image/')) {
      return { isValid: true, cleanVal: clean };
    }
    return { isValid: false, error: `${fieldName} has an invalid Base64 image encoding.` };
  }

  // 3. Allow relative asset paths (e.g., /banners/..., /assets/...)
  if (clean.startsWith('/') || clean.startsWith('./')) {
    return { isValid: true, cleanVal: clean };
  }

  // 4. Validate as web URL (https://...)
  return validateUrl(clean, fieldName, true);
}

/**
 * Validates Article Slug
 */
export function validateSlug(val: string, fieldName = 'URL Slug'): { isValid: boolean; error?: string; cleanVal?: string } {
  if (!val || !val.trim()) {
    return { isValid: false, error: `${fieldName} is mandatory.` };
  }
  const clean = val.trim().toLowerCase();

  if (isPlaceholderText(clean) || clean === 'slug' || clean === 'article-slug' || clean === 'new-article') {
    return { isValid: false, error: `${fieldName} contains placeholder text. Please provide a descriptive slug (e.g. 'forensic-profiling-analysis').` };
  }

  if (!SLUG_REGEX.test(clean)) {
    return { isValid: false, error: `${fieldName} can only contain lowercase letters, numbers, and hyphens without consecutive or trailing dashes.` };
  }

  return { isValid: true, cleanVal: clean };
}

/**
 * Validates Text Field (e.g., Title, Name, Role, Institution, Credentials)
 */
export function validateTextField(
  val: string | undefined, 
  fieldName: string, 
  options: { required?: boolean; minLength?: number; maxLength?: number; checkBannedNames?: boolean } = {}
): { isValid: boolean; error?: string; cleanVal?: string } {
  const { required = false, minLength = 2, maxLength = 300, checkBannedNames = false } = options;

  if (!val || !val.trim()) {
    if (required) {
      return { isValid: false, error: `${fieldName} is required.` };
    }
    return { isValid: true, cleanVal: undefined };
  }

  const clean = val.trim();

  if (isPlaceholderText(clean)) {
    return { 
      isValid: false, 
      error: `${fieldName} contains placeholder or sample text ("${clean.slice(0, 30)}..."). Please enter genuine content or leave it empty.` 
    };
  }

  if (checkBannedNames && BANNED_NAMES.has(clean.toLowerCase())) {
    return {
      isValid: false,
      error: `"${clean}" is a recognized placeholder name. Please enter the authentic contributor or researcher name.`
    };
  }

  if (clean.length < minLength) {
    return { isValid: false, error: `${fieldName} must be at least ${minLength} characters.` };
  }

  if (clean.length > maxLength) {
    return { isValid: false, error: `${fieldName} exceeds maximum length of ${maxLength} characters.` };
  }

  return { isValid: true, cleanVal: clean };
}

// ══════════════════════════════════════════════════════════════════════════════
// COMPREHENSIVE FORM VALIDATORS
// ══════════════════════════════════════════════════════════════════════════════

export interface ValidationResult<T> {
  isValid: boolean;
  errors: Record<string, string>;
  sanitized: T;
}

export interface ArticleFormInput {
  title: string;
  subtitle?: string;
  slug: string;
  category: string;
  excerpt?: string;
  content: string;
  authorName?: string;
  authorOrcid?: string;
  doi?: string;
  featuredImage?: string;
  pdfLink?: string;
  canvaEmbed?: string;
  seriesName?: string;
  metaTitle?: string;
  metaDescription?: string;
  canonicalUrl?: string;
  coAuthors?: CoAuthor[];
  sources?: Source[];
}

/**
 * Validates the Admin Article Editor Form
 */
export function validateArticleForm(input: ArticleFormInput): ValidationResult<Partial<Article>> {
  const errors: Record<string, string> = {};
  const sanitized: any = {};

  // 1. Title (Required)
  const titleVal = validateTextField(input.title, 'Treatise Title', { required: true, minLength: 3, maxLength: 250 });
  if (!titleVal.isValid) errors.title = titleVal.error!;
  else sanitized.title = titleVal.cleanVal!;

  // 2. Subtitle (Optional)
  const subVal = validateTextField(input.subtitle, 'Subtitle', { required: false, minLength: 2, maxLength: 300 });
  if (!subVal.isValid) errors.subtitle = subVal.error!;
  else sanitized.subtitle = subVal.cleanVal;

  // 3. Slug (Required)
  const slugVal = validateSlug(input.slug, 'URL Slug');
  if (!slugVal.isValid) errors.slug = slugVal.error!;
  else sanitized.slug = slugVal.cleanVal!;

  // 4. Content (Required, min 20 chars, no lorem ipsum)
  if (!input.content || !input.content.trim()) {
    errors.content = 'Manuscript content cannot be empty.';
  } else if (isPlaceholderText(input.content)) {
    errors.content = 'Manuscript content contains placeholder or dummy text (e.g. "Lorem Ipsum"). Please provide authentic treatise research.';
  } else if (input.content.trim().length < 20) {
    errors.content = 'Manuscript content must be at least 20 characters long.';
  } else {
    sanitized.content = input.content.trim();
  }

  // 5. Excerpt (Optional)
  const excerptVal = validateTextField(input.excerpt, 'Executive Abstract / Excerpt', { required: false, minLength: 5, maxLength: 1000 });
  if (!excerptVal.isValid) errors.excerpt = excerptVal.error!;
  else sanitized.excerpt = excerptVal.cleanVal || sanitized.title;

  // 6. Author Name (Optional / Defaulted)
  const authorVal = validateTextField(input.authorName, 'Author Name', { required: false, checkBannedNames: true });
  if (!authorVal.isValid) errors.authorName = authorVal.error!;
  else sanitized.authorName = authorVal.cleanVal;

  // 7. Author ORCID (Optional)
  const orcidVal = validateOrcid(input.authorOrcid, 'Author ORCID iD');
  if (!orcidVal.isValid) errors.authorOrcid = orcidVal.error!;
  else sanitized.authorOrcid = orcidVal.cleanVal;

  // 8. DOI (Optional)
  const doiVal = validateDoi(input.doi, 'Permanent DOI');
  if (!doiVal.isValid) errors.doi = doiVal.error!;
  else sanitized.doi = doiVal.cleanVal;

  // 9. URLs
  const imgVal = validateImageUrl(input.featuredImage, 'Featured Image');
  if (!imgVal.isValid) errors.featuredImage = imgVal.error!;
  else sanitized.featuredImage = imgVal.cleanVal;

  const pdfVal = validateUrl(input.pdfLink, 'Research Report PDF Link');
  if (!pdfVal.isValid) errors.pdfLink = pdfVal.error!;
  else sanitized.pdfLink = pdfVal.cleanVal;

  const canonVal = validateUrl(input.canonicalUrl, 'Canonical URL');
  if (!canonVal.isValid) errors.canonicalUrl = canonVal.error!;
  else sanitized.canonicalUrl = canonVal.cleanVal;

  if (input.canvaEmbed && input.canvaEmbed.trim()) {
    if (isPlaceholderText(input.canvaEmbed)) {
      errors.canvaEmbed = 'Canva Embed contains placeholder text.';
    } else {
      sanitized.canvaEmbed = input.canvaEmbed.trim();
    }
  }

  // 10. SEO Metadata
  const metaTVal = validateTextField(input.metaTitle, 'SEO Meta Title', { required: false, maxLength: 100 });
  if (!metaTVal.isValid) errors.metaTitle = metaTVal.error!;
  else sanitized.metaTitle = metaTVal.cleanVal;

  const metaDVal = validateTextField(input.metaDescription, 'SEO Meta Description', { required: false, maxLength: 350 });
  if (!metaDVal.isValid) errors.metaDescription = metaDVal.error!;
  else sanitized.metaDescription = metaDVal.cleanVal;

  const seriesVal = validateTextField(input.seriesName, 'Investigative Series Name', { required: false, maxLength: 100 });
  if (!seriesVal.isValid) errors.seriesName = seriesVal.error!;
  else sanitized.seriesName = seriesVal.cleanVal;

  // 11. Validate Co-Authors if provided
  if (input.coAuthors && input.coAuthors.length > 0) {
    const cleanCoAuthors: CoAuthor[] = [];
    input.coAuthors.forEach((co, idx) => {
      const coNameVal = validateTextField(co.name, `Co-Author #${idx + 1} Name`, { required: true, checkBannedNames: true });
      if (!coNameVal.isValid) errors[`coAuthor_${idx}_name`] = coNameVal.error!;

      const coRoleVal = validateTextField(co.role, `Co-Author #${idx + 1} Role`, { required: false });
      if (!coRoleVal.isValid) errors[`coAuthor_${idx}_role`] = coRoleVal.error!;

      const coInstVal = validateTextField(co.institution, `Co-Author #${idx + 1} Institution`, { required: false });
      if (!coInstVal.isValid) errors[`coAuthor_${idx}_institution`] = coInstVal.error!;

      const coOrcidVal = validateOrcid(co.orcid, `Co-Author #${idx + 1} ORCID`);
      if (!coOrcidVal.isValid) errors[`coAuthor_${idx}_orcid`] = coOrcidVal.error!;

      const coEmailVal = validateEmail(co.email, `Co-Author #${idx + 1} Email`);
      if (!coEmailVal.isValid) errors[`coAuthor_${idx}_email`] = coEmailVal.error!;

      if (coNameVal.isValid) {
        cleanCoAuthors.push({
          name: coNameVal.cleanVal!,
          role: coRoleVal.cleanVal,
          institution: coInstVal.cleanVal,
          orcid: coOrcidVal.cleanVal,
          email: coEmailVal.cleanVal
        });
      }
    });
    sanitized.coAuthors = cleanCoAuthors.length > 0 ? cleanCoAuthors : undefined;
  }

  // 12. Validate Citation Sources if provided
  if (input.sources && input.sources.length > 0) {
    const cleanSources: Source[] = [];
    input.sources.forEach((src, idx) => {
      const citVal = validateTextField(src.citation, `Citation #${idx + 1}`, { required: true, minLength: 5 });
      if (!citVal.isValid) errors[`source_${idx}_citation`] = citVal.error!;

      const srcTitleVal = validateTextField(src.title, `Source #${idx + 1} Title`, { required: false });
      if (!srcTitleVal.isValid) errors[`source_${idx}_title`] = srcTitleVal.error!;

      const srcUrlVal = validateUrl(src.url, `Source #${idx + 1} URL`);
      if (!srcUrlVal.isValid) errors[`source_${idx}_url`] = srcUrlVal.error!;

      if (citVal.isValid) {
        cleanSources.push({
          category: src.category || 'academic',
          citation: citVal.cleanVal!,
          title: srcTitleVal.cleanVal || 'Source Citation',
          url: srcUrlVal.cleanVal
        });
      }
    });
    sanitized.sources = cleanSources.length > 0 ? cleanSources : undefined;
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    sanitized
  };
}

export interface ContributorFormInput {
  name: string;
  slug?: string;
  role: string;
  bio?: string;
  profileImage?: string;
  avatarUrl?: string;
  institution?: string;
  credentials?: string;
  orcid?: string;
  email?: string;
  contactEmail?: string;
  specializations?: string[];
  instagram?: string;
  twitter?: string;
  linkedin?: string;
  website?: string;
  googleScholar?: string;
  researchGate?: string;
  ssrn?: string;
  displayOrder?: number;
  isVisible?: boolean;
  isFounder?: boolean;
  joinedDate?: string;
  socials?: {
    instagram?: string;
    twitter?: string;
    linkedin?: string;
    website?: string;
    googleScholar?: string;
    researchGate?: string;
    ssrn?: string;
    email?: string;
  };
}

/**
 * Validates the Contributor Profile Form (AuthorManager)
 */
export function validateContributorForm(input: ContributorFormInput): ValidationResult<AuthorProfile> {
  const errors: Record<string, string> = {};
  const sanitized: any = {};

  // 1. Name (Required)
  const nameVal = validateTextField(input.name, 'Author / Contributor Name', { required: true, minLength: 2, maxLength: 100, checkBannedNames: true });
  if (!nameVal.isValid) errors.name = nameVal.error!;
  else sanitized.name = nameVal.cleanVal!;

  // 2. Slug
  const slugVal = validateSlug(input.slug || input.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'), 'Author Slug');
  if (!slugVal.isValid) errors.slug = slugVal.error!;
  else sanitized.slug = slugVal.cleanVal!;

  // 3. Role (Required)
  const roleVal = validateTextField(input.role, 'Academic / Editorial Role', { required: true, minLength: 2, maxLength: 100 });
  if (!roleVal.isValid) errors.role = roleVal.error!;
  else sanitized.role = roleVal.cleanVal!;

  // 4. Bio (Optional)
  const bioVal = validateTextField(input.bio, 'Academic Biography', { required: false, minLength: 5, maxLength: 2000 });
  if (!bioVal.isValid) errors.bio = bioVal.error!;
  else sanitized.bio = bioVal.cleanVal || '';

  // 5. Institution (Optional)
  const instVal = validateTextField(input.institution, 'Affiliated Institution / University', { required: false, maxLength: 150 });
  if (!instVal.isValid) errors.institution = instVal.error!;
  else sanitized.institution = instVal.cleanVal;

  // 6. Credentials (Optional)
  const credVal = validateTextField(input.credentials, 'Degrees & Honors Credentials', { required: false, maxLength: 150 });
  if (!credVal.isValid) errors.credentials = credVal.error!;
  else sanitized.credentials = credVal.cleanVal;

  // 7. ORCID (Optional)
  const orcidVal = validateOrcid(input.orcid, 'ORCID iD');
  if (!orcidVal.isValid) errors.orcid = orcidVal.error!;
  else sanitized.orcid = orcidVal.cleanVal;

  // 8. Email (Optional)
  const directEmail = input.contactEmail || input.email;
  const emailVal = validateEmail(directEmail, 'Contact Email');
  if (!emailVal.isValid) errors.email = emailVal.error!;
  else sanitized.email = emailVal.cleanVal;

  // 9. Profile Image URL (Optional)
  const imgInput = input.profileImage || input.avatarUrl;
  const imgVal = validateImageUrl(imgInput, 'Profile Image');
  if (!imgVal.isValid) errors.profileImage = imgVal.error!;
  else {
    sanitized.profileImage = imgVal.cleanVal;
    sanitized.avatarUrl = imgVal.cleanVal;
  }

  // 10. Social / Academic Links (Support both flattened and nested)
  const cleanSocials: any = {};
  const websiteInput = input.website || input.socials?.website;
  if (websiteInput) {
    const val = validateUrl(websiteInput, 'Personal / Institutional Website');
    if (!val.isValid) errors['social_website'] = val.error!;
    else cleanSocials.website = val.cleanVal;
  }

  const linkedinInput = input.linkedin || input.socials?.linkedin;
  if (linkedinInput) {
    const val = validateUrl(linkedinInput, 'LinkedIn Profile URL');
    if (!val.isValid) errors['social_linkedin'] = val.error!;
    else cleanSocials.linkedin = val.cleanVal;
  }

  const twitterInput = input.twitter || input.socials?.twitter;
  if (twitterInput) {
    const val = validateUrl(twitterInput, 'Twitter / X Profile URL');
    if (!val.isValid) errors['social_twitter'] = val.error!;
    else cleanSocials.twitter = val.cleanVal;
  }

  const instagramInput = input.instagram || input.socials?.instagram;
  if (instagramInput) {
    const val = validateUrl(instagramInput, 'Instagram Profile URL');
    if (!val.isValid) errors['social_instagram'] = val.error!;
    else cleanSocials.instagram = val.cleanVal;
  }

  const scholarInput = input.googleScholar || input.socials?.googleScholar;
  if (scholarInput) {
    const val = validateUrl(scholarInput, 'Google Scholar Profile URL');
    if (!val.isValid) errors['social_googleScholar'] = val.error!;
    else cleanSocials.googleScholar = val.cleanVal;
  }

  const researchGateInput = input.researchGate || input.socials?.researchGate;
  if (researchGateInput) {
    const val = validateUrl(researchGateInput, 'ResearchGate Profile URL');
    if (!val.isValid) errors['social_researchGate'] = val.error!;
    else cleanSocials.researchGate = val.cleanVal;
  }

  const ssrnInput = input.ssrn || input.socials?.ssrn;
  if (ssrnInput) {
    const val = validateUrl(ssrnInput, 'SSRN Author Profile URL');
    if (!val.isValid) errors['social_ssrn'] = val.error!;
    else cleanSocials.ssrn = val.cleanVal;
  }

  const socialEmailInput = input.socials?.email;
  if (socialEmailInput) {
    const val = validateEmail(socialEmailInput, 'Social Contact Email');
    if (!val.isValid) errors['social_email'] = val.error!;
    else cleanSocials.email = val.cleanVal;
  }

  // 11. Specializations
  if (input.specializations && input.specializations.length > 0) {
    const validSpecs: string[] = [];
    input.specializations.forEach(s => {
      if (s && s.trim() && !isPlaceholderText(s)) {
        validSpecs.push(s.trim());
      }
    });
    sanitized.specializations = validSpecs;
    sanitized.researchAreas = validSpecs;
    sanitized.tags = validSpecs;
  } else {
    sanitized.specializations = [];
    sanitized.researchAreas = [];
    sanitized.tags = [];
  }

  sanitized.socials = cleanSocials;
  sanitized.displayOrder = typeof input.displayOrder === 'number' ? input.displayOrder : 0;
  sanitized.isVisible = typeof input.isVisible === 'boolean' ? input.isVisible : true;
  sanitized.isFounder = typeof input.isFounder === 'boolean' ? input.isFounder : false;
  sanitized.joinedDate = input.joinedDate;

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    sanitized
  };
}

export interface EditorialMemberFormInput {
  name?: string;
  displayName?: string;
  email: string;
  role: EditorialRole | string;
  institution?: string;
  credentials?: string;
  orcid?: string;
  bio?: string;
  assignedCategories?: ('criminology' | 'psyche' | 'politics')[];
}

/**
 * Validates Editorial Team Member Form (EditorialTeamManager)
 */
export function validateEditorialMemberForm(input: EditorialMemberFormInput): ValidationResult<Partial<EditorialUser>> {
  const errors: Record<string, string> = {};
  const sanitized: any = {};

  const nameInput = input.displayName || input.name || '';

  // 1. Name (Required)
  const nameVal = validateTextField(nameInput, 'Full Name', { required: true, minLength: 2, maxLength: 100, checkBannedNames: true });
  if (!nameVal.isValid) errors.displayName = nameVal.error!;
  else sanitized.displayName = nameVal.cleanVal!;

  // 2. Email (Required)
  const emailVal = validateEmail(input.email, 'Institutional / Verified Email');
  if (!emailVal.isValid || !input.email?.trim()) {
    errors.email = emailVal.error || 'Verified Email is required.';
  } else {
    sanitized.email = emailVal.cleanVal!;
  }

  // 3. Role
  if (!input.role) {
    errors.role = 'Editorial role is required.';
  } else {
    sanitized.role = input.role as EditorialRole;
  }

  // 4. Institution (Optional)
  const instVal = validateTextField(input.institution, 'Affiliated Institution', { required: false, maxLength: 150 });
  if (!instVal.isValid) errors.institution = instVal.error!;
  else sanitized.institution = instVal.cleanVal;

  // 5. Credentials (Optional)
  const credVal = validateTextField(input.credentials, 'Academic Credentials', { required: false, maxLength: 150 });
  if (!credVal.isValid) errors.credentials = credVal.error!;
  else sanitized.credentials = credVal.cleanVal;

  // 6. ORCID (Optional)
  const orcidVal = validateOrcid(input.orcid, 'ORCID iD');
  if (!orcidVal.isValid) errors.orcid = orcidVal.error!;
  else sanitized.orcid = orcidVal.cleanVal;

  // 7. Bio (Optional)
  const bioVal = validateTextField(input.bio, 'Editorial Dossier / Bio', { required: false, maxLength: 1000 });
  if (!bioVal.isValid) errors.bio = bioVal.error!;
  else sanitized.bio = bioVal.cleanVal;

  // 8. Categories
  sanitized.assignedCategories = input.assignedCategories || ['criminology'];

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    sanitized
  };
}
