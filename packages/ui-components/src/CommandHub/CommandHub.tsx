'use client';

interface CommandHubProps {
    userEmail?: string;
    userName?: string;
    userAvatar?: string;
}

/**
 * Command Hub - Central circular component with rotating rings
 * Shows user profile and "NJAZ COMMAND CENTER" branding
 */
export function CommandHub({ userEmail, userName, userAvatar }: CommandHubProps) {
    const initial = userEmail?.charAt(0).toUpperCase() || userName?.charAt(0).toUpperCase() || 'N';

    return (
        <div className="relative flex items-center justify-center">
            {/* Outer rotating ring */}
            <div
                className="absolute w-64 h-64 rounded-full border border-cyan-500/20"
                style={{
                    animation: 'orbit 30s linear infinite',
                    boxShadow: '0 0 40px rgba(56, 205, 223, 0.1)',
                }}
            >
                {/* Orbit dots */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-cyan-400 shadow-lg shadow-cyan-400/50" />
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-2 h-2 rounded-full bg-purple-400 shadow-lg shadow-purple-400/50" />
            </div>

            {/* Middle rotating ring (opposite direction) */}
            <div
                className="absolute w-48 h-48 rounded-full border border-purple-500/30"
                style={{
                    animation: 'orbit-reverse 20s linear infinite',
                    boxShadow: '0 0 30px rgba(139, 92, 246, 0.1)',
                }}
            >
                <div className="absolute top-1/2 right-0 translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-amber-400 shadow-lg shadow-amber-400/50" />
            </div>

            {/* Inner glow ring */}
            <div
                className="absolute w-36 h-36 rounded-full"
                style={{
                    background: 'radial-gradient(circle, rgba(56, 205, 223, 0.1) 0%, transparent 70%)',
                    animation: 'pulse-glow 4s ease-in-out infinite',
                }}
            />

            {/* Center content */}
            <div className="relative z-10 flex flex-col items-center">
                {/* User Avatar */}
                <div
                    className="w-20 h-20 rounded-full bg-gradient-to-br from-cyan-500 to-purple-600 flex items-center justify-center text-white text-2xl font-bold mb-4 border-2 border-cyan-400/50"
                    style={{
                        boxShadow: '0 0 30px rgba(56, 205, 223, 0.4), inset 0 0 20px rgba(0,0,0,0.3)',
                    }}
                >
                    {userAvatar ? (
                        <img src={userAvatar} alt="User" className="w-full h-full rounded-full object-cover" />
                    ) : (
                        initial
                    )}
                </div>

                {/* Command Center Text */}
                <div className="text-center">
                    <div
                        className="text-lg font-black tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-white to-cyan-400"
                        style={{ textShadow: '0 0 20px rgba(56, 205, 223, 0.5)' }}
                    >
                        NJAZ
                    </div>
                    <div className="text-[10px] tracking-[0.3em] text-cyan-400/80 font-medium">
                        COMMAND CENTER
                    </div>
                </div>
            </div>
        </div>
    );
}
