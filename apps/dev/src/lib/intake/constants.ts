// ============================================
// Client Intake Pipeline — Constants & Labels
// ============================================

import type { ProjectType, FeatureKey, TimelineTier, StepConfig, IntakeFormData } from './types';

// ── Project Type Definitions ────────────────────────────
export interface ProjectTypeOption {
    value: ProjectType;
    icon: string;
    labelEn: string;
    labelAr: string;
    descEn: string;
    descAr: string;
    color: string;
}

export const PROJECT_TYPES: ProjectTypeOption[] = [
    {
        value: 'website',
        icon: '🌐',
        labelEn: 'Website Development',
        labelAr: 'تطوير المواقع',
        descEn: 'Modern responsive websites and web apps',
        descAr: 'مواقع حديثة ومتجاوبة وتطبيقات ويب',
        color: 'cyan',
    },
    {
        value: 'mobile_app',
        icon: '📱',
        labelEn: 'Mobile Application',
        labelAr: 'تطبيق موبايل',
        descEn: 'iOS & Android native or cross-platform',
        descAr: 'iOS و Android أصلي أو متعدد المنصات',
        color: 'emerald',
    },
    {
        value: 'ecommerce',
        icon: '🛒',
        labelEn: 'E-Commerce Store',
        labelAr: 'متجر إلكتروني',
        descEn: 'Full online store with payment processing',
        descAr: 'متجر إلكتروني كامل مع معالجة الدفع',
        color: 'amber',
    },
    {
        value: 'branding',
        icon: '🎨',
        labelEn: 'Brand Identity',
        labelAr: 'الهوية البصرية',
        descEn: 'Logo, brand guidelines, and visual identity',
        descAr: 'الشعار وإرشادات العلامة التجارية والهوية البصرية',
        color: 'purple',
    },
    {
        value: 'campaign',
        icon: '📢',
        labelEn: 'Digital Campaign',
        labelAr: 'حملة رقمية',
        descEn: 'Social media, ads, and marketing campaigns',
        descAr: 'حملات التواصل الاجتماعي والإعلانات والتسويق',
        color: 'pink',
    },
    {
        value: 'cloud',
        icon: '☁️',
        labelEn: 'Cloud & DevOps',
        labelAr: 'السحابة و DevOps',
        descEn: 'Infrastructure, CI/CD, and cloud architecture',
        descAr: 'البنية التحتية و CI/CD والهندسة السحابية',
        color: 'sky',
    },
    {
        value: 'seo',
        icon: '🔍',
        labelEn: 'SEO & Analytics',
        labelAr: 'تحسين محركات البحث',
        descEn: 'Search optimization and data analytics',
        descAr: 'تحسين محركات البحث وتحليل البيانات',
        color: 'indigo',
    },
];

// ── Feature Definitions (Grouped by Project Type) ───────
export interface FeatureOption {
    key: FeatureKey;
    labelEn: string;
    labelAr: string;
    /** Which project types this feature is relevant to */
    relevantTo: ProjectType[];
}

export const FEATURES: FeatureOption[] = [
    // Website & E-commerce
    { key: 'cms', labelEn: 'Content Management System', labelAr: 'نظام إدارة المحتوى', relevantTo: ['website', 'ecommerce'] },
    { key: 'ecommerce_module', labelEn: 'E-Commerce Module', labelAr: 'وحدة التجارة الإلكترونية', relevantTo: ['website'] },
    { key: 'auth_system', labelEn: 'User Authentication', labelAr: 'نظام المصادقة', relevantTo: ['website', 'mobile_app', 'ecommerce'] },
    { key: 'blog', labelEn: 'Blog / News Section', labelAr: 'قسم المدونة / الأخبار', relevantTo: ['website'] },
    { key: 'analytics', labelEn: 'Analytics Dashboard', labelAr: 'لوحة التحليلات', relevantTo: ['website', 'ecommerce', 'mobile_app'] },
    { key: 'seo_optimization', labelEn: 'Advanced SEO', labelAr: 'تحسين SEO متقدم', relevantTo: ['website', 'ecommerce'] },
    { key: 'multilingual', labelEn: 'Multi-Language Support', labelAr: 'دعم تعدد اللغات', relevantTo: ['website', 'ecommerce', 'mobile_app'] },
    { key: 'admin_dashboard', labelEn: 'Admin Dashboard', labelAr: 'لوحة تحكم إدارية', relevantTo: ['website', 'ecommerce', 'mobile_app'] },
    // Mobile
    { key: 'push_notifications', labelEn: 'Push Notifications', labelAr: 'الإشعارات الفورية', relevantTo: ['mobile_app'] },
    { key: 'offline_mode', labelEn: 'Offline Mode', labelAr: 'وضع عدم الاتصال', relevantTo: ['mobile_app'] },
    { key: 'payment_integration', labelEn: 'Payment Integration', labelAr: 'دمج نظام الدفع', relevantTo: ['mobile_app', 'ecommerce'] },
    { key: 'social_login', labelEn: 'Social Login', labelAr: 'تسجيل دخول اجتماعي', relevantTo: ['mobile_app', 'website'] },
    { key: 'maps_location', labelEn: 'Maps & Location', labelAr: 'الخرائط والموقع', relevantTo: ['mobile_app'] },
    { key: 'camera_media', labelEn: 'Camera & Media', labelAr: 'الكاميرا والوسائط', relevantTo: ['mobile_app'] },
    // Branding
    { key: 'logo_design', labelEn: 'Logo Design', labelAr: 'تصميم الشعار', relevantTo: ['branding'] },
    { key: 'brand_guidelines', labelEn: 'Brand Guidelines Book', labelAr: 'كتاب إرشادات العلامة', relevantTo: ['branding'] },
    { key: 'stationery', labelEn: 'Stationery Design', labelAr: 'تصميم القرطاسية', relevantTo: ['branding'] },
    { key: 'social_media_kit', labelEn: 'Social Media Kit', labelAr: 'حزمة السوشيال ميديا', relevantTo: ['branding', 'campaign'] },
    // Campaign
    { key: 'social_media_management', labelEn: 'Social Media Management', labelAr: 'إدارة التواصل الاجتماعي', relevantTo: ['campaign'] },
    { key: 'google_ads', labelEn: 'Google Ads Setup', labelAr: 'إعداد إعلانات جوجل', relevantTo: ['campaign', 'seo'] },
    { key: 'content_creation', labelEn: 'Content Creation', labelAr: 'صناعة المحتوى', relevantTo: ['campaign'] },
    { key: 'email_marketing', labelEn: 'Email Marketing', labelAr: 'التسويق بالبريد الإلكتروني', relevantTo: ['campaign'] },
    // Cloud
    { key: 'ci_cd', labelEn: 'CI/CD Pipeline', labelAr: 'خط أنابيب CI/CD', relevantTo: ['cloud'] },
    { key: 'containerization', labelEn: 'Docker & Kubernetes', labelAr: 'Docker و Kubernetes', relevantTo: ['cloud'] },
    { key: 'monitoring', labelEn: '24/7 Monitoring', labelAr: 'مراقبة على مدار الساعة', relevantTo: ['cloud'] },
    { key: 'infrastructure_setup', labelEn: 'Infrastructure Setup', labelAr: 'إعداد البنية التحتية', relevantTo: ['cloud'] },
];

// ── Timeline Options ────────────────────────────────────
export interface TimelineOption {
    value: TimelineTier;
    labelEn: string;
    labelAr: string;
    descEn: string;
    descAr: string;
    icon: string;
    color: string;
    /** Multiplier label shown to user */
    badgeEn: string;
    badgeAr: string;
}

export const TIMELINE_OPTIONS: TimelineOption[] = [
    {
        value: 'standard',
        labelEn: 'Standard',
        labelAr: 'قياسي',
        descEn: '8–12 weeks · Best value',
        descAr: '٨–١٢ أسبوع · أفضل قيمة',
        icon: '🕐',
        color: 'emerald',
        badgeEn: 'Best Value',
        badgeAr: 'أفضل قيمة',
    },
    {
        value: 'accelerated',
        labelEn: 'Accelerated',
        labelAr: 'متسارع',
        descEn: '4–6 weeks · +25% premium',
        descAr: '٤–٦ أسابيع · +٢٥٪ إضافي',
        icon: '⚡',
        color: 'amber',
        badgeEn: '+25%',
        badgeAr: '+٢٥٪',
    },
    {
        value: 'rush',
        labelEn: 'Rush Delivery',
        labelAr: 'تسليم عاجل',
        descEn: '2–3 weeks · +50% premium',
        descAr: '٢–٣ أسابيع · +٥٠٪ إضافي',
        icon: '🚀',
        color: 'pink',
        badgeEn: '+50%',
        badgeAr: '+٥٠٪',
    },
];

// ── Wizard Step Configuration ───────────────────────────
export const WIZARD_STEPS: StepConfig[] = [
    {
        id: 'start',
        titleEn: 'Project & Identity',
        titleAr: 'المشروع والهوية',
        icon: '🚀',
        isVisible: () => true,
    },
    {
        id: 'config',
        titleEn: 'Features & Timeline',
        titleAr: 'المميزات والجدول الزمني',
        icon: '⚙️',
        isVisible: (data) => data.projectTypes.length > 0,
    },
    {
        id: 'details',
        titleEn: 'Vision & Assets',
        titleAr: 'الرؤية والأصول',
        icon: '🎨',
        isVisible: () => true,
    },
    {
        id: 'review',
        titleEn: 'Review & Submit',
        titleAr: 'مراجعة وإرسال',
        icon: '✅',
        isVisible: () => true,
    },
];

// ── Default Form State ──────────────────────────────────
export const DEFAULT_FORM_DATA: IntakeFormData = {
    projectTypes: [],
    features: {},
    timeline: 'standard',
    hasBrandAssets: false,
    uploadedFiles: [],
    brandNotes: '',
    preferredColors: '',
    stylePreference: '',
    competitors: '',
    clientName: '',
    clientEmail: '',
    clientPhone: '',
    companyName: '',
    projectDescription: '',
};

// ── Style Preference Options ────────────────────────────
export const STYLE_OPTIONS = [
    { valueEn: 'minimal', labelEn: 'Minimal & Clean', labelAr: 'بسيط ونظيف' },
    { valueEn: 'bold', labelEn: 'Bold & Vibrant', labelAr: 'جريء ونابض بالحياة' },
    { valueEn: 'elegant', labelEn: 'Elegant & Luxury', labelAr: 'أنيق وفاخر' },
    { valueEn: 'playful', labelEn: 'Playful & Fun', labelAr: 'مرح وممتع' },
    { valueEn: 'corporate', labelEn: 'Corporate & Professional', labelAr: 'مؤسسي ومحترف' },
    { valueEn: 'techy', labelEn: 'Tech & Futuristic', labelAr: 'تقني ومستقبلي' },
];
