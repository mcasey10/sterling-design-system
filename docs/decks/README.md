# Slide decks

Public slide decks about Sterling, one folder per deck, each with its PowerPoint file and the PDF made from it, named
after the folder (`<deck>/<deck>.pptx` and `<deck>.pdf`). The site build publishes each PDF at `decks/<deck>.pdf`. No
page on the website links to a deck; each is linked from the LinkedIn post it went with.

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
| Five follow-up runs | Linked from the pinned comment on the Sterling 1.2 LinkedIn post | https://mcasey10.github.io/sterling-design-system/decks/sterling-follow-up-runs.pdf | [.pptx](sterling-follow-up-runs/sterling-follow-up-runs.pptx), [.pdf](sterling-follow-up-runs/sterling-follow-up-runs.pdf) |
