import * as core from '@actions/core';

export interface TelemetryPayload {
  repository: string;
  leakSummary: Record<string, number>;
  totalLeaks: number;
  timestamp: string;
}

export async function reportMetrics(
  apiKey: string,
  repository: string,
  leakSummary: Record<string, number>,
  totalLeaks: number,
): Promise<void> {
  if (!apiKey) {
    return;
  }

  const endpoint = 'https://nexus-shield-five.vercel.app/api/v1/telemetry';
  const payload: TelemetryPayload = {
    repository,
    leakSummary,
    totalLeaks,
    timestamp: new Date().toISOString(),
  };

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-nexus-api-key': apiKey,
      },
      body: JSON.stringify(payload),
    });

    if (response.ok) {
      core.info('📊 Anonymous telemetry stats successfully reported to Nexus Shield Dashboard.');
    } else {
      core.warning(`⚠️ Telemetry endpoint returned status: ${response.status}`);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    core.warning(`⚠️ Non-blocking warning: Failed to send Nexus Shield telemetry - ${message}`);
  }
}
