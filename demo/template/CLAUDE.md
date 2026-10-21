# Pool loans demo

This folder is a small React + TypeScript app (Vite). You are building one screen in it with the Sterling
design system, as a team outside Sterling would: from what Sterling publishes, and nothing else.

## What you have

- **The `sterling-ui` package**, already listed in `package.json`: Sterling's React components, their types,
  and the token CSS. Its type declarations are in `node_modules/sterling-ui/dist/types`.
- **The `sterling` MCP server**: ask it every design-system question. Which components exist, when to use
  each, their props, the tokens, the guidelines, and the patterns all come from it.
- **`data/pool-2026-07.json`**: the data for the screen. All of it is fictional.
- **`design/pool-loans.png`**: the designer's screen, for layout and content.

## Rules for this session

- **Work only in this folder.** Don't read or search files anywhere else on this machine.
- **Use the `sterling` MCP server for all design-system questions.** Don't guess at a component, a prop, or a
  token: look it up. Don't use any Figma tools.
- **Don't use the web.** No web search and no fetching pages.
- **Don't install other UI libraries or add dependencies.** Where Sterling doesn't cover something, build the
  minimum you need from Sterling's tokens and tell me what was missing.
- **Style only with Sterling's tokens.** No raw colors, sizes, or font values in your CSS.
- **Keep the data fictional.** Use the data file as it is; don't invent loans or real company names.

## When you finish

End with a short list:

1. The Sterling components you used.
2. The MCP tools you found most useful.
3. Gaps in Sterling: anything the screen needed that Sterling didn't have.
4. Guesses you made.

## Commands

- `npm run dev` starts the app.
- `npm run build` type-checks and builds it. It must pass before you finish.
