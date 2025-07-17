// Translation key types for type safety
export type TranslationKey = 
  // Auth translations
  | 'auth.login.title'
  | 'auth.login.subtitle'
  | 'auth.login.email'
  | 'auth.login.emailPlaceholder'
  | 'auth.login.password'
  | 'auth.login.passwordPlaceholder'
  | 'auth.login.confirmPassword'
  | 'auth.login.confirmPasswordPlaceholder'
  | 'auth.login.loginButton'
  | 'auth.login.signupButton'
  | 'auth.login.loading'
  | 'auth.login.googleLogin'
  | 'auth.login.toggleToSignup'
  | 'auth.login.toggleToLogin'
  | 'auth.signup.title'
  | 'auth.signup.subtitle'
  | 'auth.errors.loginFailed'
  | 'auth.errors.signupFailed'
  | 'auth.errors.emailRequired'
  | 'auth.errors.passwordRequired'
  | 'auth.errors.passwordMismatch'
  
  // Admin translations
  | 'admin.access.title'
  | 'admin.access.adminPassword'
  | 'admin.access.adminPasswordPlaceholder'
  | 'admin.access.enterPassword'
  | 'admin.access.accessPanel'
  | 'admin.dashboard.title'
  | 'admin.dashboard.subtitle'
  | 'admin.videos.searchPlaceholder'
  | 'admin.errors.sessionExpired'
  | 'admin.errors.accessDenied'
  | 'admin.errors.invalidPassword'
  
  // Profile translations
  | 'profile.setup.step1.title'
  | 'profile.setup.step1.subtitle'
  | 'profile.setup.step1.firstName'
  | 'profile.setup.step1.firstNamePlaceholder'
  | 'profile.setup.step1.lastName'
  | 'profile.setup.step1.lastNamePlaceholder'
  | 'profile.setup.step1.continue'
  | 'profile.setup.step2.title'
  | 'profile.setup.step2.personalMessagePlaceholder'
  | 'profile.edit.title'
  | 'profile.edit.taglinePlaceholder'
  
  // Video translations
  | 'video.record.title'
  | 'video.record.subtitle'
  | 'video.record.startRecording'
  | 'video.record.stopRecording'
  | 'video.details.titlePlaceholder'
  | 'video.details.descriptionPlaceholder'
  | 'video.recorder.preparing'
  | 'video.success.title'
  
  // Library translations
  | 'library.title'
  | 'library.searchPlaceholder'
  
  // Contacts translations
  | 'contacts.title'
  | 'contacts.form.namePlaceholder'
  | 'contacts.form.emailPlaceholder'
  | 'contacts.form.phonePlaceholder'
  
  // Navigation translations
  | 'navigation.home'
  | 'navigation.record'
  | 'navigation.library'
  | 'navigation.contacts'
  | 'navigation.profile'
  | 'navigation.admin'
  
  // Common translations
  | 'common.loading'
  | 'common.save'
  | 'common.cancel'
  | 'common.delete'
  | 'common.edit'
  | 'common.close'
  | 'common.continue'
  | 'common.back'
  | 'common.search'
  
  // Permissions
  | 'permissions.camera.title'
  | 'permissions.camera.grant'
  | 'permissions.camera.skipForNow'
  
  // First video
  | 'firstVideo.title'
  | 'firstVideo.captureFirst'
  | 'firstVideo.skipForNow'
  | 'firstVideo.preparing';

// Helper type for translation function
export interface UseTranslation {
  t: (key: TranslationKey, options?: any) => string;
  i18n: {
    changeLanguage: (lng: string) => Promise<any>;
    language: string;
  };
} 