// Resize + convert an image File to a quality JPEG in the browser, so uploads
// stay small without needing server-side image processing. Falls back to the
// original file if the browser can't decode it (e.g. some HEIC on desktop).
export async function compressImage(
  file: File,
  maxDim = 2000,
  quality = 0.82
): Promise<{ blob: Blob; width: number; height: number; jpeg: boolean }> {
  try {
    const dataUrl = await new Promise<string>((res, rej) => {
      const r = new FileReader()
      r.onload = () => res(r.result as string)
      r.onerror = () => rej(new Error('read failed'))
      r.readAsDataURL(file)
    })
    const img = await new Promise<HTMLImageElement>((res, rej) => {
      const i = new Image()
      i.onload = () => res(i)
      i.onerror = () => rej(new Error('decode failed'))
      i.src = dataUrl
    })
    let width = img.naturalWidth || img.width
    let height = img.naturalHeight || img.height
    if (!width || !height) throw new Error('no dimensions')
    const longest = Math.max(width, height)
    if (longest > maxDim) {
      const scale = maxDim / longest
      width = Math.round(width * scale)
      height = Math.round(height * scale)
    }
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('no canvas context')
    ctx.drawImage(img, 0, 0, width, height)
    const blob = await new Promise<Blob | null>(res => canvas.toBlob(res, 'image/jpeg', quality))
    if (!blob) throw new Error('encode failed')
    return { blob, width, height, jpeg: true }
  } catch {
    // Couldn't process in-browser — upload the original as-is.
    return { blob: file, width: 0, height: 0, jpeg: false }
  }
}
