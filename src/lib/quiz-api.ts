"use client";
import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { makeFunctionReference } from "convex/server";
import type { FunctionArgs } from "convex/server";
import { getQuizClient, quizConfigurationError } from "./quiz-client";
import type { QuizQueries } from "./quiz-contracts";
const KEY = "tongclass_quiz_session_v1";
const EVENT = "tongclass-quiz-auth";
const subscribe = (cb: () => void) => {
  window.addEventListener("storage", cb);
  window.addEventListener(EVENT, cb);
  return () => {
    window.removeEventListener("storage", cb);
    window.removeEventListener(EVENT, cb);
  };
};
const quizToken = () => window.localStorage.getItem(KEY) || "";
export function useQuizToken() {
  return useSyncExternalStore(subscribe, quizToken, () => "");
}
function store(token: string) {
  if (token) localStorage.setItem(KEY, token);
  else localStorage.removeItem(KEY);
  window.dispatchEvent(new Event(EVENT));
}
export { quizConfigurationError };
// A dedicated client is used explicitly, never the main site's ambient provider.
export function useQuizQuery<K extends keyof QuizQueries>(
  name: K,
  args: Record<string, string | number | object> = {},
  enabled = true,
) {
  const token = useQuizToken();
  const key = JSON.stringify({ ...args, token });
  const [state, setState] = useState<{
    key: string;
    data?: QuizQueries[K];
    error?: string;
  }>({ key: "" });
  useEffect(() => {
    if (!token || !enabled) return;
    try {
      return getQuizClient().onUpdate(
        makeFunctionReference<"query", Record<string, never>, QuizQueries[K]>(
          name,
        ),
        JSON.parse(key),
        (data) => setState({ key, data }),
        (error) => setState({ key, error: error.message }),
      );
    } catch (error) {
      setState({
        key,
        error: error instanceof Error ? error.message : "加载失败",
      });
    }
  }, [key, name, token, enabled]);
  return {
    data: token && enabled && state.key === key ? state.data : undefined,
    error: state.key === key ? state.error : undefined,
  };
}
export function useQuizCommands() {
  return useCallback(
    async <T>(
      name: string,
      args: Record<string, unknown> = {},
      kind: "mutation" | "action" = "mutation",
    ): Promise<T> => {
      const client = getQuizClient();
      const ref = makeFunctionReference<typeof kind>(name);
      const payload = { ...args, token: quizToken() } as FunctionArgs<
        typeof ref
      >;
      return (
        kind === "action"
          ? client.action(makeFunctionReference<"action">(name), payload)
          : client.mutation(makeFunctionReference<"mutation">(name), payload)
      ) as Promise<T>;
    },
    [],
  );
}
export function useQuizLogin() {
  return useCallback(
    async (input: { studentId: string; password: string; code?: string }) => {
      const name = input.code === undefined ? "auth:login" : "auth:activate";
      const result = await getQuizClient().action(
        makeFunctionReference<"action", typeof input, { token: string }>(name),
        input,
      );
      store(result.token);
    },
    [],
  );
}
export function useQuizLogout() {
  return useCallback(async () => {
    const token = quizToken();
    try {
      if (token)
        await getQuizClient().mutation(
          makeFunctionReference<"mutation">("learning:logout"),
          { token },
        );
    } finally {
      store("");
    }
  }, []);
}

export function useQuizChangePassword() {
  return useCallback(
    async (input: { currentPassword: string; newPassword: string }) => {
      const result = await getQuizClient().action(
        makeFunctionReference<
          "action",
          typeof input & { token: string },
          { token: string }
        >("auth:changePassword"),
        { ...input, token: quizToken() },
      );
      store(result.token);
    },
    [],
  );
}
