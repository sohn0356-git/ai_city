const keys = ['VITE_FIREBASE_API_KEY', 'VITE_FIREBASE_AUTH_DOMAIN', 'VITE_FIREBASE_PROJECT_ID', 'VITE_FIREBASE_STORAGE_BUCKET', 'VITE_FIREBASE_MESSAGING_SENDER_ID', 'VITE_FIREBASE_APP_ID'];
// Local builds may use .env.local, which Vite loads. CI must receive every value from the Environment.
if (process.env.CI) {
  const missing = keys.filter((key) => !process.env[key]?.trim());
  if (missing.length) {
    console.error(`Missing Firebase environment variables: ${missing.join(', ')}. Set these in the ai_city GitHub Environment as Variables or Secrets.`);
    process.exit(1);
  }
}
