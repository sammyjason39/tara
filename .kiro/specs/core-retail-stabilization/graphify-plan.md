# Graphify and Documentation Update Plan

## Objective
Perform a fresh graphify analysis of the codebase to get the latest state, then update and unify all documentation for the core-retail-stabilization spec.

---

## Phase 1: Fresh Graphify Analysis

### 1.1 Clean Existing Graphify Output
- [ ] Remove existing `graphify-out/` directory
- [ ] Clear any cached graph data

### 1.2 Run Fresh Graphify
- [ ] Execute graphify on the entire project
- [ ] Configure graphify to focus on:
  - Backend: `src/core/` and `src/modules/`
  - Frontend: `src/pages/` and `src/components/`
  - Tests: `tests/` directory
  - Database: `prisma/` and `database/`

### 1.3 Extract Key Information
- [ ] Map inventory stock transfer functions
- [ ] Map finance journal functions (reversal, posting, validation)
- [ ] Map retail shift management functions
- [ ] Map payment processing functions
- [ ] Identify Explorer.tsx JSX structure
- [ ] Document all service integrations

---

## Phase 2: Documentation Audit

### 2.1 Current Documentation Review
- [ ] Review `bugfix.md` for accuracy
- [ ] Review `tasks.md` for completeness
- [ ] Review `graphify-out/GRAPH_REPORT.md`
- [ ] Review `backend/audit/Finance/` audit files
- [ ] Review `vps_backend_logs_v5.txt`
- [ ] Review `build_error.txt`

### 2.2 Identify Outdated Sections
- [ ] Mark functions that no longer exist
- [ ] Mark functions that have been renamed
- [ ] Mark functions that have new parameters
- [ ] Identify missing integrations
- [ ] Identify new code sections not in graphify

---

## Phase 3: Documentation Unification

### 3.1 Create Unified Codebase Map
- [ ] Create `docs/codebase-map.md` with:
  - Directory structure
  - Key functions and their locations
  - Integration points between modules
  - Database schema overview

### 3.2 Update Bugfix Requirements
- [ ] Update `bugfix.md` with current code locations
- [ ] Add file paths for each bug's root cause
- [ ] Add function signatures for affected functions
- [ ] Document current implementation state

### 3.3 Update Tasks
- [ ] Update `tasks.md` with current file locations
- [ ] Add specific line numbers for bugs
- [ ] Add function names for fixes
- [ ] Update sub-task descriptions

---

## Phase 4: Hook Configuration

### 4.1 Create Spec Hooks
- [ ] Create hook for file edits in spec directory
- [ ] Create hook for build failures
- [ ] Create hook for test failures

### 4.2 Create Documentation Hooks
- [ ] Create hook for code changes that affect spec
- [ ] Create hook for new bugs detected by tests

---

## Phase 5: Final Review

### 5.1 Verify Completeness
- [ ] All bugs have current file locations
- [ ] All tasks have actionable steps
- [ ] All integrations are documented
- [ ] All hooks are configured

### 5.2 Generate Summary
- [ ] Create `docs/summary.md` with:
  - Current state of codebase
  - Status of each bug
  - Plan for fixes
  - Estimated effort

---

## Output Files

### New Files to Create
- `docs/codebase-map.md` - Complete codebase structure
- `docs/bug-status.md` - Current status of each bug
- `docs/integration-map.md` - Module integration points
- `.kiro/specs/core-retail-stabilization/implementation-guide.md` - Detailed implementation guide

### Files to Update
- `.kiro/specs/core-retail-stabilization/bugfix.md` - Update with current locations
- `.kiro/specs/core-retail-stabilization/tasks.md` - Update with current locations
- `.kiro/specs/core-retail-stabilization/.config.kiro` - Add graphify timestamp

---

## Timeline

| Phase | Estimated Time |
|-------|----------------|
| Phase 1: Graphify | 30 minutes |
| Phase 2: Audit | 45 minutes |
| Phase 3: Unification | 60 minutes |
| Phase 4: Hooks | 15 minutes |
| Phase 5: Review | 30 minutes |
| **Total** | **3 hours** |

---

## Success Criteria

- [ ] Fresh graphify output with current codebase state
- [ ] All documentation unified and consistent
- [ ] All file locations accurate
- [ ] All hooks configured
- [ ] Implementation guide created