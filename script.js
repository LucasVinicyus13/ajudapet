// ===== Page Loader =====
    window.addEventListener('load', function() {
      var loader = document.getElementById('pageLoader');
      setTimeout(function() {
        loader.classList.add('hidden');
        setTimeout(function() { loader.style.display = 'none'; }, 300);
      }, 600);
    });

    // ===== Like Button Toggle =====
    document.querySelectorAll('.like-btn').forEach(function(btn) {
      btn.addEventListener('click', function() {
        var post = this.closest('.post');
        var heartPath = this.querySelector('.heart-icon path');
        var likesEl = post.querySelector('.likes-count');
        var currentLikes = parseInt(post.getAttribute('data-likes'));
        var isLiked = this.classList.contains('liked');

        if (isLiked) {
          // Unlike
          this.classList.remove('liked');
          heartPath.setAttribute('fill', 'none');
          heartPath.setAttribute('stroke', '#262626');
          currentLikes--;
        } else {
          // Like
          this.classList.add('liked');
          heartPath.setAttribute('fill', '#E84855');
          heartPath.setAttribute('stroke', '#262626');
          currentLikes++;
        }

        post.setAttribute('data-likes', currentLikes);
        likesEl.textContent = currentLikes + ' curtidas';
      });
    });

    // ===== Double Tap to Like on Images =====
    document.querySelectorAll('.post-image-container').forEach(function(container) {
      var lastTap = 0;

      container.addEventListener('click', function(e) {
        var currentTime = new Date().getTime();
        var tapLength = currentTime - lastTap;

        if (tapLength < 350 && tapLength > 0) {
          // Double tap detected
          var post = this.closest('.post');
          var likeBtn = post.querySelector('.like-btn');
          var heartPath = likeBtn.querySelector('.heart-icon path');
          var likesEl = post.querySelector('.likes-count');
          var currentLikes = parseInt(post.getAttribute('data-likes'));
          var doubleTapHeart = this.querySelector('.double-tap-heart');

          // Show the big heart animation
          doubleTapHeart.classList.remove('show');
          void doubleTapHeart.offsetWidth; // force reflow
          doubleTapHeart.classList.add('show');

          // Like the post (only if not already liked)
          if (!likeBtn.classList.contains('liked')) {
            likeBtn.classList.add('liked');
            heartPath.setAttribute('fill', '#E84855');
            heartPath.setAttribute('stroke', '#262626');
            currentLikes++;
            post.setAttribute('data-likes', currentLikes);
            likesEl.textContent = currentLikes + ' curtidas';
          }

          // Remove animation class after it finishes
          setTimeout(function() {
            doubleTapHeart.classList.remove('show');
          }, 900);
        }

        lastTap = currentTime;
      });
    });

    // ===== Smooth scroll to top when clicking Home =====
    document.querySelector('.nav-item.active').addEventListener('click', function() {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
