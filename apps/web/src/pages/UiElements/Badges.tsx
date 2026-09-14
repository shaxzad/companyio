import { PageBreadcrumb, ComponentCard, Badge, PageMeta, PlusIcon } from '@companyio/platform-ui';

export default function Badges() {
  return (
    <div>
      <PageMeta
        title="React.js Badges Dashboard | TailAdmin - React.js Admin Dashboard Template"
        description="This is React.js Badges Dashboard page for TailAdmin - React.js Tailwind CSS Admin Dashboard Template"
      />
      <PageBreadcrumb pageTitle="Badges" />
      <div className="space-y-5 sm:space-y-6">
        <ComponentCard title="Default">
          <div className="flex flex-wrap gap-4 sm:items-center sm:justify-center">
            <Badge>Default</Badge>
            <Badge variant="secondary">Secondary</Badge>
            <Badge variant="destructive">Destructive</Badge>
            <Badge variant="outline">Outline</Badge>
            <Badge variant="success">Success</Badge>
            <Badge variant="warning">Warning</Badge>
            <Badge variant="error">Error</Badge>
            <Badge variant="info">Info</Badge>
          </div>
        </ComponentCard>
        <ComponentCard title="With Icon">
          <div className="flex flex-wrap gap-4 sm:items-center sm:justify-center">
            <Badge>
              <PlusIcon />
              Default
            </Badge>
            <Badge variant="success">
              <PlusIcon />
              Success
            </Badge>
            <Badge variant="error">
              <PlusIcon />
              Error
            </Badge>
          </div>
        </ComponentCard>
      </div>
    </div>
  );
}
