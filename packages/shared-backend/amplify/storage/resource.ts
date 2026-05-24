import { defineStorage } from '@aws-amplify/backend';

export const storage = defineStorage({
    name: 'estebianReports',
    access: (allow) => ({
        'reports/{entity_id}/*': [
            allow.entity('identity').to(['read']),
            allow.groups(['admins']).to(['read', 'write', 'delete']),
        ],
    }),
});
