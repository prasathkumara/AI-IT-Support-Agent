"""Tests for the pure text-chunking function (Phase 2, Requirement 9.2).

These are example-based Pytest tests: each one feeds a known input to
``chunk_text`` and asserts on the known-good output. Because ``chunk_text`` is a
PURE function (no files, no DB, no network — just data in, data out), testing it
is simple and fast: there's nothing to mock or set up.

Reminder on Pytest basics: any function named ``test_*`` is collected and run,
and a plain ``assert`` that evaluates to False marks the test as failed.
"""

import pytest

from app.ai.rag.chunking import chunk_text


def test_splits_normal_text_into_overlapping_chunks() -> None:
    """Normal case: a string longer than chunk_size yields overlapping chunks.

    With chunk_size=10 and overlap=3 on 15 characters, the window advances by
    7 (=10-3) each time, so we expect two chunks that share 3 characters.
    """
    text = "abcdefghijklmno"  # 15 characters, already clean (no whitespace)

    chunks = chunk_text(text, chunk_size=10, overlap=3)

    # First chunk is characters 0..9, second starts 3 back from the end of the
    # first (at index 7) and runs to the end.
    assert chunks == ["abcdefghij", "hijklmno"]


def test_text_shorter_than_chunk_size_returns_single_chunk() -> None:
    """If the text is shorter than chunk_size, we get exactly one chunk back.

    There's nothing to split, so the whole (cleaned) text is the only chunk.
    """
    text = "short"  # 5 characters, smaller than chunk_size=10

    chunks = chunk_text(text, chunk_size=10, overlap=3)

    assert chunks == ["short"]


def test_overlap_characters_are_shared_between_consecutive_chunks() -> None:
    """The tail of each chunk should reappear at the head of the next one.

    This is the whole point of overlap: ideas sitting on a boundary stay whole
    inside at least one chunk. We check it generally rather than hard-coding the
    strings, so the intent is obvious.
    """
    text = "0123456789ABCDEFGHIJ"  # 20 characters
    chunk_size = 8
    overlap = 2

    chunks = chunk_text(text, chunk_size=chunk_size, overlap=overlap)

    # More than one chunk is produced for this input.
    assert len(chunks) > 1

    # For each adjacent pair, the last `overlap` chars of the earlier chunk must
    # equal the first `overlap` chars of the next chunk.
    for earlier, later in zip(chunks, chunks[1:]):
        assert earlier[-overlap:] == later[:overlap]


def test_cleans_whitespace_before_chunking() -> None:
    """The "clean" step collapses whitespace runs and strips the ends.

    Messy input with tabs, newlines and double spaces should become a single
    tidy chunk when it comfortably fits in one chunk_size.
    """
    text = "  Hello\n\n   world\t!  "

    chunks = chunk_text(text, chunk_size=50, overlap=5)

    assert chunks == ["Hello world !"]


def test_empty_or_whitespace_only_text_returns_no_chunks() -> None:
    """Nothing meaningful in -> empty list out (no chunks to embed)."""
    assert chunk_text("", chunk_size=10, overlap=2) == []
    assert chunk_text("   \n\t  ", chunk_size=10, overlap=2) == []


def test_invalid_arguments_raise_valueerror() -> None:
    """Bad sizing arguments fail fast with a clear ValueError.

    In particular overlap must be smaller than chunk_size, otherwise the window
    could never move forward.
    """
    with pytest.raises(ValueError):
        chunk_text("abc", chunk_size=0, overlap=0)

    with pytest.raises(ValueError):
        chunk_text("abc", chunk_size=5, overlap=-1)

    with pytest.raises(ValueError):
        chunk_text("abc", chunk_size=5, overlap=5)
