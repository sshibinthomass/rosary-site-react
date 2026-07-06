export function getNativeGoogleCredentialTokens(nativeResult = {}) {
  const credential = nativeResult?.credential || {};
  const idToken = credential.idToken || null;
  const accessToken = credential.accessToken || null;

  if (!idToken && !accessToken) {
    throw new Error('Google sign-in did not return an ID token or access token.');
  }

  return { idToken, accessToken };
}

export function getNativeGoogleSignInErrorMessage(error = {}) {
  const rawError = `${error?.code || ''} ${error?.message || ''}`;

  if (/developer_error|status\s*10|10:|ApiException:\s*10/i.test(rawError)) {
    return 'Google sign-in needs this Android app signing SHA-1 added in Firebase, then a fresh google-services.json downloaded.';
  }

  return error?.message || 'Google sign-in failed.';
}
