/**
 * @file Commit Service for creating commits and pushing to GitHub
 * @author github1s
 */

import * as vscode from 'vscode';
import { GitHubFetcher } from '@/adapters/github1s/fetcher';
import { GitHub1sFileSystemProvider } from '@/providers/file-system';
import router from '@/router';

interface CommitFileChange {
	path: string;
	content?: string;
	sha?: string;
	mode?: '100644' | '100755' | '040000' | '160000' | '120000';
	type?: 'blob' | 'tree' | 'commit';
}

export class CommitService {
	private static instance: CommitService | null = null;

	public static getInstance(): CommitService {
		if (CommitService.instance) {
			return CommitService.instance;
		}
		return (CommitService.instance = new CommitService());
	}

	private constructor() {}

	/**
	 * Create a commit with the current changes and push to GitHub
	 * @param message - The commit message
	 * @param branch - Optional branch name to commit to. If not provided, uses current branch
	 */
	async commitAndPush(message: string, branch?: string): Promise<void> {
		const fetcher = GitHubFetcher.getInstance();
		const fsProvider = GitHub1sFileSystemProvider.getInstance();
		const { repo, ref } = await router.getState();
		const [owner, repoName] = repo.split('/');

		if (!owner || !repoName) {
			throw new Error('Invalid repository format');
		}

		// Use provided branch or current ref
		const targetBranch = branch || ref;

		try {
			// Get current branch reference
			const { data: refData } = await fetcher.request('GET /repos/{owner}/{repo}/git/ref/{ref}', {
				owner,
				repo: repoName,
				ref: `heads/${targetBranch}`,
			});

			const currentCommitSha = refData.object.sha;

			// Get the current commit to get the tree SHA
			const { data: commitData } = await fetcher.request('GET /repos/{owner}/{repo}/git/commits/{commit_sha}', {
				owner,
				repo: repoName,
				commit_sha: currentCommitSha,
			});

			const baseTreeSha = commitData.tree.sha;

			// Prepare tree entries from modified and deleted files
			const modifiedFiles = fsProvider.getModifiedFiles();
			const deletedFiles = fsProvider.getDeletedFiles();

			const tree: CommitFileChange[] = [];

			// Add modified files
			for (const { uri, content } of modifiedFiles) {
				// Extract path from URI
				const parsedUri = vscode.Uri.parse(uri);
				const filePath = parsedUri.path.slice(1); // Remove leading slash

				// Create blob for the file content
				const { data: blobData } = await fetcher.request('POST /repos/{owner}/{repo}/git/blobs', {
					owner,
					repo: repoName,
					content: Buffer.from(content).toString('base64'),
					encoding: 'base64',
				});

				tree.push({
					path: filePath,
					mode: '100644',
					type: 'blob',
					sha: blobData.sha,
				});
			}

			// Add deleted files
			for (const uri of deletedFiles) {
				const parsedUri = vscode.Uri.parse(uri);
				const filePath = parsedUri.path.slice(1); // Remove leading slash

				tree.push({
					path: filePath,
					mode: '100644',
					type: 'blob',
					sha: null as any, // null sha means delete
				});
			}

			if (tree.length === 0) {
				vscode.window.showInformationMessage('No changes to commit');
				return;
			}

			// Create new tree
			const { data: treeData } = await fetcher.request('POST /repos/{owner}/{repo}/git/trees', {
				owner,
				repo: repoName,
				base_tree: baseTreeSha,
				tree: tree as any,
			});

			// Create commit
			const { data: newCommitData } = await fetcher.request('POST /repos/{owner}/{repo}/git/commits', {
				owner,
				repo: repoName,
				message,
				tree: treeData.sha,
				parents: [currentCommitSha],
			});

			// Update reference
			await fetcher.request('PATCH /repos/{owner}/{repo}/git/refs/{ref}', {
				owner,
				repo: repoName,
				ref: `heads/${targetBranch}`,
				sha: newCommitData.sha,
			});

			// Clear local modifications
			fsProvider.clearModifications();

			vscode.window.showInformationMessage(
				`Successfully committed and pushed to ${targetBranch}: ${newCommitData.sha.slice(0, 7)}`,
			);
		} catch (error: any) {
			console.error('Failed to commit and push:', error);
			vscode.window.showErrorMessage(`Failed to commit: ${error.message || 'Unknown error'}`);
			throw error;
		}
	}

	/**
	 * Create a new branch from the current ref
	 * @param branchName - The name of the new branch to create
	 */
	async createBranch(branchName: string): Promise<void> {
		const fetcher = GitHubFetcher.getInstance();
		const { repo, ref } = await router.getState();
		const [owner, repoName] = repo.split('/');

		if (!owner || !repoName) {
			throw new Error('Invalid repository format');
		}

		try {
			// Get current ref SHA
			const { data: refData } = await fetcher.request('GET /repos/{owner}/{repo}/git/ref/{ref}', {
				owner,
				repo: repoName,
				ref: `heads/${ref}`,
			});

			// Create new branch
			await fetcher.request('POST /repos/{owner}/{repo}/git/refs', {
				owner,
				repo: repoName,
				ref: `refs/heads/${branchName}`,
				sha: refData.object.sha,
			});

			vscode.window.showInformationMessage(`Successfully created branch: ${branchName}`);
		} catch (error: any) {
			console.error('Failed to create branch:', error);
			vscode.window.showErrorMessage(`Failed to create branch: ${error.message || 'Unknown error'}`);
			throw error;
		}
	}
}
