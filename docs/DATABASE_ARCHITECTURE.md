# Database Architecture

## Recommended production layout

Use one PostgreSQL database per environment, with schemas or separate databases by ownership boundary:

```text
company_identity             Users, sessions, businesses, branches, memberships
company_school_erp            Students, teachers, attendance, fees, classes
company_interview_copilot     Interview sessions, transcripts, feedback
company_crm                   Contacts, deals, activities, pipelines
```

The shared identity database is reused by every product. Product databases are never queried directly by Web, Desktop, or Mobile clients; only the product API accesses them.

## Tenant rule

Every business-owned document must include both fields:

```ts
{
  main_business_id: string,
  branch_id: string
}
```

Every query must start with the authenticated tenant filter. Use `tenantFilter(request.tenant)` from `@companyio/platform-tenancy`; never accept tenant IDs from the request body. Optional headers may request the current user's own business/branch scope, but the API must reject mismatches.

## Repository strategy

Start with one platform monorepo for shared packages and separate product repositories when product teams or release cycles diverge:

```text
company-platform       Shared auth, tenancy, database helpers, UI, permissions
smart-school-erp       School API and Web/Desktop/Mobile product apps
interview-copilot      CompanyIO interview product apps and domain API
company-crm            CRM product apps and domain API
```

Each product consumes released `@companyio/*` packages from the private npm registry. During local development, `workspace:*` links packages.

## Security and operations

- Separate PostgreSQL roles and credentials per environment and product database.
- Use managed PostgreSQL with private networking and restricted access in production.
- Encrypt backups and enable point-in-time recovery.
- Keep identity data in the identity database; do not duplicate passwords in product databases.
- Add indexes beginning with `main_business_id`, `branch_id`, then the product query fields.
- Add audit events for membership, role, and sensitive data changes.
- Use migrations/index scripts in CI; do not create production indexes from app startup after scale.
- For school data, apply stricter retention, access logging, and backup policies.
