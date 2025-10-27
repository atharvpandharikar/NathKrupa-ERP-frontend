import React, { createContext, useContext, ReactNode, useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { authApi, getTokens, setTokens, clearTokens, organizationsApi, Organization } from '@/lib/api';
import { getOrganizationFromSubdomain } from '@/lib/organization';

// Define Auth Context
interface AuthContextProps {
    isAuthenticated: boolean;
    login: (email: string, password: string, device_id_hash?: string) => Promise<void>;
    logout: () => void;
    refreshToken: () => Promise<void>;
    getAuthToken: () => string | undefined;
    currentUser: {
        email?: string;
        username?: string;
        is_superuser?: boolean;
    };
    sessionExpired: boolean;
    setSessionExpired: (expired: boolean) => void;
    activeOrganizationId?: number;
    setActiveOrganizationId: (id: number | undefined) => void;
    currentOrganization: Organization | null;
    userOrganizations: Organization[];
    switchToOrganization: (organization: Organization) => void;
    isSuperuser: boolean;
}

const AuthContext = createContext<AuthContextProps | undefined>(undefined);

// Helper function to decode JWT
const decodeJwt = (token: string) => {
    try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(
            atob(base64)
                .split('')
                .map(c => {
                    return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
                })
                .join(''),
        );
        return JSON.parse(jsonPayload);
    } catch {
        return null;
    }
};

// AuthProvider component
export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const [sessionExpired, setSessionExpired] = useState(false);
    const [activeOrganizationId, _setActiveOrganizationId] = useState<number | undefined>(getTokens()?.activeOrganizationId);
    const [currentOrganization, setCurrentOrganization] = useState<Organization | null>(null);
    const [userOrganizations, setUserOrganizations] = useState<Organization[]>([]);

    const setActiveOrganizationId = (id: number | undefined) => {
        _setActiveOrganizationId(id);
        const tokens = getTokens();
        if (tokens) {
            setTokens({ ...tokens, activeOrganizationId: id });
        }
    };

    // Check if user is authenticated
    const isAuthenticated = (): boolean => {
        const tokens = getTokens();
        if (!tokens?.access) return false;

        try {
            const decoded = decodeJwt(tokens.access);
            if (!decoded) return false;
            return decoded.exp > Math.floor(Date.now() / 1000);
        } catch {
            return false;
        }
    };

    // Get current user info
    const getCurrentUser = () => {
        const tokens = getTokens();
        if (!tokens?.access) return {};

        try {
            const decoded = decodeJwt(tokens.access);
            return {
                email: decoded?.email || '',
                username: decoded?.username || '',
                is_superuser: decoded?.is_superuser || false,
            };
        } catch {
            return {};
        }
    };

    // Function to refresh the access token
    const refreshToken = async () => {
        const tokens = getTokens();
        if (!tokens?.refresh) {
            throw new Error('No refresh token available');
        }

        try {
            const response = await fetch(`${import.meta.env.VITE_API_ROOT || 'http://127.0.0.1:8000'}/api/auth/token/refresh/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ refresh: tokens.refresh }),
            });

            if (!response.ok) {
                throw new Error('Failed to refresh token');
            }

            const data = await response.json();
            const newTokens = { access: data.access, refresh: tokens.refresh };
            setTokens(newTokens);
            return data.access;
        } catch {
            throw new Error('Failed to refresh token');
        }
    };

    // Function to log in user
    const login = async (email: string, password: string, device_id_hash?: string) => {
        try {
            const response = await authApi.login(email, password, device_id_hash);
            setSessionExpired(false);

            // Try to load user organizations (optional - don't fail if it errors)
            try {
                const orgs = await organizationsApi.list();
                setUserOrganizations(orgs);

                // Set the active organization ID from the login response or first available org
                if (response.organization?.id) {
                    setActiveOrganizationId(response.organization.id);
                    setCurrentOrganization(response.organization);
                } else if (orgs.length > 0) {
                    // If no organization in response but user has organizations, use the first one
                    setActiveOrganizationId(orgs[0].id);
                    setCurrentOrganization(orgs[0]);
                } else {
                    setActiveOrganizationId(undefined);
                    setCurrentOrganization(null);
                }
            } catch (orgError) {
                console.warn('Could not load organizations:', orgError);
                // Continue anyway - multi-tenancy is optional
                setActiveOrganizationId(undefined);
                setCurrentOrganization(null);
            }

            // Redirect to the intended page or dashboard (not app-selection)
            const from = (location.state as any)?.from?.pathname || '/dashboard';
            navigate(from, { replace: true });
        } catch (error: any) {
            throw new Error(error?.message || 'Login failed. Please check your credentials.');
        }
    };

    // Function to log out user
    const logout = () => {
        clearTokens();
        setSessionExpired(false);
        setCurrentOrganization(null);
        setUserOrganizations([]);
        navigate('/login', { replace: true });
    };

    // Function to switch organization
    const switchToOrganizationHandler = (organization: Organization) => {
        // Update local state
        setActiveOrganizationId(organization.id);
        setCurrentOrganization(organization);

        // Update tokens with new organization
        const tokens = getTokens();
        if (tokens) {
            setTokens({ ...tokens, activeOrganizationId: organization.id });
        }

        // Reload the page to apply new organization context
        window.location.reload();
    };

    // Check if user is superuser
    const isSuperuser = getCurrentUser().is_superuser || false;

    // Get auth token
    const getAuthToken = () => {
        const tokens = getTokens();
        return tokens?.access;
    };

    // Check and refresh token if expired
    useEffect(() => {
        const tokens = getTokens();
        if (!tokens?.access) {
            return;
        }

        try {
            const decodedToken = decodeJwt(tokens.access);
            if (!decodedToken) {
                logout();
                return;
            }

            const currentTime = Math.floor(Date.now() / 1000);
            const timeUntilExpiry = decodedToken.exp - currentTime;

            // If token expires in less than 2 minutes, try to refresh
            if (timeUntilExpiry < 60 * 2) {
                refreshToken().catch(() => {
                    setSessionExpired(true);
                    // Show session expired message and redirect to login after delay
                    setTimeout(() => {
                        logout();
                    }, 3000);
                });
            }
        } catch {
            logout();
        }
    }, []);

    // Auto-logout on session expiry
    useEffect(() => {
        if (sessionExpired) {
            const timer = setTimeout(() => {
                logout();
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, [sessionExpired]);

    return (
        <AuthContext.Provider
            value={{
                isAuthenticated: isAuthenticated(),
                login,
                logout,
                refreshToken,
                getAuthToken,
                currentUser: getCurrentUser(),
                sessionExpired,
                setSessionExpired,
                activeOrganizationId,
                setActiveOrganizationId,
                currentOrganization,
                userOrganizations,
                switchToOrganization: switchToOrganizationHandler,
                isSuperuser,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
};

// Custom hook to access AuthContext
export const useAuth = (): AuthContextProps => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

// Helper function to check auth (can be used by components)
export const userAuthCheck = (): boolean => {
    const tokens = getTokens();
    return !!tokens?.access;
};
