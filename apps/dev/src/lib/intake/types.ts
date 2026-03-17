// ============================================
// Client Intake Pipeline — Type Definitions
// ============================================

/** Project type categories available for selection */
export type ProjectType =
    | 'website'
    | 'mobile_app'
    | 'branding'
    | 'campaign'
    | 'cloud'
    | 'ecommerce'
    | 'seo';

/** Feature flags available per project type */
export type FeatureKey =
    // Website features
    | 'cms'
    | 'ecommerce_module'
    | 'auth_system'
    | 'blog'
    | 'analytics'
    | 'seo_optimization'
    | 'multilingual'
    | 'admin_dashboard'
    // Mobile app features
    | 'push_notifications'
    | 'offline_mode'
    | 'payment_integration'
    | 'social_login'
    | 'maps_location'
    | 'camera_media'
    // Branding features
    | 'logo_design'
    | 'brand_guidelines'
    | 'stationery'
    | 'social_media_kit'
    // Campaign features
    | 'social_media_management'
    | 'google_ads'
    | 'content_creation'
    | 'email_marketing'
    // Cloud features
    | 'ci_cd'
    | 'containerization'
    | 'monitoring'
    | 'infrastructure_setup';

/** Timeline urgency tiers */
export type TimelineTier = 'standard' | 'accelerated' | 'rush';

/** Submission status lifecycle */
export type SubmissionStatus =
    | 'new'
    | 'reviewing'
    | 'proposal_sent'
    | 'approved'
    | 'provisioned';

/** An uploaded file reference */
export interface UploadedFile {
    name: string;
    size: number;
    type: string;
    /** Local preview URL (blob URL) */
    previewUrl?: string;
    /** The raw File object for upload */
    file: File;
}

/** Complete form data collected across all wizard steps */
export interface IntakeFormData {
    // Step 1: Project Types
    projectTypes: ProjectType[];

    // Step 2: Features
    features: Partial<Record<FeatureKey, boolean>>;

    // Step 3: Timeline
    timeline: TimelineTier;

    // Step 4: Brand Assets
    hasBrandAssets: boolean;
    uploadedFiles: UploadedFile[];
    brandNotes: string;
    preferredColors: string;
    stylePreference: string;
    competitors: string;

    // Step 5: Client Info
    clientName: string;
    clientEmail: string;
    clientPhone: string;
    companyName: string;
    projectDescription: string;
}

/** Calculated project estimate */
export interface ProjectEstimate {
    priceMin: number;
    priceMax: number;
    estimatedWeeks: number;
    complexityScore: number; // 1-10
    breakdown: EstimateBreakdown;
}

/** Itemized breakdown of the estimate */
export interface EstimateBreakdown {
    basePrice: { min: number; max: number; label: string };
    featuresCost: { min: number; max: number; label: string };
    timelineMultiplier: { factor: number; label: string };
    totalBeforeTimeline: { min: number; max: number };
}

/** Configuration for a wizard step */
export interface StepConfig {
    id: string;
    titleEn: string;
    titleAr: string;
    icon: string;
    /** Whether this step should be visible given current form state */
    isVisible: (data: IntakeFormData) => boolean;
}

/** Wizard reducer action types */
export type WizardAction =
    | { type: 'SET_STEP'; step: number }
    | { type: 'UPDATE_DATA'; payload: Partial<IntakeFormData> }
    | { type: 'TOGGLE_PROJECT_TYPE'; projectType: ProjectType }
    | { type: 'TOGGLE_FEATURE'; feature: FeatureKey }
    | { type: 'ADD_FILES'; files: UploadedFile[] }
    | { type: 'REMOVE_FILE'; index: number }
    | { type: 'SET_SUBMITTING'; submitting: boolean }
    | { type: 'SET_SUBMITTED'; submitted: boolean }
    | { type: 'RESET' };

/** Full wizard state */
export interface WizardState {
    currentStep: number;
    formData: IntakeFormData;
    isSubmitting: boolean;
    isSubmitted: boolean;
}
