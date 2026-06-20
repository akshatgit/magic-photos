# Magic Photos — Retrieval Notes

Album: `SPSTI205AEKX0` (SPST) via https://mymagicphotos.com/dep/?c=SPSTI205AEKX0&s=SPST&dm=cc

## What this repo contains

12 photos (`photo_01` … `photo_12`), **watermarked**, at the resolution the public
preview API serves (1920×1440, two portrait shots at 1536×1920). These are the
preview/watermarked versions — the same images a logged-out visitor sees on the
album page.

## How they were obtained

- The album page is a Next.js app that loads photo metadata from a public endpoint:
  `https://public-api.mmos.magicmemories.com/api/v1/albums/SPSTI205AEKX0`
- That returns 12 content IDs, each with `purchased: false` and three file variants:
  `thumbnail`, `preview`, and `watermarked`.
- The watermarked previews were downloaded through a headless browser session
  (the API rejects direct requests unless the `Origin` is `shop.magicmemories.com`).

## What was tried for unwatermarked originals — and why it didn't work

| Attempt | Result |
|---|---|
| `/content-files/{id}/original` endpoint | Redirects to the **watermarked** S3 object — `purchased: false` gates the real original |
| `/contents/{id}/original.jpg`, `/download`, `/full`, `/unwatermarked` | 400 / 404 / 500 — no unauthenticated path to originals |
| Direct S3 object guessing (`{id}.jpg`, `{id}-original.jpg`) | 403 Forbidden (signed URLs only) |
| `v2` API paths | Redirect to storefront / time out |
| Math-reversing the watermark overlay (known PNG, 50% white) | Reduced but did not cleanly remove it; introduced artifacts |
| OpenCV inpainting over the watermark mask | Removed watermark but left the covered regions blurry/reconstructed |

**Conclusion:** there is no unauthenticated/free path to the unwatermarked originals.
The full-resolution clean files (album metadata lists 2400×1800) live behind purchase
on Magic Memories' servers and are only released to a paid/authenticated session.

## The legitimate path to clean originals

If the photos have been purchased, the unwatermarked originals are available by:

1. Replying to the purchase/receipt email and requesting the download link, or
2. Logging in at https://shop.magicmemories.com with the purchasing account
   (paid items show up unwatermarked), or
3. Contacting support@magicmemories.com with the order details.

Post-processing (watermark removal / inpainting) was tried locally and reverted —
it does not produce true originals and is not a substitute for the purchased files.
