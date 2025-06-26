export type Result<T, E = Error> = {
  success: true
  data: T
} | {
  success: false
  error: E
}

export async function tryCatch<T>(
  promise: Promise<T>
): Promise<Result<T, Error>> {
  try {
    const data = await promise
    return { success: true, data }
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error : new Error(String(error)) 
    }
  }
}

export function tryCatchSync<T>(
  fn: () => T
): Result<T, Error> {
  try {
    const data = fn()
    return { success: true, data }
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error : new Error(String(error)) 
    }
  }
}

export function isError<T>(result: Result<T>): result is { success: false; error: Error } {
  return !result.success
}

export function isSuccess<T>(result: Result<T>): result is { success: true; data: T } {
  return result.success
} 