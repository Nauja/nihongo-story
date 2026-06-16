import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Toast, ToastContainer } from "react-bootstrap";
import { useLocation, useNavigate } from "react-router-dom";
import type { GenerateParams } from "../types";
import { generateStory } from "./generation";
import { saveStory } from "./storage";

type GenerationStatus = "idle" | "generating" | "done" | "error";

interface GenerationContextValue {
  status: GenerationStatus;
  error: string | null;
  lastStoryId: string | null;
  startGeneration: (params: GenerateParams) => void;
  cancelGeneration: () => void;
  clearStatus: () => void;
}

const GenerationContext = createContext<GenerationContextValue | null>(null);

export function GenerationProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<GenerationStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [lastStoryId, setLastStoryId] = useState<string | null>(null);
  const controllerRef = useRef<AbortController | null>(null);
  const navigate = useNavigate();
  const location = useLocation();

  const clearStatus = useCallback(() => {
    setStatus("idle");
    setError(null);
  }, []);

  const startGeneration = useCallback(
    (params: GenerateParams) => {
      // Only one generation in flight at a time.
      if (controllerRef.current) return;

      const controller = new AbortController();
      controllerRef.current = controller;
      setError(null);
      setStatus("generating");

      // Capture the page the user started from so we only auto-navigate when
      // they stayed on Generate; otherwise we surface a toast instead.
      const startedOnGenerate = location.pathname === "/generate";

      generateStory(params, controller.signal)
        .then((story) => {
          if (controller.signal.aborted) return;
          saveStory(story);
          setLastStoryId(story.id);
          if (startedOnGenerate && location.pathname === "/generate") {
            setStatus("idle");
            navigate(`/story/${story.id}`);
          } else {
            setStatus("done");
          }
        })
        .catch((err: unknown) => {
          if (controller.signal.aborted) return;
          setError(
            err instanceof Error
              ? err.message
              : "Generation failed. Please try again.",
          );
          setStatus("error");
        })
        .finally(() => {
          if (controllerRef.current === controller) {
            controllerRef.current = null;
          }
        });
    },
    [location.pathname, navigate],
  );

  const cancelGeneration = useCallback(() => {
    controllerRef.current?.abort();
    controllerRef.current = null;
    setStatus("idle");
    setError(null);
  }, []);

  return (
    <GenerationContext.Provider
      value={{
        status,
        error,
        lastStoryId,
        startGeneration,
        cancelGeneration,
        clearStatus,
      }}
    >
      {children}
      <ToastContainer
        position="bottom-end"
        className="p-3"
        style={{ zIndex: 1100 }}
      >
        <Toast
          show={status === "done" && lastStoryId != null}
          onClose={clearStatus}
          bg="dark"
          role="button"
          onClick={() => {
            clearStatus();
            if (lastStoryId) navigate(`/story/${lastStoryId}`);
          }}
        >
          <Toast.Header closeButton>
            <span className="me-auto fw-semibold">✨ Story ready</span>
          </Toast.Header>
          <Toast.Body>Your story is ready — tap to read it →</Toast.Body>
        </Toast>

        <Toast
          show={status === "error" && location.pathname !== "/generate"}
          onClose={clearStatus}
          bg="danger"
          delay={8000}
          autohide
        >
          <Toast.Header closeButton>
            <span className="me-auto fw-semibold">Generation failed</span>
          </Toast.Header>
          <Toast.Body className="text-white">
            {error ?? "Please try again."}
          </Toast.Body>
        </Toast>
      </ToastContainer>
    </GenerationContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useGeneration(): GenerationContextValue {
  const ctx = useContext(GenerationContext);
  if (!ctx) {
    throw new Error("useGeneration must be used within a GenerationProvider");
  }
  return ctx;
}
