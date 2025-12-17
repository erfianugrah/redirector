/**
 * HTML template for the admin UI
 */
export function getAdminHtml(redirectCount: number): string {
	return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Redirector Admin</title>
  <style>
    :root {
      --primary: #f6821f;
      --primary-dark: #d96c19;
      --background: #f7f7f7;
      --white: #ffffff;
      --text: #333333;
      --border: #dddddd;
      --success: #2ecc71;
      --error: #e74c3c;
    }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
      margin: 0;
      padding: 0;
      background-color: var(--background);
      color: var(--text);
    }
    
    .container {
      max-width: 1000px;
      margin: 0 auto;
      padding: 2rem;
    }
    
    header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 2rem;
      border-bottom: 1px solid var(--border);
      padding-bottom: 1rem;
    }
    
    h1 {
      margin: 0;
      color: var(--primary);
    }
    
    .stats {
      background-color: var(--white);
      border-radius: 5px;
      padding: 1rem;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
      margin-bottom: 2rem;
    }
    
    .card {
      background-color: var(--white);
      border-radius: 5px;
      padding: 1.5rem;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
      margin-bottom: 2rem;
    }
    
    h2 {
      margin-top: 0;
      color: var(--text);
      border-bottom: 1px solid var(--border);
      padding-bottom: 0.5rem;
      margin-bottom: 1.5rem;
    }
    
    .form-group {
      margin-bottom: 1rem;
    }
    
    label {
      display: block;
      margin-bottom: 0.5rem;
      font-weight: bold;
    }
    
    textarea, select, input {
      width: 100%;
      padding: 0.5rem;
      border: 1px solid var(--border);
      border-radius: 4px;
      font-family: inherit;
      font-size: 1rem;
    }
    
    textarea {
      min-height: 200px;
      font-family: monospace;
    }
    
    .checkbox {
      display: flex;
      align-items: center;
    }
    
    .checkbox input {
      width: auto;
      margin-right: 10px;
    }
    
    button {
      background-color: var(--primary);
      color: var(--white);
      border: none;
      border-radius: 4px;
      padding: 0.75rem 1.5rem;
      font-size: 1rem;
      cursor: pointer;
      transition: background-color 0.2s;
    }
    
    button:hover {
      background-color: var(--primary-dark);
    }
    
    .success {
      color: var(--success);
      border: 1px solid var(--success);
      background-color: rgba(46, 204, 113, 0.1);
      padding: 0.75rem;
      border-radius: 4px;
      margin: 1rem 0;
      display: none;
    }
    
    .error {
      color: var(--error);
      border: 1px solid var(--error);
      background-color: rgba(231, 76, 60, 0.1);
      padding: 0.75rem;
      border-radius: 4px;
      margin: 1rem 0;
      display: none;
    }
    
    .buttons {
      display: flex;
      justify-content: space-between;
      gap: 1rem;
      margin-top: 1.5rem;
    }
    
    .button-download {
      flex: 1;
      text-align: center;
    }
    
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 1rem;
    }
    
    th, td {
      padding: 0.75rem;
      text-align: left;
      border-bottom: 1px solid var(--border);
    }
    
    th {
      background-color: #f2f2f2;
    }
    
    .delete-btn {
      background-color: var(--error);
      padding: 0.25rem 0.5rem;
      font-size: 0.875rem;
    }
    
    .delete-btn:hover {
      background-color: #c0392b;
    }
    
    @media (max-width: 768px) {
      .container {
        padding: 1rem;
      }
      
      .buttons {
        flex-direction: column;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <h1>Redirector Admin</h1>
      <div>
        <button id="refreshBtn">Refresh</button>
      </div>
    </header>
    
    <div class="card" style="background-color: #fff3cd; border-left: 4px solid var(--primary);">
      <h2>🔐 Authentication</h2>
      <div class="form-group">
        <label for="apiKey">API Key (required)</label>
        <input type="password" id="apiKey" placeholder="Enter your API key..." autocomplete="off">
        <small style="color: #666; display: block; margin-top: 0.5rem;">
          This key is required to access the admin panel and API. Stored only in your browser session.
        </small>
      </div>
      <div class="error" id="authError"></div>
    </div>

    <div class="stats">
      <h3>Statistics</h3>
      <p>Total Redirects: <strong id="redirectCount">${redirectCount}</strong></p>
    </div>
    
    <div class="card">
      <h2>Upload Redirects</h2>
      
      <div class="form-group">
        <label for="uploadFormat">File Format</label>
        <select id="uploadFormat">
          <option value="json">JSON</option>
          <option value="csv">CSV</option>
          <option value="terraform">Terraform</option>
        </select>
      </div>
      
      <div class="form-group">
        <label for="fileContent">File Content</label>
        <textarea id="fileContent" placeholder="Paste file content here..."></textarea>
      </div>
      
      <div class="checkbox">
        <input type="checkbox" id="overwrite">
        <label for="overwrite">Overwrite existing redirects</label>
      </div>
      
      <div class="success" id="uploadSuccess"></div>
      <div class="error" id="uploadError"></div>
      
      <button id="uploadBtn">Upload</button>
    </div>
    
    <div class="card">
      <h2>Download Redirects</h2>
      
      <div class="form-group">
        <label>Choose Format</label>
        <div class="buttons">
          <div class="button-download">
            <button id="downloadJsonBtn">JSON</button>
          </div>
          <div class="button-download">
            <button id="downloadCsvBtn">CSV</button>
          </div>
          <div class="button-download">
            <button id="downloadTfBtn">Terraform</button>
          </div>
        </div>
      </div>
      
      <div class="error" id="downloadError"></div>
    </div>
    
    <div class="card">
      <h2>Current Redirects</h2>
      <div id="redirectsTable">
        <table>
          <thead>
            <tr>
              <th>Source</th>
              <th>Destination</th>
              <th>Status</th>
              <th>Enabled</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody id="redirectsList">
            <tr>
              <td colspan="5">Loading redirects...</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
  
  <script>
    // Elements
    const apiKeyElem = document.getElementById('apiKey');
    const authErrorElem = document.getElementById('authError');
    const fileContentElem = document.getElementById('fileContent');
    const uploadFormatElem = document.getElementById('uploadFormat');
    const overwriteElem = document.getElementById('overwrite');
    const uploadBtn = document.getElementById('uploadBtn');
    const uploadSuccessElem = document.getElementById('uploadSuccess');
    const uploadErrorElem = document.getElementById('uploadError');
    const downloadJsonBtn = document.getElementById('downloadJsonBtn');
    const downloadCsvBtn = document.getElementById('downloadCsvBtn');
    const downloadTfBtn = document.getElementById('downloadTfBtn');
    const downloadErrorElem = document.getElementById('downloadError');
    const redirectsListElem = document.getElementById('redirectsList');
    const redirectCountElem = document.getElementById('redirectCount');
    const refreshBtn = document.getElementById('refreshBtn');

    // API Key Management
    function getApiKey() {
      return apiKeyElem.value.trim() || sessionStorage.getItem('apiKey') || '';
    }

    function saveApiKey() {
      const key = apiKeyElem.value.trim();
      if (key) {
        sessionStorage.setItem('apiKey', key);
      }
    }

    function loadApiKey() {
      const savedKey = sessionStorage.getItem('apiKey');
      if (savedKey) {
        apiKeyElem.value = savedKey;
      }
    }

    function getHeaders() {
      const apiKey = getApiKey();
      return {
        'Content-Type': 'application/json',
        'X-API-Key': apiKey
      };
    }

    function handleAuthError(message) {
      authErrorElem.textContent = message || 'Authentication failed. Please check your API key.';
      authErrorElem.style.display = 'block';
      // Clear invalid key from session
      sessionStorage.removeItem('apiKey');
    }

    function clearAuthError() {
      authErrorElem.style.display = 'none';
    }

    // Save API key when it changes
    apiKeyElem.addEventListener('input', () => {
      saveApiKey();
      clearAuthError();
    });
    
    // Load redirects on page load
    window.addEventListener('DOMContentLoaded', () => {
      loadApiKey();
      loadRedirects();
    });
    
    // Refresh button
    refreshBtn.addEventListener('click', () => {
      loadRedirects();
    });
    
    // Upload button
    uploadBtn.addEventListener('click', async () => {
      // Reset messages
      uploadSuccessElem.style.display = 'none';
      uploadErrorElem.style.display = 'none';
      
      // Get values
      const content = fileContentElem.value.trim();
      const format = uploadFormatElem.value;
      const overwrite = overwriteElem.checked;
      
      if (!content) {
        showUploadError('Please enter file content');
        return;
      }
      
      try {
        // Upload content
        const response = await fetch('/api/files/upload', {
          method: 'POST',
          headers: getHeaders(),
          body: JSON.stringify({ content, format, overwrite })
        });

        const data = await response.json();

        if (response.ok) {
          showUploadSuccess(data.message);
          clearAuthError();
          // Refresh redirects list
          loadRedirects();
          // Clear form
          fileContentElem.value = '';
        } else {
          if (response.status === 401) {
            handleAuthError(data.message);
          }
          showUploadError(data.message || 'Upload failed');
        }
      } catch (error) {
        showUploadError('Upload failed: ' + error.message);
      }
    });
    
    // Download buttons
    downloadJsonBtn.addEventListener('click', () => downloadRedirects('json'));
    downloadCsvBtn.addEventListener('click', () => downloadRedirects('csv'));
    downloadTfBtn.addEventListener('click', () => downloadRedirects('terraform'));
    
    // Load redirects from API
    async function loadRedirects() {
      try {
        const response = await fetch('/api/redirects', {
          headers: getHeaders()
        });
        const data = await response.json();

        if (response.ok) {
          clearAuthError();
          const redirects = data.redirects || {};
          const redirectsArray = Object.values(redirects);
          
          // Update count
          redirectCountElem.textContent = redirectsArray.length;
          
          // Clear table
          redirectsListElem.innerHTML = '';
          
          if (redirectsArray.length === 0) {
            const row = document.createElement('tr');
            row.innerHTML = '<td colspan="5">No redirects found</td>';
            redirectsListElem.appendChild(row);
            return;
          }
          
          // Add redirects to table
          redirectsArray.forEach(redirect => {
            const row = document.createElement('tr');
            
            row.innerHTML = \`
              <td>\${escapeHtml(redirect.source)}</td>
              <td>\${escapeHtml(redirect.destination)}</td>
              <td>\${redirect.statusCode}</td>
              <td>\${redirect.enabled ? 'Yes' : 'No'}</td>
              <td>
                <button class="delete-btn" data-source="\${escapeHtml(redirect.source)}">Delete</button>
              </td>
            \`;
            
            redirectsListElem.appendChild(row);
          });
          
          // Add event listeners to delete buttons
          document.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', async (event) => {
              const source = event.target.getAttribute('data-source');
              if (confirm('Are you sure you want to delete this redirect?')) {
                await deleteRedirect(source);
              }
            });
          });
        } else {
          redirectsListElem.innerHTML = '<tr><td colspan="5">Failed to load redirects</td></tr>';
        }
      } catch (error) {
        redirectsListElem.innerHTML = \`<tr><td colspan="5">Error: \${error.message}</td></tr>\`;
      }
    }
    
    // Download redirects
    async function downloadRedirects(format) {
      try {
        downloadErrorElem.style.display = 'none';

        // Request file download
        const response = await fetch('/api/files/download', {
          method: 'POST',
          headers: getHeaders(),
          body: JSON.stringify({ format })
        });
        
        if (response.ok) {
          // Get file name from Content-Disposition header
          const contentDisposition = response.headers.get('Content-Disposition');
          let filename = 'redirects';
          
          if (contentDisposition) {
            const matches = /filename="([^"]+)"/.exec(contentDisposition);
            if (matches && matches[1]) {
              filename = matches[1];
            }
          }
          
          // Get file content
          const blob = await response.blob();
          
          // Create download link
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = filename;
          document.body.appendChild(a);
          a.click();
          
          // Clean up
          setTimeout(() => {
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
          }, 0);
          clearAuthError();
        } else {
          const data = await response.json();
          if (response.status === 401) {
            handleAuthError(data.message);
          }
          downloadErrorElem.textContent = data.message || 'Download failed';
          downloadErrorElem.style.display = 'block';
        }
      } catch (error) {
        downloadErrorElem.textContent = 'Download failed: ' + error.message;
        downloadErrorElem.style.display = 'block';
      }
    }
    
    // Delete redirect
    async function deleteRedirect(source) {
      try {
        const encodedSource = encodeURIComponent(source);
        const response = await fetch(\`/api/redirects/\${encodedSource}\`, {
          method: 'DELETE',
          headers: getHeaders()
        });

        if (response.ok) {
          clearAuthError();
          // Refresh redirects list
          loadRedirects();
        } else {
          const data = await response.json();
          if (response.status === 401) {
            handleAuthError(data.message);
          }
          alert(data.message || 'Failed to delete redirect');
        }
      } catch (error) {
        alert('Delete failed: ' + error.message);
      }
    }
    
    // Show upload success message
    function showUploadSuccess(message) {
      uploadSuccessElem.textContent = message;
      uploadSuccessElem.style.display = 'block';
    }
    
    // Show upload error message
    function showUploadError(message) {
      uploadErrorElem.textContent = message;
      uploadErrorElem.style.display = 'block';
    }
    
    // Helper function to escape HTML
    function escapeHtml(text) {
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    }
  </script>
</body>
</html>`;
}
