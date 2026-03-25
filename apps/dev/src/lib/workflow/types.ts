// ============================================
// Workflow Engine — Type Definitions
// ============================================

export interface WorkflowTask {
    title: string;
    titleAr: string;
    type: 'setup' | 'design' | 'development' | 'testing' | 'deployment' | 'documentation' | 'review';
    estimatedHours: number;
    priority: 'low' | 'medium' | 'high';
}

export interface WorkflowPhase {
    id: string;
    name: string;
    nameAr: string;
    duration: string;
    tasks: WorkflowTask[];
    dependencies?: string[];
    isConditional?: boolean;
    conditionLabel?: string;
    approvalGate?: boolean;
    automations?: string[];
}

export interface WorkflowTemplate {
    projectType: string;
    labelEn: string;
    labelAr: string;
    phases: WorkflowPhase[];
}

export interface GeneratedWorkflow {
    phases: WorkflowPhase[];
    totalEstimatedHours: number;
    totalEstimatedWeeks: number;
    generatedAt: string;
    includedTypes: string[];
    activeFeatures: string[];
}
