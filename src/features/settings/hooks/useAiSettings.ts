import { useEffect, useState } from "react";
import {
  AIConfig,
  AIProvider,
  getAIConfigStatus,
  saveAIConfig,
  testAIConnection,
} from "../../../infrastructure/ai/aiConfigService";
import {
  GEMINI_FALLBACK_MODELS,
  GEMINI_MODEL_METADATA,
  GeminiDailyUsage,
  getDailyGeminiUsage,
  resetDailyGeminiUsage,
} from "../../../infrastructure/ai/geminiQuotaService";
import { useIsOwner } from "../../auth/hooks/useIsOwner";
import { useToast } from "../../../shared/ui";

export function useAiSettings() {
  const { showSuccess, showError } = useToast();
  const isOwner = useIsOwner();
  const [showAiModal, setShowAiModal] = useState(false);
  const [aiKeyInput, setAiKeyInput] = useState("");
  const [selectedAiProvider, setSelectedAiProvider] = useState<AIProvider>("gemini");
  const [isTestingAi, setIsTestingAi] = useState(false);
  const [showAiKeySecret, setShowAiKeySecret] = useState(false);
  const [aiStatus, setAiStatus] = useState<{
    provider: AIProvider;
    hasCustomKey: boolean;
    hasHostedKey: boolean;
    activeModel: string;
    isFallbackModel?: boolean;
    availableGeminiModelsCount?: number;
    totalGeminiModelsCount?: number;
    rateLimitedModels?: string[];
  }>({
    provider: "gemini",
    hasCustomKey: false,
    hasHostedKey: Boolean(process.env.EXPO_PUBLIC_GEMINI_WORKER_URL?.trim()),
    activeModel: "gemini-3.6-flash",
  });
  const [geminiUsage, setGeminiUsage] = useState<GeminiDailyUsage | null>(null);
  const [showModelChain, setShowModelChain] = useState(false);

  const refreshAiStatus = async () => {
    const status = await getAIConfigStatus();
    setSelectedAiProvider(status.provider);
    setAiStatus(status);
    const usage = await getDailyGeminiUsage();
    setGeminiUsage(usage);
  };

  useEffect(() => {
    refreshAiStatus().then(() => {
      setAiKeyInput("");
    });
  }, []);

  const handleOpenAiSettings = async () => {
    setAiKeyInput("");
    setShowAiKeySecret(false);
    await refreshAiStatus();
    setShowAiModal(true);
  };

  const handleSaveAiConfig = async () => {
    const trimmed = aiKeyInput.trim();
    if (!trimmed) {
      showError("Please enter an API key to save");
      return;
    }
    const updated: AIConfig = {
      provider: selectedAiProvider,
      apiKey: trimmed,
      model: selectedAiProvider === "gemini" ? "gemini-3.6-flash" : undefined,
    };
    await saveAIConfig(updated);
    await refreshAiStatus();
    setAiKeyInput("");
    setShowAiKeySecret(false);
    setShowAiModal(false);
    showSuccess("AI configuration saved!");
  };

  const handleTestAi = async () => {
    setIsTestingAi(true);
    const res = await testAIConnection({
      provider: selectedAiProvider,
      apiKey: aiKeyInput.trim(),
    });
    setIsTestingAi(false);
    await refreshAiStatus();
    if (res.success) {
      showSuccess(res.message);
    } else {
      showError(res.message);
    }
  };

  const handleResetGeminiQuota = async () => {
    await resetDailyGeminiUsage();
    await refreshAiStatus();
    showSuccess("Today's model quota flags have been reset!");
  };

  return {
    isOwner,
    showAiModal,
    setShowAiModal,
    aiKeyInput,
    setAiKeyInput,
    selectedAiProvider,
    setSelectedAiProvider,
    isTestingAi,
    showAiKeySecret,
    setShowAiKeySecret,
    aiStatus,
    geminiUsage,
    geminiFallbackModels: GEMINI_FALLBACK_MODELS,
    geminiModelMetadata: GEMINI_MODEL_METADATA,
    showModelChain,
    setShowModelChain,
    handleOpenAiSettings,
    handleSaveAiConfig,
    handleTestAi,
    handleResetGeminiQuota,
  };
}
