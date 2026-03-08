/**
 * Legacy data API stub  -  the Manus Forge data proxy is no longer available.
 * This module is kept to avoid import errors. Replace with direct API calls
 * to individual services (YouTube Data API, etc.) if needed.
 */

export type DataApiCallOptions = {
  query?: Record<string, unknown>;
  body?: Record<string, unknown>;
  pathParams?: Record<string, unknown>;
  formData?: Record<string, unknown>;
};

export async function callDataApi(
  _apiId: string,
  _options: DataApiCallOptions = {}
): Promise<unknown> {
  throw new Error(
    "callDataApi is not available. Migrate to direct third-party API calls."
  );
}
