/**
 * @file Commands for writing and committing changes
 * @author github1s
 */

import * as vscode from 'vscode';
import { CommitService } from '@/services/commit-service';
import { GitHub1sFileSystemProvider } from '@/providers/file-system';

export const registerWriteCommands = (context: vscode.ExtensionContext) => {
	// Command to commit and push changes
	context.subscriptions.push(
		vscode.commands.registerCommand('github1s.commitAndPush', async () => {
			const fsProvider = GitHub1sFileSystemProvider.getInstance();
			const modifiedFiles = fsProvider.getModifiedFiles();
			const deletedFiles = fsProvider.getDeletedFiles();

			if (modifiedFiles.length === 0 && deletedFiles.length === 0) {
				vscode.window.showInformationMessage('No changes to commit');
				return;
			}

			// Show changes summary
			const changesSummary = [
				modifiedFiles.length > 0 ? `${modifiedFiles.length} modified file(s)` : '',
				deletedFiles.length > 0 ? `${deletedFiles.length} deleted file(s)` : '',
			]
				.filter(Boolean)
				.join(', ');

			vscode.window.showInformationMessage(`Changes: ${changesSummary}`);

			// Prompt for commit message
			const message = await vscode.window.showInputBox({
				prompt: 'Enter commit message',
				placeHolder: 'Update files',
				validateInput: (value) => {
					if (!value || value.trim().length === 0) {
						return 'Commit message cannot be empty';
					}
					return null;
				},
			});

			if (!message) {
				return;
			}

			// Optionally prompt for branch name
			const useDifferentBranch = await vscode.window.showQuickPick(['Current branch', 'New branch'], {
				placeHolder: 'Select where to commit',
			});

			if (!useDifferentBranch) {
				return;
			}

			let branch: string | undefined;
			if (useDifferentBranch === 'New branch') {
				branch = await vscode.window.showInputBox({
					prompt: 'Enter new branch name',
					placeHolder: 'feature/my-changes',
					validateInput: (value) => {
						if (!value || value.trim().length === 0) {
							return 'Branch name cannot be empty';
						}
						// Basic validation for branch names
						if (!/^[a-zA-Z0-9/_-]+$/.test(value)) {
							return 'Invalid branch name. Use only letters, numbers, /, _, and -';
						}
						return null;
					},
				});

				if (!branch) {
					return;
				}

				// Create the new branch first
				try {
					await CommitService.getInstance().createBranch(branch);
				} catch (error) {
					// If branch creation fails, abort
					return;
				}
			}

			// Commit and push
			try {
				await vscode.window.withProgress(
					{
						location: vscode.ProgressLocation.Notification,
						title: 'Committing and pushing changes...',
						cancellable: false,
					},
					async () => {
						await CommitService.getInstance().commitAndPush(message, branch);
					},
				);
			} catch (error) {
				// Error already shown in CommitService
			}
		}),
	);

	// Command to create a new branch
	context.subscriptions.push(
		vscode.commands.registerCommand('github1s.createBranch', async () => {
			const branchName = await vscode.window.showInputBox({
				prompt: 'Enter new branch name',
				placeHolder: 'feature/my-branch',
				validateInput: (value) => {
					if (!value || value.trim().length === 0) {
						return 'Branch name cannot be empty';
					}
					if (!/^[a-zA-Z0-9/_-]+$/.test(value)) {
						return 'Invalid branch name. Use only letters, numbers, /, _, and -';
					}
					return null;
				},
			});

			if (!branchName) {
				return;
			}

			try {
				await vscode.window.withProgress(
					{
						location: vscode.ProgressLocation.Notification,
						title: `Creating branch ${branchName}...`,
						cancellable: false,
					},
					async () => {
						await CommitService.getInstance().createBranch(branchName);
					},
				);
			} catch (error) {
				// Error already shown in CommitService
			}
		}),
	);

	// Command to discard local changes
	context.subscriptions.push(
		vscode.commands.registerCommand('github1s.discardChanges', async () => {
			const fsProvider = GitHub1sFileSystemProvider.getInstance();
			const modifiedFiles = fsProvider.getModifiedFiles();
			const deletedFiles = fsProvider.getDeletedFiles();

			if (modifiedFiles.length === 0 && deletedFiles.length === 0) {
				vscode.window.showInformationMessage('No changes to discard');
				return;
			}

			const confirmation = await vscode.window.showWarningMessage(
				`Discard all local changes? (${modifiedFiles.length} modified, ${deletedFiles.length} deleted)`,
				{ modal: true },
				'Discard',
			);

			if (confirmation === 'Discard') {
				fsProvider.clearModifications();
				vscode.window.showInformationMessage('All local changes discarded');
			}
		}),
	);

	// Command to show changes summary
	context.subscriptions.push(
		vscode.commands.registerCommand('github1s.showChangesSummary', () => {
			const fsProvider = GitHub1sFileSystemProvider.getInstance();
			const modifiedFiles = fsProvider.getModifiedFiles();
			const deletedFiles = fsProvider.getDeletedFiles();

			if (modifiedFiles.length === 0 && deletedFiles.length === 0) {
				vscode.window.showInformationMessage('No local changes');
				return;
			}

			const items: vscode.QuickPickItem[] = [];

			if (modifiedFiles.length > 0) {
				items.push({ label: 'Modified Files', kind: vscode.QuickPickItemKind.Separator });
				modifiedFiles.forEach(({ uri }) => {
					items.push({ label: uri, description: 'modified' });
				});
			}

			if (deletedFiles.length > 0) {
				items.push({ label: 'Deleted Files', kind: vscode.QuickPickItemKind.Separator });
				deletedFiles.forEach((uri) => {
					items.push({ label: uri, description: 'deleted' });
				});
			}

			vscode.window.showQuickPick(items, {
				title: 'Local Changes',
				placeHolder: `${modifiedFiles.length} modified, ${deletedFiles.length} deleted`,
			});
		}),
	);
};
