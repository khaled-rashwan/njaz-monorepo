import { defineStorage } from '@aws-amplify/backend';

export const storage = defineStorage({
    name: 'estebianReports',
    access: (allow) => ({
        'reports/*': [
            allow.authenticated.to(['read']),
            allow.guest.to(['read']),
            allow.groups(['admins']).to(['read', 'write', 'delete']),
        ],
        'scholar-figures/*': [
            allow.authenticated.to(['read', 'write', 'delete']),
            allow.groups(['admins']).to(['read', 'write', 'delete']),
            allow.groups(['devplatform-access']).to(['read', 'write', 'delete']),
            allow.groups(['pid-access']).to(['read', 'write', 'delete']),
            allow.groups(['interior-access']).to(['read', 'write', 'delete']),
            allow.groups(['scholar-access']).to(['read', 'write', 'delete']),
        ],
    }),
});
