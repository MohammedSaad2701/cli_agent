# Assignment 02 - AI Agent CLI Tool

A conversational terminal agent that can reason step-by-step, call local file tools, and generate a browser-ready Scaler Academy style webpage.

## Features

- Runs as a CLI chat loop in the terminal
- Accepts natural language instructions
- Uses an agent loop: `START`, `THINK`, `TOOL`, `OBSERVE`, `OUTPUT`
- Creates real files inside the `output/` folder
- Uses Groq through its OpenAI-compatible HTTP API
- Generates HTML, CSS, and JavaScript for the final webpage

## Setup

```bash
npm install
```

Create a `.env` file:

```bash
GROQ_API_KEY=your_groq_api_key_here
GROQ_MODEL=llama-3.3-70b-versatile
```

## Run

```bash
npm start
```

Example prompt:

```text
Clone the Scaler Academy website with header, hero section, footer, HTML, CSS and JavaScript.
```

The generated website will be saved inside:

```text
output/
```

Open `output/index.html` in a browser to view the final result.

## Submission Checklist

- Public GitHub repository link
- Public or unlisted YouTube demo video link, 2 to 3 minutes
- Video should show:
  - CLI agent running live
  - Agent loop and reasoning steps
  - Files being generated
  - Final HTML page opened in the browser

## Important

Do not commit `.env` to GitHub. Keep API keys private and use `.env.example` for placeholders.
