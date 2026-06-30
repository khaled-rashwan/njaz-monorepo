import type { AppSyncResolverHandler } from 'aws-lambda';
import { 
    CognitoIdentityProviderClient, 
    ListUsersCommand, 
    AdminCreateUserCommand, 
    AdminDeleteUserCommand, 
    AdminAddUserToGroupCommand, 
    AdminRemoveUserFromGroupCommand,
    AdminListGroupsForUserCommand,
    AdminUpdateUserAttributesCommand,
    CreateGroupCommand
} from '@aws-sdk/client-cognito-identity-provider';

const client = new CognitoIdentityProviderClient({});

export const handler: AppSyncResolverHandler<any, any> = async (event) => {
    const userPoolId = process.env.USER_POOL_ID;
    if (!userPoolId) throw new Error('USER_POOL_ID environment variable is missing');

    const args = event.arguments || {};
    let action = '';

    if (args.group && args.action) {
        action = 'manageUserGroup';
    } else if (args.email && args.username) {
        action = 'createUser';
    } else if (args.username && !args.email && !args.group) {
        action = 'deleteUser';
    } else {
        action = 'listUsers';
    }
    try {
        switch (action) {
            case 'listUsers': {
                const res = await client.send(new ListUsersCommand({ UserPoolId: userPoolId }));
                
                // Fetch groups for each user and map fields
                const usersWithGroups = await Promise.all((res.Users || []).map(async (user) => {
                    const groupsRes = await client.send(new AdminListGroupsForUserCommand({
                        UserPoolId: userPoolId,
                        Username: user.Username
                    }));
                    
                    const emailParam = user.Attributes?.find(a => a.Name === 'email');
                    return {
                        id: user.Username,
                        username: user.Username,
                        email: emailParam ? emailParam.Value : '',
                        status: user.UserStatus,
                        enabled: user.Enabled,
                        createdAt: user.UserCreateDate?.toISOString() || new Date().toISOString(),
                        groups: JSON.stringify((groupsRes.Groups || []).map(g => g.GroupName))
                    };
                }));
                
                return JSON.stringify({ users: usersWithGroups });
            }
            
            case 'createUser': {
                const { username, email } = event.arguments;
                const res = await client.send(new AdminCreateUserCommand({
                    UserPoolId: userPoolId,
                    Username: username,
                    UserAttributes: [
                        { Name: 'email', Value: email },
                        { Name: 'email_verified', Value: 'true' }
                    ],
                    DesiredDeliveryMediums: ['EMAIL']
                }));
                return JSON.stringify({ success: true, userId: res.User?.Username });
            }
            
            case 'deleteUser': {
                const { username } = event.arguments;
                await client.send(new AdminDeleteUserCommand({
                    UserPoolId: userPoolId,
                    Username: username
                }));
                return JSON.stringify({ success: true });
            }
            
            case 'manageUserGroup': {
                const { username, group, action: groupAction } = event.arguments;
                if (groupAction === 'add') {
                    try {
                        await client.send(new AdminAddUserToGroupCommand({
                            UserPoolId: userPoolId,
                            Username: username,
                            GroupName: group
                        }));
                    } catch (err: any) {
                        if (err.name === 'ResourceNotFoundException') {
                            // Create the group dynamically if it doesn't exist
                            await client.send(new CreateGroupCommand({
                                UserPoolId: userPoolId,
                                GroupName: group,
                                Description: `Dynamically created group: ${group}`
                            }));
                            // Retry adding user to group
                            await client.send(new AdminAddUserToGroupCommand({
                                UserPoolId: userPoolId,
                                Username: username,
                                GroupName: group
                            }));
                        } else {
                            throw err;
                        }
                    }
                } else if (groupAction === 'remove') {
                    try {
                        await client.send(new AdminRemoveUserFromGroupCommand({
                            UserPoolId: userPoolId,
                            Username: username,
                            GroupName: group
                        }));
                    } catch (err: any) {
                        if (err.name !== 'ResourceNotFoundException') {
                            throw err;
                        }
                    }
                }
                return JSON.stringify({ success: true });
            }
            
            default:
                throw new Error(`Unknown action: ${action}`);
        }
    } catch (error: any) {
        console.error('manageUsers error:', error);
        throw new Error(error.message);
    }
};
