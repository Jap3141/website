import React, { useState, useEffect, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, addDoc, onSnapshot } from 'firebase/firestore';

const PALETTE_EFFECTS = [
  { id: 'shiny', name: '✨ Shiny Metal' },
  { id: 'stone', name: '🪨 Carved Stone' },
  { id: 'plaster', name: '🧱 Ancient Plaster' },
  { id: 'vellum', name: '📜 Old Vellum' },
  { id: 'plain', name: '🎨 Classic Flat' }
];

const QUESTIONS = [
  "When a close friend is upset, your natural instinct is to offer a practical, step-by-step solution rather than just emotional validation.",
  "You find yourself highly affected by the visual aesthetics, lighting, or cleanliness of the room you are sitting in.",
  "If a cashier accidentally gives you five dollars too much in change, you would feel genuinely uncomfortable keeping it and would return it.",
  "You feel more energized after a lively, deep conversation with a group of people than after a quiet evening alone with a book or movie.",
  "Your desk, digital files, or living spaces are meticulously organized; chaos in your environment stresses you out.",
  "You rarely feel intense anxiety or worry about worst-case scenarios; you tend to trust that things will work out.",
  "You are deeply fascinated by abstract theories, philosophy, or complex systemic concepts that don't have an immediate practical application.",
  "If someone cuts you off in traffic or treats you unfairly, you find it easy to let go of the anger quickly.",
  "You prefer a predictable routine over a spontaneous, last-minute change of plans, even if the change sounds fun.",
  "You care deeply about personal recognition and title, and you enjoy being the center of attention when you succeed.",
  "You find immense satisfaction in working with your hands, building physical objects, or fixing mechanical things.",
  "When faced with a new statement or \"fact,\" your default mode is to research the data and verify the evidence yourself.",
  "You would gladly take on the role of organizing, leading, and managing a large group project to ensure it succeeds.",
  "Expressing yourself creatively—through music, art, writing, or design—is an essential daily need for you, not just a casual hobby.",
  "You are the person your friends always turn to when they need a mediator, an empathetic listener, or help navigating a conflict.",
  "You genuinely love working with data, spreadsheets, mathematical patterns, or highly structured schedules.",
  "You frequently experience a deep sense of awe and gratitude when looking at a sunset, listening to great music, or seeing a brilliant idea come together.",
  "You are highly driven by a sense of justice; you cannot stand by quietly if you see someone being treated unfairly.",
  "You place a massive value on lifelong learning, constantly diving down rabbit holes to master new, random skills.",
  "Forgiveness comes easily to you; you believe holding onto a grudge is a waste of your personal mental energy.",
  "You often feel a deep longing for \"something more\" or a sense that your current environment is too small for your ultimate potential.",
  "You value your personal freedom and independence far more than fitting into traditional expectations or societal norms.",
  "You have a habit of looking past people's flaws or rough interiors to find the hidden good or potential inside them.",
  "You are highly protective of your family or community, and you would gladly make major personal sacrifices to keep them safe.",
  "Curiosity gets the best of you; if a door says \"Do Not Enter,\" it makes you want to open it even more.",
  "You rely heavily on your quick wit, sharp mind, and resourcefulness to get yourself out of tough or unexpected situations.",
  "You love daydreaming about the future and planning big, ambitious goals, sometimes missing what is happening right in front of you.",
  "You believe that rules and traditions exist for a good reason, and you find comfort in honoring duty and heritage.",
  "You are naturally highly observant, often noticing the subtle emotional shifts or hidden details in a room that everyone else misses.",
  "You speak your mind directly and honestly, even if it risks making waves or making people uncomfortable.",
  "You thrive in high-stakes, fast-paced situations and love the thrill of competition or taking a bold risk.",
  "You view yourself as a steady, reliable anchor for the people around you—calm, grounded, and fiercely protective.",
  "You prefer to observe quietly from the perimeter before jumping into a social situation or making a big decision.",
  "Harmonious, cooperative group dynamics matter more to you than individual victory or being \"right.\"",
  "When a massive problem hits, your immediate instinct is to charge directly at it and tackle it head-on, rather than strategizing from afar.",
  "You have a very high tolerance for solitude; you can spend days alone working on a project without feeling lonely.",
  "You are incredibly adaptive; you can easily blend into completely different social circles or quickly pivot when your environment changes.",
  "You are highly expressive with your body language, voice, or facial expressions—people can usually read exactly what you are thinking.",
  "You prefer to specialize deeply in one specific domain or skill rather than being a \"jack-of-all-trades\" who knows a little bit of everything.",
  "You are naturally hyper-aware of your physical surroundings, instantly tracking movement, sounds, or changes in your environment."
];

const DEFAULT_TRAINING_RECORDS = [
  {
    id: "seed-1",
    title: "Shield of the Vigilant Protector",
    blazon: "Gules, a lion rampant or",
    answers: [5, 3, 5, 4, 3, 4, 3, 4, 3, 4, 3, 4, 5, 3, 4, 3, 4, 5, 4, 4, 4, 4, 4, 5, 3, 4, 4, 5, 4, 4, 4, 5, 3, 4, 5, 3, 4, 4, 3, 5]
  },
  {
    id: "seed-2",
    title: "Standard of the Mystic Sage",
    blazon: "Azure, three mullets argent",
    answers: [2, 5, 4, 2, 4, 3, 5, 5, 4, 2, 3, 5, 3, 5, 4, 4, 5, 4, 5, 5, 5, 5, 5, 3, 5, 5, 5, 3, 5, 3, 2, 4, 5, 5, 2, 5, 3, 2, 5, 3]
  },
  {
    id: "seed-3",
    title: "Crest of the Meticulous Architect",
    blazon: "Sable, a chevron argent between three towers or",
    answers: [5, 4, 5, 3, 5, 4, 4, 4, 5, 3, 5, 5, 4, 3, 3, 5, 3, 4, 4, 3, 3, 3, 3, 4, 3, 4, 4, 5, 4, 4, 3, 4, 4, 4, 4, 4, 3, 2, 5, 4]
  }
];

let app, auth, db;
const appId = typeof __app_id !== 'undefined' ? __app_id : 'heraldry-pattern-builder';
let firebaseEnabled = false;

if (typeof __firebase_config !== 'undefined' && __firebase_config) {
  try {
    const firebaseConfig = JSON.parse(__firebase_config);
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
    firebaseEnabled = true;
  } catch (err) {
    console.error("Firebase startup initialization error:", err);
  }
}

export default function App() {
  const [currentMode, setCurrentMode] = useState('create'); // 'create' | 'train' | 'library'
  const [currentStep, setCurrentStep] = useState('intro'); // 'intro' | 'quiz' | 'result'
  const [answers, setAnswers] = useState(Array(40).fill(3)); // 1-5 values
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState('');
  
  // Creation outputs
  const [generationResult, setGenerationResult] = useState(null);
  const [chosenEffect, setChosenEffect] = useState('shiny');

  // Training inputs
  const [trainBlazon, setTrainBlazon] = useState('Or, a fess vert between three eagles gules');
  const [trainTitle, setTrainTitle] = useState('Crest of the Forest Warden');

  // Library & Auth State
  const [libraryData, setLibraryData] = useState(DEFAULT_TRAINING_RECORDS);
  const [selectedLibraryItem, setSelectedLibraryItem] = useState(null);
  const [toast, setToast] = useState(null);
  const [authStatus, setAuthStatus] = useState('Contacting Citadel Services...');
  const [user, setUser] = useState(null);

  useEffect(() => {
    if (!firebaseEnabled || !auth) {
      setAuthStatus("Local Sandbox (Changes stay active this session only)");
      setLibraryData(DEFAULT_TRAINING_RECORDS);
      return;
    }

    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (err) {
        console.error("Citadel authentication failed:", err);
        setAuthStatus("Offline Sandbox (Access Restricted)");
      }
    };

    initAuth();

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        setAuthStatus(`Authenticated Scribe: ${currentUser.uid.substring(0, 12)}...`);
      } else {
        setAuthStatus("Unauthenticated Scribe");
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!firebaseEnabled || !db || !user) {
      return;
    }

    // RULE 1: Strict Paths
    const collectionRef = collection(db, 'artifacts', appId, 'public', 'data', 'training_sessions');

    // Real-time updates subscription with both success & error callbacks
    const unsubscribe = onSnapshot(collectionRef, 
      (snapshot) => {
        const customSessions = [];
        snapshot.forEach((doc) => {
          customSessions.push({ id: doc.id, ...doc.data() });
        });

        // RULE 2: In-memory sorting (no complex query in Firestore)
        const sortedSessions = customSessions.sort((a, b) => {
          const tA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
          const tB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
          return tB - tA; // Newest first
        });

        setLibraryData([...DEFAULT_TRAINING_RECORDS, ...sortedSessions]);
      }, 
      (error) => {
        console.error("Firestore loading error:", error);
        showToast("⚠️ Could not load archives. Using default patterns.");
        setLibraryData(DEFAULT_TRAINING_RECORDS);
      }
    );

    return () => unsubscribe();
  }, [user]);

  const showToast = (message) => {
    setToast(message);
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  const handleTrainSubmission = async () => {
    if (!trainBlazon.trim() || !trainTitle.trim()) {
      showToast("⚠️ Please provide both a Title and a valid Blazon code.");
      return;
    }

    setLoading(true);
    setLoadingStep("Inscribing your training sigils in the records...");

    const payload = {
      title: trainTitle.trim(),
      blazon: trainBlazon.trim(),
      answers: answers,
      timestamp: new Date().toISOString(),
      creatorId: user ? user.uid : "local_scribe"
    };

    if (firebaseEnabled && db && user) {
      try {
        // RULE 1: Strict path execution
        const targetColl = collection(db, 'artifacts', appId, 'public', 'data', 'training_sessions');
        await addDoc(targetColl, payload);
        showToast("🏰 Scroll of Arms successfully saved to the cloud Citadel!");
        setCurrentMode('library');
      } catch (err) {
        console.error("Cloud database save failed:", err);
        showToast("⚠️ Database save restricted. Saving in temporary local session.");
        setLibraryData(prev => [payload, ...prev]);
        setCurrentMode('library');
      }
    } else {
      // Offline fallback state update
      setLibraryData(prev => [payload, ...prev]);
      showToast("📝 Saved locally for current session (Cloud Offline).");
      setCurrentMode('library');
    }
    
    setLoading(false);
  };

  const generateBlazonFromAnswers = async () => {
    setLoading(true);
    setLoadingStep("Synthesizing your personality spectrum...");

    const sleep = (ms) => new Promise(res => setTimeout(res, ms));

    const makeApiCall = async (retryCount = 0) => {
      const apiKey = ""; // Leave as-is, canvas injecting
      const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${apiKey}`;

      const userAnswersSummary = QUESTIONS.map((q, idx) => `Q${idx + 1}: ${q} -> Answer: ${answers[idx]}/5 (1=Strongly Disagree, 5=Strongly Agree)`).join('\n');
      
      const trainingExamplesText = libraryData.length > 0 
        ? libraryData.slice(0, 8).map((t, idx) => `Example ${idx+1}:\nAnswers: ${t.answers.join(', ')}\nBlazon: "${t.blazon}"\nTitle: "${t.title}"`).join('\n\n')
        : "No training examples loaded yet.";

      const promptText = `
Analyze this personality profile to generate a valid, highly symbolic Drawshield-compatible blazon.
Using the following user answers to the 40 personality questions:
${userAnswersSummary}

Additionally, look at these training examples (which link answers to blazons) to notice correlations (e.g. bold decisions or group leading leads to Gules/Lions; deep contemplation/solitude leads to Azure/Towers/Stars, rule-followers/justice leads to Chevrons or Argent):
${trainingExamplesText}

Develop:
1. A unique valid Blazon string. Keep it clean and fully compatible with the Drawshield parser. Ensure any quantity is preceded by numbers/articles ("a", "three", "an", etc.) and followed immediately by tinctures (e.g., "Azure, a bend or between two mullets argent").
2. A majestic title.
3. A symbolic breakdown.

Generate standard heraldic colors: Or (gold), Argent (silver), Gules (red), Azure (blue), Vert (green), Sable (black), Purpure (purple).
Generate typical clean charges: lion, eagle, falcon, wolf, tower, sword, rose, star/mullet, fleur-de-lys, crescent, crown, hand, key.
Generate clean divisions/ordinaries: chevron, fess, pale, bend, saltire, cross, chief, party per pale, party per fess.
      `;

      const payload = {
        contents: [{ parts: [{ text: promptText }] }],
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: {
            type: "OBJECT",
            properties: {
              blazon: { type: "STRING", description: "The raw Drawshield blazon statement. E.g. 'Gules, a lion rampant or'." },
              title: { type: "STRING", description: "A high-fantasy royal title for this profile." },
              tinctureExplanation: { type: "STRING", description: "Why the specific colors fit their personality values." },
              chargesExplanation: { type: "STRING", description: "How the symbolic shapes and creatures map to their answers." },
              overallAnalysis: { type: "STRING", description: "A short, profound character reading summarizing this individual's core virtues." }
            },
            required: ["blazon", "title", "tinctureExplanation", "chargesExplanation", "overallAnalysis"]
          }
        },
        systemInstruction: {
          parts: [{ text: "You are the Grand Master of the King's College of Arms. You map detailed human psyches into majestic heraldry. Output valid JSON adhering to the specified schema." }]
        }
      };

      try {
        setLoadingStep("Consulting the Grand Archive indices...");
        await sleep(300);
        setLoadingStep("Forging the shield metals and tinctures...");

        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (!response.ok) {
          if (response.status === 429 && retryCount < 3) {
            const delay = Math.pow(2, retryCount) * 1000;
            setLoadingStep(`Throttled by the realm. Retrying in ${delay / 1000}s...`);
            await sleep(delay);
            return makeApiCall(retryCount + 1);
          }
          throw new Error(`API returned status ${response.status}`);
        }

        const data = await response.json();
        const jsonText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!jsonText) throw new Error("Empty response from AI engine");

        return JSON.parse(jsonText);
      } catch (error) {
        console.error("API call error:", error);
        if (retryCount < 2) {
          await sleep(1500);
          return makeApiCall(retryCount + 1);
        }
        throw error;
      }
    };

    try {
      const parsed = await makeApiCall();
      setGenerationResult(parsed);
      setCurrentStep('result');
    } catch (err) {
      console.error(err);
      setGenerationResult({
        title: "The Unyielding Sovereign",
        blazon: "Per pale gules and azure, a lion rampant crowned or",
        tinctureExplanation: "Gules (red) for your unyielding courage under pressure. Azure (blue) representing your fidelity to comrades and truth.",
        chargesExplanation: "A lion rampant crowned with gold represents absolute resilience and leadership when faced with chaos.",
        overallAnalysis: "Our algorithms could not reach the high observatory. However, your steadfast answers speak of a majestic and sovereign character."
      });
      setCurrentStep('result');
      showToast("⚠️ Could not contact the cloud scribe. Crafted a resilient default crest.");
    } finally {
      setLoading(false);
    }
  };

  const handleCopyBlazon = (blazonText) => {
    const dummy = document.createElement("textarea");
    document.body.appendChild(dummy);
    dummy.value = blazonText;
    dummy.select();
    document.execCommand('copy');
    document.body.removeChild(dummy);
    showToast("📋 Blazon syntax copied! Paste it directly into Drawshield.");
  };

  const handleQuickAutofill = () => {
    const filled = answers.map(() => Math.floor(Math.random() * 5) + 1);
    setAnswers(filled);
    setCurrentQuestionIdx(39);
    showToast("⚡ Quick-attuned! You are now at the final query.");
  };

  const handleResetQuiz = () => {
    setAnswers(Array(40).fill(3));
    setCurrentQuestionIdx(0);
    setCurrentStep('quiz');
  };

  const getDrawshieldUrl = (blazon, style = 'shiny') => {
    const cleanBlazon = blazon.replace(/[#?;%]/g, '');
    return `https://drawshield.net/include/drawshield.php?blazon=${encodeURIComponent(cleanBlazon)}&outputformat=png&size=400&effect=${style}`;
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans relative overflow-x-hidden selection:bg-amber-500 selection:text-slate-950">
      
      {/* Decorative medieval header border */}
      <div className="h-2 bg-gradient-to-r from-amber-600 via-yellow-400 to-amber-600 w-full shadow-lg"></div>

      {/* Real-time Status banner */}
      <div className="bg-slate-900 border-b border-slate-800 text-xs text-slate-400 px-4 py-2 flex flex-wrap justify-between items-center gap-2">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${firebaseEnabled ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`}></span>
          <span>{authStatus}</span>
        </div>
        <div className="text-amber-500 font-serif tracking-wider uppercase text-[10px]">
          Pattern Library: <strong className="text-white">{libraryData.length} Scrolls</strong> Trained
        </div>
      </div>

      {/* Main Banner section */}
      <header className="py-8 px-4 text-center max-w-4xl mx-auto w-full">
        <div className="inline-flex items-center justify-center p-3 bg-amber-500/10 border border-amber-500/30 rounded-full mb-4">
          <svg className="w-10 h-10 text-amber-500" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C11.5 2 6 4 6 9.5C6 15 11.5 20.5 12 21C12.5 20.5 18 15 18 9.5C18 4 12.5 2 12 2M12 4.1C14.7 5.5 16 8 16 9.5C16 13.5 12.4 17.6 12 18.5C11.6 17.6 8 13.5 8 9.5C8 8 9.3 5.5 12 4.1Z" />
          </svg>
        </div>
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight font-serif text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-yellow-200 to-amber-400">
          The Scribe's Armorial
        </h1>
        <p className="mt-2 text-slate-400 max-w-xl mx-auto text-sm md:text-base">
          An interactive pattern engine mapping the 40 realms of human psyche into majestic coats of arms for <span className="text-amber-300 font-mono text-xs">DrawShield.net</span>.
        </p>

        <nav className="mt-8 flex justify-center gap-2 max-w-md mx-auto bg-slate-900/80 p-1.5 rounded-xl border border-slate-800/80 shadow-inner">
          <button
            onClick={() => { setCurrentMode('create'); setCurrentStep('intro'); }}
            className={`flex-1 py-2.5 px-3 rounded-lg text-xs md:text-sm font-medium transition-all ${
              currentMode === 'create'
                ? 'bg-amber-500 text-slate-950 font-semibold shadow-md shadow-amber-500/10'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
            }`}
          >
            🛡️ Create Crest
          </button>
          <button
            onClick={() => { setCurrentMode('train'); setAnswers(Array(40).fill(3)); }}
            className={`flex-1 py-2.5 px-3 rounded-lg text-xs md:text-sm font-medium transition-all ${
              currentMode === 'train'
                ? 'bg-amber-500 text-slate-950 font-semibold shadow-md shadow-amber-500/10'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
            }`}
          >
            🏰 Scribe Training
          </button>
          <button
            onClick={() => { setCurrentMode('library'); setSelectedLibraryItem(null); }}
            className={`flex-1 py-2.5 px-3 rounded-lg text-xs md:text-sm font-medium transition-all ${
              currentMode === 'library'
                ? 'bg-amber-500 text-slate-950 font-semibold shadow-md shadow-amber-500/10'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
            }`}
          >
            📖 Hall of Records
          </button>
        </nav>
      </header>

      {/* Main interactive area */}
      <main className="flex-grow max-w-5xl w-full mx-auto px-4 pb-16">
        
        {/* Loader Screen */}
        {loading && (
          <div className="fixed inset-0 bg-slate-950/90 z-50 flex flex-col items-center justify-center p-6 backdrop-blur-sm">
            <div className="relative w-32 h-32 mb-8">
              <div className="absolute inset-0 rounded-full border-4 border-slate-800"></div>
              <div className="absolute inset-0 rounded-full border-4 border-amber-500 border-t-transparent animate-spin"></div>
              <div className="absolute inset-2 rounded-full border-4 border-slate-900"></div>
              <div className="absolute inset-4 rounded-full border-2 border-dotted border-amber-500/40 animate-pulse"></div>
              <span className="absolute inset-0 flex items-center justify-center text-4xl">🔮</span>
            </div>
            <h3 className="text-xl font-serif text-amber-400 font-semibold text-center max-w-md animate-pulse">
              {loadingStep}
            </h3>
            <p className="text-xs text-slate-500 mt-2 text-center max-w-sm">
              The algorithm is processing the medieval alignments and matching standard tinctures. Please hold fast.
            </p>
          </div>
        )}

        {/* MODE A: CREATION MODE */}
        {currentMode === 'create' && (
          <div>
            {currentStep === 'intro' && (
              <div className="bg-slate-900/60 border border-slate-800 p-8 rounded-2xl max-w-2xl mx-auto text-center shadow-xl backdrop-blur">
                <span className="text-5xl mb-4 block">🗡️</span>
                <h2 className="text-2xl font-serif font-bold text-amber-400 mb-4">Forge Your Heraldic Alignment</h2>
                <p className="text-slate-300 leading-relaxed text-sm mb-6">
                  Embark on a forty-tier psychological test designed to align your intrinsic traits with classic heraldic structures. Our machine pattern engine matches your virtues, social mechanics, and environmental preferences with medieval shield divisions, unique crest charges, and protective ordinaries.
                </p>
                <div className="bg-slate-950/60 border border-slate-800/50 p-4 rounded-xl mb-8 text-left text-xs text-slate-400 flex flex-col gap-2">
                  <div className="flex gap-2"><strong className="text-amber-400">🔥 Red/Gold:</strong> Leadership, courage, and fiery competitive drive.</div>
                  <div className="flex gap-2"><strong className="text-sky-400">🌊 Blue/Silver:</strong> Fidelity, deep systemic logic, and emotional mediation.</div>
                  <div className="flex gap-2"><strong className="text-emerald-400">🌿 Green/Sable:</strong> Resourcefulness, independent focus, and solitude.</div>
                </div>
                <button
                  onClick={() => setCurrentStep('quiz')}
                  className="w-full sm:w-auto bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-slate-950 font-bold px-8 py-3.5 rounded-xl text-sm tracking-wide shadow-lg shadow-amber-500/10 transition-all hover:-translate-y-0.5"
                >
                  Begin the Attunement Quiz
                </button>
              </div>
            )}

            {currentStep === 'quiz' && (
              <div className="bg-slate-900/80 border border-slate-800 p-6 md:p-10 rounded-2xl max-w-3xl mx-auto shadow-2xl relative overflow-hidden">
                
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-amber-500/50 to-transparent"></div>

                <div className="flex justify-between items-center mb-6">
                  <span className="text-xs uppercase tracking-widest font-mono text-slate-500">
                    Sovereign Attunement
                  </span>
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={handleQuickAutofill}
                      className="text-[10px] bg-slate-800 hover:bg-slate-700 text-amber-400 px-2.5 py-1 rounded-md border border-slate-700/60 transition-colors font-mono"
                      title="Instantly answers remaining questions to speed up testing"
                    >
                      ⚡ Fast Attune (Skip)
                    </button>
                    <span className="text-xs bg-amber-500/10 text-amber-400 font-mono px-2 py-0.5 rounded-full border border-amber-500/20">
                      Query {currentQuestionIdx + 1} of 40
                    </span>
                  </div>
                </div>

                <div className="w-full bg-slate-950 rounded-full h-1.5 mb-8 overflow-hidden border border-slate-800">
                  <div 
                    className="bg-gradient-to-r from-amber-600 to-yellow-400 h-1.5 transition-all duration-300" 
                    style={{ width: `${((currentQuestionIdx + 1) / 40) * 100}%` }}
                  ></div>
                </div>

                <div className="min-h-[140px] flex items-center justify-center bg-slate-950/40 p-6 rounded-xl border border-slate-800/40 mb-8">
                  <p className="text-lg md:text-xl font-serif text-slate-100 text-center leading-relaxed">
                    "{QUESTIONS[currentQuestionIdx]}"
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 mb-8">
                  {[
                    { val: 1, label: "Strongly Disagree", color: "hover:border-red-500/50 hover:bg-red-500/5 text-red-400" },
                    { val: 2, label: "Disagree", color: "hover:border-orange-500/50 hover:bg-orange-500/5 text-orange-300" },
                    { val: 3, label: "Neutral / Unsure", color: "hover:border-slate-500/50 hover:bg-slate-500/5 text-slate-400" },
                    { val: 4, label: "Agree", color: "hover:border-emerald-500/50 hover:bg-emerald-500/5 text-emerald-300" },
                    { val: 5, label: "Strongly Agree", color: "hover:border-teal-500/50 hover:bg-teal-500/5 text-teal-400" }
                  ].map((opt) => {
                    const isSelected = answers[currentQuestionIdx] === opt.val;
                    return (
                      <button
                        key={opt.val}
                        onClick={() => {
                          const updated = [...answers];
                          updated[currentQuestionIdx] = opt.val;
                          setAnswers(updated);
                        }}
                        className={`p-4 rounded-xl border flex flex-col items-center justify-center gap-1.5 text-center transition-all ${
                          isSelected 
                            ? 'bg-amber-500 border-amber-400 text-slate-950 scale-[1.03] shadow-lg shadow-amber-500/10' 
                            : `bg-slate-950 border-slate-800/80 ${opt.color}`
                        }`}
                      >
                        <span className="font-mono text-base font-bold">{opt.val}</span>
                        <span className={`text-[10px] font-medium leading-tight ${isSelected ? 'text-slate-950' : 'text-slate-400'}`}>
                          {opt.label}
                        </span>
                      </button>
                    );
                  })}
                </div>

                <div className="flex justify-between items-center gap-4">
                  <button
                    disabled={currentQuestionIdx === 0}
                    onClick={() => setCurrentQuestionIdx(prev => prev - 1)}
                    className="px-5 py-2.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700/50 transition-colors disabled:opacity-30 disabled:pointer-events-none"
                  >
                    ← Previous Query
                  </button>

                  {currentQuestionIdx < 39 ? (
                    <button
                      onClick={() => setCurrentQuestionIdx(prev => prev + 1)}
                      className="px-6 py-2.5 rounded-lg text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 transition-all shadow-md"
                    >
                      Next Query →
                    </button>
                  ) : (
                    <button
                      onClick={generateBlazonFromAnswers}
                      className="px-8 py-3 rounded-lg text-xs font-black bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 tracking-wider hover:brightness-110 transition-all shadow-md animate-pulse"
                    >
                      ⚔️ Forged My Shield
                    </button>
                  )}
                </div>

              </div>
            )}

            {currentStep === 'result' && generationResult && (
              <div className="max-w-4xl mx-auto space-y-6">
                
                <div className="bg-slate-900 border border-slate-800 p-6 md:p-8 rounded-2xl shadow-2xl relative overflow-hidden">
                  <div className="text-center mb-6">
                    <span className="text-xs font-mono text-amber-500 uppercase tracking-widest block mb-1">
                      Attunement Complete
                    </span>
                    <h2 className="text-2xl md:text-3xl font-serif font-black text-slate-100">
                      {generationResult.title}
                    </h2>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
                    
                    <div className="flex flex-col items-center bg-slate-950 p-6 rounded-xl border border-slate-800/80">
                      <div className="w-full max-w-[280px] aspect-square relative rounded-xl overflow-hidden bg-slate-900 flex items-center justify-center border border-slate-800">
                        <img 
                          src={getDrawshieldUrl(generationResult.blazon, chosenEffect)}
                          alt={generationResult.title}
                          className="w-full h-full object-contain p-2"
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = `https://placehold.co/400x400/18181b/ffffff?text=Generating+Shield+...`;
                          }}
                        />
                      </div>

                      <div className="mt-6 w-full">
                        <label className="text-[10px] text-slate-500 font-mono uppercase tracking-widest block mb-2 text-center">
                          Visual Rendering Aesthetics
                        </label>
                        <div className="grid grid-cols-2 gap-1.5">
                          {PALETTE_EFFECTS.map((eff) => (
                            <button
                              key={eff.id}
                              onClick={() => setChosenEffect(eff.id)}
                              className={`py-1.5 px-2 rounded text-xs transition-colors border ${
                                chosenEffect === eff.id
                                  ? 'bg-amber-500/10 border-amber-400 text-amber-300'
                                  : 'bg-slate-900/60 border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                              }`}
                            >
                              {eff.name}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      
                      <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                        <label className="text-[10px] text-slate-500 font-mono uppercase tracking-wider block mb-1">
                          Drawshield Blazon Code
                        </label>
                        <div className="text-amber-300 font-mono text-sm break-all leading-relaxed p-2.5 bg-slate-900 rounded border border-slate-800/50 mb-3 select-all">
                          {generationResult.blazon}
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={() => handleCopyBlazon(generationResult.blazon)}
                            className="flex-1 py-2 px-3 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-1.5"
                          >
                            <span>📋 Copy Blazon Code</span>
                          </button>
                          <a
                            href={`https://drawshield.net/create/index.html?blazon=${encodeURIComponent(generationResult.blazon)}`}
                            target="_blank"
                            rel="noreferrer"
                            className="flex-1 py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-1 border border-slate-700/60"
                          >
                            <span>🔗 Customize on DrawShield</span>
                          </a>
                        </div>
                      </div>

                      <div className="space-y-3.5 text-sm">
                        <div className="border-l-2 border-amber-500/40 pl-3">
                          <h4 className="font-serif font-bold text-slate-300 text-xs uppercase tracking-wider mb-1">Tinctures & Metals</h4>
                          <p className="text-slate-400 text-xs leading-relaxed">{generationResult.tinctureExplanation}</p>
                        </div>
                        
                        <div className="border-l-2 border-amber-500/40 pl-3">
                          <h4 className="font-serif font-bold text-slate-300 text-xs uppercase tracking-wider mb-1">Charges & Symbols</h4>
                          <p className="text-slate-400 text-xs leading-relaxed">{generationResult.chargesExplanation}</p>
                        </div>

                        <div className="border-l-2 border-amber-500/40 pl-3">
                          <h4 className="font-serif font-bold text-slate-300 text-xs uppercase tracking-wider mb-1">Personality Alignment</h4>
                          <p className="text-slate-400 text-xs leading-relaxed">{generationResult.overallAnalysis}</p>
                        </div>
                      </div>

                    </div>

                  </div>

                  <div className="mt-8 pt-6 border-t border-slate-800 flex flex-wrap gap-2 justify-center">
                    <button
                      onClick={handleResetQuiz}
                      className="py-2.5 px-5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl transition-colors"
                    >
                      🔄 Retake the Attunement
                    </button>
                  </div>
                </div>

              </div>
            )}
          </div>
        )}

        {/* MODE B: TRAINING MODE */}
        {currentMode === 'train' && (
          <div className="bg-slate-900 border border-slate-800 p-6 md:p-8 rounded-2xl max-w-3xl mx-auto shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-4xl">🏰</span>
              <div>
                <h2 className="text-xl font-serif font-bold text-amber-400">Armory Patterns Laboratory</h2>
                <p className="text-xs text-slate-400">Input standard heraldic blazons and complete queries to map traits directly</p>
              </div>
            </div>

            <div className="space-y-4 mb-8 bg-slate-950 p-4 rounded-xl border border-slate-800/80">
              <h3 className="text-xs font-mono uppercase tracking-wider text-slate-400">1. Define the Heraldic Armor Pair</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] uppercase font-semibold text-slate-500 block mb-1">Scroll / Crest Title</label>
                  <input
                    type="text"
                    value={trainTitle}
                    onChange={(e) => setTrainTitle(e.target.value)}
                    placeholder="e.g. Shield of Uncompromising Logic"
                    className="w-full bg-slate-900 border border-slate-800 focus:border-amber-500/40 focus:ring-0 rounded-lg p-2.5 text-xs text-slate-200 placeholder:text-slate-600"
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase font-semibold text-slate-500 block mb-1">Drawshield Blazon Code</label>
                  <input
                    type="text"
                    value={trainBlazon}
                    onChange={(e) => setTrainBlazon(e.target.value)}
                    placeholder="e.g. Azure, a fess between three stars or"
                    className="w-full bg-slate-900 border border-slate-800 focus:border-amber-500/40 focus:ring-0 rounded-lg p-2.5 text-xs text-amber-300 font-mono"
                  />
                </div>
              </div>

              <div className="p-3 bg-slate-900/60 rounded-lg border border-slate-800/60 flex items-center gap-4">
                <div className="w-16 h-16 rounded overflow-hidden bg-slate-950 flex-shrink-0 border border-slate-800">
                  <img 
                    src={getDrawshieldUrl(trainBlazon, 'shiny')}
                    alt="Attunement Preview"
                    className="w-full h-full object-contain p-1"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = `https://placehold.co/100x100/18181b/ffffff?text=Wait+Blazon`;
                    }}
                  />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-200">{trainTitle || "Untitled Crest"}</h4>
                  <p className="text-[10px] font-mono text-slate-500 break-all">{trainBlazon || "No blazon entered yet"}</p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-xs font-mono uppercase tracking-wider text-slate-400">2. Complete the Attunement Values</h3>
                <span className="text-[10px] bg-slate-800 px-2 py-0.5 rounded text-amber-400 font-mono">Total Parameters: 40</span>
              </div>

              <div className="max-h-[350px] overflow-y-auto space-y-3 bg-slate-950 p-4 rounded-xl border border-slate-800/80 pr-2 scrollbar-thin scrollbar-thumb-slate-800">
                {QUESTIONS.map((q, idx) => (
                  <div key={idx} className="bg-slate-900/60 p-3 rounded-lg border border-slate-800/40 flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <p className="text-xs text-slate-300 flex-1 leading-relaxed">
                      <span className="font-mono text-amber-500/80 font-bold mr-1">{idx+1}.</span> {q}
                    </p>
                    <div className="flex items-center gap-1.5 self-end md:self-auto">
                      {[1, 2, 3, 4, 5].map((val) => (
                        <button
                          key={val}
                          onClick={() => {
                            const updated = [...answers];
                            updated[idx] = val;
                            setAnswers(updated);
                          }}
                          className={`w-7 h-7 rounded text-[10px] font-bold transition-colors ${
                            answers[idx] === val
                              ? 'bg-amber-500 text-slate-950'
                              : 'bg-slate-950 text-slate-400 border border-slate-800 hover:border-slate-700'
                          }`}
                        >
                          {val}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-8 pt-4 border-t border-slate-800 flex justify-end gap-2">
              <button
                onClick={() => {
                  setAnswers(Array(40).fill(3));
                  setTrainBlazon('Or, a fess vert between three eagles gules');
                  setTrainTitle('Crest of the Forest Warden');
                }}
                className="py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold"
              >
                Clear Settings
              </button>
              <button
                onClick={handleTrainSubmission}
                className="py-2.5 px-6 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-slate-950 rounded-lg text-xs font-bold shadow-lg shadow-amber-500/10"
              >
                💾 Train the Scribe Pattern Matrix
              </button>
            </div>

          </div>
        )}

        {/* MODE C: HALL OF RECORDS (LIBRARY) */}
        {currentMode === 'library' && (
          <div>
            {selectedLibraryItem ? (
              <div className="bg-slate-900 border border-slate-800 p-6 md:p-8 rounded-2xl max-w-3xl mx-auto shadow-2xl">
                <button
                  onClick={() => setSelectedLibraryItem(null)}
                  className="mb-4 text-xs font-semibold text-amber-500 hover:text-amber-400 flex items-center gap-1"
                >
                  ← Back to Records Archive
                </button>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
                  
                  <div className="flex flex-col items-center bg-slate-950 p-6 rounded-xl border border-slate-800/80">
                    <div className="w-full max-w-[240px] aspect-square relative rounded-xl overflow-hidden bg-slate-900 flex items-center justify-center border border-slate-800">
                      <img 
                        src={getDrawshieldUrl(selectedLibraryItem.blazon, chosenEffect)}
                        alt={selectedLibraryItem.title}
                        className="w-full h-full object-contain p-2"
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = `https://placehold.co/400x400/18181b/ffffff?text=Wait+Image`;
                        }}
                      />
                    </div>

                    <div className="mt-4 w-full">
                      <div className="grid grid-cols-3 gap-1">
                        {['shiny', 'stone', 'vellum'].map((eff) => (
                          <button
                            key={eff}
                            onClick={() => setChosenEffect(eff)}
                            className={`py-1 rounded text-[10px] capitalize font-medium border ${
                              chosenEffect === eff
                                ? 'bg-amber-500/10 border-amber-400 text-amber-300'
                                : 'bg-slate-900/60 border-transparent text-slate-400 hover:text-slate-200'
                            }`}
                          >
                            {eff}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <span className="text-[10px] font-mono text-amber-500 uppercase tracking-widest block">Inscribed Sigil</span>
                      <h3 className="text-xl font-serif font-black text-slate-100">{selectedLibraryItem.title}</h3>
                    </div>

                    <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                      <label className="text-[10px] text-slate-500 font-mono block mb-1">Blazon Syntax</label>
                      <p className="text-amber-300 font-mono text-xs break-all mb-2 select-all">{selectedLibraryItem.blazon}</p>
                      <button
                        onClick={() => handleCopyBlazon(selectedLibraryItem.blazon)}
                        className="w-full py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] rounded font-bold"
                      >
                        📋 Copy Blazon Text
                      </button>
                    </div>

                    <div>
                      <h4 className="text-[10px] uppercase font-mono text-slate-400 mb-2">Trained Personality Metrics</h4>
                      <div className="space-y-1.5 max-h-[160px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-slate-800">
                        {QUESTIONS.map((q, idx) => {
                          const val = selectedLibraryItem.answers[idx] || 3;
                          return (
                            <div key={idx} className="flex justify-between items-center gap-2 bg-slate-950/40 p-1.5 rounded text-[10px]">
                              <span className="text-slate-500 truncate max-w-[200px]" title={q}>{idx+1}. {q}</span>
                              <span className={`font-mono font-bold px-1.5 py-0.5 rounded ${
                                val >= 4 ? 'bg-emerald-500/10 text-emerald-400' : val <= 2 ? 'bg-red-500/10 text-red-400' : 'bg-slate-800 text-slate-400'
                              }`}>{val}/5</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                  </div>

                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl">
                  <h3 className="text-lg font-serif font-bold text-slate-100 mb-2">The Archive Scrolls</h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Browse all currently trained crests, shields, and underlying human psychological values saved inside the shared cloud repository. Click any scroll to load details, extract the blazon syntax, or adapt for personal needs.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {libraryData.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => setSelectedLibraryItem(item)}
                      className="bg-slate-900 hover:bg-slate-800/80 border border-slate-800 hover:border-amber-500/30 p-4 rounded-xl cursor-pointer transition-all hover:-translate-y-0.5 flex items-start gap-4 shadow-md group"
                    >
                      <div className="w-16 h-16 bg-slate-950 rounded border border-slate-800 overflow-hidden flex-shrink-0 flex items-center justify-center p-1 group-hover:border-amber-500/20">
                        <img 
                          src={getDrawshieldUrl(item.blazon, 'shiny')}
                          alt={item.title}
                          className="w-full h-full object-contain"
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = `https://placehold.co/100x100/18181b/ffffff?text=Shield`;
                          }}
                        />
                      </div>
                      <div className="flex-grow min-w-0">
                        <h4 className="font-serif font-bold text-slate-200 text-xs truncate group-hover:text-amber-400 transition-colors">
                          {item.title}
                        </h4>
                        <p className="text-[10px] font-mono text-slate-500 truncate mb-2">{item.blazon}</p>
                        <span className="text-[9px] bg-amber-500/10 text-amber-300 font-semibold px-2 py-0.5 rounded-full border border-amber-500/20">
                          View Scribe Profile
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

      </main>

      {toast && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 border border-amber-500/40 text-slate-200 px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3 animate-bounce">
          <span className="text-amber-400">🛡️</span>
          <span className="text-xs font-semibold">{toast}</span>
        </div>
      )}

      <footer className="mt-auto py-8 bg-slate-950 border-t border-slate-900 text-center text-slate-600 text-xs">
        <div className="max-w-4xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <p>© 2026 Scribe's Armorial. Compatible with DrawShield blazon parsers.</p>
          <div className="flex gap-4">
            <a href="https://drawshield.net/" target="_blank" rel="noreferrer" className="hover:text-amber-500 transition-colors">Drawshield Website</a>
            <span className="text-slate-800">|</span>
            <span className="text-slate-500">In-Context Neural Training Enabled</span>
          </div>
        </div>
      </footer>

    </div>
  );
}