import React, { useState, useCallback, useEffect } from 'react';
import { API, Auth } from 'aws-amplify';
import { AuthContext, AuthUser, CurrentOrganization } from './AuthContext';
import { User, Organization } from 'types';
import { useHistory } from 'react-router-dom';

// to be added to every request
const baseHeaders: HeadersInit = {
  'Content-Type': 'application/json',
  Accept: 'application/json'
};

export const AuthContextProvider: React.FC = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>();
  const [unverifiedUser, setUnverifiedUser] = useState<any>();
  const [currentOrganization, setCurrentOrganization] = useState<
    CurrentOrganization
  >();
  const [loading, setLoading] = useState(0);
  const history = useHistory();

  const refreshState = async () => {
    const organization = localStorage.getItem('organization');

    if (organization) {
      setOrganization(JSON.parse(organization));
    } else if (user) {
      if (user.roles.length > 0) {
        setOrganization(user.roles[0].organization);
      }
    }
  };

  const setOrganization = async (organization: Organization) => {
    let extendedOrg: CurrentOrganization = organization;
    extendedOrg.userIsAdmin =
      user?.userType === 'globalAdmin' ||
      user?.roles.find(role => role.organization.id === currentOrganization?.id)
        ?.role === 'admin';
    localStorage.setItem('organization', JSON.stringify(extendedOrg));
    setCurrentOrganization(extendedOrg);
  };

  useEffect(() => {
    refreshUser();
    // eslint-disable-next-line
  }, []);

  useEffect(() => {
    refreshState();
    // eslint-disable-next-line
  }, [user]);

  const logout = async () => {
    setUser(null);
    localStorage.removeItem('user');
    localStorage.removeItem('token');
  };

  const handleError = useCallback(
    async (e: Error) => {
      if (e.message.includes('401')) {
        // Unauthorized, log out user
        await logout();
        history.push('/');
      }
    },
    [history]
  );

  const login = async (token: string, user: User) => {
    let userCopy: AuthUser = {
      isRegistered: user.firstName !== '',
      ...user
    };
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(userCopy));
    setUser(userCopy);
  };

  const loginWithCognito = async (username: string, password: string) => {
    const user = await Auth.signIn(username, password);
    if (user.challengeName === 'NEW_PASSWORD_REQUIRED') {
      setUnverifiedUser(user);
      history.push('/create-password');
    } else {
      setUser(user);
    }
    return user;
  };

  const resetPassword = async (
    currentpassword: string,
    newpassword: string
  ) => {
    const user = await Auth.currentAuthenticatedUser();
    await Auth.changePassword(user, currentpassword, newpassword);
  };

  const completePassword = async (password: string) => {
    const result = await Auth.completeNewPassword(unverifiedUser, password, {});
    setUnverifiedUser(undefined);
    setUser(result);
  };

  const refreshUser = async () => {
    if (!localStorage.getItem('token')) {
      return;
    }
    const user: User = await apiGet('/users/me');
    const userCopy: AuthUser = {
      isRegistered: user.firstName !== '',
      ...user
    };
    localStorage.setItem('user', JSON.stringify(userCopy));
    setUser(userCopy);
  };

  const prepareInit = useCallback(async (init: any) => {
    const { headers, ...rest } = init;
    return {
      ...rest,
      headers: {
        ...headers,
        ...baseHeaders,
        Authorization: localStorage.getItem('token')
      }
    };
  }, []);

  const apiGet = useCallback(
    async <T extends object = {}>(path: string, init: any = {}) => {
      try {
        setLoading(l => l + 1);
        const options = await prepareInit(init);
        const result = await API.get('crossfeed', path, options);
        setLoading(l => l - 1);
        return result as T;
      } catch (e) {
        setLoading(l => l - 1);
        await handleError(e);
        throw e;
      }
    },
    [prepareInit, handleError]
  );

  const apiPost = useCallback(
    async <T extends object = {}>(path: string, init: any) => {
      try {
        setLoading(l => l + 1);
        const options = await prepareInit(init);
        const result = await API.post('crossfeed', path, options);
        setLoading(l => l - 1);
        return result as T;
      } catch (e) {
        setLoading(l => l - 1);
        await handleError(e);
        throw e;
      }
    },
    [prepareInit, handleError]
  );

  const apiDelete = useCallback(
    async <T extends object = {}>(path: string, init: any = {}) => {
      try {
        setLoading(l => l + 1);
        const options = await prepareInit(init);
        const result = await API.del('crossfeed', path, options);
        setLoading(l => l - 1);
        return result as T;
      } catch (e) {
        setLoading(l => l - 1);
        await handleError(e);
        throw e;
      }
    },
    [prepareInit, handleError]
  );

  const apiPut = useCallback(
    async <T extends object = {}>(path: string, init: any) => {
      try {
        setLoading(l => l + 1);
        const options = await prepareInit(init);
        const result = await API.put('crossfeed', path, options);
        setLoading(l => l - 1);
        return result as T;
      } catch (e) {
        setLoading(l => l - 1);
        await handleError(e);
        throw e;
      }
    },
    [prepareInit, handleError]
  );

  return (
    <AuthContext.Provider
      value={{
        setOrganization,
        refreshUser,
        user,
        currentOrganization,
        login,
        loginWithCognito,
        logout,
        resetPassword,
        completePassword: unverifiedUser ? completePassword : undefined,
        apiGet,
        apiPost,
        apiPut,
        apiDelete,
        setLoading
      }}
    >
      {loading > 0 && (
        <div className="cisa-crossfeed-loading">
          <div></div>
          <div></div>
        </div>
      )}
      {children}
    </AuthContext.Provider>
  );
};
