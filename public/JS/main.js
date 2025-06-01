        let selectedJLPTLevel = '';

        function openModal(level) {
            selectedJLPTLevel = level;
            document.getElementById('selectedLevel').value = level;
            document.getElementById('modalTitle').textContent = `Pengaturan Latihan JLPT ${level}`;
            document.getElementById('settingsModal').classList.remove('hidden');
            document.getElementById('settingsModal').classList.add('flex');
            document.getElementById('modalContent').classList.remove('scale-95');
            document.getElementById('modalContent').classList.add('scale-100');
        }

        function closeModal() {
            document.getElementById('modalContent').classList.remove('scale-100');
            document.getElementById('modalContent').classList.add('scale-95');
            setTimeout(() => {
                document.getElementById('settingsModal').classList.add('hidden');
                document.getElementById('settingsModal').classList.remove('flex');
            }, 200);
        }

        // Handle form submission
        document.getElementById('settingsForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const formData = new FormData(e.target);
            const settings = {
                jlptLevel: formData.get('jlptLevel'),
                difficultyLevel: formData.get('difficulty'),
                questionType: formData.get('questionType')
            };

            // Show loading state
            document.getElementById('submitText').textContent = 'Memuat soal...';
            document.getElementById('loadingSpinner').classList.remove('hidden');
            
            try {
                const response = await fetch('/api/generate-questions', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(settings)
                });

                const data = await response.json();
                
                if (response.ok) {
                    // Save questions to localStorage and redirect
                    localStorage.setItem('currentQuestions', JSON.stringify(data.questions));
                    localStorage.setItem('quizSettings', JSON.stringify(settings));
                    window.location.href = '/renshuu';
                } else {
                    alert('Error: ' + data.error);
                }
            } catch (error) {
                console.error('Error:', error);
                alert('Terjadi kesalahan saat memuat soal');
            } finally {
                // Reset loading state
                document.getElementById('submitText').textContent = 'Mulai Latihan';
                document.getElementById('loadingSpinner').classList.add('hidden');
            }
        });

        // Load and display statistics
        function loadStatistics() {
            const stats = JSON.parse(localStorage.getItem('quizStats') || '{"totalQuizzes": 0, "scores": []}');
            
            document.getElementById('totalQuizzes').textContent = stats.totalQuizzes;
            
            if (stats.scores.length > 0) {
                const averageScore = Math.round(stats.scores.reduce((a, b) => a + b, 0) / stats.scores.length);
                const bestScore = Math.max(...stats.scores);
                
                document.getElementById('averageScore').textContent = averageScore + '%';
                document.getElementById('bestScore').textContent = bestScore + '%';
            }
        }

        // Load statistics on page load
        window.addEventListener('load', loadStatistics);

        // Close modal when clicking outside
        document.getElementById('settingsModal').addEventListener('click', (e) => {
            if (e.target === document.getElementById('settingsModal')) {
                closeModal();
            }
        });
document.querySelectorAll('button[data-target]').forEach(button => {
    button.addEventListener('click', function () {
      const targetId = this.getAttribute('data-target');
      const targetElement = document.getElementById(targetId);
      if (targetElement) {
        targetElement.scrollIntoView({ behavior: 'smooth' });
      }
    });
  });