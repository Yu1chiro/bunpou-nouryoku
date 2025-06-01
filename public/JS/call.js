        let questions = [];
        let currentQuestionIndex = 0;
        let userAnswers = [];
        let quizSettings = {};
        let startTime = Date.now();

        // Initialize quiz
        window.addEventListener('load', () => {
            initializeQuiz();
        });

        function initializeQuiz() {
            // Load questions and settings from localStorage
            const savedQuestions = localStorage.getItem('currentQuestions');
            const savedSettings = localStorage.getItem('quizSettings');

            if (!savedQuestions || !savedSettings) {
                alert('Tidak ada soal yang dimuat. Kembali ke halaman utama.');
                goHome();
                return;
            }

            try {
                questions = JSON.parse(savedQuestions);
                quizSettings = JSON.parse(savedSettings);
                userAnswers = new Array(questions.length).fill(null);

                // Update UI with quiz info
                document.getElementById('quizLevel').textContent = `JLPT ${quizSettings.jlptLevel}`;
                document.getElementById('quizType').textContent = quizSettings.questionType === 'basic' ? 'Basic' : 'Fill in the Blank';

                // Hide loading screen and show quiz
                setTimeout(() => {
                    document.getElementById('loadingScreen').style.display = 'none';
                    document.getElementById('quizContainer').style.display = 'block';
                    displayQuestion();
                    updateAnswerSummary();
                }, 1500);

            } catch (error) {
                console.error('Error loading quiz data:', error);
                alert('Terjadi kesalahan saat memuat soal.');
                goHome();
            }
        }

        function displayQuestion() {
            if (!questions[currentQuestionIndex]) return;

            const question = questions[currentQuestionIndex];
            
            // Update question info
            document.getElementById('questionNumber').textContent = `Soal ${currentQuestionIndex + 1}`;
            document.getElementById('progressText').textContent = `${currentQuestionIndex + 1}/${questions.length}`;
            document.getElementById('questionText').textContent = question.question;

            // Update progress bar
            const progress = ((currentQuestionIndex + 1) / questions.length) * 100;
            document.getElementById('progressBar').style.width = progress + '%';

            // Display answer options
            const optionsContainer = document.getElementById('answerOptions');
            optionsContainer.innerHTML = '';

            question.options.forEach((option, index) => {
                const optionButton = document.createElement('button');
                optionButton.className = `w-full text-left p-4 border rounded-lg hover:bg-blue-50 transition-all duration-200 ${
                    userAnswers[currentQuestionIndex] === index 
                        ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200' 
                        : 'border-gray-200 hover:border-blue-300'
                }`;
                optionButton.innerHTML = `
                    <div class="flex items-center">
                        <span class="w-8 h-8 rounded-full border-2 flex items-center justify-center mr-4 ${
                            userAnswers[currentQuestionIndex] === index 
                                ? 'border-blue-500 bg-blue-500 text-white' 
                                : 'border-gray-300'
                        }">
                            ${String.fromCharCode(65 + index)}
                        </span>
                        <span class="text-gray-800">${option}</span>
                    </div>
                `;
                optionButton.onclick = () => selectAnswer(index);
                optionsContainer.appendChild(optionButton);
            });

            // Update navigation buttons
            updateNavigationButtons();
            updateAnswerSummary();
        }

        function selectAnswer(answerIndex) {
            userAnswers[currentQuestionIndex] = answerIndex;
            displayQuestion(); // Refresh to show selection
        }

        function updateNavigationButtons() {
            const prevBtn = document.getElementById('prevBtn');
            const nextBtn = document.getElementById('nextBtn');
            const finishBtn = document.getElementById('finishBtn');

            // Previous button
            prevBtn.disabled = currentQuestionIndex === 0;

            // Next/Finish button
            const hasAnswer = userAnswers[currentQuestionIndex] !== null;
            
            if (currentQuestionIndex === questions.length - 1) {
                nextBtn.classList.add('hidden');
                finishBtn.classList.remove('hidden');
                finishBtn.disabled = !hasAnswer;
            } else {
                nextBtn.classList.remove('hidden');
                finishBtn.classList.add('hidden');
                nextBtn.disabled = !hasAnswer;
            }
        }

        function updateAnswerSummary() {
            const answerGrid = document.getElementById('answerGrid');
            answerGrid.innerHTML = '';

            for (let i = 0; i < questions.length; i++) {
                const gridItem = document.createElement('button');
                gridItem.className = `w-8 h-8 rounded text-sm font-medium transition-all duration-200 ${
                    userAnswers[i] !== null 
                        ? 'bg-green-500 text-white hover:bg-green-600' 
                        : 'bg-gray-300 text-gray-600 hover:bg-gray-400'
                } ${i === currentQuestionIndex ? 'ring-2 ring-blue-400' : ''}`;
                gridItem.textContent = i + 1;
                gridItem.onclick = () => goToQuestion(i);
                answerGrid.appendChild(gridItem);
            }

            document.getElementById('answerSummary').classList.remove('hidden');
        }

        function goToQuestion(index) {
            currentQuestionIndex = index;
            displayQuestion();
        }

        function previousQuestion() {
            if (currentQuestionIndex > 0) {
                currentQuestionIndex--;
                displayQuestion();
            }
        }

        function nextQuestion() {
            if (currentQuestionIndex < questions.length - 1 && userAnswers[currentQuestionIndex] !== null) {
                currentQuestionIndex++;
                displayQuestion();
            }
        }

        async function finishQuiz() {
            // Check if all questions are answered
            const unansweredCount = userAnswers.filter(answer => answer === null).length;
            if (unansweredCount > 0) {
                if (!confirm(`Masih ada ${unansweredCount} soal yang belum dijawab. Yakin ingin menyelesaikan?`)) {
                    return;
                }
            }

            // Show loading in finish button
            const finishBtn = document.getElementById('finishBtn');
            finishBtn.innerHTML = '<div class="animate-spin rounded-full h-5 w-5 border-b-2 border-white mx-auto"></div>';
            finishBtn.disabled = true;

            try {
                // Send answers for evaluation
                const response = await fetch('/api/evaluate-answers', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        answers: userAnswers,
                        questions: questions
                    })
                });

                const results = await response.json();
                
                if (response.ok) {
                    showResults(results);
                    saveQuizStats(results);
                } else {
                    alert('Error: ' + results.error);
                }
            } catch (error) {
                console.error('Error evaluating answers:', error);
                alert('Terjadi kesalahan saat mengevaluasi jawaban');
            } finally {
                // Reset finish button
                finishBtn.innerHTML = 'Selesai';
                finishBtn.disabled = false;
            }
        }

        function showResults(results) {
            // Update score display
            document.getElementById('finalScore').textContent = results.score + '%';
            document.getElementById('correctCount').textContent = results.correctCount;
            
            // Update score icon based on performance
            const scoreIcon = document.getElementById('scoreIcon');
            if (results.score >= 90) {
                scoreIcon.innerHTML = '<span class="text-4xl">🏆</span>';
                scoreIcon.className += ' bg-yellow-100';
            } else if (results.score >= 70) {
                scoreIcon.innerHTML = '<span class="text-4xl">🎯</span>';
                scoreIcon.className += ' bg-green-100';
            } else {
                scoreIcon.innerHTML = '<span class="text-4xl">📚</span>';
                scoreIcon.className += ' bg-blue-100';
            }

            // Display AI evaluation
            document.getElementById('aiEvaluation').textContent = results.evaluation;

            // Display detailed results
            const detailedResults = document.getElementById('detailedResults');
            detailedResults.innerHTML = '';

            results.results.forEach((result, index) => {
                const question = questions[index];
                const resultItem = document.createElement('div');
                resultItem.className = `border rounded-lg p-4 ${result.isCorrect ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`;
                
                resultItem.innerHTML = `
                    <div class="flex items-start justify-between mb-2">
                        <span class="font-medium text-gray-800">Soal ${index + 1}</span>
                        <span class="text-sm ${result.isCorrect ? 'text-green-600' : 'text-red-600'}">
                            ${result.isCorrect ? '✓ Benar' : '✗ Salah'}
                        </span>
                    </div>
                    <p class="text-sm text-gray-700 mb-2">${question.question}</p>
                    <div class="text-xs space-y-1">
                        <div>Jawaban Anda: <span class="${result.isCorrect ? 'text-green-600' : 'text-red-600'}">${question.options[result.userAnswer] || 'Tidak dijawab'}</span></div>
                        ${!result.isCorrect ? `<div>Jawaban Benar: <span class="text-green-600">${question.options[result.correctAnswer]}</span></div>` : ''}
                        <div class="text-gray-600 mt-2">${result.explanation}</div>
                    </div>
                `;
                
                detailedResults.appendChild(resultItem);
            });

            // Show results modal
            document.getElementById('resultsModal').classList.remove('hidden');
            document.getElementById('resultsModal').classList.add('flex');
        }

        function saveQuizStats(results) {
            const endTime = Date.now();
            const duration = Math.round((endTime - startTime) / 1000); // seconds

            // Get existing stats
            const stats = JSON.parse(localStorage.getItem('quizStats') || '{"totalQuizzes": 0, "scores": [], "totalTime": 0}');
            
            // Update stats
            stats.totalQuizzes++;
            stats.scores.push(results.score);
            stats.totalTime += duration;

            // Keep only last 50 scores to prevent localStorage overflow
            if (stats.scores.length > 50) {
                stats.scores = stats.scores.slice(-50);
            }

            // Save updated stats
            localStorage.setItem('quizStats', JSON.stringify(stats));

            // Save quiz history
            const historyItem = {
                date: new Date().toISOString(),
                level: quizSettings.jlptLevel,
                difficulty: quizSettings.difficultyLevel,
                type: quizSettings.questionType,
                score: results.score,
                correctCount: results.correctCount,
                totalQuestions: questions.length,
                duration: duration
            };

            const history = JSON.parse(localStorage.getItem('quizHistory') || '[]');
            history.unshift(historyItem);
            
            // Keep only last 20 quiz history
            if (history.length > 20) {
                history.splice(20);
            }
            
            localStorage.setItem('quizHistory', JSON.stringify(history));
        }

        function goHome() {
            window.location.href = '/';
        }

        function retryQuiz() {
            // Reset answers and go back to first question
            userAnswers = new Array(questions.length).fill(null);
            currentQuestionIndex = 0;
            startTime = Date.now();
            
            // Hide results modal
            document.getElementById('resultsModal').classList.add('hidden');
            document.getElementById('resultsModal').classList.remove('flex');
            
            // Display first question
            displayQuestion();
        }

        function shareResults() {
            const score = document.getElementById('finalScore').textContent;
            const level = quizSettings.jlptLevel;
            const text = `Saya baru saja menyelesaikan latihan tata bahasa Jepang ${level} dengan skor ${score}! 🎯\n\nCoba juga di Bunpou Variatif!`;
            
            if (navigator.share) {
                navigator.share({
                    title: 'Hasil Latihan Bunpou',
                    text: text,
                    url: window.location.origin
                });
            } else {
                // Fallback: copy to clipboard
                navigator.clipboard.writeText(text).then(() => {
                    alert('Hasil berhasil disalin ke clipboard!');
                });
            }
        }

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (document.getElementById('resultsModal').classList.contains('hidden')) {
                switch(e.key) {
                    case 'ArrowLeft':
                        if (!document.getElementById('prevBtn').disabled) {
                            previousQuestion();
                        }
                        break;
                    case 'ArrowRight':
                        if (!document.getElementById('nextBtn').disabled) {
                            nextQuestion();
                        }
                        break;
                    case '1':
                    case '2':
                    case '3':
                    case '4':
                        const optionIndex = parseInt(e.key) - 1;
                        if (optionIndex < questions[currentQuestionIndex]?.options.length) {
                            selectAnswer(optionIndex);
                        }
                        break;
                }
            }
        });

        // Prevent accidental page refresh
        window.addEventListener('beforeunload', (e) => {
            if (!document.getElementById('resultsModal').classList.contains('flex')) {
                e.preventDefault();
                e.returnValue = '';
            }
        });
