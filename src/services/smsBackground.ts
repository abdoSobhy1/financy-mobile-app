import { processIncomingSms } from "./smsService";

export default async (taskData: any) => {
  try {
    if (!taskData) return;
    await processIncomingSms({
      originatingAddress: taskData.originatingAddress,
      body: taskData.body,
      timestamp: taskData.timestamp,
    });
  } catch (e) {
    console.error("[SmsHeadlessTask] Error:", e);
  }
};
