import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Send, 
  Copy, 
  Check, 
  Smartphone, 
  Monitor, 
  Code, 
  FileText, 
  Eye, 
  EyeOff, 
  ExternalLink, 
  RefreshCw, 
  Sparkles, 
  Mail, 
  Download, 
  CheckCircle2, 
  AlertCircle, 
  UserCheck, 
  Calendar, 
  Clock, 
  BookOpen,
  Trash2,
  FileSpreadsheet,
  Layers,
  ChevronDown
} from 'lucide-react';
import { Article, Subscriber } from '../types';

interface NewsletterDispatchPreviewProps {
  articles: Article[];
  subscribers: Subscriber[];
  onDeleteSubscriber?: (id: string) => void;
  onExportCSV?: () => void;
  setAlert: (alert: { text: string; type: 'success' | 'error' | 'info' }) => void;
}

type PreviewDevice = 'desktop' | 'mobile' | 'code' | 'plaintext';
type NewsletterTheme = 'scholarly' | 'parchment' | 'midnight';

export default function NewsletterDispatchPreview({
  articles,
  subscribers,
  onDeleteSubscriber,
  onExportCSV,
  setAlert
}: NewsletterDispatchPreviewProps) {
  // Published articles list
  const publishedArticles = useMemo(() => {
    return articles.filter(a => a.status === 'published' || !a.status);
  }, [articles]);

  // Selected article
  const [selectedArticleId, setSelectedArticleId] = useState<string>(() => {
    return publishedArticles[0]?.id || '';
  });

  const selectedArticle = useMemo(() => {
    return publishedArticles.find(a => a.id === selectedArticleId) || publishedArticles[0] || null;
  }, [publishedArticles, selectedArticleId]);

  // Resend API Key & Server Status
  const [resendApiKey, setResendApiKey] = useState<string>(() => {
    return localStorage.getItem('tol_resend_api_key') || '';
  });
  const [showApiKey, setShowApiKey] = useState(false);
  const [serverStatus, setServerStatus] = useState<{ configured: boolean; fromEmail?: string; provider?: string; mode?: string } | null>(null);
  const [subscriberFilter, setSubscriberFilter] = useState<'all' | 'active' | 'unsubscribed'>('all');

  // Query server-side newsletter configuration
  useEffect(() => {
    fetch('/api/newsletter/status')
      .then(r => r.json())
      .then(d => setServerStatus(d))
      .catch(() => {});
  }, []);

  // Detailed Subscriber Metrics
  const subscriberStats = useMemo(() => {
    const total = subscribers.length;
    const active = subscribers.filter(s => s.status !== 'unsubscribed').length;
    const unsubscribed = subscribers.filter(s => s.status === 'unsubscribed').length;
    return { total, active, unsubscribed };
  }, [subscribers]);

  const filteredSubscribers = useMemo(() => {
    if (subscriberFilter === 'active') return subscribers.filter(s => s.status !== 'unsubscribed');
    if (subscriberFilter === 'unsubscribed') return subscribers.filter(s => s.status === 'unsubscribed');
    return subscribers;
  }, [subscribers, subscriberFilter]);

  // Email Configuration State
  const [subject, setSubject] = useState<string>('');
  const [preheader, setPreheader] = useState<string>('An empirical inquiry into power systems and criminal psychology.');
  const [editorsNote, setEditorsNote] = useState<string>('');
  const [ctaText, setCtaText] = useState<string>('Access Full Investigation');
  const [theme, setTheme] = useState<NewsletterTheme>('scholarly');
  const [includeImage, setIncludeImage] = useState<boolean>(true);
  const [includeQuote, setIncludeQuote] = useState<boolean>(true);
  const [includeCitation, setIncludeCitation] = useState<boolean>(true);

  // Preview & Dispatch State
  const [previewDevice, setPreviewDevice] = useState<PreviewDevice>('desktop');
  const [copiedHtml, setCopiedHtml] = useState<boolean>(false);
  const [copiedPlaintext, setCopiedPlaintext] = useState<boolean>(false);
  const [testEmail, setTestEmail] = useState<string>('theoligarchy.ppj@gmail.com');
  const [isSendingTest, setIsSendingTest] = useState<boolean>(false);
  const [isSendingBroadcast, setIsSendingBroadcast] = useState<boolean>(false);
  const [showBroadcastConfirm, setShowBroadcastConfirm] = useState<boolean>(false);
  const [deleteConfirmSubscriberId, setDeleteConfirmSubscriberId] = useState<string | null>(null);

  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Auto-sync subject when selected article changes
  useEffect(() => {
    if (selectedArticle) {
      setSubject(`[The Oligarchy] New Critical Analysis: ${selectedArticle.title}`);
    }
  }, [selectedArticle]);

  // Persist API key
  const handleApiKeyChange = (key: string) => {
    setResendApiKey(key);
    localStorage.setItem('tol_resend_api_key', key.trim());
  };

  // Build Article Shareable Link
  const articleUrl = useMemo(() => {
    if (!selectedArticle) return 'https://theoligarchy.in';
    const slugify = (text: string) => text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    return selectedArticle.slug 
      ? `https://theoligarchy.in/post/${slugify(selectedArticle.slug)}` 
      : `https://theoligarchy.in/?art=${encodeURIComponent(selectedArticle.id)}`;
  }, [selectedArticle]);

  // Generate Email HTML
  const emailHtml = useMemo(() => {
    if (!selectedArticle) return '';

    const themeStyles = {
      scholarly: {
        bg: '#ffffff',
        containerBg: '#ffffff',
        text: '#1a1208',
        subtext: '#555555',
        border: '#8b1a1a',
        buttonBg: '#8b1a1a',
        buttonText: '#ffffff',
        boxBg: '#fbf9f5',
        divider: '#e5e5e5'
      },
      parchment: {
        bg: '#f4f0e8',
        containerBg: '#faf7f2',
        text: '#16130f',
        subtext: '#5c5449',
        border: '#701313',
        buttonBg: '#701313',
        buttonText: '#ffffff',
        boxBg: '#f0ece3',
        divider: '#d8d1c3'
      },
      midnight: {
        bg: '#0a0a0c',
        containerBg: '#121217',
        text: '#eae5db',
        subtext: '#9f978a',
        border: '#a32020',
        buttonBg: '#8b1a1a',
        buttonText: '#ffffff',
        boxBg: '#1b1b22',
        divider: '#26252e'
      }
    }[theme];

    const currentYear = new Date().getFullYear();
    const formattedDate = selectedArticle.date 
      ? new Date(selectedArticle.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
      : 'Recent Publication';

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${selectedArticle.title}</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
  <style>
    body { margin: 0; padding: 0; background-color: ${themeStyles.bg}; font-family: 'Georgia', serif; -webkit-font-smoothing: antialiased; }
    img { border: 0; outline: none; text-decoration: none; max-width: 100%; height: auto; display: block; }
    a { color: ${themeStyles.border}; text-decoration: none; }
    @media only screen and (max-width: 600px) {
      .container { width: 100% !important; padding: 15px !important; }
      .header-title { font-size: 28px !important; }
      .article-title { font-size: 22px !important; }
      .cta-button { width: 100% !important; box-sizing: border-box !important; text-align: center !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 20px 0; background-color: ${themeStyles.bg}; color: ${themeStyles.text};">

  <!-- Preheader text for email clients (hidden from body) -->
  <div style="display: none; font-size: 1px; color: ${themeStyles.bg}; line-height: 1px; max-height: 0px; max-width: 0px; opacity: 0; overflow: hidden;">
    ${preheader} &nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;
  </div>

  <table border="0" cellpadding="0" cellspacing="0" width="100%">
    <tr>
      <td align="center" style="padding: 10px;">
        <!-- Email Container -->
        <table border="0" cellpadding="0" cellspacing="0" width="600" class="container" style="max-width: 600px; background-color: ${themeStyles.containerBg}; border: 1px solid ${themeStyles.divider}; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
          
          <!-- Journal Masthead Header -->
          <tr>
            <td align="center" style="padding: 35px 25px 25px 25px; border-bottom: 3px double ${themeStyles.border};">
              <table border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td align="center">
                    <span style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 10px; font-weight: 700; letter-spacing: 3px; text-transform: uppercase; color: ${themeStyles.border}; display: block; margin-bottom: 6px;">
                      Peer-Reviewed Research Platform
                    </span>
                    <h1 class="header-title" style="margin: 0; font-family: 'Georgia', 'Times New Roman', serif; font-size: 34px; font-weight: 700; letter-spacing: 1px; color: ${themeStyles.text}; line-height: 1.15;">
                      The Oligarchy
                    </h1>
                    <p style="margin: 6px 0 0 0; font-family: 'Georgia', serif; font-style: italic; font-size: 13px; color: ${themeStyles.subtext}; letter-spacing: 1px;">
                      Criminology · Criminal Psychology · Systems of Power
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Optional Editor's Foreword -->
          ${editorsNote.trim() ? `
          <tr>
            <td style="padding: 25px 30px 10px 30px; background-color: ${themeStyles.boxBg}; border-bottom: 1px solid ${themeStyles.divider};">
              <p style="margin: 0 0 6px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 10px; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; color: ${themeStyles.border};">
                Letter From The Editor
              </p>
              <p style="margin: 0; font-family: 'Georgia', serif; font-size: 14px; line-height: 1.6; color: ${themeStyles.text}; font-style: italic;">
                "${editorsNote.trim()}"
              </p>
            </td>
          </tr>
          ` : ''}

          <!-- Featured Image (if enabled and exists) -->
          ${includeImage && selectedArticle.featuredImage ? `
          <tr>
            <td align="center" style="padding: 25px 30px 0 30px;">
              <a href="${articleUrl}" target="_blank">
                <img src="${selectedArticle.featuredImage}" alt="${selectedArticle.title}" width="540" style="width: 100%; max-width: 540px; height: auto; border-radius: 1px; border: 1px solid ${themeStyles.divider};" />
              </a>
            </td>
          </tr>
          ` : ''}

          <!-- Article Content Body -->
          <tr>
            <td style="padding: 25px 30px 20px 30px;">
              
              <!-- Badges & Metadata -->
              <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 12px;">
                <tr>
                  <td>
                    <span style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 10px; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; color: ${themeStyles.border}; background-color: ${themeStyles.boxBg}; padding: 3px 8px; border-radius: 1px; border: 1px solid ${themeStyles.divider};">
                      ${selectedArticle.category ? selectedArticle.category.toUpperCase() : 'INVESTIGATION'}
                    </span>
                    <span style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 11px; color: ${themeStyles.subtext}; margin-left: 10px;">
                      ${formattedDate} · ${selectedArticle.readTime || '10 min read'}
                    </span>
                  </td>
                </tr>
              </table>

              <!-- Main Title -->
              <h2 class="article-title" style="margin: 0 0 10px 0; font-family: 'Georgia', 'Times New Roman', serif; font-size: 26px; font-weight: 700; color: ${themeStyles.text}; line-height: 1.25;">
                <a href="${articleUrl}" target="_blank" style="color: ${themeStyles.text}; text-decoration: none;">
                  ${selectedArticle.title}
                </a>
              </h2>

              <!-- Subtitle (if present) -->
              ${selectedArticle.subtitle ? `
              <h3 style="margin: 0 0 18px 0; font-family: 'Georgia', serif; font-size: 16px; font-weight: 400; font-style: italic; color: ${themeStyles.subtext}; line-height: 1.45;">
                ${selectedArticle.subtitle}
              </h3>
              ` : ''}

              <!-- Author Byline Block -->
              <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 20px; padding-bottom: 14px; border-bottom: 1px solid ${themeStyles.divider};">
                <tr>
                  <td>
                    <span style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 12px; color: ${themeStyles.subtext};">
                      Author: <strong style="color: ${themeStyles.text};">${(selectedArticle as any).authorName || selectedArticle.author || 'The Oligarchy'}</strong>
                    </span>
                  </td>
                </tr>
              </table>

              <!-- Excerpt Paragraph -->
              <div style="font-family: 'Georgia', serif; font-size: 15px; line-height: 1.7; color: ${themeStyles.text}; margin-bottom: 25px;">
                <p style="margin: 0; text-indent: 18px;">
                  ${selectedArticle.excerpt || 'Exploring systemic authority, criminal psychopathology, and the covert structures governing society.'}
                </p>
              </div>

              <!-- Callout Quote (if enabled) -->
              ${includeQuote ? `
              <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 25px;">
                <tr>
                  <td style="border-left: 3px solid ${themeStyles.border}; padding: 10px 0 10px 18px; background-color: ${themeStyles.boxBg};">
                    <p style="margin: 0; font-family: 'Georgia', serif; font-size: 13.5px; font-style: italic; line-height: 1.55; color: ${themeStyles.subtext};">
                      "Power is rarely overt when it is most effective; it disguises itself in procedure, precedent, and the subtle architecture of compliance."
                    </p>
                  </td>
                </tr>
              </table>
              ` : ''}

              <!-- Call To Action Button -->
              <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin: 30px 0 25px 0;">
                <tr>
                  <td align="center">
                    <a href="${articleUrl}" target="_blank" class="cta-button" style="display: inline-block; background-color: ${themeStyles.buttonBg}; color: ${themeStyles.buttonText}; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 12px; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; text-decoration: none; padding: 14px 32px; border-radius: 2px; box-shadow: 0 2px 6px rgba(0,0,0,0.15);">
                      ${ctaText} &rarr;
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Academic Citation Box (if enabled) -->
              ${includeCitation ? `
              <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-top: 25px; padding: 14px 18px; background-color: ${themeStyles.boxBg}; border: 1px solid ${themeStyles.divider};">
                <tr>
                  <td>
                    <span style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 9px; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; color: ${themeStyles.subtext}; display: block; margin-bottom: 4px;">
                      Standard Academic Citation
                    </span>
                    <p style="margin: 0; font-family: 'Georgia', serif; font-size: 11px; line-height: 1.5; color: ${themeStyles.subtext};">
                      ${selectedArticle.author || 'Jena, P. P.'} (${new Date().getFullYear()}). <em>${selectedArticle.title}</em>. The Oligarchy: Journal of Criminology &amp; Power Dynamics. Available at: ${articleUrl}
                    </p>
                  </td>
                </tr>
              </table>
              ` : ''}

            </td>
          </tr>

          <!-- Footer Legal & Unsubscribe -->
          <tr>
            <td style="padding: 25px 30px; background-color: ${themeStyles.boxBg}; border-top: 1px solid ${themeStyles.divider}; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 11px; line-height: 1.6; color: ${themeStyles.subtext}; text-align: center;">
              <p style="margin: 0 0 6px 0;">
                You are receiving this notification because you subscribed to the research archives at <a href="https://theoligarchy.in" target="_blank" style="color: ${themeStyles.border}; font-weight: 700;">theoligarchy.in</a>.
              </p>
              <p style="margin: 0 0 10px 0; font-size: 10px; color: ${themeStyles.subtext};">
                We respect your inbox. No commercial advertising, tracking beacons, or sponsored material.
              </p>
              <p style="margin: 0; font-size: 10px;">
                <a href="https://theoligarchy.in/feed.xml" target="_blank" style="color: ${themeStyles.subtext}; text-decoration: underline;">RSS Syndication Feed</a> · 
                <a href="https://theoligarchy.in/?tab=principles" target="_blank" style="color: ${themeStyles.subtext}; text-decoration: underline;">Editorial Charter</a> · 
                <a href="https://theoligarchy.in/api/unsubscribe" target="_blank" style="color: ${themeStyles.subtext}; text-decoration: underline;">Self-Service Unsubscribe</a>
              </p>
              <p style="margin: 12px 0 0 0; font-size: 10px; color: ${themeStyles.subtext};">
                © ${currentYear} The Oligarchy. Independent investigative criminology research.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>

</body>
</html>`;
  }, [selectedArticle, theme, preheader, editorsNote, ctaText, includeImage, includeQuote, includeCitation, articleUrl]);

  // Plain Text Version
  const plainTextEmail = useMemo(() => {
    if (!selectedArticle) return '';
    return `THE OLIGARCHY — JOURNAL OF CRIMINOLOGY & POWER SYSTEMS
======================================================
Peer-Reviewed Research Platform · https://theoligarchy.in

NEW DISPATCH: ${selectedArticle.title.toUpperCase()}
Category: ${selectedArticle.category || 'Criminology'}
Author: ${(selectedArticle as any).authorName || selectedArticle.author || 'The Oligarchy'}
Read Time: ${selectedArticle.readTime || '10 min read'}

${selectedArticle.subtitle ? `Subtitle: ${selectedArticle.subtitle}\n` : ''}
${editorsNote.trim() ? `\n--- LETTER FROM THE EDITOR ---\n"${editorsNote.trim()}"\n` : ''}
--- SYNOPSIS ---
${selectedArticle.excerpt}

READ THE COMPLETE EMPIRICAL INVESTIGATION:
${articleUrl}

--- ACADEMIC CITATION ---
${(selectedArticle as any).authorName || selectedArticle.author || 'The Oligarchy'} (${new Date().getFullYear()}). ${selectedArticle.title}. The Oligarchy.
URL: ${articleUrl}

---
You received this email because you subscribed to The Oligarchy research digest.
To read our syndicated RSS feed: https://theoligarchy.in/feed.xml
To unsubscribe, reply to this dispatch or email theoligarchy.ppj@gmail.com
© ${new Date().getFullYear()} The Oligarchy. All rights reserved.
`;
  }, [selectedArticle, editorsNote, articleUrl]);

  // Update iframe preview
  useEffect(() => {
    if (iframeRef.current && (previewDevice === 'desktop' || previewDevice === 'mobile')) {
      const doc = iframeRef.current.contentDocument;
      if (doc) {
        doc.open();
        doc.write(emailHtml);
        doc.close();
      }
    }
  }, [emailHtml, previewDevice]);

  // Copy HTML template
  const handleCopyHtml = async () => {
    try {
      await navigator.clipboard.writeText(emailHtml);
      setCopiedHtml(true);
      setAlert({ text: 'HTML Newsletter Template copied to clipboard.', type: 'success' });
      setTimeout(() => setCopiedHtml(false), 2500);
    } catch (err) {
      setAlert({ text: 'Failed to copy to clipboard.', type: 'error' });
    }
  };

  // Copy Plain Text
  const handleCopyPlaintext = async () => {
    try {
      await navigator.clipboard.writeText(plainTextEmail);
      setCopiedPlaintext(true);
      setAlert({ text: 'Plaintext email copied to clipboard.', type: 'success' });
      setTimeout(() => setCopiedPlaintext(false), 2500);
    } catch (err) {
      setAlert({ text: 'Failed to copy plaintext.', type: 'error' });
    }
  };

  // Download .html file
  const handleDownloadHtml = () => {
    if (!selectedArticle) return;
    const blob = new Blob([emailHtml], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `TheOligarchy_Newsletter_${selectedArticle.id || 'dispatch'}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setAlert({ text: 'Downloaded email template as .html file.', type: 'success' });
  };

  // Open Preview in Full Window
  const handleOpenInNewTab = () => {
    const blob = new Blob([emailHtml], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
  };

  // Send Test Email via Server-Side API
  const handleSendTestEmail = async () => {
    if (!testEmail.trim() || !testEmail.includes('@')) {
      setAlert({ text: 'Please provide a valid test recipient email address.', type: 'error' });
      return;
    }

    setIsSendingTest(true);
    try {
      const response = await fetch('/api/newsletter/send-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          testEmail: testEmail.trim(),
          subject: `[TEST PREVIEW] ${subject}`,
          html: emailHtml,
          articleId: selectedArticle?.id,
          articleTitle: selectedArticle?.title,
          apiKey: resendApiKey.trim() || undefined
        })
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.message || data.error || `Server HTTP ${response.status}`);
      }

      setAlert({ 
        text: `Test email dispatched to ${testEmail}! (${data.provider === 'resend' ? 'Delivered via Resend' : 'Simulated for preview in dev mode'})`, 
        type: 'success' 
      });
    } catch (err: any) {
      setAlert({ text: `Test dispatch error: ${err.message}`, type: 'error' });
    } finally {
      setIsSendingTest(false);
    }
  };

  // Broadcast to All Active Subscribers via Server-Side Dispatch
  const handleBroadcastDispatch = async () => {
    if (subscriberStats.active === 0) {
      setAlert({ text: 'No active subscribers registered in database.', type: 'error' });
      return;
    }

    setIsSendingBroadcast(true);
    setShowBroadcastConfirm(false);

    try {
      const response = await fetch('/api/newsletter/dispatch-published', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          articleId: selectedArticle.id,
          articleTitle: selectedArticle.title,
          articleExcerpt: selectedArticle.excerpt,
          articleSlug: selectedArticle.slug,
          articleCategory: selectedArticle.category,
          articleAuthor: selectedArticle.authorName,
          force: true, // Allow explicit broadcast from preview studio
          subject: subject.trim(),
          html: emailHtml,
          apiKey: resendApiKey.trim() || undefined
        })
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.message || data.error || `Server HTTP ${response.status}`);
      }

      setAlert({ 
        text: `Newsletter broadcast complete: Dispatched to ${data.sentCount || subscriberStats.active} subscribers!`, 
        type: 'success' 
      });
    } catch (err: any) {
      setAlert({ text: `Broadcast delivery failed: ${err.message}`, type: 'error' });
    } finally {
      setIsSendingBroadcast(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 fade-in select-text">
      
      {/* Top Banner Info */}
      <div className="bg-navy/80 border border-paper/10 p-4 rounded-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="font-display text-lg font-bold text-paper flex items-center gap-2">
            <Mail className="text-blood" size={18} />
            Direct Newsletter Dispatch &amp; Syndication Studio
          </h2>
          <p className="font-serif text-xs text-paper/60 mt-1 leading-relaxed">
            Format, inspect, and dispatch academic treatises to your readership. Live interactive preview simulates desktop &amp; mobile mail clients before broadcast.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <a
            href="/feed.xml"
            target="_blank"
            rel="noopener noreferrer"
            className="bg-paper/5 hover:bg-paper/10 border border-paper/15 text-orange-400 font-sans text-[10px] font-bold tracking-wider uppercase py-2 px-3 rounded-sm flex items-center gap-1.5 transition-colors"
            title="Inspect live RSS XML feed in new tab"
          >
            <ExternalLink size={12} /> RSS Feed XML
          </a>
          {onExportCSV && (
            <button
              onClick={onExportCSV}
              className="bg-green-950/30 hover:bg-green-950/40 border border-green-500/20 text-[#8bc4a8] font-sans text-[10px] font-bold tracking-wider uppercase py-2 px-3 rounded-sm flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Download subscriber emails to CSV"
            >
              <FileSpreadsheet size={12} /> Export CSV ({subscribers.length})
            </button>
          )}
        </div>
      </div>

      {/* KPI Metrics Strip: Real Subscriber & Infrastructure Health */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-navy border border-paper/10 p-3.5 rounded-sm">
          <span className="font-sans text-[9px] uppercase tracking-wider text-paper/40 block">Total Subscribers</span>
          <span className="font-mono text-xl font-bold text-paper mt-1 block">{subscriberStats.total}</span>
          <span className="font-serif text-[10px] text-paper/30 mt-0.5 block">Registered in database</span>
        </div>

        <div className="bg-navy border border-paper/10 p-3.5 rounded-sm">
          <span className="font-sans text-[9px] uppercase tracking-wider text-paper/40 block">Active Readership</span>
          <span className="font-mono text-xl font-bold text-[#8bc4a8] mt-1 block">{subscriberStats.active}</span>
          <span className="font-serif text-[10px] text-[#8bc4a8]/50 mt-0.5 block">Eligible for broadcasts</span>
        </div>

        <div className="bg-navy border border-paper/10 p-3.5 rounded-sm">
          <span className="font-sans text-[9px] uppercase tracking-wider text-paper/40 block">Unsubscribed</span>
          <span className="font-mono text-xl font-bold text-paper/50 mt-1 block">{subscriberStats.unsubscribed}</span>
          <span className="font-serif text-[10px] text-paper/30 mt-0.5 block">Opted out of dispatches</span>
        </div>

        <div className="bg-navy border border-paper/10 p-3.5 rounded-sm">
          <span className="font-sans text-[9px] uppercase tracking-wider text-paper/40 block">Delivery Pipeline</span>
          <span className={`font-mono text-sm font-bold mt-1 block flex items-center gap-1.5 ${
            serverStatus?.configured ? 'text-[#8bc4a8]' : 'text-amber-400'
          }`}>
            <span className={`w-2 h-2 rounded-full ${serverStatus?.configured ? 'bg-emerald-500 animate-pulse' : 'bg-amber-400'}`} />
            {serverStatus?.configured ? 'Resend Live' : 'Dev / Config Ready'}
          </span>
          <span className="font-serif text-[10px] text-paper/40 mt-0.5 block truncate">
            {serverStatus?.fromEmail || 'The Oligarchy <newsletter@theoligarchy.in>'}
          </span>
        </div>
      </div>

      {/* Main Grid: Controls on Left, Live Simulator on Right */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
        
        {/* Left 5 Cols: Configuration, Article Selection & Credentials */}
        <div className="xl:col-span-5 flex flex-col gap-5">
          
          {/* Section 1: Target Article Selector */}
          <div className="bg-navy border border-paper/10 rounded-sm p-4 flex flex-col gap-3">
            <div className="flex justify-between items-center border-b border-paper/5 pb-2">
              <label className="font-sans text-[10px] font-bold tracking-widest uppercase text-paper/80 flex items-center gap-1.5">
                <BookOpen size={12} className="text-blood" /> Target Treatise *
              </label>
              <span className="font-mono text-[9px] text-paper/40">
                {publishedArticles.length} Published
              </span>
            </div>

            <select
              value={selectedArticleId}
              onChange={(e) => setSelectedArticleId(e.target.value)}
              className="bg-midnight border border-paper/15 rounded-sm py-2 px-3 text-paper font-serif text-xs focus:outline-none focus:border-blood cursor-pointer w-full"
            >
              {publishedArticles.map((art) => (
                <option key={art.id} value={art.id}>
                  {art.title} {art.category ? `[${art.category}]` : ''} {art.newsletterSent ? '✓ Sent' : ''}
                </option>
              ))}
            </select>

            {selectedArticle && (
              <div className="bg-midnight/60 border border-paper/5 p-2.5 rounded-sm flex flex-col gap-2 text-[11px] font-serif text-paper/60">
                <div className="flex justify-between text-paper/40 font-mono text-[9px] uppercase">
                  <span>{selectedArticle.category || 'Criminology'}</span>
                  <span>{selectedArticle.readTime || '10 min read'}</span>
                </div>
                <p className="line-clamp-2 italic text-paper/70">
                  "{selectedArticle.excerpt || selectedArticle.subtitle || 'Empirical treatise'}"
                </p>

                {/* Newsletter Dispatch Audit Status Badge */}
                <div className="pt-2 border-t border-paper/5 flex items-center justify-between">
                  <span className="font-sans text-[9px] uppercase tracking-wider text-paper/40">Dispatch State:</span>
                  {selectedArticle.newsletterSent ? (
                    <span className="inline-flex items-center gap-1 font-sans text-[9px] font-bold uppercase tracking-wider text-[#8bc4a8] bg-green-950/30 border border-green-500/30 px-2 py-0.5 rounded-xs">
                      <CheckCircle2 size={10} className="text-[#8bc4a8]" /> Sent to {selectedArticle.newsletterSentCount || 0} Readers ({selectedArticle.newsletterSentAt ? new Date(selectedArticle.newsletterSentAt).toLocaleDateString('en-GB') : 'Recorded'})
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 font-sans text-[9px] font-bold uppercase tracking-wider text-amber-300 bg-amber-950/20 border border-amber-500/30 px-2 py-0.5 rounded-xs">
                      <Mail size={10} className="text-amber-300" /> Pending Broadcast
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Section 2: Email Details & Customization */}
          <div className="bg-navy border border-paper/10 rounded-sm p-4 flex flex-col gap-4">
            <h3 className="font-sans text-[10px] font-bold tracking-widest uppercase text-paper/80 border-b border-paper/5 pb-2 flex items-center gap-1.5">
              <Sparkles size={12} className="text-blood" /> Dispatch Styling &amp; Copy
            </h3>

            {/* Subject Line */}
            <div className="flex flex-col gap-1">
              <label className="font-sans text-[9px] uppercase tracking-wider text-paper/40">
                Email Subject Line
              </label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Subject of the email newsletter..."
                className="bg-midnight border border-paper/15 rounded-sm py-2 px-3 text-paper font-serif text-xs focus:outline-none focus:border-blood"
              />
            </div>

            {/* Preheader Snippet */}
            <div className="flex flex-col gap-1">
              <div className="flex justify-between">
                <label className="font-sans text-[9px] uppercase tracking-wider text-paper/40">
                  Inbox Preview Snippet (Preheader)
                </label>
                <span className="font-mono text-[9px] text-paper/30">Shows in inbox preview</span>
              </div>
              <input
                type="text"
                value={preheader}
                onChange={(e) => setPreheader(e.target.value)}
                placeholder="Preview text shown in Gmail / Apple Mail notification..."
                className="bg-midnight border border-paper/15 rounded-sm py-2 px-3 text-paper font-serif text-xs focus:outline-none focus:border-blood"
              />
            </div>

            {/* Foreword / Editor's Note */}
            <div className="flex flex-col gap-1">
              <div className="flex justify-between">
                <label className="font-sans text-[9px] uppercase tracking-wider text-paper/40">
                  Letter From The Editor (Optional Foreword)
                </label>
                <span className="font-mono text-[9px] text-paper/30">Personal note</span>
              </div>
              <textarea
                rows={2}
                value={editorsNote}
                onChange={(e) => setEditorsNote(e.target.value)}
                placeholder="e.g., Dear Colleagues, this week's treatise breaks down the judicial mechanisms..."
                className="bg-midnight border border-paper/15 rounded-sm py-2 px-3 text-paper font-serif text-xs focus:outline-none focus:border-blood resize-none"
              />
            </div>

            {/* CTA Button Text & Theme */}
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="font-sans text-[9px] uppercase tracking-wider text-paper/40">
                  CTA Button Text
                </label>
                <input
                  type="text"
                  value={ctaText}
                  onChange={(e) => setCtaText(e.target.value)}
                  className="bg-midnight border border-paper/15 rounded-sm py-1.5 px-2.5 text-paper font-serif text-xs focus:outline-none focus:border-blood"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-sans text-[9px] uppercase tracking-wider text-paper/40">
                  Color Archetype
                </label>
                <select
                  value={theme}
                  onChange={(e) => setTheme(e.target.value as NewsletterTheme)}
                  className="bg-midnight border border-paper/15 rounded-sm py-1.5 px-2 text-paper text-xs cursor-pointer focus:outline-none focus:border-blood"
                >
                  <option value="scholarly">Classic Scholarly Light</option>
                  <option value="parchment">Archive Parchment</option>
                  <option value="midnight">Midnight Gazette Dark</option>
                </select>
              </div>
            </div>

            {/* Layout Toggles */}
            <div className="border-t border-paper/5 pt-3 flex flex-wrap gap-4 text-xs font-serif text-paper/70">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={includeImage}
                  onChange={(e) => setIncludeImage(e.target.checked)}
                  className="accent-blood rounded cursor-pointer"
                />
                <span>Hero Banner</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={includeQuote}
                  onChange={(e) => setIncludeQuote(e.target.checked)}
                  className="accent-blood rounded cursor-pointer"
                />
                <span>Editorial Quote Callout</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={includeCitation}
                  onChange={(e) => setIncludeCitation(e.target.checked)}
                  className="accent-blood rounded cursor-pointer"
                />
                <span>Academic Citation</span>
              </label>
            </div>
          </div>

          {/* Section 3: Delivery Credentials & Test Dispatch */}
          <div className="bg-navy border border-paper/10 rounded-sm p-4 flex flex-col gap-4">
            <h3 className="font-sans text-[10px] font-bold tracking-widest uppercase text-paper/80 border-b border-paper/5 pb-2 flex items-center gap-1.5">
              <Send size={12} className="text-blood" /> Resend Delivery Credentials &amp; Test
            </h3>

            {/* Resend API Key */}
            <div className="flex flex-col gap-1">
              <div className="flex justify-between items-center">
                <label className="font-sans text-[9px] uppercase tracking-wider text-paper/40">
                  Resend API Key
                </label>
                <span className="font-mono text-[9px] text-paper/30">Stored locally in browser</span>
              </div>
              <div className="relative">
                <input
                  type={showApiKey ? 'text' : 'password'}
                  placeholder="re_xxxxxxxxxxxxxxxxx"
                  value={resendApiKey}
                  onChange={(e) => handleApiKeyChange(e.target.value)}
                  className="w-full bg-midnight border border-paper/15 rounded-sm py-2 pl-3 pr-9 text-paper font-mono text-xs focus:outline-none focus:border-blood placeholder-paper/15"
                />
                <button
                  type="button"
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="absolute right-2.5 top-2.5 text-paper/40 hover:text-paper transition-colors cursor-pointer"
                  title={showApiKey ? 'Hide key' : 'Show key'}
                >
                  {showApiKey ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            {/* Test Send Row */}
            <div className="flex flex-col gap-2 pt-2 border-t border-paper/5">
              <label className="font-sans text-[9px] uppercase tracking-wider text-paper/40">
                Send Test Dispatch
              </label>
              <div className="flex gap-2">
                <input
                  type="email"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  placeholder="your-email@example.com"
                  className="flex-1 bg-midnight border border-paper/15 rounded-sm py-2 px-3 text-paper font-mono text-xs focus:outline-none focus:border-blood"
                />
                <button
                  onClick={handleSendTestEmail}
                  disabled={isSendingTest || !resendApiKey.trim()}
                  className={`font-sans text-[10px] font-bold tracking-wider uppercase py-2 px-3 rounded-sm flex items-center gap-1.5 shrink-0 cursor-pointer transition-all ${
                    isSendingTest || !resendApiKey.trim()
                      ? 'bg-paper/5 text-paper/30 border border-paper/10 cursor-not-allowed'
                      : 'bg-paper/10 hover:bg-paper/20 border border-paper/20 text-paper'
                  }`}
                  title="Send a sample email to inspect formatting in your personal client"
                >
                  {isSendingTest ? (
                    <div className="w-3 h-3 border-t-2 border-paper rounded-full animate-spin" />
                  ) : (
                    <Mail size={12} />
                  )}
                  <span>Test Send</span>
                </button>
              </div>
            </div>

            {/* Broadcast Button */}
            <div className="pt-2">
              <button
                onClick={() => setShowBroadcastConfirm(true)}
                disabled={isSendingBroadcast || subscriberStats.active === 0 || (!resendApiKey.trim() && !serverStatus?.configured)}
                className={`w-full font-sans text-[11px] font-bold tracking-widest uppercase py-3 px-4 rounded-sm flex items-center justify-center gap-2 cursor-pointer transition-all shadow-md ${
                  isSendingBroadcast || subscriberStats.active === 0 || (!resendApiKey.trim() && !serverStatus?.configured)
                    ? 'bg-paper/5 text-paper/30 border border-paper/10 cursor-not-allowed'
                    : 'bg-blood hover:bg-blood-light text-paper'
                }`}
              >
                {isSendingBroadcast ? (
                  <>
                    <div className="w-4 h-4 border-t-2 border-paper rounded-full animate-spin" />
                    Broadcasting to {subscriberStats.active} Active Subscribers...
                  </>
                ) : (
                  <>
                    <Send size={13} />
                    Dispatch Alert to {subscriberStats.active} Active Subscribers
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Section 4: Mailing List Quick View */}
          <div className="bg-navy border border-paper/10 rounded-sm p-4 flex flex-col gap-3">
            <div className="flex justify-between items-center border-b border-paper/5 pb-2">
              <h4 className="font-sans text-[10px] font-bold tracking-widest uppercase text-paper/80 flex items-center gap-1.5">
                <UserCheck size={12} className="text-blood" /> Readership Registry ({subscribers.length})
              </h4>
              {onExportCSV && (
                <button
                  onClick={onExportCSV}
                  className="font-sans text-[8px] tracking-wider uppercase text-blood hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <Download size={10} /> CSV
                </button>
              )}
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-1 bg-midnight p-0.5 rounded-sm border border-paper/10 text-[9px] font-sans">
              <button
                onClick={() => setSubscriberFilter('all')}
                className={`flex-1 py-1 px-1.5 rounded-xs uppercase tracking-wider text-center cursor-pointer transition-colors ${
                  subscriberFilter === 'all' ? 'bg-paper/15 text-paper font-bold' : 'text-paper/40 hover:text-paper/80'
                }`}
              >
                All ({subscriberStats.total})
              </button>
              <button
                onClick={() => setSubscriberFilter('active')}
                className={`flex-1 py-1 px-1.5 rounded-xs uppercase tracking-wider text-center cursor-pointer transition-colors ${
                  subscriberFilter === 'active' ? 'bg-green-950/40 text-[#8bc4a8] font-bold' : 'text-paper/40 hover:text-[#8bc4a8]'
                }`}
              >
                Active ({subscriberStats.active})
              </button>
              <button
                onClick={() => setSubscriberFilter('unsubscribed')}
                className={`flex-1 py-1 px-1.5 rounded-xs uppercase tracking-wider text-center cursor-pointer transition-colors ${
                  subscriberFilter === 'unsubscribed' ? 'bg-rose-950/40 text-rose-400 font-bold' : 'text-paper/40 hover:text-rose-400'
                }`}
              >
                Opted-Out ({subscriberStats.unsubscribed})
              </button>
            </div>

            {filteredSubscribers.length === 0 ? (
              <div className="py-6 text-center text-paper/30 font-serif italic text-xs">
                No subscribers match filter criteria.
              </div>
            ) : (
              <div className="max-h-[180px] overflow-y-auto divide-y divide-paper/5 pr-1">
                {filteredSubscribers.map((sub, idx) => (
                  <div key={sub.id || idx} className="py-2 first:pt-0 flex justify-between items-center text-xs font-serif text-paper/70">
                    <div className="flex flex-col min-w-0 pr-2">
                      <span className="truncate select-text font-medium text-paper/85">{sub.email}</span>
                      <div className="flex items-center gap-1.5 mt-0.5 font-sans text-[8px]">
                        {sub.status === 'unsubscribed' ? (
                          <span className="uppercase tracking-wider text-rose-400 font-bold bg-rose-950/30 border border-rose-800/40 px-1 py-0.5 rounded-xs">
                            Unsubscribed
                          </span>
                        ) : (
                          <span className="uppercase tracking-wider text-[#8bc4a8] font-bold bg-green-950/30 border border-green-800/40 px-1 py-0.5 rounded-xs">
                            Active
                          </span>
                        )}
                        <span className="text-paper/30 font-mono">
                          Subscribed: {new Date(sub.subscribedAt || Date.now()).toLocaleDateString('en-GB')}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {onDeleteSubscriber && (
                        deleteConfirmSubscriberId === sub.id ? (
                          <div className="flex items-center gap-1 bg-red-950/40 border border-red-900/50 px-1 py-0.5 rounded-sm">
                            <span className="text-[7px] text-red-400 font-bold uppercase">Del?</span>
                            <button
                              onClick={() => {
                                onDeleteSubscriber(sub.id);
                                setDeleteConfirmSubscriberId(null);
                              }}
                              className="text-[7px] bg-red-800 text-white font-bold px-1 rounded-sm cursor-pointer"
                            >
                              Yes
                            </button>
                            <button
                              onClick={() => setDeleteConfirmSubscriberId(null)}
                              className="text-[7px] bg-paper/10 text-paper/70 font-bold px-1 rounded-sm cursor-pointer"
                            >
                              No
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setDeleteConfirmSubscriberId(sub.id)}
                            className="text-red-400/50 hover:text-red-400 p-1 rounded cursor-pointer transition-colors"
                            title="Remove subscriber record"
                          >
                            <Trash2 size={12} />
                          </button>
                        )
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* Right 7 Cols: Interactive Viewport Simulator & Code Exporter */}
        <div className="xl:col-span-7 flex flex-col gap-4">
          
          {/* Viewport Control Bar */}
          <div className="bg-navy border border-paper/10 p-3 rounded-sm flex flex-wrap justify-between items-center gap-3">
            {/* Device Switcher Tabs */}
            <div className="flex items-center gap-1 bg-midnight p-1 rounded-sm border border-paper/10">
              <button
                onClick={() => setPreviewDevice('desktop')}
                className={`font-sans text-[10px] font-bold tracking-wider uppercase py-1 px-3 rounded-sm flex items-center gap-1.5 transition-colors cursor-pointer ${
                  previewDevice === 'desktop'
                    ? 'bg-paper/15 text-paper'
                    : 'text-paper/40 hover:text-paper/80'
                }`}
                title="Simulate 640px desktop email layout"
              >
                <Monitor size={12} /> Desktop (640px)
              </button>

              <button
                onClick={() => setPreviewDevice('mobile')}
                className={`font-sans text-[10px] font-bold tracking-wider uppercase py-1 px-3 rounded-sm flex items-center gap-1.5 transition-colors cursor-pointer ${
                  previewDevice === 'mobile'
                    ? 'bg-paper/15 text-paper'
                    : 'text-paper/40 hover:text-paper/80'
                }`}
                title="Simulate 375px mobile device screen"
              >
                <Smartphone size={12} /> Mobile (375px)
              </button>

              <button
                onClick={() => setPreviewDevice('code')}
                className={`font-sans text-[10px] font-bold tracking-wider uppercase py-1 px-3 rounded-sm flex items-center gap-1.5 transition-colors cursor-pointer ${
                  previewDevice === 'code'
                    ? 'bg-paper/15 text-paper'
                    : 'text-paper/40 hover:text-paper/80'
                }`}
                title="View and copy clean HTML email markup"
              >
                <Code size={12} /> HTML Code
              </button>

              <button
                onClick={() => setPreviewDevice('plaintext')}
                className={`font-sans text-[10px] font-bold tracking-wider uppercase py-1 px-3 rounded-sm flex items-center gap-1.5 transition-colors cursor-pointer ${
                  previewDevice === 'plaintext'
                    ? 'bg-paper/15 text-paper'
                    : 'text-paper/40 hover:text-paper/80'
                }`}
                title="Plaintext ASCII email format"
              >
                <FileText size={12} /> Plain Text
              </button>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleCopyHtml}
                className="bg-midnight hover:bg-paper/10 border border-paper/15 text-blood-light font-sans text-[10px] font-bold tracking-wider uppercase py-1.5 px-3 rounded-sm flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Copy ready-to-send HTML into clipboard for Substack / Mailchimp"
              >
                {copiedHtml ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
                <span>{copiedHtml ? 'Copied HTML!' : 'Copy HTML'}</span>
              </button>

              <button
                onClick={handleDownloadHtml}
                className="bg-midnight hover:bg-paper/10 border border-paper/15 text-paper/70 font-sans text-[10px] font-bold tracking-wider uppercase py-1.5 px-2.5 rounded-sm flex items-center gap-1 transition-colors cursor-pointer"
                title="Download .html file"
              >
                <Download size={12} />
              </button>

              <button
                onClick={handleOpenInNewTab}
                className="bg-midnight hover:bg-paper/10 border border-paper/15 text-paper/70 font-sans text-[10px] font-bold tracking-wider uppercase py-1.5 px-2.5 rounded-sm flex items-center gap-1 transition-colors cursor-pointer"
                title="Preview in full browser window"
              >
                <ExternalLink size={12} />
              </button>
            </div>
          </div>

          {/* Viewport Canvas Container */}
          <div className="bg-[#0e0e12] border border-paper/15 rounded-sm p-4 flex justify-center items-start min-h-[640px] max-h-[820px] overflow-y-auto">
            
            {/* Desktop Viewport (640px) */}
            {previewDevice === 'desktop' && (
              <div className="w-full max-w-[640px] bg-white rounded-sm shadow-2xl border border-black/20 overflow-hidden flex flex-col">
                {/* Simulated Mail Client Window Chrome */}
                <div className="bg-[#f0f0f0] border-b border-[#dddddd] px-4 py-2 flex items-center justify-between text-xs text-[#666666]">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#ff5f56]" />
                    <span className="w-2.5 h-2.5 rounded-full bg-[#ffbd2e]" />
                    <span className="w-2.5 h-2.5 rounded-full bg-[#27c93f]" />
                    <span className="ml-2 font-mono text-[10px] text-[#888888]">From: The Oligarchy &lt;newsletter@theoligarchy.in&gt;</span>
                  </div>
                  <span className="font-mono text-[10px] text-[#888888] truncate max-w-[200px]">
                    Subj: {subject}
                  </span>
                </div>

                {/* Sandboxed iframe */}
                <iframe
                  ref={iframeRef}
                  title="Newsletter Desktop Preview"
                  className="w-full h-[680px] border-0"
                  sandbox="allow-same-origin"
                />
              </div>
            )}

            {/* Mobile Viewport (375px iPhone Chassis) */}
            {previewDevice === 'mobile' && (
              <div className="w-[375px] bg-[#1a1a1f] p-3 rounded-[32px] shadow-2xl border-4 border-[#33333d] flex flex-col items-center">
                {/* Simulated Phone Speaker & Camera Notch */}
                <div className="w-24 h-4 bg-black rounded-full mb-3 flex items-center justify-center">
                  <div className="w-2 h-2 rounded-full bg-[#111116] mr-2" />
                  <div className="w-8 h-1 bg-[#22222a] rounded-full" />
                </div>

                {/* Phone Screen Display */}
                <div className="w-full bg-white rounded-[20px] overflow-hidden flex flex-col shadow-inner">
                  {/* Phone Status Bar */}
                  <div className="bg-[#f7f7f7] border-b border-[#e5e5e5] px-3 py-1.5 flex justify-between items-center text-[9px] font-sans font-bold text-[#555555]">
                    <span>09:41</span>
                    <span className="truncate max-w-[180px] font-normal">{subject}</span>
                    <span>100%</span>
                  </div>

                  {/* Sandboxed iframe */}
                  <iframe
                    ref={iframeRef}
                    title="Newsletter Mobile Preview"
                    className="w-full h-[580px] border-0"
                    sandbox="allow-same-origin"
                  />
                </div>

                {/* Phone Home Bar */}
                <div className="w-28 h-1 bg-[#444450] rounded-full mt-3" />
              </div>
            )}

            {/* HTML Code View */}
            {previewDevice === 'code' && (
              <div className="w-full flex flex-col gap-2">
                <div className="flex justify-between items-center px-1">
                  <span className="font-mono text-[10px] text-paper/40 uppercase tracking-widest">
                    HTML Email Source Code ({emailHtml.length.toLocaleString()} bytes)
                  </span>
                  <button
                    onClick={handleCopyHtml}
                    className="text-blood font-sans text-[9px] font-bold tracking-wider uppercase hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Copy size={10} /> {copiedHtml ? 'Copied' : 'Copy All'}
                  </button>
                </div>
                <div className="bg-midnight border border-paper/10 rounded-sm p-4 font-mono text-[10px] text-paper/60 whitespace-pre-wrap select-text leading-relaxed overflow-x-auto max-h-[660px]">
                  {emailHtml}
                </div>
              </div>
            )}

            {/* Plaintext View */}
            {previewDevice === 'plaintext' && (
              <div className="w-full flex flex-col gap-2">
                <div className="flex justify-between items-center px-1">
                  <span className="font-mono text-[10px] text-paper/40 uppercase tracking-widest">
                    Plaintext ASCII Digest
                  </span>
                  <button
                    onClick={handleCopyPlaintext}
                    className="text-blood font-sans text-[9px] font-bold tracking-wider uppercase hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Copy size={10} /> {copiedPlaintext ? 'Copied' : 'Copy Plaintext'}
                  </button>
                </div>
                <div className="bg-midnight border border-paper/10 rounded-sm p-4 font-mono text-[11px] text-paper/70 whitespace-pre-wrap select-text leading-relaxed max-h-[660px] overflow-y-auto">
                  {plainTextEmail}
                </div>
              </div>
            )}

          </div>

        </div>

      </div>

      {/* Broadcast Confirmation Modal */}
      {showBroadcastConfirm && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-navy border border-paper/20 rounded-sm p-6 max-w-md w-full shadow-2xl flex flex-col gap-4 fade-in">
            <div className="flex items-center gap-3 border-b border-paper/10 pb-3">
              <div className="w-9 h-9 rounded-full bg-blood/20 border border-blood/40 flex items-center justify-center text-blood">
                <Send size={16} />
              </div>
              <div>
                <h3 className="font-display text-base font-bold text-paper">
                  Confirm Broadcast Dispatch
                </h3>
                <p className="font-serif text-xs text-paper/50">
                  Direct deliver to all registered subscribers
                </p>
              </div>
            </div>

            <div className="bg-midnight border border-paper/10 p-3.5 rounded-sm flex flex-col gap-2 text-xs font-serif text-paper/70">
              <div className="flex justify-between">
                <span className="text-paper/40">Recipients:</span>
                <strong className="text-paper font-sans">{subscribers.length} Subscribers</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-paper/40">Sender:</span>
                <span className="font-mono text-[11px] text-paper/90">newsletter@theoligarchy.in</span>
              </div>
              <div className="flex justify-between">
                <span className="text-paper/40">Subject:</span>
                <span className="font-semibold text-paper/90 truncate max-w-[240px]">{subject}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-paper/40">Article:</span>
                <span className="italic text-paper/90 truncate max-w-[240px]">{selectedArticle?.title}</span>
              </div>
            </div>

            <p className="text-[11px] font-serif text-paper/50 leading-relaxed">
              This action will invoke the Resend API to deliver the formatted email template to all active emails in your registry. Please verify that your subject line and formatting are accurate.
            </p>

            <div className="flex justify-end gap-2 pt-2 border-t border-paper/10">
              <button
                onClick={() => setShowBroadcastConfirm(false)}
                className="font-sans text-[10px] font-bold uppercase tracking-wider px-4 py-2 rounded-sm bg-paper/10 hover:bg-paper/15 text-paper/70 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleBroadcastDispatch}
                className="font-sans text-[10px] font-bold uppercase tracking-wider px-4 py-2 rounded-sm bg-blood hover:bg-blood-light text-paper transition-colors flex items-center gap-1.5 cursor-pointer shadow-md"
              >
                <Send size={11} /> Confirm &amp; Dispatch
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
