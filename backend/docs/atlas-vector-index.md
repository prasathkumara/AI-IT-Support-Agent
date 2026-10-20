# Atlas Vector Search Index (`knowledge_vector_index`)

> **Spec:** Phase 2 RAG — Task 9.1 · **Requirement:** 10.2 (Vector Search over knowledge chunks)
>
> This is a **one-time setup you do in MongoDB Atlas, outside of Python.** No app
> code runs here. Once the index exists, the `$vectorSearch` query in
> `app/repositories/knowledge_repository.py` can use it.

---

## 1. What is a Vector Search index, and why do we need one?

### The problem it solves

In RAG, we store each slice of a knowledge document ("chunk") together with an
**embedding** — a list of numbers that captures the chunk's *meaning*.

> **New concept: embedding.** An embedding is a fixed-length list of numbers
> (a "vector") produced from text by a model. Texts with similar meaning get
> vectors that sit close together. Our model `all-MiniLM-L6-v2` produces a vector
> of **384** numbers for any piece of text.

When a user asks a question, we turn the question into an embedding too, and then
we want MongoDB to find the chunks whose embeddings are **closest** to the
question's embedding. That "find the nearest vectors" operation is what the
`$vectorSearch` aggregation stage does.

### Why a special index is required

A normal MongoDB index (the kind you'd put on a username or an email) is built for
*exact* or *range* lookups — "find the row where `email = x`". It has no idea how
to measure "how close are these two 384-number vectors?".

Vector search needs a **different kind of index** that is purpose-built to compare
vectors by distance/similarity. In MongoDB Atlas this is an **Atlas Vector Search
index**.

> **Key point:** `$vectorSearch` **cannot run without this index.** If you call the
> retrieval code before the index exists (or if the name doesn't match), Atlas
> returns an error / no results. Creating the index is a prerequisite for the whole
> RAG retrieval path, not an optimization.

If you know regular database indexes, the analogy is: *"an index makes a query
possible/fast."* The twist here is that for vector similarity, the index isn't just
faster — it's **required** for the query to work at all.

---

## 2. The exact index definition

Create a **Vector Search** index with this JSON definition:

```json
{
  "fields": [
    {
      "type": "vector",
      "path": "embedding",
      "numDimensions": 384,
      "similarity": "cosine"
    }
  ]
}
```

What each piece means:

| Field | Value | Why |
| --- | --- | --- |
| `type` | `vector` | Tells Atlas this field holds an embedding to search by similarity. |
| `path` | `embedding` | The field on each `knowledge_chunks` document that stores the vector. Matches `path: "embedding"` in `knowledge_repository.py`. |
| `numDimensions` | `384` | The length of every vector. **Must equal `embedding_dimension` in `app/core/config.py` (currently `384`, from `all-MiniLM-L6-v2`).** |
| `similarity` | `cosine` | How "closeness" is measured. Cosine compares the *direction* of vectors, which is the standard choice for sentence-transformer embeddings. |

**Index settings (set these in the Atlas UI, not in the JSON above):**

| Setting | Value |
| --- | --- |
| Database | `ai_it_support` (the value of `MONGODB_DATABASE`; default is `ai_it_support`) |
| Collection | `knowledge_chunks` |
| Index name | `knowledge_vector_index` |

> ⚠️ **The index name must be exactly `knowledge_vector_index`.** The app refers to
> it by that name through the `VECTOR_INDEX_NAME` constant in
> `app/repositories/knowledge_repository.py`. A different name means the search
> silently finds nothing.

---

## 3. Create it in the Atlas UI (primary path)

1. Sign in at <https://cloud.mongodb.com> and open the **Project** that contains
   your cluster.
2. In the left sidebar, go to **Database** → click your cluster → open the
   **Atlas Search** tab. (It may be labeled **Search & Vector Search**.)
3. Click **Create Search Index**.
4. For the index kind, choose **Vector Search** (not the "Atlas Search" text
   index), then click **Next**.
5. Choose the editor: select **JSON Editor**, then **Next**.
6. On the configuration screen:
   - **Database and Collection:** expand `ai_it_support` and select
     `knowledge_chunks`.
   - **Index Name:** type `knowledge_vector_index` exactly.
   - **JSON definition:** paste the definition from
     [section 2](#2-the-exact-index-definition):

     ```json
     {
       "fields": [
         {
           "type": "vector",
           "path": "embedding",
           "numDimensions": 384,
           "similarity": "cosine"
         }
       ]
     }
     ```
7. Click **Next**, review the summary, then **Create Search Index**.
8. Wait for the status to change from **Building** / **Pending** to **Active**.
   On a free/shared tier this usually takes under a minute. Only once it is
   **Active** will `$vectorSearch` return results.

> **Tip:** The `knowledge_chunks` collection doesn't need to exist with data yet —
> Atlas can create the index on an empty collection. But documents only become
> searchable once they're ingested *and* the index is Active.

---

## 4. Alternative: create it with a script (`pymongo`)

The UI is the recommended path. If you'd rather script it (e.g. for a repeatable
setup), newer `pymongo` + Atlas support `create_search_index`:

```python
# scripts/create_vector_index.py  (run once, manually)
from pymongo import MongoClient
from pymongo.operations import SearchIndexModel

from app.core.config import get_settings

settings = get_settings()
client = MongoClient(settings.mongodb_uri)
collection = client[settings.mongodb_database]["knowledge_chunks"]

index = SearchIndexModel(
    name="knowledge_vector_index",          # must match VECTOR_INDEX_NAME
    type="vectorSearch",
    definition={
        "fields": [
            {
                "type": "vector",
                "path": "embedding",
                "numDimensions": settings.embedding_dimension,  # 384, kept in sync via config
                "similarity": "cosine",
            }
        ]
    },
)

collection.create_search_index(model=index)
print("Requested index 'knowledge_vector_index'. Check Atlas for it to become Active.")
```

Notes:
- Reading `settings.embedding_dimension` instead of hardcoding `384` keeps the
  script in sync with config automatically.
- This feature requires an Atlas cluster that supports Vector Search and a recent
  `pymongo`. If `create_search_index` isn't available in your environment, use the
  UI steps above.
- Index creation is **asynchronous** — the call returns before the index is
  `Active`. Watch its status in the Atlas UI (or poll `collection.list_search_indexes()`).

---

## 5. Keep dimensions in sync with the embedding model

`numDimensions` in the index **must equal** `embedding_dimension` in
`app/core/config.py`:

```python
# app/core/config.py
embedding_model: str = "all-MiniLM-L6-v2"
embedding_dimension: int = 384   # <-- index numDimensions must match this
```

Why this matters:

- Every chunk we store has a 384-number vector because `all-MiniLM-L6-v2` outputs
  384 numbers. The index is told to expect 384. If these disagree, Atlas rejects
  the vectors / the search, and retrieval fails.
- **If you ever change the embedding model** (e.g. swap the local model for Voyage
  AI or OpenAI, or a different sentence-transformers model), the vector length
  almost certainly changes. You must then:
  1. update `embedding_model` and `embedding_dimension` in config,
  2. **re-embed and re-ingest** your existing documents (old 384-dim vectors won't
     match a new dimension), and
  3. **drop and recreate** `knowledge_vector_index` with the new `numDimensions`.

In short: the embedding model, the stored vectors, and the index dimension are a
matched set. Change one, rebuild the others.

---

## Quick reference

| Thing | Value | Source of truth |
| --- | --- | --- |
| Index name | `knowledge_vector_index` | `VECTOR_INDEX_NAME` in `knowledge_repository.py` |
| Collection | `knowledge_chunks` | `CHUNKS_COLLECTION_NAME` in `knowledge_repository.py` |
| Database | `ai_it_support` | `MONGODB_DATABASE` / `mongodb_database` in `config.py` |
| Field path | `embedding` | `path` in the `$vectorSearch` stage |
| Dimensions | `384` | `embedding_dimension` in `config.py` (`all-MiniLM-L6-v2`) |
| Similarity | `cosine` | this document |
