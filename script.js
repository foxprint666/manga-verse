/* ==========================================================================
   PATHANAMTHITTA CHRONICLES : VOL 1 MANGA PORTAL (PURE NARRATIVE EDITION)
   ========================================================================== */

// 1. FIREBASE CONFIGURATION
const FIREBASE_RTDB_URL = "https://comic-31451-default-rtdb.firebaseio.com";
let firebaseApp = null;
let firebaseDb = null;
let firebaseAuth = null;
let isFirebaseConnected = false;

// Authenticated User State
let currentAuthUser = null;

// Initialize Firebase
function initializeFirebasePortal() {
    try {
        if (typeof firebase !== 'undefined') {
            if (!firebase.apps.length) {
                firebaseApp = firebase.initializeApp({
                    databaseURL: FIREBASE_RTDB_URL,
                    apiKey: "AIzaSyDummyKeyForPublicRTDBMangaPortal123",
                    authDomain: "comic-31451.firebaseapp.com",
                    projectId: "comic-31451"
                });
            } else {
                firebaseApp = firebase.app();
            }
            firebaseDb = firebase.database();
            firebaseAuth = firebase.auth();
            isFirebaseConnected = true;
        } else {
            console.warn("Firebase SDK fallback mode");
        }
    } catch (e) {
        console.error("Firebase init error:", e);
    }

    loadSavedAuthProfile();
    startCommentsFeedListener();
    loadLibraryReleases();
}

// 2. USER AUTHENTICATION & PROFILE
function loadSavedAuthProfile() {
    const saved = localStorage.getItem("manga_auth_user");
    if (saved) {
        try {
            currentAuthUser = JSON.parse(saved);
            updateAuthUI();
        } catch (e) {
            currentAuthUser = null;
        }
    }
}

function updateAuthUI() {
    const headerBtnLabel = document.getElementById("auth-header-label");
    const headerAvatarIcon = document.getElementById("header-avatar-icon");
    const composeAvatar = document.getElementById("compose-avatar-circle");
    const commentSigninBtn = document.getElementById("btn-comment-signin");

    if (currentAuthUser) {
        const initial = (currentAuthUser.displayName || "U").charAt(0).toUpperCase();
        if (headerBtnLabel) headerBtnLabel.textContent = currentAuthUser.displayName;
        if (headerAvatarIcon) {
            headerAvatarIcon.textContent = initial;
            headerAvatarIcon.style.background = "#3b82f6";
            headerAvatarIcon.style.color = "white";
            headerAvatarIcon.style.borderRadius = "50%";
            headerAvatarIcon.style.width = "22px";
            headerAvatarIcon.style.height = "22px";
            headerAvatarIcon.style.display = "inline-flex";
            headerAvatarIcon.style.alignItems = "center";
            headerAvatarIcon.style.justifyContent = "center";
            headerAvatarIcon.style.fontSize = "0.75rem";
        }
        if (composeAvatar) composeAvatar.textContent = initial;
        if (commentSigninBtn) {
            commentSigninBtn.textContent = currentAuthUser.displayName;
            commentSigninBtn.classList.add("signed-in-user");
            commentSigninBtn.title = "Signed in as " + currentAuthUser.displayName;
        }
    } else {
        if (headerBtnLabel) headerBtnLabel.textContent = "Sign in";
        if (headerAvatarIcon) {
            headerAvatarIcon.textContent = "👤";
            headerAvatarIcon.style.background = "transparent";
        }
        if (composeAvatar) composeAvatar.textContent = "👤";
        if (commentSigninBtn) {
            commentSigninBtn.textContent = "Sign in with Google";
            commentSigninBtn.classList.remove("signed-in-user");
        }
    }
}

function openAuthModal() {
    const modal = document.getElementById("auth-modal-overlay");
    if (modal) modal.classList.remove("hidden");
}

function closeAuthModal() {
    const modal = document.getElementById("auth-modal-overlay");
    if (modal) modal.classList.add("hidden");
}

function firebaseSignInWithGoogle() {
    if (firebaseAuth && typeof firebase.auth.GoogleAuthProvider !== 'undefined') {
        const provider = new firebase.auth.GoogleAuthProvider();
        firebaseAuth.signInWithPopup(provider)
            .then((result) => {
                const user = result.user;
                currentAuthUser = {
                    displayName: user.displayName || "Manga Reader",
                    email: user.email || "reader@user.com",
                    uid: user.uid
                };
                localStorage.setItem("manga_auth_user", JSON.stringify(currentAuthUser));
                updateAuthUI();
                closeAuthModal();
            })
            .catch((err) => {
                console.warn("OAuth domain fallback:", err);
                const defaultName = prompt("Enter your display name to continue:", "Ashley Allen");
                if (defaultName) {
                    currentAuthUser = {
                        displayName: defaultName.trim(),
                        email: "user@manga.co",
                        uid: "user_" + Date.now()
                    };
                    localStorage.setItem("manga_auth_user", JSON.stringify(currentAuthUser));
                    updateAuthUI();
                    closeAuthModal();
                }
            });
    } else {
        const defaultName = prompt("Enter your name to sign in:", "Ashley Allen");
        if (defaultName) {
            currentAuthUser = {
                displayName: defaultName.trim(),
                email: "user@manga.co",
                uid: "user_" + Date.now()
            };
            localStorage.setItem("manga_auth_user", JSON.stringify(currentAuthUser));
            updateAuthUI();
            closeAuthModal();
        }
    }
}

function handleInstantAuthSubmit(e) {
    e.preventDefault();
    const nameInput = document.getElementById("auth-input-name");
    if (!nameInput) return;

    const nameVal = nameInput.value.trim();
    if (!nameVal) return;

    currentAuthUser = {
        displayName: nameVal,
        email: "user@manga.co",
        uid: "user_" + Date.now()
    };

    localStorage.setItem("manga_auth_user", JSON.stringify(currentAuthUser));
    updateAuthUI();
    closeAuthModal();
}

// 3. UNIVERSAL COMIC STICKER & REACTION BADGE GALLERY (100% UNIVERSALLY SUPPORTED)
const UNIVERSAL_REACTION_STICKERS = [
    { emoji: "💥", label: "SHOCK / BOOM", code: "sticker_boom" },
    { emoji: "⚔️", label: "KATANA SLASH", code: "sticker_slash" },
    { emoji: "🔥", label: "HYPE / FIRE", code: "sticker_fire" },
    { emoji: "🍿", label: "POPCORN", code: "sticker_popcorn" },
    { emoji: "⚡", label: "EPIC POWER", code: "sticker_epic" },
    { emoji: "🤯", label: "MIND BLOWN", code: "sticker_mindblown" },
    { emoji: "👑", label: "RESPECT / CROWN", code: "sticker_crown" },
    { emoji: "🚀", label: "ROCKET LAUNCH", code: "sticker_rocket" }
];

let selectedStickerCode = "";
let selectedCustomImageUrl = "";

function toggleGifPickerDrawer() {
    const drawer = document.getElementById("gif-picker-drawer");
    const urlInput = document.getElementById("custom-gif-url-input");
    if (!drawer) return;
    const isHidden = drawer.classList.contains("hidden");
    if (isHidden) {
        drawer.classList.remove("hidden");
        if (urlInput) urlInput.classList.remove("hidden");
        renderStickerGallery();
    } else {
        drawer.classList.add("hidden");
        if (urlInput) urlInput.classList.add("hidden");
    }
}

function renderStickerGallery() {
    const grid = document.getElementById("gif-gallery-grid");
    if (!grid) return;
    grid.innerHTML = UNIVERSAL_REACTION_STICKERS.map(st => `
        <div class="sticker-thumb-card" onclick="selectReactionSticker('${st.code}', '${st.emoji}', '${st.label}')">
            <span class="sticker-emoji">${st.emoji}</span>
            <span class="sticker-label">${st.label}</span>
        </div>
    `).join('');
}

function selectReactionSticker(code, emoji, label) {
    selectedStickerCode = code;
    selectedCustomImageUrl = "";
    const previewBox = document.getElementById("selected-gif-preview-container");
    const previewImg = document.getElementById("selected-gif-img");
    const drawer = document.getElementById("gif-picker-drawer");
    const urlInput = document.getElementById("custom-gif-url-input");

    if (previewBox && previewImg) {
        previewBox.innerHTML = `
            <div class="selected-gif-wrapper">
                <div class="comment-sticker-badge" style="font-size:1.1rem; padding:8px 16px;">
                    <span>${emoji}</span> <strong>${label}</strong>
                </div>
                <button class="remove-gif-btn" onclick="removeSelectedGif()">&times;</button>
            </div>
        `;
        previewBox.classList.remove("hidden");
    }
    if (drawer) drawer.classList.add("hidden");
    if (urlInput) urlInput.classList.add("hidden");
    updateCommentButtonState();
}

function removeSelectedGif() {
    selectedStickerCode = "";
    selectedCustomImageUrl = "";
    const previewBox = document.getElementById("selected-gif-preview-container");
    if (previewBox) {
        previewBox.classList.add("hidden");
        previewBox.innerHTML = `
            <div class="selected-gif-wrapper">
                <img id="selected-gif-img" src="" alt="Selected GIF">
                <button class="remove-gif-btn" id="btn-remove-gif">&times;</button>
            </div>
        `;
    }
    updateCommentButtonState();
}

function updateCommentButtonState() {
    const textInput = document.getElementById("comment-text-input");
    const customUrlInput = document.getElementById("custom-gif-url-input");
    const postBtn = document.getElementById("btn-post-comment");
    const cancelBtn = document.getElementById("btn-cancel-comment");
    if (!postBtn) return;

    const hasText = textInput && textInput.value.trim().length > 0;
    const hasSticker = Boolean(selectedStickerCode);
    const hasUrl = customUrlInput && customUrlInput.value.trim().length > 0;

    postBtn.disabled = !(hasText || hasSticker || hasUrl);
    if (cancelBtn) {
        if (hasText || hasSticker || hasUrl) {
            cancelBtn.classList.remove("hidden");
        } else {
            cancelBtn.classList.add("hidden");
        }
    }
}

// 4. CLEAN COMMENTS SECTION (INSTAGRAM / YOUTUBE STYLE WITH UNIVERSAL STICKER SUPPORT)
function startCommentsFeedListener() {
    if (isFirebaseConnected && firebaseDb) {
        const commentsRef = firebaseDb.ref("manga_comments/volume1");
        commentsRef.on("value", (snapshot) => {
            const data = snapshot.val();
            let commentsList = [];
            if (data) {
                Object.keys(data).forEach(key => {
                    commentsList.push({ id: key, ...data[key] });
                });
            }
            commentsList.sort((a, b) => (b.timestampMs || 0) - (a.timestampMs || 0));
            renderCommentsFeed(commentsList);
        });
    } else {
        fetch(`${FIREBASE_RTDB_URL}/manga_comments/volume1.json`)
            .then(res => res.json())
            .then(data => {
                let commentsList = [];
                if (data) {
                    Object.keys(data).forEach(key => {
                        commentsList.push({ id: key, ...data[key] });
                    });
                }
                commentsList.sort((a, b) => (b.timestampMs || 0) - (a.timestampMs || 0));
                renderCommentsFeed(commentsList);
            })
            .catch(() => {
                const local = JSON.parse(localStorage.getItem("manga_comments_local") || "[]");
                renderCommentsFeed(local);
            });
    }
}

function postComment() {
    const textInput = document.getElementById("comment-text-input");
    const customUrlInput = document.getElementById("custom-gif-url-input");

    if (!textInput) return;
    const textVal = textInput.value.trim();
    let finalUrl = customUrlInput ? customUrlInput.value.trim() : "";
    if (!textVal && !selectedStickerCode && !finalUrl) return;

    let authorName = currentAuthUser ? currentAuthUser.displayName : "Ashley Allen";

    const now = new Date();
    const newComment = {
        author: authorName,
        text: textVal,
        stickerCode: selectedStickerCode || "",
        customUrl: finalUrl || "",
        timeAgo: "Just now",
        timestampMs: now.getTime()
    };

    if (isFirebaseConnected && firebaseDb) {
        firebaseDb.ref("manga_comments/volume1").push(newComment);
    } else {
        fetch(`${FIREBASE_RTDB_URL}/manga_comments/volume1.json`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newComment)
        }).then(() => startCommentsFeedListener()).catch(() => {
            const local = JSON.parse(localStorage.getItem("manga_comments_local") || "[]");
            local.unshift(newComment);
            localStorage.setItem("manga_comments_local", JSON.stringify(local));
            renderCommentsFeed(local);
        });
    }

    textInput.value = "";
    removeSelectedGif();
    if (customUrlInput) {
        customUrlInput.value = "";
        customUrlInput.classList.add("hidden");
    }
    updateCommentButtonState();
}

function getStickerBadgeHtml(code) {
    const found = UNIVERSAL_REACTION_STICKERS.find(s => s.code === code);
    if (!found) return "";
    return `
        <div class="comment-sticker-badge">
            <span>${found.emoji}</span>
            <span>${found.label}</span>
        </div>
    `;
}

function renderCommentsFeed(commentsList) {
    const stream = document.getElementById("comments-feed-stream");
    const countEl = document.getElementById("comments-total-count");
    if (!stream) return;

    const count = commentsList ? commentsList.length : 0;
    if (countEl) countEl.textContent = String(count);

    if (!commentsList || commentsList.length === 0) {
        stream.innerHTML = `
            <div style="text-align:center; padding:2rem; color:var(--paper-muted); font-size:0.95rem;">
                No comments yet. Be the first to comment!
            </div>
        `;
        return;
    }

    stream.innerHTML = commentsList.map(item => {
        const initial = (item.author || "U").charAt(0).toUpperCase();
        return `
            <div class="comment-item-card">
                <div class="comment-avatar-col">
                    <div class="comment-avatar-circle">${initial}</div>
                </div>
                <div class="comment-content-col">
                    <div class="comment-meta-row">
                        <span class="comment-author-name">${escapeHtml(item.author || 'User')}</span>
                        <span class="comment-time">${item.timeAgo || 'Recently'}</span>
                    </div>
                    ${item.text ? `<div class="comment-body-text">${escapeHtml(item.text)}</div>` : ''}
                    ${item.stickerCode ? getStickerBadgeHtml(item.stickerCode) : ''}
                    ${item.customUrl ? `
                        <div class="comment-gif-wrap">
                            <img src="${escapeHtml(item.customUrl)}" alt="User attachment" class="comment-gif-img" loading="lazy">
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    }).join('');
}

function escapeHtml(str) {
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// 5. MANGA LIBRARY & UPLOADS
function loadLibraryReleases() {
    const grid = document.getElementById("manga-library-grid");
    if (!grid) return;

    let libraryHTML = `
        <div class="manga-release-card" onclick="switchMode('book')">
            <div class="manga-card-img-wrap">
                <span class="release-vol-tag">VOL 1</span>
                <span class="release-status-tag">COMPLETED ✅</span>
                <img src="assets/cover.jpg" alt="The Sovereign Forest">
            </div>
            <div class="manga-card-body">
                <h4>THE SOVEREIGN FOREST</h4>
                <div class="manga-tags">
                    <span class="genre-chip">SEINEN</span>
                    <span class="genre-chip">HISTORICAL</span>
                    <span class="genre-chip">ACTION</span>
                </div>
                <p>An authoritative historical epic of the Kollam–Pathanamthitta borderland hills. Follow Anandhu Moopan, Sheik Aslam A Salam, Adrin the Cow, Sooraj Santhosh, Hari, scientist Ashley, and more through 10 chapters of war, betrayal, and revolution.</p>
                <div class="card-read-btn">Read Volume 1</div>
            </div>
        </div>
    `;

    const localReleases = JSON.parse(localStorage.getItem("manga_uploaded_releases") || "[]");
    localReleases.forEach((rel, index) => {
        libraryHTML += `
            <div class="manga-release-card" onclick="openUploadedRelease(${index})">
                <div class="manga-card-img-wrap">
                    <span class="release-vol-tag">${escapeHtml(rel.volLabel || "VOL")}</span>
                    <span class="release-status-tag">${escapeHtml(rel.status || "NEW")}</span>
                    <img src="${rel.coverUrl || 'assets/cover.jpg'}" alt="${escapeHtml(rel.title)}">
                </div>
                <div class="manga-card-body">
                    <h4>${escapeHtml(rel.title)}</h4>
                    <div class="manga-tags">
                        ${(rel.tags || "SEINEN, ACTION").split(',').map(t => `<span class="genre-chip">${t.trim()}</span>`).join('')}
                    </div>
                    <p>${escapeHtml(rel.synopsis)}</p>
                    <div class="card-read-btn">View Release</div>
                </div>
            </div>
        `;
    });

    grid.innerHTML = libraryHTML;
}

function openUploadModal() {
    const modal = document.getElementById("upload-modal-overlay");
    if (modal) modal.classList.remove("hidden");
}

function closeUploadModal() {
    const modal = document.getElementById("upload-modal-overlay");
    if (modal) modal.classList.add("hidden");
}

function handleUploadSubmit(e) {
    e.preventDefault();
    const titleInput = document.getElementById("upload-manga-title");
    const volInput = document.getElementById("upload-manga-vol");
    const statusInput = document.getElementById("upload-manga-status");
    const urlInput = document.getElementById("upload-cover-url");
    const tagsInput = document.getElementById("upload-manga-tags");
    const synopsisInput = document.getElementById("upload-manga-synopsis");

    if (!titleInput || !synopsisInput) return;

    const newRelease = {
        title: titleInput.value.trim(),
        volLabel: volInput.value.trim() || "NEW VOL",
        status: statusInput.value || "NEW RELEASE",
        coverUrl: urlInput.value.trim() || "assets/cover.jpg",
        tags: tagsInput.value.trim() || "SEINEN, ACTION",
        synopsis: synopsisInput.value.trim(),
        author: currentAuthUser ? currentAuthUser.displayName : "Ashley Allen",
        timestamp: Date.now()
    };

    const localReleases = JSON.parse(localStorage.getItem("manga_uploaded_releases") || "[]");
    localReleases.unshift(newRelease);
    localStorage.setItem("manga_uploaded_releases", JSON.stringify(localReleases));

    if (isFirebaseConnected && firebaseDb) {
        firebaseDb.ref("manga_library").push(newRelease);
    } else {
        fetch(`${FIREBASE_RTDB_URL}/manga_library.json`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newRelease)
        }).catch(() => {});
    }

    closeUploadModal();
    loadLibraryReleases();
    alert(`Published "${newRelease.title}" successfully!`);
}

function openUploadedRelease(index) {
    const localReleases = JSON.parse(localStorage.getItem("manga_uploaded_releases") || "[]");
    const rel = localReleases[index];
    if (!rel) return;
    alert(`${rel.title} (${rel.volLabel})\n\nSynopsis:\n${rel.synopsis}\n\nAuthor: ${rel.author}`);
}

// 6. VOLUME 1 STORYBOARD (PURE AUTHORITATIVE NARRATIVE EDITION — NO DIALOGUE BOXES OR DOODLES)
const MANGA_ACTS = [
    {
        id: 1,
        actNumber: "PROLOGUE",
        title: "The Sovereign Forest",
        location: "Kollam–Pathanamthitta Borderland Hills",
        image: "assets/cover.jpg",
        sfx: "ゴゴゴゴ",
        sfxEnglish: "RUMBLE!! • SOVEREIGN ECHO",
        sfxType: "rumble",
        narrative: `For generations, the deep, uncharted hills of the borderlands between Kollam and Pathanamthitta belonged to the indigenous people. At the apex of this ancient community stood the Great Pathanamthitta Tribe, led by their formidable, revered chieftain, Anandhu Moopan. Holding the traditional title of Ooru Moopan, Anandhu was a leader of unyielding honor, fiercely dedicated to protecting his people’s ancestral lands and forest autonomy.<br><br>The peace of the hills was shattered when Vinayak Thevalli Raja, a ambitious feudal ruler associated with the prominent royal lineage of the Thevally region, sought to expand his kingdom. Desperate to monopolize the region's highly lucrative timber and spice routes, the Raja deployed his heavy infantry to conquer the highlands. However, the royal forces were no match for the terrain. Utilizing intimate knowledge of the rugged valleys, Moopan’s tribal warriors launched devastating ambushes, draining the royal treasury and fracturing the Raja's authority in a fierce regional revolt.`
    },
    {
        id: 2,
        actNumber: "ACT I",
        title: "The Serpent in the Sanctuary",
        location: "Sacred Boundary Stone Deep in the Forest",
        image: "assets/ambush.jpg",
        sfx: "ザッザッ",
        sfxEnglish: "STOMP STOMP!! • ARMORED AMBUSH",
        sfxType: "march",
        narrative: `Realizing his military could not break the tribal front lines, Vinayak Thevalli Raja grew desperate. It was then that a foreign variable entered the court of Thevally: Alen Das, an ambitious, highly intelligent Portuguese trader. Alen was a man driven entirely by vice, luxury, and self-interest. He was a notorious womanizer and a deeply unideal character, possessing zero loyalty to any crown or code; he merely craved the exclusive monopolies over pepper and cardamom to fund his hedonistic lifestyle.<br><br>Alen proposed a strategy of asymmetric warfare: destroying the tribe from within through systematic deception. Venturing into the hills alone, Alen presented himself to the tribe as a rogue merchant fleeing the Raja’s tyranny. While his silver tongue earned him the trust of the elders, his reckless vices quickly surfaced, causing quiet friction as he used his status to seduce local women.<br><br>Despite his flaws, Alen's tactical mind was sharp. He brought rare foreign medicines to cure a village outbreak and shared false "weaknesses" regarding the Raja's palace defenses. Over months, he mapped the tribe’s hidden supply lines and identified their core strength: their absolute devotion to Anandhu Moopan.<br><br>The deception culminated when Alen convinced Moopan that the Raja was broken and ready to sign a peace treaty recognizing tribal autonomy. He arranged a midnight meeting at a sacred boundary stone deep in the forest, insisting both leaders arrive unarmed. Trusting the trader, Anandhu Moopan arrived with only a small ceremonial guard. It was a fatal trap. Alen Das had secretly guided the Raja’s elite marksmen into ambush positions using the tribe's own hidden paths. Surrounded and outgunned, the tribal guard was cut down, and the great chieftain Anandhu Moopan was brought to his knees, breaking the spine of the rebellion.`
    },
    {
        id: 3,
        actNumber: "ACT II",
        title: "The Serpent's Ransom",
        location: "Secluded Coastal Outpost",
        image: "assets/aslam.jpg",
        sfx: "シュパッ",
        sfxEnglish: "SLASH!! • VENGEANCE BLADE",
        sfxType: "slash",
        narrative: `With Moopan captured, the Raja reclaimed the hills, but Alen Das did not fade away. Driven by insatiable greed, the rogue trader turned on the King. Threatening to expose the dishonorable ambush that violated the sacred forest laws, Alen began to ruthlessly blackmail Vinayak Thevalli Raja, demanding exorbitant gold payments to fund his vices in the coastal port towns.<br><br>Desperate to eliminate the foreign extortionist, the Raja turned to his most loyal commander, Sheik Aslam A Salam. Aslam was a fierce warrior, but he harbored a secret, profound grief. Years prior, during a severe famine that struck the regional military garrisons, the royal court had abandoned his people. It was Anandhu Moopan who had saved Aslam's immediate kin, sending massive carts loaded with cucumbers and brinjals from the fertile hill farms. Bound by unyielding gratitude, Aslam had become a quiet admirer of Moopan’s noble character.<br><br>Ordered to execute Alen Das, Aslam saw an opportunity for dual retribution. He used the trader’s lustful nature against him, leaking rumors of a wealthy merchant convoy laden with fine wine and foreign women arriving at a secluded coastal outpost. Blinded by vice, Alen arrived with minimal security. From the shadows, Sheik Aslam and his elite guards closed the trap. In his final moments, as Alen realized he had been completely outmaneuvered, Aslam made sure the blackmailer knew his death was a final receipt of payment for the cucumbers, the brinjals, and the fallen honor of Anandhu Moopan.`
    },
    {
        id: 4,
        actNumber: "ACT III",
        title: "The Fury of the Frontier",
        location: "Regional Gomatha Pastures & Combat Zone",
        image: "assets/gomatha.jpg",
        sfx: "モーモー",
        sfxEnglish: "MOOOOO!! • SACRED HERD FURY",
        sfxType: "horn",
        narrative: `The escalating conflict between the royal forces, the rogue mercenaries, and the remaining tribal factions began to leak into the surrounding valleys, claiming innocent collateral damage. Among the casualties was Adrin, the beloved cow of a passionate local cattle farmer named Sooraj Santhosh. Adrin was caught in the crossfire of a chaotic skirmish and tragically killed. Enraged by the loss and refusing to accept it as a mere consequence of war, Sooraj vowed vengeance.<br><br>Sooraj sought out Hari, the influential leader of the regional Gomatha Association. To Hari and his followers, the cow was not property—she was a living deity. Viewing Adrin’s death as the ultimate sacrilege, Hari mobilized a heavily armed vigilante vanguard of cattle protectors.<br><br>Driven by Sooraj’s grief and Hari’s ideological fervor, this volatile new faction marched directly into the combat zone. They completely disrupted the tactical chess match being played by Sheik Aslam and the remnants of Moopan's tribe, turning the political conflict into a multi-front war fueled by agrarian revolt and spiritual blood-feuds.`
    },
    {
        id: 5,
        actNumber: "ACT IV",
        title: "The Fatal Miscalculation",
        location: "Cleared Junction Deep in the Forest",
        image: "assets/standoff.jpg",
        sfx: "ドドン",
        sfxEnglish: "BOOM!! • DIPLOMATIC COLLAPSE",
        sfxType: "boom",
        narrative: `As the borderlands spiraled out of control, a regional neutral council attempted to halt the imminent bloodshed. They sent forward an envoy, Sidharth Seeju, a diplomat known for an eccentric personality and highly unorthodox communication style. Sidharth foolishly believed that the intense atmosphere of a war zone could be defused with a light, humorous touch rather than rigid political treaties.<br><br>Sidharth arranged a high-stakes standoff at a cleared junction deep in the forest. On one side stood Sheik Aslam and his battle-hardened veterans; on the other stood Hari and an enraged Sooraj Santhosh. Stepping into the dead space between the armies, Sidharth raised his hands to broker peace.<br><br>However, instead of addressing the political crisis, Sidharth attempted to break the ice with an incredibly poorly timed, tone-deaf, and highly offensive joke regarding the death of Adrin the cow. The words had barely left his mouth when the fragile diplomatic immunity shattered. Enraged by the blatant disrespect to their fallen deity, Hari and Sooraj's vanguard did not wait for negotiations. Before Sheik Aslam could intervene, a swift volley of arrows and blades cut Sidharth Seeju down instantly. His mission ended in blood, and all remaining restraint on the battlefield vanished.`
    },
    {
        id: 6,
        actNumber: "ACT V",
        title: "The Timber Rocket and the Tragic Legend",
        location: "The Smoky Front Line & Rocket Batteries",
        image: "assets/ashley_male.jpg",
        sfx: "ズバババ",
        sfxEnglish: "WHOOSH-BANG!! • TIMBER ROCKET BARRAGE",
        sfxType: "rocket",
        narrative: `With an all-out war declared, the rebel alliance gained an unexpected technological advantage. Ashley, a brilliant but wildly eccentric regional scientist who had been working in isolation on the fringes of the forest, joined the fray. Lacking conventional metals, Ashley had successfully engineered a volatile, destructive artillery weapon constructed entirely out of reinforced timber and localized chemical ash propellants. Aligning himself with Sheik Aslam, Ashley brought his timber rocket batteries to the front line to provide devastating fire support against the monarchy.<br><br>Seeing his general turn against him and realizing the threat of Ashley's rockets, Vinayak Thevalli Raja summoned his ultimate weapon: Alen Baiju. Famed across the southern principalities, Alen Baiju was a legendary warrior known for lethal speed and unmatched tactical genius. He was also a man of remarkably short height. Taking command of the Raja’s vanguard, Alen Baiju deployed the elite infantry to intercept Ashley’s rocket pads, rapidly shifting the tide of battle back to the crown.<br><br>However, in the thick smoke and chaos of the frontline, tragedy struck. Standing low to the ground amidst the fog of war, Alen Baiju stepped directly behind one of his own army's massive war elephants. Because of his short stature, the mahout high above could not see him, and the colossal beast took a heavy backward step, stomping the legendary warrior to death instantly. The sudden, bizarre demise of their greatest champion threw the royal ranks into absolute disarray just as Ashley ignited the first full rocket barrages.`
    },
    {
        id: 7,
        actNumber: "ACT VI",
        title: "The Royal Coalition",
        location: "Southern Horizons & Imperial Front",
        image: "assets/elephant.jpg",
        sfx: "ドガガガ",
        sfxEnglish: "TRUMPET-CRASH!! • IMPERIAL PHALANX",
        sfxType: "trumpet",
        narrative: `Just as the royal lines began to fracture under Ashley’s devastating timber rocket fire, a thunderous blare of conch shells echoed from the southern horizons. Recognizing that the fall of the Thevalli territory would destabilize the realm, the supreme sovereign stepped onto the battlefield: His Great Holy Highness, the Travancore King Adith. King Adith brought with him the immense wealth of the central state treasury and its elite standing regiments.<br><br>Marching alongside King Adith was his most ruthless military commander, the notorious Dictator Niranjan. Known for his iron-fisted rule and zero-tolerance policy for insurrections, Niranjan deployed a terrifying, highly organized war machine. His forces moved in flawless phalanx formations, equipped with heavy artillery and specialized anti-siege shields designed specifically to withstand experimental projectiles.<br><br>By uniting the remnants of the Thevalli guard, the supreme imperial forces of King Adith, and the disciplined vanguard of Dictator Niranjan, the royalists established a massive, overwhelming coalition force that completely halted the rebel momentum.`
    },
    {
        id: 8,
        actNumber: "ACT VII",
        title: "The Gathering of the Bloodline and the Silver Giant",
        location: "The Grand Opposition Battlefield",
        image: "assets/giant.jpg",
        sfx: "カキィィン",
        sfxEnglish: "CLANG-CLASH!! • SILVER GIANT STEEL",
        sfxType: "clash",
        narrative: `The battlefield fractured even further as the past actions of Alen Das caught up with the present. Although Alen Das had been executed, his lifetime of international womanizing had left behind a volatile legacy. Across the globe, dozens of his illegitimate sons learned of his death. Bound by blood and a desire to claim the lucrative spice trade routes, they united to form a powerful mercenary syndicate known as the Das Army.<br><br>The undisputed leader of this global brotherhood was Midhun Money, a cold, hyper-powerful figure who controlled the syndicate’s massive offshore wealth. Midhun's arrival was fueled by a bitter, personal vendetta: years prior, Hari and the Gomatha Association had aggressively looted and dismantled Midhun’s mass-production chicken farm to claim the land for sacred pastures. To ensure total annihilation of his enemies, Midhun brought along Francis, a terrifying, 7-foot-tall silver giant armored in custom-forged plate-mail that effortlessly deflected standard blades.<br><br>Refusing to bow to the King or the rebels, the powerful Das Army established a massive, heavily armed Grand Opposition, forming a destructive third front on the battlefield. Midhun Money unleashed the towering Francis directly onto Hari’s forces, while the rest of the Das brothers prepared to hunt down Sheik Aslam to avenge their father.`
    },
    {
        id: 9,
        actNumber: "ACT VIII",
        title: "The Apocalypse of the Frontier",
        location: "The Blood-Soaked Valley & Sovereign Archives",
        image: "assets/victory.jpg",
        sfx: "ワアアア",
        sfxEnglish: "ROAR!! • FINAL SOVEREIGN VICTORY",
        sfxType: "victory",
        narrative: `The grand war erupted in an apocalyptic clash of three massive factions. Dictator Niranjan’s iron phalanx clashed with the global mercenaries, while Ashley’s timber rockets screamed through the sky, exploding into clouds of chemically weaponized ash.<br><br>Amidst this chaos, a horrifying misunderstanding took place on the rebel frontline. Desperate to feed his starving troops, Sheik Aslam ordered a communal cookfire. In the blinding smoke, his men mistakenly slaughtered and began roasting a stray cow over the open flames. Watching from across the valley, Sooraj Santhosh witnessed this supreme sacrilege. The intense mental torture of seeing the animal he worshiped being roasted by his own allies broke his mind. Paralyzed by pure spiritual despair, Sooraj Santhosh’s heart failed, and he collapsed and died on the spot.<br><br>Witnessing Sooraj's death, Hari fell into a state of unhinged fury, leading the Gomatha Association in a suicidal charge directly into Midhun Money's Grand Opposition. As Francis the silver giant trampled the vanguard, Ashley redirected a heavy timber rocket, striking the 7-foot giant square in the chest. The volatile blast cracked the silver armor, allowing Hari to bring the giant down. Breathing his last, Hari breached the lines and eliminated Midhun Money, completely shattering the Das Army at the cost of his own life.<br><br>With the Grand Opposition wiped out, Sheik Aslam launched a brilliant counter-offensive that outmaneuvered Dictator Niranjan's iron phalanx, causing the collapse of the royal army. Charging through the broken lines, Aslam confronted Vinayak Thevalli Raja and King Adith. Recognizing that the war was born from royal greed and the theft of tribal land, Aslam executed Vinayak Thevalli Raja for his historical crimes. He forced the supreme Travancore King Adith to surrender and sign a binding treaty, returning the sovereign rights of the Pathanamthitta forests to the surviving elders of Anandhu Moopan’s tribe. The rightful victory was achieved, and the true, gritty account was written down on fragile paper ledgers, buried deep within the un-digitized archives of the local government library.`
    },
    {
        id: 10,
        actNumber: "POST-CREDIT",
        title: "The Embers of New Conquest",
        location: "Secluded Valley Outpost of Scientist Ashley",
        image: "assets/assassins.jpg",
        sfx: "スウウウ",
        sfxEnglish: "SHHH... SLASH!! • SILENT ASSASSIN BLADE",
        sfxType: "shadow",
        narrative: `The smoke of the grand war had finally settled over the blood-soaked hills. Deep within a secluded valley outpost, the brilliant scientist Ashley stood alone under the dim light of an oil lamp, quietly packing away his remaining blueprints and the charred schematics of his legendary timber-and-ash rockets. He prepared to retire into peace.<br><br>Suddenly, the air inside the outpost grew deathly cold. From the darkness of the doorway stepped Nabeel, a silent, shadow-bound assassin wrapped in midnight-black garments, gripping a dual-pronged thrusting blade. Simultaneously, blocking the main exit, emerged Habeeb Ikachi, a terrifying ronin samurai clad in dark, battle-scarred iron armor, his hand resting tightly on the hilt of a razor-sharp katana.<br><br>Ashley spun around, his eyes widening. "Who sent you? The King is broken! The war is over!"<br><br>"The war for this forest is over, scientist," Nabeel’s voice whispered from beneath his mask. "But a grander conquest is just beginning."<br><br>Before Ashley could reach for an ignition fuse, Nabeel vanished into a blur of motion. A silent, blinding strike pierced the air. In the exact same breath, Habeeb Ikachi’s katana left its scabbard with a sharp, metallic ring, executing a flawless, lightning-fast crescent slash.<br><br>Ashley gasped, stepping backward as his master blueprints slipped from his fingers, splashing into the pool of blood spreading across the floor. He collapsed into the shadows, dead.<br><br>Habeeb Ikachi calmly wiped the blood from his blade and sheathed it. Nabeel stepped over the fallen scientist, reaching down to scoop up the master schematics of the timber rocket technology—the ultimate weapon of long-range devastation. Looking out into the vast, unprotected horizon stretching far beyond the borders of Travancore, Habeeb Ikachi gave a cold, ruthless nod to his assassin partner. Armed with the weapon of the gods, the assassin Nabeel and the samurai Habeeb Ikachi turned their backs on the dead ashes of Pathanamthitta, embarking on a terrifying new journey of global conquest.<br><br>The saga of the frontier has ended, and a new journey of global conquest has begun.`
    }
];

// 7. CURRENT STATE & NAVIGATION
let currentActIndex = 0;
let currentViewMode = 'home';
let isSfxEnabled = true;

window.addEventListener("DOMContentLoaded", () => {
    initializeFirebasePortal();
    setupNavigationButtons();
    setupSFXToggle();
    setupUploadModalHandlers();
    setupCommentHandlers();
    renderSubheaderPills();
    renderBookReader(0);
    renderWebtoonStream();
    renderCharacterCodex();
    renderInteractiveMap();
    renderChronologicalTimeline();

    window.addEventListener("keydown", (e) => {
        if (currentViewMode === 'book') {
            if (e.key === "ArrowLeft") navigateBookPage(-1);
            else if (e.key === "ArrowRight") navigateBookPage(1);
        }
    });
});

function switchMode(mode) {
    currentViewMode = mode;
    document.querySelectorAll(".view-panel").forEach(panel => panel.classList.remove("active"));
    document.querySelectorAll(".mode-nav .nav-btn").forEach(btn => btn.classList.remove("active"));

    const subheader = document.getElementById("subheader-bar");
    const targetPanel = document.getElementById(`view-${mode === 'book' ? 'book-reader' : mode}`);
    const targetBtn = document.getElementById(`btn-mode-${mode}`);

    if (targetPanel) targetPanel.classList.add("active");
    if (targetBtn) targetBtn.classList.add("active");

    if (mode === 'book' || mode === 'webtoon') {
        if (subheader) subheader.classList.remove("hidden");
    } else {
        if (subheader) subheader.classList.add("hidden");
    }
}

function setupNavigationButtons() {
    document.getElementById("btn-mode-home")?.addEventListener("click", () => switchMode('home'));
    document.getElementById("btn-mode-book")?.addEventListener("click", () => switchMode('book'));
    document.getElementById("btn-mode-webtoon")?.addEventListener("click", () => switchMode('webtoon'));
    document.getElementById("btn-mode-codex")?.addEventListener("click", () => switchMode('codex'));
    document.getElementById("btn-mode-map")?.addEventListener("click", () => switchMode('map'));

    document.getElementById("btn-prev-page")?.addEventListener("click", () => navigateBookPage(-1));
    document.getElementById("btn-next-page")?.addEventListener("click", () => navigateBookPage(1));

    document.getElementById("btn-open-toc")?.addEventListener("click", openTOCModal);
    document.getElementById("btn-close-toc")?.addEventListener("click", closeTOCModal);
}

function setupSFXToggle() {
    const sfxBtn = document.getElementById("btn-toggle-sfx");
    sfxBtn?.addEventListener("click", () => {
        isSfxEnabled = !isSfxEnabled;
        if (isSfxEnabled) {
            sfxBtn.innerHTML = `🔊 SFX`;
            sfxBtn.classList.remove("sfx-off");
        } else {
            sfxBtn.innerHTML = `🔇 SFX`;
            sfxBtn.classList.add("sfx-off");
        }
    });
}

function setupUploadModalHandlers() {
    document.getElementById("btn-open-upload-modal")?.addEventListener("click", openUploadModal);
    document.getElementById("btn-close-upload-modal")?.addEventListener("click", closeUploadModal);
    document.getElementById("btn-cancel-upload")?.addEventListener("click", closeUploadModal);
    document.getElementById("upload-manga-form")?.addEventListener("submit", handleUploadSubmit);

    const fileInput = document.getElementById("upload-cover-file");
    const urlInput = document.getElementById("upload-cover-url");
    const previewBox = document.getElementById("upload-cover-preview");
    const previewImg = document.getElementById("upload-preview-img");

    fileInput?.addEventListener("change", (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                if (previewImg && previewBox) {
                    previewImg.src = event.target.result;
                    previewBox.classList.remove("hidden");
                    if (urlInput) urlInput.value = event.target.result;
                }
            };
            reader.readAsDataURL(file);
        }
    });

    urlInput?.addEventListener("input", (e) => {
        const val = e.target.value.trim();
        if (val && previewImg && previewBox) {
            previewImg.src = val;
            previewBox.classList.remove("hidden");
        }
    });
}

function setupCommentHandlers() {
    document.getElementById("btn-open-auth-modal")?.addEventListener("click", openAuthModal);
    document.getElementById("btn-close-auth-modal")?.addEventListener("click", closeAuthModal);
    document.getElementById("btn-comment-signin")?.addEventListener("click", openAuthModal);
    document.getElementById("instant-auth-form")?.addEventListener("submit", handleInstantAuthSubmit);

    document.getElementById("btn-post-comment")?.addEventListener("click", postComment);
    document.getElementById("btn-toggle-gif-picker")?.addEventListener("click", toggleGifPickerDrawer);
    document.getElementById("btn-close-gif-picker")?.addEventListener("click", () => {
        document.getElementById("gif-picker-drawer")?.classList.add("hidden");
    });
    document.getElementById("btn-remove-gif")?.addEventListener("click", removeSelectedGif);

    const textInput = document.getElementById("comment-text-input");
    const customUrlInput = document.getElementById("custom-gif-url-input");
    textInput?.addEventListener("input", updateCommentButtonState);
    customUrlInput?.addEventListener("input", updateCommentButtonState);
}

// 8. BOOK READER RENDERING (PURE NARRATIVE EDITION — ZERO DIALOGUES OR DOODLES)
function renderBookReader(index) {
    if (index < 0) index = 0;
    if (index >= MANGA_ACTS.length) index = MANGA_ACTS.length - 1;
    currentActIndex = index;

    const act = MANGA_ACTS[index];
    const stage = document.getElementById("manga-page-stage");
    if (!stage) return;

    stage.innerHTML = `
        <div class="manga-page-content">
            <div class="page-act-header">
                <div>
                    <span class="act-number-tag">${act.actNumber} • SOVEREIGN FOREST</span>
                    <h2>${act.title}</h2>
                </div>
                <span class="act-location-badge">📍 ${act.location}</span>
            </div>

            <div class="manga-visual-panel" onclick="playComicSoundEffect('${act.sfxType}', '${act.sfxEnglish}')">
                <img src="${act.image}" alt="${act.title}">
                <span class="sfx-stamp">${act.sfx}</span>
                <span class="sfx-stamp-english">${act.sfxEnglish}</span>
                <div class="panel-caption">
                    <span>SFX: <strong>${act.sfxEnglish}</strong></span>
                    <span>Page ${index + 1} of 10</span>
                </div>
            </div>

            <div class="narrator-box">
                ${act.narrative}
            </div>
        </div>
    `;

    const indicator = document.getElementById("book-page-indicator");
    const progressBar = document.getElementById("book-progress-bar");
    if (indicator) indicator.textContent = `VOLUME 1 • ${act.actNumber} • PAGE ${index + 1} / ${MANGA_ACTS.length}`;
    if (progressBar) progressBar.style.width = `${((index + 1) / MANGA_ACTS.length) * 100}%`;

    document.querySelectorAll(".act-pill-link").forEach((pill, i) => {
        pill.classList.toggle("current", i === index);
    });
}

function navigateBookPage(delta) {
    const nextIdx = currentActIndex + delta;
    if (nextIdx >= 0 && nextIdx < MANGA_ACTS.length) {
        renderBookReader(nextIdx);
    }
}

function renderSubheaderPills() {
    const container = document.getElementById("chapter-pills-bar");
    if (!container) return;
    container.innerHTML = MANGA_ACTS.map((act, i) => `
        <button class="act-pill-link ${i === 0 ? 'current' : ''}" onclick="jumpToAct(${i})">
            ${act.actNumber}
        </button>
    `).join('');
}

function jumpToAct(index) {
    renderBookReader(index);
    if (currentViewMode !== 'book') switchMode('book');
}

// 9. WEBTOON STREAM RENDERING (PURE NARRATIVE EDITION — ZERO DIALOGUES OR DOODLES)
function renderWebtoonStream() {
    const container = document.getElementById("webtoon-container");
    if (!container) return;
    container.innerHTML = MANGA_ACTS.map((act, idx) => `
        <div class="webtoon-act-block">
            <div class="page-act-header">
                <div>
                    <span class="act-number-tag">${act.actNumber} • WEBTOON #${idx + 1}</span>
                    <h2>${act.title}</h2>
                </div>
                <span class="act-location-badge">📍 ${act.location}</span>
            </div>

            <div class="manga-visual-panel" onclick="playComicSoundEffect('${act.sfxType}', '${act.sfxEnglish}')">
                <img src="${act.image}" alt="${act.title}" loading="lazy">
                <span class="sfx-stamp">${act.sfx}</span>
                <span class="sfx-stamp-english">${act.sfxEnglish}</span>
                <div class="panel-caption">
                    <span>SFX: <strong>${act.sfxEnglish}</strong></span>
                    <span>Act ${idx + 1} of 10</span>
                </div>
            </div>

            <div class="narrator-box">
                ${act.narrative}
            </div>
        </div>
    `).join('');
}

// 10. CHARACTER CODEX (EXACT 16 AUTHORITATIVE CHARACTERS)
const CHARACTERS_DATABASE = [
    {
        name: "Anandhu Moopan",
        faction: "tribal",
        factionLabel: "Pathanamthitta Tribe",
        title: "Ooru Moopan • Apex Chieftain",
        desc: "The formidable, revered leader of the Great Pathanamthitta Tribe. A leader of unyielding honor fiercely dedicated to protecting his people's ancestral lands and forest autonomy.",
        stats: { honor: "100", leadership: "100", resilience: "98" }
    },
    {
        name: "Vinayak Thevalli Raja",
        faction: "royal",
        factionLabel: "Thevally Royalty",
        title: "Ambitious Feudal Conqueror",
        desc: "An ambitious feudal ruler of the prominent royal lineage of Thevally who sought to expand his kingdom and monopolize the timber and spice routes.",
        stats: { ambition: "98", power: "95", cruelty: "92" }
    },
    {
        name: "Alen Das",
        faction: "mercenary",
        factionLabel: "Portuguese Rogue Trader",
        title: "Ambitious Trader & Deceitful Blackmailer",
        desc: "An intelligent Portuguese trader driven by vice, luxury, and self-interest. Used systematic deception to lure Moopan into an ambush, then blackmailed the Raja for gold.",
        stats: { deception: "100", greed: "100", tactics: "95" }
    },
    {
        name: "Sheik Aslam A Salam",
        faction: "tribal",
        factionLabel: "Loyal Commander & Rebel Blademaster",
        title: "Avenger of Honor • Defender of Kin",
        desc: "A fierce warrior who remembered Anandhu Moopan saving his kin with carts of cucumbers and brinjals during a famine. Lured and executed blackmailer Alen Das, later leading the rebel counter-offensive.",
        stats: { swordsmanship: "100", loyalty: "100", gratitude: "100" }
    },
    {
        name: "Sooraj Santhosh",
        faction: "gomatha",
        factionLabel: "Gomatha Association",
        title: "Passionate Cattle Farmer",
        desc: "A passionate cattle farmer who loved his cow Adrin. When Adrin was killed in the crossfire of war, Sooraj vowed vengeance and rallied the Gomatha Association.",
        stats: { devotion: "99", grief: "98", agrarian: "95" }
    },
    {
        name: "Adrin",
        faction: "gomatha",
        factionLabel: "Sacred Cattle Deity",
        title: "The Beloved Cow of Sooraj Santhosh",
        desc: "The beloved cow of farmer Sooraj Santhosh, revered as a living deity by Hari and the Gomatha Association. Her tragic death in battle ignited a multi-front agrarian blood-feud.",
        stats: { divinity: "100", innocence: "100", reverence: "100" }
    },
    {
        name: "Hari",
        faction: "gomatha",
        factionLabel: "Gomatha Association",
        title: "Spiritual Leader of the Cattle Protectors",
        desc: "The influential leader of the Gomatha Association who viewed Adrin as a living deity. Led a heavily armed vigilante vanguard, ultimately sacrificing his life to slay Midhun Money and the silver giant.",
        stats: { zeal: "100", combat: "96", vengeance: "99" }
    },
    {
        name: "Sidharth Seeju",
        faction: "royal",
        factionLabel: "Neutral Council Diplomat",
        title: "Eccentric Envoy of Unorthodox Diplomacy",
        desc: "An envoy from a regional neutral council who foolishly attempted to defuse a high-stakes standoff with an offensive joke about Adrin's death, resulting in his immediate demise.",
        stats: { humor: "10", tact: "5", diplomacy: "20" }
    },
    {
        name: "Ashley",
        faction: "tribal",
        factionLabel: "Rebel Scientist & Inventor",
        title: "Eccentric Master of Timber Rockets",
        desc: "A brilliant, wildly eccentric regional scientist who engineered volatile artillery weapons constructed entirely out of reinforced timber and chemical ash propellants.",
        stats: { intellect: "100", innovation: "100", artillery: "98" }
    },
    {
        name: "Alen Baiju",
        faction: "royal",
        factionLabel: "Thevally Vanguard",
        title: "Legendary Short-Statured Champion",
        desc: "Famed across southern principalities for lethal speed and tactical genius. Because of his remarkably short height, a war elephant's mahout could not see him, and he was accidentally stomped to death.",
        stats: { speed: "99", tactics: "97", stature: "25" }
    },
    {
        name: "King Adith",
        faction: "royal",
        factionLabel: "Supreme Sovereign of Travancore",
        title: "His Great Holy Highness",
        desc: "The supreme sovereign of Travancore who brought central treasury wealth and standing regiments to save the realm, eventually signing the binding treaty returning tribal forest rights.",
        stats: { sovereignty: "100", wealth: "100", authority: "98" }
    },
    {
        name: "Dictator Niranjan",
        faction: "royal",
        factionLabel: "Travancore Imperial Guard",
        title: "Iron-Fisted Commander of the Phalanx",
        desc: "A notorious military dictator known for iron-fisted rule. Deployed flawless phalanx formations with heavy artillery and specialized anti-siege shields against Ashley's rockets.",
        stats: { discipline: "100", defense: "99", cruelty: "96" }
    },
    {
        name: "Midhun Money",
        faction: "mercenary",
        factionLabel: "Das Army Brotherhood",
        title: "Offshore Wealth Warlord",
        desc: "An illegitimate son of Alen Das who united his brothers into the Das Army. Harbored a bitter vendetta against Hari for looting his mass-production chicken farm.",
        stats: { wealth: "99", vendetta: "98", power: "97" }
    },
    {
        name: "Francis",
        faction: "mercenary",
        factionLabel: "Das Army Brotherhood",
        title: "7-Foot-Tall Silver Giant",
        desc: "A terrifying 7-foot-tall juggernaut armored in custom-forged plate-mail that effortlessly deflected blades. Cracked by a timber rocket and brought down by Hari.",
        stats: { height: "100", armor: "99", strength: "99" }
    },
    {
        name: "Nabeel",
        faction: "shadow",
        factionLabel: "Shadow Assassins",
        title: "Silent Assassin of the Midnight Blade",
        desc: "A silent, shadow-bound assassin wrapped in midnight-black garments who wields a dual-pronged thrusting blade. Executed scientist Ashley to steal the rocket schematics.",
        stats: { stealth: "100", speed: "99", lethality: "99" }
    },
    {
        name: "Habeeb Ikachi",
        faction: "shadow",
        factionLabel: "Shadow Assassins",
        title: "Terrifying Ronin Samurai",
        desc: "A terrifying ronin samurai clad in battle-scarred iron armor wielding a razor-sharp katana. Partnered with Nabeel to seize the timber rocket technology for global conquest.",
        stats: { swordsmanship: "100", ruthlessness: "99", conquest: "100" }
    }
];

function renderCharacterCodex() {
    const grid = document.getElementById("codex-grid");
    if (!grid) return;
    grid.innerHTML = CHARACTERS_DATABASE.map((c, i) => `
        <div class="character-card" onclick="openCharacterModal(${i})">
            <div class="char-card-header">
                <h4 class="char-name">${c.name}</h4>
                <span class="char-faction-badge">${c.factionLabel}</span>
            </div>
            <div class="char-card-body">
                <span class="char-title-sub">${c.title}</span>
                <p class="char-description">${c.desc}</p>
                <div class="char-stats-bar">
                    ${Object.entries(c.stats).map(([k, v]) => `
                        <div class="stat-chip">${k.toUpperCase()}: <span>${v}</span></div>
                    `).join('')}
                </div>
            </div>
        </div>
    `).join('');

    document.querySelectorAll(".codex-filters .filter-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            document.querySelectorAll(".codex-filters .filter-btn").forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            const filter = btn.getAttribute("data-filter");
            const cards = grid.querySelectorAll(".character-card");
            cards.forEach((card, idx) => {
                const char = CHARACTERS_DATABASE[idx];
                if (filter === "all" || char.faction === filter) {
                    card.style.display = "flex";
                } else {
                    card.style.display = "none";
                }
            });
        });
    });
}

function openCharacterModal(index) {
    const c = CHARACTERS_DATABASE[index];
    const modal = document.getElementById("char-modal-overlay");
    const content = document.getElementById("char-modal-content");
    if (!modal || !content) return;

    content.innerHTML = `
        <div class="toc-header">
            <h3>${c.name}</h3>
            <button class="close-modal-btn" onclick="document.getElementById('char-modal-overlay').classList.add('hidden')">&times;</button>
        </div>
        <p class="toc-subtitle" style="color:var(--gold-royal); font-weight:700;">${c.title} • [${c.factionLabel}]</p>
        <p style="font-size:0.95rem; line-height:1.6; color:var(--paper-cream); margin-bottom:1.5rem;">${c.desc}</p>
        <div style="display:flex; gap:0.8rem; flex-wrap:wrap; border-top:1px solid var(--ink-border); padding-top:1rem;">
            ${Object.entries(c.stats).map(([k, v]) => `
                <div style="background:var(--ink-panel); border:1px solid var(--gold-royal); padding:8px 14px; border-radius:8px; font-weight:700; font-size:0.85rem;">
                    ${k.toUpperCase()}: <span style="color:var(--gold-royal);">${v} / 100</span>
                </div>
            `).join('')}
        </div>
    `;
    modal.classList.remove("hidden");
}

// 11. MAP & TIMELINE (100% TRUE TO AUTHORITATIVE STORYLANDS)
function renderInteractiveMap() {
    const wrapper = document.getElementById("svg-map-wrapper");
    const details = document.getElementById("map-location-details");
    if (!wrapper || !details) return;

    wrapper.innerHTML = `
        <svg viewBox="0 0 800 500" style="width:100%; height:100%; background:#0d111a;">
            <path d="M 50 400 Q 200 350 400 380 T 750 420" stroke="#1f293d" stroke-width="3" fill="none"/>
            <path d="M 100 300 Q 350 250 500 280 T 700 310" stroke="#1f293d" stroke-width="3" fill="none"/>
            <path d="M 0 250 Q 200 280 400 240 T 800 260" stroke="#1976d2" stroke-width="12" fill="none" opacity="0.6"/>
            
            <g class="map-marker" onclick="selectMapMarker(0)" style="cursor:pointer;">
                <circle cx="200" cy="170" r="14" fill="#e53935" stroke="#fff" stroke-width="3"/>
                <text x="225" y="175" fill="#fbc02d" font-weight="800" font-size="14" font-family="Outfit">1. Sacred Boundary Stone</text>
            </g>

            <g class="map-marker" onclick="selectMapMarker(1)" style="cursor:pointer;">
                <circle cx="380" cy="390" r="14" fill="#e53935" stroke="#fff" stroke-width="3"/>
                <text x="405" y="395" fill="#fbc02d" font-weight="800" font-size="14" font-family="Outfit">2. Secluded Coastal Outpost</text>
            </g>

            <g class="map-marker" onclick="selectMapMarker(2)" style="cursor:pointer;">
                <circle cx="560" cy="180" r="14" fill="#e53935" stroke="#fff" stroke-width="3"/>
                <text x="585" y="185" fill="#fbc02d" font-weight="800" font-size="14" font-family="Outfit">3. Gomatha Pastures & Chicken Farm</text>
            </g>

            <g class="map-marker" onclick="selectMapMarker(3)" style="cursor:pointer;">
                <circle cx="500" cy="270" r="14" fill="#e53935" stroke="#fff" stroke-width="3"/>
                <text x="525" y="275" fill="#fbc02d" font-weight="800" font-size="14" font-family="Outfit">4. Ashley's Secluded Outpost</text>
            </g>
        </svg>
    `;

    selectMapMarker(0);
}

function selectMapMarker(index) {
    const locations = [
        {
            name: "Sacred Boundary Stone Deep in the Forest",
            desc: "Where Portuguese rogue trader Alen Das arranged a midnight peace treaty meeting, only to lure Anandhu Moopan into an elite marksmen ambush.",
            actLink: 1
        },
        {
            name: "Secluded Coastal Outpost",
            desc: "Where Sheik Aslam A Salam lured blackmailer Alen Das with rumors of wine and women, executing him as payment for Moopan's famine cucumbers and brinjals.",
            actLink: 2
        },
        {
            name: "Gomatha Pastures & Former Chicken Farm",
            desc: "The sacred pastures where Adrin was mourned by Sooraj Santhosh and Hari, built on the looted remains of Midhun Money's mass-production chicken farm.",
            actLink: 3
        },
        {
            name: "Ashley's Secluded Forest Rocket Outpost",
            desc: "Where scientist Ashley built timber rocket batteries, and where shadow assassin Nabeel and ronin samurai Habeeb Ikachi murdered him for his master blueprints.",
            actLink: 9
        }
    ];

    const loc = locations[index];
    const details = document.getElementById("map-location-details");
    if (!details || !loc) return;

    details.innerHTML = `
        <h4>📍 ${loc.name}</h4>
        <p>${loc.desc}</p>
        <button class="primary-hero-btn" onclick="jumpToAct(${loc.actLink})" style="margin-top:auto;">
            📖 Read Act Storyboard
        </button>
    `;
}

function renderChronologicalTimeline() {
    const track = document.getElementById("timeline-track");
    if (!track) return;

    const timelineSteps = [
        { num: "PROLOGUE", title: "The Sovereign Forest", desc: "Anandhu Moopan defends Pathanamthitta against Vinayak Thevalli Raja." },
        { num: "ACT I", title: "Serpent in the Sanctuary", desc: "Alen Das deceives Moopan at the Sacred Boundary Stone ambush." },
        { num: "ACT II", title: "The Serpent's Ransom", desc: "Aslam executes blackmailer Alen Das for Moopan's cucumbers and brinjals." },
        { num: "ACT III", title: "Fury of the Frontier", desc: "Adrin the cow is killed; Sooraj and Hari mobilize Gomatha vigilantes." },
        { num: "ACT IV", title: "Fatal Miscalculation", desc: "Envoy Sidharth Seeju tells an offensive joke and is instantly cut down." },
        { num: "ACT V", title: "Timber Rockets & Tragic Legend", desc: "Ashley deploys timber rockets; Alen Baiju is stomped by his own elephant." },
        { num: "ACT VI", title: "The Royal Coalition", desc: "King Adith and Dictator Niranjan form a massive imperial phalanx." },
        { num: "ACT VII", title: "Das Army & Silver Giant", desc: "Midhun Money and 7-foot Francis avenge Alen Das and the looted chicken farm." },
        { num: "ACT VIII", title: "Apocalypse of the Frontier", desc: "Sooraj dies of grief; Hari kills Francis and Midhun; Aslam forces King Adith's surrender." },
        { num: "POST-CREDIT", title: "Embers of New Conquest", desc: "Assassin Nabeel and samurai Habeeb Ikachi execute Ashley and steal rocket blueprints." }
    ];

    track.innerHTML = timelineSteps.map((s, i) => `
        <div class="timeline-card" onclick="jumpToAct(${i})">
            <span class="step-num">${s.num}</span>
            <h5>${s.title}</h5>
            <p>${s.desc}</p>
        </div>
    `).join('');
}

// 12. TABLE OF CONTENTS
function openTOCModal() {
    const modal = document.getElementById("toc-modal-overlay");
    const container = document.getElementById("toc-list-container");
    if (!modal || !container) return;

    container.innerHTML = MANGA_ACTS.map((act, idx) => `
        <div class="toc-item" onclick="jumpToActFromTOC(${idx})">
            <div class="act-title-box">
                <span class="act-number">${act.actNumber} • PAGE ${idx + 1}</span>
                <span class="act-name">${act.title}</span>
            </div>
            <span class="act-page-num">VIEW ▶</span>
        </div>
    `).join('');

    modal.classList.remove("hidden");
}

function closeTOCModal() {
    document.getElementById("toc-modal-overlay")?.classList.add("hidden");
}

function jumpToActFromTOC(idx) {
    closeTOCModal();
    jumpToAct(idx);
}

// 13. UNIVERSAL WEB AUDIO API COMIC SOUND EFFECT SYNTHESIZER + ENGLISH SPEECH
function playComicSoundEffect(type, labelText) {
    if (!isSfxEnabled) return;

    // 1. Synthesize Graphic Novel Audio via Web Audio API (Universal in all browsers)
    try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (AudioCtx) {
            const ctx = new AudioCtx();
            const now = ctx.currentTime;

            if (type === "slash" || type === "shadow") {
                // Sword slash swoosh
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = "triangle";
                osc.frequency.setValueAtTime(800, now);
                osc.frequency.exponentialRampToValueAtTime(100, now + 0.18);
                gain.gain.setValueAtTime(0.4, now);
                gain.gain.linearRampToValueAtTime(0.01, now + 0.18);
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start(now);
                osc.stop(now + 0.18);
            } else if (type === "boom" || type === "rumble" || type === "rocket") {
                // Low bass explosion rumble
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = "sawtooth";
                osc.frequency.setValueAtTime(130, now);
                osc.frequency.exponentialRampToValueAtTime(40, now + 0.35);
                gain.gain.setValueAtTime(0.5, now);
                gain.gain.linearRampToValueAtTime(0.01, now + 0.35);
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start(now);
                osc.stop(now + 0.35);
            } else if (type === "clash") {
                // Metallic steel clang
                const osc1 = ctx.createOscillator();
                const osc2 = ctx.createOscillator();
                const gain = ctx.createGain();
                osc1.type = "square";
                osc2.type = "sine";
                osc1.frequency.setValueAtTime(1200, now);
                osc2.frequency.setValueAtTime(1800, now);
                gain.gain.setValueAtTime(0.3, now);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
                osc1.connect(gain);
                osc2.connect(gain);
                gain.connect(ctx.destination);
                osc1.start(now);
                osc2.start(now);
                osc1.stop(now + 0.25);
                osc2.stop(now + 0.25);
            } else if (type === "horn" || type === "trumpet" || type === "victory") {
                // Dramatic horn trumpet chime
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = "sawtooth";
                osc.frequency.setValueAtTime(440, now);
                osc.frequency.setValueAtTime(660, now + 0.15);
                gain.gain.setValueAtTime(0.35, now);
                gain.gain.linearRampToValueAtTime(0.01, now + 0.4);
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start(now);
                osc.stop(now + 0.4);
            } else {
                // Default march stomp
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = "sine";
                osc.frequency.setValueAtTime(200, now);
                osc.frequency.exponentialRampToValueAtTime(60, now + 0.15);
                gain.gain.setValueAtTime(0.4, now);
                gain.gain.linearRampToValueAtTime(0.01, now + 0.15);
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start(now);
                osc.stop(now + 0.15);
            }
        }
    } catch (e) {
        console.warn("Web Audio fallback:", e);
    }

    // 2. Pronounce English sound name via SpeechSynthesis (en-US, guaranteed to work)
    try {
        const synth = window.speechSynthesis;
        if (synth && labelText) {
            synth.cancel();
            const cleanText = labelText.split("•")[0].replace(/[!]/g, "").trim();
            const utterance = new SpeechSynthesisUtterance(cleanText);
            utterance.lang = "en-US";
            utterance.rate = 1.05;
            utterance.volume = 0.9;
            synth.speak(utterance);
        }
    } catch (e) {}
}
