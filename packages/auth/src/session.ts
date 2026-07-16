import { fetchAuthSession } from 'aws-amplify/auth';

export type HrmsAuthSession = { accessToken: string; idToken: string };

export async function restoreRedirectSession(): Promise<HrmsAuthSession | null> {
  const session = await fetchAuthSession();
  const accessToken = session.tokens?.accessToken?.toString();
  const idToken = session.tokens?.idToken?.toString();
  if (!accessToken || !idToken) return null;

  // Keep the tokens scoped to this browser session; Amplify retains the refreshable
  // Cognito session and this makes the tokens available to the host/API client.
  sessionStorage.setItem('hrms.accessToken', accessToken);
  sessionStorage.setItem('hrms.idToken', idToken);
  return { accessToken, idToken };
}
