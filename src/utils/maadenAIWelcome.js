export const MAADEN_AI_WELCOME_STORAGE_KEY = 'maaden-ai-welcome-shown-for-login'

export function resetMaadenAIWelcome() {
  localStorage.removeItem(MAADEN_AI_WELCOME_STORAGE_KEY)
}
