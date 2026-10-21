import PolicyPage from '../components/PolicyPage';

// Wording is edited in Admin → Policy Pages (defaults in data/policyDefaults.js).
export default function ReturnRefundPolicy() {
  return <PolicyPage sectionKey="policy_returns" />;
}
