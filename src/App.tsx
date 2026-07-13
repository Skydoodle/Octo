import { Navigate, Routes, Route } from "react-router-dom"
import Landing from "./pages/Landing"
import Layout from "./surfaces/dashboard/Layout"
import Dashboard from "./surfaces/dashboard/Dashboard"
import Finance from "./layers/finance/Finance"
import Vergi from './layers/tax/Vergi'
import IK from './layers/hr/IK'
import Operasyon from './layers/operations/Operasyon'
import TasksPage from './surfaces/dashboard/tasks/TasksPage'
import ThirtyDayPage from './surfaces/dashboard/horizon/ThirtyDayPage'
import LoginPage from './auth/LoginPage'
import ProtectedRoute from './auth/ProtectedRoute'
import CompanyRequiredRoute from './company/CompanyRequiredRoute'
import CompanySetupPage from './company/CompanySetupPage'
import SignUpPage from './auth/SignUpPage'
import ForgotPasswordPage from './auth/ForgotPasswordPage'
import ResetPasswordPage from './auth/ResetPasswordPage'
import AccountSettingsPage from './auth/AccountSettingsPage'
import { ACCOUNT_PATH } from './auth/routeProtection'
import TeamSettingsPage from './team/TeamSettingsPage'
import TeamOwnerRoute from './team/TeamOwnerRoute'
import InvitePage from './team/InvitePage'
import SalesLayout from './layers/sales/ui/SalesLayout'
import FirmsPage from './layers/sales/ui/FirmsPage'
import FirmDetailPage from './layers/sales/ui/FirmDetailPage'
import ContactsPage from './layers/sales/ui/ContactsPage'
import { LeadDetailPage, LeadsPage } from './layers/sales/execution/ui/LeadPages'
import { OpportunityDetailPage, OpportunitiesPage } from './layers/sales/execution/ui/OpportunityPages'
import PipelinePage from './layers/sales/execution/ui/PipelinePage'
import ActivitiesPage from './layers/sales/execution/ui/ActivitiesPage'

function Placeholder({ name }: { name: string }) {
  return (
    <div className="p-10">
      <div className="label text-crimson mb-3">{name} Katmani</div>
      <div className="font-mono text-4xl text-line mb-4">Yapım aşamasında</div>
      <div className="text-sm text-ink-soft">Bu katman yakında burada olacak.</div>
    </div>
  )
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignUpPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="/invite" element={<InvitePage />} />
      <Route path={ACCOUNT_PATH} element={<ProtectedRoute><AccountSettingsPage /></ProtectedRoute>} />
      <Route path="/setup/company" element={<ProtectedRoute><CompanySetupPage /></ProtectedRoute>} />
      <Route path="/settings/team" element={<ProtectedRoute><CompanyRequiredRoute><TeamOwnerRoute><TeamSettingsPage /></TeamOwnerRoute></CompanyRequiredRoute></ProtectedRoute>} />
      <Route path="/dashboard" element={<ProtectedRoute><CompanyRequiredRoute><Layout /></CompanyRequiredRoute></ProtectedRoute>}>
        <Route index element={<Dashboard />} />
        <Route path="yapilacaklar" element={<TasksPage />} />
        <Route path="30-gun" element={<ThirtyDayPage />} />
        <Route path="finans" element={<Finance />} />
        <Route path="vergi" element={<Vergi />} />
        <Route path="hukuk" element={<Placeholder name="Hukuk" />} />
        <Route path="ik" element={<IK />} />
        <Route path="operasyon" element={<Operasyon />} />
        <Route path="satis" element={<SalesLayout />}>
          <Route index element={<Navigate to="firmalar" replace />} />
          <Route path="firmalar" element={<FirmsPage />} />
          <Route path="firmalar/:partyId" element={<FirmDetailPage />} />
          <Route path="kisiler" element={<ContactsPage />} />
          <Route path="potansiyel-musteriler" element={<LeadsPage />} />
          <Route path="potansiyel-musteriler/:leadId" element={<LeadDetailPage />} />
          <Route path="firsatlar" element={<OpportunitiesPage />} />
          <Route path="firsatlar/:opportunityId" element={<OpportunityDetailPage />} />
          <Route path="pipeline" element={<PipelinePage />} />
          <Route path="aktiviteler" element={<ActivitiesPage />} />
        </Route>
        <Route path="voice" element={<Placeholder name="Octo Voice" />} />
        <Route path="denetim" element={<Placeholder name="Denetim" />} />
      </Route>
    </Routes>
  )
}
