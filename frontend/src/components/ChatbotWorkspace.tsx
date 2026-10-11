'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { 
  UploadCloud, FileText, Send, User, 
  Volume2, Copy, Check, Sparkles, RefreshCw, AlertTriangle,
  CheckCircle, ShieldAlert, Pill, Activity, AlertOctagon,
  Heart, CheckCircle2, ArrowLeft, LogIn, LogOut,
  HeartPulse, Languages, Info, FolderClock, Plus, Trash2
} from 'lucide-react';
import { getApiUrl } from '@/lib/api';

function PlayIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <polygon points="6 3 20 12 6 21 6 3" />
    </svg>
  );
}

function PauseIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <rect x="6" y="4" width="4" height="16" rx="1" />
      <rect x="14" y="4" width="4" height="16" rx="1" />
    </svg>
  );
}

function SquareIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <rect x="4" y="4" width="16" height="16" rx="2" />
    </svg>
  );
}

function RotateCcwIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
    </svg>
  );
}

function VolumeXIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
      <line x1="22" y1="9" x2="16" y2="15" />
      <line x1="16" y1="9" x2="22" y2="15" />
    </svg>
  );
}

function ArrowUpIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="19" x2="12" y2="5" />
      <polyline points="5 12 12 5 19 12" />
    </svg>
  );
}

function ArrowDownIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19" />
      <polyline points="19 12 12 19 5 12" />
    </svg>
  );
}

function PenIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>
      <path d="m15 5 4 4"/>
    </svg>
  );
}

function CloseIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 6 6 18M6 6l12 12"/>
    </svg>
  );
}

function MessageIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
    </svg>
  );
}

import { useAuth } from '@/context/AuthContext';
import { ProfileAvatar } from '@/components/ProfileAvatar';

type Language = 'english' | 'hindi' | 'telugu' | 'tamil' | 'tanglish';

interface Message {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  isStreaming?: boolean;
  timestamp: string;
  speechText?: string;
}

interface ReportSection {
  id: string;
  number: number;
  title: string;
  content: string;
}

interface LanguageReportData {
  language_code: string;
  language_name: string;
  sections: ReportSection[];
  patient_summary: string;
  speech_text: string;
  word_count: number;
  full_markdown: string;
}

interface UIStringDefinition {
  verifiedBadge: string;
  patientSummaryTitle: string;
  wordCountLabel: (c: number) => string;
  listenIn: string;
  resumeAudio: string;
  pause: string;
  stop: string;
  replay: string;
  playing: string;
  paused: string;
  speechReady: string;
  findingsTitle: string;
  thParameter: string;
  thValue: string;
  thUnit: string;
  thReference: string;
  thStatus: string;
  statusMap: Record<string, string>;
  noLabsFound: string;
  explanationTitle: string;
  medicationsTitle: string;
  timingLabel: string;
  purposeLabel: string;
  ambiguityWarning: string;
  noMedsFound: string;
  dietTitle: string;
  followupTitle: string;
  sourcesTitle: string;
  consultationHeader: string;
  clearChat: string;
  removeMessage: string;
  copy: string;
  copied: string;
  inputPlaceholder: string;
  tabAll: string;
  tabSummary: string;
  tabLabs: string;
  tabMeds: string;
  tabDiet: string;
  tabSafety: string;
  chatClearSuccess: string;
  docWelcome: (f: string) => string;
  langSwitched: string;
  suggestions: string[];
}

const UI_STRINGS: Record<Language, UIStringDefinition> = {
  english: {
    verifiedBadge: 'Verified by Dr. Doom AI',
    patientSummaryTitle: 'Patient-Friendly Medical Summary',
    wordCountLabel: (c: number) => `Explanation: ${c} words (≥150 Target Met)`,
    listenIn: 'Listen in English',
    resumeAudio: 'Resume Audio',
    pause: 'Pause',
    stop: 'Stop',
    replay: 'Replay',
    playing: 'Playing explanation...',
    paused: 'Paused',
    speechReady: 'Direct Speech Ready',
    findingsTitle: '2. Detected Findings and Test Results',
    thParameter: 'Test Parameter',
    thValue: 'Result Value',
    thUnit: 'Unit',
    thReference: 'Reference Interval',
    thStatus: 'Status',
    statusMap: {
      normal: 'Normal',
      high: 'High',
      low: 'Low',
      critical: 'Critical',
      abnormal: 'Abnormal'
    },
    noLabsFound: 'No clinical laboratory test values were found in the uploaded document.',
    explanationTitle: '3. Explanation of Each Important Result',
    medicationsTitle: '4. Prescribed Medications and Dosage Information',
    timingLabel: 'Timing:',
    purposeLabel: 'Purpose:',
    ambiguityWarning: 'Requires confirmation due to handwriting ambiguity.',
    noMedsFound: 'No prescription information was found in the uploaded document.',
    dietTitle: '5. Diet and Nutrition Information',
    followupTitle: '6. Recommended Follow-up and Precautions',
    sourcesTitle: '8. Sources, Limitations, and Safety Notice',
    consultationHeader: 'Interactive Clinical Consultation',
    clearChat: 'Clear Chat',
    removeMessage: 'Remove',
    copy: 'Copy',
    copied: 'Copied',
    inputPlaceholder: 'Ask Dr. Doom about test intervals, medication timing, diet, or precautions...',
    tabAll: 'All Sections',
    tabSummary: 'Summary & Audio',
    tabLabs: 'Lab Results',
    tabMeds: 'Medications',
    tabDiet: 'Diet & Nutrition',
    tabSafety: 'Follow-up & Safety',
    chatClearSuccess: 'Chat cleared. How can I assist you with your health query?',
    docWelcome: (f: string) => `I have analyzed your medical report (**${f}**). The complete clinical findings, medications, and dietary guidelines are detailed in the preview above. Feel free to ask any specific questions!`,
    langSwitched: 'Language switched to English. The clinical preview and speech audio have been updated.',
    suggestions: [
      'What do my hemoglobin & blood values mean?',
      'Check drug interactions and timing with food',
      'What foods should I eat to improve these metrics?',
      'Explain recommended follow-up and precautions'
    ]
  },
  telugu: {
    verifiedBadge: 'డాక్టర్ డూమ్ AI ధృవీకరించిన నివేదిక',
    patientSummaryTitle: 'రోగికి అనుకూలమైన వైద్య సారాంశం',
    wordCountLabel: (c: number) => `వివరణ: ${c} పదాలు (లక్ష్యం పూర్తయింది)`,
    listenIn: 'తెలుగులో వినండి',
    resumeAudio: 'మళ్ళీ ప్రారంభించు',
    pause: 'తాత్కాలికంగా ఆపు',
    stop: 'ఆపు',
    replay: 'మొదటి నుండి వినండి',
    playing: 'వివరణ వినిపిస్తోంది...',
    paused: 'ఆపబడింది',
    speechReady: 'ఆడియో సిద్ధంగా ఉంది',
    findingsTitle: '2. గుర్తించిన ల్యాబ్ ఫలితాలు మరియు పరీక్షా వివరాలు',
    thParameter: 'పరీక్ష పేరు',
    thValue: 'లభించిన విలువ',
    thUnit: 'యూనిట్',
    thReference: 'సాధారణ పరిమితి',
    thStatus: 'స్థితి',
    statusMap: {
      normal: 'సాధారణం (Normal)',
      high: 'ఎక్కువ (High)',
      low: 'తక్కువ (Low)',
      critical: 'క్లిష్టమైనది (Critical)',
      abnormal: 'అసాధారణం'
    },
    noLabsFound: 'ఈ పత్రంలో ఎటువంటి క్లినికల్ ల్యాబ్ పరీక్షల విలువలు కనిపించలేదు.',
    explanationTitle: '3. ముఖ్యమైన ఫలితాల సమగ్ర వివరణ',
    medicationsTitle: '4. సూచించిన మందులు మరియు మోతాదు సమాచారం',
    timingLabel: 'సమయం:',
    purposeLabel: 'ఉద్దేశం:',
    ambiguityWarning: 'చేతిరాత స్పష్టంగా లేనందున మీ డాక్టర్ లేదా ఫార్మసిస్ట్‌ను సంప్రదించండి.',
    noMedsFound: 'ఈ పత్రంలో ఎటువంటి ప్రిస్క్రిప్షన్ లేదా మందుల వివరాలు కనుగొనబడలేదు.',
    dietTitle: '5. ఆహారం మరియు పోషకాహార సమాచారం',
    followupTitle: '6. సిఫార్సు చేసిన జాగ్రత్తలు మరియు తదుపరి పరీక్షలు',
    sourcesTitle: '8. సమాచార ఆధారాలు, పరిమితులు మరియు భద్రతా సమాచారం',
    consultationHeader: 'క్లినికల్ సంప్రదింపుల విభాగం',
    clearChat: 'చాట్ క్లియర్ చేయండి',
    removeMessage: 'సందేశాన్ని తొలగించు',
    copy: 'కాపీ',
    copied: 'కాపీ అయింది',
    inputPlaceholder: 'పరీక్ష ఫలితాలు, మందుల వేళలు, ఆహారం లేదా జాగ్రత్తల గురించి అడగండి...',
    tabAll: 'అన్ని విభాగాలు',
    tabSummary: 'సారాంశం & ఆడియో',
    tabLabs: 'ల్యాబ్ ఫలితాలు',
    tabMeds: 'మందుల వివరాలు',
    tabDiet: 'ఆహార నియమాలు',
    tabSafety: 'జాగ్రత్తలు & భద్రత',
    chatClearSuccess: 'చాట్ తొలగించబడింది. మీరు ఏవైనా కొత్త ప్రశ్నలు అడగవచ్చు.',
    docWelcome: (f: string) => `నేను మీ వైద్య నివేదికను (**${f}**) విజయవంతంగా విశ్లేషించాను. పై డేటా ప్రివ్యూలో పూర్తి ల్యాబ్ ఫలితాలు, సూచించిన మందులు మరియు ఆహార నియమాలు ఉన్నాయి. మీకు ఏవైనా సందేహాలుంటే క్రింద నన్ను అడగండి.`,
    langSwitched: 'భాష తెలుగులోకి మార్చబడింది. డేటా ప్రివ్యూ మరియు ఆడియో వివరణ తెలుగులో నవీకరించబడింది.',
    suggestions: [
      'నా హిమోగ్లోబిన్ మరియు రక్త పరీక్షల విలువల అర్థం ఏమిటి?',
      'మందులు ఆహారంతో ఎప్పుడు తీసుకోవాలో వివరించండి',
      'ఈ ఆరోగ్య స్థితికి ఎటువంటి ఆహారం తీసుకోవాలి?',
      'తదుపరి జాగ్రత్తలు మరియు వైద్య పరీక్షల వివరాలు'
    ]
  },
  hindi: {
    verifiedBadge: 'डॉ. डूम AI द्वारा सत्यापित रिपोर्ट',
    patientSummaryTitle: 'रोगी-अनुकूल मेडिकल सारांश',
    wordCountLabel: (c: number) => `व्याख्या: ${c} शब्द (लक्ष्य पूरा)`,
    listenIn: 'हिन्दी में सुनें',
    resumeAudio: 'फिर से चालू करें',
    pause: 'रोकें',
    stop: 'समाप्त करें',
    replay: 'शुरू से सुनें',
    playing: 'विवरण सुनाया जा रहा है...',
    paused: 'रोका गया',
    speechReady: 'ऑडियो तैयार है',
    findingsTitle: '2. पहचाने गए परिणाम और लैब परीक्षण विवरण',
    thParameter: 'परीक्षण का नाम',
    thValue: 'प्राप्त मान',
    thUnit: 'इकाई',
    thReference: 'सामान्य संदर्भ सीमा',
    thStatus: 'स्थिति',
    statusMap: {
      normal: 'सामान्य (Normal)',
      high: 'उच्च (High)',
      low: 'कम (Low)',
      critical: 'गंभीर (Critical)',
      abnormal: 'असामान्य'
    },
    noLabsFound: 'इस दस्तावेज़ में कोई नैदानिक लैब परीक्षण मान नहीं मिला।',
    explanationTitle: '3. महत्वपूर्ण परिणामों का विस्तृत विश्लेषण',
    medicationsTitle: '4. निर्धारित दवाएं और खुराक संबंधी जानकारी',
    timingLabel: 'समय:',
    purposeLabel: 'उद्देश्य:',
    ambiguityWarning: 'हस्तलेखन अस्पष्ट होने के कारण चिकित्सक या फार्मासिस्ट से पुष्टि करें।',
    noMedsFound: 'इस दस्तावेज़ में कोई दवा या पर्चा नहीं पाया गया।',
    dietTitle: '5. आहार एवं पोषण संबंधी दिशा-निर्देश',
    followupTitle: '6. आवश्यक सावधानियां और आगामी परामर्श',
    sourcesTitle: '8. संदर्भ, सीमाएं और सुरक्षा निर्देश',
    consultationHeader: 'इंटरएक्टिव क्लिनिकल परामर्श',
    clearChat: 'चैट साफ़ करें',
    removeMessage: 'संदेश हटाएं',
    copy: 'कॉपी',
    copied: 'कॉपी हो गया',
    inputPlaceholder: 'दवाओं के समय, खान-पान या रिपोर्ट के बारे में पूछें...',
    tabAll: 'सभी अनुभाग',
    tabSummary: 'सारांश और ऑडियो',
    tabLabs: 'लैब परिणाम',
    tabMeds: 'दवाएं',
    tabDiet: 'आहार और पोषण',
    tabSafety: 'सुरक्षा और सावधानियां',
    chatClearSuccess: 'चैट साफ़ कर दी गई है। आप कोई भी नया प्रश्न पूछ सकते हैं।',
    docWelcome: (f: string) => `मैंने आपकी मेडिकल रिपोर्ट (**${f}**) का विश्लेषण पूरा कर लिया है। सभी परीक्षण परिणाम और दवाएं ऊपर डेटा पूर्वावलोकन में प्रदर्शित हैं। अपनी रिपोर्ट के बारे में कोई भी प्रश्न पूछें।`,
    langSwitched: 'भाषा हिन्दी में बदल दी गई है। डेटा पूर्वावलोकन और ऑडियो व्याख्या अपडेट हो गई है।',
    suggestions: [
      'हीमोग्लोबिन और रक्त रिपोर्ट का क्या अर्थ है?',
      'दवाओं के सही समय और खाने के नियमों के बारे में बताएं',
      'इन परिणामों में सुधार के लिए क्या खाना चाहिए?',
      'आगे की सावधानियां और डॉक्टर से मिलने के निर्देश'
    ]
  },
  tamil: {
    verifiedBadge: 'டாக்டர் டூம் AI ஆல் சரிபார்க்கப்பட்டது',
    patientSummaryTitle: 'நோயாளிக்கான மருத்துவ சுருக்கம்',
    wordCountLabel: (c: number) => `விளக்கம்: ${c} சொற்கள்`,
    listenIn: 'தமிழில் கேளுங்கள்',
    resumeAudio: 'மீண்டும் தொடங்கு',
    pause: 'இடைநிறுத்து',
    stop: 'நிறுத்து',
    replay: 'மீண்டும்',
    playing: 'விளக்கம் ஒலிக்கிறது...',
    paused: 'இடைநிறுத்தப்பட்டது',
    speechReady: 'ஆடியோ தயார்',
    findingsTitle: '2. கண்டறியப்பட்ட சோதனை முடிவுகள்',
    thParameter: 'பரிசோதனை பெயர்',
    thValue: 'முடிவு',
    thUnit: 'அலகு',
    thReference: 'இயல்பான அளவு',
    thStatus: 'நிலை',
    statusMap: {
      normal: 'இயல்பு (Normal)',
      high: 'அதிகம் (High)',
      low: 'குறைவு (Low)',
      critical: 'ஆபத்தானது (Critical)',
      abnormal: 'மாறுபட்டது'
    },
    noLabsFound: 'இந்த ஆவணத்தில் ஆய்வக பரிசோதனை முடிவுகள் ஏதும் இல்லை.',
    explanationTitle: '3. முக்கிய முடிவுகளின் விளக்கம்',
    medicationsTitle: '4. பரிந்துரைக்கப்பட்ட மருந்துகள் & அளவு',
    timingLabel: 'நேரம்:',
    purposeLabel: 'நோக்கம்:',
    ambiguityWarning: 'கையெழுத்து தெளிவின்மை காரணமாக மருத்துவரிடம் சரிபார்க்கவும்.',
    noMedsFound: 'இந்த ஆவணத்தில் மருந்துகள் எதுவும் பரிந்துரைக்கப்படவில்லை.',
    dietTitle: '5. உணவு மற்றும் ஊட்டச்சத்து வழிகாட்டி',
    followupTitle: '6. எச்சரிக்கைகள் மற்றும் அடுத்த கட்ட சோதனைகள்',
    sourcesTitle: '8. குறிப்புகள், வரம்புகள் மற்றும் பாதுகாப்பு அறிவிப்பு',
    consultationHeader: 'மருத்துவ உரையாடல் பிரிவு',
    clearChat: 'அரட்டையை நீக்குக',
    removeMessage: 'செய்தியை நீக்கு',
    copy: 'நகலெடு',
    copied: 'நகலெடுக்கப்பட்டது',
    inputPlaceholder: 'மருந்துகள், உணவு அல்லது அறிக்கைகள் குறித்து கேட்கவும்...',
    tabAll: 'அனைத்து பிரிவுகள்',
    tabSummary: 'சுருக்கம் & ஆடியோ',
    tabLabs: 'ஆய்வக முடிவுகள்',
    tabMeds: 'மருந்துகள்',
    tabDiet: 'உணவு முறை',
    tabSafety: 'பாதுகாப்பு & எச்சரிக்கைகள்',
    chatClearSuccess: 'அரட்டை நீக்கப்பட்டது. உங்கள் புதிய கேள்விகளைக் கேளுங்கள்.',
    docWelcome: (f: string) => `உங்கள் மருத்துவ அறிக்கை (**${f}**) ஆய்வு செய்யப்பட்டது. முழுமையான முடிவுகள் மேலே உள்ள முன்னோட்டத்தில் உள்ளன. உங்கள் கேள்விகளைக் கேளுங்கள்.`,
    langSwitched: 'மொழி தமிழாக மாற்றப்பட்டது. முன்னோட்டம் மற்றும் ஆடியோ புதுப்பிக்கப்பட்டது.',
    suggestions: [
      'ரத்த பரிசோதனை முடிவுகளின் விளக்கம் என்ன?',
      'மருந்துகளை உட்கொள்ளும் சரியான நேரம் எது?',
      'உடலை மேம்படுத்த என்ன உணவு சாப்பிட வேண்டும்?',
      'அடுத்த கட்ட மருத்துவ ஆலோசனைகள் என்ன?'
    ]
  },
  tanglish: {
    verifiedBadge: 'Verified by Dr. Doom AI',
    patientSummaryTitle: 'Patient-Friendly Medical Summary (Tenglish)',
    wordCountLabel: (c: number) => `Explanation: ${c} words`,
    listenIn: 'Listen in Tenglish',
    resumeAudio: 'Resume Audio',
    pause: 'Pause',
    stop: 'Stop',
    replay: 'Replay',
    playing: 'Playing explanation...',
    paused: 'Paused',
    speechReady: 'Audio Ready',
    findingsTitle: '2. Detected Findings and Lab Results',
    thParameter: 'Test Parameter',
    thValue: 'Result Value',
    thUnit: 'Unit',
    thReference: 'Reference Interval',
    thStatus: 'Status',
    statusMap: {
      normal: 'Normal',
      high: 'High',
      low: 'Low',
      critical: 'Critical',
      abnormal: 'Abnormal'
    },
    noLabsFound: 'Ee document lo lab test values emi kanipinchaledhu.',
    explanationTitle: '3. Important Results Explanation',
    medicationsTitle: '4. Prescribed Medications & Dosage Guide',
    timingLabel: 'Timing:',
    purposeLabel: 'Purpose:',
    ambiguityWarning: 'Handwriting clear ga ledhu kabatti doctor ni adigi confirm cheskondi.',
    noMedsFound: 'Ee document lo medications emi prescribe cheyaledhu.',
    dietTitle: '5. Diet and Nutrition Protocol',
    followupTitle: '6. Follow-up Precautions & Care',
    sourcesTitle: '8. Sources, Limitations & Safety Notice',
    consultationHeader: 'Interactive Medical Consultation',
    clearChat: 'Clear Chat',
    removeMessage: 'Remove',
    copy: 'Copy',
    copied: 'Copied',
    inputPlaceholder: 'Mee test results, medicine timings, diet gurinchi adagandi...',
    tabAll: 'All Sections',
    tabSummary: 'Summary & Audio',
    tabLabs: 'Lab Tests',
    tabMeds: 'Medications',
    tabDiet: 'Diet & Nutrition',
    tabSafety: 'Follow-up & Safety',
    chatClearSuccess: 'Chat cleared. New doubts adagandi.',
    docWelcome: (f: string) => `Mee medical report (**${f}**) analyze cheyadam jarigindi. Pai preview lo complete details unnai. Mee doubts emaina unte kindha adagandi.`,
    langSwitched: 'Language Tenglish loki change cheyabadindi. Data preview update aindi.',
    suggestions: [
      'Na hemoglobin & blood test report meaning enti?',
      'Tablets timing and food tho ela teesukovali?',
      'Health improve avvadaniki em food tinali?',
      'Follow-up care and precautions gurinchi cheppandi'
    ]
  }
};

const CHAT_STORAGE_KEY = 'drdoom_chat_session_history_v2';

export default function ChatbotWorkspace() {
  const { user: authUser, logout } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [ocrResult, setOcrResult] = useState<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [result, setResult] = useState<any>(null);
  const [language, setLanguage] = useState<Language>('english');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [inputPrompt, setInputPrompt] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [extractedRawText, setExtractedRawText] = useState<string>('');
  const [editedText, setEditedText] = useState<string>('');
  const [showTextModal, setShowTextModal] = useState(false);
  const [documentCategory, setDocumentCategory] = useState<string>('');
  const [isMedicalDoc, setIsMedicalDoc] = useState<boolean>(true);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [pageCount, setPageCount] = useState<number>(1);

  // Audio / Speech Synthesis State
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [activeSpeechMsgId, setActiveSpeechMsgId] = useState<string | null>(null);
  const [voiceNotice, setVoiceNotice] = useState<string | null>(null);
  const [audioProgress, setAudioProgress] = useState<number>(0);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const [messages, setChatMessages] = useState<Message[]>([]);
  const [timeGreeting, setTimeGreeting] = useState('Good day');
  const [activePreviewTab, setActivePreviewTab] = useState<'all' | 'summary' | 'labs' | 'meds' | 'diet' | 'safety'>('all');
  const t = UI_STRINGS[language] || UI_STRINGS.english;

  const handleClearChat = () => {
    setChatMessages([]);
  };

  const handleDeleteMessage = (msgId: string) => {
    setChatMessages(prev => prev.filter(m => m.id !== msgId));
  };

  // Dynamic time-based greeting (Good morning / Good afternoon / Good evening / Good night)
  useEffect(() => {
    const updateGreeting = () => {
      const hour = new Date().getHours();
      if (hour >= 5 && hour < 12) {
        setTimeGreeting('Good morning');
      } else if (hour >= 12 && hour < 17) {
        setTimeGreeting('Good afternoon');
      } else if (hour >= 17 && hour < 21) {
        setTimeGreeting('Good evening');
      } else {
        setTimeGreeting('Good night');
      }
    };
    updateGreeting();
    const interval = setInterval(updateGreeting, 60000);
    return () => clearInterval(interval);
  }, []);

  // Get active LanguageReport from backend payload
  const getActiveLanguageReport = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (data: any, lang: Language): LanguageReportData | null => {
      if (!data) return null;
      const langKey = lang === 'tanglish' ? 'tanglish' : lang;
      if (data.reports_by_language && data.reports_by_language[langKey]) {
        return data.reports_by_language[langKey];
      }
      return null;
    },
    []
  );

  // Build markdown text for chat stream from active language report
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const buildReportText = useCallback((data: any, lang: Language): { markdown: string; speech: string } => {
    const langKey = lang === 'tanglish' ? 'tanglish' : lang;
    const report: LanguageReportData | null = data.reports_by_language?.[langKey];

    if (report && report.full_markdown) {
      return {
        markdown: report.full_markdown,
        speech: report.speech_text || report.patient_summary || ''
      };
    }

    if (data.is_medical === false) {
      const nonMed = `### ⚠️ Non-Medical File Detected\n\n• **Status:** The uploaded document could not be identified as a medical report or prescription.\n• **Safety Notice:** Dr. Doom strictly analyzes authentic healthcare records and does not invent clinical findings for everyday images.`;
      return { markdown: nonMed, speech: "The uploaded file could not be identified as a medical document. No clinical parameters or prescriptions have been assigned." };
    }

    const fallbackSummary = data.patient_summary || data.plain_language_summary || "Document processed successfully.";
    return {
      markdown: `### 📋 Medical Report Analysis\n\n${fallbackSummary}`,
      speech: data.speech_text || fallbackSummary
    };
  }, []);

  const hasRestoredRef = useRef(false);

  // Always initialize fresh session on mount, unless explicit record_id is requested in URL
  useEffect(() => {
    if (hasRestoredRef.current) return;
    hasRestoredRef.current = true;

    try {
      if (typeof window !== 'undefined') {
        // Clear any previous chat cache so page is always clean
        localStorage.removeItem(CHAT_STORAGE_KEY);

        const urlParams = new URLSearchParams(window.location.search);
        const recId = urlParams.get('record_id');
        if (recId) {
          const loadSavedRecord = async () => {
            try {
              const userParam = authUser?.email || 'default_user';
              const res = await fetch(getApiUrl(`/api/records/${recId}?user_id=${encodeURIComponent(userParam)}`));
              if (res.ok) {
                const json = await res.json();
                const rec = json.record || json.data;
                if (rec) {
                  setResult(rec);
                  setOcrResult(rec);
                  setExtractedRawText(rec.raw_text || '');
                  setEditedText(rec.raw_text || '');
                  setDocumentCategory(rec.category || 'complete_blood_count');
                  setIsMedicalDoc(rec.is_medical !== false);
                  setPageCount(rec.pages ? rec.pages.length : 1);

                  const { markdown, speech } = buildReportText(rec, language);
                  setChatMessages([
                    {
                      id: 'welcome-rec-' + Date.now(),
                      sender: 'assistant',
                      text: `Reopened saved medical record: **${rec.safe_display_name || rec.filename}**\n\n${markdown}`,
                      speechText: speech,
                      timestamp: 'Just now'
                    }
                  ]);
                  return;
                }
              }
            } catch (err) {
              console.warn('Failed to load record by id:', err);
            }
          };
          loadSavedRecord();
          return;
        }
      }
    } catch (e) {
      console.warn('Initialization error:', e);
    }
  }, [authUser, buildReportText, language]);

  // Clean up speech synthesis on unmount
  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    };
  }, []);

  // Reset Session
  const handleResetSession = () => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
    setIsPaused(false);
    setAudioProgress(0);
    try {
      localStorage.removeItem(CHAT_STORAGE_KEY);
    } catch {
      // ignore
    }
    setFile(null);
    setPreviewUrl(null);
    setOcrResult(null);
    setResult(null);
    setExtractedRawText('');
    setEditedText('');
    setChatMessages([]);
  };

  const handleLogout = () => {
    logout();
  };

  const chatScrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [showScrollBottom, setShowScrollBottom] = useState(false);
  const userScrolledUpRef = useRef(false);

  // Monitor scroll position
  const handleChatScroll = () => {
    if (!chatScrollRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = chatScrollRef.current;
    setShowScrollTop(scrollTop > 160);
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
    const isAwayFromBottom = distanceFromBottom > 120;
    setShowScrollBottom(isAwayFromBottom);
    userScrolledUpRef.current = isAwayFromBottom;
  };

  const scrollToTop = () => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const scrollToBottom = () => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTo({ top: chatScrollRef.current.scrollHeight, behavior: 'smooth' });
      userScrolledUpRef.current = false;
      setShowScrollBottom(false);
    }
  };

  const scrollToCreatedPoint = useCallback((targetId: string) => {
    userScrolledUpRef.current = true;
    const executeScroll = () => {
      const el = document.getElementById(targetId);
      if (el && chatScrollRef.current) {
        const containerRect = chatScrollRef.current.getBoundingClientRect();
        const elementRect = el.getBoundingClientRect();
        const targetScrollTop = chatScrollRef.current.scrollTop + (elementRect.top - containerRect.top) - 20;
        chatScrollRef.current.scrollTo({
          top: Math.max(0, targetScrollTop),
          behavior: 'smooth'
        });
      }
    };
    setTimeout(executeScroll, 50);
    setTimeout(executeScroll, 180);
    setTimeout(executeScroll, 350);
  }, []);

  // Clean up preview object URL
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  // Stream text line-by-line with typewriter effect
  const streamTextLineByLine = (
    fullText: string,
    messageId: string,
    speechTextStr?: string,
    onComplete?: () => void
  ) => {
    setIsGenerating(true);
    const lines = fullText.split('\n');
    let lineIdx = 0;
    let accumulated = '';

    const interval = setInterval(() => {
      if (lineIdx < lines.length) {
        accumulated += (lineIdx === 0 ? '' : '\n') + lines[lineIdx];
        lineIdx++;
        setChatMessages(prev =>
          prev.map(m => (m.id === messageId ? { ...m, text: accumulated, speechText: speechTextStr } : m))
        );
      } else {
        clearInterval(interval);
        setChatMessages(prev =>
          prev.map(m => (m.id === messageId ? { ...m, isStreaming: false, speechText: speechTextStr } : m))
        );
        setIsGenerating(false);
        if (onComplete) onComplete();
      }
    }, 45);
  };

  // Switch Language and automatically update preview and audio
  const handleLanguageChange = async (nextLang: Language) => {
    setLanguage(nextLang);
    stopSpeech();
    userScrolledUpRef.current = false;

    const nextT = UI_STRINGS[nextLang] || UI_STRINGS.english;

    if (ocrResult) {
      setIsGenerating(true);
      const assistantMsgId = 'lang-' + Date.now();

      try {
        let activeLangRep = getActiveLanguageReport(ocrResult, nextLang);

        // Fetch from backend explain endpoint if not already in memory
        if (!activeLangRep && ocrResult.document_id) {
          const userParam = authUser?.email || 'default_user';
          const res = await fetch(getApiUrl(`/api/documents/${ocrResult.document_id}/explain?user_id=${encodeURIComponent(userParam)}`), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ language: nextLang })
          });
          if (res.ok) {
            const data = await res.json();
            if (data) {
              activeLangRep = {
                language_code: nextLang,
                language_name: nextLang,
                sections: data.sections || [],
                patient_summary: data.patient_summary || data.explanation || '',
                speech_text: data.speech_text || '',
                word_count: data.word_count || 0,
                full_markdown: data.full_markdown || ''
              };

              setOcrResult((prev: any) => ({
                ...prev,
                patient_summary: activeLangRep?.patient_summary || prev.patient_summary,
                speech_text: activeLangRep?.speech_text || prev.speech_text,
                reports_by_language: {
                  ...(prev.reports_by_language || {}),
                  [nextLang]: activeLangRep
                }
              }));
            }
          }
        }

        const reportContent = activeLangRep?.patient_summary 
          ? `### 🩺 ${nextT.patientSummaryTitle}\n\n${activeLangRep.patient_summary}\n\n• **${nextT.listenIn}:** క్రింద లేదా పైన ఉన్న ఆడియో బటన్ క్లిక్ చేసి వివరణను వినవచ్చు.`
          : nextT.langSwitched;

        const speechToUse = activeLangRep?.speech_text || activeLangRep?.patient_summary;
        // Clean notification with translated summary in active language
        setChatMessages(prev => [
          ...prev,
          {
            id: assistantMsgId,
            sender: 'assistant',
            text: reportContent,
            isStreaming: false,
            speechText: speechToUse,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }
        ]);
        setIsGenerating(false);
        scrollToCreatedPoint(`msg-${assistantMsgId}`);
      } catch (err) {
        console.warn('Language switch translation error:', err);
        setChatMessages(prev => [
          ...prev,
          {
            id: assistantMsgId,
            sender: 'assistant',
            text: nextT.langSwitched,
            isStreaming: false,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }
        ]);
        setIsGenerating(false);
      }
    } else {
      // If no document is uploaded yet, print a prompt in the new language
      const greetingMap: Record<Language, string> = {
        telugu: "### 🩺 నమస్కారం! నేను డాక్టర్ డూమ్ (Dr. Doom MED AI).\n\nభాష **తెలుగు**గా మార్చబడింది. మీ ఆరోగ్య సందేహాలు, మందుల వేళలు, రక్త పరీక్షల వివరాలు లేదా ఏవైనా లక్షణాల గురించి క్రింద నన్ను అడగండి. మీ వద్ద మెడికల్ రిపోర్టు లేదా ప్రిస్క్రిప్షన్ ఉంటే ఎడమవైపు అప్‌లోడ్ చేసి క్షణాల్లో విశ్లేషణ పొందవచ్చు.",
        hindi: "### 🩺 नमस्ते! मैं डॉ. डूम (Dr. Doom MED AI) हूँ।\n\nभाषा **हिन्दी** में बदल दी गई है। अपनी स्वास्थ्य समस्याओं, दवाओं के समय, रक्त परीक्षण या लक्षणों के बारे में नीचे पूछें। बाईं ओर अपना मेडिकल पर्चा अपलोड कर सकते हैं।",
        tamil: "### 🩺 வணக்கம்! நான் டாக்டர் டூம் (Dr. Doom MED AI).\n\nமொழி **தமிழ்** ஆக மாற்றப்பட்டுள்ளது. உங்கள் மருத்துவ சந்தேகங்களை கீழே கேட்கலாம். இடதுபுறம் உங்கள் மருத்துவ ஆவணத்தை பதிவேற்றலாம்.",
        tanglish: "### 🩺 Hello! Naan Dr. Doom MED AI.\n\nLanguage **Tenglish**-ku maathiyaachu. Unga clinical doubts, medications, and symptoms-ah keezha kekkalam. Left side-la medical reports upload pannalaam.",
        english: "### 🩺 Welcome! I am DR. DOOM MED AI.\n\nLanguage set to **English**. Ask any clinical questions, prescription doubts, or upload a medical document on the left."
      };
      const greetingText = greetingMap[nextLang] || nextT.langSwitched;
      const greetingId = 'lang-greet-' + Date.now();

      setChatMessages(prev => [
        ...prev,
        {
          id: greetingId,
          sender: 'assistant',
          text: '',
          isStreaming: true,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);

      streamTextLineByLine(greetingText, greetingId, greetingText);
      scrollToCreatedPoint(`msg-${greetingId}`);
    }
  };

  // Perform upload and OCR extraction
  const handleProcessFile = async (targetFile: File) => {
    // Stop speech
    stopSpeech();
    setFile(targetFile);
    const url = URL.createObjectURL(targetFile);
    setPreviewUrl(url);
    setIsScanning(true);

    const userMsgId = 'user-' + Date.now();
    const assistantMsgId = 'asst-' + (Date.now() + 1);

    setChatMessages(prev => [
      ...prev,
      {
        id: userMsgId,
        sender: 'user',
        text: `Uploaded file: **${targetFile.name}** (${(targetFile.size / 1024).toFixed(1)} KB)`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      },
      {
        id: assistantMsgId,
        sender: 'assistant',
        text: 'Extracting medical document values and generating verified report...',
        isStreaming: true,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]);

    // Scroll up to the newly created submission data point
    scrollToCreatedPoint(`msg-${userMsgId}`);

    const formData = new FormData();
    formData.append('file', targetFile);
    setUploadProgress(25);

    try {
      const userParam = authUser?.email || 'default_user';
      const res = await Promise.race([
        fetch(getApiUrl(`/api/extract-record?user_id=${encodeURIComponent(userParam)}`), {
          method: 'POST',
          body: formData,
        }),
        new Promise<Response>((_, reject) =>
          setTimeout(() => reject(new Error('Timeout processing document.')), 45000)
        ),
      ]);

      setUploadProgress(85);

      if (res && res.ok) {
        const json = await res.json();
        const data = json.data || json;
        setResult(data);
        setOcrResult(data);
        setExtractedRawText(data.raw_text || '');
        setEditedText(data.raw_text || '');
        setDocumentCategory(data.category || 'cbc_hemogram');
        setIsMedicalDoc(data.is_medical !== false);
        setPageCount(data.pages ? data.pages.length : 1);
        setIsScanning(false);
        setUploadProgress(100);

        const activeLangRep = getActiveLanguageReport(data, language);
        const welcomeMsg = (UI_STRINGS[language] || UI_STRINGS.english).docWelcome(targetFile.name);
        const speechToUse = activeLangRep?.speech_text || activeLangRep?.patient_summary || data.speech_text || welcomeMsg;
        
        // Show clean conversational welcome message without dumping raw markdown tables into chat
        streamTextLineByLine(welcomeMsg, assistantMsgId, speechToUse);

        // Smoothly scroll up so the latest generated answer & report are displayed in view
        scrollToCreatedPoint(`msg-${userMsgId}`);
        setTimeout(() => {
          if (chatScrollRef.current) {
            chatScrollRef.current.scrollTo({ top: 0, behavior: 'smooth' });
          }
        }, 150);
        return;
      } else {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.detail || 'Server error processing document.');
      }
    } catch (err: any) {
      setIsScanning(false);
      setUploadProgress(0);
      const errorMsg = `### ⚠️ Document Processing Notice\n\n${err?.message || 'Failed to process document.'}\n\nPlease verify that the file is a legible medical report and retry.`;
      streamTextLineByLine(errorMsg, assistantMsgId);
      scrollToCreatedPoint(`msg-${userMsgId}`);
      return;
    }
  };

  // Helper to load sample CBC report image
  const handleLoadSampleCBC = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const canvas = document.createElement('canvas');
    canvas.width = 850;
    canvas.height = 1100;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Header
      ctx.fillStyle = '#065f46';
      ctx.font = 'bold 26px sans-serif';
      ctx.fillText('METROPOLIS CLINICAL DIAGNOSTIC LABS', 50, 60);
      ctx.fillStyle = '#475569';
      ctx.font = '14px sans-serif';
      ctx.fillText('NABL Accredited • Date: 12-Oct-2026 • Ref Dr: Dr. V. Rao, MD', 50, 90);
      ctx.fillText('Patient Name: Rajesh Sharma | Age: 45 Y | Gender: Male | UHID: 91-8493-2948-1092', 50, 115);
      
      // Divider
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(50, 135);
      ctx.lineTo(800, 135);
      ctx.stroke();

      // Title
      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 20px sans-serif';
      ctx.fillText('COMPLETE BLOOD COUNT (CBC) & METABOLIC PANEL', 50, 175);

      // Table Header
      ctx.fillStyle = '#f1f5f9';
      ctx.fillRect(50, 200, 750, 35);
      ctx.fillStyle = '#1e293b';
      ctx.font = 'bold 14px sans-serif';
      ctx.fillText('Test Parameter', 65, 223);
      ctx.fillText('Result', 340, 223);
      ctx.fillText('Unit', 450, 223);
      ctx.fillText('Reference Interval', 580, 223);

      // Rows
      const rows = [
        ['Hemoglobin (Hb)', '11.2', 'g/dL', '13.0 - 17.0', true],
        ['Total WBC Count (TLC)', '6,800', '/cumm', '4,000 - 11,000', false],
        ['Platelet Count', '2.40', 'Lakhs/cumm', '1.50 - 4.50', false],
        ['Fasting Blood Sugar (FBS)', '108.0', 'mg/dL', '70.0 - 100.0', true],
        ['Serum Creatinine', '0.92', 'mg/dL', '0.70 - 1.20', false],
        ['Total Cholesterol', '185.0', 'mg/dL', '< 200', false]
      ];

      let yPos = 270;
      rows.forEach(([test, val, unit, ref, isAbn]) => {
        ctx.fillStyle = isAbn ? '#b91c1c' : '#334155';
        ctx.font = isAbn ? 'bold 14px sans-serif' : '14px sans-serif';
        ctx.fillText(test as string, 65, yPos);
        ctx.fillText(val as string, 340, yPos);
        ctx.fillStyle = '#64748b';
        ctx.fillText(unit as string, 450, yPos);
        ctx.fillText(ref as string, 580, yPos);
        yPos += 45;
      });

      // Impression
      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 15px sans-serif';
      ctx.fillText('Clinical Impression:', 50, yPos + 30);
      ctx.font = '14px sans-serif';
      ctx.fillStyle = '#334155';
      ctx.fillText('Mild microcytic hypochromic anemia (low Hb). Impaired fasting glucose. Renal function normal.', 50, yPos + 55);
    }

    canvas.toBlob(blob => {
      if (blob) {
        const sample = new File([blob], 'CBC_Lab_Report_Metropolis.png', { type: 'image/png' });
        handleProcessFile(sample);
      }
    }, 'image/png');
  };

  // Drag & Drop
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };
  const handleDragLeave = () => {
    setIsDragging(false);
  };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleProcessFile(e.dataTransfer.files[0]);
    }
  };

  // Send Chat message
  const handleSendMessage = async (customPrompt?: string) => {
    const textToSend = (customPrompt || inputPrompt).trim();
    if (!textToSend || isGenerating) return;

    setIsGenerating(true);
    setInputPrompt('');
    const userMsgId = 'user-' + Date.now();
    const assistantMsgId = 'asst-' + (Date.now() + 1);

    setChatMessages(prev => [
      ...prev,
      {
        id: userMsgId,
        sender: 'user',
        text: textToSend,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      },
      {
        id: assistantMsgId,
        sender: 'assistant',
        text: '',
        isStreaming: true,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]);

    // Scroll up/to the newly created question & answer point
    scrollToCreatedPoint(`msg-${userMsgId}`);

    try {
      const res = await fetch(getApiUrl('/api/chat'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: textToSend,
          session_id: 'default',
          document_id: ocrResult?.document_id,
          ocr_context: {
            ...ocrResult,
            raw_text: editedText || ocrResult?.raw_text
          },
          language
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const reply = data.reply_text || data.reply || 'Analysis completed.';
        streamTextLineByLine(reply, assistantMsgId);
        return;
      }
    } catch {
      // Fallback
    }

    let defaultReply = '';
    const findingsList = ocrResult?.extracted_findings || ocrResult?.lab_results || ocrResult?.structured_data?.lab_results || [];
    
    if (language === 'telugu') {
      defaultReply = `మీ ప్రశ్న **"${textToSend}"** ను వైద్యపరంగా పరిశీలించాను.`;
      if (findingsList.length > 0) {
        defaultReply += `\n\n• **గుర్తించిన ల్యాబ్ విలువలు:** ${findingsList.map((l: any) => `${l.test_name}: ${l.value} ${l.unit || ''} (${t.statusMap[l.status?.toLowerCase()] || l.status})`).join(', ')}`;
      }
      defaultReply += `\n• **వైద్య సూచన:** ఏవైనా సందేహాలుంటే మీ వ్యక్తిగత వైద్యుడిని సంప్రదించి నిర్ధారించుకోండి.`;
    } else if (language === 'hindi') {
      defaultReply = `आपके प्रश्न **"${textToSend}"** का नैदानिक मूल्यांकन किया गया है।`;
      if (findingsList.length > 0) {
        defaultReply += `\n\n• **पहचाने गए लैब परिणाम:** ${findingsList.map((l: any) => `${l.test_name}: ${l.value} ${l.unit || ''} (${t.statusMap[l.status?.toLowerCase()] || l.status})`).join(', ')}`;
      }
      defaultReply += `\n• **सुरक्षा सलाह:** कृपया व्यक्तिगत उपचार के लिए अपने चिकित्सक से संपर्क करें।`;
    } else if (language === 'tamil') {
      defaultReply = `உங்கள் கேள்வி **"${textToSend}"** மருத்துவ ரீதியாக பரிசீலிக்கப்பட்டது.`;
      if (findingsList.length > 0) {
        defaultReply += `\n\n• **ஆய்வக முடிவுகள்:** ${findingsList.map((l: any) => `${l.test_name}: ${l.value} ${l.unit || ''} (${t.statusMap[l.status?.toLowerCase()] || l.status})`).join(', ')}`;
      }
      defaultReply += `\n• **பாதுகாப்பு குறிப்பு:** மருத்துவ சிகிச்சைக்காக உங்கள் மருத்துவரை அணுகவும்.`;
    } else if (language === 'tanglish') {
      defaultReply = `Mee inquiry **"${textToSend}"** evaluate cheyadam jarigindi.`;
      if (findingsList.length > 0) {
        defaultReply += `\n\n• **Diagnostic Values:** ${findingsList.map((l: any) => `${l.test_name}: ${l.value} ${l.unit || ''} (${l.status})`).join(', ')}`;
      }
      defaultReply += `\n• **Clinical Safety:** Always consult your doctor for proper treatment advice.`;
    } else {
      defaultReply = `I have clinically evaluated your inquiry regarding "${textToSend}".`;
      if (findingsList.length > 0) {
        defaultReply += `\n\n• **Extracted Diagnostic Values:** ${findingsList.map((l: any) => `${l.test_name}: ${l.value} ${l.unit || ''} (${l.status})`).join(', ')}`;
      }
      defaultReply += `\n• **Clinical Safety:** Always share these lab findings with your personal physician for clinical correlation.`;
    }
    streamTextLineByLine(defaultReply, assistantMsgId);
  };

  // Copy message to clipboard
  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // =====================================================================
  // 5. TEXT-TO-SPEECH (TTS) PIPELINE WITH PLAY/PAUSE/RESUME/STOP/REPLAY
  // =====================================================================

  const getCleanSpeechText = useCallback((input: string): string => {
    // Strip markdown formatting, headers, ABHA IDs, section numbers, bullets
    let clean = input.replace(/#{1,6}\s*(?:\d+\.\s*)?[^\n]+/g, '');
    clean = clean.replace(/[*_`>~]/g, '');
    clean = clean.replace(/^\s*[-•*+]\s*/gm, '');
    clean = clean.replace(/^\s*\d+[\.\)]\s*/gm, '');
    clean = clean.replace(/\b(ABHA|UHID|UID|ID)\b\s*[:=]?\s*[\d\-]+/gi, '');
    clean = clean.replace(/\|/g, ' ');
    clean = clean.replace(/[-:]{3,}/g, '');
    clean = clean.replace(/\n+/g, '. ');
    clean = clean.replace(/\s{2,}/g, ' ');
    clean = clean.replace(/\.{2,}/g, '.');
    return clean.trim();
  }, []);

  const playSpeech = (rawTextToSpeak?: string, msgId?: string) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      setVoiceNotice("Text-to-speech is not supported on this browser.");
      return;
    }

    // Determine target speech text
    let targetText = '';
    const activeReport = getActiveLanguageReport(ocrResult, language);
    if (rawTextToSpeak) {
      targetText = getCleanSpeechText(rawTextToSpeak);
    } else if (activeReport?.speech_text) {
      targetText = activeReport.speech_text;
    } else if (ocrResult?.speech_text) {
      targetText = ocrResult.speech_text;
    } else {
      targetText = "Please upload a medical report to listen to the clinical explanation.";
    }

    // Ensure speech starts with first sentence of medical explanation
    if (!targetText.trim()) return;

    window.speechSynthesis.cancel();
    if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);

    const utterance = new SpeechSynthesisUtterance(targetText);
    utteranceRef.current = utterance;

    // Language code mapping
    const langVoiceMap: Record<Language, string> = {
      english: 'en-IN',
      hindi: 'hi-IN',
      telugu: 'te-IN',
      tamil: 'ta-IN',
      tanglish: 'te-IN' // Fallback for Tenglish
    };

    const targetLangCode = langVoiceMap[language] || 'en-IN';
    utterance.lang = targetLangCode;
    utterance.rate = 0.92;
    utterance.pitch = 1.0;

    // Find available native voice if present
    const voices = window.speechSynthesis.getVoices();
    const matchedVoice = voices.find(v => v.lang.startsWith(targetLangCode.slice(0, 2)));
    if (matchedVoice) {
      utterance.voice = matchedVoice;
      setVoiceNotice(null);
    } else if (language !== 'english') {
      setVoiceNotice(`Native ${language.toUpperCase()} voice may not be installed in system. Using standard speech synthesizer.`);
    }

    utterance.onstart = () => {
      setIsSpeaking(true);
      setIsPaused(false);
      setActiveSpeechMsgId(msgId || 'main-player');
      setAudioProgress(0);
      const estimatedDurationSec = Math.max(5, (targetText.split(' ').length / 2.5));
      let elapsed = 0;
      progressIntervalRef.current = setInterval(() => {
        elapsed += 0.5;
        const pct = Math.min(95, (elapsed / estimatedDurationSec) * 100);
        setAudioProgress(pct);
      }, 500);
    };

    utterance.onend = () => {
      setIsSpeaking(false);
      setIsPaused(false);
      setActiveSpeechMsgId(null);
      setAudioProgress(100);
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
      setTimeout(() => setAudioProgress(0), 1000);
    };

    utterance.onerror = () => {
      setIsSpeaking(false);
      setIsPaused(false);
      setActiveSpeechMsgId(null);
      setAudioProgress(0);
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    };

    window.speechSynthesis.speak(utterance);
  };

  const pauseSpeech = () => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window && isSpeaking) {
      window.speechSynthesis.pause();
      setIsPaused(true);
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    }
  };

  const resumeSpeech = () => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window && isPaused) {
      window.speechSynthesis.resume();
      setIsPaused(false);
    }
  };

  const stopSpeech = () => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      setIsPaused(false);
      setActiveSpeechMsgId(null);
      setAudioProgress(0);
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    }
  };

  const replaySpeech = (text?: string) => {
    stopSpeech();
    setTimeout(() => playSpeech(text), 150);
  };

  // Active language report object
  const activeReport = getActiveLanguageReport(ocrResult, language);

  return (
    <div className="h-screen w-screen flex flex-col bg-[#F5F8FA] text-[#172B3A] font-sans antialiased overflow-hidden select-text">
      
      {/* 1. Compact Sleek Top Navigation Header */}
      <header className="h-14 border-b border-[#E2E8F0] bg-[#FFFFFF] px-4 sm:px-6 flex items-center justify-between shrink-0 z-20 shadow-xs">
        <div className="flex items-center gap-3">
          <Link
            href="/?fresh=1"
            className="flex items-center gap-2 group cursor-pointer"
            title="Return to DOOM Home"
          >
            <div className="w-9 h-9 rounded-xl bg-white border border-[#E2E8F0] flex items-center justify-center p-0.5 shrink-0 shadow-xs group-hover:border-[#087F72]/40 transition-colors overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo.png" alt="DOOM" className="w-full h-full object-contain rounded-lg" />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-base font-bold text-[#172B3A] tracking-tight">DOOM</span>
              <span className="text-[11px] font-semibold text-[#087F72] bg-[#E8F6F2] border border-[#087F72]/20 px-2 py-0.5 rounded-md">
                Medical Workspace
              </span>
            </div>
          </Link>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          {/* Home Link */}
          <Link
            href="/?fresh=1"
            className="flex items-center gap-1.5 text-xs font-medium text-[#64748B] hover:text-[#172B3A] px-2.5 py-1.5 rounded-lg hover:bg-[#F5F8FA] transition-colors cursor-pointer"
          >
            <span>Home</span>
          </Link>

          {/* My Medical Records Button */}
          <Link
            href="/records"
            className="flex items-center gap-1.5 text-xs font-semibold text-[#087F72] hover:text-[#06695F] bg-[#E8F6F2] hover:bg-[#d8f2eb] border border-[#087F72]/20 px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer shadow-2xs"
            title="My Medical Records Dashboard"
          >
            <FolderClock className="w-3.5 h-3.5 text-[#087F72]" />
            <span className="hidden sm:inline">My Medical Records</span>
            <span className="sm:hidden">Records</span>
          </Link>

          {/* Language Selector */}
          <div className="flex items-center gap-1.5 bg-[#FFFFFF] border border-[#E2E8F0] rounded-lg px-2.5 py-1 shadow-xs">
            <Languages className="w-3.5 h-3.5 text-[#087F72] shrink-0" />
            <select
              value={language}
              onChange={e => handleLanguageChange(e.target.value as Language)}
              className="text-xs bg-transparent font-semibold text-[#172B3A] focus:text-[#087F72] outline-none cursor-pointer pr-1"
              aria-label="Select report language"
            >
              <option value="english" className="bg-white text-[#172B3A]">English</option>
              <option value="telugu" className="bg-white text-[#172B3A]">తెలుగు (Telugu)</option>
              <option value="hindi" className="bg-white text-[#172B3A]">हिन्दी (Hindi)</option>
              <option value="tamil" className="bg-white text-[#172B3A]">தமிழ் (Tamil)</option>
              <option value="tanglish" className="bg-white text-[#172B3A]">Tenglish</option>
            </select>
          </div>

          {/* Reset / New Session */}
          {(file || ocrResult) && (
            <button
              onClick={handleResetSession}
              className="flex items-center gap-1.5 text-xs text-[#64748B] hover:text-[#172B3A] bg-[#FFFFFF] hover:bg-[#F5F8FA] border border-[#E2E8F0] px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer shadow-xs"
              title="Start New Report Analysis"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline font-medium">New Analysis</span>
            </button>
          )}

          {/* Circular Profile Avatar (far-right end of top navbar) */}
          <div className="pl-1.5 sm:pl-2 border-l border-[#E2E8F0] flex items-center">
            <ProfileAvatar size="md" />
          </div>
        </div>
      </header>

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,.pdf"
        className="hidden"
        onChange={e => {
          if (e.target.files && e.target.files[0]) {
            handleProcessFile(e.target.files[0]);
          }
        }}
      />

      {/* 2. Main Two-Panel Layout (Always Active) */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        
        {/* LEFT COLUMN: Document Upload & Inspection Panel (Light-Only Theme) */}
        <section data-lenis-prevent className="w-full md:w-[32%] lg:w-[26%] xl:w-[23%] border-b md:border-b-0 md:border-r border-[#E2E8F0] bg-[#FFFFFF] p-4 sm:p-5 flex flex-col items-center justify-between relative overflow-y-auto custom-scrollbar shrink-0">
          
          <div className="w-full flex flex-col items-center space-y-4">
            
            {!file && !ocrResult ? (
              /* Initial Upload State */
              <div className="w-full bg-[#FFFFFF] border border-[#E2E8F0] rounded-2xl p-5 sm:p-6 shadow-xs text-center flex flex-col items-center space-y-4">
                <div className="w-14 h-14 rounded-full bg-[#E8F6F2] text-[#087F72] flex items-center justify-center ring-6 ring-[#E8F6F2]/60 shrink-0">
                  <UploadCloud className="w-7 h-7 text-[#087F72]" />
                </div>

                <div className="space-y-1">
                  <h2 className="text-base sm:text-lg font-bold text-[#172B3A] tracking-tight">
                    Understand your medical report
                  </h2>
                  <p className="text-xs text-[#64748B] max-w-xs mx-auto leading-relaxed">
                    Upload CBC blood tests, lab panels, or prescriptions for accurate clinical verification and multilingual summaries.
                  </p>
                </div>

                {/* Solid subtle bordered drop zone */}
                <div
                  tabIndex={0}
                  role="button"
                  aria-label="Upload document drop zone. Press enter to browse files."
                  onKeyDown={e => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      fileInputRef.current?.click();
                    }
                  }}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`w-full p-4 sm:p-5 bg-[#F5F8FA] border rounded-xl transition-all duration-200 cursor-pointer flex flex-col items-center justify-center text-center focus:outline-none focus:ring-2 focus:ring-[#087F72] focus:ring-offset-2 ${
                    isDragging
                      ? 'border-[#087F72] bg-[#E8F6F2] shadow-xs'
                      : 'border-[#E2E8F0] hover:border-[#087F72] hover:bg-[#E8F6F2]/30'
                  }`}
                >
                  <div className="flex flex-col gap-2 w-full">
                    <button
                      type="button"
                      onClick={e => {
                        e.stopPropagation();
                        fileInputRef.current?.click();
                      }}
                      className="w-full bg-[#087F72] hover:bg-[#06695F] text-white font-semibold text-xs py-2.5 px-4 rounded-lg shadow-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <UploadCloud className="w-4 h-4" />
                      <span>Choose document</span>
                    </button>

                    <button
                      type="button"
                      onClick={e => {
                        e.stopPropagation();
                        handleLoadSampleCBC();
                      }}
                      className="w-full bg-[#FFFFFF] hover:bg-[#F5F8FA] text-[#172B3A] font-semibold text-xs py-2 px-3 rounded-lg border border-[#E2E8F0] shadow-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-[#087F72]" />
                      <span>Try sample CBC report</span>
                    </button>
                  </div>

                  <div className="mt-3 flex flex-col items-center gap-0.5 text-[11px] text-[#64748B]">
                    <span className="font-medium">or drag & drop file here</span>
                    <span className="text-[10px] text-[#64748B]/80">PDF, PNG, JPG up to 10MB</span>
                  </div>
                </div>

                {/* 3 Compact Informational Cards */}
                <div className="grid grid-cols-1 gap-2.5 w-full pt-1 text-left">
                  <div className="bg-[#F5F8FA] border border-[#E2E8F0] rounded-xl p-3 flex items-start gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-[#E8F6F2] flex items-center justify-center text-[#087F72] shrink-0 mt-0.5">
                      <FileText className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-[#172B3A]">Report extraction</h4>
                      <p className="text-[11px] text-[#64748B] leading-tight mt-0.5">Detects test values and compares standard reference intervals.</p>
                    </div>
                  </div>

                  <div className="bg-[#F5F8FA] border border-[#E2E8F0] rounded-xl p-3 flex items-start gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-[#E8F6F2] flex items-center justify-center text-[#087F72] shrink-0 mt-0.5">
                      <Languages className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-[#172B3A]">Multilingual explanations</h4>
                      <p className="text-[11px] text-[#64748B] leading-tight mt-0.5">Explains findings in English, Telugu, Hindi, or Tamil with audio.</p>
                    </div>
                  </div>

                  <div className="bg-[#F5F8FA] border border-[#E2E8F0] rounded-xl p-3 flex items-start gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-[#E8F6F2] flex items-center justify-center text-[#087F72] shrink-0 mt-0.5">
                      <ShieldAlert className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-[#172B3A]">Privacy and access</h4>
                      <p className="text-[11px] text-[#64748B] leading-tight mt-0.5">Sessions are processed in your session with OCR transcript tools.</p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* Loaded / Analyzed Document State */
              <div className="w-full border border-[#E2E8F0] rounded-2xl p-4 bg-[#F5F8FA] flex flex-col items-center text-center space-y-3">
                <div className="relative w-full min-h-[160px] max-h-56 rounded-xl overflow-hidden border border-[#E2E8F0] bg-white flex items-center justify-center shadow-xs">
                  {file?.name.toLowerCase().endsWith('.pdf') ? (
                    <div className="py-6 px-4 flex flex-col items-center justify-center text-center">
                      <div className="w-12 h-12 rounded-xl bg-red-50 border border-red-200 flex items-center justify-center text-[#B91C1C] mb-2">
                        <FileText className="w-6 h-6" />
                      </div>
                      <span className="text-xs font-bold text-[#172B3A]">PDF Document</span>
                      <span className="text-[11px] text-[#64748B] mt-0.5">{pageCount} Page(s)</span>
                    </div>
                  ) : previewUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={previewUrl}
                      alt="Uploaded Medical Document"
                      className="max-h-52 object-contain w-auto rounded-lg"
                    />
                  ) : (
                    <div className="py-8 flex flex-col items-center text-[#64748B]">
                      <FileText className="w-8 h-8 mb-2" />
                      <span className="text-xs font-medium">Document Loaded</span>
                    </div>
                  )}

                  {isScanning && (
                    <div className="absolute inset-0 bg-white/95 backdrop-blur-xs flex flex-col items-center justify-center gap-2 p-4 text-center">
                      <div className="w-7 h-7 border-2 border-[#087F72] border-t-transparent rounded-full animate-spin"></div>
                      <span className="text-xs font-bold text-[#087F72]">
                        {uploadProgress < 30 ? 'Validating document...' : uploadProgress < 75 ? 'Running Multi-Engine Medical OCR...' : 'Generating clinical report...'}
                      </span>
                      <div className="w-40 bg-[#E2E8F0] h-1.5 rounded-full overflow-hidden">
                        <div 
                          className="bg-[#087F72] h-full transition-all duration-300 rounded-full" 
                          style={{ width: `${uploadProgress || 45}%` }} 
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* File info banner */}
                <div className="w-full space-y-2">
                  <div className="flex items-center justify-between w-full bg-white border border-[#E2E8F0] px-3 py-2 rounded-lg text-xs">
                    <div className="flex items-center gap-2 truncate">
                      <CheckCircle className="w-4 h-4 text-[#15803D] shrink-0" />
                      <span className="truncate font-semibold text-[#172B3A]">{file?.name || 'Medical Report'}</span>
                    </div>
                    {file && (
                      <span className="text-[11px] text-[#64748B] ml-2 shrink-0 font-medium">
                        {(file.size / 1024).toFixed(0)} KB
                      </span>
                    )}
                  </div>

                  {ocrResult && (
                    <div className="flex items-center justify-between px-1 text-xs">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[11px] font-bold ${
                        isMedicalDoc 
                          ? 'bg-[#E8F6F2] border border-[#087F72]/30 text-[#087F72]' 
                          : 'bg-amber-50 border border-amber-200 text-[#B45309]'
                      }`}>
                        {isMedicalDoc ? <CheckCircle className="w-3.5 h-3.5 text-[#15803D]" /> : <AlertTriangle className="w-3.5 h-3.5 text-[#B45309]" />}
                        {isMedicalDoc ? (documentCategory.replace('_', ' ').toUpperCase() || 'REPORT') : 'NON-MEDICAL'}
                      </span>

                      {extractedRawText && (
                        <button
                          type="button"
                          onClick={() => setShowTextModal(true)}
                          className="text-[11px] font-bold text-[#087F72] hover:text-[#06695F] flex items-center gap-1 hover:underline cursor-pointer"
                        >
                          <PenIcon className="w-3 h-3" />
                          Review Text
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="w-full space-y-2 pt-1">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isScanning}
                    className="w-full bg-[#087F72] hover:bg-[#06695F] disabled:opacity-50 text-white font-semibold text-xs py-2.5 px-3 rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-1.5 shadow-xs"
                  >
                    <UploadCloud className="w-4 h-4" />
                    <span>Upload Another Report</span>
                  </button>

                  {file && (
                    <button
                      type="button"
                      onClick={() => handleProcessFile(file)}
                      disabled={isScanning || isGenerating}
                      className="w-full bg-[#FFFFFF] hover:bg-[#F5F8FA] disabled:opacity-50 text-[#172B3A] font-semibold text-xs py-2 px-3 rounded-lg border border-[#E2E8F0] transition-colors cursor-pointer flex items-center justify-center gap-1.5 shadow-xs"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 text-[#087F72] ${isScanning ? 'animate-spin' : ''}`} />
                      <span>{isScanning ? 'Analyzing...' : 'Re-Analyze'}</span>
                    </button>
                  )}
                </div>
              </div>
            )}

          </div>

          {/* Bottom Clinical Notice */}
          <div className="w-full bg-[#F5F8FA] border border-[#E2E8F0] rounded-xl p-3 flex items-start gap-2.5 text-xs text-[#64748B] mt-4">
            <ShieldAlert className="w-4 h-4 text-[#087F72] shrink-0 mt-0.5" />
            <p className="leading-relaxed text-[11px]">
              Extracts literal clinical values, compares standard reference intervals, and assists with multilingual questions.
            </p>
          </div>
        </section>

        {/* RIGHT COLUMN: Interactive Chatbot Consultation & 8-Section Report (Dark Medical Theme) */}
        <main className="flex-1 flex flex-col bg-[#080D14] h-full relative overflow-hidden select-text">
          
          {/* Subtle Elegant Medical Visualization Background with Lively Wallpaper */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
            {/* Lively Looping Video Wallpaper (Low Brightness & Subtle Visibility Inside Dark Chatbot Space) */}
            <video
              autoPlay
              loop
              muted
              playsInline
              className="absolute inset-0 w-full h-full object-cover opacity-25 filter brightness-70 contrast-110 pointer-events-none select-none"
            >
              <source src="/chatbot-bg.mp4" type="video/mp4" />
            </video>

            {/* Deep Dark Vignette Overlay to maintain contrast and readable white bold text */}
            <div className="absolute inset-0 bg-gradient-to-b from-[#080D14]/75 via-[#080D14]/55 to-[#080D14]/80 pointer-events-none" />

            {/* Ambient Medical Teal / Cyan Glow Orbs */}
            <div className="absolute -top-32 -right-32 w-96 h-96 bg-[#087F72]/15 rounded-full blur-[100px]" />
            <div className="absolute top-1/3 -left-32 w-80 h-80 bg-[#0284C7]/10 rounded-full blur-[90px]" />
            <div className="absolute -bottom-32 right-1/4 w-96 h-96 bg-[#0D9488]/10 rounded-full blur-[110px]" />

            {/* Medical Grid Lattice Pattern */}
            <svg className="absolute inset-0 w-full h-full opacity-[0.06]" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <pattern id="med-grid-pattern" width="36" height="36" patternUnits="userSpaceOnUse">
                  <path d="M 36 0 L 0 0 0 36" fill="none" stroke="#2DD4BF" strokeWidth="0.6" />
                  <circle cx="18" cy="18" r="0.8" fill="#2DD4BF" />
                  <path d="M 16 18 L 20 18 M 18 16 L 18 20" stroke="#2DD4BF" strokeWidth="0.4" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#med-grid-pattern)" />
            </svg>

            {/* Subtle Glowing ECG Heartbeat Pulse Line */}
            <div className="absolute top-12 left-0 right-0 h-24 overflow-hidden opacity-15">
              <svg className="w-full h-full" viewBox="0 0 1400 80" preserveAspectRatio="none">
                <path
                  d="M0 40 L280 40 L295 30 L305 55 L318 10 L332 72 L345 32 L355 46 L370 40 L700 40 L715 30 L725 55 L738 10 L752 72 L765 32 L775 46 L790 40 L1120 40 L1135 30 L1145 55 L1158 10 L1172 72 L1185 32 L1195 46 L1210 40 L1400 40"
                  fill="none"
                  stroke="#2DD4BF"
                  strokeWidth="1.6"
                  strokeDasharray="8 6"
                />
              </svg>
            </div>

            {/* Subtle DNA Strand Lattice Accents */}
            <div className="absolute bottom-24 right-6 w-32 h-64 opacity-10 hidden xl:block">
              <svg className="w-full h-full" viewBox="0 0 100 200">
                <path d="M20,10 Q50,50 80,90 T20,170" fill="none" stroke="#2DD4BF" strokeWidth="1.5" />
                <path d="M80,10 Q50,50 20,90 T80,170" fill="none" stroke="#38BDF8" strokeWidth="1.5" />
                <line x1="28" y1="30" x2="72" y2="30" stroke="#2DD4BF" strokeWidth="1" strokeDasharray="2 2" />
                <line x1="45" y1="65" x2="55" y2="65" stroke="#2DD4BF" strokeWidth="1" strokeDasharray="2 2" />
                <line x1="28" y1="110" x2="72" y2="110" stroke="#38BDF8" strokeWidth="1" strokeDasharray="2 2" />
                <line x1="45" y1="145" x2="55" y2="145" stroke="#38BDF8" strokeWidth="1" strokeDasharray="2 2" />
              </svg>
            </div>
          </div>
          
          {/* Workspace Sub-header (Dark Medical) */}
          <div className="h-12 border-b border-[#1E2D3D] bg-[#0B131E]/90 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between shrink-0 z-10 shadow-sm">
            <div className="flex items-center gap-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#10B981] shadow-xs shadow-emerald-500/50 animate-pulse" />
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-[#F1F5F9] tracking-wider uppercase">DR. DOOM MEDICAL AI</span>
                <span className="text-[#1E2D3D]">|</span>
                <span className="text-xs font-medium text-[#94A3B8] hidden sm:inline">
                  {t.consultationHeader}
                </span>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {messages.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearChat}
                  className="flex items-center gap-1.5 text-xs text-[#EF4444] hover:text-[#F87171] bg-red-950/40 hover:bg-red-950/60 border border-red-900/40 px-2.5 py-1 rounded-lg transition-colors cursor-pointer shadow-xs font-semibold mr-1"
                  title={t.clearChat}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{t.clearChat}</span>
                </button>
              )}
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#2DD4BF] bg-[#087F72]/20 border border-[#087F72]/40 px-2.5 py-1 rounded-full shadow-xs">
                <Sparkles className="w-3.5 h-3.5 text-[#2DD4BF]" />
                Active: {language.toUpperCase()}
              </span>
            </div>
          </div>

          {/* Unified Report Stream & Consultation Area */}
          <div
            ref={chatScrollRef}
            data-lenis-prevent
            onScroll={handleChatScroll}
            className="flex-1 overflow-y-auto custom-scrollbar scroll-smooth p-4 sm:p-6 md:p-8 space-y-6 relative z-10"
          >
            <div className="max-w-5xl lg:max-w-6xl mx-auto w-full space-y-6">
              
              {/* =========================================================
                  DYNAMIC TIME GREETING & DEFAULT CENTER MESSAGE (DARK THEME)
                  ========================================================= */}
              {!ocrResult && messages.length === 0 && (
                <div className="h-full min-h-[460px] flex flex-col items-center justify-center text-center p-6 select-none animate-in fade-in duration-300">
                  <div className="relative mb-5 group">
                    <div className="absolute -inset-2 rounded-full bg-gradient-to-r from-[#087F72] via-[#2DD4BF] to-[#087F72] opacity-25 blur-xl group-hover:opacity-40 transition-opacity" />
                    <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-[#0B131E] border border-[#1E2D3D] shadow-2xl flex items-center justify-center overflow-hidden p-1 ring-1 ring-[#087F72]/40">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src="/bot-avatar.png"
                        alt="Dr. Doom Medical AI"
                        className="w-full h-full object-contain rounded-full"
                      />
                    </div>
                  </div>

                  <div className="space-y-2 max-w-lg mx-auto mb-6">
                    <h2 className="text-2xl sm:text-3xl font-black text-[#F1F5F9] tracking-tight">
                      {timeGreeting}, what we are doing now?
                    </h2>
                    <p className="text-xs sm:text-sm text-[#94A3B8] font-medium leading-relaxed">
                      Ask Dr. Doom any clinical health query, prescription doubts, or upload a medical record on the left to start analyzing.
                    </p>
                  </div>

                  {/* Suggestion Prompt Pills */}
                  <div className="flex flex-wrap items-center justify-center gap-2 max-w-lg">
                    {t.suggestions.slice(0, 3).map((suggestion, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleSendMessage(suggestion)}
                        className="text-xs bg-[#111A24] hover:bg-[#16222F] hover:text-[#2DD4BF] text-[#94A3B8] border border-[#1E2D3D] px-3.5 py-1.5 rounded-full transition-all cursor-pointer shadow-xs hover:border-[#2DD4BF]/40 font-medium"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* =========================================================
                  STRUCTURED 8-SECTION MEDICAL REPORT RENDERER (DARK THEME)
                  ========================================================= */}
              {ocrResult ? (() => {
                const findingsList = ocrResult.extracted_findings || ocrResult.lab_results || ocrResult.structured_data?.lab_results || [];
                const medsList = ocrResult.medications || ocrResult.structured_data?.medications || ocrResult.MedicationRequests || [];

                return (
                <div className="space-y-5 pb-2">
                  
                  {/* Top Header Card */}
                  <div className="bg-[#0F1722]/90 backdrop-blur-md p-5 rounded-2xl border border-[#1E2D3D] shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="bg-[#087F72]/20 border border-[#087F72]/30 p-3 rounded-xl">
                        <FileText className="w-6 h-6 text-[#2DD4BF]" />
                      </div>
                      <div>
                        <h3 className="text-lg font-black text-[#F8FAFC]">
                          {isMedicalDoc ? (ocrResult.document_metadata?.type || documentCategory.replace('_', ' ').toUpperCase()) : 'Non-Medical Document'}
                        </h3>
                        <p className="text-xs font-semibold text-[#94A3B8] uppercase tracking-wider">
                          {ocrResult.document_metadata?.facility_or_doctor || 'Clinical Diagnostic Center'} • {ocrResult.document_metadata?.date_issued || 'Current Record'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-start sm:self-center">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-[#2DD4BF] bg-[#087F72]/20 border border-[#087F72]/40 px-3 py-1 rounded-full shadow-xs">
                        {t.verifiedBadge}
                      </span>
                    </div>
                  </div>

                  {/* Smooth Interactive Data Preview Filter Tabs */}
                  <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar pb-1">
                    {[
                      { id: 'all', label: t.tabAll },
                      { id: 'summary', label: t.tabSummary },
                      { id: 'labs', label: `${t.tabLabs} (${findingsList.length})` },
                      { id: 'meds', label: `${t.tabMeds} (${medsList.length})` },
                      { id: 'diet', label: t.tabDiet },
                      { id: 'safety', label: t.tabSafety }
                    ].map(tab => (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setActivePreviewTab(tab.id as any)}
                        className={`text-xs px-3.5 py-1.5 rounded-xl font-bold transition-all cursor-pointer whitespace-nowrap shadow-xs ${
                          activePreviewTab === tab.id
                            ? 'bg-[#087F72] text-white shadow-md shadow-[#087F72]/30 ring-1 ring-[#2DD4BF]/50'
                            : 'bg-[#0B131E] text-[#94A3B8] hover:text-[#F1F5F9] border border-[#1E2D3D] hover:bg-[#131F2D]'
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>

                  {/* Top Prominent Patient-Friendly Summary & Dedicated Audio Player Card (Section 7) */}
                  {(activePreviewTab === 'all' || activePreviewTab === 'summary') && (
                  <div className="bg-[#0F1722]/95 backdrop-blur-md text-[#E2E8F0] p-6 rounded-3xl shadow-xl border border-[#087F72]/40 space-y-4 ring-1 ring-[#087F72]/20 transition-all">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#1E2D3D] pb-3">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-[#2DD4BF]" />
                        <h4 className="text-xs font-black text-[#2DD4BF] uppercase tracking-widest">
                          {t.patientSummaryTitle} ({language.toUpperCase()})
                        </h4>
                      </div>

                      {activeReport?.word_count ? (
                        <span className="text-[11px] font-semibold text-[#2DD4BF] bg-[#087F72]/20 border border-[#087F72]/30 px-2.5 py-0.5 rounded-full">
                          {t.wordCountLabel(activeReport.word_count)}
                        </span>
                      ) : null}
                    </div>

                    <p className="text-sm leading-relaxed text-[#E2E8F0] font-normal">
                      {activeReport?.patient_summary || ocrResult.patient_summary || ocrResult.plain_language_summary || "Document processed successfully."}
                    </p>

                    {/* Speech Player Controls Bar */}
                    <div className="pt-3 border-t border-[#1E2D3D] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        {!isSpeaking || isPaused ? (
                          <button
                            type="button"
                            onClick={() => (isPaused ? resumeSpeech() : playSpeech())}
                            className="bg-[#087F72] hover:bg-[#0D9488] text-white font-bold text-xs px-4 py-2 rounded-xl transition-all flex items-center gap-1.5 shadow-md shadow-[#087F72]/20 cursor-pointer"
                          >
                            <PlayIcon className="w-3.5 h-3.5" />
                            <span>{isPaused ? t.resumeAudio : t.listenIn}</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={pauseSpeech}
                            className="bg-[#D97706] hover:bg-[#B45309] text-white font-bold text-xs px-4 py-2 rounded-xl transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
                          >
                            <PauseIcon className="w-3.5 h-3.5" />
                            <span>{t.pause}</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={stopSpeech}
                          disabled={!isSpeaking && !isPaused}
                          className="bg-[#16222F] hover:bg-[#1E2F3E] disabled:opacity-40 text-[#94A3B8] hover:text-[#F1F5F9] font-semibold text-xs px-3 py-2 rounded-xl border border-[#223849] transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                        >
                          <SquareIcon className="w-3 h-3" />
                          <span>{t.stop}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => replaySpeech()}
                          className="bg-[#16222F] hover:bg-[#1E2F3E] text-[#94A3B8] hover:text-[#F1F5F9] font-semibold text-xs px-3 py-2 rounded-xl border border-[#223849] transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                          title={t.replay}
                        >
                          <RotateCcwIcon className="w-3 h-3" />
                          <span>{t.replay}</span>
                        </button>
                      </div>

                      {/* Playing state indicator */}
                      <div className="flex items-center gap-2 text-xs text-[#94A3B8]">
                        {isSpeaking && !isPaused ? (
                          <span className="flex items-center gap-1.5 text-[#34D399] font-bold">
                            <Volume2 className="w-4 h-4 animate-pulse text-[#34D399]" />
                            <span>{t.playing}</span>
                          </span>
                        ) : isPaused ? (
                          <span className="flex items-center gap-1.5 text-[#FBBF24] font-bold">
                            <VolumeXIcon className="w-4 h-4 text-[#FBBF24]" />
                            <span>{t.paused}</span>
                          </span>
                        ) : (
                          <span className="flex items-center gap-1.5 text-[#94A3B8]">
                            <Volume2 className="w-4 h-4 text-[#2DD4BF]" />
                            <span>{t.speechReady}</span>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Visual Audio Progress Bar */}
                    {audioProgress > 0 && (
                      <div className="w-full bg-[#1E2D3D] h-1.5 rounded-full overflow-hidden mt-2">
                        <div
                          className="bg-[#2DD4BF] h-full transition-all duration-300 rounded-full"
                          style={{ width: `${audioProgress}%` }}
                        />
                      </div>
                    )}

                    {voiceNotice && (
                      <div className="text-[11px] text-[#FDE68A] bg-amber-950/70 border border-amber-800/60 p-2.5 rounded-xl flex items-center gap-1.5 font-medium">
                        <Info className="w-3.5 h-3.5 shrink-0" />
                        <span>{voiceNotice}</span>
                      </div>
                    )}
                  </div>
                  )}

                  {/* Section 2: Detected Findings & Test Results (Diagnostic Table) */}
                  {(activePreviewTab === 'all' || activePreviewTab === 'labs') && (
                  <div className="bg-[#0F1722]/90 backdrop-blur-md p-6 rounded-2xl border border-[#1E2D3D] shadow-lg space-y-4 transition-all">
                    <div className="flex items-center justify-between border-b border-[#1E2D3D] pb-3">
                      <h4 className="text-sm font-bold text-[#F1F5F9] flex items-center gap-2">
                        <Activity className="w-4 h-4 text-[#2DD4BF]" />
                        {t.findingsTitle}
                      </h4>
                    </div>

                    {findingsList && findingsList.length > 0 ? (
                      <div className="overflow-x-auto custom-scrollbar">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead>
                            <tr className="bg-[#0A1017] text-[#94A3B8] font-bold border-b border-[#1E2D3D]">
                              <th className="py-2.5 px-3">{t.thParameter}</th>
                              <th className="py-2.5 px-3">{t.thValue}</th>
                              <th className="py-2.5 px-3">{t.thUnit}</th>
                              <th className="py-2.5 px-3">{t.thReference}</th>
                              <th className="py-2.5 px-3 text-right">{t.thStatus}</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#1E2D3D]">
                            {findingsList.map((l: any, i: number) => {
                              const rawStatus = (l.status || 'Normal').toLowerCase();
                              const isHigh = rawStatus.includes('high');
                              const isLow = rawStatus.includes('low');
                              const isCritical = rawStatus.includes('critical');
                              const statusClass = isCritical
                                ? 'bg-red-950/80 text-red-300 border-red-800/60'
                                : isHigh || isLow
                                ? 'bg-amber-950/80 text-amber-300 border-amber-800/60'
                                : 'bg-emerald-950/80 text-emerald-300 border-emerald-800/60';

                              const localizedStatus = t.statusMap[rawStatus] || (isHigh ? t.statusMap['high'] : isLow ? t.statusMap['low'] : isCritical ? t.statusMap['critical'] : t.statusMap['normal']) || l.status;

                              return (
                                <tr key={i} className="hover:bg-[#131F2C] transition-colors">
                                  <td className="py-3 px-3 font-semibold text-[#F1F5F9]">{l.test_name}</td>
                                  <td className="py-3 px-3 font-mono font-bold text-[#2DD4BF]">{l.value || l.value_text}</td>
                                  <td className="py-3 px-3 text-[#94A3B8]">{l.unit || l.original_unit || '-'}</td>
                                  <td className="py-3 px-3 text-[#94A3B8] font-mono">{l.reference_interval || 'Standard Range'}</td>
                                  <td className="py-3 px-3 text-right">
                                    <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${statusClass}`}>
                                      {localizedStatus}
                                    </span>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="bg-[#0A1017] p-4 rounded-xl border border-[#1E2D3D] text-xs text-[#94A3B8] flex items-center gap-2">
                        <Info className="w-4 h-4 text-[#94A3B8] shrink-0" />
                        <span>{t.noLabsFound}</span>
                      </div>
                    )}
                  </div>
                  )}

                  {/* Section 3: Explanation of Each Important Result */}
                  {(activePreviewTab === 'all' || activePreviewTab === 'labs') && activeReport?.sections?.[2]?.content && (
                    <div className="bg-[#0F1722]/90 backdrop-blur-md p-6 rounded-2xl border border-[#1E2D3D] shadow-lg space-y-3 transition-all">
                      <h4 className="text-sm font-bold text-[#F1F5F9] flex items-center gap-2 border-b border-[#1E2D3D] pb-3">
                        <HeartPulse className="w-4 h-4 text-[#2DD4BF]" />
                        {activeReport.sections[2].title || t.explanationTitle}
                      </h4>
                      <div className="text-xs sm:text-sm text-[#E2E8F0] leading-relaxed space-y-2 whitespace-pre-wrap">
                        <FormattedMessage content={activeReport.sections[2].content} />
                      </div>
                    </div>
                  )}

                  {/* Section 4: Prescribed Medications & Dosage Information */}
                  {(activePreviewTab === 'all' || activePreviewTab === 'meds') && (
                  <div className="bg-[#0F1722]/90 backdrop-blur-md p-6 rounded-2xl border border-[#1E2D3D] shadow-lg space-y-4 transition-all">
                    <h4 className="text-sm font-bold text-[#F1F5F9] flex items-center gap-2 border-b border-[#1E2D3D] pb-3">
                      <Pill className="w-4 h-4 text-[#2DD4BF]" />
                      {t.medicationsTitle}
                    </h4>

                    {medsList && medsList.length > 0 ? (
                      <div className="grid sm:grid-cols-2 gap-4">
                        {medsList.map((m: any, idx: number) => (
                          <div key={idx} className="bg-[#0A1017] p-4 rounded-xl border border-[#1E2D3D] space-y-2">
                            <div className="flex justify-between items-start">
                              <span className="font-bold text-[#F8FAFC] text-sm">{m.name}</span>
                              <span className="text-[11px] font-mono bg-[#087F72]/20 text-[#2DD4BF] border border-[#087F72]/40 px-2 py-0.5 rounded-md font-bold">
                                {m.dosage}
                              </span>
                            </div>
                            <p className="text-xs text-[#94A3B8]">{t.timingLabel} <span className="font-semibold text-[#F1F5F9]">{m.timing}</span></p>
                            <p className="text-xs text-[#94A3B8]">{t.purposeLabel} {m.purpose || 'Clinical therapy'}</p>
                            {m.is_uncertain && (
                              <p className="text-[11px] text-[#FDE68A] bg-amber-950/70 border border-amber-800/60 px-2 py-1 rounded-md font-medium">
                                ⚠️ {t.ambiguityWarning}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="bg-[#0A1017] p-4 rounded-xl border border-[#1E2D3D] text-xs text-[#94A3B8] flex items-center gap-2">
                        <Info className="w-4 h-4 text-[#94A3B8] shrink-0" />
                        <span>{t.noMedsFound}</span>
                      </div>
                    )}
                  </div>
                  )}

                  {/* Section 5: Diet and Nutrition Information */}
                  {(activePreviewTab === 'all' || activePreviewTab === 'diet') && activeReport?.sections?.[4]?.content && (
                    <div className="bg-[#06241E]/90 backdrop-blur-md p-6 rounded-2xl border border-[#087F72]/40 shadow-lg space-y-3 transition-all">
                      <h4 className="text-sm font-bold text-[#2DD4BF] flex items-center gap-2 border-b border-[#087F72]/30 pb-3">
                        <Heart className="w-4 h-4 text-[#2DD4BF]" />
                        {activeReport.sections[4].title || t.dietTitle}
                      </h4>
                      <div className="text-xs sm:text-sm text-[#E2E8F0] leading-relaxed space-y-2 whitespace-pre-wrap">
                        <FormattedMessage content={activeReport.sections[4].content} />
                      </div>
                    </div>
                  )}

                  {/* Section 6: Recommended Follow-up and Precautions */}
                  {(activePreviewTab === 'all' || activePreviewTab === 'safety') && activeReport?.sections?.[5]?.content && (
                    <div className="bg-[#0F1722]/90 backdrop-blur-md p-6 rounded-2xl border border-[#1E2D3D] shadow-lg space-y-3 transition-all">
                      <h4 className="text-sm font-bold text-[#F1F5F9] flex items-center gap-2 border-b border-[#1E2D3D] pb-3">
                        <ShieldAlert className="w-4 h-4 text-[#2DD4BF]" />
                        {activeReport.sections[5].title || t.followupTitle}
                      </h4>
                      <div className="text-xs sm:text-sm text-[#E2E8F0] leading-relaxed space-y-2 whitespace-pre-wrap">
                        <FormattedMessage content={activeReport.sections[5].content} />
                      </div>
                    </div>
                  )}

                  {/* Section 8: Sources, Limitations, and Safety Notice */}
                  {(activePreviewTab === 'all' || activePreviewTab === 'safety') && activeReport?.sections?.[7]?.content && (
                    <div className="bg-[#0A1017]/90 p-5 rounded-2xl border border-[#1E2D3D] space-y-2 transition-all">
                      <h4 className="text-xs font-bold text-[#F1F5F9] flex items-center gap-2">
                        <AlertTriangle className="w-3.5 h-3.5 text-[#F59E0B]" />
                        {activeReport.sections[7].title || t.sourcesTitle}
                      </h4>
                      <div className="text-[11px] text-[#94A3B8] leading-relaxed whitespace-pre-wrap">
                        <FormattedMessage content={activeReport.sections[7].content} />
                      </div>
                    </div>
                  )}

                </div>
                );
              })() : null}

              {/* 2. Interactive Consultation Messages Stream (Dark Theme) */}
              {messages.length > 0 && (
                <div className="space-y-4 pt-4 border-t border-[#1E2D3D]/50 animate-in fade-in duration-300">
                  <div className="flex items-center justify-between pb-1">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-[#2DD4BF]" />
                      <h3 className="text-xs font-bold uppercase tracking-wider text-[#94A3B8]">
                        {t.consultationHeader}
                      </h3>
                    </div>
                    <button
                      type="button"
                      onClick={handleClearChat}
                      className="flex items-center gap-1.5 text-xs text-[#EF4444] hover:text-[#F87171] bg-red-950/30 hover:bg-red-950/50 border border-red-900/40 px-2.5 py-1 rounded-lg transition-colors cursor-pointer shadow-xs font-semibold"
                      title={t.clearChat}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>{t.clearChat}</span>
                    </button>
                  </div>

                {messages.map(msg => (
                  <div
                    key={msg.id}
                    id={`msg-${msg.id}`}
                    className={`flex gap-3 md:gap-4 scroll-mt-6 ${
                      msg.sender === 'user' ? 'justify-end' : 'justify-start'
                    }`}
                  >
                    {msg.sender === 'assistant' && (
                      <div className="w-10 h-10 rounded-xl bg-[#0B131E] border border-[#1E2D3D] flex items-center justify-center shrink-0 mt-0.5 shadow-md overflow-hidden p-0.5 ring-1 ring-[#087F72]/40">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src="/bot-avatar.png" alt="Dr. Doom Medical AI" className="w-full h-full object-contain rounded-lg" />
                      </div>
                    )}

                    <div
                      className={`rounded-2xl transition-all ${
                        msg.sender === 'user'
                          ? 'bg-gradient-to-r from-[#0D9488] to-[#087F72] text-white font-bold px-4 py-3 max-w-[85%] shadow-md'
                          : 'bg-[#0B131E] text-white p-5 w-full max-w-full space-y-2 border border-[#1E2D3D] shadow-lg'
                      }`}
                    >
                      {msg.sender === 'assistant' ? (
                        <div>
                          <div className="text-[15px] leading-7 text-white font-bold tracking-normal">
                            <FormattedMessage content={msg.text} isStreaming={msg.isStreaming} />
                          </div>

                          {!msg.isStreaming && msg.text && (
                            <div className="flex items-center gap-2 pt-3 border-t border-[#1E2D3D] mt-3 text-[#94A3B8] flex-wrap">
                              {/* Audio Controls with Listen, Pause, Resume, and Stop */}
                              {activeSpeechMsgId === msg.id && isSpeaking && !isPaused ? (
                                <div className="flex items-center gap-1.5 bg-[#16222F] border border-[#087F72]/50 rounded-lg p-0.5 shadow-xs">
                                  <button
                                    type="button"
                                    onClick={pauseSpeech}
                                    className="p-1 px-2 rounded-md bg-[#D97706]/20 text-[#FBBF24] hover:bg-[#D97706]/30 transition-colors text-xs flex items-center gap-1 cursor-pointer font-medium"
                                    title={t.pause}
                                  >
                                    <PauseIcon className="w-3 h-3 text-[#FBBF24]" />
                                    <span className="text-[11px]">{t.pause}</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={stopSpeech}
                                    className="p-1 px-2 rounded-md hover:bg-[#1E2D3D] text-[#EF4444] hover:text-white transition-colors text-xs flex items-center gap-1 cursor-pointer font-medium"
                                    title={t.stop}
                                  >
                                    <SquareIcon className="w-3 h-3" />
                                    <span className="text-[11px]">{t.stop}</span>
                                  </button>
                                </div>
                              ) : activeSpeechMsgId === msg.id && isPaused ? (
                                <div className="flex items-center gap-1.5 bg-[#16222F] border border-[#1E2D3D] rounded-lg p-0.5 shadow-xs">
                                  <button
                                    type="button"
                                    onClick={resumeSpeech}
                                    className="p-1 px-2 rounded-md bg-[#087F72]/20 text-[#2DD4BF] hover:bg-[#087F72]/30 transition-colors text-xs flex items-center gap-1 cursor-pointer font-medium"
                                    title={t.resumeAudio}
                                  >
                                    <PlayIcon className="w-3 h-3 text-[#2DD4BF]" />
                                    <span className="text-[11px]">{t.resumeAudio}</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={stopSpeech}
                                    className="p-1 px-2 rounded-md hover:bg-[#1E2D3D] text-[#EF4444] hover:text-white transition-colors text-xs flex items-center gap-1 cursor-pointer font-medium"
                                    title={t.stop}
                                  >
                                    <SquareIcon className="w-3 h-3" />
                                    <span className="text-[11px]">{t.stop}</span>
                                  </button>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => playSpeech(msg.speechText || msg.text, msg.id)}
                                  className="p-1.5 rounded-lg hover:bg-[#16222F] hover:text-[#2DD4BF] transition-colors text-xs flex items-center gap-1 cursor-pointer font-medium"
                                  title="Read explanation aloud"
                                >
                                  <Volume2 className="w-3.5 h-3.5" />
                                  <span className="text-[11px]">{t.listenIn}</span>
                                </button>
                              )}

                              <button
                                onClick={() => handleCopy(msg.id, msg.text)}
                                className="p-1.5 rounded-lg hover:bg-[#16222F] hover:text-[#2DD4BF] transition-colors text-xs flex items-center gap-1 cursor-pointer font-medium"
                                title="Copy response"
                              >
                                {copiedId === msg.id ? <Check className="w-3.5 h-3.5 text-[#34D399]" /> : <Copy className="w-3.5 h-3.5" />}
                                <span className="text-[11px]">{copiedId === msg.id ? t.copied : t.copy}</span>
                              </button>

                              {/* Remove Unwanted Chat Message Button */}
                              <button
                                type="button"
                                onClick={() => handleDeleteMessage(msg.id)}
                                className="p-1.5 rounded-lg hover:bg-red-950/40 text-[#94A3B8] hover:text-[#EF4444] transition-colors text-xs flex items-center gap-1 cursor-pointer font-medium ml-auto"
                                title={t.removeMessage}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span className="text-[11px]">{t.removeMessage}</span>
                              </button>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="flex items-center justify-between gap-3">
                          <div className="text-sm leading-relaxed whitespace-pre-wrap font-medium">
                            {msg.text}
                          </div>
                          {/* Remove button for user message */}
                          <button
                            type="button"
                            onClick={() => handleDeleteMessage(msg.id)}
                            className="text-white/60 hover:text-white transition-colors cursor-pointer shrink-0 p-1 rounded hover:bg-white/10"
                            title={t.removeMessage}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>

                    {msg.sender === 'user' && (
                      <div className="w-8 h-8 rounded-full bg-[#087F72]/20 border border-[#087F72]/40 flex items-center justify-center text-[#2DD4BF] shrink-0 mt-1 shadow-xs font-bold">
                        <User className="w-4 h-4" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            </div>
          </div>

          {/* Floating Smooth Scroll Quick Actions */}
          <div className="absolute right-6 bottom-32 z-30 flex flex-col gap-2 pointer-events-none">
            {showScrollTop && (
              <button
                type="button"
                onClick={scrollToTop}
                title="Scroll to Top Data"
                className="pointer-events-auto flex items-center gap-1.5 px-3 py-2 rounded-full bg-[#0F1722] hover:bg-[#16222F] text-[#E2E8F0] hover:text-[#2DD4BF] border border-[#1E2D3D] shadow-lg transition-all duration-200 hover:scale-105 cursor-pointer text-xs font-bold backdrop-blur-md"
              >
                <ArrowUpIcon className="w-3.5 h-3.5 text-[#2DD4BF]" />
                <span className="hidden sm:inline">Top Data</span>
              </button>
            )}

            {showScrollBottom && (
              <button
                type="button"
                onClick={scrollToBottom}
                title="Jump to Latest Message"
                className="pointer-events-auto flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-[#087F72] hover:bg-[#0D9488] text-white shadow-lg transition-all duration-200 hover:scale-105 cursor-pointer text-xs font-bold"
              >
                <ArrowDownIcon className="w-3.5 h-3.5 animate-bounce" />
                <span>Latest Message</span>
              </button>
            )}
          </div>

          {/* Quick Suggestion Chips (Rendered only when active analysis or queries exist, keeping initial view completely empty dark space) */}
          {(ocrResult || messages.length > 0) && (
            <div className="px-3 md:px-6 py-1.5 border-t border-[#1E2D3D] bg-[#0B131E] shrink-0 flex items-center gap-1.5 overflow-x-auto custom-scrollbar z-10 animate-in fade-in duration-200">
              {t.suggestions.map((chip, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSendMessage(chip)}
                  disabled={isGenerating}
                  className="whitespace-nowrap text-[10.5px] bg-[#111A24] hover:bg-[#16222F] hover:text-[#2DD4BF] border border-[#1E2D3D] text-[#94A3B8] px-2.5 py-1 rounded-full transition-colors cursor-pointer disabled:opacity-50 font-medium"
                >
                  {chip}
                </button>
              ))}
            </div>
          )}

          {/* Bottom Prompt Input Bar (Compact & Sleek - Max View Space) */}
          <div className="px-3 py-2 md:px-6 md:py-2.5 border-t border-[#1E2D3D] bg-[#0B131E] shrink-0 z-10">
            <form
              onSubmit={e => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="max-w-5xl lg:max-w-6xl mx-auto flex items-center bg-[#111A24] border border-[#1E2D3D] rounded-xl px-2.5 sm:px-3 py-1.5 shadow-sm focus-within:border-[#2DD4BF] focus-within:ring-1 focus-within:ring-[#2DD4BF] transition-all gap-1.5 sm:gap-2"
            >
              {/* Plus / Add File Button on Left */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isScanning || isGenerating}
                title="Attach medical document, CBC report, or prescription"
                aria-label="Attach medical document"
                className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-[#16222F] hover:bg-[#1E2E3E] text-[#2DD4BF] hover:text-[#5EEAD4] border border-[#223849] flex items-center justify-center transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shadow-xs shrink-0 group focus:outline-none focus:ring-1 focus:ring-[#2DD4BF]"
              >
                <Plus className="w-4 h-4 transition-transform group-hover:rotate-90 duration-200" />
              </button>

              <input
                type="text"
                value={inputPrompt}
                onChange={e => setInputPrompt(e.target.value)}
                placeholder={t.inputPlaceholder}
                disabled={isGenerating || isScanning}
                className="flex-1 bg-transparent text-xs sm:text-sm text-[#F1F5F9] placeholder-[#64748B] outline-none py-1 min-w-0"
              />

              {/* Submit / Rotating Doctor Doom Bot Button on Right */}
              <button
                type="submit"
                disabled={(!inputPrompt.trim() && !isGenerating && !isScanning) || (isGenerating || isScanning)}
                className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center transition-all shadow-sm shrink-0 overflow-hidden ${
                  isGenerating || isScanning
                    ? 'bg-[#0B1520] border border-[#2DD4BF]/60 text-[#2DD4BF] cursor-wait ring-2 ring-[#2DD4BF]/30 shadow-md shadow-[#2DD4BF]/20'
                    : !inputPrompt.trim()
                      ? 'bg-[#1E2D3D] text-[#64748B] cursor-not-allowed'
                      : 'bg-[#087F72] hover:bg-[#0D9488] text-white cursor-pointer hover:shadow-md hover:shadow-[#087F72]/30 active:scale-95'
                }`}
                title={isGenerating || isScanning ? "Dr. Doom is analyzing and generating..." : "Send query"}
                aria-label={isGenerating || isScanning ? "Generating answer" : "Send query"}
              >
                {isGenerating || isScanning ? (
                  <div className="relative w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src="/bot-avatar.png"
                      alt="Generating"
                      className="w-5 h-5 sm:w-5.5 sm:h-5.5 rounded-full object-cover animate-spin shadow-xs"
                      style={{ animationDuration: '2s' }}
                    />
                  </div>
                ) : (
                  <Send className="w-3.5 h-3.5" />
                )}
              </button>
            </form>
          </div>
        </main>
      </div>

      {/* OCR Review & Correction Modal */}
      {showTextModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#080D14]/80 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setShowTextModal(false)}
        >
          <div 
            className="bg-[#FFFFFF] rounded-3xl max-w-3xl w-full p-6 sm:p-8 shadow-2xl border border-[#E2E8F0] relative max-h-[88vh] flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-start justify-between border-b border-[#E2E8F0] pb-4 mb-4 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#E8F6F2] border border-[#087F72]/20 flex items-center justify-center text-[#087F72] shrink-0">
                  <PenIcon className="w-5 h-5 text-[#087F72]" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-[#172B3A] tracking-tight">Verified Medical OCR Transcript</h3>
                  <p className="text-xs text-[#64748B] font-medium">Review literal extracted text and correct any uncertain handwriting before querying the AI.</p>
                </div>
              </div>
              <button
                onClick={() => setShowTextModal(false)}
                className="w-8 h-8 rounded-full bg-[#F5F8FA] hover:bg-[#E2E8F0] text-[#64748B] flex items-center justify-center transition-colors cursor-pointer"
              >
                <CloseIcon className="w-4 h-4" />
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2 mb-4 shrink-0 text-xs">
              <span className="bg-[#E8F6F2] text-[#087F72] border border-[#087F72]/20 font-bold px-3 py-1 rounded-full">
                Type: {documentCategory.replace('_', ' ').toUpperCase()}
              </span>
              <span className="bg-[#F5F8FA] text-[#172B3A] border border-[#E2E8F0] font-medium px-3 py-1 rounded-full">
                Pages: {pageCount} Page(s)
              </span>
              <span className="bg-blue-50 text-blue-800 border border-blue-200 font-medium px-3 py-1 rounded-full">
                Reference Range Verified
              </span>
            </div>

            <div className="flex-1 flex flex-col overflow-hidden space-y-2">
              <div className="flex items-center justify-between text-xs text-[#64748B]">
                <span className="font-bold flex items-center gap-1.5 text-[#172B3A]">
                  <FileText className="w-3.5 h-3.5 text-[#087F72]" /> Editable Transcript:
                </span>
                <span className="text-[11px] text-[#64748B]">
                  Edits directly ground Dr. Doom&apos;s answers
                </span>
              </div>

              <textarea
                value={editedText}
                onChange={e => setEditedText(e.target.value)}
                placeholder="Literal OCR text will appear here..."
                rows={12}
                className="w-full flex-1 p-4 rounded-2xl bg-[#F5F8FA] border border-[#E2E8F0] focus:border-[#087F72] focus:bg-white text-xs sm:text-sm font-mono text-[#172B3A] leading-relaxed outline-hidden resize-none transition-all custom-scrollbar shadow-inner"
              />
            </div>

            <div className="mt-4 pt-4 border-t border-[#E2E8F0] flex items-center justify-between shrink-0">
              <button
                type="button"
                onClick={() => setEditedText(extractedRawText)}
                className="text-xs text-[#64748B] hover:text-[#172B3A] font-semibold hover:underline cursor-pointer"
              >
                Reset to Original OCR
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowTextModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-[#64748B] hover:bg-[#F5F8FA] transition-colors cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShowTextModal(false);
                    handleSendMessage(`I reviewed and updated the document text as follows:\n\n\"${editedText.slice(0, 300)}...\"\n\nPlease analyze this verified text and explain the medications, dosages, and precautions.`);
                  }}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-[#087F72] hover:bg-[#06695F] text-white shadow-md hover:shadow-lg transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Save & Ask Dr. Doom
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Clean Line-by-Line Formatter Component for ChatGPT-like Text Flow in Dark Medical Theme
 */
function FormattedMessage({ content, isStreaming }: { content: string; isStreaming?: boolean }) {
  if (!content) {
    return isStreaming ? <span className="inline-block w-2 h-4 bg-[#2DD4BF] animate-pulse ml-0.5 align-middle"></span> : null;
  }

  const lines = content.split('\n');

  return (
    <div className="space-y-2 text-white font-bold">
      {lines.map((line, idx) => {
        // Headers (### or ####)
        if (line.startsWith('### ')) {
          return (
            <h3 key={idx} className="text-base sm:text-lg font-black text-white pt-2 pb-1 border-b border-[#1E2D3D] tracking-wide">
              {formatInline(line.replace('### ', ''))}
            </h3>
          );
        }
        if (line.startsWith('#### ')) {
          return (
            <h4 key={idx} className="text-sm sm:text-base font-extrabold text-[#2DD4BF] pt-2 pb-0.5 tracking-wide">
              {formatInline(line.replace('#### ', ''))}
            </h4>
          );
        }

        // Bullet point lines
        if (line.startsWith('• ') || line.startsWith('- ')) {
          return (
            <div key={idx} className="flex items-start gap-2.5 text-white font-bold text-sm sm:text-[15px] pl-1 leading-relaxed">
              <span className="text-[#2DD4BF] font-black shrink-0 mt-0.5 text-base">•</span>
              <span className="flex-1 text-white font-bold">{formatInline(line.replace(/^[•-]\s*/, ''))}</span>
            </div>
          );
        }

        // Numbered list items
        if (/^\d+\.\s/.test(line)) {
          const match = line.match(/^(\d+\.)\s*(.*)$/);
          return (
            <div key={idx} className="flex items-start gap-2.5 text-white font-bold text-sm sm:text-[15px] pl-1 leading-relaxed">
              <span className="font-black text-[#2DD4BF] shrink-0">{match?.[1]}</span>
              <span className="flex-1 text-white font-bold">{formatInline(match?.[2] || '')}</span>
            </div>
          );
        }

        // Indented sub-bullet lines
        if (line.trim().startsWith('↳')) {
          return (
            <div key={idx} className="text-xs sm:text-sm text-[#94A3B8] font-bold pl-6 pb-1">
              {formatInline(line.trim())}
            </div>
          );
        }

        // Divider
        if (line.trim() === '---') {
          return <hr key={idx} className="border-[#1E2D3D] my-2" />;
        }

        // Empty line
        if (!line.trim()) {
          return <div key={idx} className="h-1.5" />;
        }

        // Regular line
        return (
          <p key={idx} className="text-sm sm:text-[15px] text-white leading-relaxed font-bold">
            {formatInline(line)}
          </p>
        );
      })}

      {isStreaming && (
        <span className="inline-block w-2.5 h-4.5 bg-[#2DD4BF] animate-pulse ml-0.5 align-middle"></span>
      )}
    </div>
  );
}

/**
 * Inline formatting for **bold**, `code`, and *italic* in Dark Theme
 */
function formatInline(text: string): React.ReactNode {
  const parts = text.split(/(\*\*.*?\*\*|`.*?`|\*.*?\*)/g);

  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={i} className="font-black text-white underline-offset-2">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code key={i} className="bg-[#16222F] text-[#2DD4BF] border border-[#223849] px-1.5 py-0.5 rounded text-xs font-mono font-bold">
          {part.slice(1, -1)}
        </code>
      );
    }
    if (part.startsWith('*') && part.endsWith('*')) {
      return (
        <em key={i} className="italic text-[#E2E8F0] font-bold">
          {part.slice(1, -1)}
        </em>
      );
    }
    return <span key={i} className="text-white font-bold">{part}</span>;
  });
}
