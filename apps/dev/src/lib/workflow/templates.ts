// ============================================
// Workflow Engine — Project Templates
// ============================================

import type { WorkflowTemplate } from './types';

export const WORKFLOW_TEMPLATES: Record<string, WorkflowTemplate> = {
    website: {
        projectType: 'website',
        labelEn: 'Website Development',
        labelAr: 'تطوير المواقع',
        phases: [
            {
                id: 'web-discovery',
                name: 'Discovery & Planning',
                nameAr: 'الاكتشاف والتخطيط',
                duration: '3-5 days',
                tasks: [
                    { title: 'Gather requirements & sitemap', titleAr: 'جمع المتطلبات وخريطة الموقع', type: 'documentation', estimatedHours: 8, priority: 'high' },
                    { title: 'Define tech stack & architecture', titleAr: 'تحديد التقنيات والهندسة', type: 'setup', estimatedHours: 4, priority: 'high' },
                    { title: 'Create project board & repo', titleAr: 'إنشاء لوحة المشروع والمستودع', type: 'setup', estimatedHours: 2, priority: 'high' },
                ],
                automations: ['Auto-create GitHub repo', 'Set up project board'],
            },
            {
                id: 'web-design',
                name: 'UI/UX Design',
                nameAr: 'تصميم واجهة المستخدم',
                duration: '5-7 days',
                tasks: [
                    { title: 'Design wireframes', titleAr: 'تصميم الإطارات السلكية', type: 'design', estimatedHours: 12, priority: 'high' },
                    { title: 'Create high-fidelity mockups', titleAr: 'إنشاء نماذج عالية الدقة', type: 'design', estimatedHours: 16, priority: 'high' },
                    { title: 'Design system & components', titleAr: 'نظام التصميم والمكونات', type: 'design', estimatedHours: 8, priority: 'medium' },
                ],
                dependencies: ['web-discovery'],
                approvalGate: true,
            },
            {
                id: 'web-dev',
                name: 'Frontend Development',
                nameAr: 'تطوير الواجهة الأمامية',
                duration: '2-3 weeks',
                tasks: [
                    { title: 'Set up Next.js project', titleAr: 'إعداد مشروع Next.js', type: 'setup', estimatedHours: 4, priority: 'high' },
                    { title: 'Build page templates', titleAr: 'بناء قوالب الصفحات', type: 'development', estimatedHours: 24, priority: 'high' },
                    { title: 'Implement responsive design', titleAr: 'تنفيذ التصميم المتجاوب', type: 'development', estimatedHours: 12, priority: 'high' },
                    { title: 'Implement animations & interactions', titleAr: 'تنفيذ الرسوم والتفاعلات', type: 'development', estimatedHours: 8, priority: 'medium' },
                ],
                dependencies: ['web-design'],
            },
            {
                id: 'web-backend',
                name: 'Backend Integration',
                nameAr: 'تكامل الخلفية',
                duration: '1-2 weeks',
                tasks: [
                    { title: 'Set up API routes', titleAr: 'إعداد مسارات API', type: 'development', estimatedHours: 12, priority: 'high' },
                    { title: 'Database configuration', titleAr: 'إعداد قاعدة البيانات', type: 'setup', estimatedHours: 6, priority: 'high' },
                    { title: 'Implement forms & validation', titleAr: 'تنفيذ النماذج والتحقق', type: 'development', estimatedHours: 8, priority: 'medium' },
                ],
                dependencies: ['web-dev'],
            },
            {
                id: 'web-test',
                name: 'Testing & QA',
                nameAr: 'الاختبار والجودة',
                duration: '3-5 days',
                tasks: [
                    { title: 'Cross-browser testing', titleAr: 'اختبار المتصفحات', type: 'testing', estimatedHours: 8, priority: 'high' },
                    { title: 'Mobile responsiveness audit', titleAr: 'مراجعة التجاوب', type: 'testing', estimatedHours: 6, priority: 'high' },
                    { title: 'Performance optimization', titleAr: 'تحسين الأداء', type: 'testing', estimatedHours: 6, priority: 'medium' },
                    { title: 'SEO audit', titleAr: 'مراجعة SEO', type: 'review', estimatedHours: 4, priority: 'medium' },
                ],
                dependencies: ['web-backend'],
            },
            {
                id: 'web-launch',
                name: 'Launch & Post-Launch',
                nameAr: 'الإطلاق وما بعده',
                duration: '2-3 days',
                tasks: [
                    { title: 'Deploy to production', titleAr: 'النشر على الإنتاج', type: 'deployment', estimatedHours: 4, priority: 'high' },
                    { title: 'Configure DNS & SSL', titleAr: 'إعداد DNS و SSL', type: 'deployment', estimatedHours: 2, priority: 'high' },
                    { title: 'Set up monitoring', titleAr: 'إعداد المراقبة', type: 'setup', estimatedHours: 3, priority: 'medium' },
                    { title: 'Client handoff & documentation', titleAr: 'تسليم العميل والتوثيق', type: 'documentation', estimatedHours: 4, priority: 'medium' },
                ],
                dependencies: ['web-test'],
                approvalGate: true,
            },
        ],
    },

    mobile_app: {
        projectType: 'mobile_app',
        labelEn: 'Mobile Application',
        labelAr: 'تطبيق موبايل',
        phases: [
            {
                id: 'mobile-discovery',
                name: 'Discovery & Architecture',
                nameAr: 'الاكتشاف والهندسة',
                duration: '3-5 days',
                tasks: [
                    { title: 'Requirements analysis', titleAr: 'تحليل المتطلبات', type: 'documentation', estimatedHours: 8, priority: 'high' },
                    { title: 'Define app architecture', titleAr: 'تحديد هندسة التطبيق', type: 'setup', estimatedHours: 6, priority: 'high' },
                    { title: 'Set up development environment', titleAr: 'إعداد بيئة التطوير', type: 'setup', estimatedHours: 4, priority: 'high' },
                ],
                automations: ['Initialize React Native project', 'Configure CI/CD'],
            },
            {
                id: 'mobile-design',
                name: 'UI/UX Design',
                nameAr: 'تصميم واجهة التطبيق',
                duration: '1-2 weeks',
                tasks: [
                    { title: 'User flow mapping', titleAr: 'تخطيط تدفق المستخدم', type: 'design', estimatedHours: 8, priority: 'high' },
                    { title: 'Screen designs (iOS & Android)', titleAr: 'تصميم الشاشات', type: 'design', estimatedHours: 24, priority: 'high' },
                    { title: 'Interactive prototype', titleAr: 'النموذج التفاعلي', type: 'design', estimatedHours: 8, priority: 'medium' },
                ],
                dependencies: ['mobile-discovery'],
                approvalGate: true,
            },
            {
                id: 'mobile-dev',
                name: 'Core Development',
                nameAr: 'التطوير الأساسي',
                duration: '3-4 weeks',
                tasks: [
                    { title: 'Build component library', titleAr: 'بناء مكتبة المكونات', type: 'development', estimatedHours: 16, priority: 'high' },
                    { title: 'Implement navigation', titleAr: 'تنفيذ التنقل', type: 'development', estimatedHours: 8, priority: 'high' },
                    { title: 'Build screens & features', titleAr: 'بناء الشاشات والمميزات', type: 'development', estimatedHours: 40, priority: 'high' },
                    { title: 'API integration', titleAr: 'تكامل API', type: 'development', estimatedHours: 16, priority: 'high' },
                    { title: 'State management', titleAr: 'إدارة الحالة', type: 'development', estimatedHours: 8, priority: 'medium' },
                ],
                dependencies: ['mobile-design'],
            },
            {
                id: 'mobile-test',
                name: 'Testing & QA',
                nameAr: 'الاختبار والجودة',
                duration: '1 week',
                tasks: [
                    { title: 'Device testing (iOS & Android)', titleAr: 'اختبار الأجهزة', type: 'testing', estimatedHours: 16, priority: 'high' },
                    { title: 'Performance testing', titleAr: 'اختبار الأداء', type: 'testing', estimatedHours: 8, priority: 'high' },
                    { title: 'Fix bugs & polish', titleAr: 'إصلاح الأخطاء والتحسين', type: 'development', estimatedHours: 12, priority: 'high' },
                ],
                dependencies: ['mobile-dev'],
            },
            {
                id: 'mobile-launch',
                name: 'Store Submission & Launch',
                nameAr: 'النشر على المتاجر',
                duration: '3-5 days',
                tasks: [
                    { title: 'App Store assets & listing', titleAr: 'أصول وقائمة المتجر', type: 'documentation', estimatedHours: 6, priority: 'high' },
                    { title: 'Submit to App Store & Google Play', titleAr: 'التقديم للمتاجر', type: 'deployment', estimatedHours: 4, priority: 'high' },
                    { title: 'Set up crash reporting & analytics', titleAr: 'إعداد تقارير الأعطال', type: 'setup', estimatedHours: 4, priority: 'medium' },
                ],
                dependencies: ['mobile-test'],
                approvalGate: true,
            },
        ],
    },

    ecommerce: {
        projectType: 'ecommerce',
        labelEn: 'E-Commerce Store',
        labelAr: 'متجر إلكتروني',
        phases: [
            {
                id: 'ecom-discovery',
                name: 'Store Planning',
                nameAr: 'تخطيط المتجر',
                duration: '3-5 days',
                tasks: [
                    { title: 'Product catalog strategy', titleAr: 'استراتيجية كتالوج المنتجات', type: 'documentation', estimatedHours: 8, priority: 'high' },
                    { title: 'Payment gateway selection', titleAr: 'اختيار بوابة الدفع', type: 'review', estimatedHours: 4, priority: 'high' },
                    { title: 'Shipping & logistics setup', titleAr: 'إعداد الشحن والخدمات اللوجستية', type: 'setup', estimatedHours: 6, priority: 'high' },
                ],
            },
            {
                id: 'ecom-design',
                name: 'Store Design',
                nameAr: 'تصميم المتجر',
                duration: '1 week',
                tasks: [
                    { title: 'Product page templates', titleAr: 'قوالب صفحات المنتجات', type: 'design', estimatedHours: 12, priority: 'high' },
                    { title: 'Cart & checkout flow', titleAr: 'تدفق السلة والدفع', type: 'design', estimatedHours: 10, priority: 'high' },
                    { title: 'Category & search UX', titleAr: 'تجربة الفئات والبحث', type: 'design', estimatedHours: 8, priority: 'medium' },
                ],
                dependencies: ['ecom-discovery'],
                approvalGate: true,
            },
            {
                id: 'ecom-dev',
                name: 'Store Development',
                nameAr: 'تطوير المتجر',
                duration: '3-4 weeks',
                tasks: [
                    { title: 'Product management system', titleAr: 'نظام إدارة المنتجات', type: 'development', estimatedHours: 20, priority: 'high' },
                    { title: 'Shopping cart & checkout', titleAr: 'سلة التسوق والدفع', type: 'development', estimatedHours: 24, priority: 'high' },
                    { title: 'Payment integration', titleAr: 'تكامل الدفع', type: 'development', estimatedHours: 16, priority: 'high' },
                    { title: 'Order management', titleAr: 'إدارة الطلبات', type: 'development', estimatedHours: 12, priority: 'high' },
                    { title: 'Admin dashboard', titleAr: 'لوحة التحكم', type: 'development', estimatedHours: 16, priority: 'medium' },
                ],
                dependencies: ['ecom-design'],
            },
            {
                id: 'ecom-test',
                name: 'Testing & Security',
                nameAr: 'الاختبار والأمان',
                duration: '1 week',
                tasks: [
                    { title: 'Payment flow testing', titleAr: 'اختبار تدفق الدفع', type: 'testing', estimatedHours: 12, priority: 'high' },
                    { title: 'Security audit', titleAr: 'مراجعة أمنية', type: 'testing', estimatedHours: 8, priority: 'high' },
                    { title: 'Load testing', titleAr: 'اختبار الحمل', type: 'testing', estimatedHours: 6, priority: 'medium' },
                ],
                dependencies: ['ecom-dev'],
            },
            {
                id: 'ecom-launch',
                name: 'Store Launch',
                nameAr: 'إطلاق المتجر',
                duration: '2-3 days',
                tasks: [
                    { title: 'Deploy and go live', titleAr: 'النشر والإطلاق', type: 'deployment', estimatedHours: 4, priority: 'high' },
                    { title: 'SEO & Google Merchant setup', titleAr: 'إعداد SEO و Google Merchant', type: 'setup', estimatedHours: 4, priority: 'medium' },
                    { title: 'Staff training on admin', titleAr: 'تدريب الموظفين', type: 'documentation', estimatedHours: 4, priority: 'medium' },
                ],
                dependencies: ['ecom-test'],
                approvalGate: true,
            },
        ],
    },

    branding: {
        projectType: 'branding',
        labelEn: 'Brand Identity',
        labelAr: 'الهوية البصرية',
        phases: [
            {
                id: 'brand-research',
                name: 'Brand Research',
                nameAr: 'بحث العلامة التجارية',
                duration: '3-5 days',
                tasks: [
                    { title: 'Market & competitor analysis', titleAr: 'تحليل السوق والمنافسين', type: 'review', estimatedHours: 10, priority: 'high' },
                    { title: 'Brand positioning strategy', titleAr: 'استراتيجية تموضع العلامة', type: 'documentation', estimatedHours: 8, priority: 'high' },
                ],
            },
            {
                id: 'brand-design',
                name: 'Visual Identity Design',
                nameAr: 'تصميم الهوية البصرية',
                duration: '1-2 weeks',
                tasks: [
                    { title: 'Logo concepts (3 directions)', titleAr: 'مفاهيم الشعار (3 اتجاهات)', type: 'design', estimatedHours: 20, priority: 'high' },
                    { title: 'Color palette & typography', titleAr: 'لوحة الألوان والخطوط', type: 'design', estimatedHours: 8, priority: 'high' },
                    { title: 'Logo refinement & finalization', titleAr: 'تحسين الشعار والتنقيح', type: 'design', estimatedHours: 10, priority: 'high' },
                ],
                dependencies: ['brand-research'],
                approvalGate: true,
            },
            {
                id: 'brand-guidelines',
                name: 'Brand Guidelines',
                nameAr: 'إرشادات العلامة',
                duration: '5-7 days',
                tasks: [
                    { title: 'Brand guidelines document', titleAr: 'وثيقة إرشادات العلامة', type: 'documentation', estimatedHours: 16, priority: 'high' },
                    { title: 'Stationery design', titleAr: 'تصميم القرطاسية', type: 'design', estimatedHours: 8, priority: 'medium' },
                    { title: 'Social media kit', titleAr: 'حزمة السوشيال ميديا', type: 'design', estimatedHours: 8, priority: 'medium' },
                ],
                dependencies: ['brand-design'],
            },
            {
                id: 'brand-delivery',
                name: 'Asset Delivery',
                nameAr: 'تسليم الأصول',
                duration: '2-3 days',
                tasks: [
                    { title: 'Export all file formats', titleAr: 'تصدير جميع الصيغ', type: 'documentation', estimatedHours: 4, priority: 'high' },
                    { title: 'Client presentation & handoff', titleAr: 'عرض وتسليم العميل', type: 'review', estimatedHours: 3, priority: 'high' },
                ],
                dependencies: ['brand-guidelines'],
                approvalGate: true,
            },
        ],
    },

    campaign: {
        projectType: 'campaign',
        labelEn: 'Digital Campaign',
        labelAr: 'حملة رقمية',
        phases: [
            {
                id: 'camp-strategy',
                name: 'Campaign Strategy',
                nameAr: 'استراتيجية الحملة',
                duration: '3-5 days',
                tasks: [
                    { title: 'Target audience research', titleAr: 'بحث الجمهور المستهدف', type: 'review', estimatedHours: 8, priority: 'high' },
                    { title: 'Campaign plan & KPIs', titleAr: 'خطة الحملة والمؤشرات', type: 'documentation', estimatedHours: 10, priority: 'high' },
                    { title: 'Channel selection & budget allocation', titleAr: 'اختيار القنوات وتوزيع الميزانية', type: 'review', estimatedHours: 6, priority: 'high' },
                ],
                approvalGate: true,
            },
            {
                id: 'camp-content',
                name: 'Content Creation',
                nameAr: 'صناعة المحتوى',
                duration: '1-2 weeks',
                tasks: [
                    { title: 'Ad copy & creatives', titleAr: 'نصوص وتصاميم إعلانية', type: 'design', estimatedHours: 16, priority: 'high' },
                    { title: 'Video/motion content', titleAr: 'محتوى فيديو/موشن', type: 'design', estimatedHours: 12, priority: 'medium' },
                    { title: 'Landing page design', titleAr: 'تصميم صفحة الهبوط', type: 'design', estimatedHours: 8, priority: 'medium' },
                ],
                dependencies: ['camp-strategy'],
            },
            {
                id: 'camp-execution',
                name: 'Campaign Execution',
                nameAr: 'تنفيذ الحملة',
                duration: '2-4 weeks',
                tasks: [
                    { title: 'Set up ad accounts & tracking', titleAr: 'إعداد حسابات الإعلانات والتتبع', type: 'setup', estimatedHours: 8, priority: 'high' },
                    { title: 'Launch campaigns', titleAr: 'إطلاق الحملات', type: 'deployment', estimatedHours: 6, priority: 'high' },
                    { title: 'A/B testing & optimization', titleAr: 'اختبار A/B والتحسين', type: 'testing', estimatedHours: 12, priority: 'high' },
                ],
                dependencies: ['camp-content'],
            },
            {
                id: 'camp-report',
                name: 'Reporting & Optimization',
                nameAr: 'التقارير والتحسين',
                duration: '3-5 days',
                tasks: [
                    { title: 'Performance report', titleAr: 'تقرير الأداء', type: 'documentation', estimatedHours: 8, priority: 'high' },
                    { title: 'ROI analysis & recommendations', titleAr: 'تحليل العائد والتوصيات', type: 'review', estimatedHours: 6, priority: 'high' },
                ],
                dependencies: ['camp-execution'],
            },
        ],
    },

    cloud: {
        projectType: 'cloud',
        labelEn: 'Cloud & DevOps',
        labelAr: 'السحابة و DevOps',
        phases: [
            {
                id: 'cloud-assess',
                name: 'Infrastructure Assessment',
                nameAr: 'تقييم البنية التحتية',
                duration: '3-5 days',
                tasks: [
                    { title: 'Current infrastructure audit', titleAr: 'مراجعة البنية الحالية', type: 'review', estimatedHours: 10, priority: 'high' },
                    { title: 'Architecture design', titleAr: 'تصميم الهندسة', type: 'documentation', estimatedHours: 12, priority: 'high' },
                    { title: 'Cost estimation', titleAr: 'تقدير التكاليف', type: 'review', estimatedHours: 4, priority: 'medium' },
                ],
                approvalGate: true,
            },
            {
                id: 'cloud-setup',
                name: 'Infrastructure Setup',
                nameAr: 'إعداد البنية التحتية',
                duration: '1-2 weeks',
                tasks: [
                    { title: 'Cloud account & networking', titleAr: 'حساب السحابة والشبكات', type: 'setup', estimatedHours: 12, priority: 'high' },
                    { title: 'Container orchestration', titleAr: 'تنظيم الحاويات', type: 'setup', estimatedHours: 16, priority: 'high' },
                    { title: 'CI/CD pipeline', titleAr: 'خط أنابيب CI/CD', type: 'setup', estimatedHours: 12, priority: 'high' },
                    { title: 'Monitoring & alerting', titleAr: 'المراقبة والتنبيهات', type: 'setup', estimatedHours: 8, priority: 'medium' },
                ],
                dependencies: ['cloud-assess'],
                automations: ['Infrastructure as Code templates'],
            },
            {
                id: 'cloud-migrate',
                name: 'Migration & Validation',
                nameAr: 'الترحيل والتحقق',
                duration: '1 week',
                tasks: [
                    { title: 'Data migration', titleAr: 'ترحيل البيانات', type: 'deployment', estimatedHours: 12, priority: 'high' },
                    { title: 'Load & stress testing', titleAr: 'اختبار الحمل والضغط', type: 'testing', estimatedHours: 8, priority: 'high' },
                    { title: 'Disaster recovery testing', titleAr: 'اختبار التعافي من الكوارث', type: 'testing', estimatedHours: 6, priority: 'medium' },
                ],
                dependencies: ['cloud-setup'],
            },
            {
                id: 'cloud-handoff',
                name: 'Documentation & Handoff',
                nameAr: 'التوثيق والتسليم',
                duration: '2-3 days',
                tasks: [
                    { title: 'Runbooks & documentation', titleAr: 'أدلة التشغيل والتوثيق', type: 'documentation', estimatedHours: 10, priority: 'high' },
                    { title: 'Team training', titleAr: 'تدريب الفريق', type: 'review', estimatedHours: 6, priority: 'medium' },
                ],
                dependencies: ['cloud-migrate'],
            },
        ],
    },

    seo: {
        projectType: 'seo',
        labelEn: 'SEO & Analytics',
        labelAr: 'تحسين محركات البحث',
        phases: [
            {
                id: 'seo-audit',
                name: 'Site Audit & Analysis',
                nameAr: 'مراجعة وتحليل الموقع',
                duration: '3-5 days',
                tasks: [
                    { title: 'Technical SEO audit', titleAr: 'مراجعة SEO التقنية', type: 'review', estimatedHours: 10, priority: 'high' },
                    { title: 'Keyword research', titleAr: 'بحث الكلمات المفتاحية', type: 'review', estimatedHours: 8, priority: 'high' },
                    { title: 'Competitor analysis', titleAr: 'تحليل المنافسين', type: 'review', estimatedHours: 6, priority: 'medium' },
                ],
            },
            {
                id: 'seo-optimize',
                name: 'On-Page Optimization',
                nameAr: 'تحسين الصفحات',
                duration: '1-2 weeks',
                tasks: [
                    { title: 'Meta tags & schema markup', titleAr: 'العلامات الوصفية والترميز', type: 'development', estimatedHours: 10, priority: 'high' },
                    { title: 'Content optimization', titleAr: 'تحسين المحتوى', type: 'development', estimatedHours: 12, priority: 'high' },
                    { title: 'Internal linking structure', titleAr: 'هيكل الروابط الداخلية', type: 'development', estimatedHours: 6, priority: 'medium' },
                    { title: 'Core Web Vitals fixes', titleAr: 'إصلاح مؤشرات الويب الأساسية', type: 'development', estimatedHours: 8, priority: 'high' },
                ],
                dependencies: ['seo-audit'],
            },
            {
                id: 'seo-analytics',
                name: 'Analytics Setup & Tracking',
                nameAr: 'إعداد التحليلات والتتبع',
                duration: '3-5 days',
                tasks: [
                    { title: 'Google Analytics 4 setup', titleAr: 'إعداد Google Analytics 4', type: 'setup', estimatedHours: 4, priority: 'high' },
                    { title: 'Search Console & indexing', titleAr: 'Search Console والفهرسة', type: 'setup', estimatedHours: 3, priority: 'high' },
                    { title: 'Custom dashboards & reports', titleAr: 'لوحات ومقاييس مخصصة', type: 'setup', estimatedHours: 6, priority: 'medium' },
                ],
                dependencies: ['seo-optimize'],
            },
            {
                id: 'seo-report',
                name: 'Baseline Report & Strategy',
                nameAr: 'تقرير الأساس والاستراتيجية',
                duration: '2-3 days',
                tasks: [
                    { title: 'Baseline performance report', titleAr: 'تقرير الأداء الأساسي', type: 'documentation', estimatedHours: 6, priority: 'high' },
                    { title: 'Ongoing SEO strategy document', titleAr: 'وثيقة استراتيجية SEO المستمرة', type: 'documentation', estimatedHours: 6, priority: 'high' },
                ],
                dependencies: ['seo-analytics'],
            },
        ],
    },
};
