#!/usr/bin/env node
// Generate a handful of placeholder JPEGs in ./photos so the user has
// something to see on first launch. The colors are computed deterministically
// so the script is idempotent — re-running won't overwhelm the timeline.

import { mkdir, utimes, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import sharp from 'sharp'

const ROOT = resolve(process.cwd(), process.env.HOSHI_LIBRARY_ROOT ?? './photos')

const PHOTOS = [
  {
    name: '2024/12/winter-walk-1.jpg',
    label: 'Winter walk 1',
    hue: 210,
    date: '2024-12-25T10:30:00Z',
  },
  {
    name: '2024/12/winter-walk-2.jpg',
    label: 'Winter walk 2',
    hue: 200,
    date: '2024-12-26T11:15:00Z',
  },
  {
    name: '2024/11/autumn-leaves.jpg',
    label: 'Autumn leaves',
    hue: 30,
    date: '2024-11-20T14:00:00Z',
  },
  { name: '2024/10/birthday.jpg', label: '誕生日', hue: 350, date: '2024-10-08T18:30:00Z' },
  { name: '2024/08/summer-festival.jpg', label: '夏祭り', hue: 60, date: '2024-08-15T20:00:00Z' },
  { name: '2024/04/cherry-blossoms.jpg', label: '桜', hue: 320, date: '2024-04-05T12:00:00Z' },
]

function hsvToRgb(h, s, v) {
  const c = v * s
  const hh = h / 60
  const x = c * (1 - Math.abs((hh % 2) - 1))
  let r = 0
  let g = 0
  let b = 0
  if (0 <= hh && hh < 1) [r, g, b] = [c, x, 0]
  else if (1 <= hh && hh < 2) [r, g, b] = [x, c, 0]
  else if (2 <= hh && hh < 3) [r, g, b] = [0, c, x]
  else if (3 <= hh && hh < 4) [r, g, b] = [0, x, c]
  else if (4 <= hh && hh < 5) [r, g, b] = [x, 0, c]
  else if (5 <= hh && hh < 6) [r, g, b] = [c, 0, x]
  const m = v - c
  return [Math.round((r + m) * 255), Math.round((g + m) * 255), Math.round((b + m) * 255)]
}

async function main() {
  await mkdir(ROOT, { recursive: true })
  let written = 0
  let skipped = 0
  for (const photo of PHOTOS) {
    const abs = join(ROOT, photo.name)
    await mkdir(resolve(abs, '..'), { recursive: true })
    try {
      const fs = await import('node:fs/promises')
      await fs.access(abs)
      skipped++
      continue
    } catch {
      // doesn't exist — write it.
    }
    const [r, g, b] = hsvToRgb(photo.hue, 0.6, 0.85)
    const svg = Buffer.from(
      `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="800">
         <rect width="100%" height="100%" fill="rgb(${r}, ${g}, ${b})" />
         <text x="50%" y="50%" text-anchor="middle" dominant-baseline="middle"
               font-family="sans-serif" font-size="64" fill="white">${photo.label}</text>
       </svg>`,
    )
    const jpeg = await sharp(svg).jpeg({ quality: 85 }).toBuffer()
    await writeFile(abs, jpeg)
    // Set mtime to the photo's intended date so the timeline shows
    // distinct day groups even though we don't bake an EXIF block into
    // these synthetic JPEGs.
    const t = new Date(photo.date)
    await utimes(abs, t, t)
    written++
  }
  // biome-ignore lint/suspicious/noConsole: CLI script
  console.log(`seed-photos: wrote ${written} new file(s), skipped ${skipped}.`)
}

await main()
