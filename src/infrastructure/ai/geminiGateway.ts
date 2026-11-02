import { getFirebaseAuth } from "../firebase/client";
import { authService } from "../../features/auth/services/authService";

interface GatewayErrorBody {
  error?: string;
  message?: string;
  model?: string;
}

export class GeminiGatewayError extends Error {
  code: string;
  details?: { model?: string };

  constructor(message: string, code: string, details?: { model?: string }) {
    super(message);
    this.name = "GeminiGatewayError";
    this.code = code;
    this.details = details;
  }
}

async function callWorker<T>(body: object): Promise<T> {
  const endpoint = process.env.EXPO_PUBLIC_GEMINI_WORKER_URL?.trim();
  if (!endpoint) {
    throw new GeminiGatewayError(
      "Hosted Gemini is not configured. Add the Cloudflare Worker URL to the app environment.",
      "configuration/unavailable",
    );
  }

  let user = getFirebaseAuth().currentUser;
  if (!user) {
    user = await authService.ensureGuestFirebaseAuth();
  }
  if (!user) {
    throw new GeminiGatewayError(
      "Hosted Gemini needs Firebase Authentication. Enable Anonymous sign-in for guest access, or sign in to your account.",
      "unauthenticated",
    );
  }

  const token = await user.getIdToken();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 25000);
  let response: Response;
  try {
    response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (error) {
    if (controller.signal.aborted) {
      throw new GeminiGatewayError("Hosted Gemini timed out. Please retry.", "deadline-exceeded");
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
  const result = await response.json().catch(() => ({})) as GatewayErrorBody & T;

  if (!response.ok) {
    throw new GeminiGatewayError(
      result.message || "The hosted Gemini request failed.",
      result.error || "unavailable",
      result.model ? { model: result.model } : undefined,
    );
  }

  return result;
}

export function generateWithHostedGemini(model: string, contents: unknown[]) {
  return callWorker<{ text: string }>({ action: "generate", model, contents });
}

export function testHostedGeminiConnection(model: string) {
  return callWorker<{ success: boolean; message: string }>({ action: "test", model });
}
