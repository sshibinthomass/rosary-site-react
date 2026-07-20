export const CHECKOUT_DIAGNOSTIC_APP_NAME = 'checkout-diagnostic-writer';

function requiredFunction(value, name) {
  if (!(value instanceof Function)) {
    throw new TypeError(`${name} is required for checkout diagnostic authentication.`);
  }
  return value;
}

export function createCheckoutDiagnosticWriterIdTokenProvider(dependencies = {}) {
  const getApps = requiredFunction(dependencies.getApps, 'getApps');
  const initializeApp = requiredFunction(dependencies.initializeApp, 'initializeApp');
  const getAuth = requiredFunction(dependencies.getAuth, 'getAuth');
  const setPersistence = requiredFunction(dependencies.setPersistence, 'setPersistence');
  const signInAnonymously = requiredFunction(dependencies.signInAnonymously, 'signInAnonymously');
  const appName = dependencies.appName || CHECKOUT_DIAGNOSTIC_APP_NAME;
  let authPromise;
  let signInPromise;

  async function getWriterAuth() {
    authPromise ||= Promise.resolve().then(async () => {
      const app = getApps().find(({ name }) => name === appName)
        || initializeApp(dependencies.firebaseConfig, appName);
      const auth = getAuth(app);
      await setPersistence(auth, dependencies.browserLocalPersistence);
      if (auth.authStateReady instanceof Function) await auth.authStateReady();
      return auth;
    });
    return authPromise;
  }

  return async function getWriterIdToken() {
    const auth = await getWriterAuth();
    let user = auth.currentUser;
    if (!user) {
      signInPromise ||= signInAnonymously(auth).finally(() => {
        signInPromise = null;
      });
      const credential = await signInPromise;
      user = credential?.user || auth.currentUser;
    }
    if (!user || !(user.getIdToken instanceof Function)) {
      throw new Error('Anonymous checkout diagnostic authentication is unavailable.');
    }
    const token = await user.getIdToken(true);
    if (typeof token !== 'string' || !token) {
      throw new Error('Anonymous checkout diagnostic token is unavailable.');
    }
    return token;
  };
}

let productionProviderPromise;

async function getProductionProvider() {
  productionProviderPromise ||= Promise.all([
    import('firebase/app'),
    import('firebase/auth'),
    import('../config/firebaseOptions.js'),
  ]).then(([appApi, authApi, options]) => createCheckoutDiagnosticWriterIdTokenProvider({
    firebaseConfig: options.firebaseConfig,
    browserLocalPersistence: authApi.browserLocalPersistence,
    getApps: appApi.getApps,
    initializeApp: appApi.initializeApp,
    getAuth: authApi.getAuth,
    setPersistence: authApi.setPersistence,
    signInAnonymously: authApi.signInAnonymously,
  }));
  return productionProviderPromise;
}

export async function getCheckoutDiagnosticWriterIdToken() {
  const provider = await getProductionProvider();
  return provider();
}
