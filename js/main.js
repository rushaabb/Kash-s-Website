document.addEventListener('DOMContentLoaded', () => {
    // 1. Navbar Scroll Effect
    const navbar = document.getElementById('navbar');
    let ticking = false;

    window.addEventListener('scroll', () => {
        if (!ticking) {
            window.requestAnimationFrame(() => {
                if (navbar) {
                    if (window.scrollY > 80) {
                        navbar.classList.add('nav-scrolled');
                    } else {
                        navbar.classList.remove('nav-scrolled');
                    }
                }
                ticking = false;
            });
            ticking = true;
        }
    }, { passive: true });

    // 2. Mobile Nav Toggle
    const navToggle = document.querySelector('.nav-toggle');
    const navLinks = document.querySelector('.nav-links');

    if (navToggle && navLinks) {
        navToggle.addEventListener('click', () => {
            navToggle.classList.toggle('active');
            navLinks.classList.toggle('active');
        });

        const links = navLinks.querySelectorAll('a');
        links.forEach(link => {
            link.addEventListener('click', () => {
                navToggle.classList.remove('active');
                navLinks.classList.remove('active');
            });
        });
    }

    // 3. Smooth Scroll
    const anchorLinks = document.querySelectorAll('a[href^="#"]');
    const navHeight = 70; // Offset for navbar

    anchorLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            const targetId = link.getAttribute('href');
            if (targetId === '#') return;

            const targetElement = document.querySelector(targetId);
            if (targetElement) {
                e.preventDefault();
                const targetPosition = targetElement.getBoundingClientRect().top + window.pageYOffset - navHeight;
                window.scrollTo({
                    top: targetPosition,
                    behavior: 'smooth'
                });
            }
        });
    });

    // 4. Releases Horizontal Pinned Scroll
    const releasesWrapper = document.querySelector('.releases-horizontal-wrapper');
    const releasesTrack = document.getElementById('releases-track');
    const releasesProgressBar = document.getElementById('releases-progress-bar');
    const releasesCurrentNum = document.getElementById('releases-current-num');
    const releasesTotalNum = document.getElementById('releases-total-num');

    if (releasesWrapper && releasesTrack) {
        const cards = releasesTrack.querySelectorAll('.album-card');
        if (releasesTotalNum && cards.length > 0) {
            releasesTotalNum.textContent = String(cards.length).padStart(2, '0');
        }

        const handleHorizontalScroll = () => {
            const wrapperRect = releasesWrapper.getBoundingClientRect();
            const scrollDistance = releasesWrapper.offsetHeight - window.innerHeight;
            if (scrollDistance <= 0) return;

            const scrolledAmount = -wrapperRect.top;
            const progress = Math.max(0, Math.min(1, scrolledAmount / scrollDistance));

            // Calculate track travel distance
            const trackWidth = releasesTrack.scrollWidth;
            const viewportWidth = window.innerWidth;
            const totalTravel = Math.max(0, trackWidth - viewportWidth + (viewportWidth * 0.08));

            // Translate track horizontally
            releasesTrack.style.transform = `translateX(-${progress * totalTravel}px)`;

            // Update Progress Bar width
            if (releasesProgressBar) {
                const barWidth = Math.max(8, progress * 100);
                releasesProgressBar.style.width = `${barWidth}%`;
            }

            // Update Album Counter (e.g. 01, 02, 03, 04)
            if (releasesCurrentNum && cards.length > 0) {
                const activeIndex = Math.min(cards.length, Math.floor(progress * cards.length) + 1);
                releasesCurrentNum.textContent = String(activeIndex).padStart(2, '0');
            }
        };

        window.addEventListener('scroll', () => {
            window.requestAnimationFrame(handleHorizontalScroll);
        }, { passive: true });

        window.addEventListener('resize', () => {
            window.requestAnimationFrame(handleHorizontalScroll);
        });

        // Initialize state
        handleHorizontalScroll();
    }

    // 5. Scroll Reveal (Fade-in Animation)
    const fadeElements = document.querySelectorAll('.fade-in');
    
    if ('IntersectionObserver' in window) {
        const revealObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.1 });

        fadeElements.forEach(el => revealObserver.observe(el));
    } else {
        // Fallback for older browsers
        fadeElements.forEach(el => el.classList.add('visible'));
    }

    // 5. Gallery Tab Switching
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
                } else if (targetTab === 'photos') {
                    photoGrid.style.display = 'grid';
                    videoGrid.style.display = 'none';
                }
            }
        });
    });

    // 6. Photo Lightbox
    const galleryPhotos = document.querySelectorAll('.gallery-photo');
    const lightbox = document.getElementById('lightbox');
    
    if (lightbox) {
        const contentBox = lightbox.querySelector('.lightbox-content');

        const openLightbox = (imgSrc) => {
            if (contentBox) contentBox.innerHTML = `<img src="${imgSrc}" alt="Gallery photo">`;
            lightbox.classList.add('active');
            document.body.style.overflow = 'hidden';
        };

        const openLightboxVideo = (videoSrc, title, venue) => {
            if (contentBox) {
                contentBox.innerHTML = `
                    <video src="${videoSrc}" controls autoplay playsinline></video>
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

        const galleryVideos = document.querySelectorAll('.gallery-video');
        galleryVideos.forEach(vidItem => {
            vidItem.addEventListener('click', () => {
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

    // 7. Active Nav Link Highlight
    const sections = document.querySelectorAll('section[id]');
    
    window.addEventListener('scroll', () => {
        if (!ticking) {
            window.requestAnimationFrame(() => {
                let current = '';
                sections.forEach(section => {
                    const sectionTop = section.offsetTop;
                    const sectionHeight = section.clientHeight;
                    if (window.scrollY >= (sectionTop - navHeight - 100)) {
                        current = section.getAttribute('id');
                    }
                });

                if (navLinks) {
                    const links = navLinks.querySelectorAll('a');
                    links.forEach(link => {
                        link.classList.remove('active');
                        if (link.getAttribute('href') === `#${current}`) {
                            link.classList.add('active');
                        }
                    });
                }
            });
        }
    }, { passive: true });

    // 8. Scroll Indicator Hide
    const scrollIndicator = document.querySelector('.scroll-indicator');
    
    if (scrollIndicator) {
        window.addEventListener('scroll', () => {
            window.requestAnimationFrame(() => {
                if (window.scrollY > 200) {
                    scrollIndicator.style.opacity = '0';
                    scrollIndicator.style.pointerEvents = 'none';
                } else {
                    scrollIndicator.style.opacity = '1';
                    scrollIndicator.style.pointerEvents = 'auto';
                }
            });
        }, { passive: true });
    }

    // 9. Dynamic Live Shows Fetcher from Backend
    const showsList = document.getElementById('shows-list');
    if (showsList) {
        const monthNames = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
        
        fetch('/api/shows')
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

    // 10. Dynamic Karaoke Fetcher from Backend
    const karaokeCard = document.getElementById('karaoke-card');
    if (karaokeCard) {
        fetch('/api/karaoke')
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
                // Fallback: keep static default
            });
    }
});
