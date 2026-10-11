'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  FolderClock,
  Search,
  Filter,
  ArrowUpDown,
  UploadCloud,
  FileText,
  Activity,
  Pill,
  ShieldAlert,
  Calendar,
  User,
  Trash2,
  Download,
  ExternalLink,
  ChevronRight,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Layers,
  Languages,
  LogOut,
  LogIn,
  RotateCcw,
  Volume2,
  X,
  Plus,
  RefreshCw,
  Eye,
  BarChart3,
  SlidersHorizontal,
  Table as TableIcon,
  LayoutGrid,
  Check
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { ProfileAvatar } from '@/components/ProfileAvatar';
import { getApiUrl } from '@/lib/api';

type Language = 'english' | 'telugu' | 'hindi' | 'tamil' | 'tanglish';

interface MedicalRecordItem {
  id: string;
  document_id: string;
  user_id: string;
  filename: string;
  safe_display_name: string;
  file_size: number;
  mime_type: string;
  category: string;
  is_medical: boolean;
  status: string;
  upload_timestamp: number;
  created_at: number;
  report_date?: string;
  patient_name?: string;
  facility_or_doctor?: string;
  has_vault_file: boolean;
  summary?: {
    medications_count: number;
    labs_count: number;
    alerts_count: number;
    pages_count: number;
    has_analysis: boolean;
  };
  structured_extraction?: any;
  complete_report?: any;
  reports_by_language?: any;
  raw_text?: string;
  error_message?: string;
}

interface ComparisonParameter {
  test_name: string;
  unit: string;
  reference_interval: string;
  trend: 'increased' | 'decreased' | 'unchanged' | 'stable';
  delta: string;
  readings_count: number;
  timeline: Array<{
    record_id: string;
    record_name: string;
    date: string;
    timestamp: number;
    value_text: string;
    numeric_value: number | null;
    unit: string;
    status: string;
    reference_interval: string;
  }>;
}

const UI_STRINGS: Record<Language, Record<string, string>> = {
  english: {
    navRecords: 'My Medical Records',
    navHome: 'Home',
    workspace: 'Workspace',
    pageTitle: 'My Medical Records',
    pageSubtitle: 'View, organize, and revisit your saved medical reports and explanations.',
    uploadNew: 'Upload New Report',
    searchPlaceholder: 'Search by filename, doctor, test name, or keyword...',
    allCategories: 'All Categories',
    catCBC: 'Complete Blood Count (CBC)',
    catLab: 'Lab Panels & Blood Tests',
    catRx: 'Prescriptions',
    catImaging: 'Diagnostic & Imaging',
    catDischarge: 'Discharge Summaries',
    catOther: 'Other Medical Documents',
    statusAll: 'All Statuses',
    statusCompleted: 'Completed',
    statusProcessing: 'Processing',
    statusFailed: 'Needs Review / Failed',
    sortNewest: 'Newest Upload First',
    sortOldest: 'Oldest Upload First',
    sortReportDate: 'Report Date',
    sortCategory: 'Document Category',
    compareSelected: 'Compare Selected',
    compareTooltip: 'Select 2 or more reports to view diagnostic trends over time',
    noRecordsTitle: 'No medical records yet',
    noRecordsDesc: 'Your uploaded reports and completed analyses will appear here.',
    noRecordsBtn: 'Upload your first report',
    noResultsTitle: 'No records found',
    noResultsDesc: 'No medical records match your current search and filter criteria.',
    clearFilters: 'Clear all filters',
    testsExtracted: 'Lab Tests',
    medications: 'Medications',
    alerts: 'Clinical Alerts',
    viewAnalysis: 'View Explanation',
    downloadDoc: 'Download Original',
    deleteDoc: 'Delete Record',
    deleteConfirmTitle: 'Delete Medical Record?',
    deleteConfirmDesc: 'Are you sure you want to delete this record? The saved analysis and document file will be permanently removed from your account.',
    cancel: 'Cancel',
    delete: 'Delete',
    comparingTitle: 'Longitudinal Lab Report Comparison',
    disclaimer: 'Clinical Note: Diagnostic parameter trends over time require clinical correlation with symptoms, fasting status, and physician evaluation. Laboratory changes do not automatically establish a diagnosis.',
    viewModeGrid: 'Card View',
    viewModeTable: 'Table View',
    verifiedBadge: 'Verified Clinical OCR',
    reopenInChat: 'Ask Dr. Doom about this report',
    audioPlay: 'Listen to Explanation',
    audioPause: 'Pause Audio',
    audioStop: 'Stop Audio',
    audioReplay: 'Replay Audio'
  },
  telugu: {
    navRecords: 'నా వైద్య నివేదికలు',
    navHome: 'హోమ్',
    workspace: 'వర్క్‌స్పేస్',
    pageTitle: 'నా వైద్య నివేదికలు (My Medical Records)',
    pageSubtitle: 'మీరు భద్రపరిచిన వైద్య నివేదికలు మరియు సమగ్ర వివరణలను ఇక్కడ సులభంగా చూడవచ్చు.',
    uploadNew: 'కొత్త నివేదిక అప్‌లోడ్ చేయండి',
    searchPlaceholder: 'ఫైల్ పేరు, వైద్యుడు లేదా ల్యాబ్ టెస్ట్ పేరుతో వెతకండి...',
    allCategories: 'అన్ని విభాగాలు',
    catCBC: 'రక్త పరీక్ష (CBC)',
    catLab: 'ల్యాబ్ ప్యానెల్స్ & పరీక్షలు',
    catRx: 'మందుల చీటీ (Prescriptions)',
    catImaging: 'డయాగ్నస్టిక్ & ఇమేజింగ్',
    catDischarge: 'డిశ్చార్జ్ సారాంశం',
    catOther: 'ఇతర వైద్య పత్రాలు',
    statusAll: 'అన్ని స్థితులు',
    statusCompleted: 'పూర్తయింది',
    statusProcessing: 'ప్రాసెసింగ్ జరుగుతోంది',
    statusFailed: 'విఫలమైంది / మళ్ళీ ప్రయత్నించండి',
    sortNewest: 'ఇటీవలి అప్‌లోడ్ మొదట',
    sortOldest: 'పాత అప్‌లోడ్ మొదట',
    sortReportDate: 'నివేదిక తేదీ',
    sortCategory: 'పత్రం రకం',
    compareSelected: 'ఎంపిక చేసినవి సరిపోల్చండి',
    compareTooltip: 'మార్పులను గమనించడానికి 2 లేదా అంతకంటే ఎక్కువ నివేదికలను ఎంచుకోండి',
    noRecordsTitle: 'ఇంకా ఎలాంటి వైద్య నివేదికలు లేవు',
    noRecordsDesc: 'మీరు అప్‌లోడ్ చేసిన నివేదికలు మరియు విశ్లేషణలు ఇక్కడ భద్రపరచబడతాయి.',
    noRecordsBtn: 'మీ మొదటి నివేదికను అప్‌లోడ్ చేయండి',
    noResultsTitle: 'ఎలాంటి నివేదికలు కనుగొనబడలేదు',
    noResultsDesc: 'మీ శోధనకు తగిన వైద్య రికార్డులు లభించలేదు.',
    clearFilters: 'ఫిల్టర్లను తొలగించండి',
    testsExtracted: 'ల్యాబ్ పరీక్షలు',
    medications: 'మందులు',
    alerts: 'భద్రతా హెచ్చరికలు',
    viewAnalysis: 'విశ్లేషణ చూడండి',
    downloadDoc: 'పత్రం డౌన్‌లోడ్',
    deleteDoc: 'రికార్డును తొలగించు',
    deleteConfirmTitle: 'వైద్య రికార్డును తొలగించాలా?',
    deleteConfirmDesc: 'ఈ నివేదికను మీ ఖాతా నుండి పూర్తిగా తొలగించాలనుకుంటున్నారా?',
    cancel: 'రద్దు చేయి',
    delete: 'తొలగించు',
    comparingTitle: 'వైద్య నివేదికల కాలక్రమ పోలిక (Comparison)',
    disclaimer: 'వైద్యుల గమనిక: ల్యాబ్ విలువల మార్పులను ఖచ్చితమైన రోగ నిర్ధారణ కోసం మీ వైద్యుడితో సంప్రదించాలి.',
    viewModeGrid: 'కార్డుల వీక్షణ',
    viewModeTable: 'పట్టిక వీక్షణ',
    verifiedBadge: 'ధృవీకరించబడిన OCR',
    reopenInChat: 'డాక్టర్ డూమ్‌తో సంప్రదించండి',
    audioPlay: 'వివరణ వినండి',
    audioPause: 'ఆపండి',
    audioStop: 'ముగించండి',
    audioReplay: 'మళ్ళీ వినండి'
  },
  hindi: {
    navRecords: 'मेरे मेडिकल रिकॉर्ड्स',
    navHome: 'होम',
    workspace: 'कार्यक्षेत्र',
    pageTitle: 'मेरे मेडिकल रिकॉर्ड्स (My Medical Records)',
    pageSubtitle: 'अपनी सहेजी गई मेडिकल रिपोर्ट और विस्तृत व्याख्याओं को सुरक्षित रूप से देखें।',
    uploadNew: 'नई रिपोर्ट अपलोड करें',
    searchPlaceholder: 'फ़ाइल नाम, डॉक्टर, या टेस्ट के नाम से खोजें...',
    allCategories: 'सभी श्रेणियां',
    catCBC: 'कम्प्लीट ब्लड काउंट (CBC)',
    catLab: 'लैब टेस्ट और पैनल्स',
    catRx: 'दवाइयों का पर्चा (Prescriptions)',
    catImaging: 'इमेजिंग और स्कैन रिपोर्ट',
    catDischarge: 'डिस्चार्ज सारांश',
    catOther: 'अन्य मेडिकल दस्तावेज़',
    statusAll: 'सभी स्थितियां',
    statusCompleted: 'पूर्ण',
    statusProcessing: 'प्रक्रिया जारी',
    statusFailed: 'पुनः प्रयास करें',
    sortNewest: 'नवीनतम पहले',
    sortOldest: 'पुराने पहले',
    sortReportDate: 'रिपोर्ट की तारीख',
    sortCategory: 'दस्तावेज़ का प्रकार',
    compareSelected: 'चयनित रिपोर्ट की तुलना करें',
    compareTooltip: 'समय के साथ बदलाव देखने के लिए 2 या अधिक रिपोर्ट चुनें',
    noRecordsTitle: 'अभी तक कोई मेडिकल रिकॉर्ड नहीं है',
    noRecordsDesc: 'आपकी अपलोड की गई रिपोर्ट और व्याख्याएं यहां सुरक्षित रहेंगी।',
    noRecordsBtn: 'अपनी पहली रिपोर्ट अपलोड करें',
    noResultsTitle: 'कोई परिणाम नहीं मिला',
    noResultsDesc: 'आपके द्वारा खोजे गए फ़िल्टर के अनुसार कोई रिकॉर्ड नहीं मिला।',
    clearFilters: 'फ़िल्टर हटाएं',
    testsExtracted: 'लैब टेस्ट',
    medications: 'दवाइयां',
    alerts: 'सुरक्षा अलर्ट',
    viewAnalysis: 'विश्लेषण देखें',
    downloadDoc: 'दस्तावेज़ डाउनलोड करें',
    deleteDoc: 'रिकॉर्ड हटाएं',
    deleteConfirmTitle: 'क्या आप इस रिकॉर्ड को हटाना चाहते हैं?',
    deleteConfirmDesc: 'इस मेडिकल रिकॉर्ड और इसके सभी विश्लेषण आपके खाते से हमेशा के लिए हटा दिए जाएंगे।',
    cancel: 'रद्द करें',
    delete: 'हटाएं',
    comparingTitle: 'लैब रिपोर्ट की समय-आधारित तुलना',
    disclaimer: 'चिकित्सीय सूचना: टेस्ट परिणामों में बदलाव को समझने के लिए हमेशा अपने डॉक्टर से परामर्श लें।',
    viewModeGrid: 'कार्ड दृश्य',
    viewModeTable: 'तालिका दृश्य',
    verifiedBadge: 'सत्यापित मेडिकल OCR',
    reopenInChat: 'डॉ. डूम से परामर्श लें',
    audioPlay: 'व्याख्या सुनें',
    audioPause: 'रोकें',
    audioStop: 'बंद करें',
    audioReplay: 'पुनः सुनें'
  },
  tamil: {
    navRecords: 'என் மருத்துவ ஆவணங்கள்',
    navHome: 'முகப்பு',
    workspace: 'பணிவெளி',
    pageTitle: 'என் மருத்துவ ஆவணங்கள் (My Medical Records)',
    pageSubtitle: 'உங்கள் மருத்துவ அறிக்கைகள் மற்றும் விளக்கங்களை இங்கே பாதுகாப்பாகப் பார்க்கலாம்.',
    uploadNew: 'புதிய அறிக்கை பதிவேற்றுக',
    searchPlaceholder: 'கோப்பு பெயர், மருத்துவர் அல்லது பரிசோதனை பெயர் மூலம் தேடவும்...',
    allCategories: 'அனைத்து பிரிவுகள்',
    catCBC: 'இரத்தப் பரிசோதனை (CBC)',
    catLab: 'ஆய்வகப் பரிசோதனைகள்',
    catRx: 'மருந்துச் சீட்டு',
    catImaging: 'ஸ்கேன் மற்றும் எக்ஸ்ரே',
    catDischarge: 'டிஸ்சார்ஜ் சுருக்கம்',
    catOther: 'பிற மருத்துவ ஆவணங்கள்',
    statusAll: 'அனைத்து நிலை',
    statusCompleted: 'முடிந்தது',
    statusProcessing: 'செயல்பாட்டில் உள்ளது',
    statusFailed: 'மீண்டும் முயற்சிக்கவும்',
    sortNewest: 'புதியது முதலில்',
    sortOldest: 'பழையது முதலில்',
    sortReportDate: 'அறிக்கை தேதி',
    sortCategory: 'ஆவண வகை',
    compareSelected: 'தேர்ந்தெடுத்ததை ஒப்பிடுக',
    compareTooltip: 'காலப்போக்கில் மாற்றங்களைக் காண 2 அல்லது அதற்கு மேற்பட்ட அறிக்கைகளைத் தேர்ந்தெடுக்கவும்',
    noRecordsTitle: 'மருத்துவ ஆவணங்கள் எதுவும் இல்லை',
    noRecordsDesc: 'நீங்கள் பதிவேற்றும் அறிக்கைகள் இங்கே பாதுகாப்பாகச் சேமிக்கப்படும்.',
    noRecordsBtn: 'முதல் அறிக்கையைப் பதிவேற்றவும்',
    noResultsTitle: 'முடிவுகள் எதுவும் இல்லை',
    noResultsDesc: 'உங்கள் தேடலுக்குரிய பதிவுகள் எதுவும் கிடைக்கவில்லை.',
    clearFilters: 'வடிகட்டிகளை நீக்கு',
    testsExtracted: 'ஆய்வகப் பரிசோதனைகள்',
    medications: 'மருந்துகள்',
    alerts: 'பாதுகாப்பு எச்சரிக்கைகள்',
    viewAnalysis: 'விளக்கம் பார்க்க',
    downloadDoc: 'பதிவிறக்கம்',
    deleteDoc: 'நீக்கு',
    deleteConfirmTitle: 'இந்த ஆவணத்தை நீக்க விரும்புகிறீர்களா?',
    deleteConfirmDesc: 'இந்த ஆவணம் மற்றும் அதன் விவரங்கள் நிரந்தரமாக நீக்கப்படும்.',
    cancel: 'ரத்து செய்',
    delete: 'நீக்கு',
    comparingTitle: 'மருத்துவ அறிக்கைகளின் ஒப்பீடு',
    disclaimer: 'மருத்துவக் குறிப்பு: முடிவுகளைப் பற்றிய கூடுதல் விவரங்களுக்கு உங்கள் மருத்துவரை அணுகவும்.',
    viewModeGrid: 'கார்டு பார்வை',
    viewModeTable: 'அட்டவணை பார்வை',
    verifiedBadge: 'சரிபார்க்கப்பட்ட OCR',
    reopenInChat: 'டாக்டர் டூமிடம் கேட்கவும்',
    audioPlay: 'விளக்கத்தைக் கேட்க',
    audioPause: 'இடைநிறுத்து',
    audioStop: 'நிறுத்து',
    audioReplay: 'மீண்டும் கேட்க'
  },
  tanglish: {
    navRecords: 'My Medical Records',
    navHome: 'Home',
    workspace: 'Workspace',
    pageTitle: 'My Medical Records',
    pageSubtitle: 'View, organize and revisit unga saved medical reports & clinical explanations.',
    uploadNew: 'Upload New Report',
    searchPlaceholder: 'Search by file name, doctor, lab test...',
    allCategories: 'All Categories',
    catCBC: 'Complete Blood Count (CBC)',
    catLab: 'Lab Panels & Blood Tests',
    catRx: 'Prescriptions',
    catImaging: 'Diagnostic & Imaging',
    catDischarge: 'Discharge Summaries',
    catOther: 'Other Medical Documents',
    statusAll: 'All Statuses',
    statusCompleted: 'Completed',
    statusProcessing: 'Processing',
    statusFailed: 'Needs Review',
    sortNewest: 'Newest Upload First',
    sortOldest: 'Oldest Upload First',
    sortReportDate: 'Report Date',
    sortCategory: 'Document Category',
    compareSelected: 'Compare Selected Reports',
    compareTooltip: 'Select 2 or more reports to view changes over time',
    noRecordsTitle: 'No medical records yet',
    noRecordsDesc: 'Unga uploaded reports and verified analyses inga store aagum.',
    noRecordsBtn: 'Upload your first report',
    noResultsTitle: 'No matching records found',
    noResultsDesc: 'Search filters-ku thagundha records kedaikala.',
    clearFilters: 'Clear filters',
    testsExtracted: 'Lab Tests',
    medications: 'Medications',
    alerts: 'Safety Alerts',
    viewAnalysis: 'View Explanation',
    downloadDoc: 'Download File',
    deleteDoc: 'Delete Record',
    deleteConfirmTitle: 'Delete Medical Record?',
    deleteConfirmDesc: 'Indha medical record-ah delete panna unga account-la irundhu remove aagidum.',
    cancel: 'Cancel',
    delete: 'Delete',
    comparingTitle: 'Lab Report Comparison Over Time',
    disclaimer: 'Clinical Note: Lab value changes require proper consultation with your treating doctor.',
    viewModeGrid: 'Card View',
    viewModeTable: 'Table View',
    verifiedBadge: 'Verified Clinical OCR',
    reopenInChat: 'Ask Dr. Doom about this report',
    audioPlay: 'Listen to Explanation',
    audioPause: 'Pause Audio',
    audioStop: 'Stop Audio',
    audioReplay: 'Replay Audio'
  }
};

export default function MedicalRecordsDashboard() {
  const router = useRouter();
  const { user: authUser, logout } = useAuth();
  const effectiveUserId = authUser?.email || 'default_user';

  // State
  const [records, setRecords] = useState<MedicalRecordItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [language, setLanguage] = useState<Language>('english');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('newest');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [selectedRecordIds, setSelectedRecordIds] = useState<string[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Modals & Detail State
  const [detailRecord, setDetailRecord] = useState<MedicalRecordItem | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [isCompareOpen, setIsCompareOpen] = useState(false);
  const [compareData, setCompareData] = useState<{
    records_compared: any[];
    parameters: ComparisonParameter[];
    clinical_disclaimer: string;
  } | null>(null);
  const [isComparing, setIsComparing] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Audio State
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  const t = UI_STRINGS[language] || UI_STRINGS.english;

  // Fetch records
  const fetchRecords = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        user_id: effectiveUserId,
        sort_by: sortBy,
        page: page.toString(),
        page_size: '24'
      });
      if (searchQuery.trim()) params.append('search', searchQuery.trim());
      if (selectedCategory !== 'all') params.append('category', selectedCategory);
      if (selectedStatus !== 'all') params.append('status', selectedStatus);

      const res = await fetch(getApiUrl(`/api/records?${params.toString()}`));
      if (res.ok) {
        const data = await res.json();
        setRecords(data.items || []);
        setTotalCount(data.total_count || 0);
        setTotalPages(data.total_pages || 1);
      } else {
        throw new Error('Failed to load medical records from server.');
      }
    } catch (err: any) {
      setError(err?.message || 'Server connection error.');
    } finally {
      setIsLoading(false);
    }
  }, [effectiveUserId, searchQuery, selectedCategory, selectedStatus, sortBy, page]);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  // Audio Cleanup
  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const stopSpeech = () => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      setIsPaused(false);
    }
  };

  const playSpeech = (text: string) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const cleanText = text
      .replace(/###/g, '')
      .replace(/\*\*/g, '')
      .replace(/•/g, '')
      .replace(/91-8493-2948-1092/g, '')
      .trim();

    if (!cleanText) return;

    const utterance = new SpeechSynthesisUtterance(cleanText);
    const langCodeMap: Record<Language, string> = {
      english: 'en-IN',
      telugu: 'te-IN',
      hindi: 'hi-IN',
      tamil: 'ta-IN',
      tanglish: 'en-IN'
    };
    utterance.lang = langCodeMap[language] || 'en-IN';
    utterance.rate = 0.95;
    utterance.onend = () => {
      setIsSpeaking(false);
      setIsPaused(false);
    };
    utterance.onerror = () => {
      setIsSpeaking(false);
      setIsPaused(false);
    };

    utteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
    setIsSpeaking(true);
    setIsPaused(false);
  };

  // Open Record Detail
  const handleOpenDetail = async (recordId: string) => {
    stopSpeech();
    setIsLoadingDetail(true);
    setIsDetailOpen(true);
    try {
      const res = await fetch(getApiUrl(`/api/records/${recordId}?user_id=${effectiveUserId}`));
      if (res.ok) {
        const json = await res.json();
        setDetailRecord(json.record || json.data);
      } else {
        throw new Error('Record not found or access denied.');
      }
    } catch (err: any) {
      alert(err?.message || 'Error opening record.');
      setIsDetailOpen(false);
    } finally {
      setIsLoadingDetail(false);
    }
  };

  // Reopen in Chatbot Workspace
  const handleReopenInWorkspace = (record: MedicalRecordItem) => {
    router.push(`/chat?record_id=${record.id}`);
  };

  // Download Document
  const handleDownload = (recordId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const downloadUrl = getApiUrl(`/api/records/${recordId}/download?user_id=${effectiveUserId}`);
    window.open(downloadUrl, '_blank');
  };

  // Delete Record
  const handleDeleteConfirm = async () => {
    if (!deleteTargetId) return;
    setIsDeleting(true);
    try {
      const res = await fetch(getApiUrl(`/api/records/${deleteTargetId}?user_id=${effectiveUserId}`), {
        method: 'DELETE'
      });
      if (res.ok) {
        setSelectedRecordIds(prev => prev.filter(id => id !== deleteTargetId));
        setDeleteTargetId(null);
        if (detailRecord?.id === deleteTargetId) {
          setIsDetailOpen(false);
          setDetailRecord(null);
        }
        fetchRecords();
      } else {
        alert('Failed to delete record.');
      }
    } catch {
      alert('Error connecting to backend.');
    } finally {
      setIsDeleting(false);
    }
  };

  // Handle Comparison
  const handleCompareSelected = async () => {
    if (selectedRecordIds.length < 2) return;
    setIsComparing(true);
    setIsCompareOpen(true);
    setCompareData(null);
    try {
      const res = await fetch(getApiUrl('/api/records/compare'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          record_ids: selectedRecordIds,
          user_id: effectiveUserId
        })
      });
      if (res.ok) {
        const data = await res.json();
        setCompareData(data);
      } else {
        const err = await res.json().catch(() => ({}));
        alert(err.detail || 'Could not compare the selected documents.');
        setIsCompareOpen(false);
      }
    } catch {
      alert('Error running comparison.');
      setIsCompareOpen(false);
    } finally {
      setIsComparing(false);
    }
  };

  // Toggle record selection for comparison
  const toggleSelectRecord = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedRecordIds(prev => (prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]));
  };

  // Handle Direct Upload from Records page
  const handleDirectUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile) return;
    setIsUploading(true);
    setUploadError(null);
    const formData = new FormData();
    formData.append('file', uploadFile);

    try {
      const res = await fetch(getApiUrl(`/api/extract-record?user_id=${effectiveUserId}`), {
        method: 'POST',
        body: formData
      });
      if (res.ok) {
        const data = await res.json();
        setIsUploadModalOpen(false);
        setUploadFile(null);
        fetchRecords();
        if (data.document_id) {
          handleOpenDetail(data.document_id);
        }
      } else {
        const err = await res.json().catch(() => ({}));
        setUploadError(err.detail || 'Failed to process document.');
      }
    } catch (err: any) {
      setUploadError(err?.message || 'Network error.');
    } finally {
      setIsUploading(false);
    }
  };

  // Format Category
  const getCategoryLabel = (cat: string) => {
    switch (cat) {
      case 'complete_blood_count':
        return t.catCBC;
      case 'lab_panel':
        return t.catLab;
      case 'prescription':
        return t.catRx;
      case 'diagnostic_imaging':
        return t.catImaging;
      case 'discharge_summary':
        return t.catDischarge;
      default:
        return t.catOther;
    }
  };

  const getCategoryBadgeClass = (cat: string) => {
    switch (cat) {
      case 'complete_blood_count':
        return 'bg-emerald-50 text-emerald-800 border-emerald-200';
      case 'lab_panel':
        return 'bg-teal-50 text-teal-800 border-teal-200';
      case 'prescription':
        return 'bg-blue-50 text-blue-800 border-blue-200';
      case 'diagnostic_imaging':
        return 'bg-purple-50 text-purple-800 border-purple-200';
      case 'discharge_summary':
        return 'bg-amber-50 text-amber-800 border-amber-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  // Active language explanation for detail view
  const activeReport = detailRecord?.reports_by_language?.[language] || detailRecord?.reports_by_language?.['english'];
  const patientSummaryText =
    activeReport?.patient_summary ||
    detailRecord?.structured_extraction?.executive_summary ||
    detailRecord?.raw_text ||
    'Medical report analysis completed.';

  return (
    <div className="min-h-screen bg-[#F5F8FA] text-[#172B3A] font-sans selection:bg-[#E8F6F2] selection:text-[#087F72] flex flex-col">
      
      {/* 1. Header Navigation */}
      <header className="h-14 border-b border-[#E2E8F0] bg-[#FFFFFF] px-4 sm:px-8 flex items-center justify-between shrink-0 sticky top-0 z-30 shadow-xs">
        <div className="flex items-center gap-4">
          <Link href="/?fresh=1" className="flex items-center gap-2.5 group cursor-pointer" title="Return to DOOM Home">
            <div className="w-9 h-9 rounded-xl bg-white border border-[#E2E8F0] flex items-center justify-center p-0.5 shrink-0 shadow-xs group-hover:border-[#087F72]/40 transition-colors overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo.png" alt="DOOM" className="w-full h-full object-contain rounded-lg" />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-base font-extrabold text-[#172B3A] tracking-tight">DOOM</span>
              <span className="text-[11px] font-semibold text-[#087F72] bg-[#E8F6F2] border border-[#087F72]/20 px-2 py-0.5 rounded-md hidden sm:inline-block">
                Health Intelligence
              </span>
            </div>
          </Link>

          {/* Navigation Links */}
          <nav className="flex items-center gap-1.5 ml-2 sm:ml-4">
            <Link
              href="/?fresh=1"
              className="flex items-center gap-1 text-xs font-semibold text-[#64748B] hover:text-[#172B3A] px-2.5 py-1.5 rounded-lg hover:bg-[#F5F8FA] transition-colors"
            >
              <span>{t.navHome}</span>
            </Link>
            <Link
              href="/chat"
              className="flex items-center gap-1.5 text-xs font-semibold text-[#64748B] hover:text-[#172B3A] px-2.5 py-1.5 rounded-lg hover:bg-[#F5F8FA] transition-colors"
            >
              <Activity className="w-3.5 h-3.5 text-[#087F72]" />
              <span className="hidden sm:inline">{t.workspace}</span>
            </Link>
            <Link
              href="/records"
              className="flex items-center gap-1.5 text-xs font-bold text-[#087F72] bg-[#E8F6F2] border border-[#087F72]/25 px-2.5 py-1.5 rounded-lg transition-colors shadow-2xs"
            >
              <FolderClock className="w-3.5 h-3.5 text-[#087F72]" />
              <span>{t.navRecords}</span>
            </Link>
          </nav>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          {/* Language Selector */}
          <div className="flex items-center gap-1.5 bg-[#FFFFFF] border border-[#E2E8F0] rounded-lg px-2.5 py-1 shadow-xs">
            <Languages className="w-3.5 h-3.5 text-[#087F72] shrink-0" />
            <select
              value={language}
              onChange={e => setLanguage(e.target.value as Language)}
              className="text-xs bg-transparent font-semibold text-[#172B3A] focus:text-[#087F72] outline-none cursor-pointer pr-1"
              aria-label="Select interface language"
            >
              <option value="english" className="bg-white text-[#172B3A]">English</option>
              <option value="telugu" className="bg-white text-[#172B3A]">తెలుగు (Telugu)</option>
              <option value="hindi" className="bg-white text-[#172B3A]">हिन्दी (Hindi)</option>
              <option value="tamil" className="bg-white text-[#172B3A]">தமிழ் (Tamil)</option>
              <option value="tanglish" className="bg-white text-[#172B3A]">Tenglish</option>
            </select>
          </div>

          {/* Circular Profile Avatar (far-right end of top navbar) */}
          <div className="pl-1.5 sm:pl-2 border-l border-[#E2E8F0] flex items-center">
            <ProfileAvatar size="md" />
          </div>
        </div>
      </header>

      {/* 2. Main Page Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        
        {/* Page Heading & Actions Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white border border-[#E2E8F0] p-5 sm:p-6 rounded-2xl shadow-xs">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-[#E8F6F2] text-[#087F72] flex items-center justify-center">
                <FolderClock className="w-4 h-4" />
              </div>
              <h1 className="text-xl sm:text-2xl font-extrabold text-[#172B3A] tracking-tight">
                {t.pageTitle}
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-[#64748B] font-medium max-w-2xl">
              {t.pageSubtitle}
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
            {selectedRecordIds.length >= 2 && (
              <button
                onClick={handleCompareSelected}
                className="bg-[#E8F6F2] hover:bg-[#d5f0e8] text-[#087F72] font-bold text-xs py-2.5 px-3.5 rounded-xl border border-[#087F72]/30 shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
                title={t.compareTooltip}
              >
                <BarChart3 className="w-4 h-4 text-[#087F72]" />
                <span>{t.compareSelected} ({selectedRecordIds.length})</span>
              </button>
            )}

            <button
              onClick={() => setIsUploadModalOpen(true)}
              className="bg-[#087F72] hover:bg-[#06695F] text-white font-bold text-xs py-2.5 px-4 rounded-xl shadow-xs transition-colors cursor-pointer flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>{t.uploadNew}</span>
            </button>
          </div>
        </div>

        {/* 3. Search, Filters & View Options Bar */}
        <div className="bg-white border border-[#E2E8F0] p-4 rounded-2xl shadow-xs space-y-3">
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
            
            {/* Search Input */}
            <div className="relative flex-1 min-w-[240px]">
              <Search className="w-4 h-4 text-[#64748B] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder={t.searchPlaceholder}
                className="w-full pl-9 pr-8 py-2 text-xs bg-[#F5F8FA] border border-[#E2E8F0] rounded-xl text-[#172B3A] placeholder-[#64748B] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#087F72]/30 focus:border-[#087F72] transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#64748B] hover:text-[#172B3A]"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Filter Dropdowns & Controls */}
            <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
              
              {/* Category Filter */}
              <div className="flex items-center gap-1.5 bg-[#F5F8FA] border border-[#E2E8F0] px-2.5 py-1.5 rounded-xl">
                <Filter className="w-3.5 h-3.5 text-[#64748B] shrink-0" />
                <select
                  value={selectedCategory}
                  onChange={e => setSelectedCategory(e.target.value)}
                  className="text-xs bg-transparent font-medium text-[#172B3A] outline-none cursor-pointer"
                >
                  <option value="all">{t.allCategories}</option>
                  <option value="complete_blood_count">{t.catCBC}</option>
                  <option value="lab_panel">{t.catLab}</option>
                  <option value="prescription">{t.catRx}</option>
                  <option value="diagnostic_imaging">{t.catImaging}</option>
                  <option value="discharge_summary">{t.catDischarge}</option>
                  <option value="other">{t.catOther}</option>
                </select>
              </div>

              {/* Status Filter */}
              <div className="flex items-center gap-1.5 bg-[#F5F8FA] border border-[#E2E8F0] px-2.5 py-1.5 rounded-xl">
                <Activity className="w-3.5 h-3.5 text-[#64748B] shrink-0" />
                <select
                  value={selectedStatus}
                  onChange={e => setSelectedStatus(e.target.value)}
                  className="text-xs bg-transparent font-medium text-[#172B3A] outline-none cursor-pointer"
                >
                  <option value="all">{t.statusAll}</option>
                  <option value="completed">{t.statusCompleted}</option>
                  <option value="processing">{t.statusProcessing}</option>
                  <option value="failed">{t.statusFailed}</option>
                </select>
              </div>

              {/* Sort Dropdown */}
              <div className="flex items-center gap-1.5 bg-[#F5F8FA] border border-[#E2E8F0] px-2.5 py-1.5 rounded-xl">
                <ArrowUpDown className="w-3.5 h-3.5 text-[#64748B] shrink-0" />
                <select
                  value={sortBy}
                  onChange={e => setSortBy(e.target.value)}
                  className="text-xs bg-transparent font-medium text-[#172B3A] outline-none cursor-pointer"
                >
                  <option value="newest">{t.sortNewest}</option>
                  <option value="oldest">{t.sortOldest}</option>
                  <option value="report_date">{t.sortReportDate}</option>
                  <option value="category">{t.sortCategory}</option>
                </select>
              </div>

              {/* Layout Toggle */}
              <div className="flex items-center bg-[#F5F8FA] border border-[#E2E8F0] p-0.5 rounded-xl">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                    viewMode === 'grid' ? 'bg-white shadow-xs text-[#087F72]' : 'text-[#64748B] hover:text-[#172B3A]'
                  }`}
                  title={t.viewModeGrid}
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('table')}
                  className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                    viewMode === 'table' ? 'bg-white shadow-xs text-[#087F72]' : 'text-[#64748B] hover:text-[#172B3A]'
                  }`}
                  title={t.viewModeTable}
                >
                  <TableIcon className="w-4 h-4" />
                </button>
              </div>

            </div>
          </div>
        </div>

        {/* 4. Records List / Grid View */}
        {isLoading ? (
          /* Loading Skeleton */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map(n => (
              <div key={n} className="bg-white border border-[#E2E8F0] rounded-2xl p-5 shadow-xs animate-pulse space-y-4">
                <div className="flex items-center justify-between">
                  <div className="w-24 h-5 bg-slate-200 rounded-md" />
                  <div className="w-16 h-5 bg-slate-200 rounded-md" />
                </div>
                <div className="w-3/4 h-5 bg-slate-200 rounded-md" />
                <div className="w-1/2 h-4 bg-slate-200 rounded-md" />
                <div className="pt-3 border-t border-slate-100 flex justify-between">
                  <div className="w-20 h-4 bg-slate-200 rounded-md" />
                  <div className="w-24 h-8 bg-slate-200 rounded-lg" />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          /* Error State */
          <div className="bg-white border border-red-200 rounded-2xl p-8 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-red-50 text-red-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-[#172B3A]">Unable to load records</h3>
            <p className="text-xs text-[#64748B] max-w-sm mx-auto">{error}</p>
            <button
              onClick={fetchRecords}
              className="bg-[#087F72] text-white font-semibold text-xs py-2 px-4 rounded-xl shadow-xs hover:bg-[#06695F] transition-colors"
            >
              Retry
            </button>
          </div>
        ) : records.length === 0 ? (
          searchQuery || selectedCategory !== 'all' || selectedStatus !== 'all' ? (
            /* No Filter Results */
            <div className="bg-white border border-[#E2E8F0] rounded-2xl p-10 text-center space-y-3 shadow-xs">
              <div className="w-12 h-12 rounded-full bg-[#F5F8FA] text-[#64748B] flex items-center justify-center mx-auto">
                <Search className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-[#172B3A]">{t.noResultsTitle}</h3>
              <p className="text-xs text-[#64748B] max-w-md mx-auto">{t.noResultsDesc}</p>
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('all');
                  setSelectedStatus('all');
                }}
                className="text-[#087F72] hover:underline font-bold text-xs"
              >
                {t.clearFilters}
              </button>
            </div>
          ) : (
            /* Empty State */
            <div className="bg-white border border-[#E2E8F0] rounded-2xl p-12 text-center space-y-4 shadow-xs">
              <div className="w-16 h-16 rounded-2xl bg-[#E8F6F2] text-[#087F72] flex items-center justify-center mx-auto">
                <FolderClock className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-[#172B3A]">{t.noRecordsTitle}</h3>
                <p className="text-xs sm:text-sm text-[#64748B] max-w-md mx-auto">
                  {t.noRecordsDesc}
                </p>
              </div>
              <button
                onClick={() => setIsUploadModalOpen(true)}
                className="bg-[#087F72] hover:bg-[#06695F] text-white font-bold text-xs py-2.5 px-5 rounded-xl shadow-xs transition-colors cursor-pointer inline-flex items-center gap-2"
              >
                <UploadCloud className="w-4 h-4" />
                <span>{t.noRecordsBtn}</span>
              </button>
            </div>
          )
        ) : viewMode === 'grid' ? (
          /* Grid Cards */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
            {records.map(rec => {
              const isSelected = selectedRecordIds.includes(rec.id);
              const formattedDate = rec.report_date || (rec.upload_timestamp ? new Date(rec.upload_timestamp * 1000).toLocaleDateString() : 'N/A');

              return (
                <div
                  key={rec.id}
                  onClick={() => handleOpenDetail(rec.id)}
                  className={`bg-white border rounded-2xl p-5 shadow-xs hover:shadow-md transition-all cursor-pointer flex flex-col justify-between relative group ${
                    isSelected ? 'border-[#087F72] ring-2 ring-[#087F72]/20' : 'border-[#E2E8F0] hover:border-[#087F72]/50'
                  }`}
                >
                  <div className="space-y-3">
                    {/* Top Row: Category Badge + Checkbox */}
                    <div className="flex items-center justify-between gap-2">
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-md border ${getCategoryBadgeClass(rec.category)}`}>
                        {getCategoryLabel(rec.category)}
                      </span>

                      <div className="flex items-center gap-1.5">
                        {rec.is_medical && (
                          <span
                            onClick={e => toggleSelectRecord(rec.id, e)}
                            className={`w-5 h-5 rounded-md border flex items-center justify-center transition-colors cursor-pointer ${
                              isSelected
                                ? 'bg-[#087F72] border-[#087F72] text-white'
                                : 'border-[#CBD5E1] bg-white hover:border-[#087F72]'
                            }`}
                            title="Select for comparison"
                          >
                            {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Title and Metadata */}
                    <div>
                      <h3 className="text-sm font-bold text-[#172B3A] line-clamp-1 group-hover:text-[#087F72] transition-colors">
                        {rec.safe_display_name}
                      </h3>
                      <div className="flex items-center gap-2 text-[11px] text-[#64748B] mt-1 font-medium">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {formattedDate}
                        </span>
                        {rec.facility_or_doctor && (
                          <>
                            <span>•</span>
                            <span className="line-clamp-1">{rec.facility_or_doctor}</span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Stats pills */}
                    <div className="flex items-center gap-2 pt-1 flex-wrap text-[11px]">
                      {rec.summary?.labs_count ? (
                        <span className="bg-[#F5F8FA] border border-[#E2E8F0] px-2 py-0.5 rounded-md text-[#172B3A] font-medium flex items-center gap-1">
                          <Activity className="w-3 h-3 text-[#087F72]" />
                          {rec.summary.labs_count} {t.testsExtracted}
                        </span>
                      ) : null}
                      {rec.summary?.medications_count ? (
                        <span className="bg-[#F5F8FA] border border-[#E2E8F0] px-2 py-0.5 rounded-md text-[#172B3A] font-medium flex items-center gap-1">
                          <Pill className="w-3 h-3 text-blue-600" />
                          {rec.summary.medications_count} {t.medications}
                        </span>
                      ) : null}
                      {rec.summary?.alerts_count ? (
                        <span className="bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md text-amber-800 font-semibold flex items-center gap-1">
                          <ShieldAlert className="w-3 h-3 text-amber-600" />
                          {rec.summary.alerts_count} {t.alerts}
                        </span>
                      ) : null}
                    </div>
                  </div>

                  {/* Card Footer Actions */}
                  <div className="pt-4 mt-3 border-t border-[#E2E8F0] flex items-center justify-between">
                    <div className="flex items-center gap-1 text-[11px]">
                      {rec.status === 'completed' ? (
                        <span className="text-[#15803D] font-semibold flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          {t.statusCompleted}
                        </span>
                      ) : rec.status === 'processing' ? (
                        <span className="text-amber-600 font-semibold flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 animate-spin" />
                          {t.statusProcessing}
                        </span>
                      ) : (
                        <span className="text-red-600 font-semibold flex items-center gap-1">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          {t.statusFailed}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      {rec.has_vault_file && (
                        <button
                          onClick={e => handleDownload(rec.id, e)}
                          className="p-1.5 text-[#64748B] hover:text-[#087F72] hover:bg-[#E8F6F2] rounded-lg transition-colors cursor-pointer"
                          title={t.downloadDoc}
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          setDeleteTargetId(rec.id);
                        }}
                        className="p-1.5 text-[#64748B] hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                        title={t.deleteDoc}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* Table View */
          <div className="bg-white border border-[#E2E8F0] rounded-2xl shadow-xs overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[#E2E8F0] bg-[#F5F8FA] text-[#64748B] font-bold uppercase tracking-wider">
                  <th className="p-3.5 w-10 text-center">Select</th>
                  <th className="p-3.5">Document Name</th>
                  <th className="p-3.5">Category</th>
                  <th className="p-3.5">Report Date</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5">Extracted Details</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0]">
                {records.map(rec => {
                  const isSelected = selectedRecordIds.includes(rec.id);
                  const formattedDate = rec.report_date || (rec.upload_timestamp ? new Date(rec.upload_timestamp * 1000).toLocaleDateString() : 'N/A');

                  return (
                    <tr
                      key={rec.id}
                      onClick={() => handleOpenDetail(rec.id)}
                      className={`hover:bg-[#F5F8FA] cursor-pointer transition-colors ${isSelected ? 'bg-[#E8F6F2]/40' : ''}`}
                    >
                      <td className="p-3.5 text-center" onClick={e => e.stopPropagation()}>
                        {rec.is_medical && (
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={e => toggleSelectRecord(rec.id, e as any)}
                            className="rounded border-[#CBD5E1] text-[#087F72] focus:ring-[#087F72] cursor-pointer"
                          />
                        )}
                      </td>
                      <td className="p-3.5 font-bold text-[#172B3A] max-w-xs truncate">
                        {rec.safe_display_name}
                      </td>
                      <td className="p-3.5">
                        <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${getCategoryBadgeClass(rec.category)}`}>
                          {getCategoryLabel(rec.category)}
                        </span>
                      </td>
                      <td className="p-3.5 text-[#64748B] font-medium">{formattedDate}</td>
                      <td className="p-3.5">
                        {rec.status === 'completed' ? (
                          <span className="text-[#15803D] font-semibold flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            {t.statusCompleted}
                          </span>
                        ) : rec.status === 'processing' ? (
                          <span className="text-amber-600 font-semibold flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 animate-spin" />
                            {t.statusProcessing}
                          </span>
                        ) : (
                          <span className="text-red-600 font-semibold flex items-center gap-1">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            {t.statusFailed}
                          </span>
                        )}
                      </td>
                      <td className="p-3.5 text-[#64748B]">
                        {rec.summary?.labs_count ? `${rec.summary.labs_count} tests` : ''}
                        {rec.summary?.medications_count ? `, ${rec.summary.medications_count} meds` : ''}
                        {!rec.summary?.labs_count && !rec.summary?.medications_count ? '—' : ''}
                      </td>
                      <td className="p-3.5 text-right space-x-1" onClick={e => e.stopPropagation()}>
                        {rec.has_vault_file && (
                          <button
                            onClick={e => handleDownload(rec.id, e)}
                            className="p-1 text-[#64748B] hover:text-[#087F72] hover:bg-[#E8F6F2] rounded transition-colors"
                            title={t.downloadDoc}
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          onClick={() => setDeleteTargetId(rec.id)}
                          className="p-1 text-[#64748B] hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                          title={t.deleteDoc}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between bg-white border border-[#E2E8F0] p-3 rounded-2xl">
            <span className="text-xs text-[#64748B] font-medium">
              Showing page {page} of {totalPages} ({totalCount} total records)
            </span>
            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage(p => Math.max(1, p - 1))}
                className="px-3 py-1 text-xs border border-[#E2E8F0] rounded-lg disabled:opacity-40 hover:bg-[#F5F8FA]"
              >
                Previous
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                className="px-3 py-1 text-xs border border-[#E2E8F0] rounded-lg disabled:opacity-40 hover:bg-[#F5F8FA]"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </main>

      {/* =====================================================================
          5. DETAIL / REOPEN RECORD MODAL
      ===================================================================== */}
      {isDetailOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-150">
          <div className="bg-white border border-[#E2E8F0] rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            
            {/* Modal Header */}
            <div className="p-4 sm:p-6 border-b border-[#E2E8F0] flex items-center justify-between shrink-0 bg-[#F5F8FA]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#E8F6F2] text-[#087F72] flex items-center justify-center shrink-0">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-[#172B3A] line-clamp-1">
                    {detailRecord?.safe_display_name || 'Medical Report Detail'}
                  </h2>
                  <div className="flex items-center gap-2 text-xs text-[#64748B] mt-0.5">
                    <span className="font-semibold text-[#087F72] bg-[#E8F6F2] px-2 py-0.5 rounded">
                      {detailRecord ? getCategoryLabel(detailRecord.category) : ''}
                    </span>
                    {detailRecord?.report_date && <span>• Date: {detailRecord.report_date}</span>}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {detailRecord && (
                  <button
                    onClick={() => handleReopenInWorkspace(detailRecord)}
                    className="hidden sm:flex items-center gap-1.5 bg-[#087F72] hover:bg-[#06695F] text-white text-xs font-bold py-2 px-3.5 rounded-xl shadow-xs transition-colors cursor-pointer"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>{t.reopenInChat}</span>
                  </button>
                )}
                <button
                  onClick={() => {
                    stopSpeech();
                    setIsDetailOpen(false);
                  }}
                  className="w-8 h-8 rounded-full hover:bg-slate-200 flex items-center justify-center text-[#64748B] transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 custom-scrollbar">
              {isLoadingDetail ? (
                <div className="py-12 flex flex-col items-center justify-center space-y-3">
                  <RefreshCw className="w-8 h-8 text-[#087F72] animate-spin" />
                  <p className="text-xs text-[#64748B] font-semibold">Loading verified report analysis...</p>
                </div>
              ) : detailRecord ? (
                <>
                  {/* Audio Player & Patient Summary Card */}
                  <div className="bg-[#E8F6F2]/40 border border-[#087F72]/20 rounded-2xl p-4 sm:p-5 space-y-3">
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-[#087F72]" />
                        <h3 className="text-sm font-bold text-[#172B3A]">
                          Patient-Friendly Explanation ({language.toUpperCase()})
                        </h3>
                      </div>

                      {/* Audio Controls */}
                      <div className="flex items-center gap-2">
                        {!isSpeaking ? (
                          <button
                            onClick={() => playSpeech(activeReport?.speech_text || patientSummaryText)}
                            className="bg-[#087F72] hover:bg-[#06695F] text-white text-xs font-semibold py-1.5 px-3 rounded-lg shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                          >
                            <Volume2 className="w-3.5 h-3.5" />
                            <span>{t.audioPlay}</span>
                          </button>
                        ) : (
                          <button
                            onClick={stopSpeech}
                            className="bg-red-600 hover:bg-red-700 text-white text-xs font-semibold py-1.5 px-3 rounded-lg shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                          >
                            <X className="w-3.5 h-3.5" />
                            <span>{t.audioStop}</span>
                          </button>
                        )}
                      </div>
                    </div>

                    <p className="text-xs sm:text-sm text-[#172B3A] leading-relaxed whitespace-pre-line font-medium bg-white/70 p-3.5 rounded-xl border border-[#E2E8F0]">
                      {patientSummaryText}
                    </p>
                  </div>

                  {/* Extracted Lab Findings Table */}
                  {detailRecord.structured_extraction?.lab_results && detailRecord.structured_extraction.lab_results.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-xs font-bold text-[#172B3A] uppercase tracking-wider flex items-center gap-1.5">
                        <Activity className="w-4 h-4 text-[#087F72]" />
                        <span>Extracted Laboratory Results</span>
                      </h4>
                      <div className="border border-[#E2E8F0] rounded-xl overflow-x-auto">
                        <table className="w-full text-xs text-left">
                          <thead className="bg-[#F5F8FA] border-b border-[#E2E8F0] text-[#64748B] font-bold">
                            <tr>
                              <th className="p-3">Test Parameter</th>
                              <th className="p-3">Result</th>
                              <th className="p-3">Unit</th>
                              <th className="p-3">Reference Interval</th>
                              <th className="p-3">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#E2E8F0]">
                            {detailRecord.structured_extraction.lab_results.map((lab: any, idx: number) => (
                              <tr key={idx} className="hover:bg-slate-50">
                                <td className="p-3 font-semibold text-[#172B3A]">{lab.test_name}</td>
                                <td className="p-3 font-bold text-[#172B3A]">{lab.value_text || lab.value}</td>
                                <td className="p-3 text-[#64748B]">{lab.original_unit || lab.unit || '—'}</td>
                                <td className="p-3 text-[#64748B]">{lab.reference_interval || '—'}</td>
                                <td className="p-3">
                                  <span
                                    className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                                      lab.status === 'Normal'
                                        ? 'bg-green-50 text-green-700'
                                        : 'bg-red-50 text-red-700'
                                    }`}
                                  >
                                    {lab.status || 'Normal'}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Extracted Medications */}
                  {detailRecord.structured_extraction?.medications && detailRecord.structured_extraction.medications.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-xs font-bold text-[#172B3A] uppercase tracking-wider flex items-center gap-1.5">
                        <Pill className="w-4 h-4 text-blue-600" />
                        <span>Prescribed Medications</span>
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {detailRecord.structured_extraction.medications.map((med: any, idx: number) => (
                          <div key={idx} className="p-3 bg-[#F5F8FA] border border-[#E2E8F0] rounded-xl space-y-1">
                            <h5 className="text-xs font-bold text-[#172B3A]">{med.name}</h5>
                            <p className="text-[11px] text-[#64748B]">Dosage: {med.dosage || med.strength || 'Standard'}</p>
                            <p className="text-[11px] text-[#64748B]">Timing: {med.timing || 'As prescribed'}</p>
                            <p className="text-[11px] text-teal-800 font-medium">Purpose: {med.purpose || 'Clinical care'}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Safety Alerts */}
                  {detailRecord.structured_extraction?.safety_alerts && detailRecord.structured_extraction.safety_alerts.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-xs font-bold text-amber-800 uppercase tracking-wider flex items-center gap-1.5">
                        <ShieldAlert className="w-4 h-4 text-amber-600" />
                        <span>Clinical Safety & Verification Notices</span>
                      </h4>
                      <div className="space-y-2">
                        {detailRecord.structured_extraction.safety_alerts.map((alert: any, idx: number) => (
                          <div key={idx} className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 font-medium flex items-start gap-2">
                            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                            <span>{alert.message || alert}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Full 8 Sections Markdown */}
                  {activeReport?.sections && activeReport.sections.length > 0 && (
                    <div className="space-y-3 pt-2">
                      <h4 className="text-xs font-bold text-[#172B3A] uppercase tracking-wider">
                        Comprehensive 8-Section Clinical Report
                      </h4>
                      <div className="grid grid-cols-1 gap-2.5">
                        {activeReport.sections.map((sec: any) => (
                          <div key={sec.id || sec.number} className="p-3.5 bg-white border border-[#E2E8F0] rounded-xl space-y-1">
                            <h5 className="text-xs font-bold text-[#087F72]">
                              {sec.number}. {sec.title}
                            </h5>
                            <p className="text-xs text-[#172B3A] leading-relaxed whitespace-pre-line">
                              {sec.content}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : null}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-[#E2E8F0] bg-[#F5F8FA] flex items-center justify-between shrink-0">
              <div className="text-[11px] text-[#64748B]">
                {detailRecord?.has_vault_file ? 'Original document stored in private vault' : 'Analysis metadata record'}
              </div>
              <div className="flex items-center gap-2">
                {detailRecord?.has_vault_file && (
                  <button
                    onClick={() => handleDownload(detailRecord.id)}
                    className="bg-white border border-[#E2E8F0] text-[#172B3A] font-semibold text-xs py-2 px-3 rounded-xl shadow-xs hover:bg-[#F5F8FA] flex items-center gap-1.5 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>{t.downloadDoc}</span>
                  </button>
                )}
                {detailRecord && (
                  <button
                    onClick={() => handleReopenInWorkspace(detailRecord)}
                    className="bg-[#087F72] hover:bg-[#06695F] text-white text-xs font-bold py-2 px-4 rounded-xl shadow-xs transition-colors cursor-pointer sm:hidden"
                  >
                    {t.reopenInChat}
                  </button>
                )}
              </div>
            </div>

          </div>
        </div>
      )}

      {/* =====================================================================
          6. LONGITUDINAL REPORT COMPARISON MODAL
      ===================================================================== */}
      {isCompareOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-150">
          <div className="bg-white border border-[#E2E8F0] rounded-3xl w-full max-w-5xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            
            {/* Header */}
            <div className="p-4 sm:p-6 border-b border-[#E2E8F0] bg-[#F5F8FA] flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#E8F6F2] text-[#087F72] flex items-center justify-center shrink-0">
                  <BarChart3 className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-[#172B3A]">
                    {t.comparingTitle}
                  </h2>
                  <p className="text-xs text-[#64748B]">
                    Comparing diagnostic parameters across {compareData?.records_compared?.length || selectedRecordIds.length} reports
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsCompareOpen(false)}
                className="w-8 h-8 rounded-full hover:bg-slate-200 flex items-center justify-center text-[#64748B] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 custom-scrollbar">
              {isComparing ? (
                <div className="py-12 flex flex-col items-center justify-center space-y-3">
                  <RefreshCw className="w-8 h-8 text-[#087F72] animate-spin" />
                  <p className="text-xs text-[#64748B] font-semibold">Aligning canonical test parameters across dates...</p>
                </div>
              ) : compareData ? (
                <>
                  {/* Compared Reports Pill list */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold text-[#172B3A]">Reports:</span>
                    {compareData.records_compared.map((r: any) => (
                      <span key={r.id} className="bg-white border border-[#E2E8F0] px-3 py-1 rounded-lg text-xs font-medium text-[#172B3A] shadow-xs">
                        {r.filename} <span className="text-[#64748B]">({r.date})</span>
                      </span>
                    ))}
                  </div>

                  {/* Comparison Table */}
                  <div className="border border-[#E2E8F0] rounded-2xl overflow-hidden shadow-xs">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-[#F5F8FA] border-b border-[#E2E8F0] text-[#64748B] font-bold">
                        <tr>
                          <th className="p-3.5">Matched Parameter</th>
                          <th className="p-3.5">Reference Range</th>
                          <th className="p-3.5">Chronological Readings</th>
                          <th className="p-3.5">Trend / Delta</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#E2E8F0]">
                        {compareData.parameters.map((param, idx) => (
                          <tr key={idx} className="hover:bg-slate-50">
                            <td className="p-3.5 font-bold text-[#172B3A]">
                              {param.test_name}
                              {param.unit && <span className="text-[#64748B] font-normal ml-1">({param.unit})</span>}
                            </td>
                            <td className="p-3.5 text-[#64748B]">{param.reference_interval || '—'}</td>
                            <td className="p-3.5">
                              <div className="flex items-center gap-2 flex-wrap">
                                {param.timeline.map((reading, rIdx) => (
                                  <div key={rIdx} className="bg-white border border-[#E2E8F0] px-2 py-1 rounded-md text-[11px] font-semibold">
                                    <span className="text-[#172B3A]">{reading.value_text}</span>
                                    <span className="text-[#64748B] text-[10px] ml-1">({reading.date})</span>
                                  </div>
                                ))}
                              </div>
                            </td>
                            <td className="p-3.5">
                              <span
                                className={`px-2.5 py-1 rounded-md font-bold text-[11px] inline-flex items-center gap-1 ${
                                  param.trend === 'increased'
                                    ? 'bg-amber-50 text-amber-800 border border-amber-200'
                                    : param.trend === 'decreased'
                                    ? 'bg-blue-50 text-blue-800 border border-blue-200'
                                    : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                }`}
                              >
                                {param.trend.toUpperCase()}: {param.delta}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Clinical Disclaimer */}
                  <div className="p-4 bg-teal-50 border border-teal-200 rounded-2xl flex items-start gap-3 text-xs text-teal-950">
                    <ShieldAlert className="w-5 h-5 text-[#087F72] shrink-0 mt-0.5" />
                    <p className="leading-relaxed font-medium">
                      {compareData.clinical_disclaimer || t.disclaimer}
                    </p>
                  </div>
                </>
              ) : null}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-[#E2E8F0] bg-[#F5F8FA] flex justify-end">
              <button
                onClick={() => setIsCompareOpen(false)}
                className="bg-[#087F72] text-white font-bold text-xs py-2 px-5 rounded-xl hover:bg-[#06695F] transition-colors"
              >
                Close
              </button>
            </div>

          </div>
        </div>
      )}

      {/* =====================================================================
          7. DELETE CONFIRMATION MODAL
      ===================================================================== */}
      {deleteTargetId && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white border border-[#E2E8F0] rounded-2xl max-w-sm w-full p-6 shadow-2xl space-y-4 text-center">
            <div className="w-12 h-12 rounded-full bg-red-50 text-red-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-[#172B3A]">{t.deleteConfirmTitle}</h3>
              <p className="text-xs text-[#64748B] leading-relaxed">{t.deleteConfirmDesc}</p>
            </div>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                disabled={isDeleting}
                onClick={() => setDeleteTargetId(null)}
                className="flex-1 bg-[#F5F8FA] hover:bg-slate-200 text-[#172B3A] font-semibold text-xs py-2.5 px-4 rounded-xl transition-colors cursor-pointer"
              >
                {t.cancel}
              </button>
              <button
                disabled={isDeleting}
                onClick={handleDeleteConfirm}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold text-xs py-2.5 px-4 rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-1.5"
              >
                {isDeleting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                <span>{t.delete}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          8. DIRECT UPLOAD MODAL
      ===================================================================== */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white border border-[#E2E8F0] rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[#E8F6F2] text-[#087F72] flex items-center justify-center">
                  <UploadCloud className="w-4 h-4" />
                </div>
                <h3 className="text-base font-bold text-[#172B3A]">{t.uploadNew}</h3>
              </div>
              <button
                onClick={() => setIsUploadModalOpen(false)}
                className="w-7 h-7 rounded-full hover:bg-slate-100 flex items-center justify-center text-[#64748B]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleDirectUpload} className="space-y-4">
              <div className="border-2 border-dashed border-[#CBD5E1] rounded-2xl p-6 text-center bg-[#F5F8FA] hover:border-[#087F72] transition-colors">
                <input
                  type="file"
                  accept="image/*,.pdf"
                  id="direct-upload-input"
                  className="hidden"
                  onChange={e => {
                    if (e.target.files && e.target.files[0]) {
                      setUploadFile(e.target.files[0]);
                    }
                  }}
                />
                <label htmlFor="direct-upload-input" className="cursor-pointer flex flex-col items-center gap-2">
                  <UploadCloud className="w-8 h-8 text-[#087F72]" />
                  <span className="text-xs font-bold text-[#172B3A]">
                    {uploadFile ? uploadFile.name : 'Choose report file (PDF, JPG, PNG)'}
                  </span>
                  <span className="text-[10px] text-[#64748B]">Click to browse from your device</span>
                </label>
              </div>

              {uploadError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-medium">
                  {uploadError}
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsUploadModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-[#64748B] hover:text-[#172B3A]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!uploadFile || isUploading}
                  className="bg-[#087F72] hover:bg-[#06695F] disabled:opacity-50 text-white font-bold text-xs py-2.5 px-5 rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  {isUploading && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>{isUploading ? 'Processing OCR...' : 'Upload & Analyze'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
