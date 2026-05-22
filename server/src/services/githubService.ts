/**
 * GitHub Integration Service
 * Handles GitHub API interactions for PR review
 * Fetches PR metadata, changed files, and file contents
 */

import axios from 'axios';
import { GitHubFile } from '../types/review.types.js';

const GITHUB_API_BASE = 'https://api.github.com';

/**
 * Parses GitHub PR URL to extract owner, repo, and PR number
 * Supports formats:
 * - https://github.com/owner/repo/pull/123
 * - https://github.com/owner/repo/pull/123/
 */
export function parsePRUrl(prUrl: string): {
  owner: string;
  repo: string;
  prNumber: number;
} | null {
  try {
    const url = new URL(prUrl);
    const pathParts = url.pathname.split('/').filter(p => p);

    if (pathParts.length < 4 || pathParts[2] !== 'pull') {
      console.error('Invalid PR URL format:', prUrl);
      return null;
    }

    const owner = pathParts[0];
    const repo = pathParts[1];
    const prNumber = parseInt(pathParts[3], 10);

    if (!owner || !repo || isNaN(prNumber)) {
      console.error('Failed to parse PR URL components:', { owner, repo, prNumber });
      return null;
    }

    return { owner, repo, prNumber };
  } catch (error) {
    console.error('Error parsing PR URL:', error);
    return null;
  }
}

/**
 * Validates GitHub PR URL format
 */
export function validatePrUrl(url: string): boolean {
  return parsePRUrl(url) !== null;
}

/**
 * Gets PR metadata (title, description, etc.)
 */
export async function getPRMetadata(
  owner: string,
  repo: string,
  prNumber: number,
  token?: string
): Promise<{
  title: string;
  description: string;
  state: string;
  filesChanged: number;
} | null> {
  try {
    const headers: Record<string, string> = {
      'Accept': 'application/vnd.github.v3+json',
    };
    if (token) {
      headers['Authorization'] = `token ${token}`;
    }

    const response = await axios.get(
      `${GITHUB_API_BASE}/repos/${owner}/${repo}/pulls/${prNumber}`,
      { headers, timeout: 10000 }
    );

    return {
      title: response.data.title,
      description: response.data.body || '',
      state: response.data.state,
      filesChanged: response.data.changed_files,
    };
  } catch (error) {
    console.error('Failed to fetch PR metadata:', error);
    return null;
  }
}

/**
 * Gets list of changed files in PR with patch information
 */
export async function getPRFiles(
  owner: string,
  repo: string,
  prNumber: number,
  token?: string
): Promise<GitHubFile[]> {
  try {
    const headers: Record<string, string> = {
      'Accept': 'application/vnd.github.v3+json',
    };
    if (token) {
      headers['Authorization'] = `token ${token}`;
    }

    const response = await axios.get(
      `${GITHUB_API_BASE}/repos/${owner}/${repo}/pulls/${prNumber}/files?per_page=100`,
      { headers, timeout: 10000 }
    );

    const files: GitHubFile[] = [];

    for (const file of response.data) {
      // Skip deleted files and binary files
      if (file.status === 'deleted' || !file.patch) {
        continue;
      }

      // Determine language from file extension
      const language = getLanguageFromExtension(file.filename);
      if (!language) {
        console.log(`Skipping unsupported file: ${file.filename}`);
        continue;
      }

      // Extract file content from patch (diff)
      const content = extractContentFromPatch(file.patch, file.status);

      if (!content || content.length === 0) {
        continue;
      }

      files.push({
        fileName: file.filename.split('/').pop() || file.filename,
        filePath: file.filename,
        language,
        content,
        changeType: file.status === 'added' ? 'added' : 'modified',
        additions: file.additions,
        deletions: file.deletions,
      });
    }

    console.log(`✅ Found ${files.length} reviewable files in PR`);
    return files;
  } catch (error) {
    console.error('Failed to fetch PR files:', error);
    return [];
  }
}

/**
 * Extracts source code from GitHub diff patch
 * For new/modified files, reconstructs the full content
 */
function extractContentFromPatch(patch: string, status: string): string {
  try {
    const lines = patch.split('\n');
    let content = '';
    let inContent = false;

    for (const line of lines) {
      // Skip diff headers
      if (line.startsWith('@@')) {
        inContent = true;
        continue;
      }

      if (!inContent) {
        continue;
      }

      // For added/modified files: include lines starting with + or space
      if (status === 'added' || status === 'modified') {
        if (line.startsWith('+') && !line.startsWith('+++')) {
          content += line.substring(1) + '\n';
        } else if (line.startsWith(' ')) {
          content += line.substring(1) + '\n';
        }
      }
    }

    return content.trim();
  } catch (error) {
    console.error('Error extracting content from patch:', error);
    return '';
  }
}

/**
 * Maps file extensions to programming languages
 */
function getLanguageFromExtension(filePath: string): string | null {
  const extensionMap: Record<string, string> = {
    '.js': 'javascript',
    '.jsx': 'javascript',
    '.ts': 'typescript',
    '.tsx': 'typescript',
    '.py': 'python',
    '.java': 'java',
    '.cs': 'csharp',
    '.go': 'go',
    '.rs': 'rust',
    '.cpp': 'cpp',
    '.cc': 'cpp',
    '.c': 'c',
    '.h': 'c',
    '.php': 'php',
    '.rb': 'ruby',
    '.kt': 'kotlin',
    '.swift': 'swift',
    '.sql': 'sql',
  };

  const ext = filePath.substring(filePath.lastIndexOf('.')).toLowerCase();
  return extensionMap[ext] || null;
}

/**
 * Validates GitHub API token (if provided)
 */
export async function validateGitHubToken(token: string): Promise<boolean> {
  try {
    const response = await axios.get(`${GITHUB_API_BASE}/user`, {
      headers: {
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github.v3+json',
      },
      timeout: 5000,
    });
    return response.status === 200;
  } catch (error) {
    console.error('Invalid GitHub token:', error);
    return false;
  }
}

/**
 * Fetches PR diff from GitHub using PR URL (for backward compatibility)
 */
export async function fetchPrDiff(prUrl: string): Promise<string> {
  const parsed = parsePRUrl(prUrl);
  if (!parsed) {
    throw new Error('Invalid GitHub PR URL');
  }

  const files = await getPRFiles(parsed.owner, parsed.repo, parsed.prNumber);
  return files.map(f => `File: ${f.filePath}\n${f.content}`).join('\n\n---\n\n');
}

/**
 * Posts a review comment on a GitHub PR
 * Requires GitHub token for authentication
 */
export async function postPRComment(
  prUrl: string,
  commentBody: string,
  githubToken?: string
): Promise<{ success: boolean; commentUrl?: string; error?: string }> {
  try {
    const parsed = parsePRUrl(prUrl);
    if (!parsed) {
      return { success: false, error: 'Invalid GitHub PR URL' };
    }

    const { owner, repo, prNumber } = parsed;

    // GitHub API endpoint for creating a PR comment
    const apiUrl = `${GITHUB_API_BASE}/repos/${owner}/${repo}/issues/${prNumber}/comments`;

    const headers: Record<string, string> = {
      'Accept': 'application/vnd.github.v3+json',
    };

    if (githubToken) {
      headers['Authorization'] = `token ${githubToken}`;
    }

    console.log(`📤 Posting comment to PR #${prNumber}...`);
    const response = await axios.post(
      apiUrl,
      { body: commentBody },
      { 
        headers,
        timeout: 10000,
      }
    );

    const commentUrl = response.data.html_url;
    console.log(`✅ Comment posted successfully: ${commentUrl}`);

    return {
      success: true,
      commentUrl,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Failed to post PR comment:', errorMessage);
    
    // Check if it's a rate limit or auth error
    if (axios.isAxiosError(error)) {
      if (error.response?.status === 401) {
        return { success: false, error: 'Invalid GitHub token' };
      } else if (error.response?.status === 403) {
        return { success: false, error: 'Insufficient permissions or rate limited' };
      } else if (error.response?.status === 404) {
        return { success: false, error: 'PR or repository not found' };
      }
    }

    return { success: false, error: errorMessage };
  }
}
