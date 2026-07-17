import { signInWithRedirect } from 'aws-amplify/auth';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  companyName: string;
  domain: string;
  adminEmail: string;
  password?: string;
}

class AuthService {
  private baseUrl = process.env.API_URL || 'http://localhost:4000/api';

  async login(data: LoginRequest) {
    const res = await fetch(`${this.baseUrl}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.message || 'Login failed');
    }

    const payload = await res.json();
    console.log('AuthService: login response payload received:', payload);
    
    // Store user data in sessionStorage for host access
    sessionStorage.setItem('hrms.user', JSON.stringify(payload.user));
    console.log('AuthService: Stored in sessionStorage under hrms.user:', sessionStorage.getItem('hrms.user'));
    
    console.log('AuthService: Dispatching hrms:auth-session custom event...');
    window.dispatchEvent(new CustomEvent('hrms:auth-session', { detail: payload.user }));
    return payload.user;
  }

  async register(data: RegisterRequest) {
    const res = await fetch(`${this.baseUrl}/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.message || 'Registration failed');
    }

    return res.json();
  }

  async logout() {
    try {
      await fetch(`${this.baseUrl}/auth/logout`, {
        method: 'POST',
        credentials: 'include',
      });
    } catch (e) {
      console.error('Logout error', e);
    }
    sessionStorage.removeItem('hrms.user');
    window.dispatchEvent(new CustomEvent('hrms:auth-logout'));
  }

  async getSession() {
    try {
      const res = await fetch(`${this.baseUrl}/auth/me`, {
        credentials: 'include',
      });
      if (!res.ok) {
        sessionStorage.removeItem('hrms.user');
        return null;
      }
      const payload = await res.json();
      sessionStorage.setItem('hrms.user', JSON.stringify(payload.user));
      return payload.user;
    } catch (err) {
      sessionStorage.removeItem('hrms.user');
      return null;
    }
  }

  async forgotPassword(email: string) {
    console.log('Mock forgot password for:', email);
    return true;
  }

  async confirmForgotPassword(email: string, code: string, newPassword: string) {
    console.log('Mock reset password for:', email);
    return true;
  }

  async googleLogin() {
    // Re-configure Amplify with the correct current origin right before redirecting
    // This ensures the redirect_uri matches whether running on localhost or CloudFront
    const { Amplify } = await import('aws-amplify');
    const currentOrigin = window.location.origin;
    const cognitoClientId = process.env.COGNITO_CLIENT_ID || '379s1pachcs1mnnv4rv6m2k2m5';
    const cognitoUserPoolId = process.env.COGNITO_USER_POOL_ID || 'ap-south-1_b5vYsi7ss';
    const cognitoDomain = (process.env.COGNITO_DOMAIN || 'https://ap-south-1b5vysi7ss.auth.ap-south-1.amazoncognito.com').replace(/^https?:\/\//, '');

    Amplify.configure({
      Auth: {
        Cognito: {
          userPoolId: cognitoUserPoolId,
          userPoolClientId: cognitoClientId,
          loginWith: {
            oauth: {
              domain: cognitoDomain,
              scopes: ['openid', 'email', 'profile'],
              redirectSignIn: [`${currentOrigin}/`],
              redirectSignOut: [`${currentOrigin}/`],
              responseType: 'code',
            },
          },
        },
      },
    });

    await signInWithRedirect({ provider: 'Google' });
  }

  async oauthLogin(email: string) {
    const res = await fetch(`${this.baseUrl}/auth/oauth-login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({ email }),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.message || 'OAuth authentication failed');
    }

    const payload = await res.json();
    console.log('AuthService: oauthLogin response user payload received:', payload);
    sessionStorage.setItem('hrms.user', JSON.stringify(payload.user));
    window.dispatchEvent(new CustomEvent('hrms:auth-session', { detail: payload.user }));
    return payload.user;
  }
}

export default new AuthService();