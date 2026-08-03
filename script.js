/* ==========================================================================
   PATHANAMTHITTA CHRONICLES : VOL 1 MANGA PORTAL
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

// 3. GIF GALLERY (YOUTUBE / INSTAGRAM REACTION STYLE)
const CURATED_REACTION_GIFS = [
    { label: "Shocked", url: "https://media.giphy.com/media/bF7ET3fZAcmR2/giphy.gif" },
    { label: "Katana Slash", url: "https://media.giphy.com/media/13n7XeyIXEIslG/giphy.gif" },
    { label: "Hype", url: "https://media.giphy.com/media/yo3TC0yeHd53G/giphy.gif" },
    { label: "Popcorn", url: "https://media.giphy.com/media/gl0mkIZOW6N0I/giphy.gif" },
    { label: "Epic", url: "https://media.giphy.com/media/KBDzqHidthjm1kGIHb/giphy.gif" },
    { label: "Mind Blown", url: "https://media.giphy.com/media/26ufdipQqM2lhNA4g/giphy.gif" },
    { label: "Respect", url: "https://media.giphy.com/media/l4pMattUYTTM7qpIk/giphy.gif" },
    { label: "Rocket", url: "https://media.giphy.com/media/3o7TKsk2Y0cQ9PZt7O/giphy.gif" }
];

let selectedGifUrl = "";

function toggleGifPickerDrawer() {
    const drawer = document.getElementById("gif-picker-drawer");
    const urlInput = document.getElementById("custom-gif-url-input");
    if (!drawer) return;
    const isHidden = drawer.classList.contains("hidden");
    if (isHidden) {
        drawer.classList.remove("hidden");
        if (urlInput) urlInput.classList.remove("hidden");
        renderGifGallery();
    } else {
        drawer.classList.add("hidden");
        if (urlInput) urlInput.classList.add("hidden");
    }
}

function renderGifGallery() {
    const grid = document.getElementById("gif-gallery-grid");
    if (!grid) return;
    grid.innerHTML = CURATED_REACTION_GIFS.map(g => `
        <div class="gif-thumb-card" onclick="selectReactionGif('${g.url}')">
            <img src="${g.url}" alt="${g.label}" loading="lazy">
        </div>
    `).join('');
}

function selectReactionGif(url) {
    selectedGifUrl = url;
    const previewBox = document.getElementById("selected-gif-preview-container");
    const previewImg = document.getElementById("selected-gif-img");
    const drawer = document.getElementById("gif-picker-drawer");
    const urlInput = document.getElementById("custom-gif-url-input");

    if (previewBox && previewImg) {
        previewImg.src = url;
        previewBox.classList.remove("hidden");
    }
    if (drawer) drawer.classList.add("hidden");
    if (urlInput) urlInput.classList.add("hidden");
    updateCommentButtonState();
}

function removeSelectedGif() {
    selectedGifUrl = "";
    const previewBox = document.getElementById("selected-gif-preview-container");
    if (previewBox) previewBox.classList.add("hidden");
    updateCommentButtonState();
}

function updateCommentButtonState() {
    const textInput = document.getElementById("comment-text-input");
    const postBtn = document.getElementById("btn-post-comment");
    const cancelBtn = document.getElementById("btn-cancel-comment");
    if (!postBtn) return;

    const hasText = textInput && textInput.value.trim().length > 0;
    const hasGif = Boolean(selectedGifUrl);

    postBtn.disabled = !(hasText || hasGif);
    if (cancelBtn) {
        if (hasText || hasGif) {
            cancelBtn.classList.remove("hidden");
        } else {
            cancelBtn.classList.add("hidden");
        }
    }
}

// 4. CLEAN COMMENTS SECTION (INSTAGRAM / YOUTUBE STYLE)
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
    if (!textVal && !selectedGifUrl) return;

    let authorName = currentAuthUser ? currentAuthUser.displayName : "Ashley Allen";

    let finalGifUrl = selectedGifUrl;
    if (customUrlInput && customUrlInput.value.trim()) {
        finalGifUrl = customUrlInput.value.trim();
    }

    const now = new Date();
    const newComment = {
        author: authorName,
        text: textVal,
        gifUrl: finalGifUrl || "",
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
                    ${item.gifUrl ? `
                        <div class="comment-gif-wrap">
                            <img src="${item.gifUrl}" alt="Reaction" class="comment-gif-img" loading="lazy">
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
                <p>When ambitious feudal ruler Vinayak Thevalli Raja invades the sovereign borderland hills to monopolize the spice and timber routes, tribal chieftain Anandhu Moopan unites with guerrilla strategist Aslam and male scientist Ashley Allen.</p>
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

// 6. VOLUME 1 STORYBOARD (ALL 10 ACTS + MALE SCIENTIST ASHLEY)
const MANGA_ACTS = [
    {
        id: 1,
        actNumber: "ACT I",
        title: "The Sovereign Forest",
        location: "Kollam–Pathanamthitta Borderland Hills",
        image: "assets/cover.jpg",
        sfx: "ゴゴゴゴ",
        sfxMeaning: "RUMBLING SOVEREIGNTY",
        narrative: "For generations, the deep, uncharted hills of the borderlands between Kollam and Pathanamthitta belonged to the indigenous people. At the apex of this ancient community stood the Great Pathanamthitta Tribe, led by their formidable, revered chieftain, Anandhu Moopan. Holding the traditional title of Ooru Moopan, Anandhu was a leader of unyielding honor, fiercely dedicated to protecting his people's ancestral lands and forest autonomy.",
        dialogues: [
            {
                speaker: "Anandhu Moopan",
                faction: "Ooru Moopan",
                text: "The soil of Pathanamthitta is baptized in the resilience of our ancestors. No crown from Thevally shall turn our sacred trees into coin!",
                type: "shout",
                scenario: "Anandhu Moopan stands tall on a cliffside overlooking the canopy of Pathanamthitta, clutching his ceremonial spear."
            },
            {
                speaker: "Tribal Sentinel Kuttan",
                faction: "Forest Guardian",
                text: "Moopan! Heavy infantry banners bearing the royal seal of Vinayak Thevalli Raja are crossing the western river ford!",
                type: "normal",
                scenario: "A scout rushes through dense teak foliage, pointing toward distant armored columns."
            }
        ]
    },
    {
        id: 2,
        actNumber: "ACT II",
        title: "The Royal Invasion",
        location: "Western Teak River Ford",
        image: "assets/ambush.jpg",
        sfx: "ザッザッ",
        sfxMeaning: "ARMORED BOOTS",
        narrative: "The peace of the hills was shattered when Vinayak Thevalli Raja, an ambitious feudal ruler associated with the prominent royal lineage of the Thevally region, sought to expand his kingdom. Desperate to monopolize the region's highly lucrative timber and spice routes, the Raja deployed his heavy infantry to conquer the highlands.",
        dialogues: [
            {
                speaker: "Vinayak Thevalli Raja",
                faction: "Thevally Ruler",
                text: "These hills hold the richest teak and cardamom in the south! Flatten the tribal stockades and bring me Moopan's submission!",
                type: "shout",
                scenario: "Vinayak Thevalli Raja sits atop an armored war elephant, surrounded by mercenary matchlockmen."
            },
            {
                speaker: "Commander Thampan",
                faction: "Royal Vanguard",
                text: "My Lord, the highland mist is thickening. Our scouts report strange whistles echoing from the upper ridge...",
                type: "normal",
                scenario: "An armored officer peers anxiously into the swirling forest fog."
            }
        ]
    },
    {
        id: 3,
        actNumber: "ACT III",
        title: "The Guerrilla Resistance",
        location: "The Misty Highland Defile",
        image: "assets/aslam.jpg",
        sfx: "シュパッ",
        sfxMeaning: "KATANA SLASH",
        narrative: "Anandhu Moopan refused to kneel. Utilizing the dense, misty terrain of Pathanamthitta, he organized a brilliant guerrilla defense. He was joined by a formidable ally: Aslam, a fierce, highly skilled rebel warrior from the lowlands who had long fought against the Raja's tyranny. Aslam brought tactical discipline and lethal swordsmanship to the tribal resistance.",
        dialogues: [
            {
                speaker: "Sheik Aslam",
                faction: "Guerrilla Blademaster",
                text: "Thevally armor is heavy, but their throats are exposed. We strike from the high branches when the fog blinds their musketeers!",
                type: "normal",
                scenario: "Aslam crouches on a mossy bough with his curved blade drawn."
            },
            {
                speaker: "Anandhu Moopan",
                faction: "Ooru Moopan",
                text: "Let the forest be our fortress! Every root will trip them, and every ravine will become their prison!",
                type: "shout",
                scenario: "Anandhu raises his hand, initiating a barrage of bamboo traps."
            }
        ]
    },
    {
        id: 4,
        actNumber: "ACT IV",
        title: "Adrin & The Gomatha Assembly",
        location: "Sacred Meadow of the Horned Bovines",
        image: "assets/gomatha.jpg",
        sfx: "モーモー",
        sfxMeaning: "SACRED HERD ROAR",
        narrative: "The resistance also received crucial support from an unexpected syndicate: the Gomatha Association. This devout, agrarian collective revered and protected the region's cattle herds. Their undisputed leader was Adrin, a legendary, uniquely intelligent cow known among the tribes as the 'Great Mother.' Adrin's herd acted as living shields and early-warning sentinels.",
        dialogues: [
            {
                speaker: "Adrin (The Great Cow)",
                faction: "Gomatha Leader",
                text: "Moooo!! (Translation: No warhorse shall trample our sacred pastures. Stand firm, horns lowered!)",
                type: "shout",
                scenario: "Adrin the cow stands majestically at the forefront of a thunderous cattle herd."
            },
            {
                speaker: "Gomatha Warden Govindan",
                faction: "Cattle Protector",
                text: "When Adrin stamps her hooves, the earth trembles! We pledge our herds to Moopan's defense!",
                type: "normal",
                scenario: "A pastoral warden raises his wooden staff alongside the cattle syndicate."
            }
        ]
    },
    {
        id: 5,
        actNumber: "ACT V",
        title: "The Envoy's Humiliation",
        location: "Ooru Council Clearings",
        image: "assets/standoff.jpg",
        sfx: "ドドン",
        sfxMeaning: "DRAMATIC STANDOFF",
        narrative: "Frustrated by mounting casualties in the hills, the Raja sent a royal envoy to offer Anandhu Moopan a bribe of gold and lowland titles in exchange for surrender. Anandhu publicly burned the royal edict before the assembled tribes and Gomatha elders. He vowed that Pathanamthitta would remain forever sovereign.",
        dialogues: [
            {
                speaker: "Royal Envoy Pillai",
                faction: "Diplomatic Emissary",
                text: "Chieftain! The Raja offers you three sacks of gold and the title of Forest Viceroy if you lay down your spears!",
                type: "normal",
                scenario: "A silken-robed emissary extends a casket of coins in the tribal circle."
            },
            {
                speaker: "Anandhu Moopan",
                faction: "Ooru Moopan",
                text: "Take your gold back to the plains! We do not trade the graves of our mothers for the chains of a tyrant!",
                type: "shout",
                scenario: "Anandhu thrusts the parchment edict into the council bonfire."
            }
        ]
    },
    {
        id: 6,
        actNumber: "ACT VI",
        title: "Ashley Allen & The Timber Rockets",
        location: "Highland Forest Arsenal",
        image: "assets/ashley_male.jpg",
        sfx: "ズバババ",
        sfxMeaning: "ROCKET IGNITION",
        narrative: "As the Raja's siege machines approached, the resistance unveiled their greatest technological marvel, designed by ASHLEY ALLEN—a brilliant male scientist, inventor, and master forest engineer of Pathanamthitta. Utilizing iron-reinforced hollow teak logs charged with saltpeter and sulfur, male scientist Ashley constructed devastating 'Timber Rockets' that shattered the enemy formation.",
        dialogues: [
            {
                speaker: "Ashley Allen",
                faction: "Male Scientist & Inventor",
                text: "The iron-banded teak chambers are primed! When I drop the torch, these timber rockets will turn their siege shields into splinters!",
                type: "shout",
                scenario: "Male scientist Ashley Allen adjusts the trajectory of an iron-clad wooden rocket launcher overlooking the gorge."
            },
            {
                speaker: "Sheik Aslam",
                faction: "Guerrilla Blademaster",
                text: "Brilliant work, Ashley! Their matchlockmen won't know whether thunder or lightning hit them!",
                type: "normal",
                scenario: "Aslam watches with admiration as Ashley lights the fuse of a multi-barrel timber barrage."
            }
        ]
    },
    {
        id: 7,
        actNumber: "ACT VII",
        title: "The Elephant Stampede",
        location: "Eastern Valley Gorge",
        image: "assets/elephant.jpg",
        sfx: "ドガガガ",
        sfxMeaning: "BEAST CHARGE",
        narrative: "Caught in Ashley Allen's rocket barrage and blinded by the smoke, the Raja's armored war elephants panicked. Guided by Adrin and the Gomatha herdsmen, wild mountain elephants joined the fray, charging down the valley and crushing the Raja's artillery train.",
        dialogues: [
            {
                speaker: "Gomatha Warden Govindan",
                faction: "Cattle Protector",
                text: "The mountain tuskers have answered Adrin's call! Drive them straight through the royal center!",
                type: "shout",
                scenario: "Wild mountain bull elephants charge alongside Adrin's cattle herd."
            },
            {
                speaker: "Thevally Heavy Musketeer",
                faction: "Royal Infantry",
                text: "Our lines are broken! The elephants are turning on our own carriages! Fall back to the river!",
                type: "shout",
                scenario: "Royal infantry scatter in terror as elephants trample artillery wagons."
            }
        ]
    },
    {
        id: 8,
        actNumber: "ACT VIII",
        title: "Clash of the Silver Giants",
        location: "The Sovereign River Ridge",
        image: "assets/giant.jpg",
        sfx: "カキィィン",
        sfxMeaning: "STEEL COLLISION",
        narrative: "In a final desperate gamble, Vinayak Thevalli Raja unleashed his elite mercenary vanguard—the Das Army Syndicate, clad in silver steel plate armor. They clashed with Aslam and Anandhu Moopan along the river ridge in a battle of epic swordsmanship.",
        dialogues: [
            {
                speaker: "General Das",
                faction: "Das Army Syndicate",
                text: "No tribal spear can pierce forged silver plate! Prepare to be crushed beneath my war-mace!",
                type: "shout",
                scenario: "A giant warrior clad in silver plate armor swings a spiked mace toward Aslam."
            },
            {
                speaker: "Sheik Aslam",
                faction: "Guerrilla Blademaster",
                text: "Armor only slows your swing, Das! Let's see if your steel can withstand a blade forged in rebellion!",
                type: "shout",
                scenario: "Aslam leaps into the air, katana gleaming as he parries the mace strike."
            }
        ]
    },
    {
        id: 9,
        actNumber: "ACT IX",
        title: "Victory of Pathanamthitta",
        location: "The Sovereign Hill Summit",
        image: "assets/victory.jpg",
        sfx: "ワアアア",
        sfxMeaning: "VICTORY ROAR",
        narrative: "With his army routed and his mercenary vanguard defeated, Vinayak Thevalli Raja was forced to sound the retreat. Across the sovereign hills, the horns of victory resounded. Anandhu Moopan, Aslam, male scientist Ashley Allen, and Adrin stood triumphant under the golden morning sun.",
        dialogues: [
            {
                speaker: "Anandhu Moopan",
                faction: "Ooru Moopan • Victorious Chieftain",
                text: "Let every kingdom from Kollam to Travancore hear our horns! Pathanamthitta belongs to her people, forever unconquered!",
                type: "shout",
                scenario: "Anandhu Moopan raises his spear high on the summit as sunlight breaks over cheering tribes."
            },
            {
                speaker: "Ashley Allen",
                faction: "Male Scientist & Inventor",
                text: "Our forests are safe, Moopan. And our inventions stand ready should any tyrant dare cross our borders again!",
                type: "normal",
                scenario: "Male scientist Ashley Allen smiles, resting his hand on a rocket launcher alongside Aslam and Adrin."
            }
        ]
    },
    {
        id: 10,
        actNumber: "ACT X",
        title: "Post-Credit: Shadows of the Shogun",
        location: "Secret Temple of the Shogun Assassins",
        image: "assets/assassins.jpg",
        sfx: "スウウウ",
        sfxMeaning: "SILENT SHADOWS",
        narrative: "Though the borderland hills celebrated their hard-won peace, a darker threat loomed in the East. In a hidden temple shrouded in incense, a syndicate of silent Shadow Assassins and Ronin samurai, hired by disgraced lowland merchants, sharpened their obsidian katanas.",
        dialogues: [
            {
                speaker: "Shadow Shogun Kage",
                faction: "Shadow Syndicate",
                text: "Thevally's Raja was arrogant and loud. When we strike Pathanamthitta, they will not hear the blade until the silence takes them...",
                type: "thought",
                scenario: "A masked samurai shogun kneels in a candlelit shrine, drawing an obsidian katana."
            },
            {
                speaker: "Ronin Assassin Shinobi",
                faction: "Elite Shadow Guild",
                text: "Our target is the male scientist Ashley Allen and the tribal Moopan. The Sovereign Forest shall fall in silence.",
                type: "normal",
                scenario: "Silhouetted ninja warriors leap from temple roofs under a red moon."
            }
        ]
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
    // NO auto scroll here! Let the user stay where they are or view smoothly.
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
    textInput?.addEventListener("input", updateCommentButtonState);
}

// 8. BOOK READER RENDERING
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

            <div class="manga-visual-panel">
                <img src="${act.image}" alt="${act.title}">
                <span class="sfx-stamp">${act.sfx}</span>
                <div class="panel-caption">
                    <span>SFX: <strong>${act.sfx}</strong> (${act.sfxMeaning})</span>
                    <span>Page ${index + 1} of 10</span>
                </div>
            </div>

            <div class="narrator-box">
                ${act.narrative}
            </div>

            <div class="dialogue-grid">
                ${act.dialogues.map(dlg => `
                    <div class="speech-bubble ${dlg.type}" onclick="triggerDialogueSFX('${act.sfx}')">
                        <div class="speaker-name">
                            <span>💬 ${dlg.speaker}</span>
                            <span class="faction-tag">${dlg.faction}</span>
                        </div>
                        <p class="dialogue-text">"${dlg.text}"</p>
                        <div class="dialogue-scenario-box">
                            <span>🎨 ${dlg.scenario}</span>
                        </div>
                    </div>
                `).join('')}
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

// NOTE: NO window.scrollTo here! Prevents auto-scroll jump when selecting chapters or clicking Next/Prev!
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
    // NO window.scrollTo here!
}

// 9. WEBTOON STREAM RENDERING
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

            <div class="manga-visual-panel">
                <img src="${act.image}" alt="${act.title}" loading="lazy">
                <span class="sfx-stamp">${act.sfx}</span>
                <div class="panel-caption">
                    <span>SFX: <strong>${act.sfx}</strong> (${act.sfxMeaning})</span>
                    <span>Act ${idx + 1} of 10</span>
                </div>
            </div>

            <div class="narrator-box">
                ${act.narrative}
            </div>

            <div class="dialogue-grid">
                ${act.dialogues.map(dlg => `
                    <div class="speech-bubble ${dlg.type}" onclick="triggerDialogueSFX('${act.sfx}')">
                        <div class="speaker-name">
                            <span>💬 ${dlg.speaker}</span>
                            <span class="faction-tag">${dlg.faction}</span>
                        </div>
                        <p class="dialogue-text">"${dlg.text}"</p>
                        <div class="dialogue-scenario-box">
                            <span>🎨 ${dlg.scenario}</span>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
    `).join('');
}

// 10. CHARACTER CODEX
const CHARACTERS_DATABASE = [
    {
        name: "Anandhu Moopan",
        faction: "tribal",
        factionLabel: "Pathanamthitta Tribe",
        title: "Ooru Moopan • Apex Chieftain",
        desc: "The formidable, revered leader of the Great Pathanamthitta Tribe. A warrior of unyielding honor and tactical brilliance.",
        stats: { strength: "98", leadership: "100", honor: "100" }
    },
    {
        name: "Ashley Allen",
        faction: "tribal",
        factionLabel: "Allied Resistance",
        title: "Male Scientist & Master Engineer",
        desc: "A brilliant male scientist, inventor, and master forest engineer who joined Moopan's rebellion, inventing the iron-reinforced 'Timber Rockets'.",
        stats: { intellect: "100", engineering: "99", firepower: "95" }
    },
    {
        name: "Sheik Aslam",
        faction: "tribal",
        factionLabel: "Guerrilla Blademaster",
        title: "Rebel Blademaster of the Lowlands",
        desc: "A legendary swordsman who fought the Raja's tyranny for decades before uniting his forces with Moopan.",
        stats: { agility: "97", swordsmanship: "99", tactics: "94" }
    },
    {
        name: "Adrin (The Great Cow)",
        faction: "gomatha",
        factionLabel: "Gomatha Association",
        title: "The Great Mother • Sacred Bovine Leader",
        desc: "An extraordinarily intelligent cow revered across the southern hills. Leads the cattle syndicate that serves as sentinels.",
        stats: { wisdom: "96", loyalty: "100", stampede: "98" }
    },
    {
        name: "Vinayak Thevalli Raja",
        faction: "royal",
        factionLabel: "Thevally Royalty",
        title: "Ambitious Feudal Conqueror",
        desc: "A ruthless lowland ruler determined to annex the Pathanamthitta hills to monopolize the spice and timber routes.",
        stats: { ambition: "98", wealth: "96", cruelty: "91" }
    },
    {
        name: "General Das",
        faction: "mercenary",
        factionLabel: "Das Army Syndicate",
        title: "Commander of the Silver Steel Plate Vanguard",
        desc: "Warlord of an elite mercenary syndicate clad in silver plate armor. Wields a colossal spiked war-mace in battle.",
        stats: { strength: "99", armor: "98", brutality: "93" }
    },
    {
        name: "Gomatha Warden Govindan",
        faction: "gomatha",
        factionLabel: "Gomatha Association",
        title: "Senior Cattle Protector",
        desc: "A pastoral warrior who coordinates herd movements with Adrin and rallies mountain elephants to crush enemy artillery.",
        stats: { devotion: "95", nature: "97", defense: "92" }
    },
    {
        name: "Shadow Shogun Kage",
        faction: "shadow",
        factionLabel: "Shadow Assassins",
        title: "Grandmaster of the Obsidian Blade",
        desc: "A masked samurai shogun hired by disgraced lowland merchants to assassinate Moopan and Ashley Allen in silence.",
        stats: { stealth: "100", lethality: "98", shadow: "99" }
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

// 11. MAP & TIMELINE
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
                <circle cx="220" cy="180" r="14" fill="#e53935" stroke="#fff" stroke-width="3"/>
                <text x="245" y="185" fill="#fbc02d" font-weight="800" font-size="14" font-family="Outfit">1. Ooru Council Sanctuary</text>
            </g>

            <g class="map-marker" onclick="selectMapMarker(1)" style="cursor:pointer;">
                <circle cx="380" cy="245" r="14" fill="#e53935" stroke="#fff" stroke-width="3"/>
                <text x="405" y="250" fill="#fbc02d" font-weight="800" font-size="14" font-family="Outfit">2. Teak River Ford</text>
            </g>

            <g class="map-marker" onclick="selectMapMarker(2)" style="cursor:pointer;">
                <circle cx="560" cy="160" r="14" fill="#e53935" stroke="#fff" stroke-width="3"/>
                <text x="585" y="165" fill="#fbc02d" font-weight="800" font-size="14" font-family="Outfit">3. Gomatha Meadow</text>
            </g>

            <g class="map-marker" onclick="selectMapMarker(3)" style="cursor:pointer;">
                <circle cx="480" cy="360" r="14" fill="#e53935" stroke="#fff" stroke-width="3"/>
                <text x="505" y="365" fill="#fbc02d" font-weight="800" font-size="14" font-family="Outfit">4. Ashley's Rocket Arsenal</text>
            </g>
        </svg>
    `;

    selectMapMarker(0);
}

function selectMapMarker(index) {
    const locations = [
        {
            name: "Ooru Council Sanctuary & Summit",
            desc: "The sacred ancestral heart of the Pathanamthitta Tribe where Anandhu Moopan burned the Raja's surrender edict.",
            actLink: 0
        },
        {
            name: "Western Teak River Ford",
            desc: "Where Vinayak Thevalli Raja's heavy infantry first crossed into the sovereign hills.",
            actLink: 1
        },
        {
            name: "Sacred Gomatha Meadow",
            desc: "The lush highland pastures protected by Adrin the Cow and the cattle sentinels.",
            actLink: 3
        },
        {
            name: "Ashley Allen's Forest Rocket Arsenal",
            desc: "The secret workshop where male scientist Ashley Allen designed and launched the timber rockets.",
            actLink: 5
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
        { num: "01", title: "Anandhu's Oath", desc: "Moopan swears to protect Pathanamthitta's trees." },
        { num: "02", title: "Thevally Invasion", desc: "Vinayak Thevalli Raja crosses the river ford." },
        { num: "03", title: "Aslam Unites", desc: "Guerrilla blademaster Aslam joins Moopan in the mists." },
        { num: "04", title: "Gomatha Alliance", desc: "Adrin the cow and the cattle herd pledge defense." },
        { num: "05", title: "Envoy Defied", desc: "Moopan publicly burns the royal surrender edict." },
        { num: "06", title: "Ashley's Rockets", desc: "Male scientist Ashley Allen launches iron-clad timber rockets." },
        { num: "07", title: "Beast Charge", desc: "Mountain elephants trample the royal artillery train." },
        { num: "08", title: "Silver Clash", desc: "Aslam defeats General Das of the Silver Vanguard." },
        { num: "09", title: "Sovereign Victory", desc: "Pathanamthitta celebrates total freedom on the summit." },
        { num: "10", title: "Samurai Shadows", desc: "Shadow Shogun Kage plots an obsidian katana revenge." }
    ];

    track.innerHTML = timelineSteps.map((s, i) => `
        <div class="timeline-card" onclick="jumpToAct(${i})">
            <span class="step-num">STAGE ${s.num}</span>
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

// 13. SOUND EFFECTS (SFX)
function triggerDialogueSFX(sfxText) {
    if (!isSfxEnabled) return;
    try {
        const synth = window.speechSynthesis;
        if (synth) {
            const utterance = new SpeechSynthesisUtterance(sfxText);
            utterance.lang = "ja-JP";
            utterance.rate = 1.1;
            synth.speak(utterance);
        }
    } catch (e) {}
}
