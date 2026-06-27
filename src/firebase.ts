import { initializeApp, getApp, getApps } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, setDoc, query, where, orderBy, getDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { Article, ReadingItem, ResearchTip, NewsletterSubscriber } from './types';

// Read configuration
const firebaseConfig = {
  projectId: "balmy-framing-jj1d7",
  appId: "1:214639932128:web:eac4df8af286d485129685",
  apiKey: "AIzaSyAsbdYOc7qhoaOauFUi5qiELvxKHgFICjg",
  authDomain: "balmy-framing-jj1d7.firebaseapp.com",
  firestoreDatabaseId: "ai-studio-theoligarchy-56998575-a2c5-4cbc-8cbc-dd66e1c68ca1",
  storageBucket: "balmy-framing-jj1d7.firebasestorage.app",
  messagingSenderId: "214639932128",
};

// Initialize Firebase
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
const auth = getAuth(app);

export { app, db, auth };

// Seed initial articles if Firestore is empty
export async function seedInitialDataIfEmpty() {
  try {
    const articlesCol = collection(db, 'articles');
    const articlesSnapshot = await getDocs(articlesCol);
    
    if (articlesSnapshot.empty) {
      console.log('Database empty. Seeding initial academic-journal articles...');
      const seedArticles: Article[] = [
        {
          id: 'psychology-serial-killers-1',
          title: 'The Psychology of Serial Killers',
          subtitle: 'Part 1: The Pathology of Power and Fantasy',
          slug: 'psychology-of-serial-killers-part-1',
          category: 'psyche',
          tags: ['Behavioural Psychology', 'Case Study', 'Criminology'],
          featuredImage: 'https://images.unsplash.com/photo-1509248961158-e54f6934749c?auto=format&fit=crop&q=80&w=1200',
          authorId: 'priyasha-priyal-jena',
          authorName: 'Priyasha Priyal Jena',
          readTime: '14 min read',
          excerpt: 'An investigation into the intra-psychic structures of serial offenders, exploring the intersections of pathological fantasy, childhood trauma, and the pursuit of absolute control.',
          content: `
            <h2>Introduction</h2>
            <p>The phenomenon of the serial killer occupies a unique position in both criminological theory and the public imagination. Far from the sensationalised caricatures presented in tabloid media, the reality of the serial offender lies in a complex matrix of developmental trauma, neurobiological predisposition, and severe psychological pathology. This research paper examines the cognitive mechanisms, fantasy structures, and pathological behaviors that define these rare but highly destructive offenders.</p>
            
            <h2>The Role of Omnipotent Fantasy</h2>
            <p>At the core of the serial offender's pathology is a highly structured, persistent fantasy world. Criminological studies suggest that for the individual who eventually commits multiple homicide, fantasy functions as a crucial coping mechanism during formative, traumatic years. When faced with absolute powerlessness in their domestic environments, the individual retreats into internal scenarios of absolute control, domination, and omnipotence.</p>
            <blockquote>"Fantasy is the psychological blueprint for the physical act of destruction. It does not merely accompany the crime; it drives it, refines it, and demands its eventual repetition."</blockquote>
            <p>Over time, these fantasies become increasingly sadistic and ritualized. The transition from pure fantasy to active behavior is a critical juncture. Once the physical boundary is crossed, the offender discovers a profound discrepancy between the perfect control of the mental fantasy and the unpredictable reality of the physical world. This discrepancy drives the repetitive cycle of haptic seeking and ritualistic escalation, as the offender repeatedly attempts to recreate the absolute control imagined in their mind.</p>

            <h2>Neurological and Socio-Environmental Synergies</h2>
            <p>Modern forensic psychology emphasizes that serial homicide is rarely the result of a single isolated cause. Rather, it emerges from a toxic synergy between several developmental and biological factors:</p>
            <ul>
              <li><strong>Severe Neurological Under-Arousal:</strong> Many serial offenders exhibit abnormal prefrontal cortex activity, resulting in a deficit in emotional empathy, poor impulse control, and an extremely high threshold for boredom and physiological arousal.</li>
              <li><strong>Developmental Attachment Disruptions:</strong> Chronic childhood abuse, severe neglect, and the absence of a stable primary caretaker undermine the child's capacity for empathy, leading to severe personality fragmentation.</li>
              <li><strong>The McDonald Triad:</strong> While debated, historical indicators such as persistent enuresis, pyromania, and cruelty to animals are often noted as early markers of systemic behavioral dysregulation.</li>
            </ul>

            <h2>Conclusion</h2>
            <p>Understanding the severe psychiatric underpinnings of serial killers is essential to formulating effective forensic models. By analyzing the structural progression of fantasy systems, investigators can better decode crime scene behavior, anticipate offender patterns, and build predictive behavioral profiles.</p>
          `,
          status: 'published',
          publishDate: '2026-05-12',
          createdAt: Date.now() - 3600000 * 24 * 30,
          updatedAt: Date.now() - 3600000 * 24 * 30,
          views: 312,
          isFeatured: true,
          isPinned: true,
          seriesName: 'The Psychology of Serial Killers',
          seriesPart: 1,
          sources: [
            { category: 'academic', title: 'Hickey, E. W. (2015). Serial Murderers and Their Victims (7th ed.). Cengage Learning.', citation: 'Academic Monograph' },
            { category: 'journal' as any, title: 'Douglas, J. E., Ressler, R. K., Burgess, A. W., & Hartman, C. R. (1986). Criminal profiling from crime scene analysis. Behavioral Sciences & the Law, 4(4), 401-421.', citation: 'Journal Paper' }
          ]
        },
        {
          id: 'understanding-oligarchies-1',
          title: 'Understanding Oligarchies',
          subtitle: 'Part 1: The Iron Law of Oligarchy in Modern Bureaucracies',
          slug: 'understanding-oligarchies-part-1',
          category: 'politics',
          tags: ['Political Science', 'Systems of Power', 'Institutions'],
          featuredImage: 'https://images.unsplash.com/photo-1541872703-74c5e44368f9?auto=format&fit=crop&q=80&w=1200',
          authorId: 'priyasha-priyal-jena',
          authorName: 'Priyasha Priyal Jena',
          readTime: '18 min read',
          excerpt: 'An exploration of Robert Michels’ famous "Iron Law of Oligarchy" and its persistence inside supposedly democratic institutions, administrative systems, and digital networks.',
          content: `
            <h2>Introduction</h2>
            <p>Why do organizations designed to advance democratic values almost invariably consolidate power in the hands of a small elite? In 1911, sociologist Robert Michels formulated what he termed the "Iron Law of Oligarchy": <em>"Who says organization, says oligarchy."</em> This paper investigates Michels' structural thesis, examining how administrative necessity, psychological asymmetrical traits, and institutional incentives collude to centralize influence.</p>
            
            <h2>The Structural Necessity of Expertise</h2>
            <p>The primary driver of power centralization is administrative necessity. In a small, primitive group, direct collective decision-making is feasible. However, as an organization expands, its administrative burdens grow exponentially. Direct democracy becomes inefficient and gridlocked.</p>
            <p>To survive and achieve its institutional objectives, the organization must specialize. It appoints committees, delegates authority, and hires full-time managers. This structural specialization immediately establishes an information asymmetry:</p>
            <blockquote>"The administrative elite commands specialized procedural knowledge, direct control over channels of communication, and continuous focus that the broader membership, divided by their own private concerns, cannot match."</blockquote>
            <p>Consequently, the membership becomes dependent on the administrative class. The leadership's specialized skill set transforms their temporary administrative role into a permanent position of sovereign control.</p>

            <h2>Psychological Dynamics of Leadership and Membership</h2>
            <p>In addition to structural dynamics, power centralization is maintained by mutual psychological needs:</p>
            <ul>
              <li><strong>The Need for Security and Guidance:</strong> The vast majority of organization members prefer delegation over active participation, avoiding the exhausting effort required for deep systemic analysis and governance.</li>
              <li><strong>The Professionalization of Leadership:</strong> Leaders, having transitioned from labor to management, develop an intense existential interest in maintaining their elevated status. The preservation of the organization's administration becomes synonymous with their personal livelihood.</li>
              <li><strong>Ideological Consolidation:</strong> Over time, the elite establishes boundaries on what is deemed acceptable ideological thought, systematically marginalizing internal challengers.</li>
            </ul>

            <h2>The Digital Imperative</h2>
            <p>One might assume that modern digital networks would disrupt the Iron Law of Oligarchy by decentralizing communications. In reality, internet platforms and social systems have merely accelerated oligarchical consolidation. Algorithmic structures, technical moderation, and attention asymmetries have created digital oligarchies where influence is even more tightly concentrated than in historical institutions.</p>

            <h2>Conclusion</h2>
            <p>Michels’ Iron Law remains one of the most powerful and sobering concepts in political theory. It challenges us to abandon the naive assumption that democratic ideals automatically translate into democratic practices. To protect human freedom, we must design institutions with strict systemic checks, transparency, and regular structural audits, recognizing that power naturally pools at the top.</p>
          `,
          status: 'published',
          publishDate: '2026-06-01',
          createdAt: Date.now() - 3600000 * 24 * 10,
          updatedAt: Date.now() - 3600000 * 24 * 10,
          views: 456,
          isFeatured: false,
          isPinned: false,
          seriesName: 'Understanding Oligarchies',
          seriesPart: 1,
          sources: [
            { category: 'book', title: 'Michels, R. (1911). Political Parties: A Sociological Study of the Oligarchical Tendencies of Modern Democracy.', citation: 'Classic Sociological Text' },
            { category: 'academic', title: 'Weber, M. (1922). Economy and Society. University of California Press.', citation: 'Bureaucracy Theory' }
          ]
        }
      ];

      for (const article of seedArticles) {
        await setDoc(doc(db, 'articles', article.id), article);
      }
      
      // Also seed a default reading item
      const readingCol = collection(db, 'reading');
      const sampleBook: ReadingItem = {
        id: 'book-1',
        title: 'The Anatomy of Human Destructiveness',
        author: 'Erich Fromm',
        link: 'https://www.goodreads.com/book/show/11545.The_Anatomy_of_Human_Destructiveness',
        addedAt: Date.now()
      };
      await setDoc(doc(db, 'reading', sampleBook.id), sampleBook);
      
      console.log('Seeding complete.');
    }
  } catch (error) {
    console.error('Error seeding database:', error);
  }
}
