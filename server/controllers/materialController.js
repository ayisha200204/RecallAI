import pdfParse from 'pdf-parse';
import { StudyMaterials, FlashcardDecks, Questions, StudyAttempts, RevisionTasks } from '../models/repositories.js';
import { extractYouTubeVideoId, fetchYouTubeMetadata, fetchYouTubeTranscript } from '../services/youtubeService.js';


export async function uploadMaterial(req, res) {
  try {
    const userId = req.user._id || req.user.id;
    const { title, subject, pastedText } = req.body;

    let extractedText = pastedText ? pastedText.trim() : '';
    let fileMetadata = {
      fileName: 'Pasted Notes',
      fileSize: Buffer.byteLength(extractedText, 'utf8'),
      fileType: 'text/plain',
      pageCount: 1,
      isScanned: false,
    };

    if (req.file) {
      const buffer = req.file.buffer;
      fileMetadata = {
        fileName: req.file.originalname,
        fileSize: req.file.size,
        fileType: req.file.mimetype,
        pageCount: 1,
        isScanned: false,
      };

      if (req.file.mimetype === 'application/pdf') {
        try {
          const pdfData = await pdfParse(buffer);
          fileMetadata.pageCount = pdfData.numpages || 1;
          extractedText = (pdfData.text || '').trim();

          // Check if PDF is a scanned image with minimal text
          if (extractedText.length < 60 && pdfData.numpages >= 1) {
            fileMetadata.isScanned = true;
            fileMetadata.ocrNote =
              'This document appears to contain scanned images or minimal selectable text. OCR is recommended for scanned documents.';
            // Provide sensible fallback if scanned
            if (!extractedText) {
              extractedText = `[Scanned PDF: ${req.file.originalname}]\nNote: Very little selectable text was detected in this PDF. Please paste study text directly or use a digitally generated PDF for full text extraction.`;
            }
          }
        } catch (pdfErr) {
          console.error('PDF parsing error:', pdfErr);
          return res.status(400).json({
            error: 'Failed to extract text from the PDF file. It might be password-protected or corrupted.',
          });
        }
      } else if (req.file.mimetype.startsWith('text/')) {
        extractedText = buffer.toString('utf-8').trim();
      }
    }

    if (!extractedText || extractedText.length < 15) {
      return res.status(400).json({
        error: 'Please provide valid study notes text or upload a readable document with at least 15 characters.',
      });
    }

    // Auto-extract preliminary topic keywords
    const candidateTopics = [];
    const lower = extractedText.toLowerCase();
    const commonTopics = [
      'Processes and Threads',
      'CPU Scheduling',
      'Deadlocks',
      'Memory Management',
      'Virtual Memory',
      'File Systems',
      'Concurrency',
      'Networking',
      'Data Structures',
      'Algorithms',
    ];
    commonTopics.forEach((t) => {
      if (lower.includes(t.toLowerCase()) || lower.includes(t.split(' ')[0].toLowerCase())) {
        candidateTopics.push(t);
      }
    });

    const finalTopics = candidateTopics.length > 0 ? candidateTopics : [subject || 'General Concepts'];

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

    // Attach card and question counts
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
    const { youtubeUrl, subject, title } = req.body;

    if (!youtubeUrl) {
      return res.status(400).json({ error: 'Please provide a valid YouTube video URL or ID.' });
    }

    const videoId = extractYouTubeVideoId(youtubeUrl);
    if (!videoId) {
      return res.status(400).json({
        error: 'Invalid YouTube URL. Please provide a standard link like https://www.youtube.com/watch?v=... or https://youtu.be/...',
      });
    }

    // 1. Fetch metadata (Title, Author, Thumbnail)
    const metadata = await fetchYouTubeMetadata(videoId);

    // 2. Fetch Transcript
    let transcriptResult;
    try {
      transcriptResult = await fetchYouTubeTranscript(videoId);
    } catch (transcriptErr) {
      return res.status(400).json({
        error: transcriptErr.message,
        metadata,
        videoId,
      });
    }

    const extractedText = transcriptResult.text;
    if (!extractedText || extractedText.length < 30) {
      return res.status(400).json({
        error: 'The transcript for this video was too short or empty to generate study material.',
      });
    }

    // Extract preliminary candidate topics
    const candidateTopics = [];
    const lower = (metadata.title + ' ' + extractedText).toLowerCase();
    const commonTopics = [
      'Processes and Threads',
      'CPU Scheduling',
      'Deadlocks',
      'Memory Management',
      'Virtual Memory',
      'File Systems',
      'Concurrency',
      'Networking',
      'Data Structures',
      'Algorithms',
      'Machine Learning',
      'System Design',
    ];
    commonTopics.forEach((t) => {
      if (lower.includes(t.toLowerCase()) || lower.includes(t.split(' ')[0].toLowerCase())) {
        candidateTopics.push(t);
      }
    });

    const finalTopics = candidateTopics.length > 0 ? candidateTopics : [subject || 'YouTube Lecture'];
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
        pageCount: Math.ceil(transcriptResult.durationSeconds / 60) || 1,
        youtubeUrl: `https://www.youtube.com/watch?v=${videoId}`,
        videoId,
        authorName: metadata.authorName,
        thumbnailUrl: metadata.thumbnailUrl,
        durationSeconds: transcriptResult.durationSeconds,
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

