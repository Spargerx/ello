import React from 'react';
import { PageHeader } from '../../components/common/PageHeader';
import { EmptyState } from '../../components/common/States';

export const GatewayPolicies: React.FC = () => {
  return (
    <div className="page">
      <PageHeader 
        title="Gateway Policies" 
        description="Manage security rules and API protection mode." 
      />
      <EmptyState message="Policy management will be implemented in a future phase." />
    </div>
  );
};

export default GatewayPolicies;
