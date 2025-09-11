import { readFile } from "node:fs/promises";
import { useEffect } from "react";
import { useRevalidator } from "react-router";
import type { Route } from "./+types/shell";
import { validUUID } from "$lib/uuid";
import type { ShellOutput } from "$lib/shell";

export async function loader({ params }: Route.LoaderArgs) {
  if (!validUUID(params.session_id) || !validUUID(params.exec_id)) {
    return new Response("Invalid session or user ID", { status: 400 });
  }
  const data = await readFile(
    `./logs/${params.session_id}/${params.exec_id}.json`,
    {
      encoding: "utf-8",
    },
  );
  return JSON.parse(data) as ShellOutput;
}

export default function Shell({ loaderData }: Route.ComponentProps) {
  const data = loaderData as ShellOutput;
  const revalidator = useRevalidator();

  useEffect(() => {
    // Check if process is still running (exitCode not set or null)
    if (data.exitCode === undefined || data.exitCode === null) {
      const interval = setInterval(() => {
        revalidator.revalidate();
      }, 2000); // Refresh every 2 seconds

      return () => clearInterval(interval);
    }
  }, [data.exitCode, revalidator]);

  const formatOutput = () => {
    if (!data.journal?.logs) return [];

    const logs = data.journal.logs;
    let allData = "";
    const charToLogMap: (typeof logs)[0][] = [];

    // Build combined string and track which log each character came from
    for (const log of logs) {
      for (let i = 0; i < log.data.length; i++) {
        charToLogMap.push(log);
        allData += log.data[i];
      }
    }

    // Split by lines
    const lines = allData.split("\n");
    const result = [];
    let charIndex = 0;

    for (const line of lines) {
      if (line.trim() !== "" && charIndex < charToLogMap.length) {
        const firstLog = charToLogMap[charIndex];
        if (firstLog) {
          result.push({
            content: line,
            time: new Date(firstLog.time).toLocaleTimeString(),
            type: firstLog.type,
          });
        }
      }
      charIndex += line.length + 1; // +1 for the newline character
    }

    return result;
  };

  const outputLines = formatOutput();
  const firstLogTime = data.journal?.logs?.[0]
    ? new Date(data.journal.logs[0].time).toLocaleTimeString()
    : new Date().toLocaleTimeString();

  return (
    <div className="collapse-arrow collapse border border-base-300 bg-base-200">
      <input type="checkbox" className="collapse-checkbox" />
      <div className="collapse-title flex items-center gap-3 text-lg font-medium">
        <span className="font-mono text-sm text-base-content/70">
          {firstLogTime}
        </span>
        <span className="text-base-content">
          Executed{" "}
          <code className="rounded bg-base-300 px-2 py-1 font-mono text-sm">
            {data.command}
          </code>
        </span>
        <div
          className={`badge ${data.exitCode === 0 ? "badge-success" : "badge-error"} ml-auto badge-sm`}
        >
          {data.exitCode === 0 ? "Success" : `Failed (${data.exitCode})`}
        </div>
      </div>
      <div className="collapse-content">
        <div className="mockup-code overflow-auto bg-base-300 font-mono text-sm text-base-content">
          <div className="card-body p-4">
            <div className="stats mb-4 shadow">
              <div className="stat">
                <div className="stat-title">Command</div>
                <div className="stat-value font-mono text-sm">
                  {data.command}
                </div>
                {data.description && (
                  <div className="stat-desc">{data.description}</div>
                )}
              </div>
              <div className="stat">
                <div className="stat-title">Exit Code</div>
                <div
                  className={`stat-value ${data.exitCode === 0 ? "text-success" : "text-error"}`}
                >
                  {data.exitCode}
                </div>
                <div className="stat-desc">
                  {data.exitCode === 0 ? "Success" : "Failed"}
                </div>
              </div>
            </div>

            <div className="divider">Output</div>

            <div className="space-y-1">
              {outputLines.map((line, index) => (
                <div
                  key={index}
                  className="flex items-start gap-4 rounded px-2 py-1 hover:bg-base-200"
                >
                  <span className="w-20 shrink-0 font-mono text-xs text-base-content/60">
                    {line.time}
                  </span>
                  <div
                    className={`badge shrink-0 badge-sm ${
                      line.type === "stderr" ? "badge-error" : "badge-info"
                    }`}
                  >
                    {line.type}
                  </div>
                  <span
                    className={`flex-1 font-mono whitespace-pre-wrap ${
                      line.type === "stderr" ? "text-error" : "text-success"
                    }`}
                  >
                    {line.content}
                  </span>
                </div>
              ))}
            </div>

            {outputLines.length === 0 && (
              <div className="alert alert-info">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  className="h-6 w-6 shrink-0 stroke-current"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  ></path>
                </svg>
                <span>No output generated</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
