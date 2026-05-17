'use client';
import { createGuestUser, UserInfoDto } from "@/dtos/Auth.dto";
import { createContext, use, useMemo, useState, type Dispatch, type SetStateAction } from "react";

interface AuthContextProviderProps {
    children: React.ReactNode;
    initialUser: UserInfoDto;
}

interface AuthContextValue {
    user: UserInfoDto;
    setUser: Dispatch<SetStateAction<UserInfoDto>>;
    resetUser: () => void;
    isAuthReady: boolean;
}

const AuthContext = createContext<AuthContextValue>({
    user: createGuestUser(),
    setUser: () => { },
    resetUser: () => { },
    isAuthReady: true,
});

export const AuthProvider = ({ children, initialUser }: AuthContextProviderProps) => {
    const [user, setUser] = useState<UserInfoDto>(initialUser);
    const isAuthReady = true;

    const value = useMemo<AuthContextValue>(
        () => ({
            user,
            setUser,
            resetUser: () => {
                setUser(createGuestUser());
            },
            isAuthReady,
        }),
        [isAuthReady, user]
    );

    return <AuthContext.Provider value={value} > {children} </AuthContext.Provider>;
};

export const useAuth = () => {
    return use(AuthContext);
};
