export function logDebug(
  message?: unknown,
  ...optionalParams: unknown[]
): void {
  console.debug(message, ...optionalParams);
}

export function logInfo(message?: unknown, ...optionalParams: unknown[]): void {
  console.info(message, ...optionalParams);
}

export function logWarn(message?: unknown, ...optionalParams: unknown[]): void {
  console.warn(message, ...optionalParams);
}

export function logError(
  message?: unknown,
  ...optionalParams: unknown[]
): void {
  console.error(message, ...optionalParams);
}
