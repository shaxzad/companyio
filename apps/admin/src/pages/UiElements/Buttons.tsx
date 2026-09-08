import { PageBreadcrumb, ComponentCard, Button, PageMeta, BoxIcon } from '@companyio/platform-ui';

export default function Buttons() {
  return (
    <div>
      <PageMeta
        title="React.js Buttons Dashboard | TailAdmin - React.js Admin Dashboard Template"
        description="This is React.js Buttons Dashboard page for TailAdmin - React.js Tailwind CSS Admin Dashboard Template"
      />
      <PageBreadcrumb pageTitle="Buttons" />
      <div className="space-y-5 sm:space-y-6">
        <ComponentCard title="Primary Button">
          <div className="flex items-center gap-5">
            <Button size="sm">Button Text</Button>
            <Button>Button Text</Button>
          </div>
        </ComponentCard>
        <ComponentCard title="Primary Button with Left Icon">
          <div className="flex items-center gap-5">
            <Button size="sm">
              <BoxIcon className="size-5" />
              Button Text
            </Button>
            <Button>
              <BoxIcon className="size-5" />
              Button Text
            </Button>
          </div>
        </ComponentCard>
        <ComponentCard title="Primary Button with Right Icon">
          <div className="flex items-center gap-5">
            <Button size="sm">
              Button Text
              <BoxIcon className="size-5" />
            </Button>
            <Button>
              Button Text
              <BoxIcon className="size-5" />
            </Button>
          </div>
        </ComponentCard>
        <ComponentCard title="Secondary Button">
          <div className="flex items-center gap-5">
            <Button size="sm" variant="outline">
              Button Text
            </Button>
            <Button variant="outline">Button Text</Button>
          </div>
        </ComponentCard>
        <ComponentCard title="Outline Button with Left Icon">
          <div className="flex items-center gap-5">
            <Button size="sm" variant="outline">
              <BoxIcon className="size-5" />
              Button Text
            </Button>
            <Button variant="outline">
              <BoxIcon className="size-5" />
              Button Text
            </Button>
          </div>
        </ComponentCard>
        <ComponentCard title="Outline Button with Right Icon">
          <div className="flex items-center gap-5">
            <Button size="sm" variant="outline">
              Button Text
              <BoxIcon className="size-5" />
            </Button>
            <Button variant="outline">
              Button Text
              <BoxIcon className="size-5" />
            </Button>
          </div>
        </ComponentCard>
      </div>
    </div>
  );
}
