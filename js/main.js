document.addEventListener('DOMContentLoaded', () => {
    // 1. Smooth Scroll for Anchor Links
    const anchorLinks = document.querySelectorAll('a[href^="#"]');

    anchorLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            const targetId = link.getAttribute('href');
            if (!targetId || targetId === '#') return;

            const targetElement = document.querySelector(targetId);
            if (targetElement) {
                e.preventDefault();
                const targetPosition = targetElement.getBoundingClientRect().top + window.pageYOffset;
                window.scrollTo({
                    top: targetPosition,
                    behavior: 'smooth'
                });
            }
        });
    });

    // 2. High-Performance RAF Scroll Controller
    // Unifies horizontal pinned scroll and scroll indicator without layout thrashing
    const releasesWrapper = document.querySelector('.releases-horizontal-wrapper');
    const releasesTrack = document.getElementById('releases-track');
    const releasesProgressBar = document.getElementById('releases-progress-bar');
    const releasesCurrentNum = document.getElementById('releases-current-num');
    const releasesTotalNum = document.getElementById('releases-total-num');
    const scrollIndicator = document.querySelector('.scroll-indicator');

    let cards = [];
    let isTicking = false;
    let scrollDistance = 0;
    let trackTravel = 0;

    if (releasesWrapper && releasesTrack) {
        cards = releasesTrack.querySelectorAll('.album-card');
        if (releasesTotalNum && cards.length > 0) {
            releasesTotalNum.textContent = String(cards.length).padStart(2, '0');
        }
    }

    const cacheDimensions = () => {
        if (releasesWrapper && releasesTrack) {
            scrollDistance = Math.max(0, releasesWrapper.offsetHeight - window.innerHeight);
            const trackWidth = releasesTrack.scrollWidth;
            const viewportWidth = window.innerWidth;
            trackTravel = Math.max(0, trackWidth - viewportWidth + (viewportWidth * 0.08));
        }
    };

    const updateScrollState = () => {
        // Horizontal Track Update with smooth clamping
        if (releasesWrapper && releasesTrack && scrollDistance > 0) {
            const wrapperRect = releasesWrapper.getBoundingClientRect();
            const scrolledAmount = -wrapperRect.top;
            const progress = Math.max(0, Math.min(1, scrolledAmount / scrollDistance));

            releasesTrack.style.transform = `translate3d(-${(progress * trackTravel).toFixed(2)}px, 0, 0)`;

            if (releasesProgressBar) {
                const barWidth = Math.max(8, progress * 100);
                releasesProgressBar.style.width = `${barWidth}%`;
            }

            if (releasesCurrentNum && cards.length > 0) {
                const activeIndex = Math.min(cards.length, Math.floor(progress * cards.length) + 1);
                releasesCurrentNum.textContent = String(activeIndex).padStart(2, '0');
            }
        }

        // Scroll Indicator Opacity
        if (scrollIndicator) {
            if (window.scrollY > 150) {
                scrollIndicator.style.opacity = '0';
                scrollIndicator.style.pointerEvents = 'none';
            } else {
                scrollIndicator.style.opacity = '1';
                scrollIndicator.style.pointerEvents = 'auto';
            }
        }

        isTicking = false;
    };

    const onScroll = () => {
        if (!isTicking) {
            requestAnimationFrame(updateScrollState);
            isTicking = true;
        }
    };

    // Cache initial dimensions and run initial frame
    cacheDimensions();
    updateScrollState();

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', () => {
        cacheDimensions();
        onScroll();
    }, { passive: true });

    // Recalibrate dimensions on window load and image load so no sizing is stuck
    window.addEventListener('load', () => {
        cacheDimensions();
        updateScrollState();
    });

    // Interactive Drag and Horizontal Wheel for Releases Track
    const trackContainer = document.querySelector('.releases-track-container');
    if (trackContainer && releasesWrapper) {
        let isPointerDown = false;
        let startPageX = 0;

        trackContainer.addEventListener('mousedown', (e) => {
            isPointerDown = true;
            startPageX = e.pageX;
        });

        window.addEventListener('mouseup', () => {
            isPointerDown = false;
        });

        trackContainer.addEventListener('mousemove', (e) => {
            if (!isPointerDown) return;
            e.preventDefault();
            const deltaX = (startPageX - e.pageX) * 1.6;
            window.scrollBy({ top: deltaX, behavior: 'auto' });
            startPageX = e.pageX;
        });

        // Delegate horizontal trackpad/wheel scrolls to smooth vertical page scroll
        trackContainer.addEventListener('wheel', (e) => {
            if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
                e.preventDefault();
                window.scrollBy({ top: e.deltaX * 1.2, behavior: 'auto' });
            }
        }, { passive: false });
    }

    // 3. Scroll Reveal (Fade-in Animation) with Immediate Visibility Fallback
    const fadeElements = document.querySelectorAll('.fade-in');
    
    if ('IntersectionObserver' in window) {
        const revealObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.05, rootMargin: '0px 0px 100px 0px' });

        fadeElements.forEach(el => revealObserver.observe(el));
    } else {
        fadeElements.forEach(el => el.classList.add('visible'));
    }

    // Fallback: Ensure any above-the-fold or quickly scrolled elements become visible
    const checkVisibleElements = () => {
        const threshold = window.innerHeight + 150;
        fadeElements.forEach(el => {
            const rect = el.getBoundingClientRect();
            if (rect.top < threshold) {
                el.classList.add('visible');
            }
        });
    };
    checkVisibleElements();
    setTimeout(checkVisibleElements, 400);

    // Image loading guarantee: ensure all images trigger dimension refresh and display
    document.querySelectorAll('img').forEach(img => {
        if (!img.complete) {
            img.addEventListener('load', () => cacheDimensions());
            img.addEventListener('error', () => {
                console.warn('Image load error:', img.src);
            });
        }
    });

    // 4. Gallery Tab Switching (Photos / Videos)
    const galleryTabs = document.querySelectorAll('.gallery-tab');
    const videoGrid = document.getElementById('gallery-videos');
    const photoGrid = document.getElementById('gallery-photos');

    galleryTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            galleryTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            const targetTab = tab.getAttribute('data-tab');

            if (videoGrid && photoGrid) {
                if (targetTab === 'videos') {
                    videoGrid.style.display = 'grid';
                    photoGrid.style.display = 'none';
                    // Ensure video grid items are immediately visible
                    videoGrid.querySelectorAll('.gallery-video').forEach(item => {
                        item.classList.add('visible');
                    });
                    // Ensure all video previews load their initial frame
                    videoGrid.querySelectorAll('video.video-preview').forEach(v => {
                        if (v.readyState === 0) {
                            v.load();
                        }
                    });
                } else if (targetTab === 'photos') {
                    photoGrid.style.display = 'grid';
                    videoGrid.style.display = 'none';
                    photoGrid.querySelectorAll('.gallery-photo').forEach(item => {
                        item.classList.add('visible');
                    });
                }
            }
        });
    });

    // 5. Media Lightbox (Photos & High-Definition Video Player)
    const galleryPhotos = document.querySelectorAll('.gallery-photo');
    const galleryVideos = document.querySelectorAll('.gallery-video');
    const lightbox = document.getElementById('lightbox');
    
    if (lightbox) {
        const contentBox = lightbox.querySelector('.lightbox-content');
        const lightboxClose = lightbox.querySelector('.lightbox-close');

        const openLightbox = (imgSrc) => {
            if (contentBox) contentBox.innerHTML = `<img src="${imgSrc}" alt="Gallery photo">`;
            lightbox.classList.add('active');
            document.body.style.overflow = 'hidden';
        };

        const openLightboxVideo = (videoSrc, title, venue) => {
            if (contentBox) {
                contentBox.innerHTML = `
                    <video src="${videoSrc}" controls autoplay playsinline preload="auto"></video>
                    ${title ? `
                        <div class="lightbox-caption">
                            <h4>${title}</h4>
                            ${venue ? `<span>${venue}</span>` : ''}
                        </div>
                    ` : ''}
                `;
            }
            lightbox.classList.add('active');
            document.body.style.overflow = 'hidden';
        };

        const closeLightbox = () => {
            lightbox.classList.remove('active');
            document.body.style.overflow = '';
            if (contentBox) {
                const vid = contentBox.querySelector('video');
                if (vid) {
                    vid.pause();
                    vid.src = '';
                }
                contentBox.innerHTML = '<img src="" alt="">';
            }
        };

        galleryPhotos.forEach(photo => {
            photo.addEventListener('click', () => {
                const img = photo.querySelector('img');
                if (img) openLightbox(img.src);
            });
        });

        galleryVideos.forEach(vidItem => {
            const previewVid = vidItem.querySelector('video.video-preview');

            // Ensure initial frame displays at 0.5s if paused
            if (previewVid) {
                previewVid.addEventListener('loadedmetadata', () => {
                    if (previewVid.currentTime === 0) {
                        previewVid.currentTime = 0.5;
                    }
                });

                // Desktop hover preview: play silently on mouseenter, pause & reset on mouseleave
                vidItem.addEventListener('mouseenter', () => {
                    previewVid.currentTime = 0;
                    previewVid.play().catch(() => {});
                });

                vidItem.addEventListener('mouseleave', () => {
                    previewVid.pause();
                    previewVid.currentTime = 0.5;
                });
            }

            vidItem.addEventListener('click', () => {
                if (previewVid) previewVid.pause();
                const videoSrc = vidItem.getAttribute('data-video');
                const title = vidItem.getAttribute('data-title') || '';
                const venue = vidItem.getAttribute('data-venue') || '';
                if (videoSrc) {
                    openLightboxVideo(videoSrc, title, venue);
                }
            });
        });

        if (lightboxClose) {
            lightboxClose.addEventListener('click', closeLightbox);
        }

        lightbox.addEventListener('click', (e) => {
            if (e.target === lightbox) {
                closeLightbox();
            }
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && lightbox.classList.contains('active')) {
                closeLightbox();
            }
        });
    }

    // 6. Dynamic Live Shows Fetcher from Backend
    const showsList = document.getElementById('shows-list');
    if (showsList) {
        const monthNames = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
        
        fetch(`/api/shows?_t=${Date.now()}`)
            .then(res => {
                if (!res.ok) throw new Error('API unreachable');
                return res.json();
            })
            .then(shows => {
                if (!Array.isArray(shows) || shows.length === 0) return;
                
                const liveShows = shows.filter(s => s.type === 'show' || !s.type);
                if (liveShows.length > 0) {
                    showsList.innerHTML = '';
                    liveShows.forEach(show => {
                        let month = 'TBD';
                        let day = '—';
                        if (show.date) {
                            const parts = show.date.split('-');
                            if (parts.length >= 3) {
                                const mIdx = parseInt(parts[1], 10) - 1;
                                month = monthNames[mIdx] || parts[1];
                                day = parts[2];
                            }
                        }

                        const item = document.createElement('div');
                        item.className = 'show-item fade-in visible';
                        item.innerHTML = `
                            <div class="show-date">
                                <span class="show-month">${month}</span>
                                <span class="show-day">${day}</span>
                            </div>
                            <div class="show-info">
                                <h3>${show.venue || 'Venue TBD'}</h3>
                                <p>${show.city || ''}</p>
                            </div>
                            <a href="${show.ticket_url || '#contact'}" class="btn-secondary" ${show.ticket_url && show.ticket_url.startsWith('http') ? 'target="_blank" rel="noopener"' : ''}>Tickets</a>
                        `;
                        showsList.appendChild(item);
                    });
                }
            })
            .catch(() => {
                // Keep default static shows in HTML as fallback
            });
    }

    // 7. Dynamic Karaoke Fetcher from Backend
    const karaokeCard = document.getElementById('karaoke-card');
    if (karaokeCard) {
        fetch(`/api/karaoke?_t=${Date.now()}`)
            .then(res => {
                if (!res.ok) throw new Error('Karaoke API unreachable');
                return res.json();
            })
            .then(karaoke => {
                if (!karaoke) return;
                if (karaoke.enabled === false) {
                    karaokeCard.style.display = 'none';
                    return;
                } else {
                    karaokeCard.style.display = '';
                }
                const titleEl = document.getElementById('karaoke-title');
                const schedEl = document.getElementById('karaoke-schedule');
                const venueEl = document.getElementById('karaoke-venue');
                const btnEl = document.getElementById('karaoke-btn');

                if (titleEl && karaoke.title) titleEl.textContent = karaoke.title;
                if (schedEl && karaoke.schedule) schedEl.textContent = karaoke.schedule;
                if (venueEl && karaoke.venue) venueEl.textContent = karaoke.venue;
                if (btnEl) {
                    if (karaoke.btn_text) btnEl.textContent = karaoke.btn_text;
                    if (karaoke.btn_link) {
                        btnEl.setAttribute('href', karaoke.btn_link);
                        if (karaoke.btn_link.startsWith('http')) {
                            btnEl.setAttribute('target', '_blank');
                            btnEl.setAttribute('rel', 'noopener');
                        } else {
                            btnEl.removeAttribute('target');
                            btnEl.removeAttribute('rel');
                        }
                    }
                }
            })
            .catch(() => {
                // Keep default static karaoke in HTML as fallback
            });
    }

    // 8. Dynamic Upcoming Single & Live Countdown Timer
    const singlePill = document.getElementById('upcoming-single-pill');
    const countdownEl = document.getElementById('upcoming-countdown');
    
    if (singlePill && countdownEl) {
        const daysEl = document.getElementById('cd-days');
        const hoursEl = document.getElementById('cd-hours');
        const minsEl = document.getElementById('cd-mins');
        const secsEl = document.getElementById('cd-secs');

        let targetDate = new Date(countdownEl.getAttribute('data-target') || '2026-11-15T13:00:00+05:30').getTime();

        const updateCountdown = () => {
            const now = new Date().getTime();
            const distance = targetDate - now;

            if (distance <= 0) {
                if (daysEl) daysEl.textContent = '00';
                if (hoursEl) hoursEl.textContent = '00';
                if (minsEl) minsEl.textContent = '00';
                if (secsEl) secsEl.textContent = '00';
                return;
            }

            const days = Math.floor(distance / (1000 * 60 * 60 * 24));
            const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((distance % (1000 * 60)) / 1000);

            if (daysEl) daysEl.textContent = String(days).padStart(2, '0');
            if (hoursEl) hoursEl.textContent = String(hours).padStart(2, '0');
            if (minsEl) minsEl.textContent = String(minutes).padStart(2, '0');
            if (secsEl) secsEl.textContent = String(seconds).padStart(2, '0');
        };

        // Run timer immediately and tick every second
        updateCountdown();
        const countdownInterval = setInterval(updateCountdown, 1000);

        // Fetch dynamic configuration from API if available
        fetch(`/api/single?_t=${Date.now()}`)
            .then(res => {
                if (!res.ok) throw new Error('Single API unreachable');
                return res.json();
            })
            .then(single => {
                if (!single) return;
                if (single.enabled === false) {
                    singlePill.style.display = 'none';
                    clearInterval(countdownInterval);
                    return;
                }
                const coverImgEl = document.getElementById('upcoming-single-cover');
                if (coverImgEl && single.cover_image) {
                    coverImgEl.src = single.cover_image;
                }
                if (single.release_date) {
                    const parsed = new Date(single.release_date).getTime();
                    if (!isNaN(parsed)) {
                        targetDate = parsed;
                        updateCountdown();
                    }
                }
            })
            .catch(() => {
                // Fallback to static countdown
            });
    }
});
