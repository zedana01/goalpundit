/**
 * Goal Pundit - Admin CMS Engine Logic
 */

let appData = null;
let activeEditingPage = 'about-us';

document.addEventListener('DOMContentLoaded', () => {
  checkAuthOnLoad();
  initAdminData();
});

function checkAuthOnLoad() {
  const isAuth = sessionStorage.getItem('goalpundit_admin_auth') === 'true' || localStorage.getItem('goalpundit_admin_auth') === 'true';
  const overlay = document.getElementById('authOverlay');
  if (isAuth && overlay) {
    overlay.style.display = 'none';
  }
}

function handleAuth(event) {
  event.preventDefault();
  const pinInput = document.getElementById('pinInput');
  const errorMsg = document.getElementById('authError');
  if (pinInput && pinInput.value.trim() === '1234') {
    sessionStorage.setItem('goalpundit_admin_auth', 'true');
    localStorage.setItem('goalpundit_admin_auth', 'true');
    const overlay = document.getElementById('authOverlay');
    if (overlay) overlay.style.display = 'none';
    showToast('Authenticated successfully! Welcome to Goal Pundit CMS.');
  } else {
    if (errorMsg) errorMsg.style.display = 'block';
  }
}

function handleLogout() {
  if (confirm('Are you sure you want to log out?')) {
    sessionStorage.removeItem('goalpundit_admin_auth');
    localStorage.removeItem('goalpundit_admin_auth');
    location.reload();
  }
}

function initAdminData() {
  appData = getGoalPunditData();
  updateMetrics();
  renderAdminPostsTable();
  renderAdminCatsTable();
  populateCategorySelect();
  loadPageEditor('about-us');
  populateSettings();
}

function saveAppData() {
  saveGoalPunditData(appData);
  updateMetrics();
}

function switchTab(tabId, el) {
  document.querySelectorAll('.admin-tab-pane').forEach(p => p.style.display = 'none');
  const target = document.getElementById(tabId);
  if (target) target.style.display = 'block';

  document.querySelectorAll('.sidebar-nav .menu-link').forEach(l => l.classList.remove('active'));
  if (el) el.classList.add('active');

  const titles = {
    'tabOverview': 'Dashboard Overview',
    'tabPosts': 'Articles Directory (125 Posts)',
    'tabCategories': 'Categories Manager',
    'tabPages': 'Static Pages Editor',
    'tabSettings': 'Global Site Settings & Social',
    'tabBackup': 'Backup & Database Management'
  };
  const topTitle = document.getElementById('topbarTitle');
  if (topTitle && titles[tabId]) topTitle.innerText = titles[tabId];
}

function updateMetrics() {
  const pCount = document.getElementById('metricPosts');
  if (pCount) pCount.innerText = (appData.posts || []).length;

  const cCount = document.getElementById('metricCats');
  if (cCount) cCount.innerText = (appData.categories || []).length;
}

// 1. Posts CRUD
function renderAdminPostsTable(filterQuery = '') {
  const tbody = document.getElementById('adminPostsTableBody');
  if (!tbody) return;
  const posts = appData.posts || [];
  const q = filterQuery.toLowerCase().trim();
  const filtered = q ? posts.filter(p => p.title.toLowerCase().includes(q) || p.author.toLowerCase().includes(q) || p.category.toLowerCase().includes(q)) : posts;

  tbody.innerHTML = filtered.slice(0, 100).map(p => `
    <tr>
      <td>
        <img src="${p.image}" alt="${p.title}" class="table-thumb" onerror="this.src='https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&w=120&q=80'">
      </td>
      <td>
        <strong>${p.title}</strong>
        <div style="font-size:12px; color:var(--admin-text-muted);">${p.excerpt ? p.excerpt.substring(0, 70) + '...' : ''}</div>
      </td>
      <td><span class="badge-tag">${p.category}</span></td>
      <td>${p.author}</td>
      <td style="white-space:nowrap;">${p.date}</td>
      <td>
        <div style="display:flex; gap:8px;">
          <a href="../post.html?slug=${p.slug}" target="_blank" class="btn btn-outline btn-sm" title="View"><i class="fa-solid fa-arrow-up-right-from-square"></i></a>
          <button class="btn btn-outline btn-sm" onclick="editPost('${p.id}')" title="Edit"><i class="fa-solid fa-pen"></i></button>
          <button class="btn btn-danger btn-sm" onclick="deletePost('${p.id}')" title="Delete"><i class="fa-solid fa-trash"></i></button>
        </div>
      </td>
    </tr>
  `).join('');
}

function filterAdminPosts() {
  const val = document.getElementById('adminPostSearch').value;
  renderAdminPostsTable(val);
}

function populateCategorySelect() {
  const sel = document.getElementById('postCatInput');
  if (!sel) return;
  sel.innerHTML = (appData.categories || []).map(c => `
    <option value="${c.slug}">${c.name}</option>
  `).join('');
}

function openAddPostModal() {
  document.getElementById('postModalTitle').innerText = 'Write New Article';
  document.getElementById('postForm').reset();
  document.getElementById('postIdInput').value = '';
  document.getElementById('postAuthorInput').value = 'Mohamed Zeidan';
  document.getElementById('postReadTimeInput').value = '5 min read';
  document.getElementById('postPreviewImg').src = 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&w=800&q=80';
  document.getElementById('postImageInput').value = 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&w=800&q=80';
  populateCategorySelect();
  document.getElementById('postModal').classList.add('show');
}

function editPost(id) {
  const p = (appData.posts || []).find(x => String(x.id) === String(id));
  if (!p) return;
  populateCategorySelect();
  document.getElementById('postModalTitle').innerText = 'Edit Article';
  document.getElementById('postIdInput').value = p.id;
  document.getElementById('postTitleInput').value = p.title;
  document.getElementById('postSlugInput').value = p.slug;
  document.getElementById('postCatInput').value = p.categorySlug;
  document.getElementById('postAuthorInput').value = p.author;
  document.getElementById('postReadTimeInput').value = p.readTime || '5 min read';
  document.getElementById('postImageInput').value = p.image;
  document.getElementById('postPreviewImg').src = p.image;
  document.getElementById('postExcerptInput').value = p.excerpt;
  document.getElementById('postContentInput').value = p.content;
  document.getElementById('postModal').classList.add('show');
}

function savePost(event) {
  event.preventDefault();
  const id = document.getElementById('postIdInput').value;
  const title = document.getElementById('postTitleInput').value.trim();
  const slug = document.getElementById('postSlugInput').value.trim().toLowerCase().replace(/\s+/g, '-');
  const catSlug = document.getElementById('postCatInput').value;
  const catObj = (appData.categories || []).find(c => c.slug === catSlug) || { name: 'Tactical Analysis' };
  const author = document.getElementById('postAuthorInput').value.trim() || 'Mohamed Zeidan';
  const readTime = document.getElementById('postReadTimeInput').value.trim() || '5 min read';
  const image = document.getElementById('postImageInput').value.trim();
  const excerpt = document.getElementById('postExcerptInput').value.trim();
  const content = document.getElementById('postContentInput').value.trim();
  const dateStr = new Date().toISOString().slice(0, 10);

  if (id) {
    const idx = appData.posts.findIndex(x => String(x.id) === String(id));
    if (idx !== -1) {
      appData.posts[idx] = {
        ...appData.posts[idx],
        title,
        slug,
        category: catObj.name,
        categorySlug: catSlug,
        author,
        readTime,
        image,
        excerpt,
        content
      };
    }
  } else {
    const newId = Date.now();
    appData.posts.unshift({
      id: newId,
      title,
      slug,
      category: catObj.name,
      categorySlug: catSlug,
      author,
      readTime,
      image,
      excerpt,
      content,
      date: dateStr,
      dateTime: new Date().toISOString()
    });
  }

  saveAppData();
  renderAdminPostsTable();
  closePostModal();
  showToast('Article saved successfully and synchronized across the site!');
}

function deletePost(id) {
  if (confirm('Are you sure you want to delete this article? This action cannot be undone.')) {
    appData.posts = appData.posts.filter(x => String(x.id) !== String(id));
    saveAppData();
    renderAdminPostsTable();
    showToast('Article deleted.');
  }
}

function closePostModal() {
  document.getElementById('postModal').classList.remove('show');
}

// 2. Categories CRUD
function renderAdminCatsTable() {
  const tbody = document.getElementById('adminCatsTableBody');
  if (!tbody) return;
  tbody.innerHTML = (appData.categories || []).map(c => `
    <tr>
      <td><strong>${c.name}</strong></td>
      <td><code>${c.slug}</code></td>
      <td><span class="badge-tag">${c.count || 0} Articles</span></td>
      <td>
        <div style="display:flex; gap:8px;">
          <a href="../category.html?slug=${c.slug}" target="_blank" class="btn btn-outline btn-sm"><i class="fa-solid fa-arrow-up-right-from-square"></i></a>
          <button class="btn btn-outline btn-sm" onclick="editCategory('${c.id || c.slug}')"><i class="fa-solid fa-pen"></i></button>
          <button class="btn btn-danger btn-sm" onclick="deleteCategory('${c.id || c.slug}')"><i class="fa-solid fa-trash"></i></button>
        </div>
      </td>
    </tr>
  `).join('');
}

function openAddCategoryModal() {
  document.getElementById('catModalTitle').innerText = 'Add Category';
  document.getElementById('catForm').reset();
  document.getElementById('catIdInput').value = '';
  document.getElementById('catModal').classList.add('show');
}

function editCategory(id) {
  const c = (appData.categories || []).find(x => String(x.id) === String(id) || x.slug === id);
  if (!c) return;
  document.getElementById('catModalTitle').innerText = 'Edit Category';
  document.getElementById('catIdInput').value = c.id || c.slug;
  document.getElementById('catNameInput').value = c.name;
  document.getElementById('catSlugInput').value = c.slug;
  document.getElementById('catModal').classList.add('show');
}

function saveCategory(event) {
  event.preventDefault();
  const id = document.getElementById('catIdInput').value;
  const name = document.getElementById('catNameInput').value.trim();
  const slug = document.getElementById('catSlugInput').value.trim().toLowerCase().replace(/\s+/g, '-');

  if (id) {
    const idx = appData.categories.findIndex(x => String(x.id) === String(id) || x.slug === id);
    if (idx !== -1) {
      appData.categories[idx] = { ...appData.categories[idx], name, slug };
    }
  } else {
    appData.categories.push({ id: slug, name, slug, count: 0 });
  }

  saveAppData();
  renderAdminCatsTable();
  populateCategorySelect();
  closeCatModal();
  showToast('Category saved successfully!');
}

function deleteCategory(id) {
  if (confirm('Are you sure you want to delete this category?')) {
    appData.categories = appData.categories.filter(x => String(x.id) !== String(id) && x.slug !== id);
    saveAppData();
    renderAdminCatsTable();
    populateCategorySelect();
    showToast('Category deleted.');
  }
}

function closeCatModal() {
  document.getElementById('catModal').classList.remove('show');
}

// 3. Static Pages Editor
function switchPageEditor(slug, btn) {
  activeEditingPage = slug;
  document.querySelectorAll('.page-nav-btn').forEach(b => {
    b.classList.remove('active', 'btn-primary');
    b.classList.add('btn-outline');
  });
  btn.classList.remove('btn-outline');
  btn.classList.add('active', 'btn-primary');
  loadPageEditor(slug);
}

function loadPageEditor(slug) {
  activeEditingPage = slug;
  const p = (appData.pages && appData.pages[slug]) || { title: slug.replace(/-/g, ' ').toUpperCase(), content: '' };
  document.getElementById('editorPageTitle').value = p.title || '';
  document.getElementById('editorPageContent').value = p.content || '';
}

function saveActivePageContent() {
  if (!appData.pages) appData.pages = {};
  appData.pages[activeEditingPage] = {
    title: document.getElementById('editorPageTitle').value,
    content: document.getElementById('editorPageContent').value,
    slug: activeEditingPage
  };
  saveAppData();
  showToast('Static page (' + activeEditingPage + ') updated successfully!');
}

// 4. Settings
function populateSettings() {
  const s = appData.settings || {};
  document.getElementById('setSiteTitle').value = s.siteTitle || 'Goal Pundit';
  document.getElementById('setTagline').value = s.tagline || 'Global Football Analysis & Tactical Insights';
  document.getElementById('setMetaDesc').value = s.description || '';
  document.getElementById('setLogoUrl').value = s.logo || '';
  document.getElementById('setTwitter').value = s.twitter || '';
  document.getElementById('setPinterest').value = s.pinterest || '';
  document.getElementById('setEmail').value = s.contactEmail || 'info@goalpundit.com';
  document.getElementById('setCopyright').value = s.copyright || 'Copyright © with GoalPundit 2026 Design by Entejsites Web Design';
}

function saveSettings(event) {
  event.preventDefault();
  appData.settings = {
    ...appData.settings,
    siteTitle: document.getElementById('setSiteTitle').value,
    tagline: document.getElementById('setTagline').value,
    description: document.getElementById('setMetaDesc').value,
    logo: document.getElementById('setLogoUrl').value,
    twitter: document.getElementById('setTwitter').value,
    pinterest: document.getElementById('setPinterest').value,
    contactEmail: document.getElementById('setEmail').value,
    copyright: document.getElementById('setCopyright').value
  };
  saveAppData();
  showToast('Global settings updated and saved!');
}

// 5. Image Upload Handler
function handleFileUpload(input, targetUrlInputId, previewImgId) {
  if (input.files && input.files[0]) {
    const file = input.files[0];
    const reader = new FileReader();
    reader.onload = function(e) {
      const dataUrl = e.target.result;
      document.getElementById(targetUrlInputId).value = dataUrl;
      const preview = document.getElementById(previewImgId);
      if (preview) preview.src = dataUrl;
      showToast('Image uploaded successfully!');
    };
    reader.readAsDataURL(file);
  }
}

// 6. Backup & Restore
function exportBackup() {
  const jsonStr = JSON.stringify(appData, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'goalpundit_backup_' + new Date().toISOString().slice(0, 10) + '.json';
  a.click();
  showToast('Backup downloaded successfully!');
}

function importBackup(input) {
  if (input.files && input.files[0]) {
    const reader = new FileReader();
    reader.onload = function(e) {
      try {
        const imported = JSON.parse(e.target.result);
        if (imported && imported.posts) {
          appData = imported;
          saveAppData();
          location.reload();
        } else {
          alert('Invalid JSON file format!');
        }
      } catch(err) {
        alert('Error parsing backup file!');
      }
    };
    reader.readAsText(input.files[0]);
  }
}

function resetAllData() {
  if (confirm('WARNING: Are you sure you want to reset all site data back to the default original dataset? Any new articles added locally will be reset.')) {
    localStorage.removeItem('goalpundit_data');
    location.reload();
  }
}
