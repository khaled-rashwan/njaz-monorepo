import { defineStorage } from '@aws-amplify/backend';

export const storage = defineStorage({
    name: 'estebianReports',
    access: (allow) => ({
        'reports/*': [
            allow.authenticated.to(['read']),
            allow.guest.to(['read']),
            allow.groups(['admins']).to(['read', 'write', 'delete']),
        ],
    }),
});
