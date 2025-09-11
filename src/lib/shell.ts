import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";

export type ShellOutput = {
  id: string;
  output: string;
  command?: string;
  timeout?: number;
  description?: string;
  journal?: {
    logs: Log[];
  };
  exitCode?: number;
};

type Log = {
  data: string;
  type: "stdout" | "stderr";
  time: number;
};

class Journal {
  readonly logs: Log[] = [];

  add(data: string, type: "stdout" | "stderr") {
    this.logs.push({
      data,
      type,
      time: Date.now(),
    });
  }

  toString() {
    return this.logs.map((log) => log.data).join("\n");
  }
}

export function save(sessionId: string, output: () => ShellOutput): () => void {
  const write = async () => {
    try {
      const data = output();
      await mkdir(`./logs/${sessionId}`, { recursive: true });
      await writeFile(
        `./logs/${sessionId}/${data.id}.json`,
        JSON.stringify(data, null, 2),
        "utf-8",
      );
    } catch (error) {
      console.error("Error saving output:", error);
    }
  };

  const close = setInterval(write, 1000);
  return () => {
    clearInterval(close);
    write();
  };
}

export default async function run(
  sessionId: string | undefined,
  command: string,
  opts: {
    timeout?: number;
    description?: string;
  },
): Promise<ShellOutput> {
  if (!sessionId) {
    throw new Error("No session ID provided");
  }

  const uuid = crypto.randomUUID();
  const out = new Journal();
  const timeoutMs = opts.timeout || 120000;
  const cmd = spawn(command, {
    shell: true,
    stdio: ["ignore", "pipe", "pipe"],
  });

  const result: ShellOutput = {
    id: uuid,
    output: "",
    command,
    timeout: timeoutMs,
    description: opts.description,
    journal: out,
  };

  const timeoutId = setTimeout(() => {
    cmd.kill();
    out.add("ERROR: Command timed out after " + timeoutMs + "ms", "stderr");
  }, timeoutMs);

  cmd.stdout.on("data", (data) => {
    out.add(data.toString(), "stdout");
  });

  cmd.stderr.on("data", (data) => {
    out.add(data.toString(), "stderr");
  });

  cmd.on("error", (err) => {
    out.add("ERROR: " + err.toString(), "stderr");
  });

  const closeSave = save(sessionId, () => result);

  try {
    const code = await new Promise((resolve: (code: number | null) => void) => {
      cmd.on("exit", resolve);
    });

    clearTimeout(timeoutId);

    if (code) {
      out.add("ERROR: Command exited with code " + code, "stderr");
    }

    result.exitCode = code === null ? -1 : code;
  } finally {
    result.output = out.toString();
    if (!result.exitCode) {
      result.exitCode = -1;
    }
    closeSave();
  }

  return result;
}
