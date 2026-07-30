export interface Dictionary {
  nav: {
    home: string;
    account: string;
    logout: string;
    login: string;
    register: string;
  };
  home: {
    badge: string;
    heroTitleStart: string;
    rotatingWords: string[];
    heroSubtitle: string;
    searchPlaceholder: string;
    searchButton: string;
    calculatorsLink: string;
    featuresTitle: string;
    features: { title: string; desc: string; linkText: string }[];
  };
  auth: {
    loginTitle: string;
    registerTitle: string;
    steamError: string;
    invalidCredentials: string;
    registerFailedButLoggedIn: string;
    nameLabel: string;
    emailLabel: string;
    passwordLabel: string;
    passwordHintLabel: string;
    loginButton: string;
    loginButtonLoading: string;
    registerButton: string;
    registerButtonLoading: string;
    or: string;
    steamLogin: string;
    steamRegister: string;
    noAccount: string;
    registerLink: string;
    haveAccount: string;
    loginLink: string;
  };
  players: {
    backHome: string;
    title: string;
    subtitle: string;
    placeholder: string;
    searchButton: string;
    screenshotBoxTitle: string;
    steps: string[];
    uploadButton: string;
    uploadButtonLoading: string;
    imageError: string;
    imageProcessError: string;
  };
  servers: {
    backHome: string;
    title: string;
    subtitle: string;
    placeholder: string;
    idle: string;
    loading: string;
    empty: string;
  };
}
