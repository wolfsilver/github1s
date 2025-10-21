# Write Operations and Commit Functionality

GitHub1s now supports write operations, allowing you to edit files and commit changes directly to your GitHub repository.

## Features

### File Operations

- **Create Files**: Create new files in the repository
- **Edit Files**: Modify existing files
- **Delete Files**: Remove files from the repository
- **Rename Files**: Rename or move files
- **Copy Files**: Duplicate files
- **Create Directories**: Create new folders

### Commit and Push

All local changes are tracked and can be committed to GitHub directly from the VS Code interface.

## How to Use

### 1. Editing Files

Simply open any file and start editing. Your changes will be tracked locally.

### 2. Viewing Local Changes

- Open the **Source Control** panel (Ctrl+Shift+G)
- You'll see a new section called "GitHub1s Local Changes"
- This shows all files that have been modified or deleted

Alternatively, use the command palette (Ctrl+Shift+P) and run:

- `GitHub1s: Show Changes Summary`

### 3. Committing Changes

There are several ways to commit your changes:

#### Option 1: Source Control Panel

1. Open the Source Control panel
2. Type your commit message in the input box
3. Press Ctrl+Enter or click the commit icon

#### Option 2: Command Palette

1. Open the command palette (Ctrl+Shift+P)
2. Run `GitHub1s: Commit and Push Changes`
3. Enter your commit message
4. Choose whether to commit to the current branch or create a new branch

### 4. Creating a New Branch

Before committing, you can create a new branch:

1. Open the command palette (Ctrl+Shift+P)
2. Run `GitHub1s: Create New Branch`
3. Enter the new branch name
4. The branch will be created from your current location

### 5. Discarding Changes

To discard all local changes:

1. Open the command palette (Ctrl+Shift+P)
2. Run `GitHub1s: Discard Local Changes`
3. Confirm the action

## Authentication

To use write operations, you must be authenticated with GitHub:

1. You need a GitHub Personal Access Token with appropriate permissions
2. The token must have `repo` scope to write to repositories
3. You can only write to repositories where you have push access

## Available Commands

| Command                             | Description                        | Shortcut |
| ----------------------------------- | ---------------------------------- | -------- |
| `GitHub1s: Commit and Push Changes` | Commit and push your local changes | -        |
| `GitHub1s: Create New Branch`       | Create a new branch                | -        |
| `GitHub1s: Discard Local Changes`   | Discard all local modifications    | -        |
| `GitHub1s: Show Changes Summary`    | View a summary of local changes    | -        |

## How It Works

### Local Change Tracking

When you modify, create, or delete files:

1. Changes are stored locally in the browser
2. The original file content is cached from GitHub
3. Modified content is kept in a separate cache
4. All changes are reflected in the Source Control panel

### Commit Process

When you commit changes:

1. For each modified file, a blob is created in GitHub
2. A new tree is created with all changes
3. A commit is created referencing the new tree
4. The branch reference is updated to point to the new commit
5. Local changes are cleared after successful commit

## Limitations

- Write operations are only supported for the GitHub platform (github1s)
- You must have appropriate repository permissions
- Changes are kept in browser memory until committed
- Browser refresh will lose uncommitted changes
- Large file uploads may be limited by GitHub API constraints

## Examples

### Example 1: Edit and Commit

```
1. Open a file (e.g., README.md)
2. Make some changes
3. Press Ctrl+Shift+G to open Source Control
4. Type "Update README"
5. Press Ctrl+Enter to commit
6. Choose "Current branch"
```

### Example 2: Create File and Commit to New Branch

```
1. Create a new file (File > New File)
2. Save it with a name
3. Press Ctrl+Shift+P
4. Run "GitHub1s: Commit and Push Changes"
5. Enter commit message
6. Choose "New branch"
7. Enter branch name (e.g., "feature/new-file")
```

## Troubleshooting

### "No permission for this operation"

- Make sure you're authenticated with a valid token
- Verify your token has the `repo` scope
- Check that you have write access to the repository

### "Failed to commit"

- Check your internet connection
- Verify the branch name is valid
- Ensure you're not working on a protected branch without proper permissions

### Changes disappeared after refresh

- Uncommitted changes are stored in browser memory
- Always commit your changes before refreshing the page
- Consider using `git stash` concepts for larger workflows

## Technical Details

The write functionality is implemented using:

- GitHub's Git Data API for creating blobs, trees, and commits
- VS Code's FileSystemProvider API for file operations
- Custom source control integration for tracking changes
- GitHub's REST API with Octokit for authentication and API calls

## Future Enhancements

Potential improvements for future versions:

- Persistent storage of uncommitted changes
- Support for multi-file commits with staging
- Pull request creation from commits
- Conflict resolution for concurrent edits
- Support for GitLab and other platforms
