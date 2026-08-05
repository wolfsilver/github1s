# Write Operations - Usage Examples

This document provides practical examples of using the write operations feature in GitHub1s.

## Example 1: Quick Fix to README

**Scenario**: You spot a typo in a project's README and want to fix it quickly.

**Steps**:

```
1. Navigate to: https://github1s.com/your-username/your-repo
2. Click on README.md in the Explorer
3. Fix the typo
4. Press Ctrl+S to save
5. Press Ctrl+Shift+G to open Source Control
6. Type commit message: "Fix typo in README"
7. Press Ctrl+Enter
8. Select "Current branch"
```

**Result**: The typo is fixed and committed in under 30 seconds!

## Example 2: Add a New Configuration File

**Scenario**: You need to add a `.prettierrc` configuration file to a project.

**Steps**:

```
1. Open the project in GitHub1s
2. Press Ctrl+N for new file
3. Paste your Prettier configuration:
   {
     "semi": true,
     "singleQuote": true,
     "tabWidth": 2
   }
4. Press Ctrl+S and name it `.prettierrc`
5. Open Command Palette (Ctrl+Shift+P)
6. Type "GitHub1s: Commit"
7. Enter message: "Add Prettier configuration"
8. Choose "New branch"
9. Enter branch name: "config/prettier"
```

**Result**: New configuration file added in a new branch, ready for a pull request!

## Example 3: Update Multiple Documentation Files

**Scenario**: You need to update several markdown files to reflect API changes.

**Steps**:

```
1. Navigate to the repository
2. Open docs/api.md and make changes
3. Save (Ctrl+S)
4. Open docs/quickstart.md and make changes
5. Save (Ctrl+S)
6. Open docs/examples.md and make changes
7. Save (Ctrl+S)
8. Press Ctrl+Shift+G
9. Review all three changed files
10. Enter message: "Update API documentation for v2.0"
11. Commit with Ctrl+Enter
```

**Result**: All documentation updates in a single commit!

## Example 4: Create a New Feature Branch with Changes

**Scenario**: Start working on a new feature in a dedicated branch.

**Steps**:

```
1. Open the repository
2. Press Ctrl+Shift+P
3. Run "GitHub1s: Create New Branch"
4. Enter: "feature/user-authentication"
5. Make your code changes across multiple files
6. When ready to commit:
   - Open Source Control (Ctrl+Shift+G)
   - Review changes
   - Enter message: "Add user authentication scaffolding"
   - Commit (Ctrl+Enter)
7. On GitHub, create a Pull Request from your new branch
```

**Result**: Feature branch with initial implementation ready for review!

## Example 5: Fix a Bug in Production

**Scenario**: Critical bug found in production that needs immediate fix.

**Steps**:

```
1. Navigate to the repository at the production branch/tag
2. Create a hotfix branch:
   - Ctrl+Shift+P
   - "GitHub1s: Create New Branch"
   - Enter: "hotfix/critical-security-fix"
3. Open the affected file
4. Apply the fix
5. Add a test if needed
6. Commit with clear message:
   - "Fix critical security vulnerability in auth handler"
7. Go to GitHub and immediately create PR for review
```

**Result**: Quick hotfix ready for expedited review and deployment!

## Example 6: Refactor Code with Multiple File Changes

**Scenario**: Rename a function across multiple files.

**Steps**:

```
1. Open the project
2. Use VS Code's "Find in Files" (Ctrl+Shift+F)
3. Search for the old function name
4. Use Find and Replace to update all occurrences
5. Make any additional refactoring changes
6. Test your changes (if possible in the browser)
7. Open Source Control to review all changed files:
   - src/utils.js (modified)
   - src/api.js (modified)
   - src/tests/utils.test.js (modified)
8. Commit with message: "Refactor: Rename getUserData to fetchUserProfile"
```

**Result**: Clean refactor across multiple files in one commit!

## Example 7: Add GitHub Actions Workflow

**Scenario**: Add CI/CD pipeline to the project.

**Steps**:

```
1. Open the repository
2. Create directory: .github/workflows
   - Right-click Explorer → New Folder
3. Create file: ci.yml
   - Press Ctrl+N
   - Add workflow configuration
4. Save as .github/workflows/ci.yml
5. Commit with message: "Add GitHub Actions CI workflow"
```

**Workflow Example**:

```yaml
name: CI
on: [push, pull_request]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Run tests
        run: npm test
```

**Result**: CI/CD pipeline added and ready to run!

## Example 8: Update Dependencies

**Scenario**: Update package.json dependencies.

**Steps**:

```
1. Navigate to repository
2. Open package.json
3. Update version numbers for dependencies:
   "react": "^18.0.0" → "react": "^18.2.0"
4. Also update package-lock.json if needed
5. Commit with message: "Update React to 18.2.0"
```

**Note**: While you can update the files, actual package installation would need to be done locally or in CI.

## Example 9: Emergency Revert

**Scenario**: Need to quickly revert a bad commit.

**Steps**:

```
1. Navigate to the repository
2. Open the problematic file
3. Use file history (if available) or manually restore previous content
4. Save the changes
5. Commit with message: "Revert changes from commit abc123"
```

**Alternative**: For complex reverts, might be better to use local git tools.

## Example 10: Documentation-Only Update

**Scenario**: Update documentation without touching code.

**Steps**:

```
1. Open repository
2. Create new branch: "docs/improve-readme"
3. Edit README.md:
   - Add better examples
   - Fix formatting
   - Update screenshots references
4. Edit CONTRIBUTING.md:
   - Update contribution guidelines
5. Commit with message: "Improve documentation clarity and examples"
```

**Result**: Documentation improvements in a dedicated branch!

## Tips for Effective Use

### 1. Commit Message Best Practices

```
Good: "Fix null pointer exception in user service"
Bad: "fix bug"

Good: "Add support for dark mode in settings panel"
Bad: "update"

Good: "Refactor: Extract validation logic to separate module"
Bad: "changes"
```

### 2. Branch Naming Conventions

```
Features: feature/feature-name
Bugfixes: fix/bug-description
Hotfixes: hotfix/critical-issue
Documentation: docs/what-changed
Refactoring: refactor/what-refactored
```

### 3. When to Create a Branch

- **Always** for new features
- **Always** for non-trivial bug fixes
- **Consider** for documentation updates
- **Maybe not** for simple typo fixes in your own repos

### 4. Before Committing

- [ ] Review all changed files
- [ ] Verify no unintended changes
- [ ] Check commit message is clear
- [ ] Consider impact on other developers

### 5. After Committing

- [ ] Verify commit appears on GitHub
- [ ] Create PR if working on a branch
- [ ] Notify team if it's an important change
- [ ] Monitor CI/CD status

## Common Workflows

### Quick Fix Flow

```
Edit → Save → Ctrl+Shift+G → Type message → Ctrl+Enter → Done
(~20 seconds)
```

### Feature Development Flow

```
Create branch → Make changes → Review → Commit → Create PR
(~5-10 minutes)
```

### Multi-File Update Flow

```
Edit file 1 → Save
Edit file 2 → Save
Edit file 3 → Save
Review all → Commit once
(Single coherent commit)
```

### Collaborative Flow

```
1. Create feature branch
2. Make initial changes and commit
3. Share branch name with team
4. Others can review/contribute
5. Merge via PR when ready
```

## Limitations to Remember

1. **No Local Git**: This isn't a full git client; it's a GitHub API integration
2. **No Staging Area**: All changes commit together (no partial commits)
3. **No Merge Conflicts**: Can't resolve conflicts in the UI
4. **No Rebase**: Can't rewrite history
5. **No Force Push**: Can't force update branches
6. **Browser Memory**: Changes lost on refresh if not committed

## When to Use GitHub1s Write Operations

**✅ Perfect For**:

- Quick fixes and typos
- Documentation updates
- Configuration changes
- Small feature additions
- Emergency hotfixes
- Simple refactoring
- Adding/updating simple files

**❌ Not Ideal For**:

- Complex refactoring across many files
- Major version updates
- Resolving merge conflicts
- Working with binary files
- Very large file changes
- Work requiring local testing
- Complex git operations

## Conclusion

GitHub1s write operations are perfect for quick, surgical changes to your repositories. They enable a new workflow where you can make and commit changes entirely in the browser, perfect for:

- Quick fixes while on the go
- Reviewing PRs and making suggestions
- Documentation updates
- Configuration tweaks
- Learning and experimentation

For complex changes requiring local testing, build processes, or intricate git operations, traditional local development is still recommended.
