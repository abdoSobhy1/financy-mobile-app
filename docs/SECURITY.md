# API key handling

Expo replaces statically referenced `EXPO_PUBLIC_*` values with literal values in the client JavaScript bundle. Do not put Gemini, Groq, OpenAI, or other provider secrets in those variables or in app source. Keep only client configuration and public service URLs there. See [Expo's environment variable guidance](https://docs.expo.dev/guides/environment-variables/).

## Hosted Gemini

The shared Gemini key is stored as a Cloudflare Worker secret. The mobile app sends requests to the Worker with the signed-in user's Firebase ID token; the Worker validates the token against the configured Firebase project before forwarding an allowlisted request to Gemini. It validates request sizes and uses a D1 database to apply a 25-request daily limit per user and a 500-request shared daily limit. Personal AI keys entered in Settings remain user controlled and are stored in Expo SecureStore on the device.

Set up the Worker from the repository root:

```sh
cd workers/gemini
npm install
npx wrangler login
npx wrangler d1 create financy-ai-usage
```

Copy the `database_id` printed by Wrangler into `workers/gemini/wrangler.jsonc`, then create the remote usage table, add the provider key, and deploy:

```sh
npm run db:migrate:remote
npx wrangler secret put GEMINI_API_KEY
npm run deploy
```

In the root `.env`, set `EXPO_PUBLIC_GEMINI_WORKER_URL` to the Worker URL printed by deployment (usually `https://financy-gemini-gateway.<your-subdomain>.workers.dev`). Keep the Firebase project ID in the Worker configuration aligned with the app's Firebase project. Rebuild/restart the app after changing its environment.

Never put `GEMINI_API_KEY` in `.env`, a client build environment, `wrangler.jsonc`, or an `EXPO_PUBLIC_*` variable.

## Existing installations

Older application builds included `EXPO_PUBLIC_GEMINI_API_KEY` in their JavaScript bundle. Rotate that key in Google AI Studio if any such build was distributed. The app migrates previously saved personal provider keys from AsyncStorage to SecureStore the next time it reads them; after migration, the AsyncStorage record contains only provider and model metadata.

Firebase client API keys are project identifiers, not authorization secrets. Restrict them to Firebase APIs and protect data with Firebase Authentication, Security Rules, and App Check as appropriate. Never use a Firebase client key as a Gemini key.
