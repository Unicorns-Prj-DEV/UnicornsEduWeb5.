'use client';
import { Role, UserInfoDto } from "@/dtos/Auth.dto";
import { getProfile } from "@/lib/apis/auth.api";
import { createContext, useContext, useEffect, useMemo, useState } from "react";

interface AuthContextProviderProps {
    children: React.ReactNode;
    initialUser: UserInfoDto;
}

interface AuthContextValue {
    user: UserInfoDto;
    setUser: (user: UserInfoDto) => void;
    resetUser: () => void;
    isAuthReady: boolean;
}

const AuthContext = createContext<AuthContextValue>({
    user: {
        id: "",
        accountHandle: "",
        roleType: Role.guest,
        requiresPasswordSetup: false,
    },
    setUser: () => { },
    resetUser: () => { },
    isAuthReady: false,
});

export const AuthProvider = ({ children, initialUser }: AuthContextProviderProps) => {
    const [user, setUser] = useState<UserInfoDto>(initialUser);
    const [isAuthReady, setIsAuthReady] = useState(false);

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const profile = await getProfile();
                setUser(
                    profile ?? {
                        id: "",
                        accountHandle: "",
                        roleType: Role.guest,
                        requiresPasswordSetup: false,
                    },
                );
            } catch {
                setUser({
                    id: "",
                    accountHandle: "",
                    roleType: Role.guest,
                    requiresPasswordSetup: false,
                });
            } finally {
                setIsAuthReady(true);
            }
        };
        fetchProfile();
    }, []);

    const value = useMemo<AuthContextValue>(
        () => ({
            user,
            setUser,
            resetUser: () => {
                setUser({
                    id: '',
                    accountHandle: '',
                    roleType: Role.guest,
                    requiresPasswordSetup: false,
                });
            },
            isAuthReady,
        }),
        [isAuthReady, user]
    );

    return <AuthContext.Provider value={value} > {children} </AuthContext.Provider>;
};

export const useAuth = () => {
    return useContext(AuthContext);
};
