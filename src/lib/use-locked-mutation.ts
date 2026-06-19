import {
  useMutation,
  type UseMutationOptions,
  type UseMutationResult,
} from "@tanstack/react-query";
import { useCallback, useRef, useState } from "react";

class ActionInProgressError extends Error {
  constructor() {
    super("Action already in progress");
    this.name = "ActionInProgressError";
  }
}

export function isActionInProgressError(error: unknown): boolean {
  return error instanceof ActionInProgressError;
}

export type LockedMutationResult<
  TData = unknown,
  TError = Error,
  TVariables = void,
  TContext = unknown,
> = UseMutationResult<TData, TError, TVariables, TContext> & {
  isLocked: boolean;
};

export function useLockedMutation<
  TData = unknown,
  TError = Error,
  TVariables = void,
  TContext = unknown,
>(
  options: UseMutationOptions<TData, TError, TVariables, TContext>,
): LockedMutationResult<TData, TError, TVariables, TContext> {
  const inFlightRef = useRef(false);
  const [isLocked, setIsLocked] = useState(false);
  const { mutationFn, onError, ...rest } = options;

  const acquireLock = useCallback(() => {
    if (inFlightRef.current) {
      return false;
    }

    inFlightRef.current = true;
    setIsLocked(true);
    return true;
  }, []);

  const releaseLock = useCallback(() => {
    inFlightRef.current = false;
    setIsLocked(false);
  }, []);

  const mutation = useMutation({
    ...rest,
    onError: (error, variables, onMutateResult, context) => {
      if (isActionInProgressError(error)) {
        return;
      }
      onError?.(error, variables, onMutateResult, context);
    },
    mutationFn: async (variables, context) => {
      if (!mutationFn) {
        throw new Error("mutationFn is required");
      }

      return mutationFn(variables, context);
    },
  });

  type Mutate = UseMutationResult<TData, TError, TVariables, TContext>["mutate"];
  type MutateAsync = UseMutationResult<TData, TError, TVariables, TContext>["mutateAsync"];
  type MutateOptions = Parameters<Mutate>[1];

  const guardedMutate = useCallback<Mutate>(
    (variables, options) => {
      if (!acquireLock()) {
        return;
      }

      const userOnSettled = options?.onSettled;
      mutation.mutate(variables, {
        ...options,
        onSettled: (data, error, variablesArg, context, mutationMeta) => {
          releaseLock();
          userOnSettled?.(data, error, variablesArg, context, mutationMeta);
        },
      });
    },
    [acquireLock, mutation, releaseLock],
  );

  const guardedMutateAsync = useCallback<MutateAsync>(
    async (variables, options) => {
      if (!acquireLock()) {
        return undefined as unknown as TData;
      }

      try {
        return await mutation.mutateAsync(variables, options);
      } catch (error) {
        if (isActionInProgressError(error)) {
          return undefined as unknown as TData;
        }
        throw error;
      } finally {
        releaseLock();
      }
    },
    [acquireLock, mutation, releaseLock],
  );

  return {
    ...mutation,
    isLocked,
    mutate: guardedMutate,
    mutateAsync: guardedMutateAsync,
  };
}
