import { Amplify } from 'aws-amplify';

declare global {
  interface Window {
    __HRMS_AMPLIFY_CONFIG__?: {
      userPoolId: string;
      userPoolClientId: string;
      cognitoDomain: string;
      redirectSignIn: string;
      redirectSignOut: string;
    };
  }
}

const cleanDomain = (process.env.COGNITO_DOMAIN || '').replace(/^https?:\/\//, '');

window.__HRMS_AMPLIFY_CONFIG__ = {
  userPoolId: process.env.COGNITO_USER_POOL_ID || '',
  userPoolClientId: process.env.COGNITO_CLIENT_ID || '',
  cognitoDomain: cleanDomain,
  redirectSignIn: 'http://localhost:3000/',
  redirectSignOut: 'http://localhost:3000',
};

const config = window.__HRMS_AMPLIFY_CONFIG__;

Amplify.configure({
  Auth: {
    Cognito: {
      userPoolId: config.userPoolId,
      userPoolClientId: config.userPoolClientId,
      loginWith: {
        oauth: {
          domain: config.cognitoDomain,
          scopes: ['openid', 'email'],
          redirectSignIn: [config.redirectSignIn],
          redirectSignOut: [config.redirectSignOut],
          responseType: 'code',
        },
      },
    },
  },
});

export const isAmplifyConfigured = true;