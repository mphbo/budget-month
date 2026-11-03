export const getApiErrorMessage = async (
  response: Response,
  fallback: string,
) => {
  const body = await response.text();

  if (body) {
    try {
      const result: unknown = JSON.parse(body);
      if (
        typeof result === "object" &&
        result !== null &&
        "error" in result &&
        typeof result.error === "string"
      ) {
        return result.error;
      }
    } catch {
      // Fall back to the HTTP status when the server didn't return JSON.
    }
  }

  return `${fallback} (HTTP ${response.status}).`;
};

export const readApiJson = async <T>(
  response: Response,
  fallback: string,
): Promise<T> => {
  const body = await response.text();

  try {
    return JSON.parse(body) as T;
  } catch {
    throw new Error(`${fallback} (HTTP ${response.status}).`);
  }
};
