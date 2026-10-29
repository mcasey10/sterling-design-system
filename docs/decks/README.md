# Slide decks

Public slide decks about Sterling, one folder per deck, each with its PowerPoint file and the PDF made from it. No page
on the website links to a deck; each is linked from the LinkedIn post it went with.

Before committing a deck, run the deck check with the banned-terms list (kept outside the repository):

```bash
npm run check:decks -- --banned <path to the list>
```

It reads every .pptx and .pdf in full (slides, hidden slides, speaker notes, comments, the PDF's text, comments and
outline) and fails on a banned term or a local file path, or if the metadata names an author, a last editor, a
company or a manager. In PowerPoint, clear them under File › Info › Properties, and use Inspect Document (File › Info ›
Check for Issues) to remove comments and personal information before making the PDF. CI runs the same check without
the list, so there it checks paths and metadata only.

| Deck | LinkedIn post | Address | Files |
|---|---|---|---|
| *None yet* | | | |
