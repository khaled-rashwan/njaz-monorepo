/**
 * Formats a display name for an inquiry by combining the client name with project types.
 * Example: "Ahmed - E-Commerce, Website"
 */
export function formatProjectName(inquiry: { clientName?: string; projectTypes?: string[]; id: string }): string {
    const name = inquiry.clientName || inquiry.id.slice(0, 8);
    
    if (!inquiry.projectTypes || inquiry.projectTypes.length === 0) {
        return name;
    }

    // Capitalize and format types (e.g., "mobile_app" -> "Mobile App")
    const types = inquiry.projectTypes
        .slice(0, 2) // Limit to 2 types to prevent overflow
        .map(t => t.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' '))
        .join(', ');

    const suffix = inquiry.projectTypes.length > 2 ? '...' : '';
    
    return `${name} - ${types}${suffix}`;
}

/**
 * Formats a date to a readable local string.
 */
export function formatDate(dateString: string): string {
    if (!dateString) return '—';
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, { 
        month: 'short', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}
