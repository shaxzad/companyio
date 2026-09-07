import { PageMeta, SignUpForm } from '@companyio/platform-ui';
import { useAuth } from '@companyio/auth-react';
import AuthLayout from './AuthPageLayout';

export default function SignUp() {
  const { client } = useAuth();
  return (
    <>
      <PageMeta
        title="Fuel Management Sign Up"
        description="Create your fuel management account"
      />
      <AuthLayout>
        <SignUpForm client={client} businessName="Fuel Management" />
      </AuthLayout>
    </>
  );
}
