import "dotenv/config";
import fs from "node:fs/promises";
import path from "node:path";
import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

const OUTPUT_DIR = path.resolve("output");
const GROQ_BASE_URL = "https://api.groq.com/openai/v1/chat/completions";

const tools = {
  async createFolder(folderPath = "") {
    const safePath = resolveInsideProject(folderPath || "output");
    await fs.mkdir(safePath, { recursive: true });
    return `Created folder: ${path.relative(process.cwd(), safePath)}`;
  },

  async writeFile(args = {}) {
    const parsedArgs = typeof args === "string" ? JSON.parse(args) : args;
    const safePath = resolveInsideProject(parsedArgs.filePath);
    await fs.mkdir(path.dirname(safePath), { recursive: true });
    await fs.writeFile(safePath, parsedArgs.content, "utf8");
    return `Wrote file: ${path.relative(process.cwd(), safePath)}`;
  },

  async readFile(filePath = "") {
    const safePath = resolveInsideProject(filePath);
    return await fs.readFile(safePath, "utf8");
  },

  async listFiles(folderPath = "output") {
    const safePath = resolveInsideProject(folderPath);
    const entries = await fs.readdir(safePath, { withFileTypes: true });
    return entries
      .map((entry) => `${entry.isDirectory() ? "folder" : "file"}: ${entry.name}`)
      .join("\n");
  },
};

function resolveInsideProject(targetPath = "") {
  const resolved = path.resolve(targetPath);

  if (!resolved.startsWith(process.cwd())) {
    throw new Error(`Blocked path outside project: ${targetPath}`);
  }

  return resolved;
}

function getSystemPrompt() {
  return `
You are a terminal-based AI coding agent.

You must follow this exact JSON format for every response:
{
  "step": "START | THINK | TOOL | OBSERVE | OUTPUT",
  "content": "short text",
  "tool_name": "tool name when step is TOOL",
  "tool_args": "string or JSON object when step is TOOL"
}

Rules:
1. Do one step at a time.
2. Use multiple THINK steps before creating the final OUTPUT.
3. OBSERVE messages are supplied by the CLI after tools run. Do not create OBSERVE as the assistant.
4. For TOOL steps, use only these tools:
   - createFolder(folderPath: string)
   - writeFile({ "filePath": string, "content": string })
   - readFile(filePath: string)
   - listFiles(folderPath: string)
5. After a TOOL step, wait for the OBSERVE message before continuing.
6. When asked to clone the Scaler Academy website, create these exact files:
   - output/index.html
   - output/style.css
   - output/script.js
7. The generated website must include:
   - Header/navigation with logo text, menu links, and CTA buttons
   - Hero section with a Scaler-like headline, supporting text, lead form/card, and stats
   - Additional trust/course highlight blocks if they make the page look more complete
   - Footer with grouped links and contact/social text
   - HTML, CSS, and JavaScript
8. The page should visually resemble Scaler Academy without copying protected assets exactly. Use a clean education-tech layout, deep blue accents, white cards, green/orange CTA accents, strong spacing, and responsive sections.
9. Do not create a tiny placeholder page. The HTML should be substantial, the CSS should be polished and responsive, and the JS should add at least one useful interaction such as mobile navigation, form feedback, tabs, or FAQ toggles.
10. Final OUTPUT must mention the generated file paths and how to open the HTML file.
`;
}

function printAgentMessage(parsed) {
  const label = {
    START: "Starting",
    THINK: "Thinking",
    TOOL: "Tool",
    OBSERVE: "Observe",
    OUTPUT: "Output",
  }[parsed.step] || parsed.step;

  console.log(`\n[${label}] ${parsed.content || ""}`);

  if (parsed.step === "TOOL") {
    console.log(`Calling: ${parsed.tool_name}`);
  }
}

async function runAgent(userInstruction) {
  const messages = [
    { role: "system", content: getSystemPrompt() },
    { role: "user", content: userInstruction },
  ];

  while (true) {
    const response = await callGroq({
      model: process.env.GROQ_MODEL || "llama-3.3-70b-versatile",
      messages,
      temperature: 0.2,
      response_format: { type: "json_object" },
    });

    const content = response.choices[0]?.message?.content || "{}";
    const parsedContent = JSON.parse(content);
    messages.push({ role: "assistant", content: JSON.stringify(parsedContent) });
    printAgentMessage(parsedContent);

    if (parsedContent.step === "TOOL") {
      const tool = tools[parsedContent.tool_name];

      if (!tool) {
        const observation = {
          step: "OBSERVE",
          content: `Tool not available: ${parsedContent.tool_name}`,
        };
        messages.push({ role: "developer", content: JSON.stringify(observation) });
        printAgentMessage(observation);
        continue;
      }

      try {
        const result = await tool(parsedContent.tool_args);
        const observation = { step: "OBSERVE", content: result };
        messages.push({ role: "developer", content: JSON.stringify(observation) });
        printAgentMessage(observation);
      } catch (error) {
        const observation = {
          step: "OBSERVE",
          content: `Tool failed: ${error.message}`,
        };
        messages.push({ role: "developer", content: JSON.stringify(observation) });
        printAgentMessage(observation);
      }
    }

    if (parsedContent.step === "OUTPUT") {
      break;
    }
  }
}

async function callGroq(body) {
  const response = await fetch(GROQ_BASE_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const data = await response.json();

  if (!response.ok) {
    const message = data?.error?.message || `Groq request failed with status ${response.status}`;
    throw new Error(message);
  }

  return data;
}

async function main() {
  if (!process.env.GROQ_API_KEY) {
    console.error("Missing GROQ_API_KEY. Add it to .env first.");
    process.exit(1);
  }

  await fs.mkdir(OUTPUT_DIR, { recursive: true });

  const rl = readline.createInterface({ input, output });

  console.log("AI Agent CLI Tool");
  console.log("Type a task, or type exit to quit.");
  console.log("Try: Clone the Scaler Academy website with header, hero, footer, HTML, CSS and JS.\n");

  while (true) {
    const answer = await rl.question("You> ");
    const instruction = answer.trim();

    if (!instruction) {
      continue;
    }

    if (["exit", "quit"].includes(instruction.toLowerCase())) {
      break;
    }

    await runAgent(instruction);
    console.log("\nReady for the next instruction.\n");
  }

  rl.close();
}

main().catch((error) => {
  console.error("Agent crashed:", error.message);
  process.exit(1);
});
