# Testing Write Operations

This document provides instructions for manually testing the write operations feature.

## Prerequisites

1. **GitHub Account**: You need a GitHub account with a repository where you have write access
2. **Personal Access Token**: Create a token at https://github.com/settings/tokens with `repo` scope
3. **Running GitHub1s**: Either:
   - Use the hosted version at github1s.com
   - Run locally with `npm run watch`

## Test Scenarios

### Scenario 1: Basic File Edit

**Objective**: Edit an existing file and commit the change

**Steps**:

1. Navigate to a repository you own (e.g., `https://github1s.com/YOUR_USERNAME/YOUR_REPO`)
2. Authenticate with your GitHub token
3. Open any text file (e.g., `README.md`)
4. Make some changes to the file
5. Press `Ctrl+S` to save
6. Press `Ctrl+Shift+G` to open Source Control
7. Verify that your file appears in "GitHub1s Local Changes"
8. Type a commit message in the input box
9. Press `Ctrl+Enter` to commit
10. Choose "Current branch"
11. Verify success message appears
12. Visit the GitHub repository page and verify the commit was created

**Expected Result**:

- File appears in Source Control with modified status
- Commit is created successfully
- Changes are visible on GitHub

### Scenario 2: Create New File

**Objective**: Create a new file and commit it

**Steps**:

1. Navigate to your repository
2. Press `Ctrl+N` to create a new file
3. Type some content
4. Press `Ctrl+S` and choose a filename (e.g., `test.txt`)
5. Open Source Control (`Ctrl+Shift+G`)
6. Verify the new file appears in local changes
7. Open Command Palette (`Ctrl+Shift+P`)
8. Run "GitHub1s: Commit and Push Changes"
9. Enter commit message: "Add test file"
10. Choose "Current branch"
11. Verify the commit on GitHub

**Expected Result**:

- New file is created and tracked
- Commit succeeds
- File is visible in the repository on GitHub

### Scenario 3: Delete File

**Objective**: Delete a file and commit the deletion

**Steps**:

1. Navigate to your repository
2. In the Explorer, right-click a file
3. Select "Delete"
4. Confirm deletion
5. Open Source Control
6. Verify the file shows as deleted (strikethrough)
7. Commit the change
8. Verify the file is deleted on GitHub

**Expected Result**:

- File shows as deleted in Source Control
- Commit removes the file from the repository

### Scenario 4: Create New Branch and Commit

**Objective**: Create a new branch and commit changes to it

**Steps**:

1. Navigate to your repository
2. Make some changes to a file
3. Open Command Palette
4. Run "GitHub1s: Create New Branch"
5. Enter branch name: "feature/test-write"
6. Wait for success message
7. Open Command Palette again
8. Run "GitHub1s: Commit and Push Changes"
9. Enter commit message
10. Choose "Current branch" (should now be the new branch)
11. Verify on GitHub that the branch exists with your commit

**Expected Result**:

- New branch is created
- Changes are committed to the new branch
- Original branch remains unchanged

### Scenario 5: Multiple File Changes

**Objective**: Modify multiple files in one commit

**Steps**:

1. Navigate to your repository
2. Open and edit `README.md`
3. Save the changes
4. Open another file (e.g., `.gitignore`)
5. Make changes and save
6. Open Source Control
7. Verify both files appear in local changes
8. Run "GitHub1s: Show Changes Summary" from Command Palette
9. Verify both files are listed
10. Commit both files with message "Update multiple files"
11. Verify on GitHub that one commit contains both changes

**Expected Result**:

- Multiple files tracked correctly
- Single commit contains all changes

### Scenario 6: Discard Changes

**Objective**: Discard local changes without committing

**Steps**:

1. Navigate to your repository
2. Make some changes to a file
3. Save the changes
4. Open Source Control and verify the file appears
5. Open Command Palette
6. Run "GitHub1s: Discard Local Changes"
7. Confirm the action
8. Verify Source Control is now empty
9. Reopen the file and verify original content is restored

**Expected Result**:

- Changes are discarded
- File reverts to original content
- Source Control shows no changes

### Scenario 7: Rename File

**Objective**: Rename a file and commit the change

**Steps**:

1. Navigate to your repository
2. Right-click a file in Explorer
3. Select "Rename"
4. Enter new name
5. Open Source Control
6. Verify the operation is tracked
7. Commit the change
8. Verify on GitHub that the file has been renamed

**Expected Result**:

- File rename is tracked
- Commit reflects the rename operation

### Scenario 8: Copy File

**Objective**: Copy a file and commit it

**Steps**:

1. Navigate to your repository
2. Right-click a file in Explorer
3. Select "Copy"
4. Right-click in the Explorer
5. Select "Paste"
6. A copy should be created (e.g., `file copy.txt`)
7. Open Source Control
8. Verify the new file appears
9. Commit the change
10. Verify on GitHub

**Expected Result**:

- File is copied
- New file appears in Source Control
- Commit adds the copied file

### Scenario 9: Create Directory

**Objective**: Create a new directory structure

**Steps**:

1. Navigate to your repository
2. Right-click in Explorer
3. Select "New Folder"
4. Enter folder name (e.g., `new-folder`)
5. Create a file inside the folder
6. Commit the changes
7. Verify on GitHub

**Expected Result**:

- Directory is created
- Files in directory are tracked
- Commit includes the new directory structure

### Scenario 10: Error Handling - No Write Access

**Objective**: Verify error handling for repositories without write access

**Steps**:

1. Navigate to a public repository you don't own (e.g., `microsoft/vscode`)
2. Make changes to a file
3. Try to commit
4. Verify appropriate error message appears

**Expected Result**:

- Error message indicating no write access
- Commit fails gracefully

## Performance Testing

### Large File Changes

**Test**: Commit a file with significant size (e.g., 1MB)

**Expected**: Operation completes within reasonable time (< 30 seconds)

### Multiple Commits

**Test**: Make 5 consecutive commits

**Expected**: Each commit succeeds; no rate limiting issues

## Browser Compatibility

Test in the following browsers:

- ✅ Chrome/Edge (Latest)
- ✅ Firefox (Latest)
- ✅ Safari (Latest)

## Known Limitations

1. **Browser Refresh**: Uncommitted changes are lost on page refresh
2. **Large Files**: Very large files may hit GitHub API limits
3. **Binary Files**: Binary file editing may not work correctly
4. **Protected Branches**: Cannot commit directly to protected branches without proper permissions

## Reporting Issues

When reporting issues, please include:

- Browser and version
- Repository URL (if public)
- Steps to reproduce
- Error messages (from browser console and UI)
- Expected vs actual behavior

## Automated Testing

Currently, write operations are best tested manually. Future enhancements may include:

- Mock GitHub API for unit tests
- Integration tests with a test repository
- Automated E2E tests for commit workflows
