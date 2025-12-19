// Type declaration for JSON imports
declare module "*.json" {
    const value: {
        auth?: {
            user_pool_id: string;
            user_pool_client_id: string;
            identity_pool_id: string;
            aws_region: string;
        };
        data?: {
            url: string;
            aws_region: string;
            default_authorization_type: string;
        };
        [key: string]: unknown;
    };
    export default value;
}
