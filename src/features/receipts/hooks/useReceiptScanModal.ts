import { useState, useEffect } from "react";
import { Alert } from "react-native";

import { OCRService, OcrReceiptResult, DocumentAsset } from "../services/ocrService";
import { getOcrQuotaStatus, subscribeOcrQuota, OcrQuotaStatus } from "../services/ocrRateLimitService";
import { Category } from "../../../shared/types";
interface ReceiptScanModalProps {
  visible: boolean;
  onClose: () => void;
  categories: Record<string, Category>;
  onScanComplete: (result: OcrReceiptResult, assetUri: string) => void;
}
export function useReceiptScanModal({
  visible,
  onClose,
  categories,
  onScanComplete,
}: ReceiptScanModalProps) {

  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState("Analyzing receipt...");
  const [quota, setQuota] = useState<OcrQuotaStatus | null>(null);

  useEffect(() => {
    const unsubscribe = subscribeOcrQuota((latest) => {
      setQuota(latest);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (visible) {
      // Non-blocking fast check + background cloud refresh
      getOcrQuotaStatus({ fast: true })
        .then(setQuota)
        .catch(() => { });
    }
  }, [visible]);

  const processAsset = async (asset: DocumentAsset) => {
    try {
      setIsProcessing(true);
      setStatusMessage("Extracting receipt data...");
      const result = await OCRService.scanReceiptFile(asset, categories);
      getOcrQuotaStatus({ fast: true })
        .then(setQuota)
        .catch(() => { });
      setIsProcessing(false);
      onClose();
      onScanComplete(result, asset.uri);
    } catch (err: any) {
      setIsProcessing(false);
      Alert.alert(
        "Scanning Failed",
        err?.message || "Failed to parse receipt. Please try another image or angle."
      );
    }
  };

  const handleDocumentScanner = async () => {
    try {
      setIsProcessing(true);
      setStatusMessage("Opening camera document scanner...");
      const uri = await OCRService.scanReceiptWithScanner();
      if (!uri) {
        setIsProcessing(false);
        return;
      }
      await processAsset({
        uri,
        name: "scanned_receipt.jpg",
        mimeType: "image/jpeg",
      });
    } catch (e: any) {
      setIsProcessing(false);
      Alert.alert("Scanner Error", e?.message || "Unable to open document scanner.");
    }
  };

  const handleGalleryPick = async () => {
    try {
      setIsProcessing(true);
      setStatusMessage("Selecting image...");
      const uri = await OCRService.pickReceiptFromGallery();
      if (!uri) {
        setIsProcessing(false);
        return;
      }
      await processAsset({
        uri,
        name: "gallery_receipt.jpg",
        mimeType: "image/jpeg",
      });
    } catch (e: any) {
      setIsProcessing(false);
      Alert.alert("Gallery Error", e?.message || "Unable to pick image.");
    }
  };

  const handleDocumentPick = async () => {
    try {
      setIsProcessing(true);
      setStatusMessage("Selecting document...");
      const asset = await OCRService.pickReceiptDocument();
      if (!asset) {
        setIsProcessing(false);
        return;
      }
      await processAsset(asset);
    } catch (e: any) {
      setIsProcessing(false);
      Alert.alert("Document Error", e?.message || "Unable to select document.");
    }
  };
  return { isProcessing, statusMessage, quota, handleDocumentScanner, handleGalleryPick, handleDocumentPick };
}
