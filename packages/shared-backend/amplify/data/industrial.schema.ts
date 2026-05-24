import { a } from '@aws-amplify/backend';

export const industrialSchema = {
    // ============================================
    // PID CONTROLLER - Industrial Platform
    // ============================================
    PIDController: a
        .model({
            name: a.string().required(),
            description: a.string(),
            kp: a.float().default(1.0),
            ki: a.float().default(0.0),
            kd: a.float().default(0.0),
            setpoint: a.float().default(0.0),
            processVariable: a.float(),
            output: a.float(),
            isActive: a.boolean().default(false),
        })
        .authorization((allow) => [
            allow.groups(['admins']),
            allow.groups(['pid-access']),
            allow.owner(),
        ]),

    PIDLog: a
        .model({
            controllerId: a.id().required(),
            timestamp: a.datetime().required(),
            setpoint: a.float(),
            processVariable: a.float(),
            output: a.float(),
            error: a.float(),
        })
        .authorization((allow) => [
            allow.groups(['pid-access']),
        ]),
};
