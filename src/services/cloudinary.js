const CLOUDINARY_CLOUD = 'dnq9s0g7v';
const CLOUDINARY_PRESET = 'Siteplanejadoentreaspas';

export async function uploadCloudinary(file) {
  if (!file) return null;
  const maxSize = 6 * 1024 * 1024;
  if (file.size > maxSize) {
    toast('Imagem excede 6 MB', 'error');
    return null;
  }
  const fd = new FormData();
  fd.append('file', file);
  fd.append('upload_preset', CLOUDINARY_PRESET);
  try {
    const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD}/image/upload`, {
      method: 'POST',
      body: fd,
    });
    const data = await res.json();
    return data.secure_url || null;
  } catch {
    return null;
  }
}
