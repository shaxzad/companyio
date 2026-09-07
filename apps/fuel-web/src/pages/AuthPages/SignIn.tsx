import { PageMeta, SignInForm } from '@companyio/platform-ui';
import { useAuth } from '@companyio/auth-react';
import AuthLayout from './AuthPageLayout';

export default function SignIn() {
  const { client } = useAuth();
  return (
    <>
      <PageMeta title="Fuel Management Sign In" description="Sign in to Fuel Management" />
      <AuthLayout>
        <SignInForm client={client} />
      </AuthLayout>
    </>
  );
}
