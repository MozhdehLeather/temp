document.addEventListener('DOMContentLoaded', () => {
    const API = '/api/threads'; 
    const feed = document.getElementById('feed');
    const postForm = document.getElementById('postForm');
    const template = document.getElementById('threadTemplate').content;

    // Store voted threads in localStorage
    const voterId = localStorage.getItem('voterId') || Math.random().toString(36).substring(2) + Date.now();
    localStorage.setItem('voterId', voterId);

    // Load all threads
    async function loadThreads() {
        try {
            const response = await fetch(API);
            if (!response.ok) throw new Error('Network error');
            
            const threads = await response.json();
            feed.innerHTML = '';
            
            // Sort by newest first
            threads.sort((a, b) => b.id - a.id).forEach(renderThread);
        } catch (error) {
            console.error("Failed to load threads:", error);
            feed.innerHTML = '<div class="p-4 text-red-500">Error loading threads. Refresh or check server.</div>';
        }
    }

    // Render single thread
    function renderThread(thread) {
        const el = template.cloneNode(true);
        const authorName = thread.author || 'Anonymous';
        
        el.querySelector('.content').textContent = thread.content;
        el.querySelector('.author-name').textContent = authorName;
        el.querySelector('.user-initial').textContent = authorName.charAt(0).toUpperCase();
        el.querySelector('.like-count').textContent = thread.likes || 0;
        el.querySelector('.dislike-count').textContent = thread.dislikes || 0;
        el.querySelector('.timestamp').textContent = formatTime(thread.createdAt || thread.id);
        
        // Check if user already voted
        const liked = localStorage.getItem(`liked_${thread.id}_${voterId}`);
        const disliked = localStorage.getItem(`disliked_${thread.id}_${voterId}`);
        
        if (liked) el.querySelector('.like-btn').classList.add('liked');
        if (disliked) el.querySelector('.dislike-btn').classList.add('disliked');
        
        // Like button
        el.querySelector('.like-btn').addEventListener('click', async () => {
            if (disliked) return; // Can't like if already disliked
            
            if (!liked) {
                try {
                    await fetch(`${API}/${thread.id}`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ 
                            likes: (thread.likes || 0) + 1,
                            voters: [...(thread.voters || []), voterId]
                        })
                    });
                    localStorage.setItem(`liked_${thread.id}_${voterId}`, 'true');
                    loadThreads();
                } catch (error) {
                    console.error("Failed to like thread:", error);
                }
            }
        });

        // Dislike button
        el.querySelector('.dislike-btn').addEventListener('click', async () => {
            if (liked) return; // Can't dislike if already liked
            
            if (!disliked) {
                try {
                    await fetch(`${API}/${thread.id}`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ 
                            dislikes: (thread.dislikes || 0) + 1,
                            voters: [...(thread.voters || []), voterId]
                        })
                    });
                    localStorage.setItem(`disliked_${thread.id}_${voterId}`, 'true');
                    loadThreads();
                } catch (error) {
                    console.error("Failed to dislike thread:", error);
                }
            }
        });

        feed.appendChild(el);
    }

    // Create new thread
    postForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const content = document.getElementById('content').value.trim();
        if (!content) return;

        const author = document.getElementById('author').value.trim();

        try {
            await fetch(API, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    content,
                    author,
                    likes: 0,
                    dislikes: 0,
                    voters: [],
                    id: Date.now(),
                    createdAt: new Date().toISOString()
                })
            });
            postForm.reset();
            loadThreads();
        } catch (error) {
            console.error("Failed to create thread:", error);
            alert("Failed to post. Please try again.");
        }
    });

    // Format time
    function formatTime(timestamp) {
        const date = new Date(timestamp);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    // Initial load
    loadThreads();
});