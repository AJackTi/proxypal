import { createSignal, Show } from "solid-js";
import { Button } from "./ui";

interface ApiEndpointProps {
  endpoint: string;
  lanEndpoint?: string;
  running: boolean;
}

function CopyButton(props: { copied: boolean; onClick: () => void }) {
  return (
    <Button onClick={props.onClick} size="sm" variant="secondary">
      {props.copied ? (
        <svg class="h-4 w-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            d="M5 13l4 4L19 7"
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
          />
        </svg>
      ) : (
        <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
          />
        </svg>
      )}
    </Button>
  );
}

export function ApiEndpoint(props: ApiEndpointProps) {
  const [copied, setCopied] = createSignal<"local" | "lan" | null>(null);

  const copyToClipboard = async (value: string, which: "local" | "lan") => {
    await navigator.clipboard.writeText(value);
    setCopied(which);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div class="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/50">
      <div class="mb-2 flex items-center justify-between">
        <span class="text-sm font-medium text-gray-600 dark:text-gray-400">API Endpoint</span>
        <span
          class={`rounded-full px-2 py-0.5 text-xs ${
            props.running
              ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
              : "bg-gray-200 text-gray-500 dark:bg-gray-700"
          }`}
        >
          {props.running ? "Active" : "Inactive"}
        </span>
      </div>

      <div class="flex items-center gap-2">
        <code class="flex-1 rounded-lg border border-gray-200 bg-white px-3 py-2 font-mono text-sm text-gray-800 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200">
          {props.endpoint}
        </code>
        <CopyButton
          copied={copied() === "local"}
          onClick={() => copyToClipboard(props.endpoint, "local")}
        />
      </div>

      <Show when={props.lanEndpoint}>
        {(lan) => (
          <>
            <div class="mt-2 flex items-center gap-2">
              <code class="flex-1 rounded-lg border border-gray-200 bg-white px-3 py-2 font-mono text-sm text-gray-800 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200">
                {lan()}
              </code>
              <CopyButton
                copied={copied() === "lan"}
                onClick={() => copyToClipboard(lan(), "lan")}
              />
            </div>
            <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Reachable from other devices on your network — the proxy is bound to all interfaces
            </p>
          </>
        )}
      </Show>

      <p class="mt-2 text-xs text-gray-500 dark:text-gray-400">
        Use this endpoint in Cursor, Cline, Continue, or any OpenAI-compatible client
      </p>
    </div>
  );
}
