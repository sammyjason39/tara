# Zenvix Business Flow Suite v2 - Documentation Hub

**Last Updated:** 2026-05-22

Welcome to the centralized documentation for Zenvix Business Flow Suite v2 (OpsCore). This directory contains all essential documentation for understanding, developing, and maintaining the platform.

---

## 📚 Documentation Index

### Core Documentation

1. **[SPEC.md](./SPEC.md)** - Master Specification
   - Complete platform overview
   - Architecture layers
   - Module capabilities
   - Technology stack
   - Known issues & roadmap

2. **[CODEBASE_MAP.md](./CODEBASE_MAP.md)** - Complete Codebase Reference
   - Directory structure
   - File locations
   - Key services & controllers
   - Database schema
   - Integration points
   - Bug locations
   - Quick reference guides

3. **[BUG_DISCOVERY_SUMMARY.md](./BUG_DISCOVERY_SUMMARY.md)** - Bug Discovery Initiative
   - Executive summary
   - Discovery strategy
   - Testing coverage
   - Expected outcomes

4. **[BUG_DISCOVERY_COMPLETE.md](./BUG_DISCOVERY_COMPLETE.md)** - Discovery Results
   - Automated results
   - Bug registry
   - Next steps
   - Recommendations

---

### Platform Architecture

Located in `../PLATFORM_DOCS/`:

3. **[CORE_ARCHITECTURE.md](../PLATFORM_DOCS/CORE_ARCHITECTURE.md)**
   - Three-layer architecture
   - Core principles
   - Module isolation
   - Configuration engine

4. **[BACKEND_BUILD.md](../PLATFORM_DOCS/BACKEND_BUILD.md)**
   - NestJS architecture
   - Repository pattern
   - Event-driven design
   - RFC 7807 error handling

5. **[FRONTEND_BUILD.md](../PLATFORM_DOCS/FRONTEND_BUILD.md)**
   - React + Vite stack
   - Component architecture
   - State management
   - Runtime routing

6. **[MULTI_TENANCY.md](../PLATFORM_DOCS/MULTI_TENANCY.md)**
   - Tenant isolation
   - Header-based routing
   - Row-level security
   - Company scoping

7. **[FULL_ASSESSMENT.md](../PLATFORM_DOCS/FULL_ASSESSMENT.md)**
   - Current build status
   - Module completeness
   - Gaps & next steps

---

### Module Mappings (Graphify)

Located in `../mappings/`:

8. **[Finance.json](../mappings/Finance.json)** - Finance module map
   - Services & controllers
   - Database tables
   - Integration points
   - Known issues

9. **[Inventory.json](../mappings/Inventory.json)** - Inventory module map
10. **[HR.json](../mappings/HR.json)** - HR module map
11. **[Retail.json](../mappings/Retail.json)** - Retail module map
12. **[Sales.json](../mappings/Sales.json)** - Sales module map
13. **[Marketing.json](../mappings/Marketing.json)** - Marketing module map
14. **[Procurement.json](../mappings/Procurement.json)** - Procurement module map
15. **[Payment.json](../mappings/Payment.json)** - Payment module map
16. **[IT.json](../mappings/IT.json)** - IT module map

---

### Specifications & Tasks

Located in `../.kiro/specs/`:

17. **[core-retail-stabilization](../.kiro/specs/core-retail-stabilization/)**
    - **[bugfix.md](../.kiro/specs/core-retail-stabilization/bugfix.md)** - Bug requirements (11 bugs)
    - **[tasks.md](../.kiro/specs/core-retail-stabilization/tasks.md)** - Implementation tasks
    - **[IMPLEMENTATION_STATUS.md](../.kiro/specs/core-retail-stabilization/IMPLEMENTATION_STATUS.md)** - Status tracking
    - **[graphify-plan.md](../.kiro/specs/core-retail-stabilization/graphify-plan.md)** - Documentation update plan

---

### User Manuals

Located in `../user-manuals/`:

18. **[00_GETTING_STARTED.md](../user-manuals/00_GETTING_STARTED.md)** - Getting started guide
19. **[01_FINANCE.md](../user-manuals/01_FINANCE.md)** - Finance module user guide
20. **[02_HR.md](../user-manuals/02_HR.md)** - HR module user guide
21. **[03_SALES.md](../user-manuals/03_SALES.md)** - Sales module user guide
22. **[04_INVENTORY.md](../user-manuals/04_INVENTORY.md)** - Inventory module user guide
23. **[05_MARKETING.md](../user-manuals/05_MARKETING.md)** - Marketing module user guide
24. **[06_PROCUREMENT.md](../user-manuals/06_PROCUREMENT.md)** - Procurement module user guide
25. **[07_IT.md](../user-manuals/07_IT.md)** - IT module user guide
26. **[08_ADMIN.md](../user-manuals/08_ADMIN.md)** - Admin module user guide

---

### Quick Start Guides

Located in project root:

27. **[README.md](../README.md)** - Project overview
28. **[QUICK_START.md](../QUICK_START.md)** - Quick start guide
29. **[DATABASE_SETUP.md](../DATABASE_SETUP.md)** - Database setup
30. **[VPS_AUTOMATION.md](../VPS_AUTOMATION.md)** - VPS deployment

---

## 🎯 Documentation Purpose

### For Developers
- **Start here:** [SPEC.md](./SPEC.md) → [CODEBASE_MAP.md](./CODEBASE_MAP.md)
- **Architecture:** [PLATFORM_DOCS](../PLATFORM_DOCS/)
- **Bug fixes:** [core-retail-stabilization spec](../.kiro/specs/core-retail-stabilization/)

### For AI Assistants
- **System context:** [SPEC.md](./SPEC.md) + [CODEBASE_MAP.md](./CODEBASE_MAP.md)
- **Module mappings:** [mappings/](../mappings/)
- **Current tasks:** [tasks.md](../.kiro/specs/core-retail-stabilization/tasks.md)

### For Users
- **Getting started:** [user-manuals/00_GETTING_STARTED.md](../user-manuals/00_GETTING_STARTED.md)
- **Module guides:** [user-manuals/](../user-manuals/)

### For DevOps
- **Deployment:** [VPS_AUTOMATION.md](../VPS_AUTOMATION.md)
- **Database:** [DATABASE_SETUP.md](../DATABASE_SETUP.md)
- **Docker:** [docker-compose.yml](../docker-compose.yml)

---

## 📋 Documentation Standards

### File Naming
- Use `UPPERCASE.md` for top-level documentation
- Use `lowercase-with-dashes.md` for specific guides
- Use `PascalCase.json` for module mappings

### Structure
- Start with executive summary
- Include table of contents for long documents
- Use clear section headers
- Include code examples where relevant
- Add "Last Updated" date at top

### Maintenance
- Update documentation when code changes
- Review weekly during stabilization phase
- Mark outdated sections clearly
- Keep CODEBASE_MAP.md in sync with actual code

---

## 🔄 Documentation Update Process

### When to Update

1. **After Bug Fixes**
   - Update IMPLEMENTATION_STATUS.md
   - Update CODEBASE_MAP.md with fix locations
   - Update module mapping JSON files

2. **After New Features**
   - Update SPEC.md with new capabilities
   - Update CODEBASE_MAP.md with new files
   - Create/update user manual sections

3. **After Architecture Changes**
   - Update PLATFORM_DOCS
   - Update SPEC.md
   - Update module mappings

4. **Weekly Reviews**
   - Verify all documentation is current
   - Update "Last Updated" dates
   - Check for broken references

---

## 🛠 Tools & Scripts

### Graphify (Module Mapping)
- **Purpose:** Generate module dependency maps
- **Output:** `mappings/*.json`
- **Update:** After major code changes

### Documentation Linting
```bash
# Check for broken links
npm run docs:lint

# Generate table of contents
npm run docs:toc
```

---

## 📞 Documentation Contacts

- **Technical Lead:** Development Team
- **Documentation Owner:** Development Team
- **Review Cycle:** Weekly during stabilization

---

## 🔗 External Resources

- **NestJS Docs:** https://docs.nestjs.com/
- **React Docs:** https://react.dev/
- **Prisma Docs:** https://www.prisma.io/docs/
- **Vite Docs:** https://vitejs.dev/

---

## 📝 Contributing to Documentation

### Guidelines
1. Keep documentation close to code
2. Use clear, concise language
3. Include examples
4. Update immediately after code changes
5. Review before committing

### Template for New Documents
```markdown
# Document Title

**Last Updated:** YYYY-MM-DD  
**Purpose:** Brief description

---

## Section 1

Content...

---

## Section 2

Content...

---

**Document Owner:** Name  
**Review Cycle:** Frequency
```

---

**This documentation hub is maintained by the Zenvix Development Team.**  
**For questions or updates, please contact the technical lead.**
