const ui = {
    apiBase: document.getElementById('apiBase'),
    btnReloadAll: document.getElementById('btnReloadAll'),

    postForm: document.getElementById('postForm'),
    commentForm: document.getElementById('commentForm'),

    toggleShowDeleted: document.getElementById('toggleShowDeleted'),
    postList: document.getElementById('postList'),
    postId: document.getElementById('postId'),
    postTitle: document.getElementById('postTitle'),
    postViews: document.getElementById('postViews'),
    btnPostCreate: document.getElementById('btnPostCreate'),
    btnPostUpdate: document.getElementById('btnPostUpdate'),
    btnPostCancel: document.getElementById('btnPostCancel'),

    selectedPostPill: document.getElementById('selectedPostPill'),

    toggleOnlySelectedPost: document.getElementById('toggleOnlySelectedPost'),
    toggleShowDeletedComments: document.getElementById('toggleShowDeletedComments'),
    commentList: document.getElementById('commentList'),
    commentCount: document.getElementById('commentCount'),
    commentId: document.getElementById('commentId'),
    commentPostId: document.getElementById('commentPostId'),
    commentText: document.getElementById('commentText'),
    btnCommentCreate: document.getElementById('btnCommentCreate'),
    btnCommentUpdate: document.getElementById('btnCommentUpdate'),
    btnCommentCancel: document.getElementById('btnCommentCancel')
};

let state = {
    posts: [],
    comments: [],
    selectedPostId: null,
    postEditId: null,
    commentEditId: null
};

function baseUrl() {
    return (ui.apiBase.value || '').replace(/\/$/, '');
}

async function apiGet(path) {
    const res = await fetch(baseUrl() + path);
    if (!res.ok) throw new Error('GET ' + path + ' fail: ' + res.status);
    return res.json();
}

async function apiPost(path, data) {
    const res = await fetch(baseUrl() + path, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('POST ' + path + ' fail: ' + res.status);
    return res.json();
}

async function apiPatch(path, data) {
    const res = await fetch(baseUrl() + path, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('PATCH ' + path + ' fail: ' + res.status);
    return res.json();
}

async function apiPut(path, data) {
    const res = await fetch(baseUrl() + path, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('PUT ' + path + ' fail: ' + res.status);
    return res.json();
}

async function apiDelete(path) {
    const res = await fetch(baseUrl() + path, { method: 'DELETE' });
    if (!res.ok) throw new Error('DELETE ' + path + ' fail: ' + res.status);
    return true;
}

function maxIdPlusOne(items) {
    const ids = items
        .map((x) => String(x.id ?? '').trim())
        .filter(Boolean)
        .map((s) => Number(s))
        .filter((n) => Number.isFinite(n));
    const max = ids.length ? Math.max(...ids) : 0;
    return String(max + 1);
}

function setSelectedPost(postId) {
    state.selectedPostId = postId;
    if (!postId) {
        ui.selectedPostPill.textContent = 'No post selected';
        return;
    }
    const post = state.posts.find((p) => p.id === postId);
    ui.selectedPostPill.textContent = post
        ? `Selected post ${post.id}${post.isDeleted ? ' (deleted)' : ''}`
        : `Selected post ${postId}`;
}

function resetPostForm() {
    state.postEditId = null;
    ui.postId.value = '';
    ui.postTitle.value = '';
    ui.postViews.value = 0;
    ui.btnPostUpdate.disabled = true;
    ui.btnPostCancel.disabled = true;
    ui.btnPostCreate.disabled = false;
}

function resetCommentForm() {
    state.commentEditId = null;
    ui.commentId.value = '';
    ui.commentText.value = '';
    ui.btnCommentUpdate.disabled = true;
    ui.btnCommentCancel.disabled = true;
    ui.btnCommentCreate.disabled = false;
}

function renderPostOptions() {
    const current = ui.commentPostId.value;
    ui.commentPostId.innerHTML = '';

    const placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.textContent = '-- Select Post ID --';
    ui.commentPostId.appendChild(placeholder);

    for (const p of state.posts) {
        const opt = document.createElement('option');
        opt.value = p.id;
        opt.textContent = `${p.id} - ${p.title}${p.isDeleted ? ' (Deleted)' : ''}`;
        ui.commentPostId.appendChild(opt);
    }

    if (state.selectedPostId) ui.commentPostId.value = state.selectedPostId;
    else ui.commentPostId.value = current || '';
}

function renderPosts() {
    ui.postList.innerHTML = '';

    const showDeleted = ui.toggleShowDeleted.checked;
    const postsToShow = showDeleted ? state.posts : state.posts.filter((p) => !p.isDeleted);

    if (!postsToShow.length) {
        const li = document.createElement('li');
        li.className = 'listItem';
        li.innerHTML = '<div class="muted">No posts available.</div>';
        ui.postList.appendChild(li);
        return;
    }

    for (const p of postsToShow) {
        const li = document.createElement('li');
        li.className = 'listItem' + (p.isDeleted ? ' deleted' : '');

        const left = document.createElement('div');
        left.className = 'itemMain';
        left.innerHTML = `
            <div class="itemTitle">${p.id} — ${escapeHtml(p.title)}</div>
            <div class="itemMeta muted">views: ${Number(p.views ?? 0)} ${p.isDeleted ? '• deleted' : ''}</div>
        `;

        const right = document.createElement('div');
        right.className = 'itemActions';

        const btnSelect = button('Select', () => {
            setSelectedPost(p.id);
            renderPostOptions();
            renderComments();
        });

        const btnEdit = button('Edit', () => {
            state.postEditId = p.id;
            ui.postId.value = p.id;
            ui.postTitle.value = p.title ?? '';
            ui.postViews.value = Number(p.views ?? 0);
            ui.btnPostUpdate.disabled = false;
            ui.btnPostCancel.disabled = false;
            ui.btnPostCreate.disabled = true;
        });
        btnEdit.disabled = !!p.isDeleted;

        const btnSoftDelete = button('Delete', async () => {
            await apiPatch(`/posts/${encodeURIComponent(p.id)}`, { isDeleted: true });
            await loadAll();
        }, 'danger');
        btnSoftDelete.disabled = !!p.isDeleted;

        const btnRestore = button('Restore', async () => {
            await apiPatch(`/posts/${encodeURIComponent(p.id)}`, { isDeleted: false });
            await loadAll();
        });
        btnRestore.disabled = !p.isDeleted;

        right.append(btnSelect, btnEdit, btnSoftDelete, btnRestore);
        li.append(left, right);
        ui.postList.appendChild(li);
    }
}

function renderComments() {
    ui.commentList.innerHTML = '';
    const onlySelected = ui.toggleOnlySelectedPost.checked;
    const showDeleted = ui.toggleShowDeletedComments.checked;

    let commentsToShow = state.comments;
    commentsToShow = showDeleted ? commentsToShow : commentsToShow.filter((c) => !c.isDeleted);

    if (onlySelected) {
        if (!state.selectedPostId) {
            ui.commentCount.textContent = 'No post selected to filter comments.';
            const li = document.createElement('li');
            li.className = 'listItem';
            li.innerHTML = '<div class="muted">Please click “Select” in the posts list.</div>';
            ui.commentList.appendChild(li);
            return;
        }
        commentsToShow = commentsToShow.filter((c) => String(c.postId) === String(state.selectedPostId));
    }

    ui.commentCount.textContent = `Total comments: ${commentsToShow.length}`;

    if (!commentsToShow.length) {
        const li = document.createElement('li');
        li.className = 'listItem';
        li.innerHTML = '<div class="muted">No comments available.</div>';
        ui.commentList.appendChild(li);
        return;
    }

    for (const c of commentsToShow) {
        const li = document.createElement('li');
        li.className = 'listItem' + (c.isDeleted ? ' deleted' : '');

        const left = document.createElement('div');
        left.className = 'itemMain';
        left.innerHTML = `
            <div class="itemTitle">${c.id} — ${escapeHtml(c.text ?? '')}</div>
            <div class="itemMeta muted">postId: ${escapeHtml(String(c.postId ?? ''))}</div>
        `;

        const right = document.createElement('div');
        right.className = 'itemActions';

        const btnEdit = button('Edit', () => {
            state.commentEditId = c.id;
            ui.commentId.value = c.id;
            ui.commentText.value = c.text ?? '';
            ui.commentPostId.value = String(c.postId ?? '');
            ui.btnCommentUpdate.disabled = false;
            ui.btnCommentCancel.disabled = false;
            ui.btnCommentCreate.disabled = true;
        });
        btnEdit.disabled = !!c.isDeleted;

        const btnSoftDelete = button('Delete', async () => {
            await apiPatch(`/comments/${encodeURIComponent(c.id)}`, { isDeleted: true });
            await loadAll();
        }, 'danger');
        btnSoftDelete.disabled = !!c.isDeleted;

        const btnRestore = button('Restore', async () => {
            await apiPatch(`/comments/${encodeURIComponent(c.id)}`, { isDeleted: false });
            await loadAll();
        });
        btnRestore.disabled = !c.isDeleted;

        right.append(btnEdit, btnSoftDelete, btnRestore);
        li.append(left, right);
        ui.commentList.appendChild(li);
    }
}

function button(text, onClick, variant) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn small' + (variant === 'danger' ? ' danger' : '');
    btn.textContent = text;
    btn.addEventListener('click', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        try {
            btn.disabled = true;
            await onClick();
        } catch (err) {
            alert(err.message || String(err));
        } finally {
            btn.disabled = false;
        }
    });
    return btn;
}

function escapeHtml(s) {
    return String(s)
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');
}

async function loadAll() {
    const [posts, comments] = await Promise.all([apiGet('/posts'), apiGet('/comments')]);
    state.posts = Array.isArray(posts) ? posts : [];
    state.comments = Array.isArray(comments) ? comments : [];

    state.posts = state.posts.map((p) => ({ ...p, isDeleted: !!p.isDeleted }));
    state.comments = state.comments.map((c) => ({ ...c, isDeleted: !!c.isDeleted }));

    if (state.selectedPostId && !state.posts.some((p) => p.id === state.selectedPostId)) {
        setSelectedPost(null);
    }

    renderPostOptions();
    renderPosts();
    renderComments();
}

async function handleCreatePost() {
    const title = ui.postTitle.value.trim();
    const views = Number(ui.postViews.value || 0);
    if (!title) throw new Error('Please enter Title');

    const newId = maxIdPlusOne(state.posts);
    const payload = { id: newId, title, views, isDeleted: false };
    await apiPost('/posts', payload);
    resetPostForm();
    await loadAll();
}

async function handleUpdatePost() {
    if (!state.postEditId) return;
    const title = ui.postTitle.value.trim();
    const views = Number(ui.postViews.value || 0);
    if (!title) throw new Error('Please enter Title');

    await apiPatch(`/posts/${encodeURIComponent(state.postEditId)}`, { title, views });
    resetPostForm();
    await loadAll();
}

async function handleCreateComment() {
    const text = ui.commentText.value.trim();
    const postId = String(ui.commentPostId.value || '').trim();
    if (!text) throw new Error('Please enter Text');
    if (!postId) throw new Error('Please select Post ID');

    const newId = maxIdPlusOne(state.comments);
    const payload = { id: newId, text, postId, isDeleted: false };
    await apiPost('/comments', payload);
    resetCommentForm();
    await loadAll();
}

async function handleUpdateComment() {
    if (!state.commentEditId) return;
    const text = ui.commentText.value.trim();
    const postId = String(ui.commentPostId.value || '').trim();
    if (!text) throw new Error('Please enter Text');
    if (!postId) throw new Error('Please select Post ID');

    await apiPut(`/comments/${encodeURIComponent(state.commentEditId)}`, {
        id: String(state.commentEditId),
        text,
        postId
    });
    resetCommentForm();
    await loadAll();
}

function wireEvents() {
    // prevent default form submit (Enter key) from reloading the page
    ui.postForm.addEventListener('submit', (e) => e.preventDefault());
    ui.commentForm.addEventListener('submit', (e) => e.preventDefault());

    ui.btnReloadAll.addEventListener('click', async () => {
        try {
            await loadAll();
        } catch (err) {
            alert(err.message || String(err));
        }
    });

    ui.toggleShowDeleted.addEventListener('change', renderPosts);
    ui.toggleOnlySelectedPost.addEventListener('change', renderComments);
    ui.toggleShowDeletedComments.addEventListener('change', renderComments);

    ui.btnPostCreate.addEventListener('click', async () => {
        try {
            await handleCreatePost();
        } catch (err) {
            alert(err.message || String(err));
        }
    });
    ui.btnPostUpdate.addEventListener('click', async () => {
        try {
            await handleUpdatePost();
        } catch (err) {
            alert(err.message || String(err));
        }
    });
    ui.btnPostCancel.addEventListener('click', () => {
        resetPostForm();
    });

    ui.btnCommentCreate.addEventListener('click', async () => {
        try {
            await handleCreateComment();
        } catch (err) {
            alert(err.message || String(err));
        }
    });
    ui.btnCommentUpdate.addEventListener('click', async () => {
        try {
            await handleUpdateComment();
        } catch (err) {
            alert(err.message || String(err));
        }
    });
    ui.btnCommentCancel.addEventListener('click', () => {
        resetCommentForm();
    });

    ui.commentPostId.addEventListener('change', () => {
    });
}

async function init() {
    wireEvents();
    resetPostForm();
    resetCommentForm();
    setSelectedPost(null);

    try {
        await loadAll();
    } catch (err) {
        alert(
            'Failed to load data. Please ensure JSON Server is running.\n' +
                (err.message || String(err))
        );
    }
}

init();