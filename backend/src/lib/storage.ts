import { supabaseAdmin } from './supabase';

const RECORDINGS_BUCKET = process.env.SUPABASE_STORAGE_BUCKET_RECORDINGS ?? 'recordings';
const KB_BUCKET = process.env.SUPABASE_STORAGE_BUCKET_KB ?? 'kb-documents';

export interface UploadResult {
  path: string;
  publicUrl: string;
  bucket: string;
}

/**
 * Download a recording from Bolna's URL and re-upload to Supabase Storage.
 * Returns the Supabase public URL.
 */
export async function uploadRecordingFromUrl(
  bolnaUrl: string,
  organizationId: string,
  callId: string
): Promise<UploadResult | null> {
  try {
    // Fetch the recording from Bolna
    const response = await fetch(bolnaUrl);
    if (!response.ok) {
      console.warn(`[Storage] Failed to fetch recording from Bolna: ${response.status}`);
      return null;
    }

    const buffer = await response.arrayBuffer();
    const contentType = response.headers.get('content-type') ?? 'audio/mpeg';
    const ext = contentType.includes('wav') ? 'wav' : 'mp3';
    const path = `${organizationId}/${callId}.${ext}`;

    // Upload to Supabase Storage
    const { error } = await supabaseAdmin.storage
      .from(RECORDINGS_BUCKET)
      .upload(path, buffer, {
        contentType,
        upsert: true,
        cacheControl: '3600',
      });

    if (error) {
      console.error('[Storage] Upload error:', error.message);
      return null;
    }

    // Get public URL
    const { data: urlData } = supabaseAdmin.storage
      .from(RECORDINGS_BUCKET)
      .getPublicUrl(path);

    return {
      path,
      publicUrl: urlData.publicUrl,
      bucket: RECORDINGS_BUCKET,
    };
  } catch (err) {
    console.error('[Storage] uploadRecordingFromUrl error:', err);
    return null;
  }
}

/**
 * Upload a knowledge-base document buffer to Supabase Storage.
 */
export async function uploadKBDocument(
  buffer: Buffer,
  organizationId: string,
  fileName: string,
  mimeType: string
): Promise<UploadResult | null> {
  try {
    const path = `${organizationId}/${Date.now()}-${fileName}`;

    const { error } = await supabaseAdmin.storage
      .from(KB_BUCKET)
      .upload(path, buffer, {
        contentType: mimeType,
        upsert: false,
        cacheControl: '3600',
      });

    if (error) {
      console.error('[Storage] KB upload error:', error.message);
      return null;
    }

    const { data: urlData } = supabaseAdmin.storage
      .from(KB_BUCKET)
      .getPublicUrl(path);

    return {
      path,
      publicUrl: urlData.publicUrl,
      bucket: KB_BUCKET,
    };
  } catch (err) {
    console.error('[Storage] uploadKBDocument error:', err);
    return null;
  }
}

/**
 * Delete a file from Supabase Storage by bucket + path.
 */
export async function deleteStorageFile(
  bucket: string,
  path: string
): Promise<void> {
  const { error } = await supabaseAdmin.storage.from(bucket).remove([path]);
  if (error) {
    console.warn(`[Storage] Delete error for ${bucket}/${path}:`, error.message);
  }
}

/**
 * Generate a signed (temporary) download URL for private buckets.
 * Default: 1 hour expiry.
 */
export async function getSignedUrl(
  bucket: string,
  path: string,
  expiresInSeconds = 3600
): Promise<string | null> {
  const { data, error } = await supabaseAdmin.storage
    .from(bucket)
    .createSignedUrl(path, expiresInSeconds);

  if (error || !data?.signedUrl) {
    console.warn('[Storage] getSignedUrl error:', error?.message);
    return null;
  }
  return data.signedUrl;
}
