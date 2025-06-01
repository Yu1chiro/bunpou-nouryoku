const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));

// Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/renshuu', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'renshuu.html'));
});

// API untuk generate soal menggunakan Gemini
app.post('/api/generate-questions', async (req, res) => {
  try {
    const { jlptLevel, difficultyLevel, questionType } = req.body;
    
    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ error: 'Gemini API key tidak ditemukan' });
    }

    // Konstruksi prompt berdasarkan parameter
    let kanjiRange = '';
    switch(jlptLevel) {
      case 'N5': kanjiRange = 'kanji dasar (80-100 kanji)'; break;
      case 'N4': kanjiRange = 'kanji menengah bawah (300 kanji)'; break;
      case 'N3': kanjiRange = 'kanji menengah (650 kanji)'; break;
      case 'N2': kanjiRange = 'kanji menengah atas (1000 kanji)'; break;
      case 'N1': kanjiRange = 'kanji lanjut (2000+ kanji)'; break;
    }

    let difficultyDesc = '';
    switch(difficultyLevel) {
      case 'easy': difficultyDesc = 'mudah dengan kosakata sederhana'; break;
      case 'medium': difficultyDesc = 'menengah dengan variasi tata bahasa'; break;
      case 'advanced': difficultyDesc = 'sulit dengan tata bahasa kompleks'; break;
    }

    let questionTypeDesc = '';
    switch(questionType) {
      case 'basic': questionTypeDesc = 'soal pilihan ganda biasa tentang arti, penggunaan, dan contoh kalimat'; break;
      case 'fill': questionTypeDesc = 'soal isi titik-titik (fill in the blank) dengan pilihan jawaban'; break;
    }

const prompt = `Anda adalah AI penghasil soal yang bertugas membuat soal sesuai standar JLPT resmi dari Japan Foundation.

Buatkan 20 soal tata bahasa Jepang untuk level ${jlptLevel} dengan tingkat kesulitan ${difficultyDesc} menggunakan ${kanjiRange}.

Jenis soal: ${questionTypeDesc}

⚠️ Instruksi penting (WAJIB DIPATUHI):
1. Soal harus sesuai standar kurikulum dan struktur soal resmi JLPT Japan Foundation untuk level ${jlptLevel}.
2. Hindari bias budaya, stereotip, atau interpretasi yang bersifat subjektif. Soal harus netral dan kontekstual secara akademik.
3. Pilihan jawaban (A–D) harus masuk akal dan relevan; jangan memasukkan opsi yang jelas salah atau lelucon.
4. Format respons HARUS berupa JSON yang valid **tanpa markdown, simbol tambahan, atau formatting lain**.
5. Index jawaban benar dimulai dari 0 (A=0, B=1, C=2, D=3) dan wajib ditulis sebagai integer.
6. Penjelasan harus ringkas namun jelas dan menggunakan bahasa Indonesia formal yang mudah dipahami pelajar JLPT.
7. Jangan memasukkan pola kalimat atau gaya bahasa yang tidak diajarkan di minnna nihongo, dan soumatome di level ${jlptLevel}.

Format output yang harus digunakan:

{
  "questions": [
    {
      "id": 1,
      "question": "Teks soal dalam bahasa Indonesia",
      "options": ["Pilihan A", "Pilihan B", "Pilihan C", "Pilihan D"],
      "correct": 0,
      "explanation": "Penjelasan jawaban yang benar"
    },
    ...
  ]
}

⚠️ Jangan sertakan komentar, catatan tambahan, markdown (\`\`\`), atau informasi lain di luar struktur JSON tersebut.`

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: prompt
              }
            ]
          }
        ]
      })
    });

    const data = await response.json();
    
    if (data.candidates && data.candidates[0] && data.candidates[0].content) {
      let responseText = data.candidates[0].content.parts[0].text;
      
      // Clean up response - remove markdown formatting
      responseText = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      
      try {
        const parsedQuestions = JSON.parse(responseText);
        res.json(parsedQuestions);
      } catch (parseError) {
        console.error('JSON Parse Error:', parseError);
        res.status(500).json({ error: 'Format respons AI tidak valid' });
      }
    } else {
      res.status(500).json({ error: 'Tidak dapat menghasilkan soal' });
    }
    
  } catch (error) {
    console.error('Error calling Gemini API:', error);
    res.status(500).json({ error: 'Terjadi kesalahan saat menghubungi AI' });
  }
});

// API untuk evaluasi jawaban menggunakan Gemini
app.post('/api/evaluate-answers', async (req, res) => {
  try {
    const { answers, questions } = req.body;
    
    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ error: 'Gemini API key tidak ditemukan' });
    }

    // Hitung score
    let correctCount = 0;
    const results = [];
    
    questions.forEach((question, index) => {
      const userAnswer = answers[index];
      const isCorrect = userAnswer === question.correct;
      if (isCorrect) correctCount++;
      
      results.push({
        questionId: question.id,
        isCorrect,
        userAnswer,
        correctAnswer: question.correct,
        explanation: question.explanation
      });
    });

    const score = Math.round((correctCount / questions.length) * 100);

    // Generate evaluasi dari Gemini
    const prompt = `Berikan evaluasi untuk hasil kuis tata bahasa Jepang:
- Skor: ${score}% (${correctCount}/${questions.length} benar)
- Jawaban salah: ${questions.length - correctCount}

Berikan:
1. Evaluasi singkat performa
2. Area yang perlu diperbaiki
3. Saran untuk belajar lebih lanjut
4. Motivasi untuk terus belajar

Format dalam bahasa Indonesia yang ramah dan memotivasi.`;

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: prompt
              }
            ]
          }
        ]
      })
    });

    const data = await response.json();
    let evaluation = 'Terima kasih telah mengerjakan kuis!';
    
    if (data.candidates && data.candidates[0] && data.candidates[0].content) {
      evaluation = data.candidates[0].content.parts[0].text;
    }

    res.json({
      score,
      correctCount,
      totalQuestions: questions.length,
      results,
      evaluation
    });
    
  } catch (error) {
    console.error('Error evaluating answers:', error);
    res.status(500).json({ error: 'Terjadi kesalahan saat mengevaluasi jawaban' });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server berjalan di http://localhost:${PORT}`);
});