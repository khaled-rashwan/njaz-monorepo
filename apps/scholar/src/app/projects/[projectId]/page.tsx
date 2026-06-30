'use client';

import { useEffect } from 'react';
import { ProjectCanvas } from '@/components/canvas/ProjectCanvas';
import { useEditorStore } from '@/store/editor-store';

export default function ProjectCanvasPage({ params }: { params: { projectId: string } }) {
    const loadLiteratureItems = useEditorStore(state => state.loadLiteratureItems);
    const loadProjectDocument = useEditorStore(state => state.loadProjectDocument);

    useEffect(() => {
        if (params.projectId) {
            loadLiteratureItems(params.projectId);
            loadProjectDocument(params.projectId);
        }
    }, [params.projectId, loadLiteratureItems, loadProjectDocument]);

    return (
        <div className="w-full h-screen overflow-hidden">
            <ProjectCanvas projectId={params.projectId} />
        </div>
    );
}
