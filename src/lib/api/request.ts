/** Limits parallel API calls so rapid reloads do not burst the server. */
const MAX_CONCURRENT = 2;

let inFlight = 0;
const waitQueue: Array<() => void> = [];

function acquireSlot(): Promise<void> {
  if (inFlight < MAX_CONCURRENT) {
    inFlight++;
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    waitQueue.push(() => {
      inFlight++;
      resolve();
    });
  });
}

function releaseSlot(): void {
  inFlight--;
  const next = waitQueue.shift();
  if (next) {
    next();
  }
}

function retryDelayMs(response: Response, attempt: number): number {
  const retryAfter = Number(response.headers.get("Retry-After"));
  if (Number.isFinite(retryAfter) && retryAfter > 0) {
    return Math.min(retryAfter * 1000, 5000);
  }

  return Math.min(500 * (attempt + 1), 2000);
}

/** Shared fetch: queues requests and retries briefly on HTTP 429. */
export async function apiRequest(
  url: string,
  init: RequestInit,
): Promise<Response> {
  await acquireSlot();

  try {
    for (let attempt = 0; ; attempt++) {
      const response = await fetch(url, init);

      if (response.status !== 429 || attempt >= 2) {
        return response;
      }

      await new Promise((resolve) => setTimeout(resolve, retryDelayMs(response, attempt)));
    }
  } finally {
    releaseSlot();
  }
}
