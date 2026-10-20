"""Text chunking for RAG ingestion (Phase 2, Requirement 9.2 — the "clean + chunk" steps).

WHY THIS FILE EXISTS
    When we add a company document to the system, we don't store the whole thing
    as one giant block. Embedding models (the thing that turns text into numbers
    for search) work best on SHORT pieces of text, and when we later show Claude
    the "most relevant snippets", small focused snippets are far more useful than
    one enormous wall of text.

    So the ingestion pipeline is:  text -> CLEAN -> CHUNK -> embed -> store.
    This file does the first two steps: clean the text, then split it into
    overlapping "chunks".

NEW CONCEPT: chunk
    A "chunk" is just a small slice of the original document — e.g. the first
    1000 characters, then the next 1000, and so on. We cut the long document into
    these bite-sized slices.

NEW CONCEPT: overlap
    If we cut cleanly at character 1000, a sentence that straddles that boundary
    gets split in half and its meaning can be lost. "Overlap" means each chunk
    repeats the last few characters of the previous chunk, so ideas that sit on a
    boundary still appear whole inside at least one chunk. Picture overlapping
    roof shingles: each one covers the top edge of the one below it.

NEW CONCEPT: pure function
    This module is a PURE function — it only takes inputs and returns an output.
    It does no I/O: no reading files, no database, no network. That makes it easy
    to understand and dead-simple to test (same input always gives same output).
    Compare to a plain JavaScript helper like `slice()` — just data in, data out.
"""

import re

# A pre-compiled regular expression that matches one-or-more whitespace
# characters in a row (spaces, tabs, newlines...). `\s` means "any whitespace"
# and `+` means "one or more". We compile it once here (module load) so Python
# doesn't have to re-parse the pattern on every call — a small, standard
# performance habit.
_WHITESPACE_RUN = re.compile(r"\s+")


def _clean(text: str) -> str:
    """The "clean" step: normalize messy whitespace into single spaces.

    Real documents are messy: double spaces, tabs, Windows vs. Unix line endings,
    blank lines between paragraphs. None of that changes the MEANING of the text,
    but it does make chunk boundaries unpredictable and wastes chunk space on
    invisible characters. So we:

      1. Replace every run of whitespace with a single space.
      2. Strip leading/trailing whitespace from the whole string.

    Example: "Hello\\n\\n   world\\t!" becomes "Hello world !".
    """
    # re.sub walks the string and swaps each whitespace-run for one space.
    collapsed = _WHITESPACE_RUN.sub(" ", text)
    # .strip() trims any leading/trailing space left over.
    return collapsed.strip()


def chunk_text(text: str, chunk_size: int, overlap: int) -> list[str]:
    """Clean the text, then split it into overlapping chunks.

    Args:
        text: The raw document text to split.
        chunk_size: Maximum number of characters in each chunk. Must be > 0.
        overlap: How many characters each chunk repeats from the end of the
            previous one. Must be >= 0 and strictly LESS than chunk_size
            (otherwise we'd never move forward and would loop forever).

    Returns:
        A list of chunk strings in order. Empty/whitespace-only input returns [].

    How the splitting works (a concrete walk-through):
        Say chunk_size=10 and overlap=3 on the cleaned text "abcdefghijklmno".
        - start=0  -> text[0:10]  = "abcdefghij"
        - next start = 10 - 3 = 7 (step back by the overlap)
        - start=7  -> text[7:17]  = "hijklmno"   (stops at the end)
        Notice "hij" appears in BOTH chunks — that's the overlap doing its job.
    """
    # --- Validate inputs up front -------------------------------------------
    # Catching bad arguments early with a clear message is kinder to the caller
    # than letting a confusing error surface later (or spinning forever).
    if chunk_size <= 0:
        raise ValueError("chunk_size must be greater than 0")
    if overlap < 0:
        raise ValueError("overlap must be 0 or greater")
    if overlap >= chunk_size:
        raise ValueError("overlap must be smaller than chunk_size")

    # --- Step 1: clean -------------------------------------------------------
    cleaned = _clean(text)

    # If there's nothing left after cleaning, there are no chunks to make.
    if not cleaned:
        return []

    # --- Step 2: chunk -------------------------------------------------------
    # `step` is how far we advance the window each time. By moving forward by
    # (chunk_size - overlap) instead of a full chunk_size, consecutive chunks
    # share `overlap` characters.
    step = chunk_size - overlap

    chunks: list[str] = []
    start = 0
    text_length = len(cleaned)

    # Keep slicing until we've passed the end of the string.
    while start < text_length:
        # Python slicing is safe past the end: text[7:17] on a 15-char string
        # just returns up to the end, so we don't need manual bounds math.
        chunk = cleaned[start : start + chunk_size]
        chunks.append(chunk)

        # STOP once this chunk already reached the end of the text. Without this
        # check, the overlap step-back could create a tiny trailing chunk (e.g.
        # just "o") whose content is ALREADY fully contained in the chunk we
        # just appended — pure duplication that wastes an embedding. Reaching
        # the end means we're done.
        if start + chunk_size >= text_length:
            break

        # Otherwise advance the window forward by `step` (= chunk_size - overlap)
        # so the next chunk repeats `overlap` characters from this one.
        start += step

    return chunks
