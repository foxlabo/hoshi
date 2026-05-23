# Hoshi — Roadmap

## v1.0 (current)

- Index a library folder of JPEG/PNG/WEBP/HEIC images.
- Day-grouped timeline with EXIF date fallback to mtime.
- Sharp-generated thumbnails on disk.
- Photo detail with EXIF metadata.
- Manual albums with add/remove.
- Filename + album search with CJK bigram tokenization.

## v1.1 ideas

- HEIC display (some browsers don't render HEIC directly — re-encode
  thumbnails as JPEG which we already do; full-res views still need
  WebP/JPEG variants).
- Video files (mp4/mov) with extracted poster frames.
- Bulk select + move-to-album from the timeline.
- "Trash" — soft-delete with a 30-day window.

## v2.0 ideas

- Optional embedding-based similarity search (CLIP or local model).
- Face clustering. Requires a face detector — out of scope for v1.
- Sharing via signed URLs.
- Mobile uploader (would need auth, also out of scope).
