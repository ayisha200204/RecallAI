import pdfParse from 'pdf-parse';
import Tesseract from 'tesseract.js';
import { StudyMaterials, FlashcardDecks, Questions, StudyAttempts, RevisionTasks } from '../models/repositories.js';
import { extractYouTubeVideoId, fetchYouTubeMetadata, fetchYouTubeTranscript } from '../services/youtubeService.js';

/**
 * Helper to dynamically extract candidate topics from text
 */
function extractCandidateTopics(text, subject = 'General Concepts') {
  const candidateTopics = [];
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

  for (const line of lines) {
    // Markdown headings (# Title)
    const headingMatch = line.match(/^#{1,4}\s+(.+)$/);
    if (headingMatch && headingMatch[1].length < 40) {
      candidateTopics.push(headingMatch[1].trim());
      continue;
    }
    // "What is X?" / "How does X work?"
    const questionMatch = line.match(/^(?:What is|How does|Explain)\s+([^?:]+)[?:]/i);
    if (questionMatch && questionMatch[1].length < 35) {
      candidateTopics.push(questionMatch[1].trim());
      continue;
    }
    // Term: Definition pattern
    const colonMatch = line.match(/^([A-Z][A-Za-z0-9\s]{2,30}):\s+/);
    if (colonMatch) {
      candidateTopics.push(colonMatch[1].trim());
      continue;
    }
  }

  const unique = Array.from(new Set(candidateTopics)).filter((t) => t.length > 2);
  return unique.length > 0 ? unique.slice(0, 8) : [subject?.trim() || 'General Concepts'];
}

/**
 * Universal content extractor:
 * Extracts text from file (PDF, TXT, Image via OCR), pasted notes, or YouTube URL
 * without requiring the user to save it to DB first, so they can preview & edit!
 */
export async function extractOnly(req, res) {
  try {
    const { pastedText, youtubeUrl, subject = 'General Studies' } = req.body;
    let extractedText = '';
    let metadata = {
      sourceType: 'text',
      fileName: 'Pasted Notes',
      pageCount: 1,
    };

    if (youtubeUrl) {
      const videoId = extractYouTubeVideoId(youtubeUrl);
      if (!videoId) {
        return res.status(400).json({
          error: 'Invalid YouTube URL. Please provide a standard link like https://www.youtube.com/watch?v=... or https://youtu.be/...',
        });
      }
      const ytMeta = await fetchYouTubeMetadata(videoId);
      const transcriptResult = await fetchYouTubeTranscript(videoId);
      extractedText = transcriptResult.text;
      metadata = {
        sourceType: 'youtube',
        fileName: `${ytMeta.title}.youtube`,
        title: ytMeta.title,
        videoId,
        authorName: ytMeta.authorName,
        thumbnailUrl: ytMeta.thumbnailUrl,
        durationSeconds: transcriptResult.durationSeconds,
        pageCount: Math.ceil(transcriptResult.durationSeconds / 60) || 1,
      };
    } else if (req.file) {
      const buffer = req.file.buffer;
      const mime = req.file.mimetype;
      const originalName = req.file.originalname;

      metadata = {
        sourceType: mime.startsWith('image/') ? 'image' : mime === 'application/pdf' ? 'pdf' : 'text',
        fileName: originalName,
        fileSize: req.file.size,
        fileType: mime,
        pageCount: 1,
      };

      if (mime === 'application/pdf') {
        try {
          const pdfData = await pdfParse(buffer);
          metadata.pageCount = pdfData.numpages || 1;
          extractedText = (pdfData.text || '').trim();

          if (extractedText.length < 60) {
            metadata.isScanned = true;
            metadata.ocrNote =
              'This document contains very little digital text. Running OCR on image content is recommended.';
          }
        } catch (pdfErr) {
          return res.status(400).json({
            error: 'Failed to extract text from the PDF file. It might be password-protected or corrupted.',
          });
        }
      } else if (mime.startsWith('image/')) {
        // Run OCR via Tesseract
        try {
          const ocrResult = await Tesseract.recognize(buffer, 'eng');
          extractedText = (ocrResult.data?.text || '').trim();
          metadata.confidence = ocrResult.data?.confidence;

          if (!extractedText || extractedText.length < 15) {
            return res.status(400).json({
              error: 'No readable text could be recognized from this image. Please upload a clearer image or screenshot.',
            });
          }
        } catch (ocrErr) {
          console.error('OCR error:', ocrErr);
          return res.status(400).json({
            error: 'Failed to process image OCR. Please ensure the image is a valid PNG or JPEG with readable text.',
          });
        }
      } else if (mime.startsWith('text/') || originalName.endsWith('.txt') || originalName.endsWith('.md')) {
        extractedText = buffer.toString('utf-8').trim();
      }
    } else if (pastedText) {
      extractedText = pastedText.trim();
    }

    if (!extractedText || extractedText.length < 15) {
      return res.status(400).json({
        error: 'Please provide valid study notes text or upload a readable file with at least 15 characters.',
      });
    }

    const topics = extractCandidateTopics(extractedText, subject);

    res.json({
      success: true,
      extractedText,
      metadata,
      topics,
      characterCount: extractedText.length,
      wordCount: extractedText.split(/\s+/).filter(Boolean).length,
    });
  } catch (err) {
    console.error('Extraction error:', err);
    res.status(500).json({ error: err.message || 'Failed to extract study material.' });
  }
}

/**
 * Upload & persist study material
 */
export async function uploadMaterial(req, res) {
  try {
    const userId = req.user._id || req.user.id;
    const { title, subject, pastedText, extractedTextPreview } = req.body;

    let extractedText = (extractedTextPreview || pastedText || '').trim();
    let fileMetadata = {
      fileName: 'Pasted Notes',
      fileSize: Buffer.byteLength(extractedText, 'utf8'),
      fileType: 'text/plain',
      pageCount: 1,
      isScanned: false,
    };

    if (req.file) {
      const buffer = req.file.buffer;
      const mime = req.file.mimetype;
      fileMetadata = {
        fileName: req.file.originalname,
        fileSize: req.file.size,
        fileType: mime,
        pageCount: 1,
        isScanned: false,
      };

      if (!extractedText) {
        if (mime === 'application/pdf') {
          try {
            const pdfData = await pdfParse(buffer);
            fileMetadata.pageCount = pdfData.numpages || 1;
            extractedText = (pdfData.text || '').trim();

            if (extractedText.length < 60 && pdfData.numpages >= 1) {
              fileMetadata.isScanned = true;
              fileMetadata.ocrNote =
                'This document appears to contain scanned images or minimal selectable text.';
            }
          } catch (pdfErr) {
            console.error('PDF parsing error:', pdfErr);
            return res.status(400).json({
              error: 'Failed to extract text from the PDF file. It might be password-protected or corrupted.',
            });
          }
        } else if (mime.startsWith('image/')) {
          try {
            const ocrResult = await Tesseract.recognize(buffer, 'eng');
            extractedText = (ocrResult.data?.text || '').trim();
            fileMetadata.ocrConfidence = ocrResult.data?.confidence;
          } catch (ocrErr) {
            return res.status(400).json({
              error: 'Failed to extract text from image. Please verify image readability or paste notes directly.',
            });
          }
        } else if (mime.startsWith('text/')) {
          extractedText = buffer.toString('utf-8').trim();
        }
      }
    }

    if (!extractedText || extractedText.length < 15) {
      return res.status(400).json({
        error: 'Please provide valid study notes text or upload a readable document with at least 15 characters.',
      });
    }

    const finalTopics = extractCandidateTopics(extractedText, subject);

    const newMaterial = await StudyMaterials.create({
      userId,
      title: title?.trim() || fileMetadata.fileName.replace(/\.[^/.]+$/, ''),
      subject: subject?.trim() || 'General Studies',
      extractedText,
      fileMetadata,
      processingStatus: 'ready',
      topics: finalTopics,
    });

    res.status(201).json({
      message: 'Study material uploaded and processed successfully.',
      material: newMaterial,
    });
  } catch (err) {
    console.error('Upload material error:', err);
    res.status(500).json({ error: 'Failed to process study material.' });
  }
}

export async function listMaterials(req, res) {
  try {
    const userId = req.user._id || req.user.id;
    const materials = await StudyMaterials.find({ userId }, { createdAt: -1 });

    const enriched = await Promise.all(
      materials.map(async (m) => {
        const decks = await FlashcardDecks.find({ materialId: m._id || m.id });
        const questions = await Questions.find({ materialId: m._id || m.id });
        const cardCount = decks.reduce((acc, d) => acc + (d.cards?.length || 0), 0);
        return {
          ...m,
          decksCount: decks.length,
          flashcardsCount: cardCount,
          questionsCount: questions.length,
        };
      })
    );

    res.json({ materials: enriched });
  } catch (err) {
    console.error('List materials error:', err);
    res.status(500).json({ error: 'Failed to retrieve study materials.' });
  }
}

export async function getMaterial(req, res) {
  try {
    const userId = req.user._id || req.user.id;
    const { id } = req.params;

    const material = await StudyMaterials.findById(id);
    if (!material) return res.status(404).json({ error: 'Material not found.' });

    if (String(material.userId) !== String(userId)) {
      return res.status(403).json({ error: 'Unauthorized access to this study material.' });
    }

    const decks = await FlashcardDecks.find({ materialId: id });
    const questions = await Questions.find({ materialId: id });

    res.json({
      material,
      decks,
      questions,
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch material details.' });
  }
}

export async function updateMaterial(req, res) {
  try {
    const userId = req.user._id || req.user.id;
    const { id } = req.params;
    const { title, subject, extractedText } = req.body;

    const material = await StudyMaterials.findById(id);
    if (!material) return res.status(404).json({ error: 'Material not found.' });
    if (String(material.userId) !== String(userId)) {
      return res.status(403).json({ error: 'Unauthorized.' });
    }

    const updates = {};
    if (title) updates.title = title.trim();
    if (subject) updates.subject = subject.trim();
    if (extractedText) {
      updates.extractedText = extractedText.trim();
      updates.topics = extractCandidateTopics(extractedText, updates.subject || material.subject);
    }

    const updated = await StudyMaterials.findByIdAndUpdate(id, updates);
    res.json({ message: 'Material updated successfully.', material: updated });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update material.' });
  }
}

export async function deleteMaterial(req, res) {
  try {
    const userId = req.user._id || req.user.id;
    const { id } = req.params;

    const material = await StudyMaterials.findById(id);
    if (!material) return res.status(404).json({ error: 'Material not found.' });

    if (String(material.userId) !== String(userId)) {
      return res.status(403).json({ error: 'Unauthorized to delete this material.' });
    }

    // Cascade deletions
    await StudyMaterials.findByIdAndDelete(id);
    await FlashcardDecks.deleteMany({ materialId: id });
    await Questions.deleteMany({ materialId: id });
    await StudyAttempts.deleteMany({ materialId: id });
    await RevisionTasks.deleteMany({ materialId: id });

    res.json({ message: 'Study material and associated study items deleted successfully.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete material.' });
  }
}

export async function importYouTubeMaterial(req, res) {
  try {
    const userId = req.user._id || req.user.id;
    const { youtubeUrl, subject, title, extractedTextPreview } = req.body;

    if (!youtubeUrl) {
      return res.status(400).json({ error: 'Please provide a valid YouTube video URL or ID.' });
    }

    const videoId = extractYouTubeVideoId(youtubeUrl);
    if (!videoId) {
      return res.status(400).json({
        error: 'Invalid YouTube URL. Please provide a standard link like https://www.youtube.com/watch?v=... or https://youtu.be/...',
      });
    }

    const metadata = await fetchYouTubeMetadata(videoId);

    let extractedText = extractedTextPreview?.trim();
    let transcriptResult = null;

    if (!extractedText) {
      try {
        transcriptResult = await fetchYouTubeTranscript(videoId);
        extractedText = transcriptResult.text;
      } catch (transcriptErr) {
        return res.status(400).json({
          error: transcriptErr.message,
          metadata,
          videoId,
        });
      }
    }

    if (!extractedText || extractedText.length < 30) {
      return res.status(400).json({
        error: 'The transcript for this video was too short or empty to generate study material.',
      });
    }

    const finalTopics = extractCandidateTopics(extractedText, subject);
    const finalTitle = title?.trim() || metadata.title;

    const newMaterial = await StudyMaterials.create({
      userId,
      title: finalTitle,
      subject: subject?.trim() || 'General Studies',
      extractedText,
      fileMetadata: {
        fileName: `${metadata.title}.youtube`,
        fileSize: Buffer.byteLength(extractedText, 'utf8'),
        fileType: 'youtube',
        pageCount: Math.ceil((transcriptResult?.durationSeconds || 600) / 60) || 1,
        youtubeUrl: `https://www.youtube.com/watch?v=${videoId}`,
        videoId,
        authorName: metadata.authorName,
        thumbnailUrl: metadata.thumbnailUrl,
        durationSeconds: transcriptResult?.durationSeconds || 600,
        isScanned: false,
      },
      processingStatus: 'ready',
      topics: finalTopics,
    });

    res.status(201).json({
      message: 'YouTube transcript successfully extracted and indexed.',
      material: newMaterial,
      metadata,
    });
  } catch (err) {
    console.error('Import YouTube material error:', err);
    res.status(500).json({ error: 'Failed to import YouTube video transcript.' });
  }
}
