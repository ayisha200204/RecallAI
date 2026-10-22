import { YoutubeTranscript } from 'youtube-transcript';

export function extractYouTubeVideoId(input) {
  if (!input) return null;
  const str = input.trim();

  // Standard or short URLs
  const regExp = /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([\w-]{11})/;
  const match = str.match(regExp);
  if (match && match[1]) {
    return match[1];
  }

  // Raw 11-char ID
  if (/^[\w-]{11}$/.test(str)) {
    return str;
  }

  return null;
}

export async function fetchYouTubeMetadata(videoId) {
  try {
    const oembedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
    const res = await fetch(oembedUrl);
    if (res.ok) {
      const data = await res.json();
      return {
        title: data.title || 'YouTube Lecture',
        authorName: data.author_name || 'YouTube Creator',
        thumbnailUrl: data.thumbnail_url || `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
      };
    }
  } catch (err) {
    console.warn('[YouTube Service] Could not fetch oEmbed metadata:', err.message);
  }

  return {
    title: `YouTube Video (${videoId})`,
    authorName: 'YouTube Creator',
    thumbnailUrl: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
  };
}

export async function fetchYouTubeTranscript(videoId) {
  try {
    const transcriptItems = await YoutubeTranscript.fetchTranscript(videoId);
    if (!transcriptItems || transcriptItems.length === 0) {
      throw new Error('No transcript captions found for this video.');
    }

    // Combine transcript items into flowing coherent text
    const fullText = transcriptItems
      .map((item) => item.text.replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/&quot;/g, '"'))
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();

    return {
      success: true,
      text: fullText,
      itemCount: transcriptItems.length,
      durationSeconds: Math.round(transcriptItems[transcriptItems.length - 1]?.offset / 1000) || 0,
    };
  } catch (err) {
    console.error('[YouTube Service] Transcript fetch error:', err.message);
    throw new Error(
      err.message.includes('disabled') || err.message.includes('Could not find')
        ? 'Transcripts/captions are disabled or unavailable for this YouTube video. Please ensure the video has closed captions (CC).'
        : `Could not retrieve transcript from YouTube: ${err.message}`
    );
  }
}
