'use client';
import { Role, UserInfoDto } from "@/dtos/Auth.dto";
import { createContext, useContext, useMemo, useState } from "react";

interface AuthContextProviderProps {
    children: React.ReactNode;
    initialUser: UserInfoDto;
}

interface AuthContextValue {
    user: UserInfoDto;
    setUser: (user: UserInfoDto) => void;
    resetUser: () => void;
}

const AuthContext = createContext<AuthContextValue>({
    user: {
        id: "",
        email: "",
        roleType: Role.guest,
    },
    setUser: () => { },
    resetUser: () => { },
});

export const AuthProvider = ({ children, initialUser }: AuthContextProviderProps) => {
    const [user, setUser] = useState<UserInfoDto>(initialUser);

    const value = useMemo<AuthContextValue>(
        () => ({
            user,
            setUser,
            resetUser: () => {
                setUser(initialUser);
            },
        }),
        [initialUser, user]
    );

    return <AuthContext.Provider value={value} > {children} </AuthContext.Provider>;
};

export const useAuth = () => {
    return useContext(AuthContext);
};